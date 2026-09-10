import React, { useState, useRef, useEffect } from 'react';
import {
  Columns3,
  Table,
  Check,
  ChevronDown,
  CheckSquare,
  Square,
  Sparkles,
  BookmarkCheck,
  ArrowUpDown
} from 'lucide-react';

export type RaindropLayoutMode =
  | 'moodboard'
  | 'table'
  | 'cards'
  | 'kanban'
  | 'feed'
  | 'compact'
  | 'list'
  | 'headlines';

export interface MoodboardDisplayConfig {
  showCover: boolean;
  showTitle: boolean;
  showNote: boolean;
  showDescription: boolean;
  showHighlights: boolean;
  showTags: boolean;
  showBookmarkInfo: boolean;
}

export const DEFAULT_MOODBOARD_CONFIG: MoodboardDisplayConfig = {
  showCover: true,
  showTitle: true,
  showNote: true,
  showDescription: false,
  showHighlights: false,
  showTags: true,
  showBookmarkInfo: true
};

interface RaindropViewMenuProps {
  layoutMode: RaindropLayoutMode;
  onChangeLayoutMode: (mode: RaindropLayoutMode) => void;
  sortBy?: 'newest' | 'oldest' | 'title' | 'visits' | 'domain';
  onChangeSortBy?: (sortBy: 'newest' | 'oldest' | 'title' | 'visits' | 'domain') => void;
  cardLimit?: string;
  onChangeCardLimit?: (limit: string) => void;
  gridDensity?: string;
  onChangeGridDensity?: (density: string) => void;
  totalFilteredCount?: number;
  moodboardConfig: MoodboardDisplayConfig;
  onChangeMoodboardConfig: (config: MoodboardDisplayConfig) => void;
  onApplyToAll?: () => void;
  onSaveAsDefault?: () => void;
  kanbanGroupBy?: 'status' | 'collection' | 'type' | 'tag';
  onChangeKanbanGroupBy?: (groupBy: 'status' | 'collection' | 'type' | 'tag') => void;
  columnWidth?: 'compact' | 'standard' | 'wide' | 'fluid';
  onChangeColumnWidth?: (width: 'compact' | 'standard' | 'wide' | 'fluid') => void;
}

