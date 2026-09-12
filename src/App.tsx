import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { TimelineItem, CalendarEvent, ImportedFileRecord, ViewType, MetricType, DateRange, UserSettings, GlassTheme, LuminanceMode, FitDailyMetric, ScreentimeDayData, NoteObject } from './types';
import { getDemoTimelineData } from './utils/demoData';
import { parseUploadedFiles, reverseGeocodeLocation, reverseGeocodeItem, batchReverseGeocodePlaces, isGenericPlaceName } from './utils/dataParser';
import { Sidebar } from './components/Sidebar';
import { AnimatePresence, motion } from 'motion/react';
import { promptNativeDirectoryMount } from './utils/photosMountService';
import { RaindropSyncResult, getRaindropConfig, syncRaindropBookmarks } from './utils/raindropSync';
import { UniversalBookmarkResult, BookmarkServiceName } from './utils/bookmarkSyncServices';
import { getPinterestConfig, syncPinterestPins } from './utils/pinterestSync';
import { LowPolyWallpaper } from './components/backgrounds/LowPolyWallpaper';
import { ChromeBlurredBackground } from './components/backgrounds/ChromeBlurredBackground';
import { TopographyWallpaper } from './components/backgrounds/TopographyWallpaper';
import { getBookmarkAdaptiveTheme } from './utils/bookmarkAdaptiveTheme';
import { GoogleFitDataset, parseGoogleFitTakeout, convertGoogleFitToTimelineItems } from './utils/googleFitParser';
import { subscribeFaviconModal } from './utils/faviconModalHelper';
import { GoogleFitView } from './components/views/GoogleFitView';

// Modal and type definitions
import type { CalendarModalMode } from './components/CalendarModal';
import type { ImportModalMode } from './components/ImportModal';
import type { FaviconModalData } from './components/modals/FaviconModal';

// Eagerly imported Views for instantaneous zero-delay page transitions
import { JournalView } from './components/views/JournalView';
import { MapTimelineView } from './components/views/MapTimelineView';
import { SpotifyView } from './components/views/SpotifyView';
import { YouTubeView } from './components/views/YouTubeView';
import { NotesView } from './components/views/NotesView';
import { BrowserView } from './components/views/BrowserView';
import { PhotosView } from './components/views/PhotosView';
import { BookmarksView } from './components/views/BookmarksView';
import { BoxCloudView } from './components/views/BoxCloudView';
import { GoogleDriveView } from './components/views/GoogleDriveView';
import { HomeView } from './components/views/HomeView';
import { FitHealthView } from './components/views/FitHealthView';
import { ScreentimeView } from './components/views/ScreentimeView';
import { EmrehWelcomeCard } from './components/modals/EmrehWelcomeCard';
import { AudioVoiceMemoModal } from './components/common/AudioVoiceMemoModal';
import { KeepImportModal } from './components/modals/KeepImportModal';
import { parseFitFiles, extractFitDailyMetricsFromDataset } from './utils/fitImporter';
import { syncFitEcosystem, syncSampleFitData } from './utils/fitSync';
import { loadCanonicalFitStore, getCanonicalFitDataset } from './utils/canonicalFitStore';
import { loadStoredFitMetrics, saveSingleFitMetric, persistStoredFitMetrics } from './utils/fitStorage';
import { parseKeepFiles, keepNoteToNoteObject } from './utils/keepImporter';
import { parseScreentimeFiles } from './utils/screentimeCalculator';
import { loadStoredScreentimeData, saveSingleScreentimeDay, persistStoredScreentimeData } from './utils/screentimeStorage';
import { loadStoredNotes, persistStoredNotes } from './utils/notesStorage';
import { MobileNavigation } from './components/navigation/MobileNavigation';
import { dbGet, dbSet, dbDelete } from './utils/storage';

import { 
  hydrateAllState, 
  persistTimelineIncremental,
  persistFitMetricIncremental,
  persistScreentimeDayIncremental,
  persistDailyNoteIncremental,
  persistBookmarkNoteIncremental,
  persistBookmarkTagIncremental,
  persistSessionSnapshotIncremental,
  subscribeToTimeline,
  subscribeToFitMetrics,
  subscribeToScreentime,
  subscribeToDailyNotes,
  subscribeToCalendarEvents,
  subscribeToNotes
} from './utils/persistence';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

// Code-split Lazy-loaded Modals
const CalendarModal = React.lazy(() =>
  import('./components/CalendarModal').then(m => ({ default: m.CalendarModal }))
);
const EventModal = React.lazy(() =>
  import('./components/EventModal').then(m => ({ default: m.EventModal }))
);
const ImportModal = React.lazy(() =>
  import('./components/ImportModal').then(m => ({ default: m.ImportModal }))
);
const ImportedFilesModal = React.lazy(() =>
  import('./components/ImportedFilesModal').then(m => ({ default: m.ImportedFilesModal }))
);
const MetricsModal = React.lazy(() =>
  import('./components/MetricsModal').then(m => ({ default: m.MetricsModal }))
);
const MapOverleafModal = React.lazy(() =>
  import('./components/MapOverleafModal').then(m => ({ default: m.MapOverleafModal }))
);
const BrowserLeafletModal = React.lazy(() =>
  import('./components/BrowserLeafletModal').then(m => ({ default: m.BrowserLeafletModal }))
);
const SettingsModal = React.lazy(() =>
  import('./components/SettingsModal').then(m => ({ default: m.SettingsModal }))
);
const PhotoLightboxModal = React.lazy(() =>
  import('./components/PhotoLightboxModal').then(m => ({ default: m.PhotoLightboxModal }))
);
const BookmarkSyncModal = React.lazy(() =>
  import('./components/BookmarkSyncModal').then(m => ({ default: m.BookmarkSyncModal }))
);
const FaviconModal = React.lazy(() =>
  import('./components/modals/FaviconModal').then(m => ({ default: m.FaviconModal }))
);
const GlobalSearchPalette = React.lazy(() =>
  import('./components/search/GlobalSearchPalette').then(m => ({ default: m.GlobalSearchPalette }))
);

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'solid-glass',
  luminance: 'dark',
  backgroundEffect: 'dynamic',
  showFloatingOrbs: true,
  animationSpeed: 'balanced',
  timeFormat: '12h',
  defaultView: 'home',
  autoResolveGeo: true
};

