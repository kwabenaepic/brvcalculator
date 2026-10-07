import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TransitLossRecordInsert } from '@/utils/history';

/**
 * Device storage for calculations saved while offline, waiting to be
 * uploaded. Kept on the device so they survive the app being closed. The
 * upload itself is flushPendingRecords() in utils/history.ts; when it runs is
 * decided by components/pending-record-sync.tsx.
 */
export type PendingRecord = {
  row: TransitLossRecordInsert;
  /** Last upload failure that wasn't a connection problem, e.g. a permissions error. */
  lastError: string | null;
};

const STORAGE_KEY = 'pending-transit-loss-records';

type Listener = (records: PendingRecord[]) => void;
const listeners = new Set<Listener>();

export async function readPendingRecords(): Promise<PendingRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PendingRecord[]) : [];
  } catch {
    // Unreadable storage shouldn't stop the calculator working; treat as empty.
    return [];
  }
}

/** Replaces the stored queue and notifies subscribers. Throws if device storage fails. */
export async function writePendingRecords(records: PendingRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  listeners.forEach((listener) => listener(records));
}

/** Keeps a record on the device for later upload. Throws if device storage fails. */
export async function enqueuePendingRecord(row: TransitLossRecordInsert): Promise<void> {
  const queue = await readPendingRecords();
  await writePendingRecords([...queue, { row, lastError: null }]);
}

/** Called with the current queue whenever it changes. Returns an unsubscribe function. */
export function subscribeToPendingRecords(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
