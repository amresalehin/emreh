import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid,
  Layers,
  List,
  Table,
  Calendar as CalendarIcon,
  BarChart2,
  Check,
  ChevronDown,
  ArrowUpDown,
  RotateCcw,
  SlidersHorizontal,
  Music
} from 'lucide-react';

export type SpotifyCombinedMode = 'grid' | 'feed' | 'compact' | 'table' | 'week' | 'month' | 'stats';
export type SpotifySortOption = 'newest' | 'oldest' | 'most_played' | 'longest' | 'title_asc' | 'artist_asc';
export type SpotifyGroupOption = 'none' | 'time_of_day' | 'artist' | 'album';

export interface SpotifyDisplayOptions {
  showAlbumArt: boolean;
  showArtistBadge: boolean;
  showAlbumName: boolean;
  showDuration: boolean;
  showTimestamp: boolean;
  showPlayCountBadge: boolean;
  showActionButtons: boolean;
}

interface SpotifyViewMenuProps {
  activeMode: SpotifyCombinedMode;
  onChangeMode: (mode: SpotifyCombinedMode) => void;
  cardLimit?: string;
  onChangeCardLimit?: (limit: string) => void;
  gridDensity?: string;
  onChangeGridDensity?: (density: string) => void;
  totalFilteredCount?: number;
  displayOptions: SpotifyDisplayOptions;
  onToggleDisplayOption: (key: keyof SpotifyDisplayOptions) => void;
  groupBy: SpotifyGroupOption;
  onChangeGroupBy: (group: SpotifyGroupOption) => void;
  sortBy: SpotifySortOption;
  onChangeSortBy: (sort: SpotifySortOption) => void;
  onResetDefaults?: () => void;
}

