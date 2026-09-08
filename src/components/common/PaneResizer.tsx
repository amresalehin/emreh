import React from 'react';
import { GripVertical } from 'lucide-react';

export interface PaneResizerProps {
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  title?: string;
  side?: 'left' | 'right';
  accentColor?: 'orange' | 'blue' | 'amber' | 'emerald' | 'stone' | 'indigo';
  className?: string;
}

export const PaneResizer: React.FC<PaneResizerProps> = ({
  isDragging,
  onMouseDown,
  onTouchStart,
  title = 'Drag to resize pane',
  accentColor = 'orange',
  className = ''
}) => {
  const getThemeClasses = () => {
    switch (accentColor) {
      case 'blue':
        return {
          dragBg: 'bg-blue-500/20',
          hoverBg: 'hover:bg-blue-500/10',
          activeLine: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]',
          hoverLine: 'group-hover:bg-blue-500/60',
          gripActive: 'bg-blue-500 text-white'
        };
      case 'amber':
        return {
          dragBg: 'bg-amber-500/20',
          hoverBg: 'hover:bg-amber-500/10',
          activeLine: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
          hoverLine: 'group-hover:bg-amber-500/60',
          gripActive: 'bg-amber-500 text-white'
        };
      case 'emerald':
        return {
          dragBg: 'bg-emerald-500/20',
          hoverBg: 'hover:bg-emerald-500/10',
          activeLine: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
          hoverLine: 'group-hover:bg-emerald-500/60',
          gripActive: 'bg-emerald-500 text-white'
        };
      case 'indigo':
        return {
          dragBg: 'bg-indigo-500/20',
          hoverBg: 'hover:bg-indigo-500/10',
          activeLine: 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]',
          hoverLine: 'group-hover:bg-indigo-500/60',
          gripActive: 'bg-indigo-500 text-white'
        };
      case 'stone':
        return {
          dragBg: 'bg-stone-500/20',
          hoverBg: 'hover:bg-stone-500/10',
          activeLine: 'bg-stone-500 shadow-[0_0_8px_rgba(120,113,108,0.6)]',
          hoverLine: 'group-hover:bg-stone-500/60',
          gripActive: 'bg-stone-600 text-white'
        };
      case 'orange':
      default:
        return {
          dragBg: 'bg-orange-500/20',
          hoverBg: 'hover:bg-orange-500/10',
          activeLine: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]',
          hoverLine: 'group-hover:bg-orange-500/60',
          gripActive: 'bg-orange-500 text-white'
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title={title}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className={`hidden md:flex relative group shrink-0 w-2.5 -mx-1 hover:w-2.5 transition-all cursor-col-resize select-none items-center justify-center z-30 ${
        isDragging ? `w-2.5 ${theme.dragBg}` : theme.hoverBg
      } ${className}`}
    >
      {/* Central divider line */}
      <div
        className={`w-px h-full transition-colors duration-150 ${
          isDragging
            ? theme.activeLine
            : `bg-stone-200/80 dark:bg-stone-800 ${theme.hoverLine}`
        }`}
      />

      {/* Floating Grip Handle Indicator */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 w-4 h-9 rounded-full flex items-center justify-center transition-all duration-150 pointer-events-none ${
          isDragging
            ? `opacity-100 ${theme.gripActive} scale-110 shadow-lg`
            : 'opacity-0 group-hover:opacity-100 bg-white dark:bg-stone-800 text-stone-400 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700 shadow-xs'
        }`}
      >
        <GripVertical className="w-2.5 h-2.5" />
      </div>

      {/* Dragging transparent overlay to prevent losing events during rapid pointer movement */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none pointer-events-auto" />
      )}
    </div>
  );
};
