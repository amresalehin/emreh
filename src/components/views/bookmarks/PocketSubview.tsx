import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Clock,
  Search,
  Grid,
  List,
  Table as TableIcon,
  Tag,
  Upload,
  ExternalLink,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { TimelineItem } from '../../../types';
import { BookmarkCard } from './BookmarkCard';
import { BookmarkServiceName } from '../../../utils/bookmarkSyncServices';

interface PocketSubviewProps {
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

export const PocketSubview: React.FC<PocketSubviewProps> = ({
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
  const [readingTimeFilter, setReadingTimeFilter] = useState<'all' | 'quick' | 'medium' | 'long'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'readtime'>('newest');

  // Compute estimated read times and statistics
  const readStats = useMemo(() => {
    let totalMinutes = 0;
    bookmarks.forEach(b => {
      const words = ((b.title || '') + ' ' + (b.subtitle || '') + ' ' + (bookmarkNotes[b.url || ''] || '')).split(/\s+/).length;
      totalMinutes += Math.max(2, Math.min(25, Math.ceil(words / 120) * 2 + 1));
    });
    return {
      totalMinutes,
      count: bookmarks.length
    };
  }, [bookmarks, bookmarkNotes]);

  // Extract tags
  const tags = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach(b => {
      const tList = bookmarkTags[b.url || ''] || [];
      tList.forEach(t => set.add(t));
    });
    return Array.from(set).sort();
  }, [bookmarks, bookmarkTags]);

  // Filter bookmarks
  const filteredBookmarks = useMemo(() => {
    return bookmarks
      .filter(item => {
        const words = ((item.title || '') + ' ' + (item.subtitle || '') + ' ' + (bookmarkNotes[item.url || ''] || '')).split(/\s+/).length;
        const mins = Math.max(2, Math.min(25, Math.ceil(words / 120) * 2 + 1));

        if (readingTimeFilter === 'quick' && mins > 5) return false;
        if (readingTimeFilter === 'medium' && (mins <= 5 || mins > 10)) return false;
        if (readingTimeFilter === 'long' && mins <= 10) return false;

        if (selectedTag !== 'all') {
          const itemTags = bookmarkTags[item.url || ''] || [];
          if (!itemTags.includes(selectedTag)) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (item.title || '').toLowerCase().includes(q);
          const matchNotes = (bookmarkNotes[item.url || ''] || '').toLowerCase().includes(q);
          const matchDomain = (item.domain || '').toLowerCase().includes(q);
          const matchTags = (bookmarkTags[item.url || ''] || []).some(t => t.toLowerCase().includes(q));
          return matchTitle || matchNotes || matchDomain || matchTags;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'readtime') {
          const wordsA = ((a.title || '') + ' ' + (a.subtitle || '')).split(/\s+/).length;
          const wordsB = ((b.title || '') + ' ' + (b.subtitle || '')).split(/\s+/).length;
          return wordsA - wordsB;
        }
        if (sortOrder === 'oldest') {
          return a.dateObj.getTime() - b.dateObj.getTime();
        }
        return b.dateObj.getTime() - a.dateObj.getTime();
      });
  }, [bookmarks, readingTimeFilter, selectedTag, searchQuery, sortOrder, bookmarkNotes, bookmarkTags]);

  return (
    <div id="pocket-subview" className="space-y-6">
      {/* Pocket Header Banner */}
      <div className="bg-gradient-to-br from-rose-500/10 via-red-500/5 to-transparent dark:from-rose-600/15 dark:via-red-950/20 dark:to-transparent rounded-3xl p-5 sm:p-6 border border-rose-200/80 dark:border-rose-500/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5l-4-4 1.41-1.41L11 13.67l6.59-6.59L19 8.5l-8 8z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                Pocket Reading List
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100/80 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                Read-it-Later Archive
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Articles, long-form journalism, and essays saved to Pocket with estimated reading time badges and smart excerpts.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => onOpenSyncModal('pocket')}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Pocket Export</span>
          </button>

