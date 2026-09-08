import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  X,
  Clock,
  Calendar,
  Layers,
  Headphones,
  Youtube,
  MapPin,
  Globe,
  StickyNote,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Filter,
  BarChart2,
  Copy,
  Check,
  Trash2,
  CalendarDays,
  FileText,
  Compass,
  ArrowUpDown,
  Download,
  Eye,
  CornerDownLeft,
  SlidersHorizontal,
  Navigation,
  Image as ImageIcon
} from 'lucide-react';
import {
  TimelineItem,
  CalendarEvent,
  ViewType,
  MetricsModalState,
  ItemType
} from '../../types';
import {
  formatDuration,
  formatTime,
  buildGoogleMapsUrl,
  getPlaceCategory
} from '../../utils/dataParser';
import { extractDomain } from '../../utils/urlMetadata';

export type SearchCategoryFilter = 'all' | 'spotify' | 'youtube' | 'maps' | 'browser' | 'notes' | 'calendar' | 'photo';
export type SearchSortOption = 'relevance' | 'newest' | 'oldest' | 'duration';
export type SearchGroupMode = 'flat' | 'date' | 'service';

export interface SearchResultItem {
  id: string;
  sourceType: 'spotify' | 'youtube' | 'maps' | 'browser' | 'notes' | 'calendar' | 'photo';
  title: string;
  subtitle: string;
  timestamp: string;
  dateObj: Date;
  dateKey: string;
  rawItem?: TimelineItem;
  rawEvent?: CalendarEvent;
  noteContent?: string;
  durationMs?: number;
  distanceKm?: string | null;
  url?: string;
  domain?: string;
  categoryBadge?: { label: string; bg: string; color: string };
  relevanceScore: number;
  matchSnippet?: string;
}

interface GlobalSearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  timelineData: TimelineItem[];
  dailyNotesMap: Record<string, string>;
  calendarEvents: CalendarEvent[];
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  onJumpToDate: (date: Date) => void;
  onSelectSearchResult: (dateStr: string, item: TimelineItem) => void;
  onOpenMetricsModal?: (state: MetricsModalState) => void;
  onOpenBrowserModal?: (item: TimelineItem) => void;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
  initialQuery?: string;
}

const RECENT_SEARCHES_KEY = 'global_omnibar_recent_searches';
const MAX_RECENT_SEARCHES = 10;