export const App: React.FC = () => {
  // User Settings state (persisted in localStorage)
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('mylife_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Normalize legacy single-theme values into decoupled GlassTheme and LuminanceMode
        let theme: GlassTheme = 'solid-glass';
        let luminance: LuminanceMode = 'dark';

        if (parsed.theme === 'liquid-glass') {
          theme = 'liquid-glass';
          luminance = parsed.luminance === 'light' ? 'light' : 'dark';
        } else if (parsed.theme === 'solid-glass') {
          theme = 'solid-glass';
          luminance = parsed.luminance === 'light' ? 'light' : 'dark';
        } else if (parsed.theme === 'light') {
          theme = 'solid-glass';
          luminance = 'light';
        } else if (parsed.theme === 'dark') {
          theme = 'solid-glass';
          luminance = 'dark';
        } else if (parsed.luminance) {
          luminance = parsed.luminance;
        }

        return { ...DEFAULT_SETTINGS, ...parsed, theme, luminance };
      }
    } catch (e) {
      console.warn('Failed to parse settings', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Settings Modal Open State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Ensure document zoom is completely removed and reset to 100% full viewport
  useEffect(() => {
    if (typeof document !== 'undefined') {
      try {
        (document.documentElement as any).style.removeProperty('zoom');
        localStorage.removeItem('emreh_app_zoom_level');
      } catch (_) {}
    }
  }, []);

  // Global Search Palette Open State
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Theme state: AMOLED true black mode (strictly isolated to Dark luminance mode)
  const [isAmoled, setIsAmoled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mylife_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.luminance === 'dark' || parsed.theme === 'dark') {
          return localStorage.getItem('mylife_amoled') === 'true';
        }
        return false;
      }
      return localStorage.getItem('mylife_amoled') === 'true';
    } catch {
      return false;
    }
  });

  // Current selected Date
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Current active navigation view
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    try {
      const saved = localStorage.getItem('mylife_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.defaultView) return parsed.defaultView;
      }
    } catch {}
    return 'home';
  });

  // Individualized Date Range state per view
  const [viewDateRanges, setViewDateRanges] = useState<Record<CalendarModalMode, DateRange | null>>({
    all: null,
    journal: null,
    spotify: null,
    youtube: null,
    maps: null,
    browser: null,
    notes: null,
    photos: null,
    bookmarks: null,
    box: null,
    gdrive: null,
    fit: null,
    screentime: null
  });

  // Storage hydration flag to prevent premature state overwrites
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const hydrationRef = useRef(false);

  // Timeline Data State (clean initial state, loaded on import or from IndexedDB)
  const [timelineData, setTimelineData] = useState<TimelineItem[]>(() => []);

  // Calendar Events State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Daily Notes Map: { 'YYYY-MM-DD': 'Note content' }
  const [dailyNotesMap, setDailyNotesMap] = useState<Record<string, string>>({});

  // Imported Files Tracking
  const [importedFiles, setImportedFiles] = useState<ImportedFileRecord[]>([]);

  const [googleFitData, setGoogleFitData] = useState<GoogleFitDataset | null>(null);

  // Bookmark Notes & Tags
  const [bookmarkNotes, setBookmarkNotes] = useState<Record<string, string>>({});

  const [bookmarkTags, setBookmarkTags] = useState<Record<string, string[]>>({});

  // Session custom snapshots / captures
  const [sessionSnapshots, setSessionSnapshots] = useState<Record<string, string>>({});

  // Active Bookmark Service & Media for dynamic adaptive theme styling (initial: pink & sea green)
  const [activeBookmarkService, setActiveBookmarkService] = useState<string>('all');
  const [activeBookmarkMedia, setActiveBookmarkMedia] = useState<string | undefined>(undefined);

  // Hydrate state from IndexedDB on initial mount
  useEffect(() => {
    if (hydrationRef.current) return;
    hydrationRef.current = true;

    async function hydrateState() {
      try {
        const state = await hydrateAllState();

        const rawTimeline = Array.isArray(state.timeline)
          ? state.timeline
          : (state.timeline && typeof state.timeline === 'object' ? Object.values(state.timeline) : []);
        if (rawTimeline.length > 0) {
          setTimelineData(
            rawTimeline.map((item: any) => ({
              ...item,
              dateObj: new Date(item.ts)
            }))
          );
        }
        if (state.calendarEvents) {
          const rawEvents = Array.isArray(state.calendarEvents)
            ? state.calendarEvents
            : (typeof state.calendarEvents === 'object' ? Object.values(state.calendarEvents) : []);
          if (rawEvents.length > 0) {
            setCalendarEvents(rawEvents);
          }
        }
        if (state.dailyNotes && typeof state.dailyNotes === 'object' && Object.keys(state.dailyNotes).length > 0) {
          setDailyNotesMap(state.dailyNotes);
        }
        if (state.importedFiles) {
          const rawFiles = Array.isArray(state.importedFiles)
            ? state.importedFiles
            : (typeof state.importedFiles === 'object' ? Object.values(state.importedFiles) : []);
          if (rawFiles.length > 0) {
            setImportedFiles(rawFiles);
          }
        }
        if (state.bookmarkNotes && typeof state.bookmarkNotes === 'object') {
          setBookmarkNotes(state.bookmarkNotes);
        }
        if (state.bookmarkTags && typeof state.bookmarkTags === 'object') {
          setBookmarkTags(state.bookmarkTags);
        }
        if (state.sessionSnapshots && typeof state.sessionSnapshots === 'object') {
          setSessionSnapshots(state.sessionSnapshots);
        }
        if (state.googleFit && typeof state.googleFit === 'object') {
          setGoogleFitData(state.googleFit);
        }
      } catch (e) {
        console.error('Failed to hydrate state from IndexedDB:', e);
      } finally {
        setIsHydrated(true);
      }
    }

    hydrateState();
  }, []);

  // Subscribe to external persistence changes (e.g., from other tabs or sync)
  useEffect(() => {
    if (!isHydrated) return;

    const unsubTimeline = subscribeToTimeline((data) => {
      const items: any[] = Array.isArray(data)
        ? data
        : (data && typeof data === 'object' ? Object.values(data) : []);
      setTimelineData(items.map((item: any) => ({
        ...item,
        dateObj: new Date(item.ts)
      })));
    });

    const unsubCalendar = subscribeToCalendarEvents((events) => {
      if (Array.isArray(events)) {
        setCalendarEvents(events);
      } else if (events && typeof events === 'object') {
        setCalendarEvents(Object.values(events));
      }
    });
    const unsubDailyNotes = subscribeToDailyNotes((notes) => {
      if (notes && typeof notes === 'object' && !Array.isArray(notes)) {
        setDailyNotesMap(notes);
      }
    });
    const unsubFit = subscribeToFitMetrics(() => {}); // Fit metrics handled separately
    const unsubScreentime = subscribeToScreentime(() => {}); // Screentime handled separately
    const unsubNotes = subscribeToNotes(() => {}); // Notes handled separately

    const handleGoogleFitUpdated = (e: any) => {
      if (e?.detail) {
        if (e.detail.daily && e.detail.workouts) {
          setGoogleFitData(getCanonicalFitDataset(e.detail));
        } else {
          setGoogleFitData(e.detail);
        }
      } else {
        loadCanonicalFitStore().then(store => {
          setGoogleFitData(getCanonicalFitDataset(store));
        });
      }
    };
    window.addEventListener('emreh_google_fit_updated', handleGoogleFitUpdated);
    window.addEventListener('emreh_canonical_fit_updated', handleGoogleFitUpdated);
    window.addEventListener('emreh_fit_canonical_updated', handleGoogleFitUpdated);

    return () => {
      unsubTimeline();
      unsubCalendar();
      unsubDailyNotes();
      unsubFit();
      unsubScreentime();
      unsubNotes();
      window.removeEventListener('emreh_google_fit_updated', handleGoogleFitUpdated);
      window.removeEventListener('emreh_canonical_fit_updated', handleGoogleFitUpdated);
      window.removeEventListener('emreh_fit_canonical_updated', handleGoogleFitUpdated);
    };
  }, [isHydrated]);

  // Modals state
  const [calendarModal, setCalendarModal] = useState<{
    isOpen: boolean;
    mode: CalendarModalMode;
    initialTab: 'single' | 'range';
  }>({
    isOpen: false,
    mode: 'journal',
    initialTab: 'single'
  });

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const [importModal, setImportModal] = useState<{
    isOpen: boolean;
    mode: ImportModalMode;
  }>({
    isOpen: false,
    mode: 'journal'
  });

  const [isImportedFilesModalOpen, setIsImportedFilesModalOpen] = useState(false);
  const [isVoiceMemoOpen, setIsVoiceMemoOpen] = useState(false);
  const [isKeepImportModalOpen, setIsKeepImportModalOpen] = useState(false);
  
  // Backup Restore Modal state
  const [restoreModal, setRestoreModal] = useState<{
    isOpen: boolean;
    file: File | null;
    mode: 'replace' | 'merge' | 'new';
    backupData: any;
  }>({
    isOpen: false,
    file: null,
    mode: 'replace',
    backupData: null
  });
  
  const [fitSubView, setFitSubView] = useState<'vitals' | 'workouts'>('vitals');

  const handleOpenCalendarFor = (mode: CalendarModalMode, initialTab: 'single' | 'range' = 'single') => {
    setCalendarModal({ isOpen: true, mode, initialTab });
  };

  const handleOpenImportFor = (mode: ImportModalMode) => {
    setImportModal({ isOpen: true, mode });
  };

  // Bookmarks & Services Sync Modal state
  const [isRaindropModalOpen, setIsRaindropModalOpen] = useState(false);
  const [bookmarkModalService, setBookmarkModalService] = useState<BookmarkServiceName>('raindrop');

  const handleOpenBookmarkSync = (service: BookmarkServiceName = 'raindrop') => {
    setBookmarkModalService(service);
    setIsRaindropModalOpen(true);
  };

  // Favicon Enlarged Modal State
  const [faviconModalData, setFaviconModalData] = useState<FaviconModalData | null>(null);

  useEffect(() => {
    return subscribeFaviconModal((data) => {
      setFaviconModalData(data);
    });
  }, []);

  // Metrics Modal state
  const [metricsModal, setMetricsModal] = useState<{
    isOpen: boolean;
    type: MetricType;
    targetName: string;
    subTargetName?: string;
  }>({
    isOpen: false,
    type: 'track',
    targetName: '',
    subTargetName: ''
  });

  // Map Overleaf Preview Modal state
  const [mapModal, setMapModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    embedUrl: string;
    externalUrl: string;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    embedUrl: '',
    externalUrl: ''
  });

  // Browser Detail Inspector Modal state
  const [browserModal, setBrowserModal] = useState<{
    isOpen: boolean;
    item: TimelineItem | null;
  }>({
    isOpen: false,
    item: null
  });

  // Selected browser item in sidebar / split view
  const [selectedBrowserItem, setSelectedBrowserItem] = useState<TimelineItem | null>(null);

  // Google Photos Lightbox & Selected State
  const [selectedPhoto, setSelectedPhoto] = useState<TimelineItem | null>(null);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState<boolean>(false);

  // Geocoding Batch Resolver state
  const [isGeoResolving, setIsGeoResolving] = useState(false);

  // Pending note or journal target for seamless interlinking across views
  const [pendingTargetNote, setPendingTargetNote] = useState<{
    noteIdOrTitle?: string;
    dateKey?: string;
  } | null>(null);

  const handleOpenNoteFromAnywhere = (noteIdOrTitle: string) => {
    setPendingTargetNote({ noteIdOrTitle });
    setCurrentView('notes');
  };

  const handleOpenInNotesFromDate = (dateKey: string) => {
    setPendingTargetNote({ dateKey });
    setCurrentView('notes');
  };

  const handleNavigateToJournal = (dateKeyOrDate: string | Date) => {
    if (typeof dateKeyOrDate === 'string') {
      const parts = dateKeyOrDate.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts.map(Number);
        if (y && m && d) {
          setCurrentDate(new Date(y, m - 1, d));
        }
      }
    } else if (dateKeyOrDate instanceof Date) {
      setCurrentDate(dateKeyOrDate);
    }
    setCurrentView('timeline');
  };

  // Theme & Luminance effect (Independent axes)
  useEffect(() => {
    try {
      localStorage.setItem('mylife_amoled', String(isAmoled));
      const root = document.documentElement;

      // 1. Luminance axis: Light vs Dark
      if (settings.luminance === 'light') {
        root.classList.remove('dark');
        root.classList.add('light');
      } else {
        // 'dark' is default
        root.classList.add('dark');
        root.classList.remove('light');
      }

      // 2. Glass Theme axis: Solid Glass vs Liquid Glass
      if (settings.theme === 'liquid-glass') {
        root.classList.add('theme-liquid-glass');
        root.classList.remove('theme-solid-glass');
      } else {
        root.classList.remove('theme-liquid-glass');
        root.classList.add('theme-solid-glass');
      }
    } catch (e) {
      console.error(e);
    }
  }, [isAmoled, settings.theme, settings.luminance]);

  // Global keyboard shortcuts: Cmd+K / Ctrl+K / '/' for Search, and Cmd+, / Ctrl+, for Settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (e.key === '/' && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-sync Raindrop bookmarks on startup if configured & enabled
  useEffect(() => {
    if (!isHydrated) return;
    const cfg = getRaindropConfig();
    if (cfg.autoSync && cfg.apiToken) {
      syncRaindropBookmarks({ token: cfg.apiToken, collectionId: cfg.selectedCollectionId })
        .then(res => {
          if (res.items.length > 0) {
            handleApplyBookmarkData(res, `Raindrop Auto-Sync (${cfg.collectionName || 'All Bookmarks'})`);
          }
        })
        .catch(err => {
          console.warn('Raindrop auto-sync on startup was skipped or failed:', err);
        });
    }

    // Auto-sync Pinterest pins on startup if configured & enabled
    const pCfg = getPinterestConfig();
    if (pCfg.autoSync && pCfg.apiToken) {
      syncPinterestPins({
        token: pCfg.apiToken,
        boardId: pCfg.selectedBoardId === 'all' ? undefined : pCfg.selectedBoardId
      })
        .then(res => {
          if (res.items.length > 0) {
            handleApplyBookmarkData(res, `Pinterest Auto-Sync (${pCfg.boardName || 'All Boards'})`);
          }
        })
        .catch(err => {
          console.warn('Pinterest auto-sync on startup was skipped or failed:', err);
        });
    }
  }, [isHydrated]);

  const persistTimeline = useCallback(async (items: TimelineItem[]) => {
    const current = timelineData;
    const currentMap = new Map<string, TimelineItem>(current.map(i => [i.id, i]));
    const newMap = new Map<string, TimelineItem>(items.map(i => [i.id, i]));
    
    const updates: Array<{ id: string; item?: TimelineItem; delete?: boolean }> = [];
    
    // Find new or updated items
    for (const [id, item] of newMap) {
      if (!currentMap.has(id) || currentMap.get(id) !== item) {
        updates.push({ id, item });
      }
    }
    
    // Find deleted items
    for (const [id] of currentMap) {
      if (!newMap.has(id)) {
        updates.push({ id, delete: true });
      }
    }
    
    if (updates.length > 0) {
      await persistTimelineIncremental(updates);
    }
    
    setTimelineData(items);
  }, [timelineData]);

  // Converted Google Fit items integrated into the unified timeline
  const fitTimelineItems = useMemo(() => {
    return convertGoogleFitToTimelineItems(googleFitData);
  }, [googleFitData]);

  // Combined timeline items: seamlessly merges standard timelineData with Google Fit workouts & day summaries
  const combinedTimelineData = useMemo(() => {
    if (!fitTimelineItems || fitTimelineItems.length === 0) return timelineData;
    const fitIds = new Set(fitTimelineItems.map(i => i.id));
    const nonFit = timelineData.filter(i => !fitIds.has(i.id));
    return [...nonFit, ...fitTimelineItems].sort((a, b) => {
      const ta = a.dateObj ? a.dateObj.getTime() : (a.ts ? new Date(a.ts).getTime() : 0);
      const tb = b.dateObj ? b.dateObj.getTime() : (b.ts ? new Date(b.ts).getTime() : 0);
      return tb - ta;
    });
  }, [timelineData, fitTimelineItems]);

  // Date index map for lightning fast day filtering
  const dateIndexMap = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    combinedTimelineData.forEach(item => {
      const d = item.dateObj;
      if (!d || isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });
    return map;
  }, [combinedTimelineData]);

  // Current Date string key
  const currentDateKey = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentDate]);

  // Items for the selected day / date range for Journal
  const journalItems = useMemo(() => {
    const range = viewDateRanges.journal;
    if (range) {
      return combinedTimelineData.filter(item => {
        const d = item.dateObj;
        if (!d || isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return key >= range.startDate && key <= range.endDate;
      });
    }
    return dateIndexMap.get(currentDateKey) || [];
  }, [viewDateRanges.journal, combinedTimelineData, dateIndexMap, currentDateKey]);

  // Idle preload views for instant snappy view switching
  useEffect(() => {
    const preloadViews = () => {
      import('./components/views/JournalView');
      import('./components/views/MapTimelineView');
      import('./components/views/NotesView');
      import('./components/views/PhotosView');
      import('./components/views/BookmarksView');
      import('./components/views/BrowserView');
      import('./components/views/SpotifyView');
      import('./components/views/YouTubeView');
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(preloadViews);
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(preloadViews, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Events grouped by date for O(1) day lookups
  const calendarEventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of calendarEvents) {
      const list = map.get(ev.date);
      if (list) list.push(ev);
      else map.set(ev.date, [ev]);
    }
    return map;
  }, [calendarEvents]);

  // Events for the selected day / date range for Journal
  const journalEvents = useMemo(() => {
    const range = viewDateRanges.journal;
    if (range) {
      return calendarEvents.filter(ev => ev.date >= range.startDate && ev.date <= range.endDate);
    }
    return calendarEventsByDate.get(currentDateKey) || [];
  }, [viewDateRanges.journal, calendarEvents, calendarEventsByDate, currentDateKey]);

  // Items for Map Timeline view (day or range)
  const mapTimelineItems = useMemo(() => {
    const range = viewDateRanges.maps;
    if (range) {
      return combinedTimelineData.filter(item => {
        if (item.type !== 'maps') return false;
        const d = item.dateObj;
        if (!d || isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return key >= range.startDate && key <= range.endDate;
      });
    }
    return (dateIndexMap.get(currentDateKey) || []).filter(i => i.type === 'maps');
  }, [viewDateRanges.maps, combinedTimelineData, dateIndexMap, currentDateKey]);

  // All Mounted Photos List (supporting date ranges if applied)
  const photosList = useMemo(() => {
    const range = viewDateRanges.photos;
    if (range) {
      return timelineData.filter(item => {
        if (item.type !== 'photo') return false;
        const d = item.dateObj;
        if (!d || isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return key >= range.startDate && key <= range.endDate;
      });
    }
    return timelineData.filter(item => item.type === 'photo');
  }, [viewDateRanges.photos, timelineData]);

  // Daily note for current day
  const currentDailyNote = dailyNotesMap[currentDateKey] || '';

  // Date Navigation Handlers
  const handlePrevDate = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const handleNextDate = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleSetToday = () => {
    setCurrentDate(new Date());
  };

  const handleJumpToDate = (d: Date) => {
    setCurrentDate(d);
  };

  // Calendar Event actions
  const handleAddEvent = (evData: Omit<CalendarEvent, 'id' | 'date'>) => {
    const newEvent: CalendarEvent = {
      id: `ev-${Date.now()}`,
      date: currentDateKey,
      ...evData
    };
    setCalendarEvents(prev => [...prev, newEvent]);
  };

  const handleDeleteEvent = (id: string | number) => {
    setCalendarEvents(prev => prev.filter(ev => ev.id !== id));
  };

  // Daily Note save handler
  const handleSaveDailyNote = (text: string) => {
    setDailyNotesMap(prev => ({
      ...prev,
      [currentDateKey]: text
    }));
    persistDailyNoteIncremental(currentDateKey, text);
  };

  const handleSaveSpecificDailyNote = (dateKey: string, text: string) => {
    setDailyNotesMap(prev => ({
      ...prev,
      [dateKey]: text
    }));
    persistDailyNoteIncremental(dateKey, text);
  };

  // Bookmark Notes & Tags
  const handleSaveBookmarkNote = (url: string, note: string) => {
    setBookmarkNotes(prev => ({
      ...prev,
      [url]: note
    }));
    persistBookmarkNoteIncremental(url, note);
  };

  const handleAddBookmarkTag = (url: string, tag: string) => {
    setBookmarkTags(prev => {
      const existing = prev[url] || [];
      if (existing.includes(tag)) return prev;
      return {
        ...prev,
        [url]: [...existing, tag]
      };
    });
    persistBookmarkTagIncremental(url, tag, true);
  };

  const handleRemoveBookmarkTag = (url: string, tag: string) => {
    setBookmarkTags(prev => {
      const existing = prev[url] || [];
      return {
        ...prev,
        [url]: existing.filter(t => t !== tag)
      };
    });
    persistBookmarkTagIncremental(url, tag, false);
  };

  const handleSaveSessionSnapshot = (url: string, snapshot: string) => {
    setSessionSnapshots(prev => {
      if (!snapshot) {
        const next = { ...prev };
        delete next[url];
        return next;
      }
      return {
        ...prev,
        [url]: snapshot
      };
    });
    persistSessionSnapshotIncremental(url, snapshot);
  };

  // Authenticated-page preview bridge: use the user's native browser session,
  // then capture the selected browser tab/window via Screen Capture API.
  const captureAuthenticatedTab = async (url: string, autoOpen = true) => {
    if (!url) return;

    // Open synchronously while this handler still has user activation so
    // popup blockers do not swallow the authenticated browser tab.
    let openedWindow: Window | null = null;
    if (autoOpen) {
      try {
        openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
      } catch {
        openedWindow = null;
      }
    }

    let captured = false;
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'browser' },
          audio: false
        });

        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        await new Promise(resolve => setTimeout(resolve, 120));

        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');

        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        stream.getTracks().forEach(track => track.stop());

        if (dataUrl && dataUrl.length > 500) {
          handleSaveSessionSnapshot(url, dataUrl);
          captured = true;
        }
      } catch (err) {
        console.info('Authenticated tab capture cancelled or unavailable:', err);
      }
    }

    // Avoid an unused variable warning while still retaining the opened tab
    // reference for future browser-shell integrations.
    void openedWindow;

    if (captured) {
      // The UI will update from state persistence; no additional action needed.
      return;
    }
  };

  const captureActiveScreen = async (url: string) => {
    if (!url) return;
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'browser' },
          audio: false
        });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        await new Promise(resolve => setTimeout(resolve, 120));

        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        stream.getTracks().forEach(track => track.stop());

        if (dataUrl && dataUrl.length > 500) {
          handleSaveSessionSnapshot(url, dataUrl);
        }
      } catch (err) {
        console.info('Active screen capture cancelled or unavailable:', err);
      }
    }
  };

  // File Import handler
  const handleImportFiles = async (files: File[]) => {
    try {
      if (importModal.mode === 'fit' || files.some(f => /fit|tcx|gpx|fitbit|health|daily.*activ|daily.*metric|takeout.*fit|steps-.*\.json|heart_rate-.*\.json|sleep-.*\.json/i.test(f.name))) {
        try {
          const parsedFit = await parseGoogleFitTakeout(files);
          // Improved success criteria: count actually useful records (with real data values)
          // rather than just total record count which can include empty/placeholder records
          const usefulMeasurements = parsedFit.measurements.filter(m => m.value !== undefined && m.value !== null && m.value > 0).length;
          const usefulSessions = parsedFit.sessions.filter(s => s.durationSeconds && s.durationSeconds > 0).length;
          const usefulWorkouts = parsedFit.workouts.filter(w => w.durationSeconds && w.durationSeconds > 0).length;
          const usefulDailyIntervals = parsedFit.dailyIntervals.filter(i => i.values && Object.values(i.values).some(v => v !== null && v !== undefined && Number(v) > 0)).length;
          const usefulDailySummaries = parsedFit.dailySummaries.filter(d => d.values && Object.values(d.values).some(v => v !== null && v !== undefined && Number(v) > 0)).length;
          const totalUsefulRecords = usefulMeasurements + usefulSessions + usefulWorkouts + usefulDailyIntervals + usefulDailySummaries;
          const filesRecognized = parsedFit.filesRecognized || 0;
          const filesScanned = parsedFit.filesScanned || files.length;
          // Import is successful if there are useful records OR if in fit mode (for UI consistency)
          if (totalUsefulRecords > 0 || importModal.mode === 'fit') {
            // Bidirectionally synchronize GoogleFitDataset and daily metrics
            const { dataset: syncedFit, metrics: syncedMetrics } = await syncFitEcosystem({
              newDataset: parsedFit
            });
            setGoogleFitData(syncedFit);

            const importedName = files.length === 1 ? files[0].name : `Fitness & Health Data (${files.length} files)`;
            const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
            setImportedFiles(prev => [{
              id: `google_fit_${Date.now()}`, name: importedName, fileName: importedName, filename: importedName,
              fileSize: `${(totalBytes / 1024 / 1024).toFixed(1)} MB`, fileType: 'google_fit',
              recordCount: totalUsefulRecords, count: totalUsefulRecords,
              filesRecognized: filesRecognized, filesScanned: filesScanned,
              importDate: new Date().toISOString()
            }, ...prev]);

            // Note: Google Fit items are dynamically projected into combinedTimelineData
            // directly from the Canonical Fit Store without duplicating them into static timelineData.

            let latestDateObj: Date | null = syncedFit.dateRange.end ? new Date(syncedFit.dateRange.end) : null;
            if (!latestDateObj || isNaN(latestDateObj.getTime())) {
              const sortedMetricDates = Object.keys(syncedMetrics || {}).sort();
              if (sortedMetricDates.length > 0) {
                const [y, m, d] = sortedMetricDates[sortedMetricDates.length - 1].split('-').map(Number);
                latestDateObj = new Date(y, m - 1, d);
              }
            }
            if (latestDateObj && !isNaN(latestDateObj.getTime())) {
              setCurrentDate(latestDateObj);
            }
            if (importModal.mode === 'fit') {
              setImportModal(prev => ({ ...prev, isOpen: false }));
              return;
            }
          }
        } catch (fitErr) {
          console.warn('Google Fit / Health import error:', fitErr);
        }
      }

      if (files.some(f => /keep.*\.json|keep.*\.html|takeout.*keep/i.test(f.name))) {
        try {
          const parsedKeep = await parseKeepFiles(files);
          if (parsedKeep.length > 0) {
            setDailyNotesMap(prev => {
              const next = { ...prev };
              parsedKeep.forEach(kn => {
                const dKey = kn.createdAt ? kn.createdAt.slice(0, 10) : currentDateKey;
                const noteBody = `${kn.title ? `### ${kn.title}\n` : ''}${kn.content || ''}${kn.labels?.length ? `\n🏷️ ${kn.labels.join(', ')}` : ''}`;
                if (next[dKey]) {
                  next[dKey] = `${next[dKey]}\n\n${noteBody}`;
                } else {
                  next[dKey] = noteBody;
                }
              });
              return next;
            });
            // Persist each note incrementally
            parsedKeep.forEach(kn => {
              const dKey = kn.createdAt ? kn.createdAt.slice(0, 10) : currentDateKey;
              const noteBody = `${kn.title ? `### ${kn.title}\n` : ''}${kn.content || ''}${kn.labels?.length ? `\n🏷️ ${kn.labels.join(', ')}` : ''}`;
              persistDailyNoteIncremental(dKey, noteBody);
            });

            const importedName = files.length === 1 ? files[0].name : `Google Keep (${parsedKeep.length} notes)`;
            const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
            setImportedFiles(prev => [{
              id: `keep_${Date.now()}`, name: importedName, fileName: importedName, filename: importedName,
              fileSize: `${(totalBytes / 1024).toFixed(1)} KB`, fileType: 'notes',
              recordCount: parsedKeep.length, count: parsedKeep.length,
              importDate: new Date().toISOString()
            }, ...prev]);
          }
        } catch (keepErr) {
          console.warn('Keep import check error:', keepErr);
        }
      }

      if (importModal.mode === 'screentime' || files.some(f => /stayfree|actiondash|rescuetime|screentime/i.test(f.name))) {
        try {
          const parsedScreentime = await parseScreentimeFiles(files);
const datesCount = Object.keys(parsedScreentime).length;
            if (datesCount > 0) {
              // Persist each day incrementally
              for (const [date, dayData] of Object.entries(parsedScreentime)) {
                await saveSingleScreentimeDay(dayData);
              }

              const importedName = files.length === 1 ? files[0].name : `Screentime Logs (${files.length} files)`;
            const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
            setImportedFiles(prev => [{
              id: `screentime_${Date.now()}`, name: importedName, fileName: importedName, filename: importedName,
              fileSize: `${(totalBytes / 1024).toFixed(1)} KB`, fileType: 'screentime',
              recordCount: datesCount, count: datesCount,
              importDate: new Date().toISOString()
            }, ...prev]);

            const sortedDates = Object.keys(parsedScreentime).sort();
            if (sortedDates.length > 0) {
              const latestDate = sortedDates[sortedDates.length - 1];
              const [y, m, d] = latestDate.split('-').map(Number);
              setCurrentDate(new Date(y, m - 1, d));
            }

            if (importModal.mode === 'screentime') return;
          }
        } catch (stErr) {
          console.warn('Screentime import check error:', stErr);
        }
      }
      const { newItems, fileBreakdowns, bookmarkNotes: newNotes, bookmarkTags: newTags, sessionSnapshots: newSnapshots } = await parseUploadedFiles(files, () => {});
      if (newItems.length > 0) {
        // Merge with existing items, deduping by id
        const existingMap = new Map<string, TimelineItem>();
        timelineData.forEach(item => existingMap.set(item.id, item));
        newItems.forEach(item => existingMap.set(item.id, item));

        const merged = Array.from(existingMap.values());
        setTimelineData(merged);
        setImportedFiles(prev => [...fileBreakdowns, ...prev]);
        persistTimeline(merged);

        if (newNotes && Object.keys(newNotes).length > 0) {
          setBookmarkNotes(prev => ({ ...prev, ...newNotes }));
        }
        if (newTags && Object.keys(newTags).length > 0) {
          setBookmarkTags(prev => {
            const next = { ...prev };
            Object.entries(newTags).forEach(([url, tags]) => {
              next[url] = Array.from(new Set([...(next[url] || []), ...tags]));
            });
            return next;
          });
        }
        if (newSnapshots && Object.keys(newSnapshots).length > 0) {
          setSessionSnapshots(prev => ({ ...prev, ...newSnapshots }));
        }

        // Jump to the date of the most recent imported record if available
        const latest = newItems.reduce((max, item) => (item.dateObj > max ? item.dateObj : max), newItems[0].dateObj);
        if (latest && !isNaN(latest.getTime())) {
          setCurrentDate(latest);
        }
      }
    } catch (err) {
      console.error('Error importing files:', err);
    }
  };

  // Raindrop.io & Bookmark Services Synced Data handler
  const handleApplyBookmarkData = (result: RaindropSyncResult | UniversalBookmarkResult, sourceName: string) => {
    if (!result || result.items.length === 0) return;

    const existingMap = new Map<string, TimelineItem>();
    timelineData.forEach(item => existingMap.set(item.id, item));
    result.items.forEach(item => existingMap.set(item.id, item));

    const merged = Array.from(existingMap.values());
    setTimelineData(merged);
    persistTimeline(merged);

    if (Object.keys(result.notes).length > 0) {
      setBookmarkNotes(prev => ({ ...prev, ...result.notes }));
    }

    if (Object.keys(result.tags).length > 0) {
      setBookmarkTags(prev => {
        const next = { ...prev };
        Object.entries(result.tags).forEach(([url, tags]) => {
          next[url] = Array.from(new Set([...(next[url] || []), ...tags]));
        });
        return next;
      });
    }

    if (Object.keys(result.snapshots).length > 0) {
      setSessionSnapshots(prev => ({ ...prev, ...result.snapshots }));
    }

    const newRecord: ImportedFileRecord = {
      id: `bookmarks_${Date.now()}`,
      name: sourceName,
      fileName: sourceName,
      filename: sourceName,
      fileType: 'browser',
      recordCount: result.count,
      count: result.count,
      browserCount: result.count,
      importDate: new Date().toISOString()
    };
    setImportedFiles(prev => [newRecord, ...prev]);

    const latest = result.items.reduce((max, item) => (item.dateObj > max ? item.dateObj : max), result.items[0].dateObj);
    if (latest && !isNaN(latest.getTime())) {
      setCurrentDate(latest);
    }
  };

  // Notes & Diary Import handler
  const handleImportNotes = async (files: File[]) => {
    for (const file of files) {
      try {
        const text = await file.text();
        const sections = text.split(/(?=^#+\s*\d{4}-\d{2}-\d{2}|^\[\d{4}-\d{2}-\d{2}\])/gm);
        const newNotes: Record<string, string> = {};
        sections.forEach(sec => {
          const match = sec.match(/^(?:#+\s*|\[)(\d{4}-\d{2}-\d{2})(?:\]|\b)/);
          if (match) {
            const dateStr = match[1];
            const content = sec.replace(/^(?:#+\s*|\[)(\d{4}-\d{2}-\d{2})(?:\]|\b)/, '').trim();
            if (content) {
              newNotes[dateStr] = content;
            }
          }
        });
        if (Object.keys(newNotes).length > 0) {
          setDailyNotesMap(prev => ({ ...prev, ...newNotes }));
          // Persist each note incrementally
          Object.entries(newNotes).forEach(([dateKey, note]) => {
            persistDailyNoteIncremental(dateKey, note);
          });
        } else {
          setDailyNotesMap(prev => ({ ...prev, [currentDateKey]: text }));
          persistDailyNoteIncremental(currentDateKey, text);
        }
      } catch (e) {
        console.warn('Failed to parse notes file', e);
      }
    }
  };

  // Delete Imported File and associated items
  const handleDeleteImportedFile = (fileId: string) => {
    setImportedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Google Photos Mounting & Management Handlers
  const handleMountNewPhotos = (newPhotos: TimelineItem[], folderName: string) => {
    if (newPhotos.length === 0) return;

    const existingMap = new Map<string, TimelineItem>();
    timelineData.forEach(item => existingMap.set(item.id, item));
    newPhotos.forEach(item => existingMap.set(item.id, item));

    const merged = Array.from(existingMap.values());
    setTimelineData(merged);
    persistTimeline(merged);

    const newRecord: ImportedFileRecord = {
      id: 'photos_' + Date.now(),
      fileName: folderName || 'Google Photos Folder',
      fileType: 'photos',
      recordCount: newPhotos.length,
      photoCount: newPhotos.length,
      importDate: new Date().toISOString()
    };
    setImportedFiles(prev => [newRecord, ...prev]);

    // Jump to the date of the latest photo
    const latest = newPhotos.reduce((max, item) => (item.dateObj > max ? item.dateObj : max), newPhotos[0].dateObj);
    if (latest && !isNaN(latest.getTime())) {
      setCurrentDate(latest);
    }
  };

  const handleClearPhotos = () => {
    const updated = timelineData.filter(i => i.type !== 'photo');
    setTimelineData(updated);
    persistTimeline(updated);
    setImportedFiles(prev => prev.filter(f => f.fileType !== 'photos'));
  };

  const handleTogglePhotoFavorite = (photoId: string) => {
    const updated = timelineData.map(item => {
      if (item.id === photoId) {
        return { ...item, favorite: !item.favorite };
      }
      return item;
    });
    setTimelineData(updated);
    persistTimeline(updated);
    if (selectedPhoto && selectedPhoto.id === photoId) {
      setSelectedPhoto(prev => prev ? { ...prev, favorite: !prev.favorite } : null);
    }
  };

  const handleUpdatePhotoDescription = (photoId: string, desc: string) => {
    const updated = timelineData.map(item => {
      if (item.id === photoId) {
        return { ...item, description: desc };
      }
      return item;
    });
    setTimelineData(updated);
    persistTimeline(updated);
    if (selectedPhoto && selectedPhoto.id === photoId) {
      setSelectedPhoto(prev => prev ? { ...prev, description: desc } : null);
    }
  };

  const handleSelectPhoto = (photo: TimelineItem) => {
    setSelectedPhoto(photo);
    setIsPhotoLightboxOpen(true);
  };

  // Update Settings
  const handleUpdateSettings = (updater: Partial<UserSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updater };
      try {
        localStorage.setItem('mylife_settings', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Toggle AMOLED true-black mode (for dark luminance)
  const handleToggleAmoled = () => {
    setIsAmoled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('mylife_amoled', String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Live item counts categorized by type
  const itemsByType = useMemo(() => {
    let spotify = 0;
    let youtube = 0;
    let maps = 0;
    let browser = 0;
    for (const item of timelineData) {
      if (item.type === 'spotify') spotify++;
      else if (item.type === 'youtube') youtube++;
      else if (item.type === 'maps') maps++;
      else if (item.type === 'browser') browser++;
    }
    return { spotify, youtube, maps, browser };
  }, [timelineData]);

  // Selectively clear single dataset without losing other data
  const handleClearDataset = async (type: 'spotify' | 'youtube' | 'maps' | 'browser' | 'notes' | 'events' | 'fit' | 'screentime') => {
    if (type === 'notes') {
      setDailyNotesMap({});
      setBookmarkNotes({});
      setBookmarkTags({});
      try {
        await Promise.all([
          dbDelete('mylife_daily_notes'),
          dbDelete('mylife_bookmark_notes'),
          dbDelete('mylife_bookmark_tags')
        ]);
      } catch (e) {
        console.warn('Failed to clear notes in IndexedDB', e);
      }
      return;
    }

    if (type === 'events') {
      setCalendarEvents([]);
      try {
        await dbDelete('mylife_calendar_events');
      } catch (e) {
        console.warn('Failed to clear events in IndexedDB', e);
      }
      return;
    }

    if (type === 'fit') {
      setGoogleFitData(null);
      try {
        await Promise.all([
          dbDelete('mylife_google_fit'),
          dbDelete('emreh_fit_metrics_v1')
        ]);
      } catch (e) {
        console.warn('Failed to clear Fit data in IndexedDB', e);
      }
      return;
    }

    if (type === 'screentime') {
      try {
        await dbDelete('emreh_screentime_data_v1');
      } catch (e) {
        console.warn('Failed to clear Screentime data in IndexedDB', e);
      }
      return;
    }

    // Otherwise timeline data type (spotify, youtube, maps, browser)
    const updatedTimeline = timelineData.filter(item => item.type !== type);
    setTimelineData(updatedTimeline);
    persistTimeline(updatedTimeline);
    setImportedFiles(prev => prev.filter(f => f.fileType !== type));
  };

  // Export Complete User Archive as Single JSON
  const handleExportFullBackup = async () => {
    // Load additional stores that aren't in React state
    const [storedFitMetrics, storedScreentimeData, storedNotes, storedGoogleFit] = await Promise.all([
      loadStoredFitMetrics(),
      loadStoredScreentimeData(),
      loadStoredNotes(),
      dbGet<GoogleFitDataset | null>('mylife_google_fit', null)
    ]);

    // Collect all localStorage configuration keys
    const localStorageConfig: Record<string, string> = {};
    if (typeof window !== 'undefined' && window.localStorage) {
      const configPrefixes = [
        'mylife_',
        'maps_place_',
        'geo_',
        'neon_'
      ];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && configPrefixes.some(prefix => key.startsWith(prefix))) {
          try {
            const value = localStorage.getItem(key);
            if (value !== null) {
              localStorageConfig[key] = value;
            }
          } catch (_) {}
        }
      }
    }

    const backupData = {
      app: 'Emreh Takeout Dashboard',
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
      timelineData: timelineData.map(({ dateObj, ...rest }) => ({
        ...rest,
        dateObj: dateObj ? dateObj.toISOString() : rest.ts
      })),
      calendarEvents,
      dailyNotesMap,
      importedFiles,
      bookmarkNotes,
      bookmarkTags,
      sessionSnapshots,
      settings,
      googleFitData: storedGoogleFit,
      fitMetrics: storedFitMetrics,
      screentimeData: storedScreentimeData,
      structuredNotes: storedNotes,
      localStorageConfig
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('download', `mylife-archive-${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Restore Complete User Archive from JSON
  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      let data: any;
      try {
        data = JSON.parse(content);
      } catch (err) {
        console.error('Failed to parse backup file:', err);
        alert('Invalid backup file format. Please select a valid Emreh backup JSON file.');
        return;
      }

      // Validate backup structure
      // Check backup schema version
      const backupVersion = data.version || '1.0.0';
      const currentVersion = APP_VERSION;
      
      // Simple semver comparison for major version compatibility
      const parseMajor = (v: string) => parseInt(v.split('.')[0] || '0', 10);
      const backupMajor = parseMajor(backupVersion);
      const currentMajor = parseMajor(currentVersion);
      
      if (backupMajor > currentMajor) {
        const proceed = confirm(
          `Warning: This backup was created with a newer version of Emreh (v${backupVersion}). ` +
          `Current version is v${currentVersion}. Some data may not be compatible.\n\n` +
          `Do you want to proceed anyway?`
        );
        if (!proceed) return;
      } else if (backupMajor < currentMajor) {
        console.warn(`Restoring backup from older version v${backupVersion} to v${currentVersion}. ` +
          `Some fields may be migrated or have defaults applied.`);
      }
      
      // Show restore mode selection modal with parsed data
      setRestoreModal({ isOpen: true, file, mode: 'replace', backupData: data });
    };
    reader.readAsText(file);
  };

  // Execute backup restore with selected mode
  const executeRestore = async (mode: 'replace' | 'merge' | 'new', backupData: any) => {
    const restoreOperations: Array<{ name: string; fn: () => Promise<void> }> = [];

    if (mode === 'new') {
      // For "new workspace", we'd need a more complex implementation
      // For now, treat as replace but warn user
      console.warn('Restore as new workspace not fully implemented, falling back to replace mode');
    }

    if (backupData.timelineData && Array.isArray(backupData.timelineData)) {
      const restoredTimeline: TimelineItem[] = backupData.timelineData.map((item: any) => ({
        ...item,
        dateObj: new Date(item.ts || item.dateObj)
      }));
      restoreOperations.push({
        name: 'Timeline',
        fn: async () => {
          if (mode === 'merge') {
            // Merge: combine with existing, deduplicate by ID
            const existing = await dbGet<TimelineItem[]>('mylife_timeline_items', []);
            const existingIds = new Set(existing.map(i => i.id));
            const newItems = restoredTimeline.filter(i => !existingIds.has(i.id));
            const merged = [...existing, ...newItems];
            await dbSet('mylife_timeline_items', merged);
            setTimelineData(merged);
          } else {
            await dbSet('mylife_timeline_items', restoredTimeline);
            setTimelineData(restoredTimeline);
          }
        }
      });
    }

    if (backupData.calendarEvents && Array.isArray(backupData.calendarEvents)) {
      restoreOperations.push({
        name: 'Calendar Events',
        fn: async () => {
          if (mode === 'merge') {
            const existing = await dbGet<CalendarEvent[]>('mylife_calendar_events', []);
            const existingIds = new Set(existing.map(e => e.id));
            const newEvents = backupData.calendarEvents.filter((e: CalendarEvent) => !existingIds.has(e.id));
            const merged = [...existing, ...newEvents];
            await dbSet('mylife_calendar_events', merged);
            setCalendarEvents(merged);
          } else {
            await dbSet('mylife_calendar_events', backupData.calendarEvents);
            setCalendarEvents(backupData.calendarEvents);
          }
        }
      });
    }

    if (backupData.dailyNotesMap && typeof backupData.dailyNotesMap === 'object') {
      restoreOperations.push({
        name: 'Daily Notes',
        fn: async () => {
          if (mode === 'merge') {
            const existing = await dbGet<Record<string, string>>('mylife_daily_notes', {});
            const merged = { ...existing, ...backupData.dailyNotesMap };
            await dbSet('mylife_daily_notes', merged);
            setDailyNotesMap(merged);
          } else {
            await dbSet('mylife_daily_notes', backupData.dailyNotesMap);
            setDailyNotesMap(backupData.dailyNotesMap);
          }
        }
      });
    }

    if (backupData.importedFiles && Array.isArray(backupData.importedFiles)) {
      restoreOperations.push({
        name: 'Imported Files',
        fn: async () => {
          if (mode === 'merge') {
            const existing = await dbGet<any[]>('mylife_imported_files', []);
            const existingIds = new Set(existing.map(f => f.id));
            const newFiles = backupData.importedFiles.filter((f: any) => !existingIds.has(f.id));
            const merged = [...existing, ...newFiles];
            await dbSet('mylife_imported_files', merged);
            setImportedFiles(merged);
          } else {
            await dbSet('mylife_imported_files', backupData.importedFiles);
            setImportedFiles(backupData.importedFiles);
          }
        }
      });
    }

    if (backupData.bookmarkNotes && typeof backupData.bookmarkNotes === 'object') {
      restoreOperations.push({
        name: 'Bookmark Notes',
        fn: async () => {
          if (mode === 'merge') {
            const existing = await dbGet<Record<string, string>>('mylife_bookmark_notes', {});
            const merged = { ...existing, ...backupData.bookmarkNotes };
            await dbSet('mylife_bookmark_notes', merged);
            setBookmarkNotes(merged);
          } else {
            await dbSet('mylife_bookmark_notes', backupData.bookmarkNotes);
            setBookmarkNotes(backupData.bookmarkNotes);
          }
        }
      });
    }

    if (backupData.bookmarkTags && typeof backupData.bookmarkTags === 'object') {
      const bookmarkTags = backupData.bookmarkTags as Record<string, string[]>;
      restoreOperations.push({
        name: 'Bookmark Tags',
        fn: async () => {
          if (mode === 'merge') {
            const existing = await dbGet<Record<string, string[]>>('mylife_bookmark_tags', {});
            const merged: Record<string, string[]> = { ...existing };
            for (const [url, tags] of Object.entries(bookmarkTags)) {
              const tagsArray = Array.isArray(tags) ? tags : [];
              merged[url] = [...new Set([...(existing[url] || []), ...tagsArray])];
            }
            await dbSet('mylife_bookmark_tags', merged);
            setBookmarkTags(merged);
          } else {
            await dbSet('mylife_bookmark_tags', bookmarkTags);
            setBookmarkTags(bookmarkTags);
          }
        }
      });
    }

    if (backupData.sessionSnapshots && typeof backupData.sessionSnapshots === 'object') {
      restoreOperations.push({
        name: 'Session Snapshots',
        fn: async () => {
          if (mode === 'merge') {
            const existing = await dbGet<Record<string, string>>('mylife_session_snapshots', {});
            const merged = { ...existing, ...backupData.sessionSnapshots };
            await dbSet('mylife_session_snapshots', merged);
            setSessionSnapshots(merged);
          } else {
            await dbSet('mylife_session_snapshots', backupData.sessionSnapshots);
            setSessionSnapshots(backupData.sessionSnapshots);
          }
        }
      });
    }

    if (backupData.settings && typeof backupData.settings === 'object') {
      restoreOperations.push({
        name: 'Settings',
        fn: async () => {
          if (mode === 'merge') {
            const current = { ...backupData.settings };
            handleUpdateSettings(current);
          } else {
            handleUpdateSettings(backupData.settings);
          }
        }
      });
    }

    if ((backupData.googleFitData && typeof backupData.googleFitData === 'object') || (backupData.fitMetrics && typeof backupData.fitMetrics === 'object')) {
      restoreOperations.push({
        name: 'Google Fit & Health Ecosystem',
        fn: async () => {
          const { dataset } = await syncFitEcosystem({
            newDataset: backupData.googleFitData,
            newMetrics: backupData.fitMetrics,
            overwrite: mode === 'replace'
          });
          setGoogleFitData(dataset);
        }
      });
    }

    if (backupData.screentimeData && typeof backupData.screentimeData === 'object') {
      restoreOperations.push({
        name: 'Screentime Data',
        fn: async () => {
          if (mode === 'merge') {
            const existing = await dbGet<Record<string, ScreentimeDayData>>('emreh_screentime_data_v1', {});
            const merged = { ...existing, ...backupData.screentimeData };
            await persistStoredScreentimeData(merged);
          } else {
            await persistStoredScreentimeData(backupData.screentimeData);
          }
        }
      });
    }

    if (backupData.structuredNotes && Array.isArray(backupData.structuredNotes)) {
      restoreOperations.push({
        name: 'Structured Notes',
        fn: async () => {
          if (mode === 'merge') {
            const existing = await loadStoredNotes();
            const existingIds = new Set(existing.map(n => n.id));
            const newNotes = backupData.structuredNotes.filter((n: NoteObject) => !existingIds.has(n.id));
            const merged = [...existing, ...newNotes];
            await persistStoredNotes(merged);
          } else {
            await persistStoredNotes(backupData.structuredNotes);
          }
        }
      });
    }

    // Restore localStorage configuration
    if (backupData.localStorageConfig && typeof backupData.localStorageConfig === 'object') {
      restoreOperations.push({
        name: 'LocalStorage Config',
        fn: async () => {
          if (typeof window !== 'undefined' && window.localStorage) {
            for (const [key, value] of Object.entries(backupData.localStorageConfig)) {
              try {
                if (mode === 'merge') {
                  // For merge, only set if not already present
                  if (localStorage.getItem(key) === null) {
                    localStorage.setItem(key, value as string);
                  }
                } else {
                  localStorage.setItem(key, value as string);
                }
              } catch (_) {}
            }
          }
        }
      });
    }

    if (restoreOperations.length === 0) {
      alert('No valid data found in backup file.');
      return;
    }

    // Execute all restore operations, tracking results
    const results: Array<{ name: string; success: boolean; error?: Error }> = [];
    for (const op of restoreOperations) {
      try {
        await op.fn();
        results.push({ name: op.name, success: true });
      } catch (err) {
        results.push({ name: op.name, success: false, error: err as Error });
        console.error(`Failed to restore ${op.name}:`, err);
      }
    }

    // Report results
    const failed = results.filter(r => !r.success);
    const succeeded = results.filter(r => r.success);

    if (failed.length === 0) {
      console.log('Backup restored successfully:', results.map(r => r.name).join(', '));
      alert(`Restore complete! Restored: ${succeeded.map(r => r.name).join(', ')}`);
    } else if (succeeded.length === 0) {
      console.error('Backup restore failed completely:', failed.map(f => `${f.name}: ${f.error?.message}`).join('; '));
      alert(`Restore failed! Errors: ${failed.map(f => `${f.name}: ${f.error?.message}`).join('; ')}`);
    } else {
      console.warn('Backup partially restored:', { succeeded: succeeded.map(r => r.name), failed: failed.map(f => `${f.name}: ${f.error?.message}`) });
      alert(`Restore partially complete.\nSucceeded: ${succeeded.map(r => r.name).join(', ')}\nFailed: ${failed.map(f => f.name).join(', ')}\n\nCheck console for details.`);
    }
  };

  // Clear all data completely
  const handleClearAllData = async () => {
    setTimelineData([]);
    setCalendarEvents([]);
    setDailyNotesMap({});
    setImportedFiles([]);
    setBookmarkNotes({});
    setBookmarkTags({});
    setSessionSnapshots({});
    setGoogleFitData(null);
    try {
      await Promise.all([
        dbDelete('mylife_timeline_items'),
        dbDelete('mylife_calendar_events'),
        dbDelete('mylife_daily_notes'),
        dbDelete('mylife_imported_files'),
        dbDelete('mylife_bookmark_notes'),
        dbDelete('mylife_bookmark_tags'),
        dbDelete('mylife_session_snapshots'),
        dbDelete('mylife_google_fit'),
        dbDelete('emreh_fit_metrics_v1'),
        dbDelete('emreh_screentime_data_v1'),
        dbDelete('mylife_power_notes_v1')
      ]);
    } catch (e) {
      console.warn('Error clearing IndexedDB storage', e);
    }
  };

  // Optional: Load sample demo data
  const handleLoadDemoData = () => {
    const demoItems = getDemoTimelineData();
    setTimelineData(demoItems);
    persistTimeline(demoItems);
    setCurrentDate(new Date(2025, 4, 15));
    setDailyNotesMap({
      '2025-05-15': 'Morning clinical ward rounds at Medical College Kolkata heritage wards. Revised cardiovascular examination and autonomic reflex tests. Afternoon break at Indian Coffee House with friends discussing philosophy, followed by an evening walk near Victoria Memorial.',
      '2025-05-14': 'Spent hours in the Central Library studying neuroanatomy pathways and cognitive memory consolidation. Quiet golden hour reflecting by College Square.',
      '2025-05-16': 'Weekend reflections: organized reading bibliography and digitized notes. Clinical semesters are rigorous but inspiring.'
    });
    setCalendarEvents([
      { id: 'demo-evt-1', title: 'Cardiology Grand Rounds', date: '2025-05-15', color: '#6366f1', description: 'Bedside case presentation and murmur analysis at Medical College Kolkata.' },
      { id: 'demo-evt-2', title: 'Discussion at Indian Coffee House', date: '2025-05-15', color: '#10b981', description: 'Academic discussion on autonomic regulation.' },
      { id: 'demo-evt-3', title: 'Pathology Practical Slide Review', date: '2025-05-16', color: '#f59e0b', description: 'Histopathology slide review.' }
    ]);
    setBookmarkNotes({
      'https://pubmed.ncbi.nlm.nih.gov/32895478/': 'Essential paper on autonomic cardiovascular regulation.'
    });
    setBookmarkTags({
      'https://pubmed.ncbi.nlm.nih.gov/32895478/': ['medicine', 'cardiology', 'reference'],
      'https://www.nature.com/articles/nrn.2025.102': ['neuroscience', 'research']
    });
    setImportedFiles([
      { id: 'demo-1', fileName: 'Spotify_Streaming_History_2025.json', fileType: 'spotify', recordCount: 7, importDate: '2025-05-15T08:00:00.000Z' },
      { id: 'demo-2', fileName: 'Google_Takeout_Location_History.json', fileType: 'maps', recordCount: 6, importDate: '2025-05-15T08:00:00.000Z' },
      { id: 'demo-3', fileName: 'YouTube_Watch_History.html', fileType: 'youtube', recordCount: 3, importDate: '2025-05-15T08:00:00.000Z' },
      { id: 'demo-4', fileName: 'Chrome_Browser_History.json', fileType: 'browser', recordCount: 3, importDate: '2025-05-15T08:00:00.000Z' },
      { id: 'demo-5', fileName: 'Google_Photos_Heritage_Kolkata.zip', fileType: 'photos', recordCount: 2, photoCount: 2, importDate: '2025-05-15T08:00:00.000Z' },
      { id: 'demo-6', fileName: 'Takeout_Google_Fit_Telemetries.zip', fileType: 'google_fit', recordCount: 35, count: 35, importDate: '2025-05-15T08:00:00.000Z' }
    ]);

    // Bidirectionally synchronize demo GoogleFitDataset (polylines/sessions) & vitals
    syncSampleFitData(new Date(2025, 4, 15)).then(({ dataset }) => {
      setGoogleFitData(dataset);
    }).catch(err => {
      console.warn('Failed to load demo fit data:', err);
    });
  };

  // Metric Profile Drilldown Triggers
  const handleShowTrackProfile = (track: string, artist?: string) => {
    setMetricsModal({
      isOpen: true,
      type: 'track',
      targetName: track,
      subTargetName: artist
    });
  };

  const handleShowArtistProfile = (artist: string) => {
    setMetricsModal({
      isOpen: true,
      type: 'artist',
      targetName: artist
    });
  };

  const handleShowVideoProfile = (title: string, channel?: string) => {
    setMetricsModal({
      isOpen: true,
      type: 'video',
      targetName: title,
      subTargetName: channel
    });
  };

  const handleShowChannelProfile = (channel: string) => {
    setMetricsModal({
      isOpen: true,
      type: 'channel',
      targetName: channel
    });
  };

  const handleShowDomainProfile = (domain: string) => {
    setMetricsModal({
      isOpen: true,
      type: 'domain',
      targetName: domain
    });
  };

  // Map Modal preview
  const handleOpenMapModal = (title: string, subtitle: string, embedUrl: string, extUrl: string) => {
    setMapModal({
      isOpen: true,
      title,
      subtitle,
      embedUrl,
      externalUrl: extUrl
    });
  };

  // Browser Detail Modal
  const handleOpenBrowserDetailModal = (item: TimelineItem) => {
    setBrowserModal({
      isOpen: true,
      item
    });
  };

  // Custom Place Renaming & Labeling Across Timeline Visits
  const handleRenamePlace = (
    targetItem: TimelineItem,
    newName: string,
    applyToAllMatching: boolean,
    newCategory?: string,
    newAddress?: string
  ) => {
    const targetTitle = targetItem.title;
    const targetLat = targetItem.lat;
    const targetLng = targetItem.lng;

    const updated = timelineData.map(item => {
      let shouldUpdate = false;
      if (applyToAllMatching) {
        if (item.id === targetItem.id) {
          shouldUpdate = true;
        } else if (targetTitle && item.title === targetTitle) {
          shouldUpdate = true;
        } else if (
          targetLat != null &&
          targetLng != null &&
          item.lat != null &&
          item.lng != null &&
          Math.abs(item.lat - targetLat) < 0.0005 &&
          Math.abs(item.lng - targetLng) < 0.0005
        ) {
          shouldUpdate = true;
        }
      } else {
        if (item.id === targetItem.id) {
          shouldUpdate = true;
        }
      }

      if (shouldUpdate) {
        return {
          ...item,
          title: newName,
          place_name: newName,
          category: newCategory || item.category,
          address: newAddress !== undefined ? newAddress : item.address
        };
      }
      return item;
    });
    setTimelineData(updated);
    persistTimeline(updated);
  };

  // Resolve Single or Batch Geocoding with OSM Nominatim Caching & Category Extraction
  const handleResolveGeo = async (lat: number, lng: number) => {
    try {
      const geoInfo = await reverseGeocodeItem(lat, lng);
      if (geoInfo) {
        const updated = timelineData.map(item => {
          if (
            item.lat != null &&
            item.lng != null &&
            Math.abs(item.lat - lat) < 0.0005 &&
            Math.abs(item.lng - lng) < 0.0005
          ) {
            return {
              ...item,
              title: geoInfo.name,
              place_name: geoInfo.name,
              address: geoInfo.address || item.address,
              category: geoInfo.category || item.category
            };
          }
          return item;
        });
        setTimelineData(updated);
        persistTimeline(updated);
      }
    } catch (e) {
      console.error('Failed to resolve geocode:', e);
    }
  };

  // Batch Resolve all unresolved coords across history
  const unresolvedItems = useMemo(() => {
    return timelineData.filter(
      i => i.type === 'maps' && i.lat != null && i.lng != null && isGenericPlaceName(i.title)
    );
  }, [timelineData]);

  const handleBatchResolveGeo = async () => {
    if (isGeoResolving || unresolvedItems.length === 0) return;
    setIsGeoResolving(true);
    try {
      const geoMap = await batchReverseGeocodePlaces(unresolvedItems);
      const updated = timelineData.map(item => {
        if (item.lat != null && item.lng != null) {
          const key = `${item.lat.toFixed(4)},${item.lng.toFixed(4)}`;
          const info = geoMap.get(key);
          if (info) {
            return {
              ...item,
              title: info.name,
              place_name: info.name,
              address: info.address || item.address,
              category: info.category || item.category
            };
          }
        }
        return item;
      });
      setTimelineData(updated);
      persistTimeline(updated);
    } catch (e) {
      console.error('Batch resolve error:', e);
    } finally {
      setIsGeoResolving(false);
    }
  };

  // Active Adaptive Bookmark Theme (Pink & Sea Green initially, auto by service or media)
  const activeBookmarkTheme = useMemo(() => {
    return getBookmarkAdaptiveTheme(activeBookmarkService, activeBookmarkMedia);
  }, [activeBookmarkService, activeBookmarkMedia]);

  // View Themes Configuration: color gradient & glass frost across the page
  const VIEW_THEMES: Record<ViewType, {
    containerBg: string;
    headerGlass: string;
    sidebarGlass: string;
    glowMesh: React.ReactNode;
  }> = {
    spotify: {
      // Spotify: Dynamic Emerald & Aurora Swirl
      containerBg: 'dynamic-bg-spotify text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-emerald-500/20 text-white shadow-[0_4px_25px_rgba(16,185,129,0.1)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-emerald-500/20 shadow-[4px_0_25px_rgba(16,185,129,0.1)]',
      glowMesh: (
        <>
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-emerald-500/40 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/4 -right-32 w-[580px] h-[580px] rounded-full bg-teal-400/35 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-36 left-1/4 w-[620px] h-[620px] rounded-full bg-emerald-600/40 blur-[130px] pointer-events-none animate-orb-drift-3" />
          <div className="absolute top-2/3 right-1/4 w-[480px] h-[480px] rounded-full bg-lime-400/30 blur-[120px] pointer-events-none animate-orb-drift-1" />
        </>
      )
    },
    youtube: {
      // YouTube: Dynamic Crimson, Ruby & Sunset Amber Swirl
      containerBg: 'dynamic-bg-youtube text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-red-500/20 text-white shadow-[0_4px_25px_rgba(239,68,68,0.12)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-red-500/20 shadow-[4px_0_25px_rgba(239,68,68,0.12)]',
      glowMesh: (
        <>
          <div className="absolute -top-32 -left-32 w-[620px] h-[620px] rounded-full bg-red-600/45 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/4 -right-32 w-[580px] h-[580px] rounded-full bg-rose-500/40 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-36 left-1/4 w-[620px] h-[620px] rounded-full bg-red-500/40 blur-[130px] pointer-events-none animate-orb-drift-3" />
          <div className="absolute top-1/2 left-1/3 w-[520px] h-[520px] rounded-full bg-amber-500/25 blur-[140px] pointer-events-none animate-orb-drift-1" />
        </>
      )
    },
    browser: {
      // Browser: Google Chrome 4-color blurred style (Yellow, Red, Green, Blue)
      containerBg: 'dynamic-bg-browser text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-amber-500/20 text-white shadow-[0_4px_25px_rgba(251,188,5,0.15)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-amber-500/20 shadow-[4px_0_25px_rgba(251,188,5,0.15)]',
      glowMesh: (
        <>
          <ChromeBlurredBackground />
          <div className="absolute -top-36 -left-36 w-[550px] h-[550px] rounded-full bg-[#FBBC05]/35 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/3 -right-32 w-[550px] h-[550px] rounded-full bg-[#4285F4]/35 blur-[140px] pointer-events-none animate-orb-drift-2" />
        </>
      )
    },
    timeline: {
      // Journal & Life: Crystalline Low-Poly Faceted Art Wallpaper (Dreamy Chromatic Blur)
      containerBg: 'dynamic-bg-journal text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-pink-500/20 text-white shadow-[0_4px_25px_rgba(236,72,153,0.15)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-pink-500/20 shadow-[4px_0_25px_rgba(236,72,153,0.15)]',
      glowMesh: (
        <>
          <LowPolyWallpaper
            blurred={true}
            blurAmount="38px"
            variant={settings.luminance === 'dark' ? 'dark' : 'light'}
            className={settings.luminance === 'dark' ? "opacity-75 dark:opacity-85" : "opacity-25"}
          />
          {settings.luminance === 'dark' && (
            <>
              <div className="absolute inset-0 backdrop-blur-[24px] bg-black/10 dark:bg-black/25 pointer-events-none" />
              <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-pink-500/25 dark:bg-pink-600/30 blur-[130px] pointer-events-none animate-orb-drift-1" />
              <div className="absolute top-1/4 -right-32 w-[580px] h-[580px] rounded-full bg-purple-500/25 dark:bg-purple-600/30 blur-[140px] pointer-events-none animate-orb-drift-2" />
              <div className="absolute -bottom-36 left-1/3 w-[600px] h-[600px] rounded-full bg-cyan-500/20 dark:bg-cyan-600/25 blur-[130px] pointer-events-none animate-orb-drift-3" />
            </>
          )}
        </>
      )
    },
    maptimeline: {
      // Map Timeline: Topography Contour Elevation Map Wallpaper (blurred as requested)
      containerBg: 'dynamic-bg-maptimeline text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-emerald-500/20 text-white shadow-[0_4px_25px_rgba(16,185,129,0.15)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-emerald-500/20 shadow-[4px_0_25px_rgba(16,185,129,0.15)]',
      glowMesh: (
        <>
          <TopographyWallpaper
            className={settings.luminance === 'dark' ? "opacity-85 dark:opacity-95" : "opacity-25"}
            blurred={true}
            variant={settings.luminance === 'dark' ? 'dark' : 'light'}
          />
          {settings.luminance === 'dark' && (
            <>
              <div className="absolute inset-0 backdrop-blur-xl bg-black/10 dark:bg-black/30 pointer-events-none" />
              <div className="absolute -top-36 -left-36 w-[600px] h-[600px] rounded-full bg-emerald-600/40 blur-[130px] pointer-events-none animate-orb-drift-1" />
              <div className="absolute top-1/2 -right-32 w-[580px] h-[580px] rounded-full bg-amber-500/35 blur-[140px] pointer-events-none animate-orb-drift-2" />
              <div className="absolute -bottom-36 left-1/3 w-[550px] h-[550px] rounded-full bg-teal-500/40 blur-[130px] pointer-events-none animate-orb-drift-3" />
            </>
          )}
        </>
      )
    },
    notes: {
      // Notes: Dynamic Molten Amber, Honey & Warm Bronze
      containerBg: 'dynamic-bg-notes text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-amber-500/20 text-white shadow-[0_4px_25px_rgba(245,158,11,0.12)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-amber-500/20 shadow-[4px_0_25px_rgba(245,158,11,0.12)]',
      glowMesh: (
        <>
          <div className="absolute -top-36 -left-36 w-[600px] h-[600px] rounded-full bg-amber-500/45 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute -bottom-40 right-1/4 w-[580px] h-[580px] rounded-full bg-orange-500/40 blur-[130px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute top-1/2 left-1/4 w-[520px] h-[520px] rounded-full bg-yellow-500/30 blur-[140px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    },
    photos: {
      // Google Photos: Dynamic Coral, Sunset Rose & Sunrise Gold
      containerBg: 'dynamic-bg-photos text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-rose-500/20 text-white shadow-[0_4px_25px_rgba(244,63,94,0.12)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-rose-500/20 shadow-[4px_0_25px_rgba(244,63,94,0.12)]',
      glowMesh: (
        <>
          <div className="absolute -top-36 -left-36 w-[600px] h-[600px] rounded-full bg-rose-500/40 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute -bottom-40 right-1/4 w-[580px] h-[580px] rounded-full bg-amber-500/35 blur-[130px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute top-1/2 left-1/4 w-[520px] h-[520px] rounded-full bg-orange-500/30 blur-[140px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    },
    bookmarks: {
      // Bookmarks: Initially Pink & Sea Green, Adaptive by Service/Media (e.g. Pinterest Red, mymind Orange)
      containerBg: activeBookmarkTheme.containerBgClass,
      headerGlass: activeBookmarkTheme.headerGlass,
      sidebarGlass: activeBookmarkTheme.sidebarGlass,
      glowMesh: activeBookmarkTheme.glowOrbs
    },
    box: {
      // Box Cloud: Signature Box Blue & Deep Azure Atmospheric Mesh
      containerBg: 'dynamic-bg-box text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-blue-500/20 text-white shadow-[0_4px_25px_rgba(0,97,213,0.15)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-blue-500/20 shadow-[4px_0_25px_rgba(0,97,213,0.15)]',
      glowMesh: (
        <>
          <div className="absolute -top-36 -left-36 w-[600px] h-[600px] rounded-full bg-blue-600/40 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/4 -right-32 w-[580px] h-[580px] rounded-full bg-cyan-500/35 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-40 left-1/3 w-[550px] h-[550px] rounded-full bg-indigo-600/35 blur-[130px] pointer-events-none animate-orb-drift-3" />
          <div className="absolute top-2/3 right-1/4 w-[480px] h-[480px] rounded-full bg-sky-400/25 blur-[120px] pointer-events-none animate-orb-drift-1" />
        </>
      )
    },
    gdrive: {
      // Google Drive: Google 4-Color Swirl (Yellow, Red, Green, Blue)
      containerBg: 'dynamic-bg-gdrive text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-blue-500/20 text-white shadow-[0_4px_25px_rgba(59,130,246,0.15)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-blue-500/20 shadow-[4px_0_25px_rgba(59,130,246,0.15)]',
      glowMesh: (
        <>
          <ChromeBlurredBackground />
          <div className="absolute -top-36 -left-36 w-[550px] h-[550px] rounded-full bg-[#FBBC05]/35 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/3 -right-32 w-[550px] h-[550px] rounded-full bg-[#4285F4]/35 blur-[140px] pointer-events-none animate-orb-drift-2" />
        </>
      )
    },
    fit: {
      containerBg: 'dynamic-bg-fit text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-orange-500/20 text-white shadow-[0_4px_25px_rgba(249,115,22,0.15)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-orange-500/20 shadow-[4px_0_25px_rgba(249,115,22,0.15)]',
      glowMesh: (
        <>
          <div className="absolute -top-36 -left-36 w-[620px] h-[620px] rounded-full bg-orange-500/35 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/4 -right-32 w-[580px] h-[580px] rounded-full bg-amber-400/30 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-40 left-1/3 w-[560px] h-[560px] rounded-full bg-yellow-500/25 blur-[130px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    },
    home: {
      containerBg: 'dynamic-bg-journal text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-amber-500/20 text-white shadow-[0_4px_25px_rgba(245,158,11,0.12)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-amber-500/20 shadow-[4px_0_25px_rgba(245,158,11,0.12)]',
      glowMesh: (
        <>
          <div className="absolute -top-36 -left-36 w-[600px] h-[600px] rounded-full bg-amber-500/35 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/4 -right-32 w-[580px] h-[580px] rounded-full bg-rose-500/25 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-40 left-1/3 w-[560px] h-[560px] rounded-full bg-blue-500/25 blur-[130px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    },
    screentime: {
      containerBg: 'dynamic-bg-screentime text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-indigo-500/20 text-white shadow-[0_4px_25px_rgba(99,102,241,0.15)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-indigo-500/20 shadow-[4px_0_25px_rgba(99,102,241,0.15)]',
      glowMesh: (
        <>
          <div className="absolute -top-36 -left-36 w-[620px] h-[620px] rounded-full bg-indigo-500/30 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/4 -right-32 w-[580px] h-[580px] rounded-full bg-violet-500/25 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-40 left-1/3 w-[560px] h-[560px] rounded-full bg-sky-500/20 blur-[130px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    }
  };

  const renderLiquidGlowMesh = (view: ViewType, isDark: boolean, bookmarkService: string) => {
    if (isDark) {
      switch (view) {
        case 'spotify':
          return (
            <>
              {/* Luminous emerald-jade fluid bodies */}
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-emerald-400/40 via-teal-500/30 to-green-600/25 blur-[75px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-green-600/35 via-emerald-500/30 to-teal-600/20 blur-[80px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute -bottom-32 left-1/4 w-[580px] h-[580px] bg-gradient-to-r from-teal-400/35 via-emerald-500/25 to-lime-500/20 blur-[75px] pointer-events-none animate-liquid-morph-3" />
              <div className="absolute top-2/3 right-1/4 w-[480px] h-[480px] bg-gradient-to-tl from-lime-400/30 via-emerald-400/20 to-teal-500/15 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-emerald-300/15 via-teal-500/5 to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'youtube':
          return (
            <>
              {/* Luminous ruby-crimson & fiery sunset fluid bodies */}
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-red-500/45 via-rose-600/35 to-orange-600/25 blur-[75px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-rose-600/40 via-red-500/30 to-amber-600/25 blur-[80px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute -bottom-32 left-1/4 w-[580px] h-[580px] bg-gradient-to-r from-red-600/35 via-rose-500/25 to-orange-500/20 blur-[75px] pointer-events-none animate-liquid-morph-3" />
              <div className="absolute top-2/3 right-1/4 w-[480px] h-[480px] bg-gradient-to-tl from-amber-500/30 via-rose-500/20 to-red-600/15 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-rose-400/15 via-red-500/5 to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'notes':
          return (
            <>
              {/* Molten amber, honey & warm bronze fluid bodies */}
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-amber-500/45 via-orange-600/35 to-yellow-600/25 blur-[75px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-orange-600/40 via-amber-500/30 to-yellow-500/25 blur-[80px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute -bottom-32 left-1/4 w-[580px] h-[580px] bg-gradient-to-r from-yellow-500/35 via-amber-600/25 to-orange-500/20 blur-[75px] pointer-events-none animate-liquid-morph-3" />
              <div className="absolute top-2/3 right-1/4 w-[480px] h-[480px] bg-gradient-to-tl from-yellow-400/30 via-amber-500/20 to-orange-600/15 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-amber-300/18 via-orange-400/5 to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'photos':
          return (
            <>
              {/* Coral, sunset rose & sunrise gold fluid bodies */}
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-rose-500/40 via-pink-600/30 to-amber-600/25 blur-[75px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-amber-500/35 via-rose-500/30 to-orange-500/25 blur-[80px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute -bottom-32 left-1/4 w-[580px] h-[580px] bg-gradient-to-r from-pink-500/35 via-rose-600/25 to-amber-500/20 blur-[75px] pointer-events-none animate-liquid-morph-3" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-rose-300/15 via-orange-400/5 to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'box':
          return (
            <>
              {/* Signature Box Blue, Deep Cobalt & Cyan fluid bodies */}
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-blue-600/45 via-sky-500/35 to-indigo-700/25 blur-[75px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-cyan-500/35 via-blue-600/30 to-indigo-600/20 blur-[80px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute -bottom-32 left-1/4 w-[580px] h-[580px] bg-gradient-to-r from-indigo-600/35 via-blue-500/25 to-sky-600/20 blur-[75px] pointer-events-none animate-liquid-morph-3" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-sky-400/20 via-blue-500/8 to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'browser':
        case 'gdrive':
          return (
            <>
              {/* Google Chrome 4-color fluid morphing: Yellow, Blue, Green, Red */}
              <div className="absolute -top-32 -left-20 w-[600px] h-[600px] bg-gradient-to-br from-[#FBBC05]/40 via-amber-400/30 to-yellow-600/20 blur-[75px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] bg-gradient-to-tr from-[#4285F4]/40 via-blue-500/30 to-indigo-600/20 blur-[80px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute -bottom-32 left-1/4 w-[560px] h-[560px] bg-gradient-to-r from-[#34A853]/35 via-emerald-500/25 to-green-600/20 blur-[75px] pointer-events-none animate-liquid-morph-3" />
              <div className="absolute top-2/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-[#EA4335]/35 via-red-500/25 to-rose-600/20 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-blue-400/15 via-amber-400/5 to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'timeline':
          return (
            <>
              {/* Crystalline multifaceted chromatic liquid bodies */}
              <LowPolyWallpaper blurred={true} blurAmount="38px" variant="dark" className="opacity-75 dark:opacity-85" />
              <div className="absolute inset-0 backdrop-blur-[24px] bg-black/15 pointer-events-none" />
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-fuchsia-500/35 via-pink-600/25 to-purple-600/20 blur-[75px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-purple-600/35 via-violet-500/25 to-indigo-600/20 blur-[80px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute -bottom-32 left-1/4 w-[580px] h-[580px] bg-gradient-to-r from-cyan-400/30 via-sky-500/25 to-teal-500/20 blur-[75px] pointer-events-none animate-liquid-morph-3" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-fuchsia-300/15 via-sky-400/5 to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'maptimeline':
          return (
            <>
              {/* Topography contour fluid bodies */}
              <TopographyWallpaper className="opacity-85 dark:opacity-95" blurred={true} variant="dark" />
              <div className="absolute inset-0 backdrop-blur-xl bg-black/20 pointer-events-none" />
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-emerald-500/40 via-teal-600/30 to-green-700/20 blur-[75px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-amber-500/35 via-yellow-600/25 to-orange-600/20 blur-[80px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute -bottom-32 left-1/4 w-[580px] h-[580px] bg-gradient-to-r from-teal-400/35 via-emerald-600/25 to-cyan-600/20 blur-[75px] pointer-events-none animate-liquid-morph-3" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-emerald-300/15 via-amber-400/5 to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'fit':
          return (
            <>
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-orange-500/45 via-amber-500/35 to-yellow-500/20 blur-[75px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-amber-400/40 via-orange-500/30 to-yellow-500/15 blur-[80px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute -bottom-32 left-1/4 w-[580px] h-[580px] bg-gradient-to-r from-yellow-500/30 via-orange-500/20 to-rose-500/15 blur-[75px] pointer-events-none animate-liquid-morph-3" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-orange-300/15 via-amber-400/5 to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'bookmarks':
          if (bookmarkService === 'pinterest') {
            return (
              <>
                <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-red-600/45 via-rose-700/35 to-amber-700/25 blur-[75px] pointer-events-none animate-liquid-morph-1" />
                <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-rose-600/40 via-red-600/30 to-orange-600/20 blur-[80px] pointer-events-none animate-liquid-morph-2" />
                <div className="absolute inset-0 bg-radial-[at_45%_35%] from-red-400/15 via-rose-500/5 to-transparent pointer-events-none animate-liquid-caustics" />
              </>
            );
          }
          if (bookmarkService === 'mymind') {
            return (
              <>
                <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-amber-500/45 via-orange-600/35 to-yellow-600/25 blur-[75px] pointer-events-none animate-liquid-morph-1" />
                <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-orange-600/40 via-amber-500/30 to-yellow-500/20 blur-[80px] pointer-events-none animate-liquid-morph-2" />
                <div className="absolute inset-0 bg-radial-[at_45%_35%] from-amber-300/18 via-orange-400/5 to-transparent pointer-events-none animate-liquid-caustics" />
              </>
            );
          }
          if (bookmarkService === 'github') {
            return (
              <>
                <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-indigo-600/45 via-purple-600/35 to-violet-700/25 blur-[75px] pointer-events-none animate-liquid-morph-1" />
                <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-purple-600/40 via-violet-500/30 to-indigo-600/20 blur-[80px] pointer-events-none animate-liquid-morph-2" />
                <div className="absolute inset-0 bg-radial-[at_45%_35%] from-purple-400/15 via-indigo-500/5 to-transparent pointer-events-none animate-liquid-caustics" />
              </>
            );
          }
          return (
            <>
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-pink-500/40 via-rose-500/30 to-teal-500/20 blur-[75px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-teal-500/35 via-emerald-500/30 to-pink-500/20 blur-[80px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-pink-300/15 via-teal-400/5 to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        default:
          return (
            <>
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-cyan-400/40 via-sky-500/30 to-blue-600/20 blur-[75px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-indigo-600/35 via-violet-500/30 to-purple-600/20 blur-[80px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute -bottom-32 left-1/4 w-[580px] h-[580px] bg-gradient-to-r from-teal-400/30 via-emerald-500/25 to-cyan-500/20 blur-[75px] pointer-events-none animate-liquid-morph-3" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-cyan-300/15 via-sky-500/5 to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
      }
    } else {
      // Light mode: Gentle pearlescent ambient bodies with soft opacity to preserve 100% crisp text contrast!
      switch (view) {
        case 'spotify':
          return (
            <>
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-emerald-200/25 via-teal-100/20 to-lime-100/15 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-teal-200/20 via-emerald-100/15 to-green-100/10 blur-[90px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute -bottom-32 left-1/4 w-[580px] h-[580px] bg-gradient-to-r from-emerald-100/25 via-cyan-100/15 to-teal-100/10 blur-[85px] pointer-events-none animate-liquid-morph-3" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-emerald-300/10 via-transparent to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'youtube':
          return (
            <>
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-rose-200/25 via-pink-100/20 to-orange-100/15 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-red-200/20 via-rose-100/15 to-amber-100/10 blur-[90px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute -bottom-32 left-1/4 w-[580px] h-[580px] bg-gradient-to-r from-orange-100/25 via-rose-100/15 to-pink-100/10 blur-[85px] pointer-events-none animate-liquid-morph-3" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-rose-300/10 via-transparent to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'fit':
          return (
            <>
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-orange-200/25 via-amber-100/20 to-yellow-100/15 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-amber-200/20 via-orange-100/15 to-yellow-100/10 blur-[90px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-orange-300/10 via-transparent to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'notes':
          return (
            <>
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-amber-200/25 via-yellow-100/20 to-orange-100/15 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-yellow-200/20 via-amber-100/15 to-amber-100/10 blur-[90px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-amber-300/10 via-transparent to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'photos':
          return (
            <>
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-rose-200/25 via-orange-100/20 to-amber-100/15 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-amber-200/20 via-pink-100/15 to-rose-100/10 blur-[90px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-rose-300/10 via-transparent to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'browser':
        case 'gdrive':
          return (
            <>
              <div className="absolute -top-32 -left-20 w-[600px] h-[600px] bg-gradient-to-br from-[#FBBC05]/20 via-amber-100/15 to-yellow-200/10 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] bg-gradient-to-tr from-[#4285F4]/20 via-blue-100/15 to-sky-200/10 blur-[90px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute -bottom-32 left-1/4 w-[560px] h-[560px] bg-gradient-to-r from-[#34A853]/20 via-emerald-100/15 to-green-200/10 blur-[85px] pointer-events-none animate-liquid-morph-3" />
              <div className="absolute top-2/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-[#EA4335]/20 via-rose-100/15 to-red-200/10 blur-[90px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-sky-400/10 via-transparent to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'box':
          return (
            <>
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-sky-200/25 via-blue-100/20 to-indigo-100/15 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-blue-200/20 via-cyan-100/15 to-sky-100/10 blur-[90px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-sky-300/10 via-transparent to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'timeline':
          return (
            <>
              <LowPolyWallpaper blurred={true} blurAmount="38px" variant="light" className="opacity-25" />
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-pink-200/25 via-purple-100/20 to-indigo-100/15 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-cyan-200/20 via-sky-100/15 to-blue-100/10 blur-[90px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-purple-300/10 via-transparent to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'maptimeline':
          return (
            <>
              <TopographyWallpaper className="opacity-25" blurred={true} variant="light" />
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-emerald-200/25 via-lime-100/20 to-amber-100/15 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-amber-200/20 via-yellow-100/15 to-emerald-100/10 blur-[90px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-emerald-300/10 via-transparent to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        case 'bookmarks':
          return (
            <>
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-pink-200/25 via-rose-100/20 to-teal-100/15 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-teal-200/20 via-emerald-100/15 to-sky-100/10 blur-[90px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-teal-300/10 via-transparent to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
        default:
          return (
            <>
              <div className="absolute -top-32 -left-20 w-[650px] h-[650px] bg-gradient-to-br from-sky-200/25 via-cyan-100/20 to-blue-100/15 blur-[85px] pointer-events-none animate-liquid-morph-1" />
              <div className="absolute top-1/4 -right-32 w-[620px] h-[620px] bg-gradient-to-tr from-purple-200/20 via-indigo-100/15 to-violet-100/10 blur-[90px] pointer-events-none animate-liquid-morph-2" />
              <div className="absolute inset-0 bg-radial-[at_45%_35%] from-sky-300/10 via-transparent to-transparent pointer-events-none animate-liquid-caustics" />
            </>
          );
      }
    }
  };

  const currentTheme = VIEW_THEMES[currentView] || VIEW_THEMES.timeline;

  // Compute container background based on user's background effect & animation speed settings
  const containerBgClass = useMemo(() => {
    const speedStyle =
      settings.animationSpeed === 'relaxed'
        ? '[animation-duration:32s]'
        : settings.animationSpeed === 'fast'
        ? '[animation-duration:11s]'
        : '[animation-duration:18s]';

    if (settings.backgroundEffect === 'static') {
      return (settings.luminance === 'dark' && isAmoled)
        ? 'bg-[#121214] text-[#fdfcf9]'
        : settings.luminance === 'dark'
        ? 'bg-[#18191c] text-[#fdfcf9]'
        : 'bg-[#fdfcf9] text-[#1a1a1a]';
    }

    const textColor = settings.luminance === 'dark' ? 'text-gray-100' : 'text-slate-900';
    return `${currentTheme.containerBg} ${textColor} ${speedStyle}`;
  }, [settings.luminance, settings.backgroundEffect, settings.animationSpeed, currentTheme.containerBg, isAmoled]);

  return (
    <div
      className={`h-[100dvh] w-full min-h-0 flex flex-col text-[#1a1a1a] dark:text-[#fdfcf9] overflow-hidden font-['Inter',sans-serif] relative transition-colors duration-700 ${containerBgClass}`}
    >
      {/* Ambient view color glow mesh across the entire page (toggleable in Settings) */}
      {settings.showFloatingOrbs && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {settings.backgroundEffect !== 'static' ? (
            settings.theme === 'liquid-glass' ? (
              renderLiquidGlowMesh(currentView, settings.luminance === 'dark', activeBookmarkService)
            ) : (
              currentTheme.glowMesh
            )
          ) : null}
        </div>
      )}

      {/* Mobile Top Header & Bottom Navigation Bar */}
      <MobileNavigation
        currentView={currentView}
        onSetView={setCurrentView}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        importedFilesCount={importedFiles.length}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden z-10">
        {/* Navigation Sidebar: Fixed Editorial Navigation */}
        <Sidebar
          currentView={currentView}
          onSetView={setCurrentView}
          onOpenSearch={() => setIsSearchOpen(true)}
          importedFilesCount={importedFiles.length}
          onOpenImportedFiles={() => setIsImportedFilesModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          isSettingsOpen={isSettingsModalOpen}
          onBatchResolveGeo={handleBatchResolveGeo}
          unresolvedCount={unresolvedItems.length}
          isGeoResolving={isGeoResolving}
          isAmoled={isAmoled}
          className={settings.theme === 'liquid-glass' ? 'liquid-glass-surface' : ''}
        />

        {/* View Router with Snappy Instant View Transitions */}
        <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-transparent pb-16 md:pb-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentView}
              initial={{ opacity: 0.88 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.88 }}
              transition={{ duration: 0.08, ease: 'easeOut' }}
              className="flex-1 flex flex-col min-h-0 w-full h-full overflow-hidden"
            >
              <Suspense fallback={null}>
                {currentView === 'home' && (
                  <HomeView
                    timelineData={combinedTimelineData}
                    dailyNotesMap={dailyNotesMap}
                    onSaveDailyNote={handleSaveDailyNote}
                    photosList={photosList}
                    currentDate={currentDate}
                    importedFilesCount={importedFiles.length}
                    onJumpToDate={handleJumpToDate}
                    onNavigateView={(view) => setCurrentView(view)}
                    onTriggerBackupModal={handleExportFullBackup}
                    onOpenImportedFiles={() => setIsImportedFilesModalOpen(true)}
                    onOpenVoiceMemo={() => setIsVoiceMemoOpen(true)}
                    onImportClick={(type) => {
                      if (type === 'keep') {
                        setIsKeepImportModalOpen(true);
                      } else {
                        handleOpenImportFor((type || 'journal') as any);
                      }
                    }}
                  />
                )}

                {currentView === 'timeline' && (
            <JournalView
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onOpenCalendar={() => handleOpenCalendarFor('journal')}
              onImportClick={() => handleOpenImportFor('journal')}
              dateRange={viewDateRanges.journal}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, journal: null }))}
              onOpenDateRangePicker={() => handleOpenCalendarFor('journal', 'range')}
              items={journalItems}
              events={journalEvents}
              dailyNote={currentDailyNote}
              onSaveDailyNote={handleSaveDailyNote}
              onOpenAddEvent={() => setIsEventModalOpen(true)}
              onDeleteEvent={handleDeleteEvent}
              onSelectBrowser={(item) => {
                setSelectedBrowserItem(item);
                setCurrentView('browser');
              }}
              onShowTrackProfile={handleShowTrackProfile}
              onShowArtistProfile={handleShowArtistProfile}
              onShowVideoProfile={handleShowVideoProfile}
              onShowChannelProfile={handleShowChannelProfile}
              onShowDomainProfile={handleShowDomainProfile}
              onOpenMapModal={handleOpenMapModal}
              onResolveGeo={handleResolveGeo}
              allTimelineData={combinedTimelineData}
              allEvents={calendarEvents}
              dailyNotesMap={dailyNotesMap}
              onSaveSpecificDailyNote={handleSaveSpecificDailyNote}
              onSelectPhoto={handleSelectPhoto}
              onAddEventForDate={(dateKey) => {
                const [y, m, d] = dateKey.split('-').map(Number);
                if (y && m && d) {
                  setCurrentDate(new Date(y, m - 1, d));
                }
                setIsEventModalOpen(true);
              }}
              onJumpToDate={handleJumpToDate}
              onOpenInNotes={handleOpenInNotesFromDate}
              onOpenNote={handleOpenNoteFromAnywhere}
              onLoadDemoData={handleLoadDemoData}
              luminance={settings.luminance}
              theme={settings.theme}
            />
          )}

          {currentView === 'maptimeline' && (
            <MapTimelineView
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onOpenCalendar={() => handleOpenCalendarFor('maps')}
              onImportClick={() => handleOpenImportFor('maps')}
              onJumpToDate={handleJumpToDate}
              dateRange={viewDateRanges.maps}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, maps: null }))}
              onOpenDateRangePicker={() => handleOpenCalendarFor('maps', 'range')}
              items={mapTimelineItems}
              processedData={combinedTimelineData}
              dateIndexMap={dateIndexMap}
              onOpenMapModal={handleOpenMapModal}
              onResolveGeo={handleResolveGeo}
              onRenamePlace={handleRenamePlace}
              onBatchResolveUnknown={handleBatchResolveGeo}
              luminance={settings.luminance}
              theme={settings.theme}
              onShowPlaceProfile={(item) =>
                setMetricsModal({
                  isOpen: true,
                  type: 'place',
                  targetName: item.title,
                  subTargetName: item.subtitle || item.address || ''
                })
              }
            />
          )}

          {currentView === 'spotify' && (
            <SpotifyView
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onOpenCalendar={() => handleOpenCalendarFor('spotify')}
              onJumpToDate={handleJumpToDate}
              dateRange={viewDateRanges.spotify}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, spotify: null }))}
              onOpenDateRangePicker={() => handleOpenCalendarFor('spotify', 'range')}
              processedData={timelineData}
              dateIndexMap={dateIndexMap}
              onShowTrackProfile={handleShowTrackProfile}
              onShowArtistProfile={handleShowArtistProfile}
              onImportClick={() => handleOpenImportFor('spotify')}
            />
          )}

          {currentView === 'youtube' && (
            <YouTubeView
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onOpenCalendar={() => handleOpenCalendarFor('youtube')}
              onJumpToDate={handleJumpToDate}
              dateRange={viewDateRanges.youtube}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, youtube: null }))}
              onOpenDateRangePicker={() => handleOpenCalendarFor('youtube', 'range')}
              processedData={timelineData}
              dateIndexMap={dateIndexMap}
              onShowVideoProfile={handleShowVideoProfile}
              onShowChannelProfile={handleShowChannelProfile}
              onImportClick={() => handleOpenImportFor('youtube')}
            />
          )}

          {currentView === 'browser' && (
            <BrowserView
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onOpenCalendar={() => handleOpenCalendarFor('browser')}
              onImportClick={() => handleOpenImportFor('browser')}
              onJumpToDate={handleJumpToDate}
              dateRange={viewDateRanges.browser}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, browser: null }))}
              onOpenDateRangePicker={() => handleOpenCalendarFor('browser', 'range')}
              processedData={timelineData}
              dateIndexMap={dateIndexMap}
              onShowDomainProfile={handleShowDomainProfile}
              selectedBrowserItem={selectedBrowserItem}
              onSelectBrowserItem={setSelectedBrowserItem}
              bookmarkNotes={bookmarkNotes}
              onSaveBookmarkNote={handleSaveBookmarkNote}
              bookmarkTags={bookmarkTags}
              onAddBookmarkTag={handleAddBookmarkTag}
              onRemoveBookmarkTag={handleRemoveBookmarkTag}
              sessionSnapshots={sessionSnapshots}
              onSaveSessionSnapshot={handleSaveSessionSnapshot}
              onLaunchAuthenticatedSession={captureAuthenticatedTab}
              onCaptureActiveScreen={captureActiveScreen}
              onOpenDetailModal={handleOpenBrowserDetailModal}
            />
          )}

          {currentView === 'notes' && (
            <NotesView
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onOpenCalendar={() => handleOpenCalendarFor('notes')}
              onImportClick={() => handleOpenImportFor('notes')}
              dateRange={viewDateRanges.notes}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, notes: null }))}
              onOpenDateRangePicker={() => handleOpenCalendarFor('notes', 'range')}
              dailyNotesMap={dailyNotesMap}
              onSaveDailyNote={handleSaveSpecificDailyNote}
              onJumpToDate={handleJumpToDate}
              bookmarkNotes={bookmarkNotes}
              timelineData={timelineData}
              pendingTargetNote={pendingTargetNote}
              onNavigateToJournal={handleNavigateToJournal}
            />
          )}

          {currentView === 'photos' && (
            <PhotosView
              photos={photosList}
              onMountNewPhotos={handleMountNewPhotos}
              onClearPhotos={handleClearPhotos}
              onSelectPhoto={handleSelectPhoto}
              onToggleFavorite={handleTogglePhotoFavorite}
              onJumpToJournal={(d) => {
                setCurrentDate(d);
                setCurrentView('timeline');
              }}
              onJumpToMap={() => {
                setCurrentView('maptimeline');
              }}
              onOpenCalendar={() => handleOpenCalendarFor('photos')}
              currentDate={currentDate}
              dateRange={viewDateRanges.photos}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, photos: null }))}
            />
          )}

          {currentView === 'bookmarks' && (
            <BookmarksView
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onOpenCalendar={() => handleOpenCalendarFor('bookmarks')}
              onImportClick={() => handleOpenImportFor('bookmarks')}
              dateRange={viewDateRanges.bookmarks}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, bookmarks: null }))}
              onOpenDateRangePicker={() => handleOpenCalendarFor('bookmarks', 'range')}
              timelineData={timelineData}
              bookmarkNotes={bookmarkNotes}
              onSaveBookmarkNote={handleSaveBookmarkNote}
              bookmarkTags={bookmarkTags}
              onAddBookmarkTag={handleAddBookmarkTag}
              onRemoveBookmarkTag={handleRemoveBookmarkTag}
              sessionSnapshots={sessionSnapshots}
              onOpenSyncModal={handleOpenBookmarkSync}
              onApplySyncedData={handleApplyBookmarkData}
              onActiveServiceChange={(service, media) => {
                setActiveBookmarkService(service);
                setActiveBookmarkMedia(media);
              }}
              onDeleteItem={(id) => {
                const next = timelineData.filter(i => i.id !== id);
                setTimelineData(next);
                persistTimeline(next);
              }}
            />
          )}


          {currentView === 'fit' && (
            <GoogleFitView
              dataset={googleFitData}
              currentDate={currentDate}
              dateRange={viewDateRanges.fit}
              onImportClick={() => handleOpenImportFor('fit')}
              onOpenCalendar={() => handleOpenCalendarFor('fit', 'single')}
              onOpenRange={() => handleOpenCalendarFor('fit', 'range')}
              onClearRange={() => setViewDateRanges(prev => ({ ...prev, fit: null }))}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onJumpToDate={handleJumpToDate}
              initialTab={fitSubView === 'vitals' ? 'insights' : 'workouts'}
              onLoadSampleData={async (sample) => {
                const { dataset: synced } = await syncFitEcosystem({ newDataset: sample, overwrite: true });
                setGoogleFitData(synced);
              }}
              luminance={settings.luminance}
              theme={settings.theme}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
            />
          )}

          {currentView === 'box' && (
            <BoxCloudView
              onImportTimelineItems={(newItems, sourceName) => {
                const next = [...newItems, ...timelineData];
                setTimelineData(next);
                persistTimeline(next);
                setImportedFiles(prev => [
                  {
                    id: `box_file_${Date.now()}`,
                    fileName: sourceName,
                    fileSize: 'Cloud Sync',
                    fileType: 'Box Cloud Storage',
                    importDate: new Date().toLocaleDateString(),
                    recordCount: newItems.length
                  },
                  ...prev
                ]);
              }}
              onNavigateToView={(view) => setCurrentView(view as ViewType)}
            />
          )}

          {currentView === 'gdrive' && (
            <GoogleDriveView
              onNavigateToView={(view) => setCurrentView(view as ViewType)}
            />
          )}

          {currentView === 'screentime' && (
            <ScreentimeView
              currentDate={currentDate}
              timelineData={combinedTimelineData}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onJumpToDate={handleJumpToDate}
              onOpenCalendar={() => handleOpenCalendarFor('screentime')}
            />
          )}
              </Suspense>
        </motion.div>
      </AnimatePresence>
    </main>
      </div>

      {/* Modals wrapped in Suspense */}
      <Suspense fallback={null}>
        <CalendarModal
        isOpen={calendarModal.isOpen}
        onClose={() => setCalendarModal(prev => ({ ...prev, isOpen: false }))}
        currentDate={currentDate}
        onSelectDate={setCurrentDate}
        dateRange={viewDateRanges[calendarModal.mode]}
        onSelectDateRange={(range) =>
          setViewDateRanges(prev => ({ ...prev, [calendarModal.mode]: range }))
        }
        initialTab={calendarModal.initialTab}
        dateIndexMap={dateIndexMap}
        mode={calendarModal.mode}
        dailyNotesMap={dailyNotesMap}
        calendarEvents={calendarEvents}
      />

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSaveEvent={handleAddEvent}
        dateKey={currentDateKey}
      />

      <ImportModal
        isOpen={importModal.isOpen}
        onClose={() => setImportModal(prev => ({ ...prev, isOpen: false }))}
        onImportFiles={handleImportFiles}
        mode={importModal.mode}
        onImportNotes={handleImportNotes}
        onOpenRaindropSync={() => handleOpenBookmarkSync('raindrop')}
        onMountPhotosFolder={async () => {
          setImportModal(prev => ({ ...prev, isOpen: false }));
          const res = await promptNativeDirectoryMount();
          if (res) {
            handleMountNewPhotos(res.items, res.folderName);
            setCurrentView('photos');
          }
        }}
      />

      <BookmarkSyncModal
        isOpen={isRaindropModalOpen}
        onClose={() => setIsRaindropModalOpen(false)}
        onApplySyncedData={handleApplyBookmarkData}
        initialService={bookmarkModalService}
      />

      <ImportedFilesModal
        isOpen={isImportedFilesModalOpen}
        onClose={() => setIsImportedFilesModalOpen(false)}
        importedFiles={importedFiles}
        onDeleteFile={handleDeleteImportedFile}
        onClearAllData={handleClearAllData}
      />

      <MetricsModal
        isOpen={metricsModal.isOpen}
        onClose={() => setMetricsModal(prev => ({ ...prev, isOpen: false }))}
        type={metricsModal.type}
        title={metricsModal.targetName}
        subtitle={metricsModal.subTargetName}
        processedData={combinedTimelineData}
        onJumpToDate={handleJumpToDate}
      />

      <MapOverleafModal
        isOpen={mapModal.isOpen}
        onClose={() => setMapModal(prev => ({ ...prev, isOpen: false }))}
        title={mapModal.title}
        subtitle={mapModal.subtitle}
        embedUrl={mapModal.embedUrl}
        externalUrl={mapModal.externalUrl}
      />

      <BrowserLeafletModal
        isOpen={browserModal.isOpen}
        onClose={() => setBrowserModal({ isOpen: false, item: null })}
        url={browserModal.item?.url}
        title={browserModal.item?.title}
        domain={browserModal.item?.domain}
        timestamp={browserModal.item?.ts}
        bookmarkNotes={bookmarkNotes}
        onSaveBookmarkNote={handleSaveBookmarkNote}
        sessionSnapshots={sessionSnapshots}
        onSaveSessionSnapshot={handleSaveSessionSnapshot}
        onLaunchAuthenticatedSession={captureAuthenticatedTab}
        onCaptureActiveScreen={captureActiveScreen}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        totalEventsCount={timelineData.length}
        itemsByType={itemsByType}
        notesCount={Object.keys(dailyNotesMap).length}
        eventsCount={calendarEvents.length}
        importedFilesCount={importedFiles.length}
        onClearDataset={handleClearDataset}
        onClearAllData={handleClearAllData}
        onExportFullBackup={handleExportFullBackup}
        onImportBackup={handleImportBackup}
        onLoadDemoData={handleLoadDemoData}
        onBatchResolveGeo={handleBatchResolveGeo}
        unresolvedCount={unresolvedItems.length}
        isGeoResolving={isGeoResolving}
        onOpenRaindropSync={() => setIsRaindropModalOpen(true)}
        onOpenImportedFiles={() => setIsImportedFilesModalOpen(true)}
        isAmoled={isAmoled}
        onToggleAmoled={handleToggleAmoled}
      />

      <PhotoLightboxModal
        isOpen={isPhotoLightboxOpen}
        onClose={() => setIsPhotoLightboxOpen(false)}
        photo={selectedPhoto}
        allPhotos={photosList}
        onSelectPhoto={setSelectedPhoto}
        onToggleFavorite={handleTogglePhotoFavorite}
        onUpdateDescription={handleUpdatePhotoDescription}
        onJumpToJournal={(d) => {
          setCurrentDate(d);
          setCurrentView('timeline');
        }}
        onJumpToMap={() => {
          setCurrentView('maptimeline');
        }}
      />

      <FaviconModal
        data={faviconModalData}
        onClose={() => setFaviconModalData(null)}
      />

      <GlobalSearchPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        timelineData={combinedTimelineData}
        dailyNotesMap={dailyNotesMap}
        calendarEvents={calendarEvents}
        currentView={currentView}
        onSelectView={setCurrentView}
        onJumpToDate={(d) => {
          setCurrentDate(d);
        }}
        onSelectSearchResult={(dateStr, item) => {
          if (item?.dateObj) {
            setCurrentDate(item.dateObj);
          } else if (dateStr) {
            const [y, m, d] = dateStr.split('-').map(Number);
            if (y && m && d) setCurrentDate(new Date(y, m - 1, d));
          }
          if (item?.type === 'spotify') setCurrentView('spotify');
          else if (item?.type === 'youtube') setCurrentView('youtube');
          else if (item?.type === 'maps') setCurrentView('maptimeline');
          else if (item?.type === 'browser') setCurrentView('browser');
          else if (item?.type === 'photo') setCurrentView('photos');
          else setCurrentView('timeline');
          setIsSearchOpen(false);
        }}
        onOpenMetricsModal={(modalState) => {
          setMetricsModal({
            isOpen: true,
            type: modalState.type,
            targetName: modalState.targetName,
            subTargetName: modalState.subTargetName
          });
        }}
        onOpenBrowserModal={(item) => {
          setSelectedBrowserItem(item);
          setCurrentView('browser');
        }}
        onOpenMapModal={handleOpenMapModal}
      />

      <EmrehWelcomeCard />

      <AudioVoiceMemoModal
        isOpen={isVoiceMemoOpen}
        onClose={() => setIsVoiceMemoOpen(false)}
        currentDate={currentDate}
        onSaveToJournal={(transcript) => {
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const entry = `🎙️ Voice Memo (${timeStr})\n"${transcript}"`;
          const currentText = dailyNotesMap[currentDateKey] || '';
          handleSaveDailyNote(currentText ? `${currentText}\n\n${entry}` : entry);
        }}
        onSaveToKeep={(title, content) => {
          const entry = `📌 ${title}\n${content}`;
          const currentText = dailyNotesMap[currentDateKey] || '';
          handleSaveDailyNote(currentText ? `${currentText}\n\n${entry}` : entry);
        }}
        onSaveToNotes={(content) => {
          const currentText = dailyNotesMap[currentDateKey] || '';
          handleSaveDailyNote(currentText ? `${currentText}\n\n${content}` : content);
        }}
      />

      <KeepImportModal
        isOpen={isKeepImportModalOpen}
        onClose={() => setIsKeepImportModalOpen(false)}
        onImportNotes={async (notes) => {
          if (notes.length > 0) {
            // Convert Keep notes to structured NoteObjects and persist
            const noteObjects = notes.map(keepNoteToNoteObject);
            await persistStoredNotes(noteObjects);
            
            setImportedFiles(prev => [{
              id: `keep_${Date.now()}`,
              name: `Google Keep (${notes.length} notes)`,
              fileName: `Google Keep (${notes.length} notes)`,
              filename: `Google Keep (${notes.length} notes)`,
              fileSize: `${Math.round(notes.length * 1.5)} KB`,
              fileType: 'notes',
              recordCount: notes.length,
              count: notes.length,
              importDate: new Date().toISOString()
            }, ...prev]);
          }
        }}
      />

      {/* Restore Modal */}
      {restoreModal.isOpen && restoreModal.backupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setRestoreModal({...restoreModal, isOpen: false})}>
          <div className="bg-[#1e1e22] rounded-2xl border border-[#333] w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Restore Backup</h3>
              <button onClick={() => setRestoreModal({...restoreModal, isOpen: false})} className="text-gray-400 hover:text-white p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <p className="text-gray-300 mb-4">
              Choose how to restore the backup (v{restoreModal.backupData.version || 'unknown'}):
            </p>
            
            <div className="space-y-3 mb-6">
              {[
                { value: 'replace', label: 'Replace', desc: 'Overwrite all current data with backup data' },
                { value: 'merge', label: 'Merge', desc: 'Combine backup data with existing (keep both, deduplicate by ID)' },
                { value: 'new', label: 'New Workspace', desc: 'Create separate workspace (not yet implemented, falls back to replace)' }
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover:bg-[#2a2a30]">
                  <input
                    type="radio"
                    name="restoreMode"
                    value={opt.value}
                    checked={restoreModal.mode === opt.value}
                    onChange={() => setRestoreModal({...restoreModal, mode: opt.value as 'replace' | 'merge' | 'new'})}
                    className="w-4 h-4 text-indigo-500 border-gray-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-medium text-white">{opt.label}</div>
                    <div className="text-xs text-gray-400">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRestoreModal({...restoreModal, isOpen: false})}
                className="px-4 py-2 rounded-lg border border-[#333] text-gray-300 hover:bg-[#2a2a30] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const mode = restoreModal.mode;
                  const backupData = restoreModal.backupData;
                  setRestoreModal({...restoreModal, isOpen: false});
                  executeRestore(mode, backupData);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
      </Suspense>
    </div>
  );
};
export default App;
