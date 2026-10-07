import { addNetworkStateListener } from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { readLastFullDownloadAt } from '@/utils/vehicle-cache';
import { downloadVehiclesForOffline } from '@/utils/vehicle-lookup';

// Calibration data changes rarely, and any lookup made with signal fetches
// the latest copy anyway, so a few full downloads a day is plenty while
// keeping mobile data use low.
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

let downloading: Promise<void> | null = null;

/** Downloads every vehicle unless that was done recently. Concurrent calls share one run. */
function refreshIfDue(): Promise<void> {
  downloading ??= (async () => {
    try {
      const last = await readLastFullDownloadAt();
      if (last && Date.now() - Date.parse(last) < REFRESH_INTERVAL_MS) {
        return;
      }
      await downloadVehiclesForOffline();
    } finally {
      downloading = null;
    }
  })();
  return downloading;
}

/**
 * Keeps every vehicle's calibration data on the device, so any vehicle can be
 * calculated without signal, not just ones looked up before. Renders nothing;
 * mounted once in the root layout. Checks at start-up, when the connection
 * returns and when the app comes back to the foreground.
 */
export function VehicleCacheSync() {
  useEffect(() => {
    refreshIfDue();

    const network = addNetworkStateListener(({ isConnected, isInternetReachable }) => {
      if (isConnected && isInternetReachable !== false) {
        refreshIfDue();
      }
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshIfDue();
      }
    });
    return () => {
      network.remove();
      appState.remove();
    };
  }, []);

  return null;
}
