import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Youtube,
  Layout,
  List,
  Calendar as CalendarIcon,
  Table,
  Upload,
  BarChart2,
  ExternalLink,
  SlidersHorizontal,
  Clock,
  Play,
  Eye,
  Copy,
  Check,
  FileCode,
  Tag,
  StickyNote,
  Tv,
  Sparkles,
  TrendingUp,
  X,
  Maximize2,
  Filter,
  ArrowUpDown,
  Grid,
  Layers,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Coffee,
  Sunset
} from 'lucide-react';
import { YouTubeViewMenu, YouTubeCombinedMode } from './youtube/YouTubeViewMenu';
import { SubViewType, TimelineItem, DateRange } from '../../types';
import { TimelineCard } from '../TimelineCard';
import { ViewToolbar } from '../ViewToolbar';
import { formatDuration, formatTime } from '../../utils/dataParser';
import { VirtualizedFeed } from '../virtual/VirtualizedFeed';
import { VirtualizedTable } from '../virtual/VirtualizedTable';
import { useInfiniteHistoricalFeed } from '../../utils/useInfiniteHistoricalFeed';

interface YouTubeViewProps {
  currentDate: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onOpenCalendar?: () => void;
  onJumpToDate: (date: Date) => void;
  dateRange?: DateRange | null;
  onClearDateRange?: () => void;
  onOpenDateRangePicker?: () => void;
  processedData: TimelineItem[];
  dateIndexMap: Map<string, TimelineItem[]>;
  onShowVideoProfile: (title: string, channel?: string) => void;
  onShowChannelProfile: (channel: string) => void;
  onImportClick: () => void;
}

export type LayoutMode = 'feed' | 'grid' | 'compact' | 'detailed';
export type SortOption = 'newest' | 'oldest' | 'most_watched' | 'title_asc' | 'channel_asc';
export type GroupOption = 'none' | 'time_of_day' | 'channel';
export type FilterPreset = 'all' | 'repeated' | 'playable';

interface GranularViewOptions {
  layoutMode: LayoutMode;
  density: 'comfortable' | 'compact' | 'spacious';
  sortBy: SortOption;
  groupBy: GroupOption;
  filterPreset: FilterPreset;
  showThumbnails: boolean;
  showChannelBadge: boolean;
  showTimestamp: boolean;
  showActionButtons: boolean;
  showWatchCountBadge: boolean;
  showDuration: boolean;
}

const DEFAULT_VIEW_OPTIONS: GranularViewOptions = {
  layoutMode: 'feed',
  density: 'comfortable',
  sortBy: 'newest',
  groupBy: 'none',
  filterPreset: 'all',
  showThumbnails: true,
  showChannelBadge: true,
  showTimestamp: true,
  showActionButtons: true,
  showWatchCountBadge: true,
  showDuration: true
};