export const SpotifyViewMenu: React.FC<SpotifyViewMenuProps> = ({
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
  onResetDefaults
}) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const getLayoutLabel = (mode: SpotifyCombinedMode) => {
    switch (mode) {
      case 'grid':
        return 'Cards';
      case 'feed':
        return 'Feed';
      case 'compact':
        return 'Compact';
      case 'table':
        return 'Table';
      case 'week':
        return 'Week';
      case 'month':
        return 'Month';
      case 'stats':
        return 'Stats';
      default:
        return 'Cards';
    }
  };

  const getLayoutIcon = (mode: SpotifyCombinedMode) => {
    switch (mode) {
      case 'grid':
        return <LayoutGrid className="w-3.5 h-3.5 text-emerald-500" />;
      case 'feed':
        return <Layers className="w-3.5 h-3.5 text-amber-500" />;
      case 'compact':
        return <List className="w-3.5 h-3.5 text-purple-500" />;
      case 'table':
        return <Table className="w-3.5 h-3.5 text-sky-500" />;
      case 'week':
        return <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />;
      case 'month':
        return <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />;
      case 'stats':
        return <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <LayoutGrid className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="spotify-view-menu-trigger"
        onClick={() => setIsOpen(prev => !prev)}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
          isOpen
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
            : 'bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 border-gray-200/90 dark:border-white/10 shadow-2xs'
        }`}
        title="Change view style, items count, grid density & display settings"
      >
        {getLayoutIcon(activeMode)}
        <span className="font-semibold text-[11px] text-gray-400">View:</span>
        <span className="font-bold">{getLayoutLabel(activeMode)}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown matching Bookmarks RaindropViewMenu */}
      {isOpen && (
        <div
          id="spotify-view-menu-dropdown"
          className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#202124] text-gray-200 border border-neutral-700/80 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 select-none text-xs max-h-[85vh] overflow-y-auto"
        >
          {/* Section: View Layout */}
          <div className="mb-2.5">
            <div className="text-[11px] font-semibold text-gray-400 px-1 mb-1.5 flex items-center justify-between">
              <span>View Layout</span>
              <span className="text-[10px] text-gray-500">Style</span>
            </div>

            <div className="grid grid-cols-2 gap-1">
              {/* Cards / Grid */}
              <button
                type="button"
                onClick={() => {
                  onChangeMode('grid');
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer text-left ${
                  activeMode === 'grid'
                    ? 'bg-emerald-600/25 text-white font-bold border border-emerald-500/40'
                    : 'bg-neutral-800/80 text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs truncate">Cards</span>
              </button>

              {/* Feed */}
              <button
                type="button"
                onClick={() => {
                  onChangeMode('feed');
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer text-left ${
                  activeMode === 'feed'
                    ? 'bg-emerald-600/25 text-white font-bold border border-emerald-500/40'
                    : 'bg-neutral-800/80 text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs truncate">Feed</span>
              </button>

              {/* Compact List */}
              <button
                type="button"
                onClick={() => {
                  onChangeMode('compact');
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer text-left ${
                  activeMode === 'compact'
                    ? 'bg-emerald-600/25 text-white font-bold border border-emerald-500/40'
                    : 'bg-neutral-800/80 text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <List className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="text-xs truncate">Compact List</span>
              </button>

              {/* Table */}
              <button
                type="button"
                onClick={() => {
                  onChangeMode('table');
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer text-left ${
                  activeMode === 'table'
                    ? 'bg-emerald-600/25 text-white font-bold border border-emerald-500/40'
                    : 'bg-neutral-800/80 text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-xs truncate">Table</span>
              </button>

              {/* Week */}
              <button
                type="button"
                onClick={() => {
                  onChangeMode('week');
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer text-left ${
                  activeMode === 'week'
                    ? 'bg-emerald-600/25 text-white font-bold border border-emerald-500/40'
                    : 'bg-neutral-800/80 text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-xs truncate">Week</span>
              </button>

              {/* Month */}
              <button
                type="button"
                onClick={() => {
                  onChangeMode('month');
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer text-left ${
                  activeMode === 'month'
                    ? 'bg-emerald-600/25 text-white font-bold border border-emerald-500/40'
                    : 'bg-neutral-800/80 text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-xs truncate">Month</span>
              </button>

              {/* Stats Overview */}
              <button
                type="button"
                onClick={() => {
                  onChangeMode('stats');
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer text-left col-span-2 ${
                  activeMode === 'stats'
                    ? 'bg-emerald-600/25 text-white font-bold border border-emerald-500/40'
                    : 'bg-neutral-800/80 text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs truncate">Listening Analytics & Stats</span>
              </button>
            </div>
          </div>

          {/* Section: Items per View */}
          {onChangeCardLimit && (
            <>
              <div className="border-t border-neutral-700/80 my-2.5" />
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-gray-400 px-1 flex items-center justify-between">
                  <span>Items per View</span>
                  {totalFilteredCount !== undefined && (
                    <span className="text-[10px] text-gray-400 font-mono">
                      {totalFilteredCount.toLocaleString()} total
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-neutral-850 p-1 rounded-xl border border-neutral-750">
                  {['24', '48', '96', '200', 'all'].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => onChangeCardLimit(num)}
                      className={`flex-1 py-1 rounded-lg text-xs transition-colors cursor-pointer font-semibold ${
                        cardLimit === num
                          ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {num === 'all' ? 'All' : num}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Section: Grid Columns */}
          {onChangeGridDensity && (activeMode === 'grid' || activeMode === 'feed') && (
            <>
              <div className="border-t border-neutral-700/80 my-2.5" />
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-gray-400 px-1 flex items-center justify-between">
                  <span>Grid Columns</span>
                  <span className="text-[10px] text-gray-500">Cards per row</span>
                </div>
                <div className="flex items-center gap-1 bg-neutral-850 p-1 rounded-xl border border-neutral-750">
                  {['auto', '2', '3', '4', '5', '6'].map(cols => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => onChangeGridDensity(cols)}
                      className={`flex-1 py-1 rounded-lg text-xs transition-colors cursor-pointer font-semibold capitalize ${
                        gridDensity === cols
                          ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {cols === 'auto' ? 'Auto' : `${cols}c`}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Section: Card Display Properties */}
          <div className="border-t border-neutral-700/80 my-2.5" />
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-gray-400 px-1 mb-1.5">
              Card Display Properties
            </div>

            {/* Album Art */}
            <label
              onClick={() => onToggleDisplayOption('showAlbumArt')}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  displayOptions.showAlbumArt
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-neutral-600 bg-transparent'
                }`}
              >
                {displayOptions.showAlbumArt && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span className="text-xs text-gray-300">Album art / Cover</span>
            </label>

            {/* Artist Badge */}
            <label
              onClick={() => onToggleDisplayOption('showArtistBadge')}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  displayOptions.showArtistBadge
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-neutral-600 bg-transparent'
                }`}
              >
                {displayOptions.showArtistBadge && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span className="text-xs text-gray-300">Artist name</span>
            </label>

            {/* Album Name */}
            <label
              onClick={() => onToggleDisplayOption('showAlbumName')}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  displayOptions.showAlbumName
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-neutral-600 bg-transparent'
                }`}
              >
                {displayOptions.showAlbumName && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span className="text-xs text-gray-300">Album tag</span>
            </label>

            {/* Duration */}
            <label
              onClick={() => onToggleDisplayOption('showDuration')}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  displayOptions.showDuration
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-neutral-600 bg-transparent'
                }`}
              >
                {displayOptions.showDuration && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span className="text-xs text-gray-300">Track duration</span>
            </label>

            {/* Timestamp */}
            <label
              onClick={() => onToggleDisplayOption('showTimestamp')}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  displayOptions.showTimestamp
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-neutral-600 bg-transparent'
                }`}
              >
                {displayOptions.showTimestamp && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span className="text-xs text-gray-300">Timestamp</span>
            </label>

            {/* Repeat Stream Badge */}
            <label
              onClick={() => onToggleDisplayOption('showPlayCountBadge')}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  displayOptions.showPlayCountBadge
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-neutral-600 bg-transparent'
                }`}
              >
                {displayOptions.showPlayCountBadge && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span className="text-xs text-gray-300">Repeat stream badge</span>
            </label>

            {/* Action Buttons */}
            <label
              onClick={() => onToggleDisplayOption('showActionButtons')}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  displayOptions.showActionButtons
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-neutral-600 bg-transparent'
                }`}
              >
                {displayOptions.showActionButtons && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span className="text-xs text-gray-300">Quick action buttons</span>
            </label>
          </div>

          {/* Section: Group By */}
          <div className="border-t border-neutral-700/80 my-2.5" />
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-gray-400 px-1 flex items-center justify-between">
              <span>Group By</span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-neutral-850 p-1 rounded-xl border border-neutral-750 text-xs">
              {(
                [
                  { id: 'none', label: 'None' },
                  { id: 'time_of_day', label: 'Time of Day' },
                  { id: 'artist', label: 'Artist' },
                  { id: 'album', label: 'Album' }
                ] as const
              ).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeGroupBy(opt.id)}
                  className={`py-1 px-1 rounded-lg text-xs transition-colors cursor-pointer font-semibold text-center truncate ${
                    groupBy === opt.id
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Sort By */}
          <div className="border-t border-neutral-700/80 my-2.5" />
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-gray-400 px-1 flex items-center justify-between">
              <span>Sort Order</span>
              <ArrowUpDown className="w-3 h-3 text-gray-500" />
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              {(
                [
                  { id: 'newest', label: 'Newest first' },
                  { id: 'oldest', label: 'Oldest first' },
                  { id: 'most_played', label: 'Most played' },
                  { id: 'longest', label: 'Longest duration' },
                  { id: 'title_asc', label: 'Title (A-Z)' },
                  { id: 'artist_asc', label: 'Artist (A-Z)' }
                ] as const
              ).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeSortBy(opt.id)}
                  className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-left truncate ${
                    sortBy === opt.id
                      ? 'bg-emerald-600/30 text-white font-bold border border-emerald-500/40'
                      : 'bg-neutral-800/60 text-gray-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Footer with Reset & Done */}
          <div className="border-t border-neutral-700/80 pt-2.5 mt-2.5 flex items-center justify-between">
            {onResetDefaults && (
              <button
                type="button"
                onClick={onResetDefaults}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer px-1 py-0.5 rounded"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="ml-auto px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
