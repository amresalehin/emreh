import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Headphones,
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
  Copy,
  Check,
  Tag,
  StickyNote,
  TrendingUp,
  X,
  Filter,
  ArrowUpDown,
  Grid,
  Layers,
  Sun,
  Moon,
  Coffee,
  Sunset,
  Disc,
  Music,
  User,
  Share2,
  Volume2
} from 'lucide-react';
import { SpotifyViewMenu, SpotifyCombinedMode } from './spotify/SpotifyViewMenu';
import { SubViewType, TimelineItem, DateRange } from '../../types';
import { TimelineCard } from '../TimelineCard';
import { ViewToolbar } from '../ViewToolbar';
import { SpotifyCoverArt } from '../SpotifyCoverArt';
import { formatDuration, formatTime, parseSpotifyId } from '../../utils/dataParser';
import { fetchAudioPreview } from '../../utils/coverArtService';
import { resolveSpotifyTrackId, getCachedSpotifyTrackId } from '../../utils/spotifyResolver';
import { VirtualizedFeed } from '../virtual/VirtualizedFeed';
import { VirtualizedTable } from '../virtual/VirtualizedTable';
import { useInfiniteHistoricalFeed } from '../../utils/useInfiniteHistoricalFeed';

interface SpotifyViewProps {
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
  onShowTrackProfile: (track: string, artist?: string) => void;
  onShowArtistProfile: (artist: string) => void;
  onImportClick: () => void;
}

export type LayoutMode = 'feed' | 'grid' | 'compact' | 'detailed';
export type SortOption = 'newest' | 'oldest' | 'most_played' | 'longest' | 'title_asc' | 'artist_asc';
export type GroupOption = 'none' | 'time_of_day' | 'artist' | 'album';
export type FilterPreset = 'all' | 'repeated' | 'long_tracks' | 'with_album';

interface GranularSpotifyViewOptions {
  layoutMode: LayoutMode;
  density: 'comfortable' | 'compact' | 'spacious';
  sortBy: SortOption;
  groupBy: GroupOption;
  filterPreset: FilterPreset;
  showAlbumArt: boolean;
  showArtistBadge: boolean;
  showAlbumName: boolean;
  showTimestamp: boolean;
  showDuration: boolean;
  showActionButtons: boolean;
  showPlayCountBadge: boolean;
}

const DEFAULT_VIEW_OPTIONS: GranularSpotifyViewOptions = {
  layoutMode: 'grid',
  density: 'comfortable',
  sortBy: 'newest',
  groupBy: 'none',
  filterPreset: 'all',
  showAlbumArt: true,
  showArtistBadge: true,
  showAlbumName: true,
  showTimestamp: true,
  showDuration: true,
  showActionButtons: true,
  showPlayCountBadge: true
};

// Gradient palette for dynamic album artwork
const ART_GRADIENTS = [
  'from-emerald-900 via-teal-950 to-black',
  'from-green-900 via-emerald-950 to-black',
  'from-teal-900 via-cyan-950 to-black',
  'from-indigo-950 via-emerald-950 to-black',
  'from-emerald-800 via-stone-900 to-black',
  'from-cyan-900 via-emerald-950 to-black',
  'from-slate-900 via-emerald-950 to-black'
];

function getTrackGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % ART_GRADIENTS.length;
  return ART_GRADIENTS[idx];
}

