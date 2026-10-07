import { useCallback, useEffect, useRef, useState } from 'react';

import {
  countVehicles,
  listVehicles,
  type ExpiryFilter,
  type VehicleCounts,
  type VehicleSummary,
} from '@/utils/vehicle-lookup';

export type VehicleListStatus = 'loading' | 'ok' | 'error' | 'not-configured';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Admin vehicle list, searched and filtered in the database a page at a time —
 * the full list is never downloaded, so it stays quick at hundreds or
 * thousands of vehicles.
 */
export function useVehicleList() {
  const [search, setSearch] = useState('');
  const [expiry, setExpiry] = useState<ExpiryFilter>('all');
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<VehicleCounts | null>(null);
  const [status, setStatus] = useState<VehicleListStatus>('loading');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Responses can land out of order while someone types; only the latest
  // request is allowed to update the list.
  const requestId = useRef(0);

  const loadFirstPage = useCallback(async (searchText: string, expiryFilter: ExpiryFilter) => {
    const id = ++requestId.current;
    setStatus('loading');
    const outcome = await listVehicles({ search: searchText, expiry: expiryFilter, offset: 0, limit: PAGE_SIZE });
    if (id !== requestId.current) {
      return;
    }
    if (outcome.status === 'ok') {
      setVehicles(outcome.vehicles);
      setTotal(outcome.total);
    }
    setStatus(outcome.status);
  }, []);

  const loadCounts = useCallback(async () => {
    setCounts(await countVehicles());
  }, []);

  // Typing waits for a short pause before querying; changing the filter
  // queries straight away.
  useEffect(() => {
    const timer = setTimeout(() => loadFirstPage(search, expiry), search ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [search, expiry, loadFirstPage]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const loadMore = async () => {
    if (isLoadingMore || vehicles.length >= total) {
      return;
    }
    const id = requestId.current;
    setIsLoadingMore(true);
    const outcome = await listVehicles({ search, expiry, offset: vehicles.length, limit: PAGE_SIZE });
    setIsLoadingMore(false);
    // Drop the page if the search or filter changed while it was loading.
    if (id !== requestId.current || outcome.status !== 'ok') {
      return;
    }
    setVehicles((current) => [...current, ...outcome.vehicles]);
    setTotal(outcome.total);
  };

  const refresh = useCallback(() => {
    loadFirstPage(search, expiry);
    loadCounts();
  }, [loadFirstPage, loadCounts, search, expiry]);

  return {
    vehicles,
    total,
    counts,
    status,
    search,
    setSearch,
    expiry,
    setExpiry,
    loadMore,
    isLoadingMore,
    hasMore: vehicles.length < total,
    refresh,
  };
}
