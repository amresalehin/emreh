import React, { useState, useEffect, useCallback, useRef } from 'react';

export interface UseResizablePaneOptions {
  initialWidth: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  direction?: 'left' | 'right';
}

export function useResizablePane({
  initialWidth,
  minWidth = 260,
  maxWidth = 750,
  storageKey,
  direction = 'left'
}: UseResizablePaneOptions) {
  const [width, setWidth] = useState<number>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to read saved pane width', e);
      }
    }
    return initialWidth;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(width);

  const startDrag = useCallback((clientX: number) => {
    setIsDragging(true);
    dragStartXRef.current = clientX;
    startWidthRef.current = width;
  }, [width]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.clientX);
  }, [startDrag]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX);
    }
  }, [startDrag]);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (clientX: number) => {
      const deltaX = clientX - dragStartXRef.current;
      let newWidth = direction === 'left' 
        ? startWidthRef.current + deltaX 
        : startWidthRef.current - deltaX;

      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;

      setWidth(newWidth);
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handlePointerMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handlePointerMove(e.touches[0].clientX);
      }
    };

    const handlePointerEnd = () => {
      setIsDragging(false);
      // Dispatch window resize event so Leaflet maps and charts recalculate
      window.dispatchEvent(new Event('resize'));
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handlePointerEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handlePointerEnd);

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handlePointerEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handlePointerEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, minWidth, maxWidth, direction]);

  // Persist width changes
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, width.toString());
      } catch (e) {
        // ignore storage errors
      }
    }
  }, [width, storageKey]);

  return {
    width,
    setWidth,
    isDragging,
    handleMouseDown,
    handleTouchStart
  };
}
