import { FitDailyMetric, FitWorkout as AppFitWorkout, TimelineItem } from '../types';
import { dbGet, dbSet } from './storage';
import {
  GoogleFitDataset,
  FitWorkout,
  FitSession,
  FitDailySummary,
  FitDailyInterval,
  FitMeasurement,
  convertGoogleFitToTimelineItems
} from './googleFitParser';
import { extractFitDailyMetricsFromDataset, mergeFitMetrics } from './fitImporter';
import { createSampleGoogleFitDataset, createSampleFitDailyMetrics } from '../components/fit/sampleFitData';
import {
  replaceCanonicalFitData,
  FIT_STORES,
  DB_NAME,
  openDB,
  getRawRows,
  getDerivedRows,
  getSessionRows,
  getActivityRows,
  getDailyRows,
  getImportMeta,
  getExcludedPoints,
  addExcludedPoint,
  removeExcludedPoint
} from './canonicalFitDB';

export * from './canonicalFitDB';

import {
  CANONICAL_FIT_STORAGE_KEY,
  LEGACY_GOOGLE_FIT_KEY,
  LEGACY_FIT_METRICS_KEY
} from './fitConstants';

export {
  CANONICAL_FIT_STORAGE_KEY,
  LEGACY_GOOGLE_FIT_KEY,
  LEGACY_FIT_METRICS_KEY
};

/**
 * Normalizes any workout (from AppFitWorkout or FitWorkout) into the exact FitWorkout structure.
 */
