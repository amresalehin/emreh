import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUpDown,
  ChevronDown,
  Check,
  Clock,
  Flame,
  Globe,
  ArrowDownAZ
} from 'lucide-react';
import { BrowserSortOption } from './BrowserViewMenu';

interface BrowserSortMenuProps {
  sortBy: BrowserSortOption;
  onChangeSortBy: (sort: BrowserSortOption) => void;
  className?: string;
}

const SORT_OPTIONS: { id: BrowserSortOption; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'newest', label: 'Newest First', icon: Clock },
  { id: 'oldest', label: 'Oldest First', icon: Clock },
  { id: 'most_visited', label: 'Most Visited', icon: Flame },
  { id: 'domain_freq', label: 'Top Domains', icon: Globe },
  { id: 'title_asc', label: 'Title (A-Z)', icon: ArrowDownAZ },
  { id: 'domain_asc', label: 'Domain (A-Z)', icon: Globe }
];

export const BrowserSortMenu: React.FC<BrowserSortMenuProps> = ({
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
        id="browser-sort-button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
          isOpen
            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
            : 'bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 border-gray-200/90 dark:border-white/10 shadow-2xs'
        }`}
        title="Sort items"
      >
        <ArrowUpDown className="w-3.5 h-3.5 text-sky-500 shrink-0" />
        <span className="font-semibold text-[11px] text-gray-400">Sort:</span>
        <span className="font-bold">{activeOption.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          id="browser-sort-dropdown"
          className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#202124] text-gray-200 border border-neutral-700/80 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 select-none text-xs"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 border-b border-neutral-700/60 mb-1 flex items-center justify-between">
            <span>Sort Order</span>
            <ArrowUpDown className="w-3 h-3 text-sky-400" />
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
                      ? 'bg-sky-600/30 text-sky-300 font-bold border border-sky-500/40'
                      : 'hover:bg-white/5 text-gray-300 font-medium border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-sky-400' : 'text-gray-400'}`} />
                    <span className="truncate">{option.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
