import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Activity,
  BarChart2,
  Bike,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Compass,
  Download,
  Eye,
  Filter,
  Flame,
  Footprints,
  Heart,
  HeartPulse,
  Info,
  Layers,
  List,
  MapPin,
  Maximize2,
  Navigation,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Route,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Upload,
  Weight,
  X,
  Zap
} from 'lucide-react';
import { GoogleFitDataset, FitWorkout, fitActivityLabel, downsampleTrackpoints } from '../../utils/googleFitParser';
import { getCanonicalFitDataset } from '../../utils/canonicalFitStore';
import { DateRange, TimelineItem } from '../../types';
import { ViewToolbar } from '../ViewToolbar';
import { LeafletMap } from '../LeafletMap';
import { PaneResizer } from '../common/PaneResizer';
import { useResizablePane } from '../../hooks/useResizablePane';
import { createSampleGoogleFitDataset, createSampleFitDailyMetrics } from '../fit/sampleFitData';
import { syncSampleFitData } from '../../utils/fitSync';
import { FitWorkoutInspector } from '../fit/FitWorkoutInspector';
import { UnifiedHealthInsightsView } from '../fit/UnifiedHealthInsightsView';
import { persistStoredFitMetrics } from '../../utils/fitStorage';

export type GoogleFitTab = 'workouts' | 'insights' | 'sources';

interface GoogleFitViewProps {
  dataset: GoogleFitDataset | null;
  currentDate: Date;
  dateRange: DateRange | null;
  onImportClick: () => void;
  onOpenCalendar?: () => void;
  onOpenRange: () => void;
  onClearRange: () => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  onSetToday: () => void;
  onJumpToDate: (d: Date) => void;
  onLoadSampleData?: (dataset: GoogleFitDataset) => void;
  onSwitchToVitals?: () => void;
  initialTab?: GoogleFitTab;
  luminance?: 'light' | 'dark';
  theme?: 'solid-glass' | 'liquid-glass';
  onOpenSettings?: () => void;
}

