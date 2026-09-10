import React from 'react';
import { GripVertical } from 'lucide-react';

interface PaneResizerProps {
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  title?: string;
  side?: 'left' | 'right';
}

export const PaneResizer: React.FC<PaneResizerProps> = ({
  isDragging,
  onMouseDown,
  title = 'Drag to resize pane',
  side = 'left'
}) => {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title={title}
      onMouseDown={onMouseDown}
      className={`relative group shrink-0 w-2 hover:w-2 transition-all cursor-col-resize select-none flex items-center justify-center z-20 ${
        isDragging ? 'w-2 bg-amber-500/20' : 'hover:bg-amber-500/10'
      }`}
    >
      {/* Central hairline divider */}
      <div
        className={`w-px h-full transition-colors ${
          isDragging
            ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
            : 'bg-stone-200/80 dark:bg-stone-800 group-hover:bg-amber-500/60'
        }`}
      />

      {/* Floating Grip Indicator */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 w-4 h-8 rounded-full flex items-center justify-center transition-all pointer-events-none ${
          isDragging
            ? 'opacity-100 bg-amber-500 text-white scale-110 shadow-md'
            : 'opacity-0 group-hover:opacity-100 bg-white dark:bg-stone-800 text-stone-400 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700 shadow-xs'
        }`}
      >
        <GripVertical className="w-2.5 h-2.5" />
      </div>

      {/* Active dragging full-screen interaction cover */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none pointer-events-auto" />
      )}
    </div>
  );
};
