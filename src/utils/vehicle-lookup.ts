import { getNetworkStateAsync, NetworkStateType } from 'expo-network';

import type { CalibrationPoint } from '@/utils/calibration';
import { cacheVehicle, readCachedVehicle, replaceCachedVehicles } from '@/utils/vehicle-cache';
import { isSupabaseConfigured, supabase } from '@/utils/supabase-client';

export type CompartmentCalibration = {
  id: number;
  nominalCapacityLiters: number;
  points: CalibrationPoint[];
};

export type VehicleDetails = {
  certNo: string;
  bulkNo: string;
  expiryDate: string;
  compartments: CompartmentCalibration[];
};

export type VehicleLookupOutcome =
  | { status: 'found'; details: VehicleDetails; source: 'network' }
  /** savedAt: when the device copy was fetched, null if unknown. */
  | { status: 'found'; details: VehicleDetails; source: 'cache'; savedAt: string | null }
  | { status: 'not-found' }
  | { status: 'offline-unavailable' };

export type UpsertVehicleOutcome =
  | { status: 'ok' }
  | { status: 'error'; message: string }
  | { status: 'not-configured' };

const LOOKUP_TIMEOUT_MS = 8000;

export function normalizeRegNumber(regNumber: string): string {
  return regNumber.replace(/\s+/g, '').toUpperCase();
}

type VehicleRow = {
  cert_no: string;
  bulk_no: string;
  expiry_date: string;
  compartments: CompartmentCalibration[];
};

function mapRow(row: VehicleRow): VehicleDetails {
  return {
    certNo: row.cert_no,
    bulkNo: row.bulk_no,
    expiryDate: row.expiry_date,
    compartments: row.compartments,
  };
}

/**
 * True only when the phone reports no network at all, so a lookup can go
 * straight to the device copy instead of waiting out the timeout. Anything
 * less certain (including web, where the type is always UNKNOWN) still tries
 * the server.
 */
async function isDefinitelyOffline(): Promise<boolean> {
  try {
    return (await getNetworkStateAsync()).type === NetworkStateType.NONE;
  } catch {
    return false;
  }
}

/**
 * Network-first with offline cache fallback. A confirmed "no such row"
 * response from the network wins over any stale local cache entry; only an
 * unreachable/timed-out network (or no network at all) falls back to the cache, and only when even
 * the cache has nothing do we report 'offline-unavailable' (distinct from
 * 'not-found' — we genuinely can't tell whether the vehicle exists or not).
 */
export async function lookupVehicleByRegNumber(regNumber: string): Promise<VehicleLookupOutcome> {
  const key = normalizeRegNumber(regNumber);
  if (!key) {
    return { status: 'not-found' };
  }

  if (isSupabaseConfigured && supabase && !(await isDefinitelyOffline())) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('cert_no, bulk_no, expiry_date, compartments')
        .eq('reg_number', key)
        .abortSignal(controller.signal)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data === null) {
        return { status: 'not-found' };
      }

      const details = mapRow(data as VehicleRow);
      await cacheVehicle(key, details);
      return { status: 'found', details, source: 'network' };
    } catch {
      // Unreachable/timed out/misconfigured — fall through to the cache below.
    } finally {
      clearTimeout(timer);
    }
  }

  const cached = await readCachedVehicle(key);
  if (cached) {
    return { status: 'found', details: cached.details, source: 'cache', savedAt: cached.savedAt };
  }
  return { status: 'offline-unavailable' };
}

export async function upsertVehicle(
  regNumber: string,
  details: VehicleDetails,
): Promise<UpsertVehicleOutcome> {
  if (!isSupabaseConfigured || !supabase) {
    return { status: 'not-configured' };
  }

  const key = normalizeRegNumber(regNumber);
  if (!key) {
    return { status: 'error', message: 'Reg number is required.' };
  }

  const { error } = await supabase.from('vehicles').upsert(
    {
      reg_number: key,
      cert_no: details.certNo,
      bulk_no: details.bulkNo,
      expiry_date: details.expiryDate,
      compartments: details.compartments,
    },
    { onConflict: 'reg_number' },
  );

  if (error) {
    return { status: 'error', message: error.message };
  }

  await cacheVehicle(key, details);
  return { status: 'ok' };
}

export type DownloadVehiclesOutcome =
  | { status: 'ok'; count: number }
  | { status: 'error' }
  | { status: 'not-configured' };

const DOWNLOAD_PAGE_SIZE = 200;

/**
 * Downloads every vehicle's calibration data to the device for offline use.
 * Pages by reg number (keyset, not offset) so a vehicle added mid-download
 * can't shift a page and get skipped. All-or-nothing: if any page fails, the
 * device copies are left untouched.
 */
