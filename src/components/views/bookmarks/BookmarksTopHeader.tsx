import React, { useState, useRef, useEffect } from 'react';
import {
  Bookmark,
  Upload,
  Folder,
  Tag,
  Plus,
  Download,
  ChevronDown,
  X
} from 'lucide-react';
import { BookmarksActiveFilter } from './AllBookmarksSubview';

export interface BookmarksTopHeaderProps {
  totalCount: number;
  activeFilter: BookmarksActiveFilter | null;
  onSelectFilter: (filter: BookmarksActiveFilter | null) => void;
  appCounts?: Record<string, number>;
  folders?: { name: string; count: number }[];
  tags?: { name: string; count: number }[];
  isRaindropConnected?: boolean;
  isPinterestConnected?: boolean;
  onOpenPasteLink: () => void;
  onOpenSyncModal?: (service?: any) => void;
  onExportHtml?: () => void;
  onImportClick?: () => void;
}

export const BookmarksTopHeader: React.FC<BookmarksTopHeaderProps> = ({
  totalCount,
  activeFilter,
  onSelectFilter,
  appCounts = {},
  folders = [],
  tags = [],
  onOpenPasteLink,
  onOpenSyncModal,
  onExportHtml,
  onImportClick
}) => {
  const [openDropdown, setOpenDropdown] = useState<'folders' | 'tags' | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleDropdown = (name: 'folders' | 'tags') => {
    setOpenDropdown(prev => (prev === name ? null : name));
  };

  const isFilterActive = (type: string, id: string) => {
    return activeFilter?.type === type && activeFilter?.id === id;
  };

  const handleSelectFolder = (folderName: string) => {
    if (isFilterActive('folder', folderName)) {
      onSelectFilter(null);
    } else {
      onSelectFilter({ type: 'folder', id: folderName, name: folderName });
    }
    setOpenDropdown(null);
  };

  const handleSelectTag = (tagName: string) => {
    if (isFilterActive('tag', tagName)) {
      onSelectFilter(null);
    } else {
      onSelectFilter({ type: 'tag', id: tagName, name: tagName });
    }
    setOpenDropdown(null);
  };

  return (
    <div
      ref={headerRef}
      id="view-header-toolbar"
      className="py-2.5 px-3.5 sm:px-5 border-b border-black/8 dark:border-white/10 bg-white/80 dark:bg-[#121214]/85 backdrop-blur-xl shadow-2xs sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2.5 transition-all"
    >
      {/* Left: Brand Identity + Clean Filters (All, Folders, Tags) */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
        {/* View Identity Pill */}
        <div className="flex items-center gap-2 shrink-0 mr-1 sm:mr-2">
          <div className="w-7 h-7 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
            <Bookmark className="w-3.5 h-3.5 fill-current" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight leading-none">
              Bookmarks
            </span>
            <span className="text-[11px] font-mono font-bold text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-full leading-none">
              {totalCount}
            </span>
          </div>
        </div>

        {/* Filter Indicator Pill (if any folder or tag is active) */}
        {activeFilter && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 rounded-xl text-xs text-blue-700 dark:text-blue-300 font-semibold shadow-2xs shrink-0">
            <span className="capitalize">{activeFilter.type.replace('_', ' ')}:</span>
            <span className="font-bold truncate max-w-[120px]">{activeFilter.name}</span>
            <button
              type="button"
              onClick={() => onSelectFilter(null)}
              className="p-0.5 hover:bg-blue-500/20 rounded-full transition-colors cursor-pointer"
              title="Clear active filter"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* All Button */}
        <button
          type="button"
          id="bookmarks-filter-all"
          onClick={() => onSelectFilter(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            activeFilter === null
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 border-black/10 dark:border-white/10'
          }`}
          title="Show all bookmarks"
        >
          All
        </button>

        {/* Folders Dropdown Button (if folders available) */}
        {folders.length > 0 && (
          <div className="relative inline-block text-left">
            <button
              type="button"
              id="bookmarks-folders-button"
              onClick={() => toggleDropdown('folders')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                openDropdown === 'folders' || activeFilter?.type === 'folder'
                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 shadow-xs'
                  : 'bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 border-black/10 dark:border-white/10'
              }`}
              title="Collections & Folders"
            >
              <Folder className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden xs:inline">Folders</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold">
                {folders.length}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openDropdown === 'folders' ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === 'folders' && (
              <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#18181b] border border-black/10 dark:border-white/10 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 border-b border-black/5 dark:border-white/5 mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Collections & Folders
                  </span>
                </div>

                <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-0.5">
                  {folders.map(f => {
                    const isSelected = isFilterActive('folder', f.name);
                    return (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => handleSelectFolder(f.name)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 font-medium'
                        }`}
                      >
                        <span className="truncate">{f.name}</span>
                        <span className="font-mono text-[11px] text-gray-400 font-bold">{f.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tags Dropdown Button (if tags available) */}
        {tags.length > 0 && (
          <div className="relative inline-block text-left">
            <button
              type="button"
              id="bookmarks-tags-button"
              onClick={() => toggleDropdown('tags')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                openDropdown === 'tags' || activeFilter?.type === 'tag'
                  ? 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/40 shadow-xs'
                  : 'bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 border-black/10 dark:border-white/10'
              }`}
              title="Tags"
            >
              <Tag className="w-3.5 h-3.5 text-pink-500" />
              <span className="hidden xs:inline">Tags</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-700 dark:text-pink-300 font-bold">
                {tags.length}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openDropdown === 'tags' ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === 'tags' && (
              <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#18181b] border border-black/10 dark:border-white/10 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 border-b border-black/5 dark:border-white/5 mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Bookmark Tags
                  </span>
                </div>

                <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-0.5">
                  {tags.map(t => {
                    const isSelected = isFilterActive('tag', t.name);
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => handleSelectTag(t.name)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-pink-500/15 text-pink-700 dark:text-pink-300 font-bold'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 font-medium'
                        }`}
                      >
                        <span className="truncate">#{t.name}</span>
                        <span className="font-mono text-[11px] text-gray-400 font-bold">{t.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Direct 1-Click Import Button, Paste Link, Export HTML */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {/* Single Direct Import Button - 1 click opens importer directly */}
        <button
          type="button"
          id="bookmarks-header-import-button"
          onClick={() => {
            if (onImportClick) {
              onImportClick();
            } else if (onOpenSyncModal) {
              onOpenSyncModal('browser');
            }
          }}
          className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-xs bg-blue-600 hover:bg-blue-700 active:scale-98 text-white border-blue-600"
          title="Import Bookmarks (HTML, Netscape, JSON, CSV)"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import</span>
        </button>

        {/* Quick Paste Link Button */}
        <button
          type="button"
          id="bookmarks-paste-link-button"
          onClick={onOpenPasteLink}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          title="Paste any URL to save new bookmark"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Paste Link</span>
        </button>

        {/* Export HTML Button */}
        {onExportHtml && totalCount > 0 && (
          <button
            type="button"
            id="bookmarks-export-button"
            onClick={onExportHtml}
            className="p-1.5 bg-white dark:bg-[#18181b] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl border border-black/10 dark:border-white/10 transition-all cursor-pointer shadow-2xs"
            title="Export Bookmarks as Netscape HTML archive"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
