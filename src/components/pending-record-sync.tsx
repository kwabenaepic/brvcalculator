import { addNetworkStateListener } from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { usePendingRecords } from '@/hooks/use-pending-records';
import { flushPendingRecords } from '@/utils/history';

// While records are waiting, also retry on a timer: "connected" events don't
// fire when a weak signal merely improves, and the server may have been the
// problem rather than the phone.
const RETRY_INTERVAL_MS = 60_000;

/**
 * Uploads calculations saved while offline. Renders nothing; mounted once in
 * the root layout. Uploads run at start-up, when the connection returns, when
 * the app comes back to the foreground, and periodically while any wait.
 */
export function PendingRecordSync() {
  const { pending } = usePendingRecords();
  const hasPending = pending.length > 0;

  useEffect(() => {
    flushPendingRecords();

    const network = addNetworkStateListener(({ isConnected, isInternetReachable }) => {
      if (isConnected && isInternetReachable !== false) {
        flushPendingRecords();
      }
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        flushPendingRecords();
      }
    });
    return () => {
      network.remove();
      appState.remove();
    };
  }, []);

  useEffect(() => {
    if (!hasPending) {
      return;
    }
    const timer = setInterval(flushPendingRecords, RETRY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasPending]);

  return null;
}
