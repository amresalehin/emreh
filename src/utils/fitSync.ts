import { FitDailyMetric, FitWorkout as AppFitWorkout } from '../types';
import {
  GoogleFitDataset,
  FitWorkout,
  FitSession,
  FitDailySummary,
  FitDailyInterval,
  FitMeasurement
} from './googleFitParser';
import {
  loadCanonicalFitStore,
  persistCanonicalFitStore,
  ingestGoogleFitTakeout,
  saveCanonicalWorkout,
  saveCanonicalDailyMetric,
  loadSampleCanonicalFitData,
  getCanonicalFitDataset,
  normalizeFitWorkout
} from './canonicalFitStore';

import { GOOGLE_FIT_STORAGE_KEY } from './fitConstants';
export { normalizeFitWorkout, GOOGLE_FIT_STORAGE_KEY };

/**
 * Loads stored GoogleFitDataset from the Canonical Fit DB.
 */
export async function loadStoredGoogleFit(): Promise<GoogleFitDataset | null> {
  try {
    const store = await loadCanonicalFitStore();
    return getCanonicalFitDataset(store);
  } catch (err) {
    console.warn('Failed to load Google Fit dataset from canonical store:', err);
  }
  return null;
}

/**
 * Persists GoogleFitDataset directly into the Canonical Fit DB.
 */
export async function persistStoredGoogleFit(dataset: GoogleFitDataset): Promise<void> {
  try {
    await ingestGoogleFitTakeout(dataset);
  } catch (err) {
    console.warn('Failed to persist Google Fit dataset into canonical store:', err);
  }
}

/**
 * Merges two GoogleFitDatasets without losing GPS trackpoints, laps, sessions,
 * or raw measurements.
 */
