import React, { useState, useRef, useEffect } from 'react';
import {
  Columns3,
  Table,
  Check,
  ChevronDown,
  ArrowUpDown,
  RotateCcw,
  FolderTree,
  Eye,
  BookmarkCheck
} from 'lucide-react';

export type BrowserLayoutMode = 'moodboard' | 'table' | 'cards' | 'feed' | 'compact';
export type BrowserSortOption = 'newest' | 'oldest' | 'most_visited' | 'domain_freq' | 'title_asc' | 'domain_asc';
export type BrowserGroupOption = 'none' | 'time_of_day' | 'domain';

export interface BrowserDisplayOptions {
  showFavicon: boolean;
  showDomainBadge: boolean;
  showTimestamp: boolean;
  showSnapshotBadge: boolean;
  showVisitCountBadge: boolean;
  showActionButtons: boolean;
}

interface BrowserViewMenuProps {
  activeMode: BrowserLayoutMode;
  onChangeMode: (mode: BrowserLayoutMode) => void;
  cardLimit?: string;
  onChangeCardLimit?: (limit: string) => void;
  gridDensity?: string;
  onChangeGridDensity?: (density: string) => void;
  totalFilteredCount?: number;
  displayOptions: BrowserDisplayOptions;
  onToggleDisplayOption: (key: keyof BrowserDisplayOptions) => void;
  groupBy: BrowserGroupOption;
  onChangeGroupBy: (group: BrowserGroupOption) => void;
  sortBy: BrowserSortOption;
  onChangeSortBy: (sort: BrowserSortOption) => void;
  onResetDefaults?: () => void;
  onSaveAsDefault?: () => void;
}

