import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUpDown,
  ChevronDown,
  Check,
  Clock,
  ArrowDownAZ
} from 'lucide-react';

export type BookmarkSortOption = 'newest' | 'oldest' | 'title';

interface BookmarkSortMenuProps {
  sortBy: BookmarkSortOption;
  onChangeSortBy: (sort: BookmarkSortOption) => void;
  className?: string;
}

const SORT_OPTIONS: { id: BookmarkSortOption; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'newest', label: 'Newest First', icon: Clock },
  { id: 'oldest', label: 'Oldest First', icon: Clock },
  { id: 'title', label: 'Title (A-Z)', icon: ArrowDownAZ }
];

export const BookmarkSortMenu: React.FC<BookmarkSortMenuProps> = ({
  sortBy,
  onChangeSortBy,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeOption = SORT_OPTIONS.find(o => o.id === sortBy) || SORT_OPTIONS[0];

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button beside View button */}
      <button aria-label="Action"
        type="button"
        id="bookmark-sort-button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
          isOpen
            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
            : 'bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 border-gray-200/90 dark:border-white/10 shadow-2xs'
        }`}
        title="Sort bookmarks"
      >
        <ArrowUpDown className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span className="font-semibold text-[11px] text-gray-400">Sort:</span>
        <span className="font-bold">{activeOption.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          id="bookmark-sort-dropdown"
          className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#202124] text-gray-200 border border-neutral-700/80 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 select-none text-xs"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 border-b border-neutral-700/60 mb-1 flex items-center justify-between">
            <span>Sort Order</span>
            <ArrowUpDown className="w-3 h-3 text-blue-400" />
          </div>

          <div className="space-y-0.5">
            {SORT_OPTIONS.map(option => {
              const Icon = option.icon;
              const isSelected = sortBy === option.id;
              return (
                <button aria-label="Action"
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChangeSortBy(option.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/40'
                      : 'hover:bg-white/5 text-gray-300 font-medium border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
                    <span className="truncate">{option.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
