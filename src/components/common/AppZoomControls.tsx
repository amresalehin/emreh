import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Monitor, ChevronDown } from 'lucide-react';
import { ZOOM_PRESETS } from '../../hooks/useAppZoom';

interface AppZoomControlsProps {
  zoom: number;
  onSetZoom: (val: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  variant?: 'compact' | 'full' | 'dropdown';
  className?: string;
}

export const AppZoomControls: React.FC<AppZoomControlsProps> = ({
  zoom,
  onSetZoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  variant = 'compact',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const percentLabel = `${Math.round(zoom * 100)}%`;

  if (variant === 'full') {
    return (
      <div className={`flex flex-col gap-3 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-gray-900 dark:text-white">Interface Scale & Zoom</span>
          </div>
          <span className="text-xs font-mono font-bold text-amber-500">{percentLabel}</span>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Scale UI to fit your laptop screen or mobile viewport. Shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[10px]">Ctrl +/-</kbd>
        </p>

        {/* Preset Pills */}
        <div className="grid grid-cols-3 gap-1.5">
          {ZOOM_PRESETS.map((preset) => {
            const isActive = Math.abs(zoom - preset.value) < 0.03;
            return (
              <button aria-label="Action"
                key={preset.value}
                onClick={() => onSetZoom(preset.value)}
                className={`py-1.5 px-2 rounded-xl text-xs font-medium transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-black font-bold shadow-xs'
                    : 'bg-white/60 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/20'
                }`}
              >
                <span>{preset.label}</span>
                <span className="text-[9px] opacity-75">{preset.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Manual Stepper */}
        <div className="flex items-center justify-between pt-1">
          <button aria-label="Action"
            onClick={onZoomOut}
            disabled={zoom <= 0.65}
            className="px-3 py-1.5 rounded-lg bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-30 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" /> Smaller
          </button>
          <button aria-label="Action"
            onClick={onResetZoom}
            className="px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset (100%)
          </button>
          <button aria-label="Action"
            onClick={onZoomIn}
            disabled={zoom >= 1.5}
            className="px-3 py-1.5 rounded-lg bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-30 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" /> Larger
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={menuRef} className={`relative inline-flex items-center ${className}`}>
      <div className="inline-flex items-center bg-black/5 dark:bg-white/10 border border-black/8 dark:border-white/10 rounded-xl p-0.5 shadow-2xs backdrop-blur-md">
        <button
          onClick={onZoomOut}
          disabled={zoom <= 0.65}
          title="Zoom Out (Ctrl -)"
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30 transition-colors cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button aria-label="Action"
          onClick={() => setIsOpen(!isOpen)}
          title="Change View Scale"
          className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-gray-700 dark:text-gray-200 hover:text-amber-500 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>{percentLabel}</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        <button aria-label="Action"
          onClick={onZoomIn}
          disabled={zoom >= 1.5}
          title="Zoom In (Ctrl +)"
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30 transition-colors cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-[#1c1c1f] border border-black/10 dark:border-white/10 rounded-2xl shadow-xl p-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
            Screen Fit & Zoom
          </div>
          {ZOOM_PRESETS.map((p) => {
            const isActive = Math.abs(zoom - p.value) < 0.03;
            return (
              <button aria-label="Action"
                key={p.value}
                onClick={() => {
                  onSetZoom(p.value);
                  setIsOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>{p.desc}</span>
                <span className="font-mono text-[11px] opacity-75">{p.label}</span>
              </button>
            );
          })}
          {zoom !== 1.0 && (
            <div className="pt-1 mt-1 border-t border-black/5 dark:border-white/5">
              <button aria-label="Action"
                onClick={() => {
                  onResetZoom();
                  setIsOpen(false);
                }}
                className="w-full px-2.5 py-1 text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Reset Scale</span>
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