export const GlobalSearchPalette: React.FC<GlobalSearchPaletteProps> = ({
  isOpen,
  onClose,
  timelineData,
  dailyNotesMap,
  calendarEvents,
  currentView,
  onSelectView,
  onJumpToDate,
  onSelectSearchResult,
  onOpenMetricsModal,
  onOpenBrowserModal,
  onOpenMapModal,
  initialQuery = ''
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<SearchCategoryFilter>('all');
  const [sortBy, setSortBy] = useState<SearchSortOption>('relevance');
  const [groupMode, setGroupMode] = useState<SearchGroupMode>('flat');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Update query when initialQuery changes
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Save query to recent searches
  const saveRecentSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches(prev => {
      const next = [trimmed, ...prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(
        0,
        MAX_RECENT_SEARCHES
      );
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  }, []);

  const removeRecentSearch = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const next = prev.filter(s => s !== itemToRemove);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (err) {
      console.error(err);
    }
  };

  // Extract Top Entities for Quick Search chips
  const topSuggestions = useMemo(() => {
    const artistCounts = new Map<string, number>();
    const channelCounts = new Map<string, number>();
    const placeCounts = new Map<string, number>();
    const domainCounts = new Map<string, number>();

    timelineData.forEach(item => {
      if (item.type === 'spotify' && item.subtitle) {
        artistCounts.set(item.subtitle, (artistCounts.get(item.subtitle) || 0) + 1);
      } else if (item.type === 'youtube' && item.subtitle) {
        channelCounts.set(item.subtitle, (channelCounts.get(item.subtitle) || 0) + 1);
      } else if (item.type === 'maps' && item.title && !item.title.startsWith('Location (')) {
        placeCounts.set(item.title, (placeCounts.get(item.title) || 0) + 1);
      } else if (item.type === 'browser') {
        const d = item.domain || extractDomain(item.url || '');
        if (d && d !== 'unknown') {
          domainCounts.set(d, (domainCounts.get(d) || 0) + 1);
        }
      }
    });

    const getTop = (map: Map<string, number>, limit = 3) =>
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name]) => name);

    return {
      artists: getTop(artistCounts, 3),
      channels: getTop(channelCounts, 3),
      places: getTop(placeCounts, 3),
      domains: getTop(domainCounts, 3)
    };
  }, [timelineData]);

  // Parse search directives/operators from the query
  const parsedDirectives = useMemo(() => {
    const raw = query.trim();
    let typeFilter: SearchCategoryFilter | null = null;
    let artistFilter: string | null = null;
    let channelFilter: string | null = null;
    let domainFilter: string | null = null;
    let placeFilter: string | null = null;
    let dateFilter: string | null = null;
    let tagFilter: string | null = null;

    let cleanTokens: string[] = [];

    const tokens = raw.split(/\s+/);
    tokens.forEach(tok => {
      const lower = tok.toLowerCase();
      if (lower.startsWith('type:') || lower.startsWith('t:')) {
        const val = lower.replace(/^(type:|t:)/, '');
        if (['spotify', 'music', 'song'].includes(val)) typeFilter = 'spotify';
        else if (['youtube', 'yt', 'video'].includes(val)) typeFilter = 'youtube';
        else if (['maps', 'map', 'place', 'places', 'trip'].includes(val)) typeFilter = 'maps';
        else if (['browser', 'web', 'history', 'site'].includes(val)) typeFilter = 'browser';
        else if (['notes', 'note', 'diary', 'journal'].includes(val)) typeFilter = 'notes';
        else if (['calendar', 'event', 'events'].includes(val)) typeFilter = 'calendar';
      } else if (lower.startsWith('artist:')) {
        artistFilter = tok.slice(7).toLowerCase();
      } else if (lower.startsWith('channel:')) {
        channelFilter = tok.slice(8).toLowerCase();
      } else if (lower.startsWith('domain:')) {
        domainFilter = tok.slice(7).toLowerCase();
      } else if (lower.startsWith('place:')) {
        placeFilter = tok.slice(6).toLowerCase();
      } else if (lower.startsWith('date:') || lower.startsWith('d:')) {
        dateFilter = tok.replace(/^(date:|d:)/, '').toLowerCase();
      } else if (lower.startsWith('tag:')) {
        tagFilter = tok.slice(4).toLowerCase();
      } else if (tok.length > 0) {
        cleanTokens.push(tok);
      }
    });

    return {
      typeFilter,
      artistFilter,
      channelFilter,
      domainFilter,
      placeFilter,
      dateFilter,
      tagFilter,
      cleanQuery: cleanTokens.join(' ').toLowerCase(),
      terms: cleanTokens.map(t => t.toLowerCase())
    };
  }, [query]);

  // Execute Universal Omni-Search across all datasets
  const allSearchResults = useMemo(() => {
    const { cleanQuery, terms, typeFilter, artistFilter, channelFilter, domainFilter, placeFilter, dateFilter, tagFilter } =
      parsedDirectives;

    if (!query.trim()) {
      return [];
    }

    const results: SearchResultItem[] = [];

    // Helper: calculate relevance score
    const calcScore = (
      title: string,
      subtitle: string,
      extraText: string,
      dateStr: string,
      targetType: SearchCategoryFilter
    ): { score: number; snippet?: string } => {
      let score = 0;
      let matchedSnippet: string | undefined = undefined;

      const lowerTitle = (title || '').toLowerCase();
      const lowerSubtitle = (subtitle || '').toLowerCase();
      const lowerExtra = (extraText || '').toLowerCase();

      // Check specific field filters
      if (typeFilter && typeFilter !== targetType) return { score: 0 };
      if (artistFilter && targetType === 'spotify' && !lowerSubtitle.includes(artistFilter)) return { score: 0 };
      if (channelFilter && targetType === 'youtube' && !lowerSubtitle.includes(channelFilter)) return { score: 0 };
      if (domainFilter && targetType === 'browser' && !lowerExtra.includes(domainFilter)) return { score: 0 };
      if (placeFilter && targetType === 'maps' && !lowerTitle.includes(placeFilter)) return { score: 0 };
      if (dateFilter && !dateStr.includes(dateFilter)) return { score: 0 };
      if (tagFilter && !lowerExtra.includes(tagFilter)) return { score: 0 };

      // Exact phrase match
      if (cleanQuery) {
        if (lowerTitle === cleanQuery) score += 100;
        else if (lowerTitle.startsWith(cleanQuery)) score += 60;
        else if (lowerTitle.includes(cleanQuery)) score += 40;

        if (lowerSubtitle === cleanQuery) score += 50;
        else if (lowerSubtitle.includes(cleanQuery)) score += 25;

        if (lowerExtra.includes(cleanQuery)) {
          score += 15;
          const idx = lowerExtra.indexOf(cleanQuery);
          const start = Math.max(0, idx - 30);
          const end = Math.min(lowerExtra.length, idx + cleanQuery.length + 50);
          matchedSnippet = `...${extraText.slice(start, end)}...`;
        }
      }

      // Token matches
      if (terms.length > 0) {
        let matchedAllTerms = true;
        terms.forEach(term => {
          let termMatch = false;
          if (lowerTitle.includes(term)) {
            score += 20;
            termMatch = true;
          }
          if (lowerSubtitle.includes(term)) {
            score += 10;
            termMatch = true;
          }
          if (lowerExtra.includes(term)) {
            score += 5;
            termMatch = true;
            if (!matchedSnippet) {
              const idx = lowerExtra.indexOf(term);
              const start = Math.max(0, idx - 30);
              const end = Math.min(lowerExtra.length, idx + term.length + 50);
              matchedSnippet = `...${extraText.slice(start, end)}...`;
            }
          }
          if (dateStr.includes(term)) {
            score += 15;
            termMatch = true;
          }
          if (!termMatch) {
            matchedAllTerms = false;
          }
        });

        if (!matchedAllTerms && cleanQuery.length > 2) {
          // If cleanQuery is specific and didn't match all terms, penalize
          score = Math.floor(score * 0.4);
        }
      }

      // If user typed only filters without text, give base score
      if (!cleanQuery && (typeFilter || artistFilter || channelFilter || domainFilter || placeFilter || dateFilter || tagFilter)) {
        score += 50;
      }

      return { score, snippet: matchedSnippet };
    };

    // 1. Search TimelineData (Spotify, YouTube, Maps, Browser)
    timelineData.forEach(item => {
      const dateObj = item.dateObj || new Date(item.ts);
      const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(
        dateObj.getDate()
      ).padStart(2, '0')}`;

      let extraText = '';
      let catBadge = undefined;

      if (item.type === 'spotify') {
        extraText = `${item.album || ''} ${item.master_metadata_album_album_name || ''}`;
      } else if (item.type === 'youtube') {
        extraText = item.titleUrl || '';
      } else if (item.type === 'maps') {
        const cat = getPlaceCategory(item);
        catBadge = { label: cat.label, bg: cat.bg, color: cat.color };
        extraText = `${item.address || ''} ${item.activityType || ''} ${item.travelMode || ''} ${cat.label}`;
      } else if (item.type === 'browser') {
        extraText = `${item.domain || ''} ${item.url || ''}`;
      } else if (item.type === 'photo') {
        extraText = `${item.caption || ''} ${item.camera || ''} ${item.folderName || ''}`;
        catBadge = { label: 'Photo', bg: 'bg-rose-100 dark:bg-rose-950', color: 'text-rose-600 dark:text-rose-300' };
      }

      const { score, snippet } = calcScore(
        item.title || '',
        item.subtitle || '',
        extraText,
        dateKey,
        item.type
      );

      if (score > 0) {
        results.push({
          id: item.id || `item-${Math.random()}`,
          sourceType: item.type,
          title: item.title || 'Untitled',
          subtitle: item.subtitle || item.address || item.domain || '',
          timestamp: item.ts,
          dateObj,
          dateKey,
          rawItem: item,
          durationMs: item.ms_played,
          distanceKm: item.distanceKm,
          url: item.url || item.titleUrl,
          domain: item.domain,
          categoryBadge: catBadge,
          relevanceScore: score,
          matchSnippet: snippet
        });
      }
    });

    // 2. Search Daily Notes & Diary
    Object.entries(dailyNotesMap).forEach(([dateKey, rawContent]) => {
      const content = typeof rawContent === 'string' ? rawContent : String(rawContent || '');
      if (!content || !content.trim()) return;
      const [y, m, d] = dateKey.split('-').map(Number);
      const dateObj = y && m && d ? new Date(y, m - 1, d) : new Date();

      const { score, snippet } = calcScore('Diary Entry', dateKey, content, dateKey, 'notes');

      if (score > 0) {
        results.push({
          id: `note-${dateKey}`,
          sourceType: 'notes',
          title: `Diary Note (${dateKey})`,
          subtitle: content.slice(0, 100).replace(/\n/g, ' '),
          timestamp: dateObj.toISOString(),
          dateObj,
          dateKey,
          noteContent: content,
          relevanceScore: score + 5, // slight boost for personal notes
          matchSnippet: snippet || content.slice(0, 140)
        });
      }
    });

    // 3. Search Calendar Events
    calendarEvents.forEach(ev => {
      const dateKey = ev.date || (ev.start ? ev.start.slice(0, 10) : '');
      const [y, m, d] = dateKey.split('-').map(Number);
      const dateObj = y && m && d ? new Date(y, m - 1, d) : new Date();

      const { score, snippet } = calcScore(
        ev.title || '',
        ev.category || 'Calendar Event',
        ev.description || '',
        dateKey,
        'calendar'
      );

      if (score > 0) {
        results.push({
          id: `event-${ev.id}`,
          sourceType: 'calendar',
          title: ev.title || 'Calendar Event',
          subtitle: `${ev.category} • ${ev.start ? ev.start.slice(11, 16) : ''}`,
          timestamp: dateObj.toISOString(),
          dateObj,
          dateKey,
          rawEvent: ev,
          categoryBadge: { label: ev.category || 'Event', bg: 'bg-purple-100 dark:bg-purple-950', color: 'text-purple-600 dark:text-purple-300' },
          relevanceScore: score,
          matchSnippet: snippet || ev.description
        });
      }
    });

    return results;
  }, [parsedDirectives, query, timelineData, dailyNotesMap, calendarEvents]);

  // Filter and sort active search results
  const filteredAndSortedResults = useMemo(() => {
    let list = [...allSearchResults];

    // Filter by category tab
    if (activeCategory !== 'all') {
      list = list.filter(r => r.sourceType === activeCategory);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'relevance') {
        return b.relevanceScore - a.relevanceScore;
      }
      if (sortBy === 'newest') {
        return b.dateObj.getTime() - a.dateObj.getTime();
      }
      if (sortBy === 'oldest') {
        return a.dateObj.getTime() - b.dateObj.getTime();
      }
      if (sortBy === 'duration') {
        return (b.durationMs || 0) - (a.durationMs || 0);
      }
      return 0;
    });

    return list;
  }, [allSearchResults, activeCategory, sortBy]);

  // Category counts breakdown
  const categoryCounts = useMemo(() => {
    const counts: Record<SearchCategoryFilter, number> = {
      all: allSearchResults.length,
      spotify: 0,
      youtube: 0,
      maps: 0,
      browser: 0,
      notes: 0,
      calendar: 0,
      photo: 0
    };

    allSearchResults.forEach(item => {
      if (counts[item.sourceType] !== undefined) {
        counts[item.sourceType]++;
      }
    });

    return counts;
  }, [allSearchResults]);

  // Keep selected index bounded
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredAndSortedResults, activeCategory]);

  // Scroll active item into view
  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIndex]);

  // Handle item execution / navigation
  const handleSelectResult = (item: SearchResultItem) => {
    saveRecentSearch(query);
    onClose();

    // 1. Jump to date
    onJumpToDate(item.dateObj);

    // 2. Switch to relevant view & select item
    if (item.sourceType === 'spotify') {
      onSelectView('spotify');
      if (item.rawItem) {
        onSelectSearchResult(item.dateKey, item.rawItem);
      }
    } else if (item.sourceType === 'youtube') {
      onSelectView('youtube');
      if (item.rawItem) {
        onSelectSearchResult(item.dateKey, item.rawItem);
      }
    } else if (item.sourceType === 'maps') {
      onSelectView('maptimeline');
      if (item.rawItem) {
        onSelectSearchResult(item.dateKey, item.rawItem);
      }
    } else if (item.sourceType === 'browser') {
      onSelectView('browser');
      if (item.rawItem && onOpenBrowserModal) {
        onOpenBrowserModal(item.rawItem);
      }
    } else if (item.sourceType === 'notes') {
      onSelectView('notes');
    } else if (item.sourceType === 'calendar') {
      onSelectView('timeline');
    } else if (item.sourceType === 'photo') {
      onSelectView('photos');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredAndSortedResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredAndSortedResults[selectedIndex]) {
          handleSelectResult(filteredAndSortedResults[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const categories: SearchCategoryFilter[] = ['all', 'spotify', 'youtube', 'maps', 'browser', 'notes', 'calendar', 'photo'];
        const currentIdx = categories.indexOf(activeCategory);
        const nextIdx = e.shiftKey
          ? (currentIdx - 1 + categories.length) % categories.length
          : (currentIdx + 1) % categories.length;
        setActiveCategory(categories[nextIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredAndSortedResults, selectedIndex, activeCategory, query]);

  // Copy helper
  const handleCopyText = (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Export search results to CSV
  const handleExportCSV = () => {
    if (filteredAndSortedResults.length === 0) return;
    const headers = ['Type', 'Title', 'Subtitle/Channel/Artist/Domain', 'Date', 'Time', 'Duration', 'URL'];
    const rows = filteredAndSortedResults.map(r => [
      r.sourceType,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${(r.subtitle || '').replace(/"/g, '""')}"`,
      r.dateKey,
      formatTime(r.dateObj),
      r.durationMs ? formatDuration(r.durationMs) : '',
      `"${(r.url || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `search_results_${query.replace(/\s+/g, '_') || 'export'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Safe Highlight text helper
  const renderHighlighted = (text: string, highlight: string) => {
    if (!highlight || !highlight.trim() || !text) return text;
    const terms = parsedDirectives.terms.filter(t => t.length > 0);
    if (terms.length === 0) return text;

    try {
      const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-amber-200/90 dark:bg-amber-900/70 text-amber-950 dark:text-amber-100 px-0.5 rounded-xs font-semibold"
          >
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  if (!isOpen) return null;

  const getSourceIcon = (source: SearchCategoryFilter) => {
    switch (source) {
      case 'spotify':
        return <Headphones className="w-4 h-4 text-emerald-500" />;
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-500" />;
      case 'maps':
        return <MapPin className="w-4 h-4 text-blue-500" />;
      case 'browser':
        return <Globe className="w-4 h-4 text-cyan-500" />;
      case 'notes':
        return <StickyNote className="w-4 h-4 text-amber-500" />;
      case 'calendar':
        return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'photo':
        return <ImageIcon className="w-4 h-4 text-rose-500" />;
      default:
        return <Layers className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSourceBadgeBg = (source: SearchCategoryFilter) => {
    switch (source) {
      case 'spotify':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
      case 'youtube':
        return 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400';
      case 'maps':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400';
      case 'browser':
        return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400';
      case 'notes':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
      case 'calendar':
        return 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400';
      case 'photo':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400';
      default:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-8 sm:pt-14 px-3 sm:px-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main Omnibar Container */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh] z-10 animate-in zoom-in-95 duration-150">
        {/* Top Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Search className="w-5 h-5" />
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search across all life history... (e.g., Bohemian Rhapsody, Tokyo, type:youtube)"
              className="w-full bg-transparent text-base sm:text-lg font-bold text-gray-900 dark:text-white placeholder-gray-400 outline-none pr-8 tracking-tight"
            />
            {query && (
              <button aria-label="Action"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button aria-label="Action"
            onClick={onClose}
            className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <span>ESC</span>
          </button>
        </div>

        {/* Category Filter Pills & View Controls */}
        <div className="px-4 py-2.5 bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
          <div className="flex items-center gap-1.5 shrink-0">
            {(
              [
                { id: 'all', label: 'All', icon: <Layers className="w-3.5 h-3.5" /> },
                { id: 'spotify', label: 'Spotify', icon: <Headphones className="w-3.5 h-3.5" /> },
                { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-3.5 h-3.5" /> },
                { id: 'maps', label: 'Places', icon: <MapPin className="w-3.5 h-3.5" /> },
                { id: 'browser', label: 'Web', icon: <Globe className="w-3.5 h-3.5" /> },
                { id: 'notes', label: 'Notes', icon: <StickyNote className="w-3.5 h-3.5" /> },
                { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-3.5 h-3.5" /> },
                { id: 'photo', label: 'Photos', icon: <ImageIcon className="w-3.5 h-3.5" /> }
              ] as { id: SearchCategoryFilter; label: string; icon: React.ReactNode }[]
            ).map(cat => {
              const count = categoryCounts[cat.id];
              const isActive = activeCategory === cat.id;

              return (
                <button aria-label="Action"
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-xs ${
                    isActive
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-black shadow-xs'
                      : 'bg-white dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700/60'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                  {query.trim() && count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive
                          ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sort Option & Export (if results present) */}
          {query.trim() && filteredAndSortedResults.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SearchSortOption)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1 text-[11px] font-semibold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
              >
                <option value="relevance">Best Match</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="duration">Longest Duration</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="p-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                title="Export search results to CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Body Content: Initial suggestions OR Search Results */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] max-h-[58vh]"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* EMPTY QUERY STATE: Show History, Suggestions, Directives */}
          {!query.trim() ? (
            <div className="space-y-5 p-2">
              {/* Recent Searches Section */}
              {recentSearches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Recent Searches</span>
                    </div>
                    <button aria-label="Action"
                      onClick={clearAllRecentSearches}
                      className="text-[10px] text-gray-400 hover:text-red-500 transition-colors cursor-pointer lowercase"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setQuery(term);
                          inputRef.current?.focus();
                        }}
                        className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium text-gray-800 dark:text-gray-200 transition-all cursor-pointer border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                      >
                        <Search className="w-3 h-3 text-gray-400" />
                        <span>{term}</span>
                        <button aria-label="Action"
                          onClick={e => removeRecentSearch(term, e)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Entities Suggestions */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Explore Top Entities & Channels</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Top Artists */}
                  {topSuggestions.artists.length > 0 && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                        <Headphones className="w-3.5 h-3.5" />
                        <span>Top Artists</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {topSuggestions.artists.map(art => (
                          <button aria-label="Action"
                            key={art}
                            onClick={() => {
                              setQuery(`artist:${art}`);
                              inputRef.current?.focus();
                            }}
                            className="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-gray-200 dark:border-gray-700 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                          >
                            {art}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top YouTube Channels */}
                  {topSuggestions.channels.length > 0 && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 dark:text-red-400 mb-2">
                        <Youtube className="w-3.5 h-3.5" />
                        <span>Top Channels</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {topSuggestions.channels.map(ch => (
                          <button aria-label="Action"
                            key={ch}
                            onClick={() => {
                              setQuery(`channel:${ch}`);
                              inputRef.current?.focus();
                            }}
                            className="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/40 border border-gray-200 dark:border-gray-700 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Visited Places */}
                  {topSuggestions.places.length > 0 && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Frequent Places</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {topSuggestions.places.map(pl => (
                          <button aria-label="Action"
                            key={pl}
                            onClick={() => {
                              setQuery(`place:${pl}`);
                              inputRef.current?.focus();
                            }}
                            className="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-gray-200 dark:border-gray-700 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 transition-colors cursor-pointer truncate max-w-[200px]"
                          >
                            {pl}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Web Domains */}
                  {topSuggestions.domains.length > 0 && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 mb-2">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Frequent Domains</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {topSuggestions.domains.map(dom => (
                          <button aria-label="Action"
                            key={dom}
                            onClick={() => {
                              setQuery(`domain:${dom}`);
                              inputRef.current?.focus();
                            }}
                            className="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 border border-gray-200 dark:border-gray-700 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                          >
                            {dom}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Search Syntax & Filters Cheat Sheet */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                  <span>Advanced Search Filters (Click to Insert)</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    { label: 'type:spotify', desc: 'Music only' },
                    { label: 'type:youtube', desc: 'Videos only' },
                    { label: 'type:maps', desc: 'Places only' },
                    { label: 'type:browser', desc: 'Web history' },
                    { label: 'type:notes', desc: 'Diary entries' },
                    { label: 'date:2024-05', desc: 'By month/date' }
                  ].map(op => (
                    <button aria-label="Action"
                      key={op.label}
                      onClick={() => {
                        setQuery(prev => `${prev} ${op.label}`.trim());
                        inputRef.current?.focus();
                      }}
                      className="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700/80 rounded-xl font-mono text-[11px] text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="font-bold text-blue-600 dark:text-blue-400">{op.label}</span>
                      <span className="text-gray-400 text-[10px]">({op.desc})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : filteredAndSortedResults.length === 0 ? (
            /* NO RESULTS STATE */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">No records found</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                No events match <span className="font-semibold text-gray-700 dark:text-gray-300">"{query}"</span> in{' '}
                {activeCategory === 'all' ? 'any category' : activeCategory}. Try broadening your search or checking spelling.
              </p>
            </div>
          ) : (
            /* MATCHED SEARCH RESULTS LIST */
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <span>
                  {filteredAndSortedResults.length} Result{filteredAndSortedResults.length !== 1 ? 's' : ''}
                </span>
                <span>Press ↵ to jump or open</span>
              </div>

              {filteredAndSortedResults.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                const sourceBadge = getSourceBadgeBg(item.sourceType);
                const sourceIcon = getSourceIcon(item.sourceType);

                return (
                  <div
                    key={item.id}
                    ref={el => {
                      if (el) itemRefs.current.set(idx, el);
                      else itemRefs.current.delete(idx);
                    }}
                    onClick={() => handleSelectResult(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`group relative p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700/80 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-white dark:bg-[#161616] hover:bg-gray-50 dark:hover:bg-gray-800/60 border-gray-200/80 dark:border-gray-800/80'
                    }`}
                  >
                    {/* Left: Icon, Details & Highlights */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border mt-0.5 ${sourceBadge}`}
                      >
                        {sourceIcon}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Title & Category Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${sourceBadge}`}
                          >
                            {item.sourceType}
                          </span>
                          {item.categoryBadge && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.categoryBadge.bg} ${item.categoryBadge.color}`}
                            >
                              {item.categoryBadge.label}
                            </span>
                          )}
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate tracking-tight">
                            {renderHighlighted(item.title, query)}
                          </h4>
                        </div>

                        {/* Subtitle / Artist / Channel / Address */}
                        {item.subtitle && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                            {renderHighlighted(item.subtitle, query)}
                          </p>
                        )}

                        {/* Snippet / Notes excerpt if available */}
                        {item.matchSnippet && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/60 px-2.5 py-1 rounded-xl border border-gray-100 dark:border-gray-800 mt-1 line-clamp-2">
                            {renderHighlighted(item.matchSnippet, query)}
                          </div>
                        )}

                        {/* Metadata Footer: Date, Time, Duration */}
                        <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500 font-medium pt-0.5">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" />
                            {item.dateKey}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {formatTime(item.dateObj)}
                          </span>
                          {item.durationMs && item.durationMs > 0 ? (
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              {formatDuration(item.durationMs)}
                            </span>
                          ) : null}
                          {item.distanceKm && (
                            <span className="font-mono text-blue-500 font-bold">{item.distanceKm} km</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Open Profile Modal */}
                      {onOpenMetricsModal && item.sourceType === 'spotify' && item.rawItem && (
                        <button aria-label="Action"
                          onClick={e => {
                            e.stopPropagation();
                            onClose();
                            onOpenMetricsModal({
                              isOpen: true,
                              type: 'track',
                              title: item.title,
                              subtitle: item.subtitle
                            });
                          }}
                          className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
                          title="Inspect Track Profile"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>
                      )}

                      {onOpenMetricsModal && item.sourceType === 'youtube' && item.rawItem && (
                        <button aria-label="Action"
                          onClick={e => {
                            e.stopPropagation();
                            onClose();
                            onOpenMetricsModal({
                              isOpen: true,
                              type: 'youtube-video',
                              title: item.title,
                              subtitle: item.subtitle
                            });
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                          title="Inspect Video Analytics"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>
                      )}

                      {onOpenMetricsModal && item.sourceType === 'maps' && item.rawItem && (
                        <button aria-label="Action"
                          onClick={e => {
                            e.stopPropagation();
                            onClose();
                            onOpenMetricsModal({
                              isOpen: true,
                              type: 'place' as any,
                              title: item.title,
                              subtitle: item.subtitle || item.rawItem?.address
                            });
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors cursor-pointer"
                          title="Inspect Place History"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Copy Title / Link */}
                      <button aria-label="Action"
                        onClick={e => handleCopyText(item.id, item.url || item.title, e)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {/* External Link */}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-xl transition-colors cursor-pointer"
                          title="Open external link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {/* Jump / Select Enter Arrow */}
                      <button aria-label="Action"
                        onClick={() => handleSelectResult(item)}
                        className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold px-2.5"
                      >
                        <span>Jump</span>
                        <CornerDownLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] font-mono shadow-2xs font-bold text-gray-700 dark:text-gray-300">
                ↑↓
              </kbd>{' '}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] font-mono shadow-2xs font-bold text-gray-700 dark:text-gray-300">
                ↵
              </kbd>{' '}
              Select & Jump
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] font-mono shadow-2xs font-bold text-gray-700 dark:text-gray-300">
                Tab
              </kbd>{' '}
              Cycle Filters
            </span>
          </div>

          <div className="flex items-center gap-1 text-gray-400">
            <span>Powered by Life Omnisearch</span>
          </div>
        </div>
      </div>
    </div>
  );
};
