import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface VirtualizedTableProps<T> {
  containerRef: React.RefObject<HTMLDivElement | null>;
  items: T[];
  renderHeader: () => React.ReactNode;
  renderRow: (item: T, index: number) => React.ReactNode;
  estimateRowHeight?: number;
  colSpan?: number;
  emptyState?: React.ReactNode;
  overscan?: number;
  className?: string;
  tableClassName?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  loadMoreThreshold?: number;
  themeColor?: 'emerald' | 'red' | 'cyan' | 'indigo' | 'blue' | 'amber' | 'rose' | 'sky';
}

const TABLE_COLOR_CLASSES: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  emerald: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  red: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25' },
  cyan: { dot: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25' },
  indigo: { dot: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/25' },
  blue: { dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25' },
  amber: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25' },
  rose: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/25' },
  sky: { dot: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/25' },
};

export function VirtualizedTable<T>({
  containerRef,
  items,
  renderHeader,
  renderRow,
  estimateRowHeight = 44,
  colSpan = 5,
  emptyState,
  overscan = 8,
  className = '',
  tableClassName = 'w-full text-left border-collapse text-xs',
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  loadMoreThreshold = 4,
  themeColor = 'emerald'
}: VirtualizedTableProps<T>) {
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimateRowHeight,
    overscan
  });

  // Infinite scroll trigger
  React.useEffect(() => {
    if (!onLoadMore || !hasMore || isLoadingMore) return;
    const virtualRows = rowVirtualizer.getVirtualItems();
    if (virtualRows.length === 0) return;
    const lastRow = virtualRows[virtualRows.length - 1];
    if (lastRow && lastRow.index >= items.length - 1 - loadMoreThreshold) {
      onLoadMore();
    }
  }, [rowVirtualizer, items.length, hasMore, isLoadingMore, onLoadMore, loadMoreThreshold]);

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom = virtualRows.length > 0
    ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
    : 0;

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className={tableClassName}>
        <thead className="sticky top-0 z-10 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md shadow-2xs">
          {renderHeader()}
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
          {paddingTop > 0 && (
            <tr>
              <td
                colSpan={colSpan}
                style={{ height: `${paddingTop}px`, padding: 0, border: 'none' }}
              />
            </tr>
          )}

          {virtualRows.map((virtualRow) => {
            const item = items[virtualRow.index];
            if (!item) return null;

            return (
              <React.Fragment key={(item as { id?: string | number })?.id || virtualRow.index}>
                {renderRow(item, virtualRow.index)}
              </React.Fragment>
            );
          })}

          {paddingBottom > 0 && (
            <tr>
              <td
                colSpan={colSpan}
                style={{ height: `${paddingBottom}px`, padding: 0, border: 'none' }}
              />
            </tr>
          )}

          {isLoadingMore && (
            <tr>
              <td colSpan={colSpan} className="py-4 text-center">
                {(() => {
                  const cfg = TABLE_COLOR_CLASSES[themeColor] || TABLE_COLOR_CLASSES.emerald;
                  return (
                    <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border} text-xs font-semibold backdrop-blur-md shadow-2xs`}>
                      <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-ping`} />
                      <span>Loading historical records...</span>
                    </div>
                  );
                })()}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
