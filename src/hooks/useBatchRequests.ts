import { useCallback, useRef } from 'react';

interface BatchRequest<T> {
  resolver: (value: T) => void;
  rejector: (error: any) => void;
}

export function useBatchRequests<T, P>(
  batchFetcher: (params: P[]) => Promise<T[]>,
  delay: number = 50
) {
  const batchQueue = useRef<{ params: P; request: BatchRequest<T> }[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const executeBatch = useCallback(async () => {
    if (batchQueue.current.length === 0) return;

    const currentBatch = [...batchQueue.current];
    batchQueue.current = [];

    try {
      const params = currentBatch.map(item => item.params);
      const results = await batchFetcher(params);

      currentBatch.forEach((item, index) => {
        item.request.resolver(results[index]);
      });
    } catch (error) {
      currentBatch.forEach(item => {
        item.request.rejector(error);
      });
    }
  }, [batchFetcher]);

  const addToBatch = useCallback((params: P): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      batchQueue.current.push({
        params,
        request: { resolver: resolve, rejector: reject },
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        executeBatch();
      }, delay);
    });
  }, [executeBatch, delay]);

  return addToBatch;
}