export function mergeGoogleFitDatasets(
  base: GoogleFitDataset | null | undefined,
  incoming: GoogleFitDataset | null | undefined
): GoogleFitDataset {
  if (!base && !incoming) {
    return {
      importedAt: new Date().toISOString(),
      archiveName: 'Google Fit Data',
      filesScanned: 0,
      filesRecognized: 0,
      unrecognizedFiles: [],
      parseErrors: [],
      measurements: [],
      sessions: [],
      workouts: [],
      dailyIntervals: [],
      dailySummaries: [],
      metricCounts: {},
      sourceCounts: {},
      dateRange: { start: null, end: null }
    };
  }
  if (!base) return incoming!;
  if (!incoming) return base;

  // 1. Workouts: deduplicate by id OR (startTime + title)
  const workoutMap = new Map<string, FitWorkout>();
  (base.workouts || []).forEach(w => {
    const key = w.id || `${w.startTime}_${w.title}`;
    workoutMap.set(key, w);
  });
  (incoming.workouts || []).forEach(w => {
    const key = w.id || `${w.startTime}_${w.title}`;
    const existing = workoutMap.get(key);
    if (!existing) {
      workoutMap.set(key, w);
    } else {
      workoutMap.set(key, {
        ...existing,
        ...w,
        trackpoints: (w.trackpoints && w.trackpoints.length > 0) ? w.trackpoints : (existing.trackpoints || []),
        laps: (w.laps && w.laps.length > 0) ? w.laps : (existing.laps || [])
      });
    }
  });

  // 2. Sessions: deduplicate by id OR (startTime + activityType)
  const sessionMap = new Map<string, FitSession>();
  (base.sessions || []).forEach(s => {
    const key = s.id || `${s.startTime}_${s.activityType || ''}`;
    sessionMap.set(key, s);
  });
  (incoming.sessions || []).forEach(s => {
    const key = s.id || `${s.startTime}_${s.activityType || ''}`;
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

  // 3. Daily Summaries: merge values per date
  const summaryMap = new Map<string, FitDailySummary>();
  (base.dailySummaries || []).forEach(s => {
    if (s.date) summaryMap.set(s.date, { ...s, values: { ...(s.values || {}) } });
  });
  (incoming.dailySummaries || []).forEach(s => {
    if (!s.date) return;
    const existing = summaryMap.get(s.date);
    if (!existing) {
      summaryMap.set(s.date, { ...s, values: { ...(s.values || {}) } });
    } else {
      summaryMap.set(s.date, {
        date: s.date,
        values: {
          ...(existing.values || {}),
          ...(s.values || {})
        }
      });
    }
  });

  // 4. Daily Intervals: deduplicate by id OR (date + startTime)
  const intervalMap = new Map<string, FitDailyInterval>();
  (base.dailyIntervals || []).forEach(i => {
    const key = i.id || `${i.date || ''}_${i.startTime}`;
    intervalMap.set(key, i);
  });
  (incoming.dailyIntervals || []).forEach(i => {
    const key = i.id || `${i.date || ''}_${i.startTime}`;
    const existing = intervalMap.get(key);
    if (!existing) {
      intervalMap.set(key, i);
    } else {
      intervalMap.set(key, {
        ...existing,
        ...i,
        values: { ...(existing.values || {}), ...(i.values || {}) }
      });
    }
  });

  // 5. Measurements: deduplicate by startTime + metric
  const measMap = new Map<string, FitMeasurement>();
  (base.measurements || []).forEach(m => {
    const key = `${m.startTime}_${m.metric}_${m.rawMetric}`;
    measMap.set(key, m);
  });
  (incoming.measurements || []).forEach(m => {
    const key = `${m.startTime}_${m.metric}_${m.rawMetric}`;
    measMap.set(key, m);
  });

  // 6. Metrics and Source counts
  const metricCounts: Record<string, number> = { ...(base.metricCounts || {}) };
  for (const [k, v] of Object.entries(incoming.metricCounts || {})) {
    metricCounts[k] = (metricCounts[k] || 0) + v;
  }
  const sourceCounts: Record<string, number> = { ...(base.sourceCounts || {}) };
  for (const [k, v] of Object.entries(incoming.sourceCounts || {})) {
    sourceCounts[k] = (sourceCounts[k] || 0) + v;
  }

  // 7. Calculate dateRange
  const allDates: string[] = [];
  if (base.dateRange?.start) allDates.push(base.dateRange.start);
  if (base.dateRange?.end) allDates.push(base.dateRange.end);
  if (incoming.dateRange?.start) allDates.push(incoming.dateRange.start);
  if (incoming.dateRange?.end) allDates.push(incoming.dateRange.end);

  allDates.sort();

  return {
    importedAt: incoming.importedAt || base.importedAt || new Date().toISOString(),
    archiveName: incoming.archiveName || base.archiveName || 'Google Fit Archive',
    filesScanned: (base.filesScanned || 0) + (incoming.filesScanned || 0),
    filesRecognized: (base.filesRecognized || 0) + (incoming.filesRecognized || 0),
    unrecognizedFiles: [...(base.unrecognizedFiles || []), ...(incoming.unrecognizedFiles || [])],
    parseErrors: [...(base.parseErrors || []), ...(incoming.parseErrors || [])],
    measurements: Array.from(measMap.values()),
    sessions: Array.from(sessionMap.values()),
    workouts: Array.from(workoutMap.values()),
    dailyIntervals: Array.from(intervalMap.values()),
    dailySummaries: Array.from(summaryMap.values()),
    metricCounts,
    sourceCounts,
    dateRange: {
      start: allDates.length > 0 ? allDates[0] : null,
      end: allDates.length > 0 ? allDates[allDates.length - 1] : null
    }
  };
}

export interface SyncFitEcosystemOptions {
  newDataset?: GoogleFitDataset;
  newMetrics?: Record<string, FitDailyMetric>;
  overwrite?: boolean;
}

/**
 * Ingests and synchronizes data into the Canonical Fit DB.
 */
export async function syncFitEcosystem(
  options?: SyncFitEcosystemOptions
): Promise<{
  dataset: GoogleFitDataset;
  metrics: Record<string, FitDailyMetric>;
}> {
  let store = await loadCanonicalFitStore();

  if (options?.newDataset) {
    store = await ingestGoogleFitTakeout(options.newDataset, { overwrite: options.overwrite });
  }

  if (options?.newMetrics) {
    for (const metric of Object.values(options.newMetrics)) {
      store = await saveCanonicalDailyMetric(metric);
    }
  }

  return {
    dataset: getCanonicalFitDataset(store),
    metrics: store.daily
  };
}

/**
 * Loads and synchronizes rich demo fitness data directly in the Canonical Fit DB.
 */
export async function syncSampleFitData(
  targetDate?: Date
): Promise<{ dataset: GoogleFitDataset; metrics: Record<string, FitDailyMetric> }> {
  const store = await loadSampleCanonicalFitData(targetDate);
  return {
    dataset: getCanonicalFitDataset(store),
    metrics: store.daily
  };
}

/**
 * Synchronizes an individual workout into the Canonical Fit DB.
 */
export async function syncWorkoutToGoogleFitDataset(
  workout: AppFitWorkout | FitWorkout
): Promise<GoogleFitDataset> {
  const store = await saveCanonicalWorkout(workout);
  return getCanonicalFitDataset(store);
}
