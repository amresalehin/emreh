import { FitDailyMetric, FitWorkout as AppFitWorkout } from '../types';
import { dbGet, dbSet } from './storage';
import { loadStoredFitMetrics, persistStoredFitMetrics } from './fitStorage';
import {
  GoogleFitDataset,
  FitWorkout,
  FitSession,
  FitDailySummary,
  FitDailyInterval,
  FitMeasurement
} from './googleFitParser';
import { extractFitDailyMetricsFromDataset, mergeFitMetrics } from './fitImporter';
import { createSampleGoogleFitDataset, createSampleFitDailyMetrics } from '../components/fit/sampleFitData';

export const GOOGLE_FIT_STORAGE_KEY = 'mylife_google_fit';

/**
 * Loads stored GoogleFitDataset (polylines, sessions, workouts, raw streams) from IndexedDB.
 */
export async function loadStoredGoogleFit(): Promise<GoogleFitDataset | null> {
  try {
    const saved = await dbGet<GoogleFitDataset | null>(GOOGLE_FIT_STORAGE_KEY, null);
    if (saved && typeof saved === 'object') {
      return saved;
    }
  } catch (err) {
    console.warn('Failed to load Google Fit dataset from storage:', err);
  }
  return null;
}

/**
 * Persists GoogleFitDataset and dispatches the 'emreh_google_fit_updated' event
 * so all active views and components react instantaneously.
 */
export async function persistStoredGoogleFit(dataset: GoogleFitDataset): Promise<void> {
  try {
    await dbSet(GOOGLE_FIT_STORAGE_KEY, dataset);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('emreh_google_fit_updated', {
          detail: dataset
        })
      );
    }
  } catch (err) {
    console.warn('Failed to persist Google Fit dataset to storage:', err);
  }
}

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
      // Retain or prefer GPS trackpoints and laps
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
  /** Freshly parsed GoogleFitDataset from Takeout ZIP or files */
  newDataset?: GoogleFitDataset;
  /** New or modified daily vitals (e.g. from manual logs or FitHealthView) */
  newMetrics?: Record<string, FitDailyMetric>;
  /** If true, overwrite existing store completely rather than merging */
  overwrite?: boolean;
}

/**
 * The Master Bidirectional Synchronizer between:
 *  1. GoogleFitDataset ('mylife_google_fit' in IndexedDB) - raw sessions, workouts, polylines, GPS
 *  2. emreh_fit_metrics_v1 ('emreh_fit_metrics_v1' in IndexedDB) - daily aggregated vitals
 *
 * It guarantees:
 *  - Takeout ZIP imports extract vitals and store them in emreh_fit_metrics_v1.
 *  - Workouts and daily summaries in emreh_fit_metrics_v1 are reflected in GoogleFitDataset.
 *  - All updates persist atomically to IndexedDB.
 *  - Broadcasts both 'emreh_google_fit_updated' and 'emreh_fit_updated' events.
 */
