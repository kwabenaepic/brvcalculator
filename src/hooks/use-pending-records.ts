import { useCallback, useEffect, useState } from 'react';

import { flushPendingRecords } from '@/utils/history';
import { readPendingRecords, subscribeToPendingRecords, type PendingRecord } from '@/utils/pending-records';

/** Calculations saved offline and not yet uploaded; updates as the queue changes. */
export function usePendingRecords() {
  const [pending, setPending] = useState<PendingRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readPendingRecords().then((records) => {
      if (!cancelled) {
        setPending(records);
      }
    });
    const unsubscribe = subscribeToPendingRecords(setPending);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const uploadNow = useCallback(async () => {
    setIsUploading(true);
    await flushPendingRecords();
    setIsUploading(false);
  }, []);

  return { pending, isUploading, uploadNow };
}
