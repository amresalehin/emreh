import { useState, useEffect, useCallback } from 'react';

const ZOOM_STORAGE_KEY = 'emreh_app_zoom_level';

export const ZOOM_PRESETS = [
  { value: 0.75, label: '75%', desc: 'Ultra-Compact' },
  { value: 0.85, label: '85%', desc: 'Compact Laptop' },
  { value: 0.9, label: '90%', desc: 'Standard Laptop' },
  { value: 1.0, label: '100%', desc: 'Default (1:1)' },
  { value: 1.1, label: '110%', desc: 'Comfortable' },
  { value: 1.25, label: '125%', desc: 'Large / Touch' },
] as const;

export function useAppZoom() {
  const [zoom, setZoomState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(ZOOM_STORAGE_KEY);
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.5 && val <= 2.0) {
          return val;
        }
      }
      // Auto-detect smaller laptop screens (e.g. height <= 800 or width <= 1366)
      if (typeof window !== 'undefined' && window.innerWidth <= 1366 && window.innerWidth > 768) {
        return 0.9;
      }
    } catch {
      // Fallback
    }
    return 1.0;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    const timer = setTimeout(() => setToastMessage(null), 1400);
    return () => clearTimeout(timer);
  }, []);

  const setZoom = useCallback((newZoom: number) => {
    const clamped = Math.round(Math.min(1.5, Math.max(0.65, newZoom)) * 100) / 100;
    setZoomState(clamped);
    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, clamped.toString());
    } catch {
      // ignore
    }
    showToast(`Scale: ${Math.round(clamped * 100)}%`);
  }, [showToast]);

  const zoomIn = useCallback(() => {
    setZoom(zoom + 0.05);
  }, [zoom, setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(zoom - 0.05);
  }, [zoom, setZoom]);

  const resetZoom = useCallback(() => {
    setZoom(1.0);
  }, [setZoom]);

  // Global Keyboard shortcuts: Cmd/Ctrl + '+', '-', '0'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only capture if Ctrl or Meta key is pressed and not typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        zoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom]);

  return {
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    toastMessage,
    isZoomed: zoom !== 1.0,
  };
}