export async function syncFitEcosystem(
  options?: SyncFitEcosystemOptions
): Promise<{
  dataset: GoogleFitDataset;
  metrics: Record<string, FitDailyMetric>;
}> {
  // Step 1: Load existing states
  const existingDataset = await loadStoredGoogleFit();
  const existingMetrics = await loadStoredFitMetrics();

  // Step 2: Merge or initialize GoogleFitDataset
  let mergedDataset: GoogleFitDataset;
  if (options?.overwrite && options.newDataset) {
    mergedDataset = options.newDataset;
  } else if (options?.newDataset) {
    mergedDataset = mergeGoogleFitDatasets(existingDataset, options.newDataset);
  } else {
    mergedDataset = existingDataset || {
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

  // Step 3: Extract metrics from dataset
  const extractedFromDataset = extractFitDailyMetricsFromDataset(mergedDataset);

  // Step 4: Merge existing metrics with extracted dataset metrics
  let mergedMetrics: Record<string, FitDailyMetric> = options?.overwrite
    ? {}
    : { ...existingMetrics };

  mergeFitMetrics(mergedMetrics, extractedFromDataset);

  // If new metrics were provided, merge them as well
  if (options?.newMetrics) {
    mergeFitMetrics(mergedMetrics, options.newMetrics);
  }

  // Step 5: Reverse sync - inject vitals and manual workouts back into GoogleFitDataset
  const existingWorkoutKeys = new Set(
    (mergedDataset.workouts || []).map(w => w.id || `${w.startTime}_${w.title}`)
  );
  const existingSummaryDates = new Set(
    (mergedDataset.dailySummaries || []).map(s => s.date)
  );

  const updatedWorkouts: FitWorkout[] = [...(mergedDataset.workouts || [])];
  const updatedSessions: FitSession[] = [...(mergedDataset.sessions || [])];
  const updatedSummaries: FitDailySummary[] = [...(mergedDataset.dailySummaries || [])];

  for (const [dateStr, metric] of Object.entries(mergedMetrics)) {
    // Sync workouts into GoogleFitDataset
    if (metric.workouts && metric.workouts.length > 0) {
      for (const w of metric.workouts) {
        const normalized = normalizeFitWorkout(w, dateStr);
        const key = normalized.id || `${normalized.startTime}_${normalized.title}`;
        if (!existingWorkoutKeys.has(key)) {
          existingWorkoutKeys.add(key);
          updatedWorkouts.push(normalized);

          // Ensure corresponding session exists
          const durSec = normalized.durationSeconds || 0;
          updatedSessions.push({
            id: normalized.id,
            activityType: normalized.activityType || 'Workout',
            startTime: normalized.startTime,
            endTime: normalized.endTime || normalized.startTime,
            durationSeconds: durSec,
            segments: [],
            aggregates: {},
            provenance: normalized.provenance || { file: 'manual_entry', dataset: 'activities' }
          });
        }
      }
    }

    // Sync daily vitals into dailySummaries if missing or enriched
    if (metric.steps > 0 || (metric.heartPoints ?? 0) > 0 || (metric.caloriesTotal ?? 0) > 0) {
      if (!existingSummaryDates.has(dateStr)) {
        existingSummaryDates.add(dateStr);
        updatedSummaries.push({
          date: dateStr,
          values: {
            'Step count': metric.steps,
            'Heart Points': metric.heartPoints || 0,
            'Move Minutes count': metric.moveMinutes || 0,
            'Calories (kcal)': metric.caloriesTotal || 0,
            'Distance (m)': Math.round((metric.distanceKm || 0) * 1000),
            ...(metric.restingHeartRate ? { 'Average heart rate (bpm)': metric.restingHeartRate } : {})
          }
        });
      } else {
        const existingSummary = updatedSummaries.find(s => s.date === dateStr);
        if (existingSummary && existingSummary.values) {
          if (metric.steps > 0 && !existingSummary.values['Step count']) {
            existingSummary.values['Step count'] = metric.steps;
          }
          if ((metric.heartPoints ?? 0) > 0 && !existingSummary.values['Heart Points']) {
            existingSummary.values['Heart Points'] = metric.heartPoints || 0;
          }
          if ((metric.caloriesTotal ?? 0) > 0 && !existingSummary.values['Calories (kcal)']) {
            existingSummary.values['Calories (kcal)'] = metric.caloriesTotal || 0;
          }
        }
      }
    }
  }

  // Update mergedDataset with synced arrays
  mergedDataset.workouts = updatedWorkouts;
  mergedDataset.sessions = updatedSessions;
  mergedDataset.dailySummaries = updatedSummaries;

  // Recalculate date range if needed
  const allKnownDates = Object.keys(mergedMetrics).sort();
  if (allKnownDates.length > 0) {
    if (!mergedDataset.dateRange.start || allKnownDates[0] < mergedDataset.dateRange.start) {
      mergedDataset.dateRange.start = allKnownDates[0];
    }
    if (!mergedDataset.dateRange.end || allKnownDates[allKnownDates.length - 1] > mergedDataset.dateRange.end) {
      mergedDataset.dateRange.end = allKnownDates[allKnownDates.length - 1];
    }
  }

  // Step 6: Persist both stores to IndexedDB
  await persistStoredGoogleFit(mergedDataset);
  await persistStoredFitMetrics(mergedMetrics);

  // Step 7: Return synced outputs
  return {
    dataset: mergedDataset,
    metrics: mergedMetrics
  };
}

/**
 * Loads and synchronizes rich demo fitness data across both GoogleFitDataset
 * (workouts with GPS trackpoints, polylines, laps) and emreh_fit_metrics_v1 (vitals).
 */
export async function syncSampleFitData(
  targetDate?: Date
): Promise<{ dataset: GoogleFitDataset; metrics: Record<string, FitDailyMetric> }> {
  const sampleDataset = createSampleGoogleFitDataset();
  const sampleVitals = createSampleFitDailyMetrics(targetDate || new Date());

  return await syncFitEcosystem({
    newDataset: sampleDataset,
    newMetrics: sampleVitals,
    overwrite: true
  });
}

/**
 * Synchronizes an individual workout into GoogleFitDataset.
 */
export async function syncWorkoutToGoogleFitDataset(
  workout: AppFitWorkout | FitWorkout
): Promise<GoogleFitDataset> {
  const existing = await loadStoredGoogleFit();
  const dataset: GoogleFitDataset = existing || {
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

  const normalized = normalizeFitWorkout(workout);
  const key = normalized.id || `${normalized.startTime}_${normalized.title}`;
  const existingIdx = (dataset.workouts || []).findIndex(
    w => (w.id && w.id === normalized.id) || `${w.startTime}_${w.title}` === key
  );

  if (existingIdx >= 0) {
    dataset.workouts[existingIdx] = normalized;
  } else {
    dataset.workouts = [...(dataset.workouts || []), normalized];
    const durSec = normalized.durationSeconds || 0;
    dataset.sessions = [
      ...(dataset.sessions || []),
      {
        id: normalized.id,
        activityType: normalized.activityType || 'Workout',
        startTime: normalized.startTime,
        endTime: normalized.endTime || normalized.startTime,
        durationSeconds: durSec,
        segments: [],
        aggregates: {},
        provenance: normalized.provenance || { file: 'manual_entry', dataset: 'activities' }
      }
    ];
  }

  await persistStoredGoogleFit(dataset);
  return dataset;
}
