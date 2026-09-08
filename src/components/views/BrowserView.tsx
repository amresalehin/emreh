import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Globe,
  Search,
  ExternalLink,
  Lock,
  Tag,
  StickyNote,
  BarChart2,
  Copy,
  Check,
  Camera,
  Layers,
  LayoutGrid,
  List,
  Table,
  Filter,
  ArrowUpDown,
  X,
  Upload
} from 'lucide-react';
import { TimelineItem, DateRange } from '../../types';
import { extractDomain } from '../../utils/urlMetadata';
import { formatTime } from '../../utils/dataParser';
import { ViewToolbar } from '../ViewToolbar';
import { BrowserInspectorPanel } from './browser/BrowserInspectorPanel';
import {
  BrowserViewMenu,
  BrowserLayoutMode,
  BrowserSortOption,
  BrowserGroupOption,
  BrowserDisplayOptions
} from './browser/BrowserViewMenu';
import { BrowserSortMenu } from './browser/BrowserSortMenu';
import { BrowserCard } from './browser/BrowserCard';
import { VirtualizedFeed } from '../virtual/VirtualizedFeed';
import { VirtualizedTable } from '../virtual/VirtualizedTable';
import { useInfiniteHistoricalFeed } from '../../utils/useInfiniteHistoricalFeed';
import { openFaviconFor } from '../../utils/faviconModalHelper';

export type BrowserFilterPreset = 'all' | 'with_notes' | 'with_tags' | 'with_snapshots' | 'secure_only';

interface BrowserViewOptions extends BrowserDisplayOptions {
  layoutMode: BrowserLayoutMode;
  sortBy: BrowserSortOption;
  groupBy: BrowserGroupOption;
  filterPreset: BrowserFilterPreset;
}

const DEFAULT_VIEW_OPTIONS: BrowserViewOptions = {
  layoutMode: 'feed',
  sortBy: 'newest',
  groupBy: 'none',
  filterPreset: 'all',
  showFavicon: true,
  showDomainBadge: true,
  showTimestamp: true,
  showSnapshotBadge: true,
  showVisitCountBadge: true,
  showActionButtons: true
};

interface BrowserViewProps {
  currentDate: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onOpenCalendar?: () => void;
  onImportClick?: () => void;
  onJumpToDate: (date: Date) => void;
  dateRange?: DateRange | null;
  onClearDateRange?: () => void;
  onOpenDateRangePicker?: () => void;
  processedData: TimelineItem[];
  dateIndexMap: Map<string, TimelineItem[]>;
  onShowDomainProfile: (domain: string) => void;
  selectedBrowserItem: TimelineItem | null;
  onSelectBrowserItem: (item: TimelineItem | null) => void;
  bookmarkNotes: Record<string, string>;
  onSaveBookmarkNote: (url: string, note: string) => void;
  bookmarkTags: Record<string, string[]>;
  onAddBookmarkTag: (url: string, tag: string) => void;
  onRemoveBookmarkTag: (url: string, tag: string) => void;
  sessionSnapshots?: Record<string, string>;
  onSaveSessionSnapshot?: (url: string, snapshot: string) => void;
  onLaunchAuthenticatedSession?: (url: string) => void | Promise<void>;
  onCaptureActiveScreen?: (url: string) => void | Promise<void>;
  onOpenDetailModal?: (item: TimelineItem) => void;
}

