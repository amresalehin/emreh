import React, { useState, useMemo } from 'react';
import {
  Database,
  Search,
  Grid,
  List,
  Table as TableIcon,
  Upload,
  ExternalLink,
  Sparkles,
  Server,
  Tag
} from 'lucide-react';
import { TimelineItem } from '../../../types';
import { BookmarkCard } from './BookmarkCard';
import { BookmarkServiceName } from '../../../utils/bookmarkSyncServices';

interface LinkdingSubviewProps {
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

export const LinkdingSubview: React.FC<LinkdingSubviewProps> = ({
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
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid' | 'table'>('list');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title'>('newest');

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
        if (sortOrder === 'title') {
          return (a.title || '').localeCompare(b.title || '');
        }
        if (sortOrder === 'oldest') {
          return a.dateObj.getTime() - b.dateObj.getTime();
        }
        return b.dateObj.getTime() - a.dateObj.getTime();
      });
  }, [bookmarks, selectedTag, searchQuery, sortOrder, bookmarkNotes, bookmarkTags]);

  return (
    <div id="linkding-subview" className="space-y-6">
      {/* Linkding Header Banner */}
      <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent dark:from-emerald-600/15 dark:via-emerald-950/20 dark:to-transparent rounded-3xl p-5 sm:p-6 border border-emerald-200/80 dark:border-emerald-500/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                Linkding Bookmarks
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                Self-Hosted Bookmark Manager
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Connect to your self-hosted Linkding instance to archive web resources, manage tags, and access snapshots.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => onOpenSyncModal('linkding')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Linkding JSON</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Tag filter, Sort & Layout */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search Linkding bookmarks, notes, or domains..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {tags.length > 0 && (
              <div className="flex items-center gap-1.5">
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

            <div className="flex items-center gap-1.5">
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

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLayoutMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  layoutMode === 'list'
                    ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-white'
                }`}
                title="Compact List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  layoutMode === 'grid'
                    ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-white'
                }`}
                title="Cards Grid"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  layoutMode === 'table'
                    ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-white'
                }`}
                title="Dense Table"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bookmarks Display */}
      {filteredBookmarks.length > 0 ? (
        <div>
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

          {layoutMode === 'table' && (
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-gray-200/80 dark:border-white/10 overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 text-gray-400 font-bold bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Domain</th>
                    <th className="py-3 px-4">Tags</th>
                    <th className="py-3 px-4">Date</th>
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
        <div className="p-10 rounded-3xl border border-dashed border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
            <Database className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No Linkding Bookmarks Found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Export your bookmarks from your Linkding instance (Settings &gt; Import &amp; Export) and upload the JSON file here, or load sample bookmarks.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenSyncModal('linkding')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Linkding JSON</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
