import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

export interface UseInfiniteHistoricalFeedOptions<T> {
  /** Full collection of items to paginate through */
  items: T[];
  /** Chunk size per pagination batch (default: 50) */
  chunkSize?: number;
  /** Initial number of items to load immediately (default: 50) */
  initialCount?: number;
  /** Dependencies that should reset the chunk counter back to initialCount (e.g. search, filters, dates) */
  resetDependencies?: any[];
}

export interface UseInfiniteHistoricalFeedReturn<T> {
  /** The slice of items currently loaded into memory */
  visibleItems: T[];
  /** Total number of items in the dataset */
  totalCount: number;
  /** Number of items currently loaded */
  loadedCount: number;
  /** Whether there are more items to load beyond the current chunk */
  hasMore: boolean;
  /** Whether a chunk is currently being loaded */
  isLoadingMore: boolean;
  /** Function to trigger loading the next chunk (can be passed to VirtualizedFeed/VirtualizedTable onLoadMore) */
  loadNextChunk: () => void;
  /** Reset chunk count back to initial */
  resetChunks: () => void;
}

/**
 * High-performance hook for loading historical records in chunks as the user
 * scrolls near the end of a virtualized list or table. Keeps memory footprint
 * low and scroll performance at 60 FPS.
 */
export function useInfiniteHistoricalFeed<T>({
  items,
  chunkSize = 50,
  initialCount = 50,
  resetDependencies = []
}: UseInfiniteHistoricalFeedOptions<T>): UseInfiniteHistoricalFeedReturn<T> {
  const [loadedCount, setLoadedCount] = useState<number>(() => {
    return Math.min(initialCount, items.length || initialCount);
  });
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const loadingTimerRef = useRef<any>(null);

  // Reset chunk count whenever filtering / search query / date range changes
  useEffect(() => {
    setLoadedCount(Math.min(initialCount, items.length || initialCount));
    setIsLoadingMore(false);
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
  }, [items.length, initialCount, ...resetDependencies]);

  // Clean up any pending timer on unmount
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, []);

  const totalCount = items.length;
  const hasMore = loadedCount < totalCount;

  const loadNextChunk = useCallback(() => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    // Microtask / smooth frame tick to ensure UI does not stutter
    loadingTimerRef.current = setTimeout(() => {
      setLoadedCount(prev => Math.min(prev + chunkSize, items.length));
      setIsLoadingMore(false);
    }, 80);
  }, [hasMore, isLoadingMore, chunkSize, items.length]);

  const resetChunks = useCallback(() => {
    setLoadedCount(Math.min(initialCount, items.length || initialCount));
    setIsLoadingMore(false);
  }, [initialCount, items.length]);

  // Sliced items for the virtualizer
  const visibleItems = useMemo(() => {
    return items.slice(0, loadedCount);
  }, [items, loadedCount]);

  return {
    visibleItems,
    totalCount,
    loadedCount,
    hasMore,
    isLoadingMore,
    loadNextChunk,
    resetChunks
  };
}