export const RaindropViewMenu: React.FC<RaindropViewMenuProps> = ({
  layoutMode,
  onChangeLayoutMode,
  sortBy,
  onChangeSortBy,
  cardLimit,
  onChangeCardLimit,
  gridDensity,
  onChangeGridDensity,
  totalFilteredCount,
  moodboardConfig,
  onChangeMoodboardConfig,
  onApplyToAll,
  onSaveAsDefault,
  kanbanGroupBy = 'status',
  onChangeKanbanGroupBy,
  columnWidth = 'standard',
  onChangeColumnWidth
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [justSavedDefault, setJustSavedDefault] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleOption = (key: keyof MoodboardDisplayConfig) => {
    onChangeMoodboardConfig({
      ...moodboardConfig,
      [key]: !moodboardConfig[key]
    });
  };

  const handleSaveAsDefault = () => {
    try {
      localStorage.setItem('mylife_bookmarks_default_layout', layoutMode === 'table' ? 'table' : 'moodboard');
      localStorage.setItem('mylife_bookmarks_display_config', JSON.stringify(moodboardConfig));
      if (sortBy) localStorage.setItem('mylife_bookmarks_default_sort', sortBy);
      if (columnWidth) localStorage.setItem('mylife_bookmarks_column_width', columnWidth);
      if (cardLimit) localStorage.setItem('mylife_bookmarks_card_limit', cardLimit);
      if (gridDensity) localStorage.setItem('mylife_bookmarks_grid_density', gridDensity);
    } catch (e) {
      console.warn(e);
    }
    if (onSaveAsDefault) {
      onSaveAsDefault();
    }
    setJustSavedDefault(true);
    setTimeout(() => setJustSavedDefault(false), 2000);
  };

  const getLayoutLabel = (mode: RaindropLayoutMode) => {
    switch (mode) {
      case 'table':
        return 'Table';
      case 'moodboard':
      case 'cards':
      case 'feed':
      case 'compact':
      case 'kanban':
      case 'list':
      case 'headlines':
      default:
        return 'Moodboard';
    }
  };

  const getLayoutIcon = (mode: RaindropLayoutMode) => {
    switch (mode) {
      case 'table':
        return <Table className="w-3.5 h-3.5 text-emerald-500" />;
      case 'moodboard':
      case 'cards':
      case 'feed':
      case 'compact':
      case 'kanban':
      case 'list':
      case 'headlines':
      default:
        return <Columns3 className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="raindrop-view-menu-trigger"
        onClick={() => setIsOpen(prev => !prev)}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
          isOpen
            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
            : 'bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 border-gray-200/90 dark:border-white/10 shadow-2xs'
        }`}
        title="Change view style, cards count, grid density & display settings"
      >
        {getLayoutIcon(layoutMode)}
        <span className="font-semibold text-[11px] text-gray-400">View:</span>
        <span className="font-bold">{getLayoutLabel(layoutMode)}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown matching Screenshot 2 */}
      {isOpen && (
        <div
          id="raindrop-view-menu-dropdown"
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
              <button
                type="button"
                id="bookmarks-view-mode-moodboard"
                onClick={() => onChangeLayoutMode('moodboard')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors cursor-pointer text-left ${
                  layoutMode === 'moodboard' || layoutMode === 'cards' || layoutMode === 'feed' || layoutMode === 'compact' || layoutMode === 'kanban' || layoutMode === 'list' || layoutMode === 'headlines'
                    ? 'bg-[#0089FF]/20 text-white font-bold border border-[#0089FF]/40'
                    : 'bg-neutral-800/80 text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-xs truncate font-medium">Moodboard</span>
              </button>

              {/* Table */}
              <button
                type="button"
                id="bookmarks-view-mode-table"
                onClick={() => onChangeLayoutMode('table')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors cursor-pointer text-left ${
                  layoutMode === 'table'
                    ? 'bg-[#0089FF]/20 text-white font-bold border border-[#0089FF]/40'
                    : 'bg-neutral-800/80 text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs truncate font-medium">Table</span>
              </button>
            </div>
          </div>

          {/* Section: Sort By */}
          {sortBy && onChangeSortBy && (
            <>
              <div className="border-t border-neutral-700/80 my-2.5" />
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-gray-400 px-1 flex items-center justify-between">
                  <span>Sort By</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'newest', label: 'Newest First' },
                    { id: 'oldest', label: 'Oldest First' },
                    { id: 'title', label: 'Title (A-Z)' },
                    { id: 'domain', label: 'Site / Domain' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangeSortBy(opt.id as any)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer flex items-center justify-between ${
                        sortBy === opt.id
                          ? 'bg-[#0089FF] text-white font-bold'
                          : 'bg-neutral-800 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {sortBy === opt.id && <Check className="w-3 h-3 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Section: Cards per Page / Display Quantity */}
          {cardLimit && onChangeCardLimit && (
            <>
              <div className="border-t border-neutral-700/80 my-2.5" />
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-gray-400 px-1 flex items-center justify-between">
                  <span>Cards per View</span>
                  {totalFilteredCount !== undefined && (
                    <span className="text-[10px] text-gray-400 font-mono">
                      {totalFilteredCount} total
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-neutral-850 p-1 rounded-xl border border-neutral-750">
                  {['12', '24', '48', '96', 'all'].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => onChangeCardLimit(num)}
                      className={`flex-1 py-1 rounded-lg text-xs transition-colors cursor-pointer font-semibold ${
                        cardLimit === num
                          ? 'bg-[#0089FF] text-white font-bold shadow-2xs'
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

          {/* Section: Grid Columns / Density */}
          {gridDensity && onChangeGridDensity && (
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
                          ? 'bg-[#0089FF] text-white font-bold shadow-2xs'
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

          {/* Section: Show in Cards / Moodboard Display Options */}
          <div className="border-t border-neutral-700/80 my-2.5" />
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-gray-400 px-1 mb-1.5">
              Card Display Properties
            </div>

            {/* Cover */}
            <label
              onClick={() => toggleOption('showCover')}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                moodboardConfig.showCover
                  ? 'bg-[#0089FF] border-[#0089FF] text-white'
                  : 'border-neutral-600 bg-transparent'
              }`}>
                {moodboardConfig.showCover && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span className="text-xs text-gray-300">Cover image</span>
            </label>

            {/* Title */}
            <label
              onClick={() => toggleOption('showTitle')}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                moodboardConfig.showTitle
                  ? 'bg-[#0089FF] border-[#0089FF] text-white'
                  : 'border-neutral-600 bg-transparent'
              }`}>
                {moodboardConfig.showTitle && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span className="text-xs text-gray-300">Title</span>
            </label>

            {/* Note */}
            <label
              onClick={() => toggleOption('showNote')}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                moodboardConfig.showNote
                  ? 'bg-[#0089FF] border-[#0089FF] text-white'
                  : 'border-neutral-600 bg-transparent'
              }`}>
                {moodboardConfig.showNote && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span className="text-xs text-gray-300">Notes</span>
            </label>

            {/* Description */}
            <label
              onClick={() => toggleOption('showDescription')}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                moodboardConfig.showDescription
                  ? 'bg-[#0089FF] border-[#0089FF] text-white'
                  : 'border-neutral-600 bg-transparent'
              }`}>
                {moodboardConfig.showDescription && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span className="text-xs text-gray-300">Description</span>
            </label>

            {/* Tags */}
            <label
              onClick={() => toggleOption('showTags')}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                moodboardConfig.showTags
                  ? 'bg-[#0089FF] border-[#0089FF] text-white'
                  : 'border-neutral-600 bg-transparent'
              }`}>
                {moodboardConfig.showTags && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span className="text-xs text-gray-300">Tags</span>
            </label>

            {/* Bookmark info */}
            <label
              onClick={() => toggleOption('showBookmarkInfo')}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                moodboardConfig.showBookmarkInfo
                  ? 'bg-[#0089FF] border-[#0089FF] text-white'
                  : 'border-neutral-600 bg-transparent'
              }`}>
                {moodboardConfig.showBookmarkInfo && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span className="text-xs text-gray-300">Bookmark info</span>
            </label>
          </div>

          {/* Kanban Board Specific Settings */}
          {layoutMode === 'kanban' && onChangeKanbanGroupBy && (
            <>
              <div className="border-t border-neutral-700/80 my-2.5" />
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-gray-400 px-1 flex items-center justify-between">
                  <span>Group Board Columns</span>
                  <span className="text-[10px] text-indigo-400">Kanban</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onChangeKanbanGroupBy('status')}
                    className={`px-2 py-1 rounded-lg text-left transition-colors cursor-pointer ${
                      kanbanGroupBy === 'status'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-neutral-800 text-gray-300 hover:bg-neutral-750'
                    }`}
                  >
                    Workflow Status
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeKanbanGroupBy('collection')}
                    className={`px-2 py-1 rounded-lg text-left transition-colors cursor-pointer ${
                      kanbanGroupBy === 'collection'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-neutral-800 text-gray-300 hover:bg-neutral-750'
                    }`}
                  >
                    Folders
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeKanbanGroupBy('type')}
                    className={`px-2 py-1 rounded-lg text-left transition-colors cursor-pointer ${
                      kanbanGroupBy === 'type'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-neutral-800 text-gray-300 hover:bg-neutral-750'
                    }`}
                  >
                    Media Type
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeKanbanGroupBy('tag')}
                    className={`px-2 py-1 rounded-lg text-left transition-colors cursor-pointer ${
                      kanbanGroupBy === 'tag'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-neutral-800 text-gray-300 hover:bg-neutral-750'
                    }`}
                  >
                    Tags
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Board Column Width */}
          {(layoutMode === 'kanban' || layoutMode === 'moodboard') && onChangeColumnWidth && (
            <>
              <div className="border-t border-neutral-700/80 my-2.5" />
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-gray-400 px-1 flex items-center justify-between">
                  <span>Card / Column Width</span>
                  <span className="text-[10px] text-gray-500">Uncropped Size</span>
                </div>
                <div className="flex items-center gap-1 bg-neutral-800 p-0.5 rounded-lg text-[10px]">
                  {(['compact', 'standard', 'wide', 'fluid'] as const).map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => onChangeColumnWidth(w)}
                      className={`flex-1 py-1 rounded-md capitalize transition-colors cursor-pointer ${
                        columnWidth === w
                          ? 'bg-[#0089FF] text-white font-bold shadow-2xs'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {w === 'fluid' ? 'Auto' : w}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Save as Default button */}
          <div className="mt-3 pt-2.5 border-t border-neutral-700/60">
            <button
              type="button"
              id="bookmarks-save-default-button"
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
                  <BookmarkCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Save as Default</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