export function normalizeFitWorkout(w: AppFitWorkout | FitWorkout, fallbackDate?: string): FitWorkout {
  const datePart = fallbackDate || (w.startTime ? w.startTime.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const id = w.id || `w_${datePart}_${Date.now()}`;
  const title = w.title || 'Workout Session';
  const activityType = w.activityType || (w as any).type || 'Workout';
  const durSec = w.durationSeconds ?? ((w as any).durationMinutes ? (w as any).durationMinutes * 60 : undefined);
  const distMeters = (w as any).distanceMeters ?? ((w as any).distanceKm ? Math.round((w as any).distanceKm * 1000) : undefined);

  return {
    id,
    title,
    activityType,
    startTime: w.startTime,
    endTime: w.endTime,
    durationSeconds: durSec,
    distanceMeters: distMeters,
    calories: w.calories,
    laps: (w.laps || []).map(lap => ({
      startTime: lap.startTime,
      durationSeconds: lap.durationSeconds,
      distanceMeters: lap.distanceMeters,
      calories: lap.calories,
      intensity: lap.intensity,
      trackpoints: lap.trackpoints || []
    })),
    trackpoints: w.trackpoints || [],
    provenance: w.provenance || { file: 'manual_entry', dataset: 'activities' }
  };
}

/**
 * The single canonical schema for all Google Fit and health data across the application.
 *
 * Google Fit Takeout
 *         ↓
 *    Canonical Fit DB
 *         ↓
 *  ┌──────┼────────┐
 *  ↓      ↓        ↓
 * Daily  Workout  Measurements
 * View    View       View
 *  ↓       ↓          ↓
 * Charts  Maps      Analytics
 *
 * The UI should never independently reconstruct Fit data.
 */
export interface CanonicalFitStore {
  version: 2;
  importedAt: string;
  archiveName?: string;
  filesScanned: number;
  filesRecognized: number;
  dateRange: { start: string | null; end: string | null };

  // 1. Daily View (Canonical daily aggregates: steps, calories, heart points, move minutes, distance, sleep, resting HR, workouts)
  daily: Record<string, FitDailyMetric>;

  // 2. Workout View (Canonical workouts with GPS trackpoints, polylines, laps, pace, and elevation)
  workouts: FitWorkout[];

  // 3. Measurements View (Canonical raw streams: heart rate, blood pressure, weight, etc. for Analytics)
  measurements: FitMeasurement[];

  // 4. Session intervals
  sessions: FitSession[];

  // 5. Intraday Interval streams
  dailyIntervals: FitDailyInterval[];

  // 6. Metadata and counts
  dailySummaries?: FitDailySummary[];
  metricCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  unrecognizedFiles: string[];
  parseErrors: any[];
}

let cachedStore: CanonicalFitStore | null = null;

/**
 * Creates an empty canonical store structure.
 */
export function createEmptyCanonicalFitStore(): CanonicalFitStore {
  return {
    version: 2,
    importedAt: new Date().toISOString(),
    archiveName: 'Google Fit Data',
    filesScanned: 0,
    filesRecognized: 0,
    dateRange: { start: null, end: null },
    daily: {},
    workouts: [],
    measurements: [],
    sessions: [],
    dailyIntervals: [],
    dailySummaries: [],
    metricCounts: {},
    sourceCounts: {},
    unrecognizedFiles: [],
    parseErrors: []
  };
}

/**
 * Loads the single canonical Fit store from IndexedDB.
 * Seamlessly migrates legacy 'mylife_google_fit' and 'emreh_fit_metrics_v1' if they exist.
 */
export async function loadCanonicalFitStore(): Promise<CanonicalFitStore> {
  if (cachedStore) {
    return cachedStore;
  }

  try {
    const saved = await dbGet<CanonicalFitStore | null>(CANONICAL_FIT_STORAGE_KEY, null);
    if (saved && typeof saved === 'object' && saved.version === 2 && saved.daily) {
      cachedStore = saved;
      return cachedStore;
    }

    // One-time legacy migration: check if previous stores exist
    const legacyDataset = await dbGet<GoogleFitDataset | null>(LEGACY_GOOGLE_FIT_KEY, null);
    const legacyMetrics = await dbGet<Record<string, FitDailyMetric> | null>(LEGACY_FIT_METRICS_KEY, null);

    if (legacyDataset || legacyMetrics) {
      const store = createEmptyCanonicalFitStore();
      if (legacyDataset) {
        store.importedAt = legacyDataset.importedAt || store.importedAt;
        store.archiveName = legacyDataset.archiveName || store.archiveName;
        store.filesScanned = legacyDataset.filesScanned || 0;
        store.filesRecognized = legacyDataset.filesRecognized || 0;
        store.dateRange = legacyDataset.dateRange || store.dateRange;
        store.workouts = legacyDataset.workouts || [];
        store.measurements = legacyDataset.measurements || [];
        store.sessions = legacyDataset.sessions || [];
        store.dailyIntervals = legacyDataset.dailyIntervals || [];
        store.dailySummaries = legacyDataset.dailySummaries || [];
        store.metricCounts = legacyDataset.metricCounts || {};
        store.sourceCounts = legacyDataset.sourceCounts || {};

        const extracted = extractFitDailyMetricsFromDataset(legacyDataset);
        store.daily = extracted;
      }

      if (legacyMetrics && typeof legacyMetrics === 'object') {
        mergeFitMetrics(store.daily, legacyMetrics);
      }

      // Synchronize workouts into daily summaries
      for (const w of store.workouts) {
        const d = w.startTime ? w.startTime.slice(0, 10) : '';
        if (d && store.daily[d]) {
          const metric = store.daily[d];
          if (!metric.workouts) metric.workouts = [];
          const exists = metric.workouts.some(mw => mw.id === w.id || `${mw.startTime}_${mw.title}` === `${w.startTime}_${w.title}`);
          if (!exists) {
            metric.workouts.push(w);
          }
        }
      }

      cachedStore = store;
      await persistCanonicalFitStore(store);
      return store;
    }
  } catch (err) {
    console.warn('Failed to load canonical fit store:', err);
  }

  const empty = createEmptyCanonicalFitStore();
  cachedStore = empty;
  return empty;
}

/**
 * Persists the Canonical Fit DB to IndexedDB and broadcasts atomic update events.
 * Also keeps backward-compatible projection keys updated.
 */
export async function persistCanonicalFitStore(store: CanonicalFitStore): Promise<void> {
  cachedStore = store;
  try {
    await dbSet(CANONICAL_FIT_STORAGE_KEY, store);

    // Keep legacy projected stores synchronized for backward compatibility and export/backup tools
    const legacyDataset = getCanonicalFitDataset(store);
    await dbSet(LEGACY_GOOGLE_FIT_KEY, legacyDataset);
    await dbSet(LEGACY_FIT_METRICS_KEY, store.daily);

    // Synchronize into canonical EmrehFitCanonicalDB tables (raw, derived, sessions, activities, daily)
    try {
      await replaceCanonicalFitData(legacyDataset);
    } catch (dbErr) {
      console.warn('Failed to update EmrehFitCanonicalDB tables:', dbErr);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('emreh_fit_canonical_updated', { detail: store }));
      window.dispatchEvent(new CustomEvent('emreh_canonical_fit_updated', { detail: store }));
      window.dispatchEvent(new CustomEvent('emreh_google_fit_updated', { detail: legacyDataset }));
      window.dispatchEvent(new CustomEvent('emreh_fit_updated', { detail: { count: Object.keys(store.daily).length } }));
    }
  } catch (err) {
    console.warn('Failed to persist canonical fit store:', err);
  }
}