export async function downloadVehiclesForOffline(): Promise<DownloadVehiclesOutcome> {
  if (!isSupabaseConfigured || !supabase) {
    return { status: 'not-configured' };
  }
  const vehicles = new Map<string, VehicleDetails>();
  let after: string | null = null;
  try {
    for (;;) {
      let query = supabase
        .from('vehicles')
        .select('reg_number, cert_no, bulk_no, expiry_date, compartments')
        .order('reg_number')
        .limit(DOWNLOAD_PAGE_SIZE);
      if (after !== null) {
        query = query.gt('reg_number', after);
      }
      const { data, error } = await query;
      if (error || !Array.isArray(data)) {
        return { status: 'error' };
      }
      const rows = data as (VehicleRow & { reg_number: string })[];
      rows.forEach((row) => vehicles.set(row.reg_number, mapRow(row)));
      if (rows.length < DOWNLOAD_PAGE_SIZE) {
        break;
      }
      after = rows[rows.length - 1].reg_number;
    }
    await replaceCachedVehicles(vehicles);
  } catch {
    return { status: 'error' };
  }
  return { status: 'ok', count: vehicles.size };
}

export type VehicleSummary = {
  regNumber: string;
  certNo: string;
  expiryDate: string;
  compartmentCount: number;
  totalNominalLiters: number;
};

/** Certificate validity buckets used to filter the admin list. */
export type ExpiryFilter = 'all' | 'expired' | 'due-soon' | 'valid';

// Calibration certificates run ~6 months, so a month's notice leaves time to
// book re-calibration.
export const DUE_SOON_DAYS = 30;

export type ListVehiclesQuery = {
  search: string;
  expiry: ExpiryFilter;
  offset: number;
  limit: number;
};

export type ListVehiclesOutcome =
  | { status: 'ok'; vehicles: VehicleSummary[]; total: number }
  | { status: 'error' }
  | { status: 'not-configured' };

export type VehicleCounts = Record<ExpiryFilter, number>;

type VehicleSummaryRow = {
  reg_number: string;
  cert_no: string;
  expiry_date: string;
  compartment_count: number;
  total_nominal_liters: number | string;
};

function isoDateFromToday(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Narrows a vehicle_summaries query to one validity bucket. "Due soon" runs
 * from today through DUE_SOON_DAYS ahead; anything later is "valid".
 */
function applyExpiryFilter<Query extends { filter(column: string, operator: string, value: unknown): Query }>(
  query: Query,
  expiry: ExpiryFilter,
): Query {
  const today = isoDateFromToday(0);
  const dueSoonEnd = isoDateFromToday(DUE_SOON_DAYS);
  switch (expiry) {
    case 'expired':
      return query.filter('expiry_date', 'lt', today);
    case 'due-soon':
      return query.filter('expiry_date', 'gte', today).filter('expiry_date', 'lte', dueSoonEnd);
    case 'valid':
      return query.filter('expiry_date', 'gt', dueSoonEnd);
    default:
      return query;
  }
}

/**
 * One page of the admin vehicle list, searched and filtered in the database
 * (the vehicle_summaries view from 0006_vehicle_summaries.sql), so the app
 * never downloads every calibration table or hits PostgREST's row cap.
 */
export async function listVehicles({ search, expiry, offset, limit }: ListVehiclesQuery): Promise<ListVehiclesOutcome> {
  if (!isSupabaseConfigured || !supabase) {
    return { status: 'not-configured' };
  }
  // Reg numbers are stored normalised (no spaces, upper case); also drop the
  // LIKE wildcards so a typed % or _ is matched literally rather than as a pattern.
  const searchKey = normalizeRegNumber(search).replace(/[%_\\]/g, '');

  let query = supabase
    .from('vehicle_summaries')
    .select('reg_number, cert_no, expiry_date, compartment_count, total_nominal_liters', { count: 'exact' });
  if (searchKey) {
    query = query.ilike('reg_number', `%${searchKey}%`);
  }
  query = applyExpiryFilter(query, expiry);

  const { data, count, error } = await query.order('reg_number').range(offset, offset + limit - 1);
  if (error || !Array.isArray(data)) {
    return { status: 'error' };
  }
  return {
    status: 'ok',
    total: count ?? data.length,
    vehicles: (data as VehicleSummaryRow[]).map((row) => ({
      regNumber: row.reg_number,
      certNo: row.cert_no,
      expiryDate: row.expiry_date,
      compartmentCount: row.compartment_count,
      totalNominalLiters: Number(row.total_nominal_liters),
    })),
  };
}

/** How many vehicles fall in each validity bucket — counts only, no rows downloaded. */
export async function countVehicles(): Promise<VehicleCounts | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }
  const client = supabase;
  const filters: ExpiryFilter[] = ['all', 'expired', 'due-soon', 'valid'];
  const results = await Promise.all(
    filters.map((expiry) =>
      applyExpiryFilter(client.from('vehicle_summaries').select('reg_number', { count: 'exact', head: true }), expiry),
    ),
  );
  if (results.some((result) => result.error || result.count === null)) {
    return null;
  }
  return {
    all: results[0].count ?? 0,
    expired: results[1].count ?? 0,
    'due-soon': results[2].count ?? 0,
    valid: results[3].count ?? 0,
  };
}
