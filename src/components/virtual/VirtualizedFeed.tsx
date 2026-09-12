import React from 'react';
import { useVirtualGrid, VirtualGroup } from './useVirtualGrid';

export interface VirtualizedFeedProps<T> {
  containerRef: React.RefObject<HTMLDivElement | null>;
  groups: VirtualGroup<T>[];
  layoutMode: string;
  gridDensity?: string;
  isRightPanelOpen?: boolean;
  density?: 'compact' | 'comfortable' | 'spacious';
  renderItem: (item: T, indexInRow: number) => React.ReactNode;
  renderHeader?: (title: string, count: number) => React.ReactNode;
  gap?: number;
  emptyState?: React.ReactNode;
  overscan?: number;
  className?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  loadMoreThreshold?: number;
  themeColor?: 'emerald' | 'red' | 'cyan' | 'indigo' | 'blue' | 'amber' | 'rose' | 'sky';
}

const COLOR_CLASSES: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  emerald: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  red: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25' },
  cyan: { dot: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25' },
  indigo: { dot: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/25' },
  blue: { dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25' },
  amber: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25' },
  rose: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/25' },
  sky: { dot: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/25' },
};

export function VirtualizedFeed<T>({
  containerRef,
  groups,
  layoutMode,
  gridDensity = 'auto',
  isRightPanelOpen = false,
  density = 'comfortable',
  renderItem,
  renderHeader,
  gap = 12,
  emptyState,
  overscan = 5,
  className = '',
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  loadMoreThreshold = 3,
  themeColor = 'emerald'
}: VirtualizedFeedProps<T>) {
  const { cols, flattenedRows, virtualizer } = useVirtualGrid({
    containerRef,
    groups,
    layoutMode,
    gridDensity,
    isRightPanelOpen,
    density,
    overscan
  });

  // Infinite scroll listener as user nears the end of the virtualized rows
  React.useEffect(() => {
    if (!onLoadMore || !hasMore || isLoadingMore) return;
    const virtualItems = virtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;
    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem && lastItem.index >= flattenedRows.length - 1 - loadMoreThreshold) {
      onLoadMore();
    }
  }, [virtualizer, flattenedRows.length, hasMore, isLoadingMore, onLoadMore, loadMoreThreshold]);

  const totalItemsCount = React.useMemo(() => {
    return groups.reduce((acc, g) => acc + g.items.length, 0);
  }, [groups]);

  if (totalItemsCount === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      className={`relative w-full ${className}`}
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        contain: 'layout paint'
      }}
    >
      {virtualItems.map((virtualRow) => {
        const rowData = flattenedRows[virtualRow.index];
        if (!rowData) return null;

        if (rowData.type === 'header') {
          return (
            <div
              key={virtualRow.key}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`
              }}
              className="pb-2.5 pt-1"
            >
              {renderHeader ? (
                renderHeader(rowData.title, rowData.count)
              ) : (
                <div className="flex items-center gap-2 pt-1 pb-0.5">
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    {rowData.title}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono">
                    {rowData.count}
                  </span>
                </div>
              )}
            </div>
          );
        }

        // Row of items
        const isSingleCol = cols <= 1;
        return (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`
            }}
            className="pb-3"
          >
            {isSingleCol ? (
              <div>{renderItem(rowData.items[0], 0)}</div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gap: `${gap}px`
                }}
              >
                {rowData.items.map((item, idx) => (
                  <div key={(item as { id?: string | number })?.id || idx} className="min-w-0">
                    {renderItem(item, idx)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Tinged Infinite Loading Indicator */}
      {isLoadingMore && (
        <div
          style={{
            position: 'absolute',
            bottom: -52,
            left: 0,
            width: '100%',
            height: '44px'
          }}
          className="flex items-center justify-center pointer-events-none"
        >
          {(() => {
            const cfg = COLOR_CLASSES[themeColor] || COLOR_CLASSES.emerald;
            return (
              <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border} text-xs font-semibold backdrop-blur-md shadow-2xs`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-ping`} />
                <span>Loading historical records...</span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
