import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Grid,
  List,
  Tag,
  Folder,
  SlidersHorizontal,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Globe,
  Database,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Brain,
  Boxes,
  CheckSquare,
  Wand2,
  Plus,
  Filter,
  X,
  Eye
} from 'lucide-react';
import { TimelineItem } from '../../../types';
import { BookmarkCard } from './BookmarkCard';
import { BookmarkServiceName } from '../../../utils/bookmarkSyncServices';
import { BookmarksAppSubviewId } from './BookmarksAppNavigation';
import {
  RaindropViewMenu,
  RaindropLayoutMode,
  MoodboardDisplayConfig,
  DEFAULT_MOODBOARD_CONFIG
} from './RaindropViewMenu';
import { RaindropSearchDropdown } from './RaindropSearchDropdown';
import { KanbanMoodboardView } from './KanbanMoodboardView';
import { MoodboardMasonryView } from './MoodboardMasonryView';

export interface BookmarksActiveFilter {
  type: 'view' | 'live_service' | 'import' | 'folder' | 'tag';
  id: string;
  name: string;
}

interface AllBookmarksSubviewProps {
  bookmarks: TimelineItem[];
  bookmarkNotes: Record<string, string>;
  bookmarkTags: Record<string, string[]>;
  sessionSnapshots: Record<string, string>;
  appCounts: Record<string, number>;
  onSelectAppSubview?: (subviewId: BookmarksAppSubviewId) => void;
  onOpenSyncModal: (service?: BookmarkServiceName) => void;
  onOpenEditModal: (item: TimelineItem) => void;
  onCopyLink: (url: string) => void;
  copiedUrl: string | null;
  onDeleteItem?: (id: string) => void;
  activeItem?: TimelineItem | null;
  onSelectItem?: (item: TimelineItem) => void;
  isRightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
  activeFilter?: BookmarksActiveFilter | null;
  onClearActiveFilter?: () => void;
  onOpenPasteLink?: () => void;
  onSaveBookmark?: (item: TimelineItem, note?: string, tags?: string[]) => void;
}

