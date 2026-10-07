import AsyncStorage from '@react-native-async-storage/async-storage';

import type { VehicleDetails } from '@/utils/vehicle-lookup';

/**
 * Device copies of vehicle calibration data, so the calculator works without
 * signal. Filled one vehicle at a time by successful lookups, and in full by
 * downloadVehiclesForOffline() in utils/vehicle-lookup.ts; when that runs is
 * decided by components/vehicle-cache-sync.tsx.
 */
export type CachedVehicle = {
  details: VehicleDetails;
  /** When this copy was fetched from the server; null for copies saved before this was tracked. */
  savedAt: string | null;
};

const KEY_PREFIX = 'vehicle-cache:';
const FULL_DOWNLOAD_KEY = 'vehicle-cache-full-download-at';

function cacheKey(normalizedRegNumber: string): string {
  return `${KEY_PREFIX}${normalizedRegNumber}`;
}

export async function readCachedVehicle(normalizedRegNumber: string): Promise<CachedVehicle | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(normalizedRegNumber));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedVehicle | VehicleDetails;
    // Older copies stored the details directly, without a saved-at time.
    return 'details' in parsed ? parsed : { details: parsed, savedAt: null };
  } catch {
    return null;
  }
}

/** Best effort: a full device store shouldn't break a lookup that already succeeded. */
export async function cacheVehicle(normalizedRegNumber: string, details: VehicleDetails): Promise<void> {
  const entry: CachedVehicle = { details, savedAt: new Date().toISOString() };
  try {
    await AsyncStorage.setItem(cacheKey(normalizedRegNumber), JSON.stringify(entry));
  } catch {
    // Keep going without the offline copy.
  }
}

/**
 * Replaces the device copies with a complete download from the server.
 * Vehicles no longer on the server are removed, so a deleted vehicle can't be
 * used offline. Throws if device storage fails.
 */
export async function replaceCachedVehicles(vehicles: Map<string, VehicleDetails>): Promise<void> {
  const savedAt = new Date().toISOString();
  await AsyncStorage.multiSet(
    [...vehicles].map(([regNumber, details]): [string, string] => [
      cacheKey(regNumber),
      JSON.stringify({ details, savedAt } satisfies CachedVehicle),
    ]),
  );
  const keep = new Set([...vehicles.keys()].map(cacheKey));
  const stale = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(KEY_PREFIX) && !keep.has(key));
  if (stale.length > 0) {
    await AsyncStorage.multiRemove(stale);
  }
  await AsyncStorage.setItem(FULL_DOWNLOAD_KEY, savedAt);
}

/** When every vehicle was last downloaded to this device, or null if never. */
export async function readLastFullDownloadAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FULL_DOWNLOAD_KEY);
  } catch {
    return null;
  }
}