/**
 * Ingests a Google Fit Takeout dataset directly into the Canonical Fit DB.
 * The canonical daily aggregates, workouts, and measurements are derived once
 * and stored permanently.
 */
export async function ingestGoogleFitTakeout(
  incomingDataset: GoogleFitDataset,
  options?: { overwrite?: boolean; archiveName?: string }
): Promise<CanonicalFitStore> {
  const currentStore = await loadCanonicalFitStore();
  let store: CanonicalFitStore;

  if (options?.overwrite) {
    store = createEmptyCanonicalFitStore();
  } else {
    store = {
      ...currentStore,
      daily: { ...currentStore.daily }
    };
  }

  // 1. Merge metadata
  store.importedAt = incomingDataset.importedAt || new Date().toISOString();
  if (options?.archiveName || incomingDataset.archiveName) {
    store.archiveName = options?.archiveName || incomingDataset.archiveName;
  }
  store.filesScanned = (store.filesScanned || 0) + (incomingDataset.filesScanned || 0);
  store.filesRecognized = (store.filesRecognized || 0) + (incomingDataset.filesRecognized || 0);

  // 2. Canonical Workouts: deduplicate by id or (startTime + title), preserving GPS tracks & laps
  const workoutMap = new Map<string, FitWorkout>();
  (store.workouts || []).forEach(w => {
    const key = w.id || `${w.startTime}_${w.title}`;
    workoutMap.set(key, w);
  });
  (incomingDataset.workouts || []).forEach(w => {
    const norm = normalizeFitWorkout(w);
    const key = norm.id || `${norm.startTime}_${norm.title}`;
    const existing = workoutMap.get(key);
    if (!existing) {
      workoutMap.set(key, norm);
    } else {
      workoutMap.set(key, {
        ...existing,
        ...norm,
        trackpoints: (norm.trackpoints && norm.trackpoints.length > 0) ? norm.trackpoints : (existing.trackpoints || []),
        laps: (norm.laps && norm.laps.length > 0) ? norm.laps : (existing.laps || [])
      });
    }
  });
  store.workouts = Array.from(workoutMap.values());

  // 3. Canonical Sessions: deduplicate
  const sessionMap = new Map<string, FitSession>();
  (store.sessions || []).forEach(s => sessionMap.set(s.id || `${s.startTime}_${s.activityType}`, s));
  (incomingDataset.sessions || []).forEach(s => {
    const key = s.id || `${s.startTime}_${s.activityType}`;
    const existing = sessionMap.get(key);
    if (!existing) {
      sessionMap.set(key, s);
    } else {
      sessionMap.set(key, {
        ...existing,
        ...s,
        segments: (s.segments && s.segments.length > 0) ? s.segments : (existing.segments || []),
        aggregates: { ...(existing.aggregates || {}), ...(s.aggregates || {}) }
      });
    }
  });
  store.sessions = Array.from(sessionMap.values());

  // 4. Canonical Measurements: deduplicate raw sensor streams
  const measMap = new Map<string, FitMeasurement>();
  (store.measurements || []).forEach(m => measMap.set(`${m.startTime}_${m.metric}_${m.rawMetric}`, m));
  (incomingDataset.measurements || []).forEach(m => measMap.set(`${m.startTime}_${m.metric}_${m.rawMetric}`, m));
  store.measurements = Array.from(measMap.values());

  // 5. Canonical Daily Intervals
  const intervalMap = new Map<string, FitDailyInterval>();
  (store.dailyIntervals || []).forEach(i => intervalMap.set(i.id || `${i.date}_${i.startTime}`, i));
  (incomingDataset.dailyIntervals || []).forEach(i => {
    const key = i.id || `${i.date}_${i.startTime}`;
    intervalMap.set(key, i);
  });
  store.dailyIntervals = Array.from(intervalMap.values());

  // 6. Canonical Daily Aggregates (derived ONCE from dataset, never on the fly in UI)
  const extractedMetrics = extractFitDailyMetricsFromDataset(incomingDataset);
  mergeFitMetrics(store.daily, extractedMetrics);

  // 7. Ensure every workout in store.workouts is linked inside store.daily[date].workouts
  for (const w of store.workouts) {
    const d = w.startTime ? w.startTime.slice(0, 10) : '';
    if (!d) continue;
    if (!store.daily[d]) {
      store.daily[d] = {
        date: d,
        steps: 0,
        heartPoints: 0,
        moveMinutes: 0,
        caloriesTotal: 0,
        distanceKm: 0,
        workouts: []
      };
    }
    const dayMetric = store.daily[d];
    if (!dayMetric.workouts) dayMetric.workouts = [];
    const wKey = w.id || `${w.startTime}_${w.title}`;
    const exists = dayMetric.workouts.some(mw => mw.id === w.id || `${mw.startTime}_${mw.title}` === wKey);
    if (!exists) {
      dayMetric.workouts.push(w);
    }
  }

  // 8. Recompute date range
  const allDates = Object.keys(store.daily).sort();
  store.dateRange = {
    start: allDates.length > 0 ? allDates[0] : null,
    end: allDates.length > 0 ? allDates[allDates.length - 1] : null
  };

  await persistCanonicalFitStore(store);
  return store;
}

