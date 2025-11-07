import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const queryCache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useOptimizedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    cacheDuration?: number;
    enabled?: boolean;
    refetchOnMount?: boolean;
  }
) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cacheDuration = options?.cacheDuration ?? CACHE_DURATION;
  const enabled = options?.enabled ?? true;
  const refetchOnMount = options?.refetchOnMount ?? false;

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    const cached = queryCache.get(key);
    const now = Date.now();

    // Return cached data if valid
    if (!force && cached && (now - cached.timestamp) < cacheDuration) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await fetcher();
      
      // Update cache
      queryCache.set(key, {
        data: result,
        timestamp: now,
      });
      
      setData(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error(`Query error for ${key}:`, err);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, enabled, cacheDuration]);

  useEffect(() => {
    if (refetchOnMount) {
      fetchData(true);
    } else {
      fetchData();
    }
  }, [fetchData, refetchOnMount]);

  const invalidate = useCallback(() => {
    queryCache.delete(key);
    fetchData(true);
  }, [key, fetchData]);

  return { data, loading, error, refetch: () => fetchData(true), invalidate };
}

// Clear all cache
export function clearQueryCache() {
  queryCache.clear();
}

// Clear specific cache entry
export function clearCacheEntry(key: string) {
  queryCache.delete(key);
}
