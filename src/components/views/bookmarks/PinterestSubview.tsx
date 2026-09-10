import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  Grid,
  List,
  Table as TableIcon,
  Folder,
  ExternalLink,
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { TimelineItem } from '../../../types';
import { BookmarkCard } from './BookmarkCard';
import { BookmarkServiceName } from '../../../utils/bookmarkSyncServices';
import { getPinterestConfig } from '../../../utils/pinterestSync';

interface PinterestSubviewProps {
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

export const PinterestSubview: React.FC<PinterestSubviewProps> = ({
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
  const [selectedBoard, setSelectedBoard] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<'pinterest' | 'list' | 'table'>('pinterest');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title'>('newest');

  const pinterestConfig = getPinterestConfig();
  const isApiConnected = Boolean(pinterestConfig.apiToken);

  // Extract unique boards
  const boards = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach(b => {
      if (b.category && b.category !== 'Unsorted' && b.category !== 'Pinterest') {
        set.add(b.category);
      }
    });
    return Array.from(set).sort();
  }, [bookmarks]);

  // Extract tags
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
    return bookmarks
      .filter(item => {
        if (selectedBoard !== 'all' && item.category !== selectedBoard) {
          return false;
        }
        if (selectedTag !== 'all') {
          const itemTags = bookmarkTags[item.url || ''] || [];
          if (!itemTags.includes(selectedTag)) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (item.title || '').toLowerCase().includes(q);
          const matchNotes = (bookmarkNotes[item.url || ''] || '').toLowerCase().includes(q);
          const matchBoard = (item.category || '').toLowerCase().includes(q);
          const matchTags = (bookmarkTags[item.url || ''] || []).some(t => t.toLowerCase().includes(q));
          return matchTitle || matchNotes || matchBoard || matchTags;
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
  }, [bookmarks, selectedBoard, selectedTag, searchQuery, sortOrder, bookmarkNotes, bookmarkTags]);

  return (
    <div id="pinterest-subview" className="space-y-6">
      {/* Pinterest Header Banner */}
      <div className="bg-gradient-to-br from-rose-500/10 via-[#E60023]/5 to-transparent dark:from-[#E60023]/15 dark:via-rose-950/20 dark:to-transparent rounded-3xl p-5 sm:p-6 border border-rose-200/80 dark:border-rose-500/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E60023] text-white flex items-center justify-center shrink-0 shadow-md">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.373-.057.24-.19.291-.439.175-1.644-.766-2.671-3.168-2.671-5.102 0-4.155 3.018-7.971 8.709-7.971 4.572 0 8.125 3.259 8.125 7.614 0 4.544-2.864 8.2-6.839 8.2-1.336 0-2.592-.695-3.021-1.513l-.824 3.143c-.298 1.144-1.104 2.578-1.644 3.454C9.539 23.834 10.749 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                Pinterest Pins & Boards
              </h2>
              {isApiConnected ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  API Synced {pinterestConfig.boardName ? `(${pinterestConfig.boardName})` : ''}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100/80 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                  Visual Pinboard
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Visual bookmarks, moodboards, architectural inspirations, design snapshots, and recipe pins organized by board.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => onOpenSyncModal('pinterest')}
            className="px-3.5 py-2 bg-[#E60023] hover:bg-[#c9001f] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Pinterest Boards</span>
          </button>

          <a
            href="https://www.pinterest.com"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-white dark:bg-[#1f1f23] text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Open Pinterest</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </a>
        </div>
      </div>

      {/* Toolbar: Boards, Search, Layout & Sort */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Boards Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedBoard('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedBoard === 'all'
                  ? 'bg-[#E60023] text-white shadow-2xs'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              All Boards ({bookmarks.length})
            </button>
            {boards.map(b => {
              const count = bookmarks.filter(item => item.category === b).length;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBoard(b)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer ${
                    selectedBoard === b
                      ? 'bg-[#E60023] text-white shadow-2xs'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  <Folder className="w-3 h-3 text-rose-500" />
                  <span>{b}</span>
                  <span className="opacity-70 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setLayoutMode('pinterest')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutMode === 'pinterest'
                  ? 'bg-white dark:bg-neutral-800 text-rose-600 dark:text-rose-400 shadow-2xs'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}
              title="Pinboard Visual Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutMode === 'list'
                  ? 'bg-white dark:bg-neutral-800 text-rose-600 dark:text-rose-400 shadow-2xs'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}
              title="Compact List"
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

        {/* Search, Tag Filter, and Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search pins, boards, tags, or notes..."
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
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pins Display */}
      {filteredBookmarks.length > 0 ? (
        <div>
          {layoutMode === 'pinterest' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredBookmarks.map(item => (
                <BookmarkCard
                  key={item.id}
                  item={item}
                  notes={bookmarkNotes[item.url || '']}
                  tags={bookmarkTags[item.url || ''] || []}
                  snapshot={sessionSnapshots[item.url || ''] || item.cover || item.image_url}
                  layoutMode="pinterest"
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
                    <th className="py-3 px-4">Pin Title</th>
                    <th className="py-3 px-4">Domain</th>
                    <th className="py-3 px-4">Board</th>
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
        <div className="p-10 rounded-3xl border border-dashed border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E60023]/10 text-[#E60023] flex items-center justify-center">
            <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.373-.057.24-.19.291-.439.175-1.644-.766-2.671-3.168-2.671-5.102 0-4.155 3.018-7.971 8.709-7.971 4.572 0 8.125 3.259 8.125 7.614 0 4.544-2.864 8.2-6.839 8.2-1.336 0-2.592-.695-3.021-1.513l-.824 3.143c-.298 1.144-1.104 2.578-1.644 3.454C9.539 23.834 10.749 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
            </svg>
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No Pinterest Pins Found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Connect your Pinterest account via Access Token, import your boards or pin lists, or load sample pins to view this board explorer.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenSyncModal('pinterest')}
              className="px-4 py-2 bg-[#E60023] hover:bg-[#c9001f] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Connect Pinterest Boards</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
