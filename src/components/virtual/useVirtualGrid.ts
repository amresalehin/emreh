import { useState, useEffect, useMemo, RefObject } from 'react';
import { useVirtualizer, Virtualizer } from '@tanstack/react-virtual';

export interface VirtualGroup<T> {
  key: string;
  title: string;
  items: T[];
}

export type VirtualFeedRow<T> =
  | { type: 'header'; key: string; title: string; count: number }
  | { type: 'row'; key: string; items: T[]; groupKey: string; rowIndex: number };

export interface UseVirtualGridOptions<T> {
  containerRef: RefObject<HTMLDivElement | null>;
  groups: VirtualGroup<T>[];
  layoutMode: string; // 'grid' | 'cards' | 'feed' | 'compact' | 'detailed' | 'table'
  gridDensity?: string; // 'auto' | '2' | '3' | '4' | '5' | '6'
  isRightPanelOpen?: boolean;
  density?: 'compact' | 'comfortable' | 'spacious';
  overscan?: number;
}

export interface UseVirtualGridReturn<T> {
  cols: number;
  flattenedRows: VirtualFeedRow<T>[];
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  containerWidth: number;
}

/**
 * Calculates responsive column count based on container width and density setting
 */
export function calculateResponsiveColumns(
  width: number,
  densitySetting: string = 'auto',
  isRightPanelOpen: boolean = false
): number {
  // If explicitly specified by user (2 to 6)
  if (densitySetting && densitySetting !== 'auto') {
    const requested = parseInt(densitySetting, 10);
    if (!isNaN(requested) && requested >= 1 && requested <= 6) {
      // Don't allow more columns than can reasonably fit on a small screen
      if (width < 380) return 1;
      if (width < 560) return Math.min(requested, 2);
      if (width < 800) return Math.min(requested, 3);
      if (width < 1100) return Math.min(requested, 4);
      return requested;
    }
  }

  // Auto layout based on observed pixel width
  if (width < 440) return 1;
  if (width < 720) return 2;
  if (width < 1060) return isRightPanelOpen ? 2 : 3;
  if (width < 1400) return isRightPanelOpen ? 3 : 4;
  if (width < 1750) return isRightPanelOpen ? 4 : 5;
  return isRightPanelOpen ? 5 : 6;
}

/**
 * Returns estimated row height based on mode and density
 */
export function getEstimatedRowHeight(
  layoutMode: string,
  density: string = 'comfortable'
): number {
  if (layoutMode === 'compact') {
    return 60;
  }
  if (layoutMode === 'feed') {
    return 135;
  }
  if (layoutMode === 'detailed') {
    return 170;
  }
  if (layoutMode === 'grid' || layoutMode === 'cards' || layoutMode === 'moodboard') {
    if (density === 'compact') return 290;
    if (density === 'spacious') return 390;
    return 340;
  }
  return 110;
}

export function useVirtualGrid<T>({
  containerRef,
  groups,
  layoutMode,
  gridDensity = 'auto',
  isRightPanelOpen = false,
  density = 'comfortable',
  overscan = 5
}: UseVirtualGridOptions<T>): UseVirtualGridReturn<T> {
  const [containerWidth, setContainerWidth] = useState<number>(() => {
    return containerRef.current?.clientWidth || 800;
  });

  // Track container width changes via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initial measurement
    setContainerWidth(el.clientWidth || 800);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          setContainerWidth(w);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  // Determine column count
  const cols = useMemo(() => {
    if (layoutMode !== 'grid' && layoutMode !== 'cards' && layoutMode !== 'moodboard') {
      return 1;
    }
    return calculateResponsiveColumns(containerWidth, gridDensity, isRightPanelOpen);
  }, [layoutMode, containerWidth, gridDensity, isRightPanelOpen]);

  // Flatten groups and items into virtual rows
  const flattenedRows = useMemo<VirtualFeedRow<T>[]>(() => {
    const rows: VirtualFeedRow<T>[] = [];

    for (const group of groups) {
      if (group.title) {
        rows.push({
          type: 'header',
          key: `header-${group.key || group.title}`,
          title: group.title,
          count: group.items.length
        });
      }

      if (cols <= 1) {
        for (let i = 0; i < group.items.length; i++) {
          const item = group.items[i];
          const itemKey = (item as { id?: string | number })?.id?.toString() || `item-${group.key}-${i}`;
          rows.push({
            type: 'row',
            key: `row-${group.key}-${itemKey}`,
            items: [item],
            groupKey: group.key,
            rowIndex: i
          });
        }
      } else {
        for (let i = 0; i < group.items.length; i += cols) {
          const chunk = group.items.slice(i, i + cols);
          rows.push({
            type: 'row',
            key: `grid-row-${group.key}-${i}`,
            items: chunk,
            groupKey: group.key,
            rowIndex: Math.floor(i / cols)
          });
        }
      }
    }

    return rows;
  }, [groups, cols]);

  const estimatedRowHeight = useMemo(() => {
    return getEstimatedRowHeight(layoutMode, density);
  }, [layoutMode, density]);

  // Initialize TanStack Virtualizer
  const virtualizer = useVirtualizer({
    count: flattenedRows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => {
      const row = flattenedRows[index];
      if (row?.type === 'header') return 44;
      return estimatedRowHeight;
    },
    overscan
  });

  return {
    cols,
    flattenedRows,
    virtualizer,
    containerWidth
  };
}