export const BrowserViewMenu: React.FC<BrowserViewMenuProps> = ({
  activeMode,
  onChangeMode,
  cardLimit = '48',
  onChangeCardLimit,
  gridDensity = 'auto',
  onChangeGridDensity,
  totalFilteredCount,
  displayOptions,
  onToggleDisplayOption,
  groupBy,
  onChangeGroupBy,
  sortBy,
  onChangeSortBy,
  onResetDefaults,
  onSaveAsDefault
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [justSavedDefault, setJustSavedDefault] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click or escape
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

  const handleSaveAsDefault = () => {
    try {
      localStorage.setItem('mylife_browser_default_layout', activeMode === 'table' ? 'table' : 'moodboard');
      localStorage.setItem(
        'mylife_browser_view_options',
        JSON.stringify({
          layoutMode: activeMode === 'table' ? 'table' : 'moodboard',
          sortBy,
          groupBy,
          filterPreset: 'all',
          ...displayOptions
        })
      );
      if (cardLimit) localStorage.setItem('mylife_browser_card_limit', cardLimit);
      if (gridDensity) localStorage.setItem('mylife_browser_grid_density', gridDensity);
    } catch (e) {
      console.warn(e);
    }
    if (onSaveAsDefault) onSaveAsDefault();
    setJustSavedDefault(true);
    setTimeout(() => setJustSavedDefault(false), 2000);
  };

  const getLayoutLabel = (mode: BrowserLayoutMode) => {
    switch (mode) {
      case 'table':
        return 'Table';
      case 'moodboard':
      case 'cards':
      case 'feed':
      case 'compact':
      default:
        return 'Moodboard';
    }
  };

  const getLayoutIcon = (mode: BrowserLayoutMode) => {
    switch (mode) {
      case 'table':
        return <Table className="w-3.5 h-3.5 text-emerald-500" />;
      case 'moodboard':
      case 'cards':
      case 'feed':
      case 'compact':
      default:
        return <Columns3 className="w-3.5 h-3.5 text-sky-500" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button matching YouTube / Bookmarks style */}
      <button aria-label="Action"
        type="button"
        id="browser-view-menu-trigger"
        onClick={() => setIsOpen(prev => !prev)}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
          isOpen
            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
            : 'bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 border-gray-200/90 dark:border-white/10 shadow-2xs'
        }`}
        title="Change view style, items count, grid density & display settings"
      >
        {getLayoutIcon(activeMode)}
        <span className="font-semibold text-[11px] text-gray-400">View:</span>
        <span className="font-bold">{getLayoutLabel(activeMode)}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown matching YouTubeViewMenu */}
      {isOpen && (
        <div
          id="browser-view-menu-dropdown"
          className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#202124] text-gray-200 border border-neutral-700/80 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 select-none text-xs max-h-[85vh] overflow-y-auto"
        >
          {/* Section: View Layout */}
          <div className="mb-2.5">
            <div className="text-[11px] font-semibold text-gray-400 px-1 mb-1.5 flex items-center justify-between">
              <span>View Layout</span>
              <span className="text-[10px] text-gray-500">Style</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {/* Moodboard */}
              <button aria-label="Action"
                type="button"
                id="browser-view-mode-moodboard"
                onClick={() => onChangeMode('moodboard')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors cursor-pointer text-left ${
                  activeMode === 'moodboard' || activeMode === 'cards' || activeMode === 'feed' || activeMode === 'compact'
                    ? 'bg-sky-600/25 text-white font-bold border border-sky-500/40'
                    : 'bg-neutral-800/80 text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-xs truncate font-medium">Moodboard</span>
              </button>

              {/* Table */}
              <button aria-label="Action"
                type="button"
                id="browser-view-mode-table"
                onClick={() => onChangeMode('table')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors cursor-pointer text-left ${
                  activeMode === 'table'
                    ? 'bg-sky-600/25 text-white font-bold border border-sky-500/40'
                    : 'bg-neutral-800/80 text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs truncate font-medium">Table</span>
              </button>
            </div>
          </div>

          {/* Section: Card Limit (Items per page / batch) */}
          {onChangeCardLimit && (
            <div className="mb-2.5 pt-2 border-t border-neutral-700/60">
              <div className="text-[11px] font-semibold text-gray-400 px-1 mb-1.5 flex items-center justify-between">
                <span>Items Batch Limit</span>
                {totalFilteredCount !== undefined && (
                  <span className="text-[10px] text-gray-500 font-mono">
                    Total: {totalFilteredCount.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1">
                {['12', '24', '48', '96', 'all'].map(limit => (
                  <button aria-label="Action"
                    key={limit}
                    type="button"
                    onClick={() => onChangeCardLimit(limit)}
                    className={`py-1 rounded-lg text-center font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                      cardLimit === limit
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-neutral-800/80 text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {limit === 'all' ? 'All' : limit}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Grid Density (when in Cards mode) */}
          {activeMode === 'cards' && onChangeGridDensity && (
            <div className="mb-2.5 pt-2 border-t border-neutral-700/60">
              <div className="text-[11px] font-semibold text-gray-400 px-1 mb-1.5 flex items-center justify-between">
                <span>Grid Density (Columns)</span>
                <span className="text-[10px] text-sky-400 font-mono">
                  {gridDensity === 'auto' ? 'Auto Responsive' : `${gridDensity} Cols`}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {['2', '3', '4', '5', '6', 'auto'].map(cols => (
                  <button aria-label="Action"
                    key={cols}
                    type="button"
                    onClick={() => onChangeGridDensity(cols)}
                    className={`py-1 rounded-lg text-center font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                      gridDensity === cols
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-neutral-800/80 text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {cols === 'auto' ? 'Auto' : `${cols}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Group By */}
          <div className="mb-2.5 pt-2 border-t border-neutral-700/60">
            <div className="text-[11px] font-semibold text-gray-400 px-1 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FolderTree className="w-3 h-3 text-sky-400" />
                Group By
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <button aria-label="Action"
                type="button"
                onClick={() => onChangeGroupBy('none')}
                className={`px-2 py-1 rounded-lg text-center text-[11px] font-medium transition-colors cursor-pointer ${
                  groupBy === 'none'
                    ? 'bg-sky-600/30 text-sky-300 font-bold border border-sky-500/40'
                    : 'bg-neutral-800/80 text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                None
              </button>
              <button aria-label="Action"
                type="button"
                onClick={() => onChangeGroupBy('time_of_day')}
                className={`px-2 py-1 rounded-lg text-center text-[11px] font-medium transition-colors cursor-pointer ${
                  groupBy === 'time_of_day'
                    ? 'bg-sky-600/30 text-sky-300 font-bold border border-sky-500/40'
                    : 'bg-neutral-800/80 text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                Time of Day
              </button>
              <button aria-label="Action"
                type="button"
                onClick={() => onChangeGroupBy('domain')}
                className={`px-2 py-1 rounded-lg text-center text-[11px] font-medium transition-colors cursor-pointer ${
                  groupBy === 'domain'
                    ? 'bg-sky-600/30 text-sky-300 font-bold border border-sky-500/40'
                    : 'bg-neutral-800/80 text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                Domain
              </button>
            </div>
          </div>

          {/* Section: Sort By */}
          <div className="mb-2.5 pt-2 border-t border-neutral-700/60">
            <div className="text-[11px] font-semibold text-gray-400 px-1 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3 h-3 text-sky-400" />
                Sort Order
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              {[
                { id: 'newest', label: 'Newest First' },
                { id: 'oldest', label: 'Oldest First' },
                { id: 'most_visited', label: 'Most Visited' },
                { id: 'domain_freq', label: 'Top Domains' },
                { id: 'title_asc', label: 'Title (A-Z)' },
                { id: 'domain_asc', label: 'Domain (A-Z)' }
              ].map(opt => (
                <button aria-label="Action"
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeSortBy(opt.id as BrowserSortOption)}
                  className={`px-2 py-1 rounded-lg text-left transition-colors cursor-pointer flex items-center justify-between ${
                    sortBy === opt.id
                      ? 'bg-sky-600/30 text-sky-300 font-bold border border-sky-500/40'
                      : 'bg-neutral-800/80 text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {sortBy === opt.id && <Check className="w-3 h-3 text-sky-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Display Options */}
          <div className="mb-2.5 pt-2 border-t border-neutral-700/60">
            <div className="text-[11px] font-semibold text-gray-400 px-1 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3 h-3 text-sky-400" />
                Display Elements
              </span>
            </div>
            <div className="space-y-1">
              {[
                { key: 'showFavicon', label: 'Favicon Icons' },
                { key: 'showDomainBadge', label: 'Domain Badges' },
                { key: 'showTimestamp', label: 'Timestamps & Dates' },
                { key: 'showSnapshotBadge', label: 'Snapshots & Previews' },
                { key: 'showVisitCountBadge', label: 'Visit Count Badges' },
                { key: 'showActionButtons', label: 'Quick Action Buttons' }
              ].map(opt => {
                const isChecked = displayOptions[opt.key as keyof BrowserDisplayOptions];
                return (
                  <button aria-label="Action"
                    key={opt.key}
                    type="button"
                    onClick={() => onToggleDisplayOption(opt.key as keyof BrowserDisplayOptions)}
                    className="w-full flex items-center justify-between px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-left"
                  >
                    <span className="text-[11px] text-gray-300">{opt.label}</span>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${
                        isChecked
                          ? 'bg-sky-600 border-sky-500 text-white'
                          : 'bg-neutral-800 border-neutral-700 text-transparent'
                      }`}
                    >
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save as Default Button */}
          <div className="pt-2.5 mt-2 border-t border-neutral-700/60">
            <button aria-label="Action"
              type="button"
              id="browser-save-default-button"
              onClick={handleSaveAsDefault}
              className="w-full py-2 px-3 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-750 text-gray-200 text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-98"
            >
              {justSavedDefault ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Saved as Default</span>
                </>
              ) : (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Save as Default</span>
                </>
              )}
            </button>
          </div>

          {/* Reset Defaults */}
          {onResetDefaults && (
            <div className="pt-2 border-t border-neutral-700/60 flex justify-end">
              <button aria-label="Action"
                type="button"
                onClick={() => {
                  onResetDefaults();
                }}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white px-2 py-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Defaults
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
