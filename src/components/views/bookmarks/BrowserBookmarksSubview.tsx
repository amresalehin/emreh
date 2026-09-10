import React, { useState, useMemo } from 'react';
import {
  Globe,
  Folder,
  Download,
  Upload,
  Search,
  Grid,
  List,
  Table as TableIcon,
  ExternalLink,
  Sparkles,
  Compass,
  Laptop
} from 'lucide-react';
import { TimelineItem } from '../../../types';
import { BookmarkCard } from './BookmarkCard';
import { BookmarkServiceName } from '../../../utils/bookmarkSyncServices';

interface BrowserBookmarksSubviewProps {
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

export const BrowserBookmarksSubview: React.FC<BrowserBookmarksSubviewProps> = ({
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
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list' | 'table'>('list');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title'>('newest');

  // Extract unique folders
  const folders = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach(b => {
      if (b.category && b.category !== 'Unsorted' && !b.category.toLowerCase().includes('browser')) {
        set.add(b.category);
      }
    });
    return Array.from(set).sort();
  }, [bookmarks]);

  // Extract domains with counts
  const domains = useMemo(() => {
    const map = new Map<string, number>();
    bookmarks.forEach(b => {
      const d = b.domain || 'web';
      map.set(d, (map.get(d) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [bookmarks]);

  // Export Netscape HTML
  const handleExportNetscapeHtml = () => {
    const header = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${Math.floor(Date.now() / 1000)}" LAST_MODIFIED="${Math.floor(Date.now() / 1000)}">Browser Bookmarks</H3>
    <DL><p>\n`;

    const itemsStr = bookmarks
      .map(b => {
        const addDate = Math.floor((b.dateObj?.getTime() || Date.now()) / 1000);
        return `        <DT><A HREF="${b.url || '#'}" ADD_DATE="${addDate}">${b.title || 'Untitled Bookmark'}</A>`;
      })
      .join('\n');

    const footer = `\n    </DL><p>\n</DL><p>`;
    const fullHtml = header + itemsStr + footer;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `browser_bookmarks_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter bookmarks
  const filteredBookmarks = useMemo(() => {
    return bookmarks
      .filter(item => {
        if (selectedFolder !== 'all' && item.category !== selectedFolder) {
          return false;
        }
        if (selectedDomain !== 'all' && item.domain !== selectedDomain) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (item.title || '').toLowerCase().includes(q);
          const matchDomain = (item.domain || '').toLowerCase().includes(q);
          const matchFolder = (item.category || '').toLowerCase().includes(q);
          const matchNotes = (bookmarkNotes[item.url || ''] || '').toLowerCase().includes(q);
          return matchTitle || matchDomain || matchFolder || matchNotes;
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
  }, [bookmarks, selectedFolder, selectedDomain, searchQuery, sortOrder, bookmarkNotes]);

  return (
    <div id="browser-bookmarks-subview" className="space-y-6">
      {/* Browser Bookmarks Header Banner */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent dark:from-amber-600/15 dark:via-amber-950/20 dark:to-transparent rounded-3xl p-5 sm:p-6 border border-amber-200/80 dark:border-amber-500/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                Browser Bookmarks
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100/80 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Chrome • Safari • Firefox • Edge • Arc
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Standard browser bookmark hierarchy, nested folder structures, Bookmarks Bar, and Netscape HTML exports.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => onOpenSyncModal('browser')}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Browser HTML</span>
          </button>

          {bookmarks.length > 0 && (
            <button
              type="button"
              onClick={handleExportNetscapeHtml}
              className="px-3 py-2 bg-white dark:bg-[#1f1f23] text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download standard Netscape HTML bookmarks file"
            >
              <Download className="w-3.5 h-3.5 text-gray-400" />
              <span>Export HTML</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar: Folders, Domains, Search & Layout */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Folders filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedFolder('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedFolder === 'all'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              All Folders ({bookmarks.length})
            </button>
            {folders.map(f => {
              const count = bookmarks.filter(b => b.category === f).length;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedFolder(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer ${
                    selectedFolder === f
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  <Folder className="w-3 h-3 text-amber-500" />
                  <span>{f}</span>
                  <span className="opacity-70 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Layout mode switcher */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setLayoutMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutMode === 'list'
                  ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-2xs'
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
                  ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-2xs'
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
                  ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-2xs'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}
              title="Dense Table"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search, Domain Filter, and Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search browser bookmarks, folders, or URLs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Domains filter dropdown */}
          {domains.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-400">Domain:</span>
              <select
                value={selectedDomain}
                onChange={e => setSelectedDomain(e.target.value)}
                className="px-2.5 py-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-gray-300 focus:outline-hidden"
              >
                <option value="all">All Domains</option>
                {domains.map(([d, count]) => (
                  <option key={d} value={d}>
                    {d} ({count})
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
                    <th className="py-3 px-4">Bookmark Title</th>
                    <th className="py-3 px-4">Domain</th>
                    <th className="py-3 px-4">Folder</th>
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
        <div className="p-10 rounded-3xl border border-dashed border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-600/10 text-amber-600 flex items-center justify-center">
            <Globe className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No Browser Bookmarks Imported
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Export your bookmarks from Google Chrome, Safari, Firefox, or Edge as an HTML file (<kbd className="font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 rounded">Cmd+Option+B</kbd> &gt; Export Bookmarks), or load sample items.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenSyncModal('browser')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import HTML Bookmarks</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