export const YouTubeView: React.FC<YouTubeViewProps> = ({
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onOpenCalendar,
  onJumpToDate,
  dateRange,
  onClearDateRange,
  onOpenDateRangePicker,
  processedData,
  dateIndexMap,
  onShowVideoProfile,
  onShowChannelProfile,
  onImportClick
}) => {
  const [subView, setSubView] = useState<SubViewType>('day');
  const [viewScope, setViewScope] = useState<'day' | 'all'>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Lazy loading / progressive rendering for full history
  const [visibleCount, setVisibleCount] = useState<number>(50);
  const observerTarget = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Right side panel state
  const [selectedVideoItem, setSelectedVideoItem] = useState<TimelineItem | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);
  const [activePanelTab, setActivePanelTab] = useState<'analytics' | 'player' | 'channel' | 'notes'>('analytics');
  
  // Card limit & grid density controls matching Bookmarks view style
  const [cardLimit, setCardLimit] = useState<string>('48');
  const [gridDensity, setGridDensity] = useState<string>('auto');

  const getGridColsClass = () => {
    if (gridDensity === '2') return 'grid-cols-1 sm:grid-cols-2';
    if (gridDensity === '3') return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    if (gridDensity === '4') return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    if (gridDensity === '5') return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
    if (gridDensity === '6') return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  };

  const [viewOptions, setViewOptions] = useState<GranularViewOptions>(() => {
    try {
      const saved = localStorage.getItem('mylife_yt_view_options');
      return saved ? { ...DEFAULT_VIEW_OPTIONS, ...JSON.parse(saved) } : DEFAULT_VIEW_OPTIONS;
    } catch {
      return DEFAULT_VIEW_OPTIONS;
    }
  });

  // Notes & Tags for video
  const [videoNotes, setVideoNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('mylife_yt_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [videoTags, setVideoTags] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('mylife_yt_tags');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [tagInput, setTagInput] = useState('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copyMdFeedback, setCopyMdFeedback] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    // Clear any pending dismissal so a fast second toast isn't cut short by
    // the first toast's timer.
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const updateViewOption = <K extends keyof GranularViewOptions>(key: K, val: GranularViewOptions[K]) => {
    setViewOptions(prev => {
      const next = { ...prev, [key]: val };
      try {
        localStorage.setItem('mylife_yt_view_options', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const resetViewOptions = () => {
    setViewOptions(DEFAULT_VIEW_OPTIONS);
    try {
      localStorage.setItem('mylife_yt_view_options', JSON.stringify(DEFAULT_VIEW_OPTIONS));
    } catch {
      // ignore
    }
    showToast('Reset view options to default');
  };

  const activeCombinedMode: YouTubeCombinedMode = useMemo(() => {
    if (subView === 'week') return 'week';
    if (subView === 'month') return 'month';
    if (subView === 'log') return 'table';
    if (viewOptions.layoutMode === 'grid') return 'grid';
    if (viewOptions.layoutMode === 'compact') return 'compact';
    return 'feed';
  }, [subView, viewOptions.layoutMode]);

  const handleCombinedModeChange = (mode: YouTubeCombinedMode) => {
    if (mode === 'week') {
      setSubView('week');
    } else if (mode === 'month') {
      setSubView('month');
    } else if (mode === 'table') {
      setSubView('log');
    } else {
      setSubView('day');
      updateViewOption('layoutMode', mode);
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const ytItemsAll = useMemo(() => processedData.filter(s => s.type === 'youtube'), [processedData]);

  const getDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Video watch count map across full dataset
  const videoGlobalCounts = useMemo(() => {
    const counts = new Map<string, number>();
    ytItemsAll.forEach(item => {
      const k = item.title;
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return counts;
  }, [ytItemsAll]);

  // Channel video count map
  const channelGlobalStats = useMemo(() => {
    const counts = new Map<string, { total: number; uniqueVideos: Set<string>; items: TimelineItem[] }>();
    ytItemsAll.forEach(item => {
      const ch = item.subtitle || 'Unknown Channel';
      const existing = counts.get(ch) || { total: 0, uniqueVideos: new Set<string>(), items: [] };
      existing.total += 1;
      existing.uniqueVideos.add(item.title);
      existing.items.push(item);
      counts.set(ch, existing);
    });
    return counts;
  }, [ytItemsAll]);

  // All unique channels
  const allChannels = useMemo(() => {
    return Array.from(
      new Set(ytItemsAll.map(d => d.subtitle).filter(Boolean))
    ).sort();
  }, [ytItemsAll]);

  // 1. Day / Range Items
  const dayKey = getDateKey(currentDate);
  const rawDayVideos = useMemo(() => {
    if (dateRange) {
      return processedData.filter(s => {
        if (s.type !== 'youtube') return false;
        const k = s.ts.slice(0, 10);
        return k >= dateRange.startDate && k <= dateRange.endDate;
      });
    }
    return (dateIndexMap.get(dayKey) || []).filter(s => s.type === 'youtube');
  }, [dateRange, processedData, dateIndexMap, dayKey]);

  // Active dataset according to viewScope (day vs all history)
  const baseVideos = viewScope === 'day' ? rawDayVideos : ytItemsAll;

  // Filtered & Sorted items for the left panel
  const displayVideos = useMemo(() => {
    let list = baseVideos.filter(item => {
      if (filterChannel !== 'all' && item.subtitle !== filterChannel) return false;
      if (q) {
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchChannel = (item.subtitle || '').toLowerCase().includes(q);
        const tags = videoTags[item.title] || [];
        const matchTags = tags.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchChannel && !matchTags) return false;
      }
      if (viewOptions.filterPreset === 'repeated') {
        const c = videoGlobalCounts.get(item.title) || 0;
        if (c <= 1) return false;
      }
      if (viewOptions.filterPreset === 'playable') {
        if (!item.youtube_video_id) return false;
      }
      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (viewOptions.sortBy === 'newest') {
        return new Date(b.ts).getTime() - new Date(a.ts).getTime();
      }
      if (viewOptions.sortBy === 'oldest') {
        return new Date(a.ts).getTime() - new Date(b.ts).getTime();
      }
      if (viewOptions.sortBy === 'most_watched') {
        const countA = videoGlobalCounts.get(a.title) || 0;
        const countB = videoGlobalCounts.get(b.title) || 0;
        return countB - countA;
      }
      if (viewOptions.sortBy === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (viewOptions.sortBy === 'channel_asc') {
        return (a.subtitle || '').localeCompare(b.subtitle || '');
      }
      return 0;
    });

    return list;
  }, [baseVideos, filterChannel, q, viewOptions.filterPreset, viewOptions.sortBy, videoGlobalCounts, videoTags]);

  // Infinite chunked feed for 60fps scrolling & memory efficiency
  const infiniteFeed = useInfiniteHistoricalFeed<TimelineItem>({
    items: displayVideos,
    chunkSize: 60,
    initialCount: 60,
    resetDependencies: [filterChannel, q, viewOptions.filterPreset, viewOptions.sortBy, viewScope]
  });

  // Lazily sliced videos to keep DOM and memory lightweight
  const visibleVideos = infiniteFeed.visibleItems;

  // Grouped items helper
  const groupedSections = useMemo(() => {
    if (viewOptions.groupBy === 'none') {
      return [{ key: 'all', title: '', items: visibleVideos }];
    }

    if (viewOptions.groupBy === 'time_of_day') {
      const groups: Record<string, TimelineItem[]> = {
        'Morning (05:00 - 12:00)': [],
        'Afternoon (12:00 - 17:00)': [],
        'Evening (17:00 - 22:00)': [],
        'Night (22:00 - 05:00)': []
      };
      visibleVideos.forEach(item => {
        const h = new Date(item.ts).getHours();
        if (h >= 5 && h < 12) groups['Morning (05:00 - 12:00)'].push(item);
        else if (h >= 12 && h < 17) groups['Afternoon (12:00 - 17:00)'].push(item);
        else if (h >= 17 && h < 22) groups['Evening (17:00 - 22:00)'].push(item);
        else groups['Night (22:00 - 05:00)'].push(item);
      });
      return Object.entries(groups)
        .filter(([_, items]) => items.length > 0)
        .map(([title, items]) => ({ key: title, title, items }));
    }

    if (viewOptions.groupBy === 'channel') {
      const groups: Record<string, TimelineItem[]> = {};
      visibleVideos.forEach(item => {
        const ch = item.subtitle || 'Unknown Channel';
        if (!groups[ch]) groups[ch] = [];
        groups[ch].push(item);
      });
      return Object.entries(groups).map(([title, items]) => ({ key: title, title, items }));
    }

    return [{ key: 'all', title: '', items: visibleVideos }];
  }, [visibleVideos, viewOptions.groupBy]);

  // Select active item (default to selected item or first available)
  const activeVideo = useMemo(() => {
    if (selectedVideoItem) {
      // Find matching or keep
      return selectedVideoItem;
    }
    if (displayVideos.length > 0) {
      return displayVideos[0];
    }
    if (ytItemsAll.length > 0) {
      return ytItemsAll[0];
    }
    return null;
  }, [selectedVideoItem, displayVideos, ytItemsAll]);

  // Handle card selection
  const handleSelectCard = (item: TimelineItem) => {
    setSelectedVideoItem(item);
    setIsRightPanelOpen(true);
  };

  // Compute analytics for active video
  const activeVideoAnalytics = useMemo(() => {
    if (!activeVideo) return null;
    const title = activeVideo.title;
    const channel = activeVideo.subtitle || 'Unknown Channel';
    const videoId = activeVideo.youtube_video_id;

    // All instances of this video in dataset
    const instances = ytItemsAll
      .filter(item => item.title === title)
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    const totalViews = instances.length;
    const dates = instances.map(d => new Date(d.ts).getTime()).filter(t => !isNaN(t));
    const firstWatchedDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const lastWatchedDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;

    // Time-of-day distribution for this video
    const hourBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    instances.forEach(item => {
      const h = new Date(item.ts).getHours();
      if (h >= 5 && h < 12) hourBuckets.morning += 1;
      else if (h >= 12 && h < 17) hourBuckets.afternoon += 1;
      else if (h >= 17 && h < 22) hourBuckets.evening += 1;
      else hourBuckets.night += 1;
    });

    // Day of week distribution
    const dayBuckets = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
    instances.forEach(item => {
      const day = new Date(item.ts).getDay();
      dayBuckets[day] += 1;
    });

    // Channel stats
    const channelData = channelGlobalStats.get(channel);
    const channelTotalViews = channelData ? channelData.total : 0;
    const channelUniqueCount = channelData ? channelData.uniqueVideos.size : 0;
    const channelOtherVideos = channelData
      ? Array.from(channelData.uniqueVideos)
          .filter(t => t !== title)
          .slice(0, 6)
      : [];

    // All videos on channel sorted by views
    const channelTopVideosMap = new Map<string, number>();
    channelData?.items.forEach(item => {
      channelTopVideosMap.set(item.title, (channelTopVideosMap.get(item.title) || 0) + 1);
    });
    const channelTopVideos = Array.from(channelTopVideosMap.entries())
      .sort((a, b) => b[1] - a[1]);

    const videoUrl = activeVideo.titleUrl || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');
    const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
    const maxResThumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';

    return {
      title,
      channel,
      videoId,
      instances,
      totalViews,
      firstWatchedDate,
      lastWatchedDate,
      hourBuckets,
      dayBuckets,
      channelTotalViews,
      channelUniqueCount,
      channelOtherVideos,
      channelTopVideos,
      videoUrl,
      thumbUrl,
      maxResThumbUrl,
      percentageOfAll: ((totalViews / (ytItemsAll.length || 1)) * 100).toFixed(1)
    };
  }, [activeVideo, ytItemsAll, channelGlobalStats]);

  // Notes & Tags operations
  const activeVideoKey = activeVideo?.title || '';
  const activeNote = videoNotes[activeVideoKey] || '';
  const activeTags = videoTags[activeVideoKey] || [];

  const handleSaveNote = (noteText: string) => {
    if (!activeVideoKey) return;
    const next = { ...videoNotes, [activeVideoKey]: noteText };
    setVideoNotes(next);
    try {
      localStorage.setItem('mylife_yt_notes', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const t = tagInput.trim().replace(/^#/, '');
    if (!t || !activeVideoKey) return;
    const existing = videoTags[activeVideoKey] || [];
    if (existing.includes(t)) return;
    const next = { ...videoTags, [activeVideoKey]: [...existing, t] };
    setVideoTags(next);
    try {
      localStorage.setItem('mylife_yt_tags', JSON.stringify(next));
    } catch {
      // ignore
    }
    setTagInput('');
    showToast(`Tag #${t} added`);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeVideoKey) return;
    const existing = videoTags[activeVideoKey] || [];
    const next = { ...videoTags, [activeVideoKey]: existing.filter(t => t !== tagToRemove) };
    setVideoTags(next);
    try {
      localStorage.setItem('mylife_yt_tags', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleCopyUrl = () => {
    if (!activeVideoAnalytics?.videoUrl) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(activeVideoAnalytics.videoUrl).then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
        showToast('YouTube link copied to clipboard');
      }).catch(() => {
        showToast('Could not copy — clipboard access was blocked');
      });
    } else {
      showToast('Clipboard is not available in this browser');
    }
  };

  const handleCopyMarkdown = () => {
    if (!activeVideoAnalytics) return;
    const md = `[${activeVideoAnalytics.title}](${activeVideoAnalytics.videoUrl})`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md).then(() => {
        setCopyMdFeedback(true);
        setTimeout(() => setCopyMdFeedback(false), 2000);
        showToast('Markdown link copied to clipboard');
      }).catch(() => {
        showToast('Could not copy — clipboard access was blocked');
      });
    } else {
      showToast('Clipboard is not available in this browser');
    }
  };

  const subNavButtons = (
    <div className="flex bg-[#1a1a1a]/5 dark:bg-white/5 p-0.5 sm:p-1 rounded-xl border border-red-500/20">
      <button aria-label="Action"
        onClick={() => setSubView('day')}
        className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
          subView === 'day'
            ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 shadow-2xs font-bold'
            : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-300'
        }`}
      >
        <Layout className="w-3 h-3" /> <span className="hidden sm:inline">Feed</span>
      </button>
      <button aria-label="Action"
        onClick={() => setSubView('week')}
        className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
          subView === 'week'
            ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 shadow-2xs font-bold'
            : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-300'
        }`}
      >
        <List className="w-3 h-3" /> <span className="hidden sm:inline">Week</span>
      </button>
      <button aria-label="Action"
        onClick={() => setSubView('month')}
        className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
          subView === 'month'
            ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 shadow-2xs font-bold'
            : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-300'
        }`}
      >
        <CalendarIcon className="w-3 h-3" /> <span className="hidden sm:inline">Month</span>
      </button>
      <button aria-label="Action"
        onClick={() => setSubView('log')}
        className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
          subView === 'log'
            ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 shadow-2xs font-bold'
            : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-300'
        }`}
      >
        <Table className="w-3 h-3" /> <span className="hidden sm:inline">Log</span>
      </button>
    </div>
  );

  if (ytItemsAll.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/20 dark:bg-black/25 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-red-500/25 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="p-4 rounded-3xl bg-red-500/15 border border-red-500/30 text-red-500 mb-4 shadow-lg animate-pulse">
          <Youtube className="w-12 h-12" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight">
          No YouTube History Loaded
        </h3>
        <p className="text-xs text-gray-300 dark:text-gray-300 max-w-sm mb-6 leading-relaxed">
          Import your YouTube watch history from Google Takeout to view video streams, channels, and statistics.
        </p>
        <button aria-label="Action"
          onClick={onImportClick}
          className="bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Upload className="w-4 h-4" /> Import YouTube History
        </button>
      </div>
    );
  }

  // Helper for rendering customized video card in granular modes
  const renderCustomVideoCard = (item: TimelineItem) => {
    const isSelected = activeVideo?.id === item.id || activeVideo?.title === item.title;
    const videoId = item.youtube_video_id;
    const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
    const timeStr = item.dateObj ? formatTime(item.dateObj) : '';
    const dateStr = item.dateObj ? item.dateObj.toLocaleDateString() : '';
    const globalCount = videoGlobalCounts.get(item.title) || 1;
    const tags = videoTags[item.title] || [];

    // Compact layout mode
    if (viewOptions.layoutMode === 'compact') {
      return (
        <div
          key={item.id}
          onClick={() => handleSelectCard(item)}
          className={`flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
            isSelected
              ? 'bg-red-500/10 dark:bg-red-500/15 border-red-500/50 shadow-xs'
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-900/40 border-b-gray-100 dark:border-b-gray-800/40'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {viewOptions.showThumbnails && (
              thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt={item.title}
                  className="w-12 h-8 rounded-lg object-cover bg-black shrink-0 border border-gray-100 dark:border-gray-800"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-12 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                  <Youtube className="w-4 h-4" />
                </div>
              )
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate hover:text-red-500 transition-colors" title={item.title}>
                {item.title}
              </h4>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                {viewOptions.showChannelBadge && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowChannelProfile(item.subtitle);
                    }}
                    className="truncate max-w-[140px] font-medium text-red-500 hover:underline cursor-pointer"
                  >
                    {item.subtitle}
                  </span>
                )}
                {viewOptions.showTimestamp && (
                  <span className="font-mono text-gray-400">{timeStr}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {viewOptions.showWatchCountBadge && globalCount > 1 && (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 font-mono">
                {globalCount}x
              </span>
            )}
            {item.titleUrl && (
              <a
                href={item.titleUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                title="Open on YouTube"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      );
    }

    // Grid layout mode
    if (viewOptions.layoutMode === 'grid') {
      return (
        <div
          key={item.id}
          onClick={() => handleSelectCard(item)}
          className={`flex flex-col bg-white/60 dark:bg-black/35 backdrop-blur-md rounded-2xl overflow-hidden cursor-pointer transition-all border ${
            isSelected
              ? 'border-red-500 ring-2 ring-red-500/30 bg-red-500/10 dark:bg-red-500/20 shadow-sm'
              : 'border-white/20 dark:border-white/10 hover:border-red-500/40 hover:shadow-xs'
          } ${viewOptions.density === 'compact' ? 'p-2.5' : viewOptions.density === 'spacious' ? 'p-4' : 'p-3'}`}
        >
          {viewOptions.showThumbnails && (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-2.5 shrink-0 border border-gray-100 dark:border-gray-800">
              {thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-red-500/10 text-red-500">
                  <Youtube className="w-8 h-8" />
                </div>
              )}
              {viewOptions.showWatchCountBadge && globalCount > 1 && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-bold text-white font-mono border border-white/10">
                  {globalCount} views
                </div>
              )}
            </div>
          )}

          <div className="flex-1 flex flex-col justify-between space-y-2">
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug hover:text-red-500 transition-colors" title={item.title}>
                {item.title}
              </h4>
              {viewOptions.showChannelBadge && (
                <p
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowChannelProfile(item.subtitle);
                  }}
                  className="text-[11px] font-semibold text-red-500 truncate mt-1 hover:underline cursor-pointer"
                >
                  {item.subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800/80 text-[10px] text-gray-400 font-mono">
              {viewOptions.showTimestamp && (
                <span>{timeStr} {viewScope === 'all' && `• ${dateStr}`}</span>
              )}
              {viewOptions.showActionButtons && item.titleUrl && (
                <a
                  href={item.titleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Open on YouTube"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Standard / Detailed feed mode
    return (
      <div
        key={item.id}
        onClick={() => handleSelectCard(item)}
        className={`bg-white/60 dark:bg-black/35 backdrop-blur-md rounded-2xl cursor-pointer transition-all border ${
          isSelected
            ? 'border-red-500 ring-2 ring-red-500/30 bg-red-500/10 dark:bg-red-500/20 shadow-sm'
            : 'border-white/20 dark:border-white/10 hover:border-red-500/40 hover:shadow-xs'
        } ${viewOptions.density === 'compact' ? 'p-2.5 space-y-1.5' : viewOptions.density === 'spacious' ? 'p-4 space-y-3' : 'p-3 space-y-2'}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500">
              <Youtube className="w-3 h-3" /> YouTube
            </span>
            {viewOptions.showChannelBadge && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onShowChannelProfile(item.subtitle);
                }}
                className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 truncate max-w-[140px] hover:text-red-500 hover:underline cursor-pointer"
              >
                {item.subtitle}
              </span>
            )}
            {viewOptions.showWatchCountBadge && globalCount > 1 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-mono">
                {globalCount} views
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {viewOptions.showTimestamp && (
              <span className="text-[10px] font-mono text-gray-400">{timeStr}</span>
            )}
            {viewOptions.showActionButtons && item.titleUrl && (
              <a
                href={item.titleUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Open on YouTube"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        <div className="flex gap-3 items-start">
          {viewOptions.showThumbnails && (
            thumbUrl ? (
              <img
                src={thumbUrl}
                alt={item.title}
                className="w-22 h-14 object-cover rounded-xl bg-black cursor-pointer hover:opacity-90 transition-opacity shrink-0 border border-gray-100 dark:border-gray-800"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-22 h-14 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center cursor-pointer shrink-0 border border-red-500/20">
                <Youtube className="w-6 h-6" />
              </div>
            )
          )}
          <div className="min-w-0 flex-1">
            <h4
              className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug hover:text-red-500 transition-colors"
              title={item.title}
            >
              {item.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onShowChannelProfile(item.subtitle);
                }}
                className="text-[11px] text-red-500 font-medium truncate cursor-pointer hover:underline"
              >
                {item.subtitle}
              </span>
              {tags.map(t => (
                <span key={t} className="text-[9px] px-1.5 py-0.2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md font-medium">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden min-h-0 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 right-6 z-50 px-3.5 py-1.5 rounded-xl bg-gray-900/90 dark:bg-white/90 text-white dark:text-gray-900 text-xs font-semibold shadow-lg backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Top Reusable ViewToolbar */}
      <ViewToolbar
        badge={
          <span className="font-['Space_Mono',monospace] text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1a1a1a]/8 dark:bg-white/10 text-[#1a1a1a] dark:text-stone-200">
            {displayVideos.length} {viewScope === 'day' ? 'video' : 'total'}{displayVideos.length !== 1 ? 's' : ''}
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
        searchPlaceholder="Search videos, channels..."
        searchResultsCount={q ? displayVideos.length : undefined}
        onImportClick={onImportClick}
        importLabel="Import"
        leftActions={
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Scope Switcher: Day vs All History */}
            <div className="flex bg-[#1a1a1a]/5 dark:bg-white/5 p-0.5 rounded-md border border-[#1a1a1a]/10 dark:border-white/10 text-xs">
              <button aria-label="Action"
                onClick={() => setViewScope('day')}
                className={`px-2.5 py-0.5 font-medium rounded transition-all cursor-pointer ${
                  viewScope === 'day'
                    ? 'bg-white dark:bg-[#18181b] shadow-2xs text-red-600 dark:text-red-400 font-bold'
                    : 'text-[#71717a] hover:text-[#1a1a1a] dark:hover:text-stone-200'
                }`}
              >
                Day
              </button>
              <button aria-label="Action"
                onClick={() => setViewScope('all')}
                className={`px-2.5 py-0.5 font-medium rounded transition-all cursor-pointer ${
                  viewScope === 'all'
                    ? 'bg-white dark:bg-[#18181b] shadow-2xs text-red-600 dark:text-red-400 font-bold'
                    : 'text-[#71717a] hover:text-[#1a1a1a] dark:hover:text-stone-200'
                }`}
              >
                All
              </button>
            </div>
          </div>
        }
        rightActions={
          <div className="flex items-center gap-1.5">
            <YouTubeViewMenu
              activeMode={activeCombinedMode}
              onChangeMode={handleCombinedModeChange}
              cardLimit={cardLimit}
              onChangeCardLimit={limit => {
                setCardLimit(limit);
                if (limit === 'all') {
                  setVisibleCount(displayVideos.length);
                } else {
                  setVisibleCount(parseInt(limit, 10) || 48);
                }
              }}
              gridDensity={gridDensity}
              onChangeGridDensity={setGridDensity}
              totalFilteredCount={displayVideos.length}
              displayOptions={{
                showThumbnails: viewOptions.showThumbnails,
                showChannelBadge: viewOptions.showChannelBadge,
                showTimestamp: viewOptions.showTimestamp,
                showWatchCountBadge: viewOptions.showWatchCountBadge,
                showDuration: viewOptions.showDuration,
                showActionButtons: viewOptions.showActionButtons
              }}
              onToggleDisplayOption={key => {
                updateViewOption(key, !viewOptions[key]);
              }}
              groupBy={viewOptions.groupBy}
              onChangeGroupBy={group => updateViewOption('groupBy', group)}
              sortBy={viewOptions.sortBy}
              onChangeSortBy={sort => updateViewOption('sortBy', sort)}
              onResetDefaults={resetViewOptions}
            />

            {/* Right Panel Toggle Button */}
            <button aria-label="Action"
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isRightPanelOpen
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                  : 'bg-white dark:bg-[#18181b] text-gray-700 dark:text-gray-300 border-gray-200/90 dark:border-white/10 hover:text-black dark:hover:text-white'
              }`}
              title={isRightPanelOpen ? 'Hide Analytics Panel' : 'Open Analytics Panel'}
            >
              <BarChart2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="hidden sm:inline">{isRightPanelOpen ? 'Hide Panel' : 'Panel'}</span>
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-2.5">
          {/* Channel Filter Dropdown */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs shadow-2xs">
            <Tv className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="bg-transparent text-gray-700 dark:text-gray-300 font-semibold outline-none cursor-pointer text-xs max-w-[130px] sm:max-w-[170px] truncate"
              title="Filter by Channel"
            >
              <option value="all">All Channels ({allChannels.length})</option>
              {allChannels.map(ch => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
            {filterChannel !== 'all' && (
              <button aria-label="Action"
                onClick={() => setFilterChannel('all')}
                className="text-red-500 hover:text-red-700 font-bold px-1 rounded-md hover:bg-red-500/10 cursor-pointer"
                title="Clear channel filter"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Preset */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <select
              value={viewOptions.filterPreset}
              onChange={(e) => updateViewOption('filterPreset', e.target.value as FilterPreset)}
              className="bg-transparent text-gray-700 dark:text-gray-300 font-semibold outline-none cursor-pointer text-xs"
              title="Filter Presets"
            >
              <option value="all">All Videos</option>
              <option value="repeated">Repeated (&gt;1)</option>
              <option value="playable">With Player ID</option>
            </select>
          </div>
        </div>
      </ViewToolbar>

      {/* Main Split Body: Left Panel (List/Feed/Grid) & Right Panel (Detailed Analytics) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Side: Video List with Subviews */}
        <div
          className={`flex flex-col min-h-0 overflow-hidden transition-all ${
            isRightPanelOpen
              ? 'w-full lg:w-3/5 xl:w-7/12 border-b lg:border-b-0 lg:border-r border-black/8 dark:border-white/10'
              : 'w-full'
          }`}
        >
          {/* Subview Contents (Ref attached to scrolling element for 60fps virtualization) */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-4">
            {/* Day / Feed Subview */}
            {subView === 'day' && (
              <>
                {displayVideos.length === 0 ? (
                  <div className="text-center py-16 text-xs text-gray-400 space-y-2">
                    <Youtube className="w-8 h-8 mx-auto opacity-30 text-gray-400" />
                    <div>
                      {q
                        ? `No videos match "${searchQuery}".`
                        : 'No YouTube history recorded for this date or filter. Use the controls above to navigate.'}
                    </div>
                  </div>
                ) : (
                  <VirtualizedFeed<TimelineItem>
                    containerRef={scrollContainerRef}
                    groups={groupedSections}
                    layoutMode={viewOptions.layoutMode}
                    gridDensity={gridDensity}
                    isRightPanelOpen={isRightPanelOpen}
                    renderItem={(item) => renderCustomVideoCard(item)}
                    hasMore={infiniteFeed.hasMore}
                    isLoadingMore={infiniteFeed.isLoadingMore}
                    onLoadMore={infiniteFeed.loadNextChunk}
                    themeColor="red"
                    renderHeader={(title, count) => (
                      <div className="flex items-center gap-2 pt-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                          {title}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-mono">
                          {count}
                        </span>
                      </div>
                    )}
                  />
                )}
              </>
            )}

            {/* Week Subview */}
            {subView === 'week' && (
              (() => {
                const startOfWeek = new Date(currentDate);
                startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
                const weekDays = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(startOfWeek);
                  d.setDate(startOfWeek.getDate() + i);
                  const isToday = d.toDateString() === new Date().toDateString();
                  const isSelected = d.toDateString() === currentDate.toDateString();
                  const key = getDateKey(d);
                  let videos = (dateIndexMap.get(key) || []).filter(s => s.type === 'youtube');
                  if (filterChannel !== 'all') {
                    videos = videos.filter(s => s.subtitle === filterChannel);
                  }
                  if (q) {
                    videos = videos.filter(
                      s =>
                        (s.title || '').toLowerCase().includes(q) ||
                        (s.subtitle || '').toLowerCase().includes(q)
                    );
                  }
                  return { date: d, key, isToday, isSelected, videos };
                });

                return (
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 ios-glass shrink-0">
                      {weekDays.map(wd => (
                        <div
                          key={wd.key}
                          onClick={() => onJumpToDate(wd.date)}
                          className={`p-2.5 text-center border-r border-gray-200 dark:border-gray-800 last:border-0 cursor-pointer ${
                            wd.isSelected
                              ? 'bg-red-500/10'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
                          }`}
                        >
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {wd.date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div
                            className={`text-sm font-bold mt-0.5 ${
                              wd.isToday ? 'text-red-500' : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {wd.date.getDate()}
                          </div>
                          <div className="text-[9px] text-gray-400 mt-0.5 font-mono">
                            {wd.videos.length} vids
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 grid grid-cols-7 overflow-y-auto min-h-0 divide-x divide-gray-100 dark:divide-gray-800/40 pt-2">
                      {weekDays.map(wd => (
                        <div
                          key={wd.key}
                          className={`p-1.5 border-r border-gray-200 dark:border-gray-800 last:border-0 flex flex-col space-y-2 ${
                            wd.isSelected ? 'bg-red-500/5' : ''
                          }`}
                        >
                          {wd.videos.length === 0 ? (
                            <div className="text-center py-6 text-[10px] text-gray-400">Empty</div>
                          ) : (
                            wd.videos.map(s => (
                              <div
                                key={s.id}
                                onClick={() => handleSelectCard(s)}
                                className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                                  activeVideo?.id === s.id
                                    ? 'bg-red-500/15 border-red-500 shadow-xs'
                                    : 'bg-white dark:bg-[#151515] border-gray-200 dark:border-gray-800 hover:border-red-500/50'
                                }`}
                              >
                                <h5 className="text-[11px] font-bold text-gray-900 dark:text-white line-clamp-2">
                                  {s.title}
                                </h5>
                                <p className="text-[9px] text-red-500 truncate mt-0.5 font-medium">
                                  {s.subtitle}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}

            {/* Month Subview */}
            {subView === 'month' && (
              (() => {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const firstDay = new Date(year, month, 1).getDay();
                const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                return (
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 ios-glass shrink-0">
                      {weekDays.map(day => (
                        <div
                          key={day}
                          className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-800 last:border-0"
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 grid grid-cols-7 overflow-y-auto bg-white/30 dark:bg-black/25 backdrop-blur-md min-h-0">
                      {Array.from({ length: firstDay }).map((_, i) => (
                        <div
                          key={`empty-${i}`}
                          className="border-r border-b border-gray-200/60 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/20 p-2"
                        />
                      ))}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const date = new Date(year, month, day);
                        const dateKey = getDateKey(date);
                        let videos = (dateIndexMap.get(dateKey) || []).filter(
                          s => s.type === 'youtube'
                        );
                        if (filterChannel !== 'all') {
                          videos = videos.filter(s => s.subtitle === filterChannel);
                        }
                        if (q) {
                          videos = videos.filter(
                            s =>
                              (s.title || '').toLowerCase().includes(q) ||
                              (s.subtitle || '').toLowerCase().includes(q)
                          );
                        }
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isSelected = date.toDateString() === currentDate.toDateString();

                        return (
                          <div
                            key={day}
                            onClick={() => {
                              onJumpToDate(date);
                              setSubView('day');
                            }}
                            className={`border-r border-b border-gray-200/60 dark:border-gray-800/60 p-2 flex flex-col ${
                              isSelected
                                ? 'bg-red-500/10'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                            } transition-colors cursor-pointer min-h-[85px]`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span
                                className={`text-xs font-semibold ${
                                  isToday
                                    ? 'bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-xs'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {day}
                              </span>
                              {videos.length > 0 && (
                                <span className="text-[9px] bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.2 rounded-full font-bold font-mono">
                                  {videos.length}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 overflow-hidden flex-1">
                              {videos.slice(0, 2).map(v => (
                                <div
                                  key={v.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectCard(v);
                                  }}
                                  className="text-[9px] truncate text-gray-600 dark:text-gray-300 hover:text-red-500 font-medium"
                                  title={v.title}
                                >
                                  • {v.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            )}

            {/* Log Subview */}
            {subView === 'log' && (
              <div className="flex-1 overflow-x-auto space-y-4">
                <VirtualizedTable<TimelineItem>
                  containerRef={scrollContainerRef}
                  items={visibleVideos}
                  colSpan={4}
                  estimateRowHeight={48}
                  hasMore={infiniteFeed.hasMore}
                  isLoadingMore={infiniteFeed.isLoadingMore}
                  onLoadMore={infiniteFeed.loadNextChunk}
                  themeColor="red"
                  tableClassName="w-full text-left border-collapse"
                  renderHeader={() => (
                    <tr className="bg-gray-50/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-3 py-2">Timestamp</th>
                      <th className="px-3 py-2">Video Title</th>
                      <th className="px-3 py-2">Channel</th>
                      <th className="px-3 py-2 text-right">Link</th>
                    </tr>
                  )}
                  renderRow={(item) => {
                    const isSelected = activeVideo?.id === item.id;
                    const dateStr = new Date(item.ts).toLocaleString();
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleSelectCard(item)}
                        className={`hover:bg-red-500/5 transition-colors cursor-pointer ${
                          isSelected ? 'bg-red-500/10' : ''
                        }`}
                      >
                        <td className="px-3 py-2.5 text-xs text-red-500 font-medium whitespace-nowrap font-mono">
                          {dateStr}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                          {item.title}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onShowChannelProfile(item.subtitle);
                            }}
                            className="hover:underline hover:text-red-500"
                          >
                            {item.subtitle}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          {item.titleUrl && (
                            <a
                              href={item.titleUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-gray-400 hover:text-red-500 inline-block transition-colors"
                              title="Open on YouTube"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  }}
                />

                {visibleCount < displayVideos.length && (
                  <div className="py-4 text-center">
                    <button aria-label="Action"
                      onClick={() => setVisibleCount(prev => Math.min(prev + 50, displayVideos.length))}
                      className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 bg-gray-100 dark:bg-gray-850 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer inline-flex items-center gap-2 shadow-2xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span>Loading more logs... ({Math.min(visibleCount, displayVideos.length)} of {displayVideos.length.toLocaleString()})</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detailed Video & Channel Analytics Panel */}
        {isRightPanelOpen && activeVideoAnalytics && (
          <div className="w-full lg:w-2/5 xl:w-5/12 flex flex-col min-h-0 overflow-y-auto bg-white/75 dark:bg-[#121214]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-[#121214]/75 border-t lg:border-t-0 border-l border-black/8 dark:border-white/10">
            {/* Top Bar for Right Panel */}
            <div className="p-4 border-b border-black/8 dark:border-white/10 bg-white/80 dark:bg-[#121214]/90 backdrop-blur-xl space-y-3 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center gap-1">
                      <Youtube className="w-3 h-3" /> YouTube Video Analytics
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      Watched {activeVideoAnalytics.totalViews} time{activeVideoAnalytics.totalViews !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                    {activeVideoAnalytics.title}
                  </h3>
                  <button aria-label="Action"
                    onClick={() => onShowChannelProfile(activeVideoAnalytics.channel)}
                    className="text-xs font-semibold text-red-500 hover:underline mt-0.5 block truncate"
                  >
                    {activeVideoAnalytics.channel} ↗
                  </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button aria-label="Action"
                    onClick={() => onShowVideoProfile(activeVideoAnalytics.title, activeVideoAnalytics.channel)}
                    className="p-1.5 rounded-xl bg-gray-100 dark:bg-[#202020] text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors"
                    title="Open Full Analytics Modal"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button aria-label="Action"
                    onClick={() => setIsRightPanelOpen(false)}
                    className="p-1.5 rounded-xl bg-gray-100 dark:bg-[#202020] text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors"
                    title="Close Panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-100 dark:border-gray-800/80">
                <button aria-label="Action"
                  onClick={handleCopyUrl}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-[#1c1c1c] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copyFeedback ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copyFeedback ? 'Copied' : 'Copy Link'}</span>
                </button>
                <button aria-label="Action"
                  onClick={handleCopyMarkdown}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-[#1c1c1c] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copyMdFeedback ? <Check className="w-3 h-3 text-emerald-500" /> : <FileCode className="w-3 h-3 text-red-500" />}
                  <span>{copyMdFeedback ? 'Copied MD' : 'Markdown'}</span>
                </button>
                {activeVideoAnalytics.videoUrl && (
                  <a
                    href={activeVideoAnalytics.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-1 ml-auto shadow-2xs"
                  >
                    <span>Open on YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Analytics Panel Tab Switcher */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#181818] p-1 rounded-xl text-xs">
                <button aria-label="Action"
                  onClick={() => setActivePanelTab('analytics')}
                  className={`flex-1 py-1 px-2 font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activePanelTab === 'analytics'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Analytics</span>
                </button>
                <button aria-label="Action"
                  onClick={() => setActivePanelTab('player')}
                  className={`flex-1 py-1 px-2 font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activePanelTab === 'player'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 text-red-500" />
                  <span>Player</span>
                </button>
                <button aria-label="Action"
                  onClick={() => setActivePanelTab('channel')}
                  className={`flex-1 py-1 px-2 font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activePanelTab === 'channel'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5 text-red-500" />
                  <span>Channel</span>
                </button>
                <button aria-label="Action"
                  onClick={() => setActivePanelTab('notes')}
                  className={`flex-1 py-1 px-2 font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activePanelTab === 'notes'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'
                  }`}
                >
                  <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                  <span>Notes & Tags</span>
                </button>
              </div>
            </div>

            {/* Panel Body Content */}
            <div className="p-4 sm:p-5 space-y-5">
              {/* TAB 1: DETAILED ANALYTICS */}
              {activePanelTab === 'analytics' && (
                <div className="space-y-5">
                  {/* Visual Video Thumbnail Banner */}
                  {activeVideoAnalytics.thumbUrl && (
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-md border border-gray-200 dark:border-gray-800 group">
                      <img
                        src={activeVideoAnalytics.thumbUrl}
                        alt={activeVideoAnalytics.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                        <span className="text-white text-xs font-bold line-clamp-1 drop-shadow-md">
                          {activeVideoAnalytics.title}
                        </span>
                        <span className="text-red-400 text-[11px] font-semibold mt-0.5">
                          {activeVideoAnalytics.channel}
                        </span>
                      </div>
                      <button aria-label="Action"
                        onClick={() => setActivePanelTab('player')}
                        className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 cursor-pointer"
                        title="Play in Embedded Player"
                      >
                        <Play className="w-5 h-5 ml-0.5" />
                      </button>
                    </div>
                  )}

                  {/* Core Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-200/80 dark:border-white/10 shadow-2xs">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Times Watched</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white mt-1 flex items-baseline gap-1.5">
                        <span>{activeVideoAnalytics.totalViews}</span>
                        <span className="text-[10px] font-medium text-red-500 font-mono">
                          ({activeVideoAnalytics.percentageOfAll}% of YT)
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-200/80 dark:border-white/10 shadow-2xs">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Channel Total</div>
                      <div className="text-xl font-bold text-red-500 mt-1">
                        {activeVideoAnalytics.channelTotalViews} plays
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-200/80 dark:border-white/10 shadow-2xs">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">First Watched</div>
                      <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1 truncate">
                        {activeVideoAnalytics.firstWatchedDate
                          ? activeVideoAnalytics.firstWatchedDate.toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-200/80 dark:border-white/10 shadow-2xs">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Watched</div>
                      <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1 truncate">
                        {activeVideoAnalytics.lastWatchedDate
                          ? activeVideoAnalytics.lastWatchedDate.toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Time of Day Distribution */}
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-200/80 dark:border-white/10 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-red-500" />
                      <span>Watch Time of Day Preference</span>
                    </span>

                    <div className="space-y-2 text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                            <Coffee className="w-3 h-3 text-amber-500" /> Morning (05-12h)
                          </span>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                            {activeVideoAnalytics.hourBuckets.morning} plays
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-amber-500 h-1.5 rounded-full"
                            style={{ width: `${(activeVideoAnalytics.hourBuckets.morning / activeVideoAnalytics.totalViews) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                            <Sun className="w-3 h-3 text-orange-500" /> Afternoon (12-17h)
                          </span>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                            {activeVideoAnalytics.hourBuckets.afternoon} plays
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-orange-500 h-1.5 rounded-full"
                            style={{ width: `${(activeVideoAnalytics.hourBuckets.afternoon / activeVideoAnalytics.totalViews) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                            <Sunset className="w-3 h-3 text-red-500" /> Evening (17-22h)
                          </span>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                            {activeVideoAnalytics.hourBuckets.evening} plays
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-red-500 h-1.5 rounded-full"
                            style={{ width: `${(activeVideoAnalytics.hourBuckets.evening / activeVideoAnalytics.totalViews) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                            <Moon className="w-3 h-3 text-indigo-400" /> Night (22-05h)
                          </span>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                            {activeVideoAnalytics.hourBuckets.night} plays
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full"
                            style={{ width: `${(activeVideoAnalytics.hourBuckets.night / activeVideoAnalytics.totalViews) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Full Watch History for this Video */}
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-200/80 dark:border-white/10 space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                      Watch History Timestamps ({activeVideoAnalytics.instances.length})
                    </span>
                    <div className="space-y-1 max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
                      {activeVideoAnalytics.instances.map((inst, idx) => {
                        const d = new Date(inst.ts);
                        return (
                          <div
                            key={inst.id || idx}
                            onClick={() => onJumpToDate(d)}
                            className="pt-1.5 pb-1.5 flex items-center justify-between text-xs cursor-pointer hover:bg-red-500/5 px-2 rounded-lg transition-colors"
                            title="Click to jump to this date"
                          >
                            <span className="text-gray-700 dark:text-gray-300 font-mono">
                              {d.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-red-500 font-bold hover:underline">
                              Jump to Day ↗
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: INTERACTIVE PLAYER */}
              {activePanelTab === 'player' && (
                <div className="space-y-4">
                  {activeVideoAnalytics.videoId ? (
                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-lg border border-gray-200 dark:border-gray-800">
                      <iframe
                        src={`https://www.youtube.com/embed/${activeVideoAnalytics.videoId}?autoplay=0`}
                        title={activeVideoAnalytics.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-gray-100 dark:bg-[#151515] rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3">
                      <Youtube className="w-10 h-10 mx-auto text-red-500 opacity-50" />
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Direct Video ID Unavailable</h4>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto">
                        This watch record does not contain an embedded video ID. You can open the search result directly on YouTube.
                      </p>
                      {activeVideoAnalytics.videoUrl && (
                        <a
                          href={activeVideoAnalytics.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors shadow-2xs"
                        >
                          <span>Open on YouTube</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 space-y-2 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Video Resource Details</span>
                    <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-800/80">
                      <span className="text-gray-500">Video ID:</span>
                      <span className="font-mono font-bold text-red-500">{activeVideoAnalytics.videoId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-800/80">
                      <span className="text-gray-500">Channel:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{activeVideoAnalytics.channel}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-500">Direct Link:</span>
                      <a
                        href={activeVideoAnalytics.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-500 font-mono truncate max-w-[200px] hover:underline"
                      >
                        {activeVideoAnalytics.videoUrl}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CHANNEL DEEP DIVE */}
              {activePanelTab === 'channel' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-500 text-white font-bold flex items-center justify-center text-lg shadow-md shadow-red-500/20">
                      {activeVideoAnalytics.channel.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {activeVideoAnalytics.channel}
                      </h4>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {activeVideoAnalytics.channelTotalViews} total watches • {activeVideoAnalytics.channelUniqueCount} unique videos
                      </p>
                    </div>
                    <button aria-label="Action"
                      onClick={() => onShowChannelProfile(activeVideoAnalytics.channel)}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-black text-red-500 text-xs font-bold border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                    >
                      Profile
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                      Top Videos from this Channel ({activeVideoAnalytics.channelTopVideos.length})
                    </span>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {activeVideoAnalytics.channelTopVideos.map(([vTitle, count]) => {
                        const isCurrent = vTitle === activeVideoAnalytics.title;
                        return (
                          <div
                            key={vTitle}
                            onClick={() => {
                              const found = ytItemsAll.find(i => i.title === vTitle);
                              if (found) handleSelectCard(found);
                            }}
                            className={`p-2 rounded-xl transition-all cursor-pointer border ${
                              isCurrent
                                ? 'bg-red-500/10 border-red-500/40 font-bold'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-900/40 border-transparent'
                            }`}
                          >
                            <div className="flex justify-between items-center text-xs gap-2">
                              <span className="truncate flex-1 text-gray-800 dark:text-gray-200 hover:text-red-500">
                                {vTitle}
                              </span>
                              <span className="font-mono text-red-500 text-[11px] shrink-0 font-bold">
                                {count} views
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: NOTES & TAGS */}
              {activePanelTab === 'notes' && (
                <div className="space-y-4 text-xs">
                  {/* Notes Area */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                      <span>Personal Notes for this Video</span>
                    </span>
                    <textarea
                      value={activeNote}
                      onChange={(e) => handleSaveNote(e.target.value)}
                      placeholder="Add reflections, key takeaways, timestamps or bookmarks..."
                      rows={4}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-red-500 transition-colors resize-none"
                    />
                    <div className="text-[10px] text-gray-400 text-right">
                      {activeNote ? 'Saved automatically to local storage' : 'No notes recorded yet'}
                    </div>
                  </div>

                  {/* Topic Tags */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-red-500" />
                      <span>Custom Video Tags</span>
                    </span>

                    <form onSubmit={handleAddTag} className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Add tag (e.g. tutorial, podcast, code)..."
                        className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-red-500"
                      />
                      <button aria-label="Action"
                        type="submit"
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Add Tag
                      </button>
                    </form>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeTags.length === 0 ? (
                        <span className="text-gray-400 text-xs py-2">No tags assigned to this video yet.</span>
                      ) : (
                        activeTags.map(t => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold"
                          >
                            #{t}
                            <button aria-label="Action"
                              onClick={() => handleRemoveTag(t)}
                              className="w-3.5 h-3.5 rounded-full hover:bg-red-500/20 flex items-center justify-center cursor-pointer ml-0.5"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
