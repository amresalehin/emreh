import React, { useState, useMemo } from 'react';
import {
  Tag,
  Search,
  Grid,
  List,
  Table as TableIcon,
  Upload,
  ExternalLink,
  Sparkles,
  Hash,
  FileText
} from 'lucide-react';
import { TimelineItem } from '../../../types';
import { BookmarkCard } from './BookmarkCard';
import { BookmarkServiceName } from '../../../utils/bookmarkSyncServices';

interface PinboardSubviewProps {
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

export const PinboardSubview: React.FC<PinboardSubviewProps> = ({
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
  const [showTagCloud, setShowTagCloud] = useState(true);

  // Compute tag frequencies for interactive tag cloud
  const tagFrequencies = useMemo(() => {
    const map = new Map<string, number>();
    bookmarks.forEach(b => {
      const tList = bookmarkTags[b.url || ''] || [];
      tList.forEach(t => {
        map.set(t, (map.get(t) || 0) + 1);
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
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
    <div id="pinboard-subview" className="space-y-6">
      {/* Pinboard Header Banner */}
      <div className="bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-transparent dark:from-blue-600/15 dark:via-blue-950/20 dark:to-transparent rounded-3xl p-5 sm:p-6 border border-blue-200/80 dark:border-blue-500/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                Pinboard Bookmarks
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100/80 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                Tag-Centric Archiving
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Social bookmarking for the fast and curious. Information-dense bookmark management with extended notes and rich tag graphs.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => onOpenSyncModal('pinboard')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Pinboard JSON</span>
          </button>

          <a
            href="https://pinboard.in"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-white dark:bg-[#1f1f23] text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>pinboard.in</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </a>
        </div>
      </div>

      {/* Interactive Tag Cloud */}
      {tagFrequencies.length > 0 && (
        <div className="bg-white dark:bg-[#18181b] p-4 rounded-2xl border border-gray-200/80 dark:border-white/10 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-200">
              <Hash className="w-3.5 h-3.5 text-blue-500" />
              <span>Tag Cloud ({tagFrequencies.length} tags)</span>
            </div>
            {selectedTag !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedTag('all')}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Reset Tag Filter
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
            <button
              type="button"
              onClick={() => setSelectedTag('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedTag === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              All Bookmarks
            </button>
            {tagFrequencies.map(([tag, count]) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(isSelected ? 'all' : tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  <span>#{tag}</span>
                  <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Toolbar: Search, Sort, Layout */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filter Pinboard bookmarks, notes, URLs, or tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
                  ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-2xs'
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
                  ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-2xs'
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
                  ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}
              title="Dense Table"
            >
              <TableIcon className="w-4 h-4" />
            </button>
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
                    <th className="py-3 px-4">Date Added</th>
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
        <div className="p-10 rounded-3xl border border-dashed border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/10 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
            <Tag className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No Pinboard Bookmarks Found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Download your backup JSON file from <a href="https://pinboard.in/export" target="_blank" rel="noreferrer" className="underline font-semibold">pinboard.in/export</a> and upload it here, or load sample Pinboard bookmarks.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenSyncModal('pinboard')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Pinboard JSON</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