function fmt(n: number | undefined, unit = '') {
  if (n === undefined || !Number.isFinite(n)) return '—';
  return `${Math.round(n * 10) / 10}${unit}`;
}

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function niceDate(s: string) {
  return new Date(`${s}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export const GoogleFitView: React.FC<GoogleFitViewProps> = ({
  dataset,
  currentDate,
  dateRange,
  onImportClick,
  onOpenCalendar,
  onOpenRange,
  onClearRange,
  onPrevDate,
  onNextDate,
  onSetToday,
  onJumpToDate,
  onLoadSampleData,
  onSwitchToVitals,
  initialTab = 'workouts',
  luminance = 'dark',
  theme = 'solid-glass',
  onOpenSettings
}) => {
  // Navigation & View Modes: exactly 3 clean, uncrowded tabs
  const [activeTab, setActiveTab] = useState<GoogleFitTab>(() => {
    if (initialTab === 'sources') return 'sources';
    if (initialTab === 'insights') return 'insights';
    if (initialTab === 'workouts') return 'workouts';
    return 'workouts';
  });
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');
  const [showRoutes, setShowRoutes] = useState<boolean>(true);

  // Option to hide right map pane (left pane then covers that area by expanding)
  const [isMapHidden, setIsMapHidden] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('google_fit_map_hidden') === 'true';
    }
    return false;
  });

  const showSideMap = activeTab === 'workouts' && !isMapHidden && viewMode !== 'list';

  const toggleHideMap = () => {
    setIsMapHidden(prev => {
      const next = !prev;
      try {
        localStorage.setItem('google_fit_map_hidden', String(next));
      } catch (_) {}
      return next;
    });
  };

  // Selected Workout & Map Focus (does NOT open right panel)
  const [selectedWorkout, setSelectedWorkout] = useState<FitWorkout | null>(null);
  const [selectedCoord, setSelectedCoord] = useState<[number, number] | null>(null);
  const [fitKey, setFitKey] = useState<string | number>(1);

  // Popup modal workout (ONLY opened by clicking the Details button)
  const [modalWorkout, setModalWorkout] = useState<FitWorkout | null>(null);

  // Filter & Search state
  const [workoutSearchQuery, setWorkoutSearchQuery] = useState<string>('');
  const [selectedActivityType, setSelectedActivityType] = useState<string>('all');
  const [gpsOnlyFilter, setGpsOnlyFilter] = useState<boolean>(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState<boolean>(false);
  const [visibleWorkoutCount, setVisibleWorkoutCount] = useState<number>(25);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);

  // Defer map mount by a frame to guarantee instant 60fps page transition
  useEffect(() => {
    const timer = setTimeout(() => setIsMapReady(true), 40);
    return () => clearTimeout(timer);
  }, []);

  // Reset pagination when filter or active tab shifts
  useEffect(() => {
    setVisibleWorkoutCount(25);
  }, [workoutSearchQuery, selectedActivityType, gpsOnlyFilter, activeTab]);

  // Draggable & Resizable Side Pane (Left)
  const leftResizer = useResizablePane({
    initialWidth: 440,
    minWidth: 280,
    maxWidth: 760,
    storageKey: 'google_fit_left_width',
    direction: 'left'
  });

  // Fallback demo state if user loads sample dataset
  const [localDataset, setLocalDataset] = useState<GoogleFitDataset | null>(null);
  const activeDataset = dataset || localDataset;

  useEffect(() => {
    const handleGoogleFitEvent = (e: any) => {
      if (e?.detail) {
        if (e.detail.daily && e.detail.workouts) {
          setLocalDataset(getCanonicalFitDataset(e.detail));
        } else {
          setLocalDataset(e.detail);
        }
      }
    };
    window.addEventListener('emreh_google_fit_updated', handleGoogleFitEvent);
    window.addEventListener('emreh_canonical_fit_updated', handleGoogleFitEvent);
    window.addEventListener('emreh_fit_canonical_updated', handleGoogleFitEvent);
    return () => {
      window.removeEventListener('emreh_google_fit_updated', handleGoogleFitEvent);
      window.removeEventListener('emreh_canonical_fit_updated', handleGoogleFitEvent);
      window.removeEventListener('emreh_fit_canonical_updated', handleGoogleFitEvent);
    };
  }, []);

  const day = dateKey(currentDate);
  const rangeStart = dateRange?.startDate
    ? new Date(`${dateRange.startDate}T00:00:00`).getTime()
    : -Infinity;
  const rangeEnd = dateRange?.endDate
    ? new Date(`${dateRange.endDate}T23:59:59.999`).getTime()
    : Infinity;

  // Pre-indexed Lookups for instantaneous O(1) day changes & lightning performance
  const workoutsByDay = useMemo(() => {
    const map = new Map<string, FitWorkout[]>();
    if (!activeDataset?.workouts) return map;
    for (const w of activeDataset.workouts) {
      const d = w.startTime ? w.startTime.slice(0, 10) : '';
      if (!d) continue;
      const list = map.get(d);
      if (list) list.push(w);
      else map.set(d, [w]);
    }
    return map;
  }, [activeDataset]);

  const intervalsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    if (!activeDataset?.dailyIntervals) return map;
    for (const r of activeDataset.dailyIntervals) {
      const d = r.date || (r.startTime ? r.startTime.slice(0, 10) : '');
      if (!d) continue;
      const list = map.get(d);
      if (list) list.push(r);
      else map.set(d, [r]);
    }
    return map;
  }, [activeDataset]);

  const summariesByDay = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    if (!activeDataset?.dailySummaries) return map;
    for (const s of activeDataset.dailySummaries) {
      if (s.date) map.set(s.date, s.values || {});
    }
    return map;
  }, [activeDataset]);

  // Workouts in current selected date range
  const rangeWorkouts = useMemo(() => {
    if (!activeDataset) return [];
    return (activeDataset.workouts || []).filter(w => {
      const t = Date.parse(w.startTime);
      return t >= rangeStart && t <= rangeEnd;
    });
  }, [activeDataset, rangeStart, rangeEnd]);

  // Workouts specific to currentDate (Day tab) - O(1) lookup
  const dayWorkouts = useMemo(() => {
    return workoutsByDay.get(day) || [];
  }, [workoutsByDay, day]);

  // Reusable comprehensive search and filter matcher
  const matchWorkout = (w: FitWorkout, q: string, activityTypeFilter: string, gpsOnly: boolean) => {
    const hasGps = Boolean(w.trackpoints && w.trackpoints.length > 0);
    if (gpsOnly && !hasGps) return false;
    if (activityTypeFilter !== 'all') {
      const type = (w.activityType || '').toLowerCase();
      if (activityTypeFilter === 'running' && !type.includes('run')) return false;
      if (activityTypeFilter === 'biking' && !type.includes('bike') && !type.includes('cycl')) return false;
      if (activityTypeFilter === 'walking' && !type.includes('walk')) return false;
      if (
        activityTypeFilter === 'gym' &&
        !type.includes('strength') &&
        !type.includes('weight') &&
        !type.includes('gym')
      ) return false;
    }
    if (q) {
      const label = fitActivityLabel(w.activityType).toLowerCase();
      const rawType = (w.activityType || '').toLowerCase();
      const file = (w.provenance?.file || '').toLowerCase();
      const dateStr = (w.startTime || '').toLowerCase();
      const localizedDate = new Date(w.startTime).toLocaleString().toLowerCase();
      const distStr = w.distanceMeters ? `${(w.distanceMeters / 1000).toFixed(1)}km` : '';
      if (
        !label.includes(q) &&
        !rawType.includes(q) &&
        !file.includes(q) &&
        !dateStr.includes(q) &&
        !localizedDate.includes(q) &&
        !distStr.includes(q)
      ) {
        return false;
      }
    }
    return true;
  };

  const normalizedQuery = workoutSearchQuery.trim().toLowerCase();

  // Filtered workouts for current day
  const filteredDayWorkouts = useMemo(() => {
    return dayWorkouts.filter(w => matchWorkout(w, normalizedQuery, selectedActivityType, gpsOnlyFilter));
  }, [dayWorkouts, normalizedQuery, selectedActivityType, gpsOnlyFilter]);

  // Daily interval metrics for current day (15-min rhythm) - O(1) lookup
  const intervals = useMemo(() => {
    return intervalsByDay.get(day) || [];
  }, [intervalsByDay, day]);

  // Daily summary values for current day - O(1) lookup
  const todaySummary = useMemo(() => {
    return summariesByDay.get(day) || {};
  }, [summariesByDay, day]);

  // Aggregate metrics for today
  const metrics = useMemo(() => {
    const get = (...keys: string[]) => {
      for (const k of keys) {
        if (todaySummary[k] !== undefined && todaySummary[k] !== null && todaySummary[k] !== '') {
          const n = Number(todaySummary[k]);
          if (!isNaN(n) && n > 0) return n;
        }
      }
      return 0;
    };
    const fromIntervals = (...keys: string[]) =>
      intervals.reduce((s, r) => {
        for (const k of keys) {
          const val = Number(r.values[k]);
          if (!isNaN(val) && val > 0) return s + val;
        }
        return s;
      }, 0);
    const fromMeasurements = (metricName: string) => {
      if (!activeDataset?.measurements) return 0;
      return activeDataset.measurements
        .filter(m => m.metric === metricName && m.startTime && m.startTime.slice(0, 10) === day)
        .reduce((s, m) => s + (Number(m.value) || 0), 0);
    };

    const steps = get('Step count', 'steps', 'Steps', 'step_count') ||
      fromIntervals('Step count', 'steps') ||
      fromMeasurements('steps');

    const distance = get('Distance (m)', 'distance', 'Distance', 'distance_m') ||
      fromIntervals('Distance (m)', 'distance') ||
      fromMeasurements('distance');

    const calories = get('Calories (kcal)', 'calories', 'Calories', 'calories_kcal') ||
      fromIntervals('Calories (kcal)', 'calories') ||
      fromMeasurements('calories');

    const move = get('Move Minutes count', 'active_minutes', 'move_minutes', 'Active Minutes') ||
      fromIntervals('Move Minutes count', 'active_minutes');

    // 1. Heart Activity (intensity points & active duration)
    // NEVER use Heart Rate (bpm) as a fallback for Heart Points or Minutes!
    const heartPoints = get('Heart Points', 'heart_points') ||
      fromIntervals('Heart Points', 'heart_points');
    const heartMinutes = get('Heart Minutes', 'heart_minutes') ||
      fromIntervals('Heart Minutes', 'heart_minutes');

    // 2. Heart Rate in BPM (resting, average, minimum, maximum pulse)
    // NEVER use Heart Activity (points/minutes) as a fallback for Heart Rate!
    const restingHeartRate = get('Resting heart rate (bpm)', 'resting_heart_rate');
    const averageHeartRate = get('Average heart rate (bpm)', 'average_heart_rate') ||
      fromMeasurements('heart_rate');
    const minHeartRate = get('Min heart rate (bpm)', 'min_heart_rate');
    const maxHeartRate = get('Max heart rate (bpm)', 'max_heart_rate');

    return {
      steps,
      distance,
      calories,
      move,
      // Heart Activity
      heartActivity: {
        points: heartPoints,
        minutes: heartMinutes
      },
      heartPoints,
      heartMinutes,
      // Heart Rate
      heartRate: {
        resting: restingHeartRate || undefined,
        average: averageHeartRate || undefined,
        min: minHeartRate || undefined,
        max: maxHeartRate || undefined
      },
      restingHeartRate: restingHeartRate || undefined,
      averageHeartRate: averageHeartRate || undefined,
      minHeartRate: minHeartRate || undefined,
      maxHeartRate: maxHeartRate || undefined,
      // Backward-compatibility: heart is strictly heartPoints, NEVER heart rate
      heart: heartPoints
    };
  }, [todaySummary, intervals, activeDataset, day]);

  // Filtered workouts for Workouts Tab
  const filteredWorkouts = useMemo(() => {
    return rangeWorkouts.filter(w => matchWorkout(w, normalizedQuery, selectedActivityType, gpsOnlyFilter));
  }, [rangeWorkouts, normalizedQuery, selectedActivityType, gpsOnlyFilter]);

  const hasActiveFilters = Boolean(
    normalizedQuery || selectedActivityType !== 'all' || gpsOnlyFilter
  );

  const resetFilters = () => {
    setWorkoutSearchQuery('');
    setSelectedActivityType('all');
    setGpsOnlyFilter(false);
  };

  // Measurements & Weight
  const filteredMeasurements = useMemo(() => {
    if (!activeDataset) return [];
    return (activeDataset.measurements || []).filter(m => {
      const t = Date.parse(m.startTime);
      return t >= rangeStart && t <= rangeEnd;
    });
  }, [activeDataset, rangeStart, rangeEnd]);

  const latestWeight = useMemo(() => {
    const weights = [...filteredMeasurements]
      .filter(m => m.metric === 'weight' && m.value !== undefined)
      .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));
    return weights[0]?.value;
  }, [filteredMeasurements]);

  // Convert Google Fit Workouts into Map TimelineItems for LeafletMap
  const allFitMapItems = useMemo<TimelineItem[]>(() => {
    if (!activeDataset) return [];

    const items: TimelineItem[] = [];

    // 1. Workouts with GPS trackpoints
    (activeDataset.workouts || []).forEach(w => {
      const pts = (w.trackpoints || []).filter(
        p => p.lat != null && p.lng != null && !isNaN(p.lat) && !isNaN(p.lng)
      );

      if (pts.length >= 2) {
        const startPt = pts[0];
        const distKm = (w.distanceMeters || 0) / 1000;
        const durMin = Math.round((w.durationSeconds || 0) / 60);
        const actLabel = fitActivityLabel(w.activityType);

        const endPt = pts[pts.length - 1];
        const sampledPts = downsampleTrackpoints(pts, 120);

        items.push({
          id: `fit_w_${w.id}`,
          type: 'maps',
          title: actLabel,
          subtitle: `${distKm > 0 ? `${distKm.toFixed(2)} km · ` : ''}${durMin} min · ${w.calories || 0} kcal`,
          ts: w.startTime,
          dateObj: new Date(w.startTime),
          lat: startPt.lat!,
          lng: startPt.lng!,
          isRoute: true,
          pathPoints: sampledPts.map(p => ({ lat: p.lat!, lng: p.lng! })),
          activityType: w.activityType,
          travelMode: w.activityType,
          distanceKm: distKm > 0 ? distKm.toFixed(2) : undefined,
          ms_played: (w.durationSeconds || 0) * 1000,
          origin: { lat: startPt.lat!, lng: startPt.lng!, address: 'Start' },
          destination: { lat: endPt.lat!, lng: endPt.lng!, address: 'Finish' },
          raw: w
        });
      } else if (pts.length === 1) {
        const pt = pts[0];
        items.push({
          id: `fit_w_pt_${w.id}`,
          type: 'maps',
          title: fitActivityLabel(w.activityType),
          subtitle: `${new Date(w.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          ts: w.startTime,
          dateObj: new Date(w.startTime),
          lat: pt.lat!,
          lng: pt.lng!,
          activityType: w.activityType,
          raw: w
        });
      }
    });

    return items;
  }, [activeDataset]);

  // Pre-indexed map items grouped by day for instant day changes
  const mapItemsByDay = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const item of allFitMapItems) {
      const d = (item.ts || '').slice(0, 10);
      if (!d) continue;
      const list = map.get(d);
      if (list) list.push(item);
      else map.set(d, [item]);
    }
    return map;
  }, [allFitMapItems]);

  // User toggle to explore all routes if explicitly requested
  const [showAllRoutesOverride, setShowAllRoutesOverride] = useState<boolean>(false);

  // Context-aware map items:
  // - If a workout is selected, show that specific workout route
  // - If showAllRoutesOverride is active, show all routes
  // - If on 'day' tab, show ONLY this day's routes (instant O(1) lookup)
  // - If on 'workouts' tab, show filtered workouts (up to 25 recent for fast 60fps rendering unless all requested)
  const { mapDisplayItems, isFallbackToAllRoutes } = useMemo(() => {
    if (selectedWorkout) {
      const match = allFitMapItems.find(i => i.id === `fit_w_${selectedWorkout.id}`);
      if (match) return { mapDisplayItems: [match], isFallbackToAllRoutes: false };
    }

    if (showAllRoutesOverride) {
      return { mapDisplayItems: allFitMapItems, isFallbackToAllRoutes: true };
    }

    if (activeTab === 'day') {
      const dayItems = mapItemsByDay.get(day) || [];
      return { mapDisplayItems: dayItems, isFallbackToAllRoutes: false };
    }

    if (activeTab === 'workouts') {
      // By default show recent 25 workout routes on the map to prevent Leaflet freeze
      const recentWorkouts = filteredWorkouts.slice(0, 25);
      const ids = new Set(recentWorkouts.map(w => `fit_w_${w.id}`));
      const subset = allFitMapItems.filter(i => ids.has(i.id));
      return {
        mapDisplayItems: subset,
        isFallbackToAllRoutes: false
      };
    }

    return { mapDisplayItems: [], isFallbackToAllRoutes: false };
  }, [allFitMapItems, mapItemsByDay, selectedWorkout, activeTab, day, filteredWorkouts, showAllRoutesOverride]);

  // Auto-fit selected day on map whenever the day or active tab changes
  useEffect(() => {
    setSelectedWorkout(null);
    setSelectedCoord(null);
    setFitKey(Date.now());
  }, [day, activeTab]);

  // Explicit auto-fit for current day
  const handleAutoFitDay = () => {
    setSelectedWorkout(null);
    setSelectedCoord(null);
    setFitKey(Date.now());
  };

  // Handler: User clicks a workout card on the left
  // USER INTENT: On click don't open right panel. Keep a button on the left cards to show details.
  const handleCardClick = (workout: FitWorkout) => {
    setSelectedWorkout(workout);
    const pts = (workout.trackpoints || []).filter(
      p => p.lat != null && p.lng != null && !isNaN(p.lat) && !isNaN(p.lng)
    );
    if (pts.length > 0) {
      setSelectedCoord([pts[0].lat!, pts[0].lng!]);
      setFitKey(Date.now());
    }
  };

  // Focus specific workout on the map (from GPS button)
  const handleFocusWorkoutOnMap = (workout: FitWorkout) => {
    setSelectedWorkout(workout);
    const pts = (workout.trackpoints || []).filter(
      p => p.lat != null && p.lng != null && !isNaN(p.lat) && !isNaN(p.lng)
    );
    if (pts.length > 0) {
      setSelectedCoord([pts[0].lat!, pts[0].lng!]);
      setFitKey(Date.now());
    }
    if (isMapHidden) {
      setIsMapHidden(false);
    }
  };

  // Handler: User clicks a route on the Leaflet Map
  const handleSelectMapItem = (item: TimelineItem) => {
    if (item.raw && (item.raw as any).activityType) {
      setSelectedWorkout(item.raw as FitWorkout);
    }
  };

  // Sample data loader
  const handleLoadSample = async () => {
    const { dataset: sample } = await syncSampleFitData(currentDate);
    setLocalDataset(sample);
    if (onLoadSampleData) {
      onLoadSampleData(sample);
    }
    onJumpToDate(new Date(sample.dateRange.end || Date.now()));
  };

  // Empty state when no dataset is present
  if (!activeDataset) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 text-gray-900 dark:text-white flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="p-8 sm:p-10 rounded-[32px] border border-stone-200/90 dark:border-stone-800/80 bg-white/80 dark:bg-[#12141a]/90 backdrop-blur-2xl shadow-xl text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-[26px] bg-gradient-to-br from-orange-400/20 via-amber-300/20 to-yellow-200/10 flex items-center justify-center border border-orange-500/20">
              <HeartPulse className="w-10 h-10 text-orange-500" />
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 text-orange-500 font-bold text-xs uppercase tracking-[0.24em]">
                <Activity className="w-4 h-4" /> Google Fit Takeout Studio
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 text-gray-900 dark:text-white">
                Reconstruct Your Movement Timeline
              </h1>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-lg mx-auto">
                Emreh reads your full Google Fit Takeout archive: Daily activity metrics, All Sessions, All Data, and TCX GPS activities. View your movement rhythms, route maps, body metrics, and health insights with interactive split-view map visualization.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={onImportClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white px-6 py-3.5 font-bold shadow-lg shadow-orange-500/20 transition-all cursor-pointer active:scale-98"
              >
                <Upload className="w-4 h-4" />
                <span>Import Google Fit ZIP / Folder</span>
              </button>

              <button
                onClick={handleLoadSample}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-white px-6 py-3.5 font-bold border border-gray-200/80 dark:border-white/10 transition-all cursor-pointer active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span>Load Sample Fit Data</span>
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-white/5 text-xs text-gray-400 flex flex-wrap justify-center gap-4">
              <span>✓ Daily Steps & Distance</span>
              <span>✓ Interactive Side Map</span>
              <span>✓ TCX GPS Routes</span>
              <span>✓ Health Insights</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Primary tabs configuration: exactly 3 clean, uncrowded buttons
  const tabs: Array<{ id: GoogleFitTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'workouts', label: 'Activities & Routes', icon: Route },
    { id: 'insights', label: 'Health Insights', icon: HeartPulse },
    { id: 'sources', label: 'Data Sources', icon: Layers }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent text-gray-900 dark:text-white overflow-hidden">
      {/* 1. Header Toolbar */}
      <ViewToolbar
        className="bg-white/55 dark:bg-[#121214]/60 backdrop-blur-xl supports-[backdrop-filter]:bg-white/50 dark:supports-[backdrop-filter]:bg-[#121214]/55"
        badge={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 text-xs font-bold tracking-wide">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Google Fit</span>
          </div>
        }
        currentDate={currentDate}
        onPrevDate={onPrevDate}
        onNextDate={onNextDate}
        onSetToday={onSetToday}
        onJumpToDate={onJumpToDate}
        onOpenCalendar={onOpenCalendar || onOpenRange}
        showDateNavigation={true}
        dateRange={dateRange}
        onClearDateRange={onClearRange}
        onOpenDateRangePicker={onOpenRange}
        showImport={true}
        onImportClick={onImportClick}
        importLabel="Import Fit"
        showSearch={activeTab === 'workouts'}
        searchQuery={workoutSearchQuery}
        onSearchChange={setWorkoutSearchQuery}
        searchPlaceholder="Search activities, dates, types..."
        searchResultsCount={
          normalizedQuery
            ? filteredWorkouts.length
            : undefined
        }
        hasActiveFilters={activeTab === 'workouts' && hasActiveFilters}
        onOpenSettings={onOpenSettings}
        leftActions={
          <div className="flex items-center gap-1 p-0.5 bg-gray-200/50 dark:bg-white/5 rounded-lg border border-gray-200/60 dark:border-white/5 text-xs overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedWorkout(null);
                  }}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer font-medium whitespace-nowrap ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-2xs font-semibold'
                      : 'text-gray-600 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-500/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        }
        rightActions={
          activeTab === 'workouts' ? (
            <button
              type="button"
              onClick={toggleHideMap}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isMapHidden
                  ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-white/10'
              }`}
              title={isMapHidden ? "Show Map Pane" : "Hide Map Pane (Expand List)"}
            >
              {isMapHidden ? (
                <>
                  <PanelRightOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Show Map</span>
                </>
              ) : (
                <>
                  <PanelRightClose className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hide Map</span>
                </>
              )}
            </button>
          ) : undefined
        }
      >
        {activeTab === 'workouts' && (
          <div className="space-y-3">
            {/* Header & Reset */}
            <div className="flex items-center justify-between pb-1.5 border-b border-black/8 dark:border-white/10">
              <span className="text-[11px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Filter Activities
              </span>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-[10px] text-orange-500 hover:underline font-bold cursor-pointer"
                >
                  Reset All
                </button>
              )}
            </div>

            {/* Activity Type Selection */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Activity Type</span>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {[
                  { id: 'all', label: 'All Types' },
                  { id: 'running', label: 'Running' },
                  { id: 'biking', label: 'Cycling' },
                  { id: 'walking', label: 'Walking' },
                  { id: 'gym', label: 'Strength / Gym' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedActivityType(f.id)}
                    className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedActivityType === f.id
                        ? 'bg-orange-500 text-white shadow-2xs'
                        : 'bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* GPS Only Toggle */}
            <div className="pt-1.5 border-t border-black/8 dark:border-white/10">
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  GPS Tracked Only
                </span>
                <input
                  type="checkbox"
                  checked={gpsOnlyFilter}
                  onChange={e => setGpsOnlyFilter(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400 cursor-pointer accent-orange-500"
                />
              </label>
            </div>

            {/* Layout Mode */}
            <div className="space-y-1.5 pt-1.5 border-t border-black/8 dark:border-white/10">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                Layout Mode
              </span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200/80 dark:border-white/10 text-xs">
                <button
                  onClick={() => setViewMode('split')}
                  className={`py-1.5 px-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer font-semibold ${
                    viewMode === 'split'
                      ? 'bg-white dark:bg-gray-800 text-orange-500 shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Split</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`py-1.5 px-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer font-semibold ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-800 text-orange-500 shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="text-[10px]">List</span>
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`py-1.5 px-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer font-semibold ${
                    viewMode === 'map'
                      ? 'bg-white dark:bg-gray-800 text-orange-500 shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Full Map</span>
                </button>
              </div>
            </div>

            {/* Section: GPS & Route layers */}
            <div className="space-y-1.5 pt-1.5 border-t border-black/8 dark:border-white/10">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                Map Polylines
              </span>
              <button
                onClick={() => setShowRoutes(!showRoutes)}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Route className="w-3.5 h-3.5 text-orange-500" />
                  <span>Show GPS Polylines</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    showRoutes
                      ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {showRoutes ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>
        )}
      </ViewToolbar>

      {/* 2. Main Split Content (Left scrollable panel + Right LeafletMap) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative bg-stone-100/40 dark:bg-[#0e0f12]">
        {/* Left / Bottom Panel */}
        {viewMode !== 'map' && (
          <div
            className={`overflow-y-auto overscroll-contain min-h-0 border-b md:border-b-0 ${
              showSideMap ? 'md:border-r border-stone-200/60 dark:border-white/10' : ''
            } transition-all shrink-0 ${
              theme === 'liquid-glass'
                ? 'bg-white/55 dark:bg-[#0c1626]/50 backdrop-blur-2xl border-white/50 dark:border-white/10 shadow-md'
                : 'bg-white/50 dark:bg-black/35 backdrop-blur-xl border-stone-200/50 dark:border-white/10 shadow-2xs'
            } relative shrink-0 ${
              !showSideMap
                ? 'w-full h-full p-4 sm:p-6 md:p-8'
                : 'w-full h-1/2 md:h-full p-4 sm:p-5'
            }`}
            style={{
              width: !showSideMap
                ? '100%'
                : (typeof window !== 'undefined' && window.innerWidth >= 768 ? `${leftResizer.width}px` : undefined),
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y'
            }}
          >
            {/* SUB-VIEW 1: WORKOUTS & ROUTES */}
            {activeTab === 'workouts' && (
              <div className="space-y-4 pb-8">
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">
                    Recorded Activities & Routes
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {rangeWorkouts.length} workouts in selected range
                  </p>
                </div>

                {/* Search & Filter Bar */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search activities, filenames, dates..."
                      value={workoutSearchQuery}
                      onChange={e => setWorkoutSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 rounded-xl bg-black/[0.025] dark:bg-white/[0.05] border border-gray-200/80 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                    />
                    {workoutSearchQuery && (
                      <button
                        onClick={() => setWorkoutSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'running', label: 'Running' },
                      { id: 'biking', label: 'Cycling' },
                      { id: 'walking', label: 'Walking' },
                      { id: 'gym', label: 'Strength/Gym' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedActivityType(f.id)}
                        className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-medium transition-all cursor-pointer ${
                          selectedActivityType === f.id
                            ? 'bg-orange-500 text-white font-bold shadow-2xs'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}

                    {/* GPS Only Filter Button */}
                    <button
                      type="button"
                      onClick={() => setGpsOnlyFilter(prev => !prev)}
                      className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-medium transition-all cursor-pointer flex items-center gap-1 ${
                        gpsOnlyFilter
                          ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                      title="Show only workouts with GPS route data"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>GPS Only</span>
                    </button>

                    {hasActiveFilters && (
                      <button
                        onClick={resetFilters}
                        className="text-[11px] text-orange-500 hover:underline font-bold px-1 whitespace-nowrap cursor-pointer ml-auto"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Workouts List */}
                {filteredWorkouts.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-xs">
                    No workouts matching current filters.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredWorkouts.slice(0, visibleWorkoutCount).map(w => {
                      const hasGps = Boolean(w.trackpoints && w.trackpoints.length > 0);
                      const isSelected = selectedWorkout?.id === w.id;
                      const distKm = (w.distanceMeters || 0) / 1000;
                      const durMin = Math.round((w.durationSeconds || 0) / 60);

                      return (
                        <div
                          key={w.id}
                          onClick={() => handleCardClick(w)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-orange-500/15 border-orange-500 shadow-sm backdrop-blur-md'
                              : 'bg-white/65 dark:bg-[#181818]/65 backdrop-blur-md border-gray-200/80 dark:border-white/10 hover:border-orange-400/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-gray-900 dark:text-white">
                                {fitActivityLabel(w.activityType)}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-400 font-mono shrink-0">
                              {new Date(w.startTime).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-mono text-gray-600 dark:text-gray-300">
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase block">
                                Duration
                              </span>
                              <span>{durMin} min</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase block">
                                Distance
                              </span>
                              <span>{distKm > 0 ? `${distKm.toFixed(2)} km` : '—'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase block">Burn</span>
                              <span>{w.calories ? `${w.calories} kcal` : '—'}</span>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-2">
                            <div className="text-[10px] text-gray-400">
                              {hasGps ? `${w.trackpoints.length} GPS trackpoints` : 'No GPS recording'}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Details button: only clicking this opens a pop up to show details */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalWorkout(w);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Show details in popup"
                              >
                                <Info className="w-3.5 h-3.5" />
                                <span>Details</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredWorkouts.length > visibleWorkoutCount && (
                      <button
                        type="button"
                        onClick={() => setVisibleWorkoutCount(prev => prev + 30)}
                        className="w-full py-3 rounded-2xl border border-dashed border-gray-300 dark:border-white/20 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-orange-500 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all cursor-pointer text-center"
                      >
                        Load more workouts ({visibleWorkoutCount} of {filteredWorkouts.length} displayed)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SUB-VIEW 2: HEALTH INSIGHTS (Consolidated Vitals Hub, Day Log, 30-Day Trends, Health Insights, Body Measurements) */}
            {activeTab === 'insights' && (
              <div className="pb-8">
                <UnifiedHealthInsightsView
                  dataset={activeDataset}
                  currentDate={currentDate}
                  onPrevDate={onPrevDate}
                  onNextDate={onNextDate}
                  onSetToday={onSetToday}
                  onJumpToDate={onJumpToDate}
                  onSelectWorkout={w => setModalWorkout(w)}
                  onLoadSampleData={handleLoadSample}
                  onImportClick={onImportClick}
                  onSwitchToWorkouts={() => setActiveTab('workouts')}
                />
              </div>
            )}

            {/* SUB-VIEW 3: DATA SOURCES */}
            {activeTab === 'sources' && (
              <div className="space-y-4 pb-8">
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">
                    Data Sources & Provenance
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Original streams and files retained without flattening
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-white/65 dark:bg-[#181818]/65 backdrop-blur-md border border-gray-200/80 dark:border-white/10 shadow-2xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      Files Scanned
                    </span>
                    <div className="text-2xl font-black mt-1">{activeDataset.filesScanned}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/65 dark:bg-[#181818]/65 backdrop-blur-md border border-gray-200/80 dark:border-white/10 shadow-2xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      Files Recognized
                    </span>
                    <div className="text-2xl font-black text-emerald-500 mt-1">
                      {activeDataset.filesRecognized}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/65 dark:bg-[#181818]/65 backdrop-blur-md border border-gray-200/80 dark:border-white/10 shadow-2xs space-y-3">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    Provider Stream Breakdown
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(activeDataset.sourceCounts || {}).map(([src, count]) => (
                      <div
                        key={src}
                        className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{src}</span>
                        <span className="font-mono font-bold text-orange-500">{count} files</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Drag Resizer between Left Sidebar and Map */}
        {showSideMap && viewMode === 'split' && (
          <PaneResizer
            isDragging={leftResizer.isDragging}
            onMouseDown={leftResizer.handleMouseDown}
            onTouchStart={leftResizer.handleTouchStart}
            accentColor="orange"
            title="Drag to resize Google Fit sidebar"
          />
        )}

        {/* Right / Center Panel: Interactive Side Map */}
        {showSideMap && (
          <div
            className="h-1/2 md:h-full relative overflow-hidden bg-gray-100 dark:bg-[#1e1e1e] flex-1 min-w-0 z-0 isolate contain-paint"
            style={{
              contain: 'paint layout',
              isolation: 'isolate'
            }}
          >
            {isMapReady ? (
              <LeafletMap
                containerId="google-fit-leaflet-map"
                items={mapDisplayItems}
                selectedCoord={selectedCoord}
                selectedItemId={selectedWorkout ? `fit_w_${selectedWorkout.id}` : null}
                onSelectItem={handleSelectMapItem}
                showRoutes={showRoutes}
                onToggleRoutes={setShowRoutes}
                fitKey={fitKey}
                filterLabel="Google Fit Activities"
                isDark={luminance === 'dark'}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100/60 dark:bg-[#181818]/60 backdrop-blur-xs">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <Activity className="w-4 h-4 animate-spin text-orange-500" />
                  <span>Loading route map...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workout Details Popup Modal (Only opens when clicking Details button on left cards) */}
      {modalWorkout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setModalWorkout(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#12141a] rounded-3xl shadow-2xl border border-stone-200/80 dark:border-stone-800/80 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <FitWorkoutInspector
              workout={modalWorkout}
              onClose={() => setModalWorkout(null)}
              onFocusMap={w => {
                handleFocusWorkoutOnMap(w);
                setModalWorkout(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
