import { useCallback, useEffect, useRef, useState } from 'react';

import {
  listTransitLossRecords,
  saveTransitLossRecord,
  type SaveTransitLossRecordInput,
  type TransitLossRecord,
} from '@/utils/history';

export type HistoryListStatus = 'loading' | 'loaded' | 'error' | 'not-configured';
/** 'queued': saved on the device while offline, uploads automatically later. */
export type HistorySaveStatus = 'idle' | 'saving' | 'saved' | 'queued' | 'error' | 'not-configured';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

/** Saving a calculation to history (or the offline queue). */
export function useTransitLossHistory() {
  const [saveStatus, setSaveStatus] = useState<HistorySaveStatus>('idle');

  const saveRecord = useCallback(async (input: SaveTransitLossRecordInput) => {
    setSaveStatus('saving');
    const outcome = await saveTransitLossRecord(input);
    setSaveStatus(outcome.status === 'ok' ? 'saved' : outcome.status);
  }, []);

  return { saveRecord, saveStatus };
}

/**
 * Saved records, newest first, searched in the database a page at a time so
 * older records can be found without downloading the whole history.
 */
export function useTransitLossRecords() {
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<TransitLossRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [listStatus, setListStatus] = useState<HistoryListStatus>('loading');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Responses can land out of order while someone types; only the latest
  // request is allowed to update the list.
  const requestId = useRef(0);

  const loadFirstPage = useCallback(async (searchText: string) => {
    const id = ++requestId.current;
    setListStatus('loading');
    const outcome = await listTransitLossRecords({ search: searchText, offset: 0, limit: PAGE_SIZE });
    if (id !== requestId.current) {
      return;
    }
    if (outcome.status === 'ok') {
      setRecords(outcome.records);
      setTotal(outcome.total);
      setListStatus('loaded');
    } else {
      setListStatus(outcome.status);
    }
  }, []);

  // Typing waits for a short pause before querying; the first load is immediate.
  useEffect(() => {
    const timer = setTimeout(() => loadFirstPage(search), search ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [search, loadFirstPage]);

  const loadMore = async () => {
    if (isLoadingMore || records.length >= total) {
      return;
    }
    const id = requestId.current;
    setIsLoadingMore(true);
    const outcome = await listTransitLossRecords({ search, offset: records.length, limit: PAGE_SIZE });
    setIsLoadingMore(false);
    // Drop the page if the search changed while it was loading.
    if (id !== requestId.current || outcome.status !== 'ok') {
      return;
    }
    // Records saved since the first page push older ones down a place, so
    // the next page can repeat a few; keep each record once.
    setRecords((current) => {
      const seen = new Set(current.map((record) => record.id));
      return [...current, ...outcome.records.filter((record) => !seen.has(record.id))];
    });
    setTotal(outcome.total);
  };

  const refresh = useCallback(() => loadFirstPage(search), [loadFirstPage, search]);

  return {
    records,
    total,
    listStatus,
    search,
    setSearch,
    loadMore,
    isLoadingMore,
    hasMore: records.length < total,
    refresh,
  };
}