export const AllBookmarksSubview: React.FC<AllBookmarksSubviewProps> = ({
  bookmarks,
  bookmarkNotes,
  bookmarkTags,
  sessionSnapshots,
  appCounts,
  onSelectAppSubview,
  onOpenSyncModal,
  onOpenEditModal,
  onCopyLink,
  copiedUrl,
  onDeleteItem,
  activeItem,
  onSelectItem,
  isRightPanelOpen = false,
  onToggleRightPanel,
  activeFilter,
  onClearActiveFilter,
  onOpenPasteLink,
  onSaveBookmark
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<'moodboard' | 'table' | 'cards' | 'kanban' | 'feed' | 'compact' | 'list' | 'headlines'>(() => {
    try {
      const saved = localStorage.getItem('mylife_bookmarks_default_layout');
      return (saved === 'table' ? 'table' : 'moodboard') as any;
    } catch {
      return 'moodboard';
    }
  });
  // Card count control: options to choose how many cards we want to see (12, 24, 48, 96, or all)
  const [cardLimit, setCardLimit] = useState<string>('24');
  // Card grid density: auto, 2, 3, 4, 5, 6
  const [gridDensity, setGridDensity] = useState<string>('auto');
  const [moodboardConfig, setMoodboardConfig] = useState<MoodboardDisplayConfig>(() => {
    try {
      const saved = localStorage.getItem('mylife_moodboard_config');
      return saved ? JSON.parse(saved) : DEFAULT_MOODBOARD_CONFIG;
    } catch {
      return DEFAULT_MOODBOARD_CONFIG;
    }
  });
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title' | 'visits' | 'domain'>(() => {
    try {
      const saved = localStorage.getItem('mylife_bookmarks_default_sort');
      return (saved as any) || 'newest';
    } catch {
      return 'newest';
    }
  });
  const [columnWidth, setColumnWidth] = useState<'compact' | 'standard' | 'wide' | 'fluid'>(() => {
    try {
      const saved = localStorage.getItem('mylife_bookmarks_column_width');
      return (saved as any) || 'standard';
    } catch {
      return 'standard';
    }
  });

  const handleSaveMoodboardConfig = (config: MoodboardDisplayConfig) => {
    setMoodboardConfig(config);
    try {
      localStorage.setItem('mylife_moodboard_config', JSON.stringify(config));
    } catch (e) {
      console.warn(e);
    }
  };

  // Extract collections across all bookmarks
  const collections = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach(b => {
      if (b.category && b.category !== 'Unsorted') {
        set.add(b.category);
      }
    });
    return Array.from(set).sort();
  }, [bookmarks]);

  // Extract tags across all bookmarks
  const tags = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach(b => {
      const tList = bookmarkTags[b.url || ''] || [];
      tList.forEach(t => set.add(t));
    });
    return Array.from(set).sort();
  }, [bookmarks, bookmarkTags]);

  // Filtered bookmarks
  const filteredBookmarks = useMemo(() => {
    const matched = bookmarks
      .filter(item => {
        // Active filter from sidebar
        if (activeFilter) {
          if (activeFilter.type === 'live_service') {
            const p = (item.platform || '').toLowerCase();
            if (activeFilter.id === 'raindrop' && !p.includes('raindrop')) return false;
            if (activeFilter.id === 'pinterest' && (!p.includes('pinterest') && !p.includes('pin') || p.includes('pinboard'))) return false;
            if (activeFilter.id === 'pocket' && !p.includes('pocket')) return false;
            if (activeFilter.id === 'linkding' && !p.includes('linkding')) return false;
            if (activeFilter.id === 'pinboard' && !p.includes('pinboard')) return false;
          } else if (activeFilter.type === 'import') {
            const p = (item.platform || '').toLowerCase();
            if (activeFilter.id === 'browser') {
              const isBrowser = p.includes('browser') || p.includes('chrome') || p.includes('safari') || p.includes('firefox') || p.includes('edge') || item.transition === 'BOOKMARK';
              if (!isBrowser) return false;
            } else if (activeFilter.id === 'html_file') {
              if (!p.includes('html') && !p.includes('file')) return false;
            } else if (!p.includes(activeFilter.id.toLowerCase())) {
              return false;
            }
          } else if (activeFilter.type === 'folder') {
            if (item.category !== activeFilter.id) return false;
          } else if (activeFilter.type === 'tag') {
            const itemTags = bookmarkTags[item.url || ''] || [];
            if (!itemTags.includes(activeFilter.id)) return false;
          }
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();

          // Operator checks matching search criteria
          if (q === 'type:image') {
            const hasImg = Boolean(item.cover || item.image_url || sessionSnapshots[item.url || '']);
            if (!hasImg) return false;
          } else if (q === 'type:video') {
            const isVideo = (item.url || '').includes('youtube') || (item.url || '').includes('vimeo');
            if (!isVideo) return false;
          } else if (q === 'type:article') {
            const isArticle = (item.domain || '').includes('medium') || (item.domain || '').includes('dev.to') || (item.domain || '').includes('substack');
            if (!isArticle) return false;
          } else if (q === 'type:document') {
            const isDoc = (item.url || '').endsWith('.pdf') || (item.domain || '').includes('docs.google');
            if (!isDoc) return false;
          } else if (q === 'notag:true') {
            const itemTags = bookmarkTags[item.url || ''] || [];
            if (itemTags.length > 0) return false;
          } else if (q === 'note:true') {
            const itemNotes = bookmarkNotes[item.url || ''] || '';
            if (!itemNotes.trim()) return false;
          } else if (q.startsWith('in:title ')) {
            const sub = q.slice(9).trim();
            if (!(item.title || '').toLowerCase().includes(sub)) return false;
          } else {
            const matchTitle = (item.title || '').toLowerCase().includes(q);
            const matchNotes = (bookmarkNotes[item.url || ''] || '').toLowerCase().includes(q);
            const matchDomain = (item.domain || '').toLowerCase().includes(q);
            const matchCategory = (item.category || '').toLowerCase().includes(q);
            const matchTags = (bookmarkTags[item.url || ''] || []).some(t => t.toLowerCase().includes(q));
            if (!(matchTitle || matchNotes || matchDomain || matchCategory || matchTags)) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'title') {
          return (a.title || '').localeCompare(b.title || '');
        }
        if (sortOrder === 'oldest') {
          return a.dateObj.getTime() - b.dateObj.getTime();
        }
        if (sortOrder === 'domain') {
          return (a.domain || '').localeCompare(b.domain || '');
        }
        return b.dateObj.getTime() - a.dateObj.getTime();
      });

    // Canonical deduplication to eliminate any duplicate bookmarks
    const seen = new Set<string>();
    const deduped: TimelineItem[] = [];
    for (const item of matched) {
      let key = (item.url || item.id).trim().toLowerCase();
      try {
        if (item.url) {
          const u = new URL(item.url);
          key = `${u.hostname}${u.pathname.replace(/\/+$/, '')}${u.search}`;
        }
      } catch {
        key = (item.url || item.id).trim().toLowerCase();
      }
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }
    return deduped;
  }, [bookmarks, activeFilter, searchQuery, sortOrder, bookmarkNotes, bookmarkTags, sessionSnapshots]);

  // Card count limit slice
  const displayedBookmarks = useMemo(() => {
    if (cardLimit === 'all') return filteredBookmarks;
    const num = parseInt(cardLimit, 10);
    return isNaN(num) ? filteredBookmarks : filteredBookmarks.slice(0, num);
  }, [filteredBookmarks, cardLimit]);

  // Calculate dynamic grid column class based on chosen density
  const getGridColsClass = () => {
    if (gridDensity === '2') return 'grid-cols-1 sm:grid-cols-2';
    if (gridDensity === '3') return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    if (gridDensity === '4') return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    if (gridDensity === '5') return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
    if (gridDensity === '6') return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
    return isRightPanelOpen
      ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5';
  };

  return (
    <div id="all-bookmarks-subview" className="space-y-3.5">
      {/* Active Sidebar Filter Chip (if filtering by service/import/folder/tag) */}
      {activeFilter && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/40 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Filtered By {activeFilter.type === 'live_service' ? 'Live Service' : activeFilter.type === 'import' ? 'Import' : activeFilter.type}:
            </span>
            <span className="font-bold text-gray-900 dark:text-white">
              {activeFilter.name}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold">
              {filteredBookmarks.length}
            </span>
          </div>
          {onClearActiveFilter && (
            <button
              type="button"
              onClick={onClearActiveFilter}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
            >
              <span>Show All</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Primary Toolbar: Search Bar + View Menu */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Universal Search Bar with Raindrop operators and suggestion dropdown */}
          <div className="flex-1 min-w-0">
            <RaindropSearchDropdown
              value={searchQuery}
              onChange={setSearchQuery}
              tags={tags}
              collections={collections}
              totalCount={bookmarks.length}
              bookmarks={bookmarks}
              bookmarkNotes={bookmarkNotes}
              bookmarkTags={bookmarkTags}
            />
          </div>

          {/* Unified View & Sort Settings Menu */}
          <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-auto">
            <RaindropViewMenu
              layoutMode={layoutMode as RaindropLayoutMode}
              onChangeLayoutMode={m => setLayoutMode(m as any)}
              sortBy={sortOrder}
              onChangeSortBy={setSortOrder}
              cardLimit={cardLimit}
              onChangeCardLimit={setCardLimit}
              gridDensity={gridDensity}
              onChangeGridDensity={setGridDensity}
              totalFilteredCount={filteredBookmarks.length}
              moodboardConfig={moodboardConfig}
              onChangeMoodboardConfig={handleSaveMoodboardConfig}
              columnWidth={columnWidth}
              onChangeColumnWidth={setColumnWidth}
            />
          </div>
        </div>
      </div>

      {/* Bookmarks Display */}
      {filteredBookmarks.length > 0 ? (
        <div>
          {/* 0.1 Kanban Moodboard View: Uncropped, unstretched image decides board size */}
          {layoutMode === 'kanban' && (
            <KanbanMoodboardView
              bookmarks={filteredBookmarks}
              bookmarkNotes={bookmarkNotes}
              bookmarkTags={bookmarkTags}
              sessionSnapshots={sessionSnapshots}
              onOpenEditModal={onOpenEditModal}
              onCopyLink={onCopyLink}
              copiedUrl={copiedUrl}
              onDeleteItem={onDeleteItem}
              onSelectItem={onSelectItem}
              activeItem={activeItem}
              layoutMode="kanban"
              onChangeLayoutMode={m => setLayoutMode(m as any)}
              moodboardConfig={moodboardConfig}
              onChangeMoodboardConfig={handleSaveMoodboardConfig}
              onApplyToAll={() => handleSaveMoodboardConfig(moodboardConfig)}
            />
          )}

          {/* 0.2 Moodboard Masonry View: Uncropped, unstretched image decides card height */}
          {layoutMode === 'moodboard' && (
            <MoodboardMasonryView
              bookmarks={filteredBookmarks}
              bookmarkNotes={bookmarkNotes}
              bookmarkTags={bookmarkTags}
              sessionSnapshots={sessionSnapshots}
              onOpenEditModal={onOpenEditModal}
              onCopyLink={onCopyLink}
              copiedUrl={copiedUrl}
              onDeleteItem={onDeleteItem}
              onSelectItem={onSelectItem}
              activeItem={activeItem}
              moodboardConfig={moodboardConfig}
              columnWidth={columnWidth}
            />
          )}

          {/* 0.3 Headlines View (Screenshot 2: Headlines layout) */}
          {layoutMode === 'headlines' && (
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-gray-200/80 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5 overflow-hidden shadow-xs">
              {filteredBookmarks.map(item => (
                <BookmarkCard
                  key={item.id}
                  item={item}
                  notes={bookmarkNotes[item.url || '']}
                  tags={bookmarkTags[item.url || ''] || []}
                  snapshot={sessionSnapshots[item.url || '']}
                  layoutMode="headlines"
                  isSelected={activeItem?.id === item.id}
                  onSelect={onSelectItem}
                  onCopyLink={onCopyLink}
                  onOpenEdit={onOpenEditModal}
                  onSelectTag={t => setSearchQuery('#' + t)}
                  onDeleteItem={onDeleteItem}
                  copiedUrl={copiedUrl}
                />
              ))}
            </div>
          )}
          {/* 1. Visual Cards Grid (Matches BrowserView Cards Layout) */}
          {layoutMode === 'cards' && (
            <div className={`grid gap-3.5 ${getGridColsClass()}`}>
              {displayedBookmarks.map(item => (
                <BookmarkCard
                  key={item.id}
                  item={item}
                  notes={bookmarkNotes[item.url || '']}
                  tags={bookmarkTags[item.url || ''] || []}
                  snapshot={sessionSnapshots[item.url || ''] || item.cover}
                  layoutMode="cards"
                  isSelected={activeItem?.id === item.id}
                  onSelect={onSelectItem}
                  onCopyLink={onCopyLink}
                  onOpenEdit={onOpenEditModal}
                  onSelectTag={t => setSearchQuery('#' + t)}
                  onDeleteItem={onDeleteItem}
                  copiedUrl={copiedUrl}
                />
              ))}
            </div>
          )}

          {/* 2. Timeline Feed View */}
          {layoutMode === 'feed' && (
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-gray-200/80 dark:border-white/10 p-2 sm:p-3 divide-y divide-gray-100 dark:divide-white/5 shadow-xs">
              {displayedBookmarks.map(item => (
                <BookmarkCard
                  key={item.id}
                  item={item}
                  notes={bookmarkNotes[item.url || '']}
                  tags={bookmarkTags[item.url || ''] || []}
                  snapshot={sessionSnapshots[item.url || ''] || item.cover}
                  layoutMode="feed"
                  isSelected={activeItem?.id === item.id}
                  onSelect={onSelectItem}
                  onCopyLink={onCopyLink}
                  onOpenEdit={onOpenEditModal}
                  onSelectTag={t => setSearchQuery('#' + t)}
                  onDeleteItem={onDeleteItem}
                  copiedUrl={copiedUrl}
                />
              ))}
            </div>
          )}

          {/* 3. Compact List View */}
          {layoutMode === 'compact' && (
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-gray-200/80 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5 overflow-hidden shadow-xs">
              {displayedBookmarks.map(item => (
                <BookmarkCard
                  key={item.id}
                  item={item}
                  notes={bookmarkNotes[item.url || '']}
                  tags={bookmarkTags[item.url || ''] || []}
                  snapshot={sessionSnapshots[item.url || '']}
                  layoutMode="compact"
                  isSelected={activeItem?.id === item.id}
                  onSelect={onSelectItem}
                  onCopyLink={onCopyLink}
                  onOpenEdit={onOpenEditModal}
                  onSelectTag={t => setSearchQuery('#' + t)}
                  onDeleteItem={onDeleteItem}
                  copiedUrl={copiedUrl}
                />
              ))}
            </div>
          )}

          {/* 4. Table View */}
          {layoutMode === 'table' && (
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-gray-200/80 dark:border-white/10 overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 text-gray-400 font-bold bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Domain</th>
                    <th className="py-3 px-4">App / Service</th>
                    <th className="py-3 px-4">Folder</th>
                    <th className="py-3 px-4">Tags</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {displayedBookmarks.map(item => (
                    <BookmarkCard
                      key={item.id}
                      item={item}
                      notes={bookmarkNotes[item.url || '']}
                      tags={bookmarkTags[item.url || ''] || []}
                      layoutMode="table"
                      isSelected={activeItem?.id === item.id}
                      onSelect={onSelectItem}
                      onCopyLink={onCopyLink}
                      onOpenEdit={onOpenEditModal}
                      onSelectTag={t => setSearchQuery('#' + t)}
                      onDeleteItem={onDeleteItem}
                      copiedUrl={copiedUrl}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Card Count & Pagination Footer Controls */}
          {filteredBookmarks.length > 0 && (
            <div className="mt-4 pt-3 pb-1 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <span>Showing</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {displayedBookmarks.length}
                </span>
                <span>of</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {filteredBookmarks.length}
                </span>
                <span>cards</span>
              </div>

              {filteredBookmarks.length > displayedBookmarks.length && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(cardLimit, 10) || 24;
                      setCardLimit(Math.min(filteredBookmarks.length, current + 24).toString());
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-gray-200 font-bold transition-colors cursor-pointer"
                  >
                    Show +24 More
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardLimit('all')}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-bold transition-colors cursor-pointer"
                  >
                    Show All ({filteredBookmarks.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="p-10 rounded-3xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <Layers className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No Bookmarks Stored Yet
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Connect your favorite bookmarking apps like Raindrop.io, Pinterest, Browser Bookmarks, Pocket, Pinboard, or Linkding to build your unified web memory.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenSyncModal('raindrop')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span>Sync Bookmark Apps</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