export const SpotifyView: React.FC<SpotifyViewProps> = ({
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
  onShowTrackProfile,
  onShowArtistProfile,
  onImportClick
}) => {
  const [subView, setSubView] = useState<SubViewType>('day');
  const [viewScope, setViewScope] = useState<'day' | 'all'>('all');
  const [filterArtist, setFilterArtist] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Lazy loading / progressive rendering for full history
  const [visibleCount, setVisibleCount] = useState<number>(50);
  const observerTarget = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Right side panel state
  const [selectedTrackItem, setSelectedTrackItem] = useState<TimelineItem | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);
  const [activePanelTab, setActivePanelTab] = useState<'analytics' | 'artist' | 'info' | 'notes'>('analytics');
  const [playerSize, setPlayerSize] = useState<'full' | 'compact'>(() => {
    try {
      return (localStorage.getItem('mylife_spotify_player_size') as 'full' | 'compact') || 'full';
    } catch {
      return 'full';
    }
  });
  const handleSetPlayerSize = (size: 'full' | 'compact') => {
    setPlayerSize(size);
    try {
      localStorage.setItem('mylife_spotify_player_size', size);
    } catch {
      // ignore
    }
  };

  const rightPanelRef = useRef<HTMLDivElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  const [asyncResolvedTrackId, setAsyncResolvedTrackId] = useState<string | null>(null);
  const [isResolvingTrackId, setIsResolvingTrackId] = useState(false);

  const initialTrackId = useMemo(() => {
    if (!selectedTrackItem) return null;
    if (selectedTrackItem.trackId) return selectedTrackItem.trackId;
    if (selectedTrackItem.spotify_track_uri) {
      const parsed = parseSpotifyId(selectedTrackItem.spotify_track_uri);
      if (parsed) return parsed;
    }
    return getCachedSpotifyTrackId(selectedTrackItem.title, selectedTrackItem.subtitle);
  }, [selectedTrackItem]);

  const resolvedTrackId = asyncResolvedTrackId || initialTrackId;

  useEffect(() => {
    if (!selectedTrackItem) {
      setAsyncResolvedTrackId(null);
      setIsResolvingTrackId(false);
      return;
    }

    if (initialTrackId) {
      setAsyncResolvedTrackId(initialTrackId);
      setIsResolvingTrackId(false);
      return;
    }

    let isCurrent = true;
    setIsResolvingTrackId(true);
    resolveSpotifyTrackId(selectedTrackItem.title, selectedTrackItem.subtitle, selectedTrackItem.trackId)
      .then((id) => {
        if (isCurrent) {
          setAsyncResolvedTrackId(id);
          setIsResolvingTrackId(false);
        }
      })
      .catch(() => {
        if (isCurrent) setIsResolvingTrackId(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedTrackItem, initialTrackId]);

  useEffect(() => {
    if (!selectedTrackItem) {
      setAudioPreviewUrl(null);
      return;
    }
    let isCurrent = true;
    fetchAudioPreview(selectedTrackItem.title, selectedTrackItem.subtitle).then(url => {
      if (isCurrent) setAudioPreviewUrl(url);
    });
    return () => {
      isCurrent = false;
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, [selectedTrackItem]);

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

  const [viewOptions, setViewOptions] = useState<GranularSpotifyViewOptions>(() => {
    try {
      const saved = localStorage.getItem('mylife_spotify_view_options');
      return saved ? { ...DEFAULT_VIEW_OPTIONS, ...JSON.parse(saved) } : DEFAULT_VIEW_OPTIONS;
    } catch {
      return DEFAULT_VIEW_OPTIONS;
    }
  });

  // Notes & Tags for track
  const [trackNotes, setTrackNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('mylife_spotify_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [trackTags, setTrackTags] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('mylife_spotify_tags');
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

  const updateViewOption = <K extends keyof GranularSpotifyViewOptions>(key: K, val: GranularSpotifyViewOptions[K]) => {
    setViewOptions(prev => {
      const next = { ...prev, [key]: val };
      try {
        localStorage.setItem('mylife_spotify_view_options', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const resetViewOptions = () => {
    setViewOptions(DEFAULT_VIEW_OPTIONS);
    try {
      localStorage.setItem('mylife_spotify_view_options', JSON.stringify(DEFAULT_VIEW_OPTIONS));
    } catch {
      // ignore
    }
    showToast('Reset view options to default');
  };

  const activeCombinedMode: SpotifyCombinedMode = useMemo(() => {
    if (subView === 'stats') return 'stats';
    if (subView === 'week') return 'week';
    if (subView === 'month') return 'month';
    if (subView === 'log') return 'table';
    if (viewOptions.layoutMode === 'feed') return 'feed';
    if (viewOptions.layoutMode === 'compact') return 'compact';
    return 'grid';
  }, [subView, viewOptions.layoutMode]);

  const handleCombinedModeChange = (mode: SpotifyCombinedMode) => {
    if (mode === 'stats') {
      setSubView('stats');
    } else if (mode === 'week') {
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
  const spotifyItemsAll = useMemo(() => processedData.filter(s => s.type === 'spotify'), [processedData]);

  const getDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Global Track play count & duration stats map
  const trackGlobalStats = useMemo(() => {
    const stats = new Map<string, { count: number; totalMs: number; items: TimelineItem[] }>();
    spotifyItemsAll.forEach(item => {
      const k = `${item.title}___${item.subtitle || ''}`;
      const existing = stats.get(k) || { count: 0, totalMs: 0, items: [] };
      existing.count += 1;
      existing.totalMs += item.ms_played || 0;
      existing.items.push(item);
      stats.set(k, existing);
    });
    return stats;
  }, [spotifyItemsAll]);

  // Global Artist stats map
  const artistGlobalStats = useMemo(() => {
    const stats = new Map<string, { totalPlays: number; totalMs: number; uniqueTracks: Set<string>; items: TimelineItem[] }>();
    spotifyItemsAll.forEach(item => {
      const art = item.subtitle || 'Unknown Artist';
      const existing = stats.get(art) || { totalPlays: 0, totalMs: 0, uniqueTracks: new Set<string>(), items: [] };
      existing.totalPlays += 1;
      existing.totalMs += item.ms_played || 0;
      existing.uniqueTracks.add(item.title);
      existing.items.push(item);
      stats.set(art, existing);
    });
    return stats;
  }, [spotifyItemsAll]);

  // All unique artists for filtering
  const allArtists = useMemo(() => {
    return Array.from(
      new Set(spotifyItemsAll.map(d => d.subtitle).filter(Boolean))
    ).sort();
  }, [spotifyItemsAll]);

  // Total library listening duration
  const totalLibraryListeningMs = useMemo(() => {
    return spotifyItemsAll.reduce((acc, curr) => acc + (curr.ms_played || 0), 0);
  }, [spotifyItemsAll]);

  // 1. Day / Range Items
  const dayKey = getDateKey(currentDate);
  const rawDayStreams = useMemo(() => {
    if (dateRange) {
      return processedData.filter(s => {
        if (s.type !== 'spotify') return false;
        const k = s.ts.slice(0, 10);
        return k >= dateRange.startDate && k <= dateRange.endDate;
      });
    }
    return (dateIndexMap.get(dayKey) || []).filter(s => s.type === 'spotify');
  }, [dateRange, processedData, dateIndexMap, dayKey]);

  // Active dataset according to viewScope (day vs all history)
  const baseStreams = viewScope === 'day' ? rawDayStreams : spotifyItemsAll;

  // Filtered & Sorted items for the left panel
  const displayStreams = useMemo(() => {
    let list = baseStreams.filter(item => {
      if (filterArtist !== 'all' && item.subtitle !== filterArtist) return false;
      if (q) {
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchArtist = (item.subtitle || '').toLowerCase().includes(q);
        const matchAlbum = (item.album || '').toLowerCase().includes(q);
        const tagsKey = `${item.title}___${item.subtitle || ''}`;
        const tags = trackTags[tagsKey] || [];
        const matchTags = tags.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchArtist && !matchAlbum && !matchTags) return false;
      }
      if (viewOptions.filterPreset === 'repeated') {
        const key = `${item.title}___${item.subtitle || ''}`;
        const stat = trackGlobalStats.get(key);
        if (!stat || stat.count <= 1) return false;
      }
      if (viewOptions.filterPreset === 'long_tracks') {
        if ((item.ms_played || 0) < 180000) return false; // less than 3 mins
      }
      if (viewOptions.filterPreset === 'with_album') {
        if (!item.album) return false;
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
      if (viewOptions.sortBy === 'most_played') {
        const countA = trackGlobalStats.get(`${a.title}___${a.subtitle || ''}`)?.count || 0;
        const countB = trackGlobalStats.get(`${b.title}___${b.subtitle || ''}`)?.count || 0;
        return countB - countA;
      }
      if (viewOptions.sortBy === 'longest') {
        return (b.ms_played || 0) - (a.ms_played || 0);
      }
      if (viewOptions.sortBy === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (viewOptions.sortBy === 'artist_asc') {
        return (a.subtitle || '').localeCompare(b.subtitle || '');
      }
      return 0;
    });

    return list;
  }, [baseStreams, filterArtist, q, viewOptions.filterPreset, viewOptions.sortBy, trackGlobalStats, trackTags]);

  // Keep a selected track if one is available
  useEffect(() => {
    if (!selectedTrackItem && displayStreams.length > 0) {
      setSelectedTrackItem(displayStreams[0]);
    } else if (selectedTrackItem && !spotifyItemsAll.some(i => i.id === selectedTrackItem.id)) {
      setSelectedTrackItem(displayStreams[0] || null);
    }
  }, [displayStreams, selectedTrackItem, spotifyItemsAll]);

  // Selected track analytics & occurrences
  const selectedTrackMetrics = useMemo(() => {
    if (!selectedTrackItem) return null;
    const trackKey = `${selectedTrackItem.title}___${selectedTrackItem.subtitle || ''}`;
    const allOccurrences = spotifyItemsAll.filter(
      item => `${item.title}___${item.subtitle || ''}` === trackKey
    );
    allOccurrences.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    const totalPlays = allOccurrences.length;
    const totalDurationMs = allOccurrences.reduce((acc, curr) => acc + (curr.ms_played || 0), 0);
    const firstPlayedDate = allOccurrences[allOccurrences.length - 1]?.ts
      ? new Date(allOccurrences[allOccurrences.length - 1].ts)
      : null;
    const lastPlayedDate = allOccurrences[0]?.ts ? new Date(allOccurrences[0].ts) : null;

    // Time of day breakdown
    const hourBuckets = {
      morning: 0,   // 05:00 - 11:59
      afternoon: 0, // 12:00 - 16:59
      evening: 0,   // 17:00 - 21:59
      night: 0      // 22:00 - 04:59
    };

    allOccurrences.forEach(item => {
      const d = item.dateObj || new Date(item.ts);
      const h = d.getHours();
      if (h >= 5 && h < 12) hourBuckets.morning += 1;
      else if (h >= 12 && h < 17) hourBuckets.afternoon += 1;
      else if (h >= 17 && h < 22) hourBuckets.evening += 1;
      else hourBuckets.night += 1;
    });

    // Unique days played on
    const uniqueDays = new Set(allOccurrences.map(item => item.ts.slice(0, 10)));
    const avgPlaysPerDay = (totalPlays / Math.max(1, uniqueDays.size)).toFixed(1);

    // Percentage of all Spotify history
    const percentageOfAll = ((totalPlays / (spotifyItemsAll.length || 1)) * 100).toFixed(1);

    const spotifyUrl = selectedTrackItem.titleUrl || (selectedTrackItem.trackId
      ? `https://open.spotify.com/track/${selectedTrackItem.trackId}`
      : `https://open.spotify.com/search/${encodeURIComponent(`${selectedTrackItem.title} ${selectedTrackItem.subtitle || ''}`)}`);

    // Artist Stats
    const artist = selectedTrackItem.subtitle || 'Unknown Artist';
    const artistData = artistGlobalStats.get(artist);
    const artistTotalPlays = artistData ? artistData.totalPlays : totalPlays;
    const artistUniqueTracks = artistData ? artistData.uniqueTracks.size : 1;

    return {
      title: selectedTrackItem.title,
      artist,
      album: selectedTrackItem.album,
      trackId: selectedTrackItem.trackId,
      spotifyUrl,
      trackKey,
      totalPlays,
      totalDurationMs,
      firstPlayedDate,
      lastPlayedDate,
      hourBuckets,
      uniqueDaysCount: uniqueDays.size,
      avgPlaysPerDay,
      percentageOfAll,
      artistTotalPlays,
      artistUniqueTracks,
      allOccurrences
    };
  }, [selectedTrackItem, spotifyItemsAll, artistGlobalStats]);

  // Selected Artist deep dive
  const selectedArtistMetrics = useMemo(() => {
    if (!selectedTrackItem?.subtitle) return null;
    const artist = selectedTrackItem.subtitle;
    const stat = artistGlobalStats.get(artist);
    if (!stat) return null;

    // Group tracks by this artist and sort by play count
    const trackMap = new Map<string, { title: string; count: number; totalMs: number; sampleItem: TimelineItem }>();
    stat.items.forEach(item => {
      const existing = trackMap.get(item.title) || { title: item.title, count: 0, totalMs: 0, sampleItem: item };
      existing.count += 1;
      existing.totalMs += item.ms_played || 0;
      trackMap.set(item.title, existing);
    });

    const topTracks = Array.from(trackMap.values()).sort((a, b) => b.count - a.count);

    return {
      artist,
      totalPlays: stat.totalPlays,
      totalDurationMs: stat.totalMs,
      uniqueTracksCount: stat.uniqueTracks.size,
      topTracks
    };
  }, [selectedTrackItem, artistGlobalStats]);

  // Infinite chunked feed for 60fps scrolling & memory efficiency
  const infiniteFeed = useInfiniteHistoricalFeed<TimelineItem>({
    items: displayStreams,
    chunkSize: 60,
    initialCount: 60,
    resetDependencies: [filterArtist, q, viewOptions.filterPreset, viewOptions.sortBy, viewScope]
  });

  // Lazily sliced streams to keep DOM and memory lightweight
  const visibleStreams = infiniteFeed.visibleItems;

  // Helper for grouping items
  const groupedStreams = useMemo(() => {
    if (viewOptions.groupBy === 'none') {
      return [{ groupName: '', items: visibleStreams }];
    }

    if (viewOptions.groupBy === 'time_of_day') {
      const groups: Record<string, TimelineItem[]> = {
        'Morning (05:00 - 12:00)': [],
        'Afternoon (12:00 - 17:00)': [],
        'Evening (17:00 - 22:00)': [],
        'Night (22:00 - 05:00)': []
      };
      visibleStreams.forEach(item => {
        const d = item.dateObj || new Date(item.ts);
        const h = d.getHours();
        if (h >= 5 && h < 12) groups['Morning (05:00 - 12:00)'].push(item);
        else if (h >= 12 && h < 17) groups['Afternoon (12:00 - 17:00)'].push(item);
        else if (h >= 17 && h < 22) groups['Evening (17:00 - 22:00)'].push(item);
        else groups['Night (22:00 - 05:00)'].push(item);
      });
      return Object.entries(groups)
        .filter(([_, items]) => items.length > 0)
        .map(([groupName, items]) => ({ groupName, items }));
    }

    if (viewOptions.groupBy === 'artist') {
      const groups = new Map<string, TimelineItem[]>();
      visibleStreams.forEach(item => {
        const art = item.subtitle || 'Unknown Artist';
        if (!groups.has(art)) groups.set(art, []);
        groups.get(art)!.push(item);
      });
      return Array.from(groups.entries()).map(([groupName, items]) => ({ groupName, items }));
    }

    if (viewOptions.groupBy === 'album') {
      const groups = new Map<string, TimelineItem[]>();
      visibleStreams.forEach(item => {
        const alb = item.album || 'Single / Unknown Album';
        if (!groups.has(alb)) groups.set(alb, []);
        groups.get(alb)!.push(item);
      });
      return Array.from(groups.entries()).map(([groupName, items]) => ({ groupName, items }));
    }

    return [{ groupName: '', items: visibleStreams }];
  }, [visibleStreams, viewOptions.groupBy]);

  // Virtual groups formatted for VirtualizedFeed
  const virtualStreamGroups = useMemo(() => {
    return groupedStreams.map(g => ({
      key: g.groupName || 'all',
      title: g.groupName,
      items: g.items
    }));
  }, [groupedStreams]);

  // Note & Tag handlers
  const handleSaveNote = (text: string) => {
    if (!selectedTrackItem) return;
    const key = `${selectedTrackItem.title}___${selectedTrackItem.subtitle || ''}`;
    const next = { ...trackNotes, [key]: text };
    setTrackNotes(next);
    try {
      localStorage.setItem('mylife_spotify_notes', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = tagInput.trim().replace(/^#/, '');
    if (!cleanTag || !selectedTrackItem) return;
    const key = `${selectedTrackItem.title}___${selectedTrackItem.subtitle || ''}`;
    const existing = trackTags[key] || [];
    if (!existing.includes(cleanTag)) {
      const next = { ...trackTags, [key]: [...existing, cleanTag] };
      setTrackTags(next);
      try {
        localStorage.setItem('mylife_spotify_tags', JSON.stringify(next));
      } catch {
        // ignore
      }
      showToast(`Tag #${cleanTag} added`);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedTrackItem) return;
    const key = `${selectedTrackItem.title}___${selectedTrackItem.subtitle || ''}`;
    const existing = trackTags[key] || [];
    const next = { ...trackTags, [key]: existing.filter(t => t !== tagToRemove) };
    setTrackTags(next);
    try {
      localStorage.setItem('mylife_spotify_tags', JSON.stringify(next));
    } catch {
      // ignore
    }
    showToast(`Removed #${tagToRemove}`);
  };

  // Copy URL & Markdown
  const handleCopyUrl = () => {
    if (!selectedTrackMetrics?.spotifyUrl) return;
    navigator.clipboard.writeText(selectedTrackMetrics.spotifyUrl).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
      showToast('Spotify link copied to clipboard');
    }).catch(() => {
      // Clipboard API can reject (denied permission, insecure context, etc.)
      // — surface that instead of silently doing nothing.
      showToast('Could not copy — clipboard access was blocked');
    });
  };

  const handleCopyMarkdown = () => {
    if (!selectedTrackMetrics) return;
    const md = `[${selectedTrackMetrics.title} - ${selectedTrackMetrics.artist}](${selectedTrackMetrics.spotifyUrl})`;
    navigator.clipboard.writeText(md).then(() => {
      setCopyMdFeedback(true);
      setTimeout(() => setCopyMdFeedback(false), 2000);
      showToast('Markdown link copied to clipboard');
    }).catch(() => {
      showToast('Could not copy — clipboard access was blocked');
    });
  };

  const handleSelectCard = (item: TimelineItem) => {
    setSelectedTrackItem(item);
    setIsRightPanelOpen(true);
    if (rightPanelRef.current) {
      rightPanelRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Helper for rendering customized Spotify Card (matching YouTube's visual richness)
  const renderCustomSpotifyCard = (item: TimelineItem) => {
    const isSelected = selectedTrackItem?.id === item.id || selectedTrackItem?.title === item.title;
    const globalCount = trackGlobalStats.get(`${item.title}___${item.subtitle || ''}`)?.count || 1;
    const durationStr = formatDuration(item.ms_played);
    const timeStr = item.dateObj ? formatTime(item.dateObj) : '';
    const dateStr = item.dateObj
      ? item.dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : '';
    const tagsKey = `${item.title}___${item.subtitle || ''}`;
    const tags = trackTags[tagsKey] || [];
    const gradient = getTrackGradient(item.title);
    const spotifyUrl = item.titleUrl || (item.trackId
      ? `https://open.spotify.com/track/${item.trackId}`
      : `https://open.spotify.com/search/${encodeURIComponent(`${item.title} ${item.subtitle || ''}`)}`);

    // Compact layout mode
    if (viewOptions.layoutMode === 'compact') {
      return (
        <div
          key={item.id}
          onClick={() => handleSelectCard(item)}
          className={`flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
            isSelected
              ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-xs'
              : 'border-gray-200 dark:border-gray-800 hover:border-emerald-500/40 bg-white dark:bg-[#121212]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {viewOptions.showAlbumArt && (
              <SpotifyCoverArt
                title={item.title}
                artist={item.subtitle}
                album={item.album}
                trackId={item.trackId}
                size="xs"
                className="w-9 h-9 rounded-lg shrink-0 border border-white/10 shadow-2xs"
              />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate" title={item.title}>
                {item.title}
              </h4>
              <p
                onClick={(e) => {
                  e.stopPropagation();
                  onShowArtistProfile(item.subtitle);
                }}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate hover:underline cursor-pointer"
              >
                {item.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs font-mono text-gray-400 flex-wrap justify-end">
            {globalCount > 1 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {globalCount} plays
              </span>
            )}
            {durationStr && <span className="text-gray-400 text-[11px]">{durationStr}</span>}
            {dateStr && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/90 px-1.5 py-0.5 rounded-md">
                <CalendarIcon className="w-3 h-3 text-emerald-500" />
                {dateStr}
              </span>
            )}
            {timeStr && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                <Clock className="w-3 h-3 text-emerald-500" />
                {timeStr}
              </span>
            )}
            <a
              href={spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-lg text-gray-400 hover:text-emerald-500 transition-colors"
              title="Open on Spotify"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      );
    }

    // Grid layout mode (Rich visual artwork card matching YouTube style)
    if (viewOptions.layoutMode === 'grid') {
      return (
        <div
          key={item.id}
          onClick={() => handleSelectCard(item)}
          className={`flex flex-col bg-white/60 dark:bg-black/35 backdrop-blur-md rounded-2xl overflow-hidden cursor-pointer transition-all border group ${
            isSelected
              ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/20 shadow-sm'
              : 'border-white/20 dark:border-white/10 hover:border-emerald-500/40 hover:shadow-xs'
          } ${viewOptions.density === 'compact' ? 'p-2.5' : viewOptions.density === 'spacious' ? 'p-4' : 'p-3'}`}
        >
          {viewOptions.showAlbumArt && (
            <div className="relative aspect-square rounded-xl overflow-hidden mb-2.5 shrink-0 border border-gray-100 dark:border-gray-800/80 flex flex-col justify-between p-3 shadow-inner group">
              <SpotifyCoverArt
                title={item.title}
                artist={item.subtitle}
                album={item.album}
                trackId={item.trackId}
                size="md"
                className="absolute inset-0 w-full h-full"
                imgClassName="group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40 pointer-events-none" />

              {/* Top Row: Spotify Pill & Repeat count badge */}
              <div className="flex items-center justify-between z-10 relative">
                <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[9px] font-bold text-emerald-400 flex items-center gap-1 border border-emerald-500/20 shadow-xs">
                  <Headphones className="w-2.5 h-2.5" /> Spotify
                </span>
                {viewOptions.showPlayCountBadge && globalCount > 1 && (
                  <div className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-bold text-white font-mono border border-white/10 shadow-xs">
                    {globalCount} plays
                  </div>
                )}
              </div>

              {/* Center Play Button on Hover */}
              <div className="flex items-center justify-center z-10 relative my-auto">
                <div className="w-10 h-10 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
                  <Play className="w-4 h-4 ml-0.5" />
                </div>
              </div>

              {/* Bottom Row inside banner: Album Name & Duration */}
              <div className="flex items-center justify-between text-[10px] text-white/90 font-mono z-10 relative">
                <span className="truncate max-w-[140px] drop-shadow-md font-sans font-medium text-gray-200">
                  {item.album || 'Single'}
                </span>
                <span className="bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] text-emerald-300 font-bold border border-white/10">
                  {durationStr}
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-between space-y-2">
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-emerald-500 transition-colors" title={item.title}>
                {item.title}
              </h4>
              {viewOptions.showArtistBadge && (
                <p
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowArtistProfile(item.subtitle);
                  }}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate mt-1 hover:underline cursor-pointer"
                >
                  {item.subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-gray-800/80 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
              <div className="flex items-center gap-1.5 flex-wrap">
                {dateStr && (
                  <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 font-semibold bg-gray-100 dark:bg-gray-800/80 px-1.5 py-0.5 rounded">
                    <CalendarIcon className="w-2.5 h-2.5 text-emerald-500" />
                    {dateStr}
                  </span>
                )}
                {timeStr && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <Clock className="w-2.5 h-2.5 text-emerald-500" />
                    {timeStr}
                  </span>
                )}
              </div>
              {viewOptions.showActionButtons && (
                <a
                  href={spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 text-gray-400 hover:text-emerald-500 transition-colors"
                  title="Open on Spotify"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Standard Feed Mode
    return (
      <div
        key={item.id}
        onClick={() => handleSelectCard(item)}
        className={`bg-white/60 dark:bg-black/35 backdrop-blur-md rounded-2xl cursor-pointer transition-all border group ${
          isSelected
            ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/20 shadow-sm'
            : 'border-white/20 dark:border-white/10 hover:border-emerald-500/40 hover:shadow-xs'
        } ${viewOptions.density === 'compact' ? 'p-2.5 space-y-1.5' : viewOptions.density === 'spacious' ? 'p-4 space-y-3' : 'p-3 space-y-2'}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Headphones className="w-3 h-3" /> Spotify
            </span>
            {viewOptions.showArtistBadge && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onShowArtistProfile(item.subtitle);
                }}
                className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 truncate max-w-[140px] hover:text-emerald-500 hover:underline cursor-pointer"
              >
                {item.subtitle}
              </span>
            )}
            {viewOptions.showPlayCountBadge && globalCount > 1 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                {globalCount} plays
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 dark:text-gray-400 flex-wrap justify-end">
            {viewOptions.showDuration && <span className="text-gray-400">{durationStr}</span>}
            {dateStr && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 font-semibold">
                <CalendarIcon className="w-2.5 h-2.5 text-emerald-500" /> {dateStr}
              </span>
            )}
            {timeStr && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Clock className="w-2.5 h-2.5 text-emerald-500" /> {timeStr}
              </span>
            )}
            {viewOptions.showActionButtons && (
              <a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 text-gray-400 hover:text-emerald-500 transition-colors cursor-pointer"
                title="Open on Spotify"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        <div className="flex gap-3 items-start">
          {viewOptions.showAlbumArt && (
            <div className="w-16 h-16 sm:w-18 sm:h-18 aspect-square rounded-xl overflow-hidden relative shrink-0 border border-gray-100 dark:border-gray-800 shadow-inner group-hover:scale-102 transition-transform">
              <SpotifyCoverArt
                title={item.title}
                artist={item.subtitle}
                album={item.album}
                trackId={item.trackId}
                size="sm"
                className="w-full h-full"
                imgClassName="group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4
              className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-emerald-500 transition-colors"
              title={item.title}
            >
              {item.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onShowArtistProfile(item.subtitle);
                }}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate cursor-pointer hover:underline"
              >
                {item.subtitle}
              </span>
              {item.album && (
                <span className="text-[10px] text-gray-400 truncate max-w-[140px]">
                  • {item.album}
                </span>
              )}
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

  // If no Spotify data at all
  if (spotifyItemsAll.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/20 dark:bg-black/25 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-emerald-500/25 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="p-4 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-4 shadow-lg animate-pulse">
          <Headphones className="w-12 h-12" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight">
          No Spotify History Loaded
        </h3>
        <p className="text-xs text-gray-300 dark:text-gray-300 max-w-sm mb-6 leading-relaxed">
          Import your Spotify streaming history JSON to view listening habits, top tracks, artists, and statistics.
        </p>
        <button
          onClick={onImportClick}
          className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Upload className="w-4 h-4" /> Import Spotify History
        </button>
      </div>
    );
  }

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
            {subView === 'day'
              ? `${displayStreams.length} ${viewScope === 'day' ? 'today' : 'tracks'}`
              : `${spotifyItemsAll.length.toLocaleString()} total`}
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
        searchPlaceholder="Search tracks, artists..."
        searchResultsCount={q ? displayStreams.length : undefined}
        onImportClick={onImportClick}
        importLabel="Import"
        leftActions={
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Day vs All Scope Toggle */}
            <div className="flex bg-[#1a1a1a]/5 dark:bg-white/5 p-0.5 rounded-md border border-[#1a1a1a]/10 dark:border-white/10 text-xs">
              <button
                onClick={() => setViewScope('day')}
                className={`px-2.5 py-0.5 font-medium rounded transition-all cursor-pointer ${
                  viewScope === 'day'
                    ? 'bg-white dark:bg-[#18181b] shadow-2xs text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-[#71717a] hover:text-[#1a1a1a] dark:hover:text-stone-200'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewScope('all')}
                className={`px-2.5 py-0.5 font-medium rounded transition-all cursor-pointer ${
                  viewScope === 'all'
                    ? 'bg-white dark:bg-[#18181b] shadow-2xs text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-[#71717a] hover:text-[#1a1a1a] dark:hover:text-stone-200'
                }`}
              >
                All
              </button>
            </div>

            {/* Subview switcher */}
            <div className="flex bg-[#1a1a1a]/5 dark:bg-white/5 p-0.5 rounded-md border border-[#1a1a1a]/10 dark:border-white/10 text-xs">
              <button
                onClick={() => setSubView('day')}
                className={`px-2 py-0.5 font-medium rounded transition-all cursor-pointer ${
                  subView === 'day'
                    ? 'bg-white dark:bg-[#18181b] shadow-2xs text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-[#71717a] hover:text-[#1a1a1a]'
                }`}
              >
                Streams
              </button>
              <button
                onClick={() => setSubView('top_artists')}
                className={`px-2 py-0.5 font-medium rounded transition-all cursor-pointer ${
                  subView === 'top_artists'
                    ? 'bg-white dark:bg-[#18181b] shadow-2xs text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-[#71717a] hover:text-[#1a1a1a]'
                }`}
              >
                Artists
              </button>
              <button
                onClick={() => setSubView('albums')}
                className={`px-2 py-0.5 font-medium rounded transition-all cursor-pointer ${
                  subView === 'albums'
                    ? 'bg-white dark:bg-[#18181b] shadow-2xs text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-[#71717a] hover:text-[#1a1a1a]'
                }`}
              >
                Albums
              </button>
            </div>
          </div>
        }
        rightActions={
          <div className="flex items-center gap-1.5">
            <SpotifyViewMenu
              activeMode={activeCombinedMode}
              onChangeMode={handleCombinedModeChange}
              cardLimit={cardLimit}
              onChangeCardLimit={limit => {
                setCardLimit(limit);
                if (limit === 'all') {
                  setVisibleCount(displayStreams.length);
                } else {
                  setVisibleCount(parseInt(limit, 10) || 48);
                }
              }}
              gridDensity={gridDensity}
              onChangeGridDensity={setGridDensity}
              totalFilteredCount={displayStreams.length}
              displayOptions={{
                showAlbumArt: viewOptions.showAlbumArt,
                showArtistBadge: viewOptions.showArtistBadge,
                showAlbumName: viewOptions.showAlbumName,
                showDuration: viewOptions.showDuration,
                showTimestamp: viewOptions.showTimestamp,
                showPlayCountBadge: viewOptions.showPlayCountBadge,
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
            <button
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isRightPanelOpen
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-white dark:bg-[#18181b] text-gray-700 dark:text-gray-300 border-gray-200/90 dark:border-white/10 hover:text-black dark:hover:text-white'
              }`}
              title={isRightPanelOpen ? 'Hide Analytics Panel' : 'Open Analytics Panel'}
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">{isRightPanelOpen ? 'Hide Panel' : 'Panel'}</span>
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-2.5">
          {/* Artist Filter Dropdown */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs shadow-2xs">
            <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <select
              value={filterArtist}
              onChange={(e) => setFilterArtist(e.target.value)}
              className="bg-transparent text-gray-700 dark:text-gray-300 font-semibold outline-none cursor-pointer text-xs max-w-[130px] sm:max-w-[170px] truncate"
              title="Filter by Artist"
            >
              <option value="all">All Artists ({allArtists.length})</option>
              {allArtists.map(art => (
                <option key={art} value={art}>
                  {art}
                </option>
              ))}
            </select>
            {filterArtist !== 'all' && (
              <button
                onClick={() => setFilterArtist('all')}
                className="text-emerald-500 hover:text-emerald-700 font-bold px-1 rounded-md hover:bg-emerald-500/10 cursor-pointer"
                title="Clear artist filter"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Preset */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <select
              value={viewOptions.filterPreset}
              onChange={(e) => updateViewOption('filterPreset', e.target.value as FilterPreset)}
              className="bg-transparent text-gray-700 dark:text-gray-300 font-semibold outline-none cursor-pointer text-xs"
              title="Filter Presets"
            >
              <option value="all">All Tracks</option>
              <option value="repeated">Repeated (&gt;1)</option>
              <option value="long_tracks">Long (&gt;3m)</option>
              <option value="with_album">With Album</option>
            </select>
          </div>
        </div>
      </ViewToolbar>

      {/* Main Split Body: Left Panel (List/Feed/Grid) & Right Panel (Detailed Analytics) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Side: Track List with Subviews */}
        <div
          className={`flex flex-col min-h-0 overflow-hidden transition-all ${
            isRightPanelOpen
              ? 'w-full lg:w-3/5 xl:w-7/12 border-b lg:border-b-0 lg:border-r border-black/8 dark:border-white/10'
              : 'w-full'
          }`}
        >
          {/* Subview Contents (Ref attached to scrolling element for 60fps virtualization) */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-4">
            {/* Day / Feed / Grid Subview */}
            {subView === 'day' && (
              <>
                {displayStreams.length === 0 ? (
                  <div className="text-center py-16 text-xs text-gray-400 space-y-2">
                    <Headphones className="w-8 h-8 mx-auto opacity-30 text-gray-400" />
                    <div>
                      {q
                        ? `No tracks match "${searchQuery}".`
                        : 'No Spotify history recorded for this date or filter. Use the controls above to navigate.'}
                    </div>
                  </div>
                ) : (
                  <VirtualizedFeed<TimelineItem>
                    containerRef={scrollContainerRef}
                    groups={virtualStreamGroups}
                    layoutMode={viewOptions.layoutMode}
                    gridDensity={gridDensity}
                    isRightPanelOpen={isRightPanelOpen}
                    renderItem={(item) => renderCustomSpotifyCard(item)}
                    hasMore={infiniteFeed.hasMore}
                    isLoadingMore={infiniteFeed.isLoadingMore}
                    onLoadMore={infiniteFeed.loadNextChunk}
                    themeColor="emerald"
                    renderHeader={(title, count) => (
                      <div className="flex items-center gap-2 pt-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                          {title}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-mono">
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
                  let streams = (dateIndexMap.get(key) || []).filter(s => s.type === 'spotify');
                  if (filterArtist !== 'all') {
                    streams = streams.filter(s => s.subtitle === filterArtist);
                  }
                  if (q) {
                    streams = streams.filter(
                      s =>
                        (s.title || '').toLowerCase().includes(q) ||
                        (s.subtitle || '').toLowerCase().includes(q)
                    );
                  }
                  return { date: d, key, isToday, isSelected, streams };
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
                              ? 'bg-emerald-500/10'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
                          }`}
                        >
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {wd.date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div
                            className={`text-sm font-bold mt-0.5 ${
                              wd.isToday ? 'text-emerald-500' : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {wd.date.getDate()}
                          </div>
                          <div className="text-[9px] text-gray-400 mt-0.5 font-mono">
                            {wd.streams.length} plays
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 grid grid-cols-7 overflow-y-auto min-h-0 divide-x divide-gray-100 dark:divide-gray-800/40 pt-2">
                      {weekDays.map(wd => (
                        <div
                          key={wd.key}
                          className={`p-1.5 border-r border-gray-200 dark:border-gray-800 last:border-0 flex flex-col space-y-2 ${
                            wd.isSelected ? 'bg-emerald-500/5' : ''
                          }`}
                        >
                          {wd.streams.length === 0 ? (
                            <div className="text-center py-6 text-[10px] text-gray-400">Empty</div>
                          ) : (
                            wd.streams.map(s => (
                              <div
                                key={s.id}
                                onClick={() => handleSelectCard(s)}
                                className="p-2 rounded-xl bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 hover:border-emerald-500/40 text-left transition-all cursor-pointer shadow-2xs space-y-1"
                              >
                                <div className="text-[11px] font-bold text-gray-900 dark:text-white truncate">
                                  {s.title}
                                </div>
                                <div className="text-[10px] text-emerald-500 font-medium truncate">
                                  {s.subtitle}
                                </div>
                                <div className="text-[9px] text-gray-400 font-mono flex justify-between">
                                  <span>{formatDuration(s.ms_played)}</span>
                                  <span>{s.dateObj ? formatTime(s.dateObj) : ''}</span>
                                </div>
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
                        let streams = (dateIndexMap.get(dateKey) || []).filter(
                          s => s.type === 'spotify'
                        );
                        if (filterArtist !== 'all') {
                          streams = streams.filter(s => s.subtitle === filterArtist);
                        }
                        if (q) {
                          streams = streams.filter(
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
                                ? 'bg-emerald-500/10'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                            } transition-colors cursor-pointer min-h-[90px]`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span
                                className={`text-xs font-semibold ${
                                  isToday
                                    ? 'bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-xs'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {day}
                              </span>
                              {streams.length > 0 && (
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded-full font-bold font-mono">
                                  {streams.length}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 overflow-hidden">
                              {streams.slice(0, 2).map((s) => (
                                <div
                                  key={s.id}
                                  className="text-[10px] truncate text-gray-500 dark:text-gray-400"
                                >
                                  {s.title}
                                </div>
                              ))}
                              {streams.length > 2 && (
                                <div className="text-[9px] text-gray-400 font-mono">
                                  +{streams.length - 2} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            )}

            {/* Log / Table Subview */}
            {subView === 'log' && (
              (() => {
                let data = [...spotifyItemsAll];
                if (filterArtist !== 'all') {
                  data = data.filter(d => d.subtitle === filterArtist);
                }
                if (q) {
                  data = data.filter(
                    d =>
                      (d.title || '').toLowerCase().includes(q) ||
                      (d.subtitle || '').toLowerCase().includes(q) ||
                      (d.album || '').toLowerCase().includes(q)
                  );
                }
                data.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

                return (
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap gap-3 justify-between items-center bg-gray-50/50 dark:bg-white/5 shrink-0">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Showing {data.length.toLocaleString()} of {spotifyItemsAll.length.toLocaleString()} records
                      </span>
                      <div className="text-xs font-mono text-gray-400">
                        Click row to inspect track
                      </div>
                    </div>
                    <div ref={logContainerRef} className="flex-1 overflow-y-auto min-h-0">
                      <VirtualizedTable<TimelineItem>
                        containerRef={logContainerRef}
                        items={data}
                        colSpan={5}
                        estimateRowHeight={48}
                        themeColor="emerald"
                        tableClassName="w-full text-left border-collapse"
                        renderHeader={() => (
                          <tr className="border-b border-gray-200 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/90 dark:bg-gray-900/90">
                            <th className="px-4 py-2">Timestamp</th>
                            <th className="px-4 py-2">Track</th>
                            <th className="px-4 py-2">Artist</th>
                            <th className="px-4 py-2">Album</th>
                            <th className="px-4 py-2 text-right">Duration</th>
                          </tr>
                        )}
                        renderRow={(item) => {
                          const dateStr = new Date(item.ts).toLocaleString();
                          const duration = formatDuration(item.ms_played);
                          const isSelected = selectedTrackItem?.id === item.id;

                          return (
                            <tr
                              key={item.id}
                              onClick={() => handleSelectCard(item)}
                              className={`transition-colors border-b border-gray-100 dark:border-gray-800/60 cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500/10'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
                              }`}
                            >
                              <td
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onJumpToDate(new Date(item.ts));
                                  setSubView('day');
                                }}
                                className="px-4 py-2.5 text-xs text-emerald-500 font-medium whitespace-nowrap cursor-pointer hover:underline font-mono"
                                title="Jump to day"
                              >
                                {dateStr}
                              </td>
                              <td className="px-4 py-2.5 text-xs font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                                <div className="flex items-center gap-2">
                                  <SpotifyCoverArt
                                    title={item.title}
                                    artist={item.subtitle}
                                    album={item.album}
                                    trackId={item.trackId}
                                    size="xs"
                                    className="w-7 h-7 rounded-md shrink-0 border border-white/10 shadow-2xs"
                                  />
                                  <span className="truncate">{item.title}</span>
                                </div>
                              </td>
                              <td
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onShowArtistProfile(item.subtitle);
                                }}
                                className="px-4 py-2.5 text-xs font-semibold text-emerald-500 truncate max-w-xs cursor-pointer hover:underline"
                              >
                                {item.subtitle}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-400 truncate max-w-xs">
                                {item.album || '—'}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap font-mono text-right">
                                {duration}
                              </td>
                            </tr>
                          );
                        }}
                      />
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Right Detail Analytics Inspector Panel (Exact YouTube Architecture) */}
        {isRightPanelOpen && selectedTrackItem && selectedTrackMetrics && (
          <div ref={rightPanelRef} className="w-full lg:w-2/5 xl:w-5/12 bg-white/75 dark:bg-[#121214]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-[#121214]/75 flex flex-col min-h-0 overflow-y-auto border-l border-black/8 dark:border-white/10">
            {/* Header with Eyebrow, Title, Actions */}
            <div className="p-4 sm:p-5 border-b border-black/8 dark:border-white/10 bg-white/80 dark:bg-[#121214]/90 backdrop-blur-xl sticky top-0 z-20 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Spotify Web Player & Analytics
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                      Streamed {selectedTrackMetrics.totalPlays} time{selectedTrackMetrics.totalPlays !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white line-clamp-2" title={selectedTrackMetrics.title}>
                    {selectedTrackMetrics.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setActivePanelTab('artist')}
                      className="text-xs font-semibold text-emerald-500 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <User className="w-3 h-3" />
                      <span>{selectedTrackMetrics.artist}</span>
                    </button>
                    {selectedTrackMetrics.album && (
                      <span className="text-xs text-gray-400 truncate">
                        • {selectedTrackMetrics.album}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setIsRightPanelOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
                  title="Close Inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons: Copy Link, Markdown, Open on Spotify */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  onClick={handleCopyUrl}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Copy Spotify Link"
                >
                  {copyFeedback ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copyFeedback ? 'Copied' : 'Copy Link'}</span>
                </button>

                <button
                  onClick={handleCopyMarkdown}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Copy Markdown Link"
                >
                  {copyMdFeedback ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copyMdFeedback ? 'Copied MD' : 'Markdown'}</span>
                </button>

                <a
                  href={selectedTrackMetrics.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Open on Spotify</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Direct Embedded Spotify Web Player Section */}
            <div className="p-4 sm:p-5 pb-0 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Spotify Web Player</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Embed
                  </span>
                </div>

                {resolvedTrackId && (
                  <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl text-[10px] font-bold">
                    <button
                      onClick={() => handleSetPlayerSize('full')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        playerSize === 'full'
                          ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      title="Full Player with album artwork, title, and scrubber (352px)"
                    >
                      Full (352px)
                    </button>
                    <button
                      onClick={() => handleSetPlayerSize('compact')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        playerSize === 'compact'
                          ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      title="Compact Player bar (152px)"
                    >
                      Compact (152px)
                    </button>
                  </div>
                )}
              </div>

              {/* Direct Spotify Player Iframe (One-Click Playback) */}
              {resolvedTrackId ? (
                <div className="w-full rounded-2xl overflow-hidden shadow-md border border-emerald-500/30 bg-[#121212] transition-all">
                  <iframe
                    key={resolvedTrackId}
                    src={`https://open.spotify.com/embed/track/${resolvedTrackId}?utm_source=generator&theme=0`}
                    width="100%"
                    height={playerSize === 'compact' ? '152' : '352'}
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="eager"
                    className="w-full block"
                    title={`Spotify Web Player: ${selectedTrackMetrics.title}`}
                  />
                </div>
              ) : isResolvingTrackId ? (
                <div className="w-full h-40 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 dark:bg-[#121212] p-4 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="flex items-center gap-1.5 text-emerald-500">
                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-9 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-7 bg-emerald-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-10 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.2s]" />
                    <span className="w-1.5 h-5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.4s]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">Connecting Spotify Web Player...</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Resolving direct playback stream for {selectedTrackMetrics.title}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-[#121212] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Disc className="w-4 h-4 animate-spin-slow" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Direct Spotify Web Player</h4>
                        <p className="text-[10px] text-gray-400">Instant one-click playback</p>
                      </div>
                    </div>
                    <a
                      href={selectedTrackMetrics.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>Play Now</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                  </div>
                  {/* Embedded Spotify search player iframe */}
                  <div className="w-full rounded-xl overflow-hidden bg-black/50 border border-white/5">
                    <iframe
                      src={`https://open.spotify.com/embed?uri=spotify:search:${encodeURIComponent(selectedTrackMetrics.title + ' ' + selectedTrackMetrics.artist)}`}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="w-full block"
                      title={`Spotify Player: ${selectedTrackMetrics.title}`}
                    />
                  </div>
                </div>
              )}

              {/* Optional 30s Audio Stream Preview below player if available */}
              {audioPreviewUrl && (
                <div className="p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Volume2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-[11px] text-gray-600 dark:text-gray-300 truncate">
                      Quick Audio Snippet (30s)
                    </span>
                  </div>
                  <audio
                    ref={audioPreviewRef}
                    src={audioPreviewUrl}
                    controls
                    className="h-7 max-w-[180px]"
                  />
                </div>
              )}

              {/* Segmented Sub-Tabs */}
              <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl text-xs mt-3">
                <button
                  onClick={() => setActivePanelTab('analytics')}
                  className={`flex-1 py-1.5 px-2 font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activePanelTab === 'analytics'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Analytics</span>
                </button>
                <button
                  onClick={() => setActivePanelTab('artist')}
                  className={`flex-1 py-1.5 px-2 font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activePanelTab === 'artist'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Artist</span>
                </button>
                <button
                  onClick={() => setActivePanelTab('info')}
                  className={`flex-1 py-1.5 px-2 font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activePanelTab === 'info'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'
                  }`}
                >
                  <Disc className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Track Info</span>
                </button>
                <button
                  onClick={() => setActivePanelTab('notes')}
                  className={`flex-1 py-1.5 px-2 font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
                  {/* Core Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-200/80 dark:border-white/10 shadow-2xs">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Times Streamed</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white mt-1 flex items-baseline gap-1.5">
                        <span>{selectedTrackMetrics.totalPlays}</span>
                        <span className="text-[10px] font-medium text-emerald-500 font-mono">
                          ({selectedTrackMetrics.percentageOfAll}% of Spotify)
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-200/80 dark:border-white/10 shadow-2xs">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Artist Total</div>
                      <div className="text-xl font-bold text-emerald-500 mt-1">
                        {selectedTrackMetrics.artistTotalPlays} plays
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-200/80 dark:border-white/10 shadow-2xs">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">First Streamed</div>
                      <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1 truncate">
                        {selectedTrackMetrics.firstPlayedDate
                          ? selectedTrackMetrics.firstPlayedDate.toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-200/80 dark:border-white/10 shadow-2xs">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Streamed</div>
                      <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1 truncate">
                        {selectedTrackMetrics.lastPlayedDate
                          ? selectedTrackMetrics.lastPlayedDate.toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Time of Day Preference (Visual Progress Bars) */}
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-200/80 dark:border-white/10 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Stream Time of Day Preference</span>
                    </span>

                    <div className="space-y-2 text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                            <Coffee className="w-3 h-3 text-amber-500" /> Morning (05-12h)
                          </span>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                            {selectedTrackMetrics.hourBuckets.morning} plays
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-amber-500 h-1.5 rounded-full"
                            style={{ width: `${(selectedTrackMetrics.hourBuckets.morning / Math.max(1, selectedTrackMetrics.totalPlays)) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                            <Sun className="w-3 h-3 text-orange-500" /> Afternoon (12-17h)
                          </span>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                            {selectedTrackMetrics.hourBuckets.afternoon} plays
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-orange-500 h-1.5 rounded-full"
                            style={{ width: `${(selectedTrackMetrics.hourBuckets.afternoon / Math.max(1, selectedTrackMetrics.totalPlays)) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                            <Sunset className="w-3 h-3 text-emerald-500" /> Evening (17-22h)
                          </span>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                            {selectedTrackMetrics.hourBuckets.evening} plays
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${(selectedTrackMetrics.hourBuckets.evening / Math.max(1, selectedTrackMetrics.totalPlays)) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                            <Moon className="w-3 h-3 text-indigo-400" /> Night (22-05h)
                          </span>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                            {selectedTrackMetrics.hourBuckets.night} plays
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full"
                            style={{ width: `${(selectedTrackMetrics.hourBuckets.night / Math.max(1, selectedTrackMetrics.totalPlays)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Full Stream History Timestamps for this Track */}
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-gray-200/80 dark:border-white/10 space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                      Stream History Timestamps ({selectedTrackMetrics.allOccurrences.length})
                    </span>
                    <div className="space-y-1 max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
                      {selectedTrackMetrics.allOccurrences.map((inst, idx) => {
                        const d = new Date(inst.ts);
                        return (
                          <div
                            key={inst.id || idx}
                            onClick={() => {
                              onJumpToDate(d);
                              setSubView('day');
                              showToast(`Jumped to ${d.toLocaleDateString()}`);
                            }}
                            className="pt-1.5 pb-1.5 flex items-center justify-between text-xs cursor-pointer hover:bg-emerald-500/5 px-2 rounded-lg transition-colors"
                            title="Click to jump to this date"
                          >
                            <span className="text-gray-700 dark:text-gray-300 font-mono">
                              {d.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-emerald-500 font-bold hover:underline">
                              Jump to Day ↗
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TRACK RESOURCE DETAILS */}
              {activePanelTab === 'info' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 space-y-2.5 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Track Resource Details</span>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800/80">
                      <span className="text-gray-500">Track ID:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-emerald-500">{resolvedTrackId || 'N/A'}</span>
                        {resolvedTrackId && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(resolvedTrackId);
                              showToast('Track ID copied to clipboard');
                            }}
                            className="p-1 hover:text-emerald-500 text-gray-400 cursor-pointer"
                            title="Copy Track ID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800/80">
                      <span className="text-gray-500">Artist:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{selectedTrackMetrics.artist}</span>
                    </div>
                    {selectedTrackMetrics.album && (
                      <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800/80">
                        <span className="text-gray-500">Album:</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{selectedTrackMetrics.album}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800/80">
                      <span className="text-gray-500">Platform:</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Spotify Web / Mobile</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-gray-500">Direct Link:</span>
                      <a
                        href={selectedTrackMetrics.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-500 font-bold hover:underline flex items-center gap-1"
                      >
                        <span>open.spotify.com</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ARTIST PROFILE & DISCOGRAPHY */}
              {activePanelTab === 'artist' && selectedArtistMetrics && (
                <div className="space-y-4">
                  {/* Artist Overview Card */}
                  <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-2xl border border-emerald-500/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                        <User className="w-4 h-4 text-emerald-500" />
                        {selectedArtistMetrics.artist}
                      </h4>
                      <button
                        onClick={() => onShowArtistProfile(selectedArtistMetrics.artist)}
                        className="text-xs text-emerald-500 font-bold hover:underline cursor-pointer"
                      >
                        Full Profile ↗
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="bg-white/70 dark:bg-gray-900/70 p-2.5 rounded-xl">
                        <span className="text-gray-400 block text-[10px]">Total Artist Plays</span>
                        <span className="font-extrabold text-gray-900 dark:text-white font-mono text-sm">
                          {selectedArtistMetrics.totalPlays} plays
                        </span>
                      </div>
                      <div className="bg-white/70 dark:bg-gray-900/70 p-2.5 rounded-xl">
                        <span className="text-gray-400 block text-[10px]">Total Listening Time</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                          {formatDuration(selectedArtistMetrics.totalDurationMs)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Artist Top Tracks in Library */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Top Tracks by {selectedArtistMetrics.artist} ({selectedArtistMetrics.topTracks.length})
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {selectedArtistMetrics.topTracks.map((trk, rank) => (
                        <div
                          key={trk.title}
                          onClick={() => {
                            setSelectedTrackItem(trk.sampleItem);
                            if (rightPanelRef.current) {
                              rightPanelRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                            showToast(`Loaded "${trk.title}" in Web Player`);
                          }}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            selectedTrackItem.title === trk.title
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                              : 'bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800 hover:border-emerald-500/30 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 text-[10px] font-bold flex items-center justify-center font-mono shrink-0">
                              {rank + 1}
                            </span>
                            <span className="font-bold truncate text-xs">{trk.title}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10px] text-gray-400 shrink-0">
                            <span>{formatDuration(trk.totalMs)}</span>
                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-bold">
                              {trk.count}x
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PERSONAL NOTES & TAGS */}
              {activePanelTab === 'notes' && (
                <div className="space-y-4">
                  {/* Notes Editor */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                      Personal Listening Note & Memories
                    </label>
                    <textarea
                      value={trackNotes[`${selectedTrackItem.title}___${selectedTrackItem.subtitle || ''}`] || ''}
                      onChange={e => handleSaveNote(e.target.value)}
                      placeholder="Why do you love this track? What memory or mood does it bring up?"
                      rows={4}
                      className="w-full p-2.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {/* Tags Manager */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-500" />
                      Custom Topic Tags
                    </label>

                    {/* Tag input form */}
                    <form onSubmit={handleAddTag} className="flex gap-1.5">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        placeholder="Add tag (e.g. #workout, #focus)..."
                        className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Add
                      </button>
                    </form>

                    {/* Active Tags list */}
                    <div className="flex flex-wrap gap-1.5 min-h-[30px] pt-1">
                      {(trackTags[`${selectedTrackItem.title}___${selectedTrackItem.subtitle || ''}`] || []).length === 0 ? (
                        <span className="text-[11px] text-gray-400 italic">No tags added yet.</span>
                      ) : (
                        (trackTags[`${selectedTrackItem.title}___${selectedTrackItem.subtitle || ''}`] || []).map(t => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20"
                          >
                            #{t}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(t)}
                              className="hover:text-red-500 cursor-pointer ml-0.5"
                            >
                              <X className="w-3 h-3" />
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