/**
 * Saves a single workout into the Canonical Fit DB.
 * Updates both store.workouts and store.daily[workoutDate].
 */
export async function saveCanonicalWorkout(workout: FitWorkout | AppFitWorkout): Promise<CanonicalFitStore> {
  const store = await loadCanonicalFitStore();
  const normalized = normalizeFitWorkout(workout);
  const key = normalized.id || `${normalized.startTime}_${normalized.title}`;

  // 1. Update in store.workouts
  const existingIdx = store.workouts.findIndex(w => w.id === normalized.id || `${w.startTime}_${w.title}` === key);
  if (existingIdx >= 0) {
    store.workouts[existingIdx] = normalized;
  } else {
    store.workouts = [...store.workouts, normalized];
  }

  // 2. Ensure corresponding session exists
  const durSec = normalized.durationSeconds || 0;
  const sessIdx = store.sessions.findIndex(s => s.id === normalized.id);
  const sessionItem: FitSession = {
    id: normalized.id,
    activityType: normalized.activityType || 'Workout',
    startTime: normalized.startTime,
    endTime: normalized.endTime || normalized.startTime,
    durationSeconds: durSec,
    segments: [],
    aggregates: {},
    provenance: normalized.provenance || { file: 'manual_entry', dataset: 'activities' }
  };
  if (sessIdx >= 0) {
    store.sessions[sessIdx] = sessionItem;
  } else {
    store.sessions = [...store.sessions, sessionItem];
  }

  // 3. Update in store.daily[date]
  const dateKey = normalized.startTime ? normalized.startTime.slice(0, 10) : new Date().toISOString().slice(0, 10);
  if (!store.daily[dateKey]) {
    store.daily[dateKey] = {
      date: dateKey,
      steps: 0,
      heartPoints: 0,
      moveMinutes: 0,
      caloriesTotal: 0,
      distanceKm: 0,
      workouts: []
    };
  }

  const dayMetric = store.daily[dateKey];
  if (!dayMetric.workouts) dayMetric.workouts = [];
  const dayWIdx = dayMetric.workouts.findIndex(w => w.id === normalized.id || `${w.startTime}_${w.title}` === key);
  if (dayWIdx >= 0) {
    dayMetric.workouts[dayWIdx] = normalized;
  } else {
    dayMetric.workouts.push(normalized);
  }

  // Adjust active calories & distance if recorded
  if (normalized.calories) {
    dayMetric.caloriesActive = (dayMetric.caloriesActive || 0) + normalized.calories;
    dayMetric.caloriesTotal = (dayMetric.caloriesTotal || 0) + normalized.calories;
  }
  if (normalized.distanceMeters) {
    dayMetric.distanceKm = Number(((dayMetric.distanceKm || 0) + (normalized.distanceMeters / 1000)).toFixed(2));
  }
  if (normalized.durationSeconds) {
    dayMetric.moveMinutes = (dayMetric.moveMinutes || 0) + Math.round(normalized.durationSeconds / 60);
  }

  await persistCanonicalFitStore(store);
  return store;
}

/**
 * Saves a daily metric into the Canonical Fit DB.
 */
export async function saveCanonicalDailyMetric(metric: FitDailyMetric): Promise<CanonicalFitStore> {
  const store = await loadCanonicalFitStore();
  const existing = store.daily[metric.date] || { date: metric.date, steps: 0 };
  
  store.daily[metric.date] = {
    ...existing,
    ...metric,
    workouts: metric.workouts && metric.workouts.length > 0 ? metric.workouts : (existing.workouts || [])
  };

  // If metric provided workouts, also synchronize into store.workouts
  if (metric.workouts && metric.workouts.length > 0) {
    for (const w of metric.workouts) {
      const normalized = normalizeFitWorkout(w, metric.date);
      const key = normalized.id || `${normalized.startTime}_${normalized.title}`;
      const idx = store.workouts.findIndex(sw => sw.id === normalized.id || `${sw.startTime}_${sw.title}` === key);
      if (idx >= 0) {
        store.workouts[idx] = normalized;
      } else {
        store.workouts.push(normalized);
      }
    }
  }

  await persistCanonicalFitStore(store);
  return store;
}

