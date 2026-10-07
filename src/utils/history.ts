import { randomUUID } from 'expo-crypto';

import {
  enqueuePendingRecord,
  readPendingRecords,
  writePendingRecords,
  type PendingRecord,
} from '@/utils/pending-records';
import { isSupabaseConfigured, supabase } from '@/utils/supabase-client';
import type { TransitLossSummary } from '@/utils/transit-loss';
import { normalizeRegNumber, type VehicleDetails } from '@/utils/vehicle-lookup';

export type TransitLossRecord = {
  id: string;
  createdAt: string;
  regNumber: string;
  certNo: string | null;
  bulkNo: string | null;
  loadedCompartmentVolumes: (number | null)[];
  receivedCompartmentVolumes: (number | null)[];
  totalLoaded: number;
  totalReceived: number;
  observedDiff: number;
  loadedTemperature: number | null;
  loadedDensity: number | null;
  loadedVcf: number | null;
  loadedVolumeAt15: number | null;
  receivedTemperature: number | null;
  receivedDensity: number | null;
  receivedVcf: number | null;
  receivedVolumeAt15: number | null;
  lossAt15: number | null;
};

export type SaveTransitLossRecordInput = {
  regNumber: string;
  vehicleDetails: VehicleDetails;
  summary: TransitLossSummary;
  loadedTemperature: number | null;
  loadedDensity: number | null;
  receivedTemperature: number | null;
  receivedDensity: number | null;
  userId: string | null;
};

/** 'queued': no connection, so the record was kept on the device for later upload. */
export type SaveRecordOutcome =
  | { status: 'ok' }
  | { status: 'queued' }
  | { status: 'not-configured' }
  | { status: 'error' };
export type ListRecordsOutcome =
  | { status: 'ok'; records: TransitLossRecord[]; total: number }
  | { status: 'not-configured' }
  | { status: 'error' };

type TransitLossRecordRow = {
  id: string;
  created_at: string;
  reg_number: string;
  cert_no: string | null;
  bulk_no: string | null;
  loaded_compartment_volumes: (number | null)[];
  received_compartment_volumes: (number | null)[];
  total_loaded: number;
  total_received: number;
  observed_diff: number;
  loaded_temperature: number | null;
  loaded_density: number | null;
  loaded_vcf: number | null;
  loaded_volume_at15: number | null;
  received_temperature: number | null;
  received_density: number | null;
  received_vcf: number | null;
  received_volume_at15: number | null;
  loss_at15: number | null;
};

/** A row exactly as inserted — also what the offline queue stores. */
export type TransitLossRecordInsert = TransitLossRecordRow & { user_id: string | null };

export function mapRow(row: TransitLossRecordRow): TransitLossRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    regNumber: row.reg_number,
    certNo: row.cert_no,
    bulkNo: row.bulk_no,
    loadedCompartmentVolumes: row.loaded_compartment_volumes,
    receivedCompartmentVolumes: row.received_compartment_volumes,
    totalLoaded: row.total_loaded,
    totalReceived: row.total_received,
    observedDiff: row.observed_diff,
    loadedTemperature: row.loaded_temperature,
    loadedDensity: row.loaded_density,
    loadedVcf: row.loaded_vcf,
    loadedVolumeAt15: row.loaded_volume_at15,
    receivedTemperature: row.received_temperature,
    receivedDensity: row.received_density,
    receivedVcf: row.received_vcf,
    receivedVolumeAt15: row.received_volume_at15,
    lossAt15: row.loss_at15,
  };
}

// A save that hasn't heard back in this long is treated as offline and
// queued; the record's fixed id makes a late-arriving original harmless.
const SAVE_TIMEOUT_MS = 10_000;
// Postgres "unique_violation": this id is already stored, i.e. an earlier
// attempt did reach the server.
const ALREADY_SAVED = '23505';

export type InsertOutcome = { status: 'ok' } | { status: 'network' } | { status: 'rejected'; message: string };

function buildRecordRow(input: SaveTransitLossRecordInput): TransitLossRecordInsert {
  const { regNumber, vehicleDetails, summary } = input;
  return {
    // Generated on the device so a retried upload can be recognised, and so
    // an offline record keeps the time it was measured, not uploaded.
    id: randomUUID(),
    created_at: new Date().toISOString(),
    user_id: input.userId,
    // Stored the way vehicles are, so "GN 5285-26" and "gn5285-26" are one vehicle.
    reg_number: normalizeRegNumber(regNumber),
    cert_no: vehicleDetails.certNo,
    bulk_no: vehicleDetails.bulkNo,
    loaded_compartment_volumes: summary.loadedCompartmentVolumes,
    received_compartment_volumes: summary.receivedCompartmentVolumes,
    total_loaded: summary.totalLoaded,
    total_received: summary.totalReceived,
    observed_diff: summary.observedDiff,
    loaded_temperature: input.loadedTemperature,
    loaded_density: input.loadedDensity,
    loaded_vcf: summary.loadedVcf,
    loaded_volume_at15: summary.loadedVolumeAt15,
    received_temperature: input.receivedTemperature,
    received_density: input.receivedDensity,
    received_vcf: summary.receivedVcf,
    received_volume_at15: summary.receivedVolumeAt15,
    loss_at15: summary.lossAt15,
  };
}

/**
 * Inserts one record, telling a connection problem (retry later) apart from
 * the server refusing it (retrying won't help). Server errors carry a
 * PostgREST "PGRST…" code or a five-character Postgres SQLSTATE; a failed or
 * aborted request has neither.
 */