export const BrowserView: React.FC<BrowserViewProps> = ({
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onOpenCalendar,
  onImportClick,
  dateRange,
  onClearDateRange,
  onOpenDateRangePicker,
  processedData,
  dateIndexMap,
  onShowDomainProfile,
  selectedBrowserItem,
  onSelectBrowserItem,
  bookmarkNotes,
  onSaveBookmarkNote,
  bookmarkTags,
  onAddBookmarkTag,
  onRemoveBookmarkTag,
  sessionSnapshots = {},
  onSaveSessionSnapshot = (_url: string, _snapshot: string) => {},
  onLaunchAuthenticatedSession = (_url: string) => {},
  onCaptureActiveScreen = (_url: string) => {},
  onOpenDetailModal
}) => {
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewScope, setViewScope] = useState<'day' | 'all'>('all');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(false);

  // View Options state (persisted)
  const [viewOptions, setViewOptions] = useState<BrowserViewOptions>(() => {
    try {
      const saved = localStorage.getItem('mylife_browser_view_options');
      if (saved) {
        return { ...DEFAULT_VIEW_OPTIONS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_VIEW_OPTIONS;
  });

  const [cardLimit, setCardLimit] = useState<string>(() => {
    return localStorage.getItem('mylife_browser_card_limit') || '48';
  });

  const [gridDensity, setGridDensity] = useState<string>(() => {
    return localStorage.getItem('mylife_browser_grid_density') || 'auto';
  });

  // Save changes to localStorage
  const updateViewOption = <K extends keyof BrowserViewOptions>(key: K, value: BrowserViewOptions[K]) => {
    setViewOptions(prev => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem('mylife_browser_view_options', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleCardLimitChange = (limit: string) => {
    setCardLimit(limit);
    try {
      localStorage.setItem('mylife_browser_card_limit', limit);
    } catch {
      // ignore
    }
  };

  const handleGridDensityChange = (density: string) => {
    setGridDensity(density);
    try {
      localStorage.setItem('mylife_browser_grid_density', density);
    } catch {
      // ignore
    }
  };

  const resetViewOptions = () => {
    setViewOptions(DEFAULT_VIEW_OPTIONS);
    setCardLimit('48');
    setGridDensity('auto');
    try {
      localStorage.removeItem('mylife_browser_view_options');
      localStorage.removeItem('mylife_browser_card_limit');
      localStorage.removeItem('mylife_browser_grid_density');
    } catch {
      // ignore
    }
  };

  const handleItemClick = (item: TimelineItem) => {
    onSelectBrowserItem(item);
    setIsRightPanelOpen(true);
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const getDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const dayKey = getDateKey(currentDate);
  const dayItems = useMemo(() => {
    if (dateRange) {
      return processedData.filter(s => {
        if (s.type !== 'browser') return false;
        const k = s.ts.slice(0, 10);
        return k >= dateRange.startDate && k <= dateRange.endDate;
      });
    }
    return (dateIndexMap.get(dayKey) || []).filter(s => s.type === 'browser');
  }, [dateRange, processedData, dateIndexMap, dayKey]);

  const allBrowserItems = useMemo(() => {
    return processedData.filter(s => s.type === 'browser');
  }, [processedData]);

  const baseItems = viewScope === 'day' ? dayItems : allBrowserItems;

  const uniqueDomains = useMemo(() => {
    return Array.from(
      new Set(allBrowserItems.map(b => b.domain || extractDomain(b.url || '')).filter(Boolean))
    ).sort();
  }, [allBrowserItems]);

  // Frequency lookups for sorting
  const urlFrequencyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of allBrowserItems) {
      if (item.url) {
        map.set(item.url, (map.get(item.url) || 0) + 1);
      }
    }
    return map;
  }, [allBrowserItems]);

  const domainFrequencyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of allBrowserItems) {
      const dom = item.domain || extractDomain(item.url || '');
      if (dom) {
        map.set(dom, (map.get(dom) || 0) + 1);
      }
    }
    return map;
  }, [allBrowserItems]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return baseItems
      .filter(item => {
        const domain = item.domain || extractDomain(item.url || '');
        if (filterDomain !== 'all' && domain !== filterDomain) return false;

        // Filter Preset checks
        if (viewOptions.filterPreset === 'with_notes') {
          if (!item.url || !bookmarkNotes[item.url]?.trim()) return false;
        } else if (viewOptions.filterPreset === 'with_tags') {
          if (!item.url || !bookmarkTags[item.url]?.length) return false;
        } else if (viewOptions.filterPreset === 'with_snapshots') {
          if (!item.url || !sessionSnapshots[item.url]) return false;
        } else if (viewOptions.filterPreset === 'secure_only') {
          if (!item.url?.startsWith('https://')) return false;
        }

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (item.title || '').toLowerCase().includes(q);
          const matchUrl = (item.url || '').toLowerCase().includes(q);
          const noteText = item.url ? (bookmarkNotes[item.url] || '').toLowerCase() : '';
          const tags = item.url ? (bookmarkTags[item.url] || []).join(' ').toLowerCase() : '';
          if (!matchTitle && !matchUrl && !noteText.includes(q) && !tags.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (viewOptions.sortBy === 'newest') {
          return new Date(b.ts).getTime() - new Date(a.ts).getTime();
        }
        if (viewOptions.sortBy === 'oldest') {
          return new Date(a.ts).getTime() - new Date(b.ts).getTime();
        }
        if (viewOptions.sortBy === 'most_visited') {
          const countA = urlFrequencyMap.get(a.url || '') || 1;
          const countB = urlFrequencyMap.get(b.url || '') || 1;
          return countB - countA;
        }
        if (viewOptions.sortBy === 'domain_freq') {
          const domA = a.domain || extractDomain(a.url || '');
          const domB = b.domain || extractDomain(b.url || '');
          const countA = domainFrequencyMap.get(domA) || 1;
          const countB = domainFrequencyMap.get(domB) || 1;
          return countB - countA;
        }
        if (viewOptions.sortBy === 'title_asc') {
          return (a.title || '').localeCompare(b.title || '');
        }
        if (viewOptions.sortBy === 'domain_asc') {
          const domA = a.domain || extractDomain(a.url || '');
          const domB = b.domain || extractDomain(b.url || '');
          return domA.localeCompare(domB);
        }
        return new Date(b.ts).getTime() - new Date(a.ts).getTime();
      });
  }, [
    baseItems,
    filterDomain,
    searchQuery,
    viewOptions.filterPreset,
    viewOptions.sortBy,
    bookmarkNotes,
    bookmarkTags,
    sessionSnapshots,
    urlFrequencyMap,
    domainFrequencyMap
  ]);

  // Infinite chunked feed for 60fps scrolling & memory optimization
  const infiniteFeed = useInfiniteHistoricalFeed<TimelineItem>({
    items: filteredItems,
    chunkSize: cardLimit === 'all' ? 999999 : (parseInt(cardLimit, 10) || 48),
    initialCount: cardLimit === 'all' ? 999999 : (parseInt(cardLimit, 10) || 48),
    resetDependencies: [filterDomain, searchQuery, viewOptions.filterPreset, viewOptions.sortBy, cardLimit, viewScope]
  });

  // Lazily sliced items to keep DOM and memory lightweight
  const visibleItems = infiniteFeed.visibleItems;

  // Grouped items helper matching YouTube style
  const groupedSections = useMemo(() => {
    if (viewOptions.groupBy === 'none') {
      return [{ key: 'all', title: '', items: visibleItems }];
    }

    if (viewOptions.groupBy === 'time_of_day') {
      const groups: Record<string, TimelineItem[]> = {
        'Morning (05:00 - 12:00)': [],
        'Afternoon (12:00 - 17:00)': [],
        'Evening (17:00 - 22:00)': [],
        'Night (22:00 - 05:00)': []
      };
      visibleItems.forEach(item => {
        const d = item.dateObj || new Date(item.ts);
        const h = d.getHours();
        if (h >= 5 && h < 12) groups['Morning (05:00 - 12:00)'].push(item);
        else if (h >= 12 && h < 17) groups['Afternoon (12:00 - 17:00)'].push(item);
        else if (h >= 17 && h < 22) groups['Evening (17:00 - 22:00)'].push(item);
        else groups['Night (22:00 - 05:00)'].push(item);
      });
      return Object.entries(groups)
        .filter(([_, items]) => items.length > 0)
        .map(([title, items]) => ({ key: title, title, items }));
    }

    if (viewOptions.groupBy === 'domain') {
      const map = new Map<string, TimelineItem[]>();
      visibleItems.forEach(item => {
        const dom = item.domain || extractDomain(item.url || '') || 'other';
        if (!map.has(dom)) map.set(dom, []);
        map.get(dom)!.push(item);
      });
      return Array.from(map.entries()).map(([domain, items]) => ({
        key: domain,
        title: domain,
        items
      }));
    }

    return [{ key: 'all', title: '', items: visibleItems }];
  }, [visibleItems, viewOptions.groupBy]);

  // Dynamic grid density columns class matching YouTubeView
  const getGridColsClass = () => {
    if (gridDensity === '2') return 'grid-cols-1 sm:grid-cols-2';
    if (gridDensity === '3') return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    if (gridDensity === '4') return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    if (gridDensity === '5') return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
    if (gridDensity === '6') return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
    // Auto density
    return isRightPanelOpen
      ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5';
  };

  // Reset scroll position when search filters, domains or layout mode change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [filterDomain, searchQuery, viewScope, viewOptions.filterPreset, viewOptions.sortBy, viewOptions.layoutMode]);

  const activeItem = selectedBrowserItem;

  // Render individual browser card
  const renderBrowserCard = (item: TimelineItem) => {
    const isSelected = activeItem?.id === item.id;
    const url = item.url || '';
    const visitCount = urlFrequencyMap.get(url) || 1;
    const userNote = bookmarkNotes[url] || '';
    const userTags = bookmarkTags[url] || [];
    const customSnapshot = sessionSnapshots[url] || '';

    return (
      <BrowserCard
        key={item.id}
        item={item}
        isSelected={isSelected}
        layoutMode={viewOptions.layoutMode}
        viewScope={viewScope}
        displayOptions={{
          showFavicon: viewOptions.showFavicon,
          showDomainBadge: viewOptions.showDomainBadge,
          showTimestamp: viewOptions.showTimestamp,
          showSnapshotBadge: viewOptions.showSnapshotBadge,
          showVisitCountBadge: viewOptions.showVisitCountBadge,
          showActionButtons: viewOptions.showActionButtons
        }}
        visitCount={visitCount}
        userNote={userNote}
        userTags={userTags}
        customSnapshot={customSnapshot}
        onSelect={handleItemClick}
        onShowDomainProfile={onShowDomainProfile}
        onTagClick={(tag) => setSearchQuery(tag)}
        onFaviconClick={(it) => {
          openFaviconFor({
            title: it.title,
            domain: it.domain || extractDomain(it.url || ''),
            url: it.url,
            description: it.description || userNote || `Favicon and domain details for ${it.domain || 'this website'}. Click 'Visit Site' to open in a new tab.`,
            category: it.platform || 'Browser History'
          });
        }}
      />
    );
  };

  if (allBrowserItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-transparent">
        <div className="p-4 rounded-3xl bg-sky-500/15 border border-sky-500/30 text-sky-500 mb-4 shadow-lg animate-pulse">
          <Globe className="w-12 h-12" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight">
          No Browsing History Loaded
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-6 leading-relaxed">
          Import your Chrome or browser history from Google Takeout to analyze your visited websites, domains, and timeline.
        </p>
        {onImportClick && (
          <button aria-label="Action"
            onClick={onImportClick}
            className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Upload className="w-4 h-4" /> Import Browsing History
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-transparent overflow-hidden min-h-0 relative">
      {/* Top ViewToolbar matching YouTube style */}
      <ViewToolbar
        badge={
          <span className="font-['Space_Mono',monospace] text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1a1a1a] dark:bg-stone-200 text-[#fdfcf9] dark:text-[#1a1a1a]">
            {filteredItems.length} visits
          </span>
        }
        currentDate={currentDate}
        onPrevDate={onPrevDate}
        onNextDate={onNextDate}
        onSetToday={onSetToday}
        onOpenCalendar={onOpenCalendar}
        showDateNavigation={viewScope === 'day'}
        dateRange={viewScope === 'day' ? dateRange : null}
        onClearDateRange={onClearDateRange}
        onOpenDateRangePicker={onOpenDateRangePicker}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search visited URLs and titles..."
        searchResultsCount={searchQuery ? filteredItems.length : undefined}
        onImportClick={onImportClick}
        importLabel="Import"
        leftActions={
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Scope Switcher: Day vs All */}
            <div className="flex bg-[#1a1a1a]/5 dark:bg-white/5 p-0.5 rounded-md border border-[#1a1a1a]/10 dark:border-white/10 text-xs">
              <button aria-label="Action"
                onClick={() => setViewScope('day')}
                className={`px-2 py-0.5 font-medium rounded transition-all cursor-pointer ${
                  viewScope === 'day'
                    ? 'bg-white dark:bg-[#18181b] shadow-2xs text-sky-600 dark:text-sky-300 font-semibold'
                    : 'text-[#71717a] hover:text-[#1a1a1a] dark:hover:text-stone-200'
                }`}
              >
                Day
              </button>
              <button aria-label="Action"
                onClick={() => setViewScope('all')}
                className={`px-2 py-0.5 font-medium rounded transition-all cursor-pointer ${
                  viewScope === 'all'
                    ? 'bg-white dark:bg-[#18181b] shadow-2xs text-sky-600 dark:text-sky-300 font-semibold'
                    : 'text-[#71717a] hover:text-[#1a1a1a] dark:hover:text-stone-200'
                }`}
              >
                All
              </button>
            </div>
          </div>
        }
        rightActions={
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Consolidated BrowserViewMenu matching YouTubeViewMenu */}
            <BrowserViewMenu
              activeMode={viewOptions.layoutMode}
              onChangeMode={(mode) => updateViewOption('layoutMode', mode)}
              cardLimit={cardLimit}
              onChangeCardLimit={handleCardLimitChange}
              gridDensity={gridDensity}
              onChangeGridDensity={handleGridDensityChange}
              totalFilteredCount={filteredItems.length}
              displayOptions={{
                showFavicon: viewOptions.showFavicon,
                showDomainBadge: viewOptions.showDomainBadge,
                showTimestamp: viewOptions.showTimestamp,
                showSnapshotBadge: viewOptions.showSnapshotBadge,
                showVisitCountBadge: viewOptions.showVisitCountBadge,
                showActionButtons: viewOptions.showActionButtons
              }}
              onToggleDisplayOption={(key) => updateViewOption(key, !viewOptions[key])}
              groupBy={viewOptions.groupBy}
              onChangeGroupBy={(group) => updateViewOption('groupBy', group)}
              sortBy={viewOptions.sortBy}
              onChangeSortBy={(sort) => updateViewOption('sortBy', sort)}
              onResetDefaults={resetViewOptions}
            />

            {/* Sort Menu Button right beside View button */}
            <BrowserSortMenu
              sortBy={viewOptions.sortBy}
              onChangeSortBy={(sort) => updateViewOption('sortBy', sort)}
            />

            {/* Right Panel Toggle Button */}
            <button aria-label="Action"
              onClick={() => {
                if (isRightPanelOpen) {
                  setIsRightPanelOpen(false);
                } else {
                  if (!selectedBrowserItem && filteredItems.length > 0) {
                    onSelectBrowserItem(filteredItems[0]);
                  }
                  setIsRightPanelOpen(true);
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isRightPanelOpen
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                  : 'bg-white dark:bg-[#18181b] text-gray-700 dark:text-gray-300 border-gray-200/90 dark:border-white/10 hover:text-black dark:hover:text-white'
              }`}
              title={isRightPanelOpen ? 'Hide Inspect Panel' : 'Open Inspect Panel'}
            >
              <BarChart2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span className="hidden sm:inline">{isRightPanelOpen ? 'Hide Panel' : 'Panel'}</span>
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-2.5">
          {/* Domain Filter Dropdown */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs shadow-2xs">
            <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="bg-transparent text-gray-700 dark:text-gray-300 font-semibold outline-none cursor-pointer text-xs max-w-[130px] sm:max-w-[170px] truncate"
              title="Filter by Domain"
            >
              <option value="all">All Domains ({uniqueDomains.length})</option>
              {uniqueDomains.map(dom => (
                <option key={dom} value={dom}>
                  {dom}
                </option>
              ))}
            </select>
            {filterDomain !== 'all' && (
              <button aria-label="Action"
                onClick={() => setFilterDomain('all')}
                className="text-sky-500 hover:text-sky-700 font-bold px-1 rounded-md hover:bg-sky-500/10 cursor-pointer"
                title="Clear domain filter"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Preset */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <select
              value={viewOptions.filterPreset}
              onChange={(e) => updateViewOption('filterPreset', e.target.value as BrowserFilterPreset)}
              className="bg-transparent text-gray-700 dark:text-gray-300 font-semibold outline-none cursor-pointer text-xs"
              title="Filter Presets"
            >
              <option value="all">All Visits</option>
              <option value="with_notes">With Notes</option>
              <option value="with_tags">Tagged Items</option>
              <option value="with_snapshots">With Snapshots</option>
              <option value="secure_only">HTTPS Only</option>
            </select>
          </div>
        </div>
      </ViewToolbar>

      {/* Main Content: Split History List and Right Inspector Sidepanel (Matching YouTube View) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-transparent">
        {/* Left Column: Visits List with Virtualized Cards & Table */}
        <div
          id="browser-visits-panel"
          className={`flex flex-col min-h-0 overflow-hidden transition-all ${
            isRightPanelOpen
              ? 'w-full lg:w-3/5 xl:w-7/12 border-b lg:border-b-0 lg:border-r border-black/8 dark:border-white/10'
              : 'w-full'
          }`}
        >
          {/* Scrollable Subview Contents (Ref attached to actual scrolling element for 60fps virtualization) */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-4"
          >
            {filteredItems.length === 0 ? (
              <div
                id="browser-empty-state"
                className="flex flex-col items-center justify-center h-full min-h-[360px] py-16 px-6 text-center text-gray-500 dark:text-gray-400 space-y-3"
              >
                <Globe className="w-10 h-10 opacity-30 text-sky-500 mx-auto" />
                <p className="text-sm font-semibold">
                  {searchQuery
                    ? `No visits match "${searchQuery}".`
                    : 'No browsing records match the current filters.'}
                </p>
              </div>
            ) : viewOptions.layoutMode === 'table' ? (
              /* Virtualized Table Layout: Smooth 60fps scrolling with sticky header */
              <div className="bg-white/60 dark:bg-black/35 backdrop-blur-md rounded-2xl border border-sky-500/20 overflow-hidden shadow-2xs">
                <VirtualizedTable<TimelineItem>
                  containerRef={scrollContainerRef}
                  items={visibleItems}
                  colSpan={5}
                  estimateRowHeight={44}
                  hasMore={infiniteFeed.hasMore}
                  isLoadingMore={infiniteFeed.isLoadingMore}
                  onLoadMore={infiniteFeed.loadNextChunk}
                  themeColor="sky"
                  renderHeader={() => (
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-black/5 dark:bg-white/5 font-semibold text-gray-600 dark:text-gray-300">
                      {viewOptions.showTimestamp && <th className="px-3.5 py-2.5">Time</th>}
                      {viewOptions.showDomainBadge && <th className="px-3.5 py-2.5">Domain</th>}
                      <th className="px-3.5 py-2.5">Page Title & URL</th>
                      {viewOptions.showVisitCountBadge && <th className="px-3.5 py-2.5 text-center">Visits</th>}
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  )}
                  renderRow={(item) => {
                    const isSelected = activeItem?.id === item.id;
                    const domain = item.domain || extractDomain(item.url || '');
                    const favicon =
                      item.favicon_url ||
                      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
                    const timeStr = item.dateObj ? formatTime(item.dateObj) : '';
                    const dateStr = item.dateObj ? item.dateObj.toLocaleDateString() : '';
                    const visitCount = urlFrequencyMap.get(item.url || '') || 1;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-sky-500/10 dark:bg-sky-500/20 font-medium text-sky-900 dark:text-sky-100'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {viewOptions.showTimestamp && (
                          <td className="px-3.5 py-2 text-[11px] font-mono text-gray-400 whitespace-nowrap">
                            {timeStr} {viewScope === 'all' && `(${dateStr})`}
                          </td>
                        )}
                        {viewOptions.showDomainBadge && (
                          <td className="px-3.5 py-2 whitespace-nowrap">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                onShowDomainProfile(domain);
                              }}
                              className="font-semibold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              {viewOptions.showFavicon && (
                                <img
                                  src={favicon}
                                  alt=""
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openFaviconFor({
                                      title: item.title,
                                      domain,
                                      url: item.url,
                                      description: item.description || bookmarkNotes[item.url || ''] || `Favicon and domain asset for ${domain}. Click 'Visit Site' to open this page.`,
                                      category: item.platform || 'Browser History'
                                    });
                                  }}
                                  className="w-3.5 h-3.5 rounded object-contain cursor-pointer hover:scale-125 transition-transform"
                                  title="Click to enlarge favicon & view description"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              )}
                              {domain}
                            </span>
                          </td>
                        )}
                        <td className="px-3.5 py-2 min-w-[220px] max-w-sm">
                          <div className="font-bold text-gray-900 dark:text-white truncate" title={item.title}>
                            {item.title}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono truncate">
                            {item.url}
                          </div>
                        </td>
                        {viewOptions.showVisitCountBadge && (
                          <td className="px-3.5 py-2 text-center whitespace-nowrap">
                            {visitCount > 1 ? (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono">
                                {visitCount}x
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-mono">1</span>
                            )}
                          </td>
                        )}
                        <td className="px-3.5 py-2 text-right whitespace-nowrap">
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-gray-400 hover:text-sky-500 inline-block transition-colors cursor-pointer"
                              title="Open Link Directly"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  }}
                />
              </div>
            ) : (
              /* Virtualized Grid/Cards/Feed/Compact: only visible cards are mounted in DOM */
              <VirtualizedFeed<TimelineItem>
                containerRef={scrollContainerRef}
                groups={groupedSections}
                layoutMode={viewOptions.layoutMode}
                gridDensity={gridDensity}
                isRightPanelOpen={isRightPanelOpen}
                renderItem={(item) => renderBrowserCard(item)}
                hasMore={infiniteFeed.hasMore}
                isLoadingMore={infiniteFeed.isLoadingMore}
                onLoadMore={infiniteFeed.loadNextChunk}
                themeColor="sky"
                renderHeader={(title, count) => (
                  <div className="flex items-center gap-2 pt-1 pb-0.5">
                    <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      {title}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono">
                      {count}
                    </span>
                  </div>
                )}
              />
            )}

            {/* Record Counter */}
            {filteredItems.length > 0 && (
              <div className="py-3 px-4 text-center border-t border-black/5 dark:border-white/5 text-[11px] text-gray-500 dark:text-gray-400 font-mono flex items-center justify-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500" />
                <span>
                  {`${filteredItems.length.toLocaleString()} browsing records`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Docked Link Preview & Deep Metadata Inspector sidepanel matching YouTube */}
        {isRightPanelOpen && activeItem && (
          <div className="w-full lg:w-2/5 xl:w-5/12 flex flex-col min-h-0 overflow-hidden bg-white/40 dark:bg-black/20 backdrop-blur-xl border-t lg:border-t-0 border-black/8 dark:border-white/10">
            <BrowserInspectorPanel
              item={activeItem}
              allBrowserItems={allBrowserItems}
              notes={bookmarkNotes[activeItem.url || ''] || ''}
              tags={bookmarkTags[activeItem.url || ''] || []}
              snapshot={sessionSnapshots[activeItem.url || ''] || ''}
              onClose={() => {
                setIsRightPanelOpen(false);
                onSelectBrowserItem(null);
              }}
              onSaveNote={onSaveBookmarkNote}
              onAddTag={onAddBookmarkTag}
              onRemoveTag={onRemoveBookmarkTag}
              onShowDomainProfile={onShowDomainProfile}
              onLaunchAuthenticatedSession={onLaunchAuthenticatedSession}
              onCaptureActiveScreen={onCaptureActiveScreen}
              onSaveSessionSnapshot={onSaveSessionSnapshot}
              onOpenDetailModal={onOpenDetailModal}
            />
          </div>
        )}
      </div>
    </div>
  );
};