          <a
            href="https://getpocket.com"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-white dark:bg-[#1f1f23] text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Open Pocket</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </a>
        </div>
      </div>

      {/* Toolbar: Read Time filters, Tags, Search & Layout */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Read time pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setReadingTimeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                readingTimeFilter === 'all'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              All Articles ({bookmarks.length})
            </button>
            <button
              type="button"
              onClick={() => setReadingTimeFilter('quick')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer ${
                readingTimeFilter === 'quick'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              <Clock className="w-3 h-3 text-rose-500" />
              <span>Quick Reads (&le; 5 min)</span>
            </button>
            <button
              type="button"
              onClick={() => setReadingTimeFilter('medium')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer ${
                readingTimeFilter === 'medium'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              <Clock className="w-3 h-3 text-amber-500" />
              <span>Medium (5-10 min)</span>
            </button>
            <button
              type="button"
              onClick={() => setReadingTimeFilter('long')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer ${
                readingTimeFilter === 'long'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              <Clock className="w-3 h-3 text-purple-500" />
              <span>Deep Dives (&gt; 10 min)</span>
            </button>
          </div>

          {/* Layout mode switcher */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutMode === 'grid'
                  ? 'bg-white dark:bg-neutral-800 text-rose-600 dark:text-rose-400 shadow-2xs'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}
              title="Reading Cards Grid"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutMode === 'list'
                  ? 'bg-white dark:bg-neutral-800 text-rose-600 dark:text-rose-400 shadow-2xs'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}
              title="Compact Reading List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutMode === 'table'
                  ? 'bg-white dark:bg-neutral-800 text-rose-600 dark:text-rose-400 shadow-2xs'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}
              title="Dense Table"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search, Tag filter, Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search Pocket articles, authors, or topics..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-rose-500 transition-colors"
            />
          </div>

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

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-gray-400">Sort:</span>
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as any)}
              className="px-2.5 py-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-gray-300 focus:outline-hidden"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="readtime">Shortest Read First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Articles Display */}
      {filteredBookmarks.length > 0 ? (
        <div>
          {layoutMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBookmarks.map(item => (
                <BookmarkCard
                  key={item.id}
                  item={item}
                  notes={bookmarkNotes[item.url || '']}
                  tags={bookmarkTags[item.url || ''] || []}
                  snapshot={sessionSnapshots[item.url || ''] || item.cover}
                  layoutMode="grid"
                  onCopyLink={onCopyLink}
                  onOpenEdit={onOpenEditModal}
                  onSelectTag={t => setSelectedTag(t)}
                  onDeleteItem={onDeleteItem}
                  copiedUrl={copiedUrl}
                />
              ))}
            </div>
          )}

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

          {layoutMode === 'table' && (
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-gray-200/80 dark:border-white/10 overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 text-gray-400 font-bold bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="py-3 px-4">Article Title</th>
                    <th className="py-3 px-4">Publication</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Tags</th>
                    <th className="py-3 px-4">Date Saved</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredBookmarks.map(item => (
                    <BookmarkCard
                      key={item.id}
                      item={item}
                      notes={bookmarkNotes[item.url || '']}
                      tags={bookmarkTags[item.url || ''] || []}
                      layoutMode="table"
                      onCopyLink={onCopyLink}
                      onOpenEdit={onOpenEditModal}
                      onSelectTag={t => setSelectedTag(t)}
                      onDeleteItem={onDeleteItem}
                      copiedUrl={copiedUrl}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="p-10 rounded-3xl border border-dashed border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-600/10 text-rose-600 flex items-center justify-center">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No Pocket Articles Imported
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Download your Pocket archive from <a href="https://getpocket.com/export" target="_blank" rel="noreferrer" className="underline font-semibold">getpocket.com/export</a> (<code className="text-xs">ril_export.html</code>) and upload it here, or load sample reading list articles.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenSyncModal('pocket')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Pocket Export</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
