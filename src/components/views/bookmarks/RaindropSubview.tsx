import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  Grid,
  List,
  Table as TableIcon,
  Tag,
  Folder,
  SlidersHorizontal,
  ExternalLink,
  Plus,
  Sparkles,
  Layers,
  ArrowUpDown,
  Kanban,
  Columns3,
  Menu
} from 'lucide-react';
import { TimelineItem } from '../../../types';
import { BookmarkCard } from './BookmarkCard';
import { BookmarkServiceName } from '../../../utils/bookmarkSyncServices';
import { getRaindropConfig } from '../../../utils/raindropSync';
import {
  RaindropViewMenu,
  RaindropLayoutMode,
  MoodboardDisplayConfig,
  DEFAULT_MOODBOARD_CONFIG
} from './RaindropViewMenu';
import { RaindropSearchDropdown } from './RaindropSearchDropdown';
import { KanbanMoodboardView } from './KanbanMoodboardView';
import { MoodboardMasonryView } from './MoodboardMasonryView';

interface RaindropSubviewProps {
  bookmarks: TimelineItem[];
  bookmarkNotes: Record<string, string>;
  bookmarkTags: Record<string, string[]>;
  sessionSnapshots: Record<string, string>;
  onOpenSyncModal: (service?: BookmarkServiceName) => void;
  onOpenEditModal: (item: TimelineItem) => void;
  onCopyLink: (url: string) => void;
  copiedUrl: string | null;
  onDeleteItem?: (id: string) => void;
}

