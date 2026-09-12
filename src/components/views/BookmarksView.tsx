import React, { useState, useMemo, useEffect } from 'react';
import { TimelineItem, DateRange } from '../../types';
import {
  exportToNetscapeHtml,
  BookmarkServiceName
} from '../../utils/bookmarkSyncServices';
import { getRaindropConfig } from '../../utils/raindropSync';
import { getPinterestConfig } from '../../utils/pinterestSync';
import { BookmarksSidebarSelection } from './bookmarks/BookmarksSidebar';
import { BookmarksTopHeader } from './bookmarks/BookmarksTopHeader';
import { PasteLinkModal } from './bookmarks/PasteLinkModal';
import { AllBookmarksSubview, BookmarksActiveFilter } from './bookmarks/AllBookmarksSubview';
import { BrowserInspectorPanel } from './browser/BrowserInspectorPanel';

export type BookmarksAppSubviewId = 'all' | string;

export interface BookmarksViewProps {
  currentDate: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onOpenCalendar?: () => void;
  onImportClick?: () => void;
  dateRange?: DateRange | null;
  onClearDateRange?: () => void;
  onOpenDateRangePicker?: () => void;
  timelineData: TimelineItem[];
  bookmarkNotes: Record<string, string>;
  onSaveBookmarkNote: (url: string, note: string) => void;
  bookmarkTags: Record<string, string[]>;
  onAddBookmarkTag: (url: string, tag: string) => void;
  onRemoveBookmarkTag: (url: string, tag: string) => void;
  sessionSnapshots?: Record<string, string>;
  onOpenSyncModal: (service?: BookmarkServiceName) => void;
  onDeleteItem?: (itemId: string) => void;
  onApplySyncedData?: (result: any, sourceName: string) => void;
  onActiveServiceChange?: (service: string, mediaType?: string) => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onOpenCalendar,
  onImportClick,
  dateRange,
  onClearDateRange,
  onOpenDateRangePicker,
  timelineData,
  bookmarkNotes,
  onSaveBookmarkNote,
  bookmarkTags,
  onAddBookmarkTag,
  onRemoveBookmarkTag,
  sessionSnapshots = {},
  onOpenSyncModal,
  onDeleteItem,
  onApplySyncedData,
  onActiveServiceChange
}) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<TimelineItem | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  // Sync active service / media theme whenever subview changes (if no item is currently active)
  useEffect(() => {
    if (!activeItem) {
      onActiveServiceChange?.('all', undefined);
    }
  }, [activeItem, onActiveServiceChange]);

  const handleSelectItem = (item: TimelineItem) => {
    setActiveItem(item);
    setIsRightPanelOpen(true);
    // Auto-detect media type or service from selected item
    const media = item.media_type || (
      item.url?.includes('youtube') || item.url?.includes('youtu.be')
        ? 'video'
        : item.url?.includes('spotify')
        ? 'audio'
        : item.url?.includes('pinterest')
        ? 'image'
        : item.url?.includes('github')
        ? 'code'
        : undefined
    );
    const domainOrService = item.platform || item.domain || 'all';
    onActiveServiceChange?.(domainOrService, media);
  };

  // 1. Identify all bookmarks from timelineData
  const allBookmarks = useMemo(() => {
    return timelineData.filter(item => {
      if (item.type !== 'browser') return false;
      const isBookmarkTransition = item.transition === 'BOOKMARK';
      const p = (item.platform || '').toLowerCase();
      const isBookmarkPlatform =
        p.includes('raindrop') ||
        p.includes('bookmark') ||
        p.includes('pocket') ||
        p.includes('pinboard') ||
        p.includes('linkding') ||
        p.includes('pinterest') ||
        p.includes('pin');
      const hasCustomNotes = !!(item.url && bookmarkNotes[item.url]?.trim());
      const hasCustomTags = !!(item.url && bookmarkTags[item.url]?.length > 0);

      return isBookmarkTransition || isBookmarkPlatform || hasCustomNotes || hasCustomTags;
    });
  }, [timelineData, bookmarkNotes, bookmarkTags]);

  // App counts map for providers
  const appCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allBookmarks.forEach(b => {
      const p = (b.platform || '').toLowerCase();
      if (p) {
        counts[p] = (counts[p] || 0) + 1;
      }
    });
    return counts;
  }, [allBookmarks]);

  // Connection states
  const raindropConfig = getRaindropConfig();
  const pinterestConfig = getPinterestConfig();

  // Filter selection (folder, tag, or view all)
  const [sidebarSelection, setSidebarSelection] = useState<BookmarksSidebarSelection>(() => {
    try {
      const saved = localStorage.getItem('mylife_bookmark_sidebar_sel');
      return saved ? JSON.parse(saved) : { type: 'view', id: 'all' };
    } catch {
      return { type: 'view', id: 'all' };
    }
  });

  // Paste Link Modal state
  const [isPasteLinkOpen, setIsPasteLinkOpen] = useState(false);

  // Extract collections/folders with item counts
  const folders = useMemo(() => {
    const map = new Map<string, number>();
    allBookmarks.forEach(b => {
      if (b.category && b.category !== 'Unsorted') {
        map.set(b.category, (map.get(b.category) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allBookmarks]);

  // Extract tags with item counts
  const tagsList = useMemo(() => {
    const map = new Map<string, number>();
    allBookmarks.forEach(b => {
      const tList = bookmarkTags[b.url || ''] || [];
      tList.forEach(t => {
        map.set(t, (map.get(t) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allBookmarks, bookmarkTags]);

  const handleSidebarSelect = (selection: BookmarksSidebarSelection) => {
    setSidebarSelection(selection);
    try {
      localStorage.setItem('mylife_bookmark_sidebar_sel', JSON.stringify(selection));
    } catch (e) {
      console.warn(e);
    }
  };

  // Handle saving new bookmarks (from PasteLinkModal)
  const handleSaveNewBookmark = (item: TimelineItem, note?: string, tags?: string[]) => {
    if (onApplySyncedData) {
      onApplySyncedData(
        {
          items: [item],
          notes: note && item.url ? { [item.url]: note } : {},
          tags: tags && tags.length > 0 && item.url ? { [item.url]: tags } : {},
          snapshots: {},
          count: 1
        },
        'Pasted Link'
      );
    }
  };

  // Handle Copy URL
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Handle Export Netscape HTML
  const handleExportHtml = () => {
    const html = exportToNetscapeHtml(allBookmarks, bookmarkTags, bookmarkNotes);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks_export_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Open Edit in Inspector Sidepanel
  const openEditModal = (item: TimelineItem) => {
    setActiveItem(item);
    setIsRightPanelOpen(true);
  };

  return (
    <div
      id="bookmarks-view-container"
      className="flex-1 flex flex-col h-full bg-transparent overflow-hidden"
    >
      {/* Top Header: Uncluttered, with all connections & imports consolidated in the Import button */}
      <BookmarksTopHeader
        totalCount={allBookmarks.length}
        activeFilter={sidebarSelection.type !== 'view' ? (sidebarSelection as BookmarksActiveFilter) : null}
        onSelectFilter={filter => {
          if (!filter) {
            handleSidebarSelect({ type: 'view', id: 'all' });
          } else {
            handleSidebarSelect(filter as any);
          }
        }}
        appCounts={appCounts}
        folders={folders}
        tags={tagsList}
        isRaindropConnected={Boolean(raindropConfig.apiToken)}
        isPinterestConnected={Boolean(pinterestConfig.apiToken)}
        onOpenPasteLink={() => setIsPasteLinkOpen(true)}
        onOpenSyncModal={onOpenSyncModal}
        onExportHtml={handleExportHtml}
        onImportClick={onImportClick}
      />

      {/* Main Content Area: Single Unified Bookmark Workspace (No separate sub-pages: Bookmark is bookmark!) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-3.5 sm:p-5">
          <div className="w-full mx-auto">
            <AllBookmarksSubview
              bookmarks={allBookmarks}
              bookmarkNotes={bookmarkNotes}
              bookmarkTags={bookmarkTags}
              sessionSnapshots={sessionSnapshots}
              appCounts={appCounts}
              onOpenSyncModal={onOpenSyncModal}
              onOpenEditModal={openEditModal}
              onCopyLink={handleCopyLink}
              copiedUrl={copiedUrl}
              onDeleteItem={onDeleteItem}
              activeItem={activeItem}
              onSelectItem={handleSelectItem}
              isRightPanelOpen={isRightPanelOpen}
              onToggleRightPanel={() => setIsRightPanelOpen(prev => !prev)}
              activeFilter={sidebarSelection.type !== 'view' ? (sidebarSelection as BookmarksActiveFilter) : null}
              onClearActiveFilter={() => handleSidebarSelect({ type: 'view', id: 'all' })}
              onSaveBookmark={handleSaveNewBookmark}
              onOpenPasteLink={() => setIsPasteLinkOpen(true)}
            />
          </div>
        </div>

        {/* Right Inspector Details Panel as a Sidepanel */}
        {isRightPanelOpen && activeItem && (
          <BrowserInspectorPanel
            item={activeItem}
            allBrowserItems={allBookmarks}
            notes={bookmarkNotes[activeItem.url || ''] || ''}
            tags={bookmarkTags[activeItem.url || ''] || []}
            snapshot={sessionSnapshots[activeItem.url || ''] || activeItem.cover}
            onClose={() => {
              setIsRightPanelOpen(false);
              setActiveItem(null);
              onActiveServiceChange?.('all', undefined);
            }}
            onSaveNote={onSaveBookmarkNote}
            onAddTag={onAddBookmarkTag}
            onRemoveTag={onRemoveBookmarkTag}
            onDeleteItem={onDeleteItem}
          />
        )}
      </div>

      {/* Quick & Full Paste Link Modal */}
      <PasteLinkModal
        isOpen={isPasteLinkOpen}
        onClose={() => setIsPasteLinkOpen(false)}
        onSaveBookmark={handleSaveNewBookmark}
        existingCollections={folders.map(f => f.name)}
        existingTags={tagsList.map(t => t.name)}
        activeServiceOrPlatform="manual"
      />
    </div>
  );
};

export default BookmarksView;