export async function insertRecordRow(row: TransitLossRecordInsert): Promise<InsertOutcome> {
  if (!supabase) {
    return { status: 'network' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);
  try {
    const { error } = await supabase.from('transit_loss_records').insert(row).abortSignal(controller.signal);
    if (!error || error.code === ALREADY_SAVED) {
      return { status: 'ok' };
    }
    const isServerError = /^PGRST/.test(error.code) || /^[0-9A-Z]{5}$/.test(error.code);
    return isServerError ? { status: 'rejected', message: error.message } : { status: 'network' };
  } catch {
    return { status: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Saves a calculation, or — with no connection — keeps it on the device and
 * reports 'queued'; it is uploaded later by flushPendingRecords().
 */
export async function saveTransitLossRecord(input: SaveTransitLossRecordInput): Promise<SaveRecordOutcome> {
  if (!isSupabaseConfigured || !supabase) {
    return { status: 'not-configured' };
  }

  const row = buildRecordRow(input);
  const outcome = await insertRecordRow(row);
  if (outcome.status === 'ok') {
    return { status: 'ok' };
  }
  if (outcome.status === 'rejected') {
    return { status: 'error' };
  }
  try {
    await enqueuePendingRecord(row);
    return { status: 'queued' };
  } catch {
    return { status: 'error' };
  }
}

let flushing: Promise<void> | null = null;

/**
 * Uploads calculations queued while offline, oldest first. Stops at the first
 * connection failure (no point trying the rest). A record the server refuses
 * for another reason keeps its error and stays queued, so it is never
 * silently lost. Concurrent calls share one run.
 */
export function flushPendingRecords(): Promise<void> {
  flushing ??= (async () => {
    try {
      const queue = await readPendingRecords();
      if (queue.length === 0 || !isSupabaseConfigured) {
        return;
      }
      const remaining = new Map<string, PendingRecord>();
      let offline = false;
      for (const record of queue) {
        if (offline) {
          remaining.set(record.row.id, record);
          continue;
        }
        const outcome = await insertRecordRow(record.row);
        if (outcome.status === 'network') {
          offline = true;
          remaining.set(record.row.id, record);
        } else if (outcome.status === 'rejected') {
          remaining.set(record.row.id, { ...record, lastError: outcome.message });
        }
      }
      const uploadedIds = new Set(queue.map((record) => record.row.id).filter((id) => !remaining.has(id)));
      // Re-read before writing: a record saved while this run was uploading
      // isn't in `queue` and must not be dropped.
      const latest = await readPendingRecords();
      await writePendingRecords(
        latest
          .filter((record) => !uploadedIds.has(record.row.id))
          .map((record) => remaining.get(record.row.id) ?? record),
      );
    } catch {
      // Device storage failed: leave the queue as it was and retry next time.
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

export type ListRecordsQuery = {
  /** Matches reg number (ignoring spaces and case), cert no or bulk no. */
  search: string;
  offset: number;
  limit: number;
};

// Characters kept from a search when matching reg numbers. Letters and digits
// match as typed; these separators match literally (bracketed below so they
// aren't read as regex syntax). Anything else is ignored.
const REG_SEPARATORS = /[-/.]/;

/**
 * Regex matching a reg number however it was typed: case-insensitively (via
 * imatch) and with or without spaces between characters, since older records
 * kept the spacing the user entered.
 */
function regNumberPattern(search: string): string {
  return [...search.replace(/\s+/g, '')]
    .map((char) => (/[a-z0-9]/i.test(char) ? char : REG_SEPARATORS.test(char) ? `[${char}]` : ''))
    .filter(Boolean)
    .join('[[:space:]]*');
}

/**
 * PostgREST filter for a history search. Values are double-quoted so commas
 * and brackets in the search can't break the filter; the characters that
 * would end a quoted value or act as LIKE wildcards are dropped.
 */
function searchFilter(search: string): string | null {
  const text = search.trim().replace(/[%_"\\]/g, '');
  if (!text) {
    return null;
  }
  const filters = [`cert_no.ilike."%${text}%"`, `bulk_no.ilike."%${text}%"`];
  const pattern = regNumberPattern(text);
  if (pattern) {
    filters.unshift(`reg_number.imatch."${pattern}"`);
  }
  return filters.join(',');
}

/** The same match as a history search, for records still on the device. */
export function recordMatchesSearch(record: TransitLossRecord, search: string): boolean {
  const text = search.trim().toLowerCase();
  if (!text) {
    return true;
  }
  const compact = (value: string) => value.replace(/\s+/g, '').toLowerCase();
  return (
    compact(record.regNumber).includes(compact(text)) ||
    (record.certNo ?? '').toLowerCase().includes(text) ||
    (record.bulkNo ?? '').toLowerCase().includes(text)
  );
}

/** One page of saved records, newest first, optionally narrowed by a search. */
export async function listTransitLossRecords({ search, offset, limit }: ListRecordsQuery): Promise<ListRecordsOutcome> {
  if (!isSupabaseConfigured || !supabase) {
    return { status: 'not-configured' };
  }

  let query = supabase.from('transit_loss_records').select('*', { count: 'exact' });
  const filter = searchFilter(search);
  if (filter) {
    query = query.or(filter);
  }
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) {
    return { status: 'error' };
  }

  return {
    status: 'ok',
    records: (data as TransitLossRecordRow[]).map(mapRow),
    total: count ?? data.length,
  };
}