export const RaindropSubview: React.FC<RaindropSubviewProps> = ({
  bookmarks,
  bookmarkNotes,
  bookmarkTags,
  sessionSnapshots,
  onOpenSyncModal,
  onOpenEditModal,
  onCopyLink,
  copiedUrl,
  onDeleteItem
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<RaindropLayoutMode>(() => {
    try {
      return (localStorage.getItem('mylife_raindrop_layout') as RaindropLayoutMode) || 'cards';
    } catch {
      return 'cards';
    }
  });
  const [moodboardConfig, setMoodboardConfig] = useState<MoodboardDisplayConfig>(() => {
    try {
      const saved = localStorage.getItem('mylife_moodboard_config');
      return saved ? JSON.parse(saved) : DEFAULT_MOODBOARD_CONFIG;
    } catch {
      return DEFAULT_MOODBOARD_CONFIG;
    }
  });
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title'>('newest');

  const handleSaveMoodboardConfig = (config: MoodboardDisplayConfig) => {
    setMoodboardConfig(config);
    try {
      localStorage.setItem('mylife_moodboard_config', JSON.stringify(config));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleLayoutModeChange = (mode: RaindropLayoutMode) => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('mylife_raindrop_layout', mode);
    } catch (e) {
      console.warn(e);
    }
  };

  const raindropConfig = getRaindropConfig();
  const isApiConnected = Boolean(raindropConfig.apiToken);

  // Extract unique collections from Raindrop bookmarks
  const collections = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach(b => {
      if (b.category && b.category !== 'Unsorted' && b.category !== 'Raindrop.io') {
        set.add(b.category);
      }
    });
    return Array.from(set).sort();
  }, [bookmarks]);

  // Extract unique tags from Raindrop bookmarks
  const tags = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach(b => {
      const tList = bookmarkTags[b.url || ''] || [];
      tList.forEach(t => set.add(t));
    });
    return Array.from(set).sort();
  }, [bookmarks, bookmarkTags]);

  // Filter and sort items
  const filteredBookmarks = useMemo(() => {
    return bookmarks
      .filter(item => {
        if (selectedCollection !== 'all' && item.category !== selectedCollection) {
          return false;
        }
        if (selectedTag !== 'all') {
          const itemTags = bookmarkTags[item.url || ''] || [];
          if (!itemTags.includes(selectedTag)) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();

          // Operator checks matching Screenshot 1
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
            const matchTags = (bookmarkTags[item.url || ''] || []).some(t => t.toLowerCase().includes(q));
            if (!(matchTitle || matchNotes || matchDomain || matchTags)) return false;
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
        return b.dateObj.getTime() - a.dateObj.getTime();
      });
  }, [bookmarks, selectedCollection, selectedTag, searchQuery, sortOrder, bookmarkNotes, bookmarkTags, sessionSnapshots]);

  return (
    <div id="raindrop-subview" className="space-y-6">
      {/* Raindrop Header Banner */}
      <div className="bg-gradient-to-br from-blue-500/10 via-[#0089FF]/5 to-transparent dark:from-[#0089FF]/15 dark:via-blue-900/10 dark:to-transparent rounded-3xl p-5 sm:p-6 border border-blue-200/80 dark:border-blue-500/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0089FF] text-white flex items-center justify-center shrink-0 shadow-md">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                Raindrop.io Bookmarks
              </h2>
              {isApiConnected ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  API Connected {raindropConfig.collectionName ? `(${raindropConfig.collectionName})` : ''}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100/70 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                  Direct & File Sync
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Sync collections, article snapshots, tags, and cloud highlights from your Raindrop.io account.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => onOpenSyncModal('raindrop')}
            className="px-3.5 py-2 bg-[#0089FF] hover:bg-[#0072d6] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Raindrop.io</span>
          </button>

          <a
            href="https://app.raindrop.io"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-white dark:bg-[#1f1f23] text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Open Raindrop</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </a>
        </div>
      </div>

      {/* Subview Toolbar: Collections, Search, Sort & Layout Toggle */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Collection Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCollection('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCollection === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              All Collections ({bookmarks.length})
            </button>
            {collections.map(c => {
              const count = bookmarks.filter(b => b.category === c).length;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCollection(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer ${
                    selectedCollection === c
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  <Folder className="w-3 h-3 text-amber-500" />
                  <span>{c}</span>
                  <span className="opacity-70 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Raindrop View Menu (Screenshot 2: List, Cards, Headlines, Moodboard, Kanban Moodboard, and Moodboard Display Toggles) */}
          <div className="shrink-0 self-end sm:self-auto">
            <RaindropViewMenu
              layoutMode={layoutMode}
              onChangeLayoutMode={handleLayoutModeChange}
              moodboardConfig={moodboardConfig}
              onChangeMoodboardConfig={handleSaveMoodboardConfig}
              onApplyToAll={() => handleSaveMoodboardConfig(moodboardConfig)}
            />
          </div>
        </div>

        {/* Search, Tag Filter, and Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Raindrop Search Dropdown (Screenshot 1: with search suggestions and operators) */}
          <div className="flex-1">
            <RaindropSearchDropdown
              value={searchQuery}
              onChange={setSearchQuery}
              tags={tags}
              collections={collections}
              totalCount={bookmarks.length}
            />
          </div>

          {/* Tags Dropdown */}
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-400">Tag:</span>
              <select
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
                className="px-2.5 py-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-gray-300 focus:outline-hidden"
              >
                <option value="all">All Tags ({tags.length})</option>
                {tags.map(t => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Order */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-gray-400">Sort:</span>
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as any)}
              className="px-2.5 py-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-gray-300 focus:outline-hidden"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookmarks Display */}
      {filteredBookmarks.length > 0 ? (
        <div>
          {/* 1. Kanban Moodboard View: Uncropped, unstretched image decides board size */}
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
              onSelectTag={t => setSelectedTag(t)}
              layoutMode="kanban"
              onChangeLayoutMode={handleLayoutModeChange}
              moodboardConfig={moodboardConfig}
              onChangeMoodboardConfig={handleSaveMoodboardConfig}
            />
          )}

          {/* 2. Moodboard Masonry View: Uncropped, unstretched image decides card height */}
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
              onSelectTag={t => setSelectedTag(t)}
              layoutMode="moodboard"
              onChangeLayoutMode={handleLayoutModeChange}
              moodboardConfig={moodboardConfig}
              onChangeMoodboardConfig={handleSaveMoodboardConfig}
            />
          )}

          {/* 3. Cards Grid View */}
          {layoutMode === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBookmarks.map(item => (
                <BookmarkCard
                  key={item.id}
                  item={item}
                  notes={bookmarkNotes[item.url || '']}
                  tags={bookmarkTags[item.url || ''] || []}
                  snapshot={sessionSnapshots[item.url || ''] || item.cover || item.image_url}
                  layoutMode="cards"
                  onCopyLink={onCopyLink}
                  onOpenEdit={onOpenEditModal}
                  onSelectTag={t => setSelectedTag(t)}
                  onDeleteItem={onDeleteItem}
                  copiedUrl={copiedUrl}
                />
              ))}
            </div>
          )}

          {/* 4. Compact List View */}
          {layoutMode === 'list' && (
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-gray-200/80 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5 overflow-hidden shadow-xs">
              {filteredBookmarks.map(item => (
                <BookmarkCard
                  key={item.id}
                  item={item}
                  notes={bookmarkNotes[item.url || '']}
                  tags={bookmarkTags[item.url || ''] || []}
                  snapshot={sessionSnapshots[item.url || '']}
                  layoutMode="list"
                  onCopyLink={onCopyLink}
                  onOpenEdit={onOpenEditModal}
                  onSelectTag={t => setSelectedTag(t)}
                  onDeleteItem={onDeleteItem}
                  copiedUrl={copiedUrl}
                />
              ))}
            </div>
          )}

          {/* 5. Headlines View (Screenshot 2: Headlines layout) */}
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
                  onCopyLink={onCopyLink}
                  onOpenEdit={onOpenEditModal}
                  onSelectTag={t => setSelectedTag(t)}
                  onDeleteItem={onDeleteItem}
                  copiedUrl={copiedUrl}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="p-10 rounded-3xl border border-dashed border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/10 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0089FF]/10 text-[#0089FF] flex items-center justify-center">
            <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No Raindrop.io Bookmarks Found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Connect your Raindrop.io account via API token, or upload your exported HTML/CSV archive to explore all your collections.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenSyncModal('raindrop')}
              className="px-4 py-2 bg-[#0089FF] hover:bg-[#0072d6] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Connect Raindrop.io</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