/**
 * Selectors: pure projections of the Canonical Fit DB.
 */

export function getCanonicalDailyMetric(store: CanonicalFitStore, date: string): FitDailyMetric | null {
  return store.daily[date] || null;
}

export function getCanonicalDailyMetrics(store: CanonicalFitStore): Record<string, FitDailyMetric> {
  return store.daily;
}

export function getCanonicalWorkouts(store: CanonicalFitStore, date?: string): FitWorkout[] {
  if (!date) return store.workouts;
  return store.workouts.filter(w => w.startTime && w.startTime.startsWith(date));
}

export function getCanonicalMeasurements(store: CanonicalFitStore, metricType?: string): FitMeasurement[] {
  if (!metricType) return store.measurements;
  return store.measurements.filter(m => m.metric.toLowerCase() === metricType.toLowerCase() || m.rawMetric.toLowerCase() === metricType.toLowerCase());
}

/**
 * Converts Canonical Fit DB workouts into unified timeline items without duplication.
 */
export function getCanonicalTimelineItems(store: CanonicalFitStore): TimelineItem[] {
  const dataset = getCanonicalFitDataset(store);
  return convertGoogleFitToTimelineItems(dataset);
}

/**
 * Projects Canonical Fit DB to GoogleFitDataset representation for backward compatibility.
 */
export function getCanonicalFitDataset(store: CanonicalFitStore): GoogleFitDataset {
  // Convert daily aggregates to dailySummaries if missing
  const dailySummaries: FitDailySummary[] = Object.values(store.daily).map(m => ({
    date: m.date,
    values: {
      'Step count': m.steps,
      'Heart Points': m.heartPoints || 0,
      ...(m.heartMinutes ? { 'Heart Minutes': m.heartMinutes } : {}),
      'Move Minutes count': m.moveMinutes || 0,
      'Calories (kcal)': m.caloriesTotal || m.caloriesActive || 0,
      'Distance (m)': Math.round((m.distanceKm || 0) * 1000),
      ...(m.restingHeartRate ? { 'Resting heart rate (bpm)': m.restingHeartRate } : {}),
      ...(m.averageHeartRate ? { 'Average heart rate (bpm)': m.averageHeartRate } : {}),
      ...(m.minHeartRate ? { 'Min heart rate (bpm)': m.minHeartRate } : {}),
      ...(m.maxHeartRate ? { 'Max heart rate (bpm)': m.maxHeartRate } : {})
    }
  }));

  return {
    importedAt: store.importedAt,
    archiveName: store.archiveName,
    filesScanned: store.filesScanned,
    filesRecognized: store.filesRecognized,
    unrecognizedFiles: store.unrecognizedFiles,
    parseErrors: store.parseErrors,
    measurements: store.measurements,
    sessions: store.sessions,
    workouts: store.workouts,
    dailyIntervals: store.dailyIntervals,
    dailySummaries: dailySummaries,
    metricCounts: store.metricCounts,
    sourceCounts: store.sourceCounts,
    dateRange: store.dateRange
  };
}

/**
 * Loads sample demo data into the Canonical Fit DB.
 */
export async function loadSampleCanonicalFitData(targetDate?: Date): Promise<CanonicalFitStore> {
  const sampleDataset = createSampleGoogleFitDataset();
  const sampleVitals = createSampleFitDailyMetrics(targetDate || new Date());

  const store = createEmptyCanonicalFitStore();
  store.importedAt = sampleDataset.importedAt;
  store.archiveName = sampleDataset.archiveName;
  store.filesScanned = sampleDataset.filesScanned;
  store.filesRecognized = sampleDataset.filesRecognized;
  store.workouts = sampleDataset.workouts;
  store.sessions = sampleDataset.sessions;
  store.measurements = sampleDataset.measurements;
  store.dailyIntervals = sampleDataset.dailyIntervals;
  store.dailySummaries = sampleDataset.dailySummaries;
  store.metricCounts = sampleDataset.metricCounts;
  store.sourceCounts = sampleDataset.sourceCounts;

  const extracted = extractFitDailyMetricsFromDataset(sampleDataset);
  mergeFitMetrics(extracted, sampleVitals);
  store.daily = extracted;

  const dates = Object.keys(store.daily).sort();
  store.dateRange = {
    start: dates.length > 0 ? dates[0] : null,
    end: dates.length > 0 ? dates[dates.length - 1] : null
  };

  await persistCanonicalFitStore(store);
  return store;
}
