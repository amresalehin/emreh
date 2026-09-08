import JSZip from 'jszip';
import { TimelineItem } from '../types';
import { parseCsvLine } from './csvParser';

export type FitMetric =
  | 'steps' | 'distance' | 'calories' | 'active_minutes' | 'heart_minutes'
  | 'heart_rate' | 'speed' | 'weight' | 'height' | 'location'
  | 'activity' | 'unknown';

export interface FitProvenance {
  file: string;
  dataset: 'all_data' | 'sessions' | 'activities' | 'daily_metrics';
  source?: string;
  originDataSourceId?: string;
  recordIndex?: number;
}

export interface FitMeasurement {
  id: string;
  metric: FitMetric;
  rawMetric: string;
  value?: number;
  values?: number[];
  unit?: string;
  startTime: string;
  endTime?: string;
  source?: string;
  originDataSourceId?: string;
  provenance: FitProvenance;
  raw?: unknown;
}

export interface FitTrackpoint {
  time: string;
  lat?: number;
  lng?: number;
  altitude?: number;
  distance?: number;
  heartRate?: number;
}

export interface FitActivitySegment {
  activityType: string;
  startTime: string;
  endTime: string;
}

export interface FitSession {
  id: string;
  activityType: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  segments: FitActivitySegment[];
  aggregates: Record<string, number>;
  provenance: FitProvenance;
}

export interface FitWorkout {
  id: string;
  activityType: string;
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  distanceMeters?: number;
  calories?: number;
  laps: Array<{
    startTime?: string;
    durationSeconds?: number;
    distanceMeters?: number;
    calories?: number;
    intensity?: string;
    trackpoints: FitTrackpoint[];
  }>;
  trackpoints: FitTrackpoint[];
  provenance: FitProvenance;
}

export interface FitDailyInterval {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  values: Record<string, number | string>;
  provenance: FitProvenance;
}

export interface FitDailySummary {
  date: string;
  values: Record<string, number | string>;
}

export interface GoogleFitDataset {
  importedAt: string;
  archiveName: string;
  filesScanned: number;
  filesRecognized: number;
  unrecognizedFiles: string[];
  measurements: FitMeasurement[];
  sessions: FitSession[];
  workouts: FitWorkout[];
  dailyIntervals: FitDailyInterval[];
  dailySummaries: FitDailySummary[];
  metricCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  dateRange: { start: string | null; end: string | null };
}

const METRIC_MAP: Record<string, FitMetric> = {
  'com.google.step_count.delta': 'steps',
  'com.google.step_count.cumulative': 'steps',
  'com.google.distance.delta': 'distance',
  'com.google.calories.expended': 'calories',
  'com.google.calories.bmr': 'calories',
  'com.google.active_minutes': 'active_minutes',
  'com.google.heart_minutes': 'heart_minutes',
  'com.google.heart_minutes.summary': 'heart_minutes',
  'com.google.heart_rate.bpm': 'heart_rate',
  'com.google.speed': 'speed',
  'com.google.weight': 'weight',
  'com.google.height': 'height',
  'com.google.location.sample': 'location',
  'com.google.activity.segment': 'activity',
  'com.google.activity.samples': 'activity',
};

function metricFromName(name: string): FitMetric {
  return METRIC_MAP[name] || (name.startsWith('com.google.') ? 'unknown' : 'unknown');
}

function unitFor(metric: FitMetric, rawMetric: string) {
  if (metric === 'steps' || rawMetric.includes('step_count')) return rawMetric.includes('cumulative') ? 'count' : 'count';
  if (metric === 'distance') return 'm';
  if (metric === 'calories') return 'kcal';
  if (metric === 'active_minutes' || metric === 'heart_minutes') return 'min';
  if (metric === 'heart_rate') return 'bpm';
  if (metric === 'speed') return 'm/s';
  if (metric === 'weight') return 'kg';
  if (metric === 'height') return 'm';
  if (metric === 'location') return 'location';
  return undefined;
}

function nanosToIso(value: unknown): string | undefined {
  if (typeof value !== 'number' && typeof value !== 'string' && typeof value !== 'bigint') return undefined;
  try {
    const ns = BigInt(value);
    const ms = ns / 1000000n;
    return new Date(Number(ms)).toISOString();
  } catch {
    return undefined;
  }
}

function parseDateLike(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]+/g, '_');
}

function parseAllDataFilename(file: string) {
  const base = file.split('/').pop() || file;
  const kind = base.startsWith('raw_') ? 'raw' : base.startsWith('derived_') ? 'derived' : 'unknown';
  const stripped = base.replace(/^(raw|derived)_/, '').replace(/\.json$/i, '');
  const metricMatch = stripped.match(/(com\.google\.[^_]+?)(?=_com\.|$)/);
  const rawMetric = metricMatch ? metricMatch[1] : stripped.split('_com.')[0];
  return { kind, rawMetric };
}

function getNumericValues(point: any): number[] {
  const result: number[] = [];
  for (const item of Array.isArray(point?.fitValue) ? point.fitValue : []) {
    const value = item?.value || {};
    if (Number.isFinite(value.intVal)) result.push(Number(value.intVal));
    else if (Number.isFinite(value.fpVal)) result.push(Number(value.fpVal));
  }
  return result;
}

function inferSourceLabel(dataSource: any, filename: string) {
  const ds = typeof dataSource === 'string' ? dataSource : dataSource?.['Data Source'];
  return typeof ds === 'string' ? ds : filename;
}

function parseAllDataFile(file: string, text: string, out: GoogleFitDataset) {
  const parsed = JSON.parse(text);
  const dataSource = parsed?.['Data Source'];
  const source = inferSourceLabel(dataSource, file);
  const dsString = typeof source === 'string' ? source : '';
  const pieces = dsString.split(':');
  const rawMetric = pieces[1] || parseAllDataFilename(file).rawMetric;
  const points = Array.isArray(parsed?.['Data Points']) ? parsed['Data Points'] : [];
  const sourceKey = dsString || file;
  out.sourceCounts[sourceKey] = (out.sourceCounts[sourceKey] || 0) + points.length;
  points.forEach((point: any, index: number) => {
    const startTime = nanosToIso(point?.startTimeNanos);
    const endTime = nanosToIso(point?.endTimeNanos);
    if (!startTime) return;
    const metric = metricFromName(rawMetric);
    const values = getNumericValues(point);
    const provenance: FitProvenance = {
      file,
      dataset: 'all_data',
      source: sourceKey,
      originDataSourceId: point?.originDataSourceId,
      recordIndex: index,
    };
    out.measurements.push({
      id: `fit-m-${safeName(file)}-${index}`,
      metric,
      rawMetric,
      value: values.length === 1 ? values[0] : undefined,
      values: values.length > 1 ? values : undefined,
      unit: unitFor(metric, rawMetric),
      startTime,
      endTime,
      source: sourceKey,
      originDataSourceId: point?.originDataSourceId,
      provenance,
      raw: point,
    });
    out.metricCounts[rawMetric] = (out.metricCounts[rawMetric] || 0) + 1;
  });
}

function metricNameToAggregateValue(a: any): { metric: string; value?: number } | null {
  if (!a || typeof a.metricName !== 'string') return null;
  const value = Number.isFinite(a.intValue) ? Number(a.intValue) : Number.isFinite(a.floatValue) ? Number(a.floatValue) : undefined;
  return { metric: a.metricName, value };
}

function parseSessions(file: string, text: string, out: GoogleFitDataset) {
  const o = JSON.parse(text);
  const startTime = parseDateLike(o?.startTime);
  const endTime = parseDateLike(o?.endTime);
  if (!startTime || !endTime) return;
  const segments = Array.isArray(o.segment) ? o.segment.map((s: any) => ({
    activityType: s?.fitnessActivity || o?.fitnessActivity || 'other',
    startTime: parseDateLike(s?.startTime) || startTime,
    endTime: parseDateLike(s?.endTime) || endTime,
  })) : [];
  const aggregates: Record<string, number> = {};
  for (const a of Array.isArray(o.aggregate) ? o.aggregate : []) {
    const x = metricNameToAggregateValue(a);
    if (x?.metric && x.value !== undefined) aggregates[x.metric] = x.value;
  }
  const d = new Date(endTime).getTime() - new Date(startTime).getTime();
  out.sessions.push({
    id: `fit-s-${safeName(file)}`,
    activityType: String(o.fitnessActivity || 'other'),
    startTime,
    endTime,
    durationSeconds: Math.max(0, d / 1000),
    segments,
    aggregates,
    provenance: { file, dataset: 'sessions' },
  });
}

function elementText(parent: Element | null, selector: string): string | undefined {
  const el = parent?.querySelector(selector);
  const value = el?.textContent?.trim();
  return value || undefined;
}

function parseTcX(file: string, text: string, out: GoogleFitDataset) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) return;
  const activities = Array.from(doc.querySelectorAll('Activity'));
  activities.forEach((activity, ai) => {
    const activityType = activity.getAttribute('Sport') || 'Other';
    const activityId = elementText(activity, 'Id') || `${file}-${ai}`;
    const laps = Array.from(activity.querySelectorAll(':scope > Lap')).map((lap) => {
      const trackpoints = Array.from(lap.querySelectorAll('Trackpoint')).map((tp) => ({
        time: elementText(tp, 'Time') || '',
        lat: Number(elementText(tp, 'LatitudeDegrees')),
        lng: Number(elementText(tp, 'LongitudeDegrees')),
        altitude: Number(elementText(tp, 'AltitudeMeters')),
        distance: Number(elementText(tp, 'DistanceMeters')),
        heartRate: Number(elementText(tp, 'HeartRateBpm > Value')),
      })).map((p) => ({
        ...p,
        lat: Number.isFinite(p.lat) ? p.lat : undefined,
        lng: Number.isFinite(p.lng) ? p.lng : undefined,
        altitude: Number.isFinite(p.altitude) ? p.altitude : undefined,
        distance: Number.isFinite(p.distance) ? p.distance : undefined,
        heartRate: Number.isFinite(p.heartRate) ? p.heartRate : undefined,
      })).filter((p) => p.time);
      return {
        startTime: lap.getAttribute('StartTime') || undefined,
        durationSeconds: Number(elementText(lap, 'TotalTimeSeconds')) || undefined,
        distanceMeters: Number(elementText(lap, 'DistanceMeters')) || undefined,
        calories: Number(elementText(lap, 'Calories')) || undefined,
        intensity: elementText(lap, 'Intensity'),
        trackpoints,
      };
    });
    const allTrackpoints = laps.flatMap((l) => l.trackpoints);
    const first = parseDateLike(activityId);
    const last = allTrackpoints.length ? parseDateLike(allTrackpoints[allTrackpoints.length - 1].time) : undefined;
    const duration = laps.reduce((s, l) => s + (l.durationSeconds || 0), 0) || undefined;
    const distance = laps.reduce((s, l) => s + (l.distanceMeters || 0), 0) || undefined;
    const calories = laps.reduce((s, l) => s + (l.calories || 0), 0) || undefined;
    out.workouts.push({
      id: `fit-w-${safeName(file)}-${ai}`,
      activityType,
      startTime: first || (laps[0]?.startTime ? parseDateLike(laps[0].startTime)! : undefined),
      endTime: last,
      durationSeconds: duration,
      distanceMeters: distance,
      calories,
      laps,
      trackpoints: allTrackpoints,
      provenance: { file, dataset: 'activities' },
    });
  });
}

function parseGpx(file: string, text: string, out: GoogleFitDataset) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) return;
  const trks = Array.from(doc.querySelectorAll('trk'));
  if (trks.length === 0) return;

  trks.forEach((trk, ti) => {
    const trackName = elementText(trk, 'name') || elementText(trk, 'type') || 'Workout';
    const trkpts = Array.from(trk.querySelectorAll('trkpt')).map((pt) => {
      const lat = Number(pt.getAttribute('lat'));
      const lng = Number(pt.getAttribute('lon'));
      const altitude = Number(elementText(pt, 'ele'));
      const time = elementText(pt, 'time') || '';
      const hrText = elementText(pt, 'hr') || elementText(pt, 'heartrate') || elementText(pt, 'HeartRateBpm > Value');
      const heartRate = hrText ? Number(hrText) : undefined;
      return {
        time,
        lat: Number.isFinite(lat) ? lat : undefined,
        lng: Number.isFinite(lng) ? lng : undefined,
        altitude: Number.isFinite(altitude) ? altitude : undefined,
        heartRate: Number.isFinite(heartRate) ? heartRate : undefined,
      };
    }).filter((p) => p.time && p.lat != null && p.lng != null);

    if (trkpts.length === 0) return;
    const startTime = parseDateLike(trkpts[0].time) || undefined;
    const endTime = parseDateLike(trkpts[trkpts.length - 1].time);
    const durationSeconds = endTime && startTime ? Math.max(0, (Date.parse(endTime) - Date.parse(startTime)) / 1000) : undefined;

    out.workouts.push({
      id: `fit-gpx-${safeName(file)}-${ti}`,
      activityType: trackName,
      startTime,
      endTime,
      durationSeconds,
      laps: [{ trackpoints: trkpts }],
      trackpoints: trkpts,
      provenance: { file, dataset: 'activities' },
    });
  });
}



function getOrCreateDailySummary(out: GoogleFitDataset, dateKey: string): Record<string, number | string> {
  let existing = out.dailySummaries.find(s => s.date === dateKey);
  if (!existing) {
    existing = { date: dateKey, values: {} };
    out.dailySummaries.push(existing);
  }
  return existing.values;
}

function parseDailyMetrics(file: string, text: string, out: GoogleFitDataset) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.length);
  if (lines.length < 2) return;
  const headers = parseCsvLine(lines[0]);
  const fileNameLower = file.toLowerCase();
  const isSummaryFile = fileNameLower.includes('daily activity metrics.csv') || fileNameLower.includes('daily summaries.csv');

  for (let ri = 1; ri < lines.length; ri++) {
    const cols = parseCsvLine(lines[ri]);
    const values: Record<string, number | string> = {};
    headers.forEach((h, i) => {
      const raw = cols[i] ?? '';
      if (raw === '') return;
      const n = Number(raw);
      values[h] = Number.isFinite(n) && raw.trim() !== '' ? n : raw;
    });
    const start = parseDateLike(String(values['Start time'] || values['Date'] || ''));
    const end = parseDateLike(String(values['End time'] || ''));
    const dateValue = String(values['Date'] || start || '').slice(0, 10);

    if (isSummaryFile) {
      if (dateValue) {
        const target = getOrCreateDailySummary(out, dateValue);
        Object.assign(target, values);
        // Normalize common keys
        if (values['Step count'] != null) target['steps'] = values['Step count'];
        if (values['Calories (kcal)'] != null) target['calories'] = values['Calories (kcal)'];
        if (values['Distance (m)'] != null) target['distance'] = values['Distance (m)'];
        if (values['Move Minutes count'] != null) target['active_minutes'] = values['Move Minutes count'];
      }
    } else if (start && end) {
      out.dailyIntervals.push({
        id: `fit-i-${safeName(file)}-${ri}`,
        date: start.slice(0, 10),
        startTime: start,
        endTime: end,
        values,
        provenance: { file, dataset: 'daily_metrics', recordIndex: ri },
      });
      // Also accumulate steps/calories for this day if no summary file exists
      if (start.slice(0, 10)) {
        const dayTarget = getOrCreateDailySummary(out, start.slice(0, 10));
        const steps = Number(values['Step count'] || values['steps'] || 0);
        const calories = Number(values['Calories (kcal)'] || values['calories'] || 0);
        const dist = Number(values['Distance (m)'] || values['distance'] || 0);
        if (steps > 0) dayTarget['Step count'] = (Number(dayTarget['Step count'] || 0) + steps);
        if (calories > 0) dayTarget['Calories (kcal)'] = (Number(dayTarget['Calories (kcal)'] || 0) + calories);
        if (dist > 0) dayTarget['Distance (m)'] = (Number(dayTarget['Distance (m)'] || 0) + dist);
      }
    }
  }
}

/**
 * Parses Fitbit / Google Health JSON exports (Global Export Data & Physical Activity)
 */
function parseFitbitHealthJson(file: string, text: string, out: GoogleFitDataset) {
  const fileNameLower = file.toLowerCase();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return;
  }
  if (!Array.isArray(data)) {
    if (data && typeof data === 'object' && Array.isArray(data.records)) {
      data = data.records;
    } else if (data && typeof data === 'object') {
      data = [data];
    } else {
      return;
    }
  }

  // 1. Steps data (e.g., steps-2023-05-15.json or StepsRecord.json)
  if (fileNameLower.includes('steps-') || fileNameLower.includes('stepsrecord')) {
    let dayTotal = 0;
    let dayDate: string | null = null;
    data.forEach((item: any, idx: number) => {
      const dt = item.dateTime || item.date || item.startTime || item.time;
      const parsedDate = parseDateLike(dt);
      const count = Number(item.value ?? item.count ?? item.steps ?? 0);
      if (parsedDate && count > 0) {
        dayDate = parsedDate.slice(0, 10);
        dayTotal += count;
        out.measurements.push({
          id: `fitbit-step-${safeName(file)}-${idx}`,
          metric: 'steps',
          rawMetric: 'fitbit.steps',
          value: count,
          unit: 'count',
          startTime: parsedDate,
          provenance: { file, dataset: 'all_data', source: 'Fitbit' }
        });
      }
    });
    if (dayDate && dayTotal > 0) {
      const summary = getOrCreateDailySummary(out, dayDate);
      summary['Step count'] = (Number(summary['Step count'] || 0) + dayTotal);
      summary['steps'] = summary['Step count'];
    }
    return;
  }

  // 2. Heart rate data (e.g., heart_rate-2023-05-15.json or HeartRateRecord.json)
  if (fileNameLower.includes('heart_rate-') || fileNameLower.includes('heartrate-') || fileNameLower.includes('heartraterecord')) {
    let bpms: number[] = [];
    let dayDate: string | null = null;
    data.forEach((item: any, idx: number) => {
      const dt = item.dateTime || item.startTime || item.time;
      const parsedDate = parseDateLike(dt);
      if (parsedDate) dayDate = parsedDate.slice(0, 10);
      const bpm = Number(item.value?.bpm ?? item.value ?? item.beatsPerMinute ?? 0);
      if (bpm > 30 && bpm < 240) {
        bpms.push(bpm);
        if (idx % 10 === 0 && parsedDate) {
          out.measurements.push({
            id: `fitbit-hr-${safeName(file)}-${idx}`,
            metric: 'heart_rate',
            rawMetric: 'fitbit.heart_rate',
            value: bpm,
            unit: 'bpm',
            startTime: parsedDate,
            provenance: { file, dataset: 'all_data', source: 'Fitbit' }
          });
        }
      }
      if (Array.isArray(item.samples)) {
        item.samples.forEach((s: any) => {
          const sBpm = Number(s.beatsPerMinute);
          if (sBpm > 30 && sBpm < 240) bpms.push(sBpm);
        });
      }
    });
    if (dayDate && bpms.length > 0) {
      const avgBpm = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
      const maxBpm = Math.max(...bpms);
      const minBpm = Math.min(...bpms);
      const summary = getOrCreateDailySummary(out, dayDate);
      summary['Average heart rate (bpm)'] = avgBpm;
      summary['Max heart rate (bpm)'] = maxBpm;
      summary['Min heart rate (bpm)'] = minBpm;
      summary['heart_rate'] = avgBpm;
    }
    return;
  }

  // 3. Sleep data (e.g., sleep-2023-05-15.json or SleepSessionRecord.json)
  if (fileNameLower.includes('sleep-') || fileNameLower.includes('sleepsessionrecord')) {
    data.forEach((item: any, idx: number) => {
      const dateKey = item.dateOfSleep || (item.startTime ? item.startTime.slice(0, 10) : null);
      const startTime = parseDateLike(item.startTime);
      const endTime = parseDateLike(item.endTime);
      const durationMs = Number(item.duration ?? (item.minutesAsleep ? item.minutesAsleep * 60000 : 0));
      if (!startTime || !dateKey) return;

      const deepMin = item.levels?.summary?.deep?.minutes || 0;
      const lightMin = item.levels?.summary?.light?.minutes || 0;
      const remMin = item.levels?.summary?.rem?.minutes || 0;
      const wakeMin = item.levels?.summary?.wake?.minutes || item.minutesAwake || 0;

      const summary = getOrCreateDailySummary(out, dateKey);
      summary['Sleep duration (ms)'] = durationMs;
      summary['Deep sleep duration (ms)'] = deepMin * 60000;
      summary['Light sleep duration (ms)'] = lightMin * 60000;
      summary['REM sleep duration (ms)'] = remMin * 60000;
      summary['Awake duration (ms)'] = wakeMin * 60000;

      out.sessions.push({
        id: `fitbit-sleep-${safeName(file)}-${idx}`,
        activityType: 'Sleep',
        startTime,
        endTime: endTime || startTime,
        durationSeconds: Math.round(durationMs / 1000),
        segments: [],
        aggregates: { deepMinutes: deepMin, lightMinutes: lightMin, remMinutes: remMin, awakeMinutes: wakeMin },
        provenance: { file, dataset: 'sessions', source: 'Fitbit Sleep' }
      });
    });
    return;
  }

  // 4. Calories data (e.g., calories-2023-05-15.json or ActiveCaloriesBurnedRecord.json)
  if (fileNameLower.includes('calories-') || fileNameLower.includes('caloriesburnedrecord')) {
    let dayTotal = 0;
    let dayDate: string | null = null;
    data.forEach((item: any) => {
      const dt = item.dateTime || item.startTime;
      const parsedDate = parseDateLike(dt);
      const kcal = Number(item.value ?? item.energy?.kilocalories ?? item.calories ?? 0);
      if (parsedDate && kcal > 0) {
        dayDate = parsedDate.slice(0, 10);
        dayTotal += kcal;
      }
    });
    if (dayDate && dayTotal > 0) {
      const summary = getOrCreateDailySummary(out, dayDate);
      summary['Calories (kcal)'] = Math.round(Number(summary['Calories (kcal)'] || 0) + dayTotal);
      summary['calories'] = summary['Calories (kcal)'];
    }
    return;
  }

  // 5. Distance data (e.g., distance-2023-05-15.json or DistanceRecord.json)
  if (fileNameLower.includes('distance-') || fileNameLower.includes('distancerecord')) {
    let dayTotalMeters = 0;
    let dayDate: string | null = null;
    data.forEach((item: any) => {
      const dt = item.dateTime || item.startTime;
      const parsedDate = parseDateLike(dt);
      let rawVal = Number(item.value ?? item.distance?.meters ?? 0);
      // Fitbit distance files export in centimeters (e.g. 150000 cm = 1500m)
      if (rawVal > 100000 && !fileNameLower.includes('distancerecord')) {
        rawVal = rawVal / 100;
      }
      if (parsedDate && rawVal > 0) {
        dayDate = parsedDate.slice(0, 10);
        dayTotalMeters += rawVal;
      }
    });
    if (dayDate && dayTotalMeters > 0) {
      const summary = getOrCreateDailySummary(out, dayDate);
      summary['Distance (m)'] = Math.round(Number(summary['Distance (m)'] || 0) + dayTotalMeters);
      summary['distance'] = summary['Distance (m)'];
    }
    return;
  }

  // 6. Physical Activity Workouts (e.g., exercise-2023-05-15.json or ExerciseSessionRecord.json)
  if (fileNameLower.includes('exercise-') || fileNameLower.includes('exercisesessionrecord')) {
    data.forEach((item: any, idx: number) => {
      const actName = item.activityName || item.title || item.exerciseType || 'Workout';
      const startTime = parseDateLike(item.startTime);
      if (!startTime) return;
      const durationSec = Math.round(Number(item.duration ? item.duration / 1000 : item.activeDuration ? item.activeDuration / 1000 : 0));
      let distMeters = Number(item.distance || 0);
      if (item.distanceUnit === 'Kilometer') distMeters *= 1000;
      else if (item.distanceUnit === 'Mile') distMeters *= 1609.34;
      const calories = Number(item.calories || item.caloriesBurned || 0);

      out.workouts.push({
        id: `fitbit-ex-${safeName(file)}-${idx}`,
        activityType: actName,
        startTime,
        durationSeconds: durationSec > 0 ? durationSec : undefined,
        distanceMeters: distMeters > 0 ? distMeters : undefined,
        calories: calories > 0 ? calories : undefined,
        laps: [],
        trackpoints: [],
        provenance: { file, dataset: 'activities', source: 'Fitbit Exercise' }
      });
    });
    return;
  }

  // 7. Body & Weight data (e.g., weight-2023-05-15.json or WeightRecord.json)
  if (fileNameLower.includes('weight-') || fileNameLower.includes('weightrecord')) {
    data.forEach((item: any, idx: number) => {
      const dt = item.date || item.dateTime || item.time || item.startTime;
      const parsedDate = parseDateLike(dt);
      const wt = Number(item.weight ?? item.weight?.kilograms ?? 0);
      if (parsedDate && wt > 20 && wt < 300) {
        out.measurements.push({
          id: `fitbit-wt-${safeName(file)}-${idx}`,
          metric: 'weight',
          rawMetric: 'fitbit.weight',
          value: wt,
          unit: 'kg',
          startTime: parsedDate,
          provenance: { file, dataset: 'all_data', source: 'Fitbit Weight' }
        });
        const summary = getOrCreateDailySummary(out, parsedDate.slice(0, 10));
        summary['Weight (kg)'] = wt;
        summary['weight'] = wt;
      }
    });
  }
}

export async function parseGoogleFitTakeout(input: File | File[]): Promise<GoogleFitDataset> {
  const inputs = Array.isArray(input) ? input : [input];
  const isArchive = inputs.length === 1 && (/\.zip$/i.test(inputs[0].name) || /zip/i.test(inputs[0].type));
  const entries: Array<{ name: string; async: (type: 'text') => Promise<string>; dir?: boolean }> = [];

  if (isArchive) {
    const file = inputs[0];
    const zip = await JSZip.loadAsync(file);
    Object.values(zip.files).forEach((entry) => {
      if (!entry.dir) entries.push({ name: entry.name, async: (type) => entry.async(type) });
    });
  } else {
    for (const file of inputs) {
      const relative = ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).replace(/\\/g, '/');
      entries.push({ name: relative, async: async () => file.text() });
    }
  }

  const out: GoogleFitDataset = {
    importedAt: new Date().toISOString(),
    archiveName: isArchive ? inputs[0].name : `Fitness & Health folder (${inputs.length} files)`,
    filesScanned: entries.length,
    filesRecognized: 0,
    unrecognizedFiles: [],
    measurements: [], sessions: [], workouts: [], dailyIntervals: [], dailySummaries: [],
    metricCounts: {}, sourceCounts: {}, dateRange: { start: null, end: null },
  };

  for (const entry of entries) {
    const rawPath = entry.name.replace(/\\/g, '/');
    const lower = rawPath.toLowerCase();

    try {
      // 1. Google Fit All Data (raw/derived streams)
      if ((lower.includes('all data/') || lower.includes('derived_com.google.') || lower.includes('raw_com.google.')) && lower.endsWith('.json')) {
        parseAllDataFile(rawPath, await entry.async('text'), out);
        out.filesRecognized++;
        continue;
      }

      // 2. Google Fit All Sessions
      if (lower.includes('all sessions/') && lower.endsWith('.json')) {
        parseSessions(rawPath, await entry.async('text'), out);
        out.filesRecognized++;
        continue;
      }

      // 3. TCX Activity Workouts
      if (lower.endsWith('.tcx')) {
        parseTcX(rawPath, await entry.async('text'), out);
        out.filesRecognized++;
        continue;
      }

      // 4. GPX Activity Workouts
      if (lower.endsWith('.gpx')) {
        parseGpx(rawPath, await entry.async('text'), out);
        out.filesRecognized++;
        continue;
      }

      // 5. Google Fit Daily activity metrics / Daily Aggregations (CSV)
      if (
        lower.endsWith('daily activity metrics.csv') ||
        lower.endsWith('daily summaries.csv') ||
        (lower.includes('daily aggregations/') && lower.endsWith('.csv')) ||
        (lower.includes('daily activity metrics/') && lower.endsWith('.csv')) ||
        /^\d{4}-\d{2}-\d{2}\.csv$/.test(rawPath.split('/').pop() || '')
      ) {
        parseDailyMetrics(rawPath, await entry.async('text'), out);
        out.filesRecognized++;
        continue;
      }

      // 6. Google Health / Fitbit Takeout & Health Connect JSON files
      if (
        lower.includes('fitbit/') ||
        lower.includes('health connect/') ||
        lower.includes('global export data/') ||
        lower.includes('physical activity/') ||
        lower.includes('steps-') ||
        lower.includes('heart_rate-') ||
        lower.includes('heartrate-') ||
        lower.includes('sleep-') ||
        lower.includes('calories-') ||
        lower.includes('distance-') ||
        lower.includes('exercise-') ||
        lower.includes('weight-') ||
        lower.includes('stepsrecord') ||
        lower.includes('heartraterecord') ||
        lower.includes('sleepsessionrecord') ||
        lower.includes('exercisesessionrecord')
      ) {
        if (lower.endsWith('.json')) {
          parseFitbitHealthJson(rawPath, await entry.async('text'), out);
          out.filesRecognized++;
          continue;
        }
      }
    } catch {
      out.unrecognizedFiles.push(rawPath);
    }
  }

  let minDate = Infinity;
  let maxDate = -Infinity;
  const trackTimestamp = (isoStr?: string | null) => {
    if (!isoStr) return;
    const t = Date.parse(isoStr);
    if (Number.isFinite(t)) {
      if (t < minDate) minDate = t;
      if (t > maxDate) maxDate = t;
    }
  };

  out.measurements.forEach(m => trackTimestamp(m.startTime));
  out.sessions.forEach(s => trackTimestamp(s.startTime));
  out.workouts.forEach(w => trackTimestamp(w.startTime));
  out.dailyIntervals.forEach(i => trackTimestamp(i.startTime));
  out.dailySummaries.forEach(s => {
    if (s.date) trackTimestamp(`${s.date}T12:00:00.000Z`);
  });

  if (minDate !== Infinity && maxDate !== -Infinity) {
    out.dateRange.start = new Date(minDate).toISOString();
    out.dateRange.end = new Date(maxDate).toISOString();
  }
  return out;
}

export function fitActivityLabel(activity: string) {
  const s = activity.toLowerCase().replace(/_/g, ' ');
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}

export function fitCanonicalAggregate(metric: string, value: number) {
  if (metric.endsWith('step_count.delta')) return { key: 'steps', value, unit: 'steps' };
  if (metric.endsWith('distance.delta')) return { key: 'distance', value, unit: 'm' };
  if (metric.endsWith('calories.expended')) return { key: 'calories', value, unit: 'kcal' };
  if (metric.endsWith('active_minutes')) return { key: 'activeMinutes', value, unit: 'min' };
  if (metric.endsWith('heart_minutes.summary')) return { key: 'heartMinutes', value, unit: 'min' };
  if (metric.endsWith('speed.summary')) return { key: 'speed', value, unit: 'm/s' };
  return { key: metric, value, unit: '' };
}

/**
 * Converts Google Fit workouts and daily summaries into unified TimelineItems.
 * These items populate the Journal stream and Map Timeline seamlessly.
 */
export function convertGoogleFitToTimelineItems(dataset: GoogleFitDataset | null): TimelineItem[] {
  if (!dataset) return [];
  const items: TimelineItem[] = [];

  // 1. Convert recorded workouts (running, walking, cycling, etc.)
  (dataset.workouts || []).forEach(w => {
    const pts = (w.trackpoints || []).filter(
      p => p.lat != null && p.lng != null && !isNaN(p.lat) && !isNaN(p.lng)
    );
    const distKm = (w.distanceMeters || 0) / 1000;
    const durMin = Math.round((w.durationSeconds || 0) / 60);
    const actLabel = fitActivityLabel(w.activityType);
    const distStr = distKm > 0 ? `${distKm.toFixed(2)} km` : '';
    const calStr = w.calories ? `${Math.round(w.calories)} kcal` : '';
    const durStr = durMin > 0 ? `${durMin} min` : '';
    const subtitleParts = [distStr, durStr, calStr].filter(Boolean);
    const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' · ') : 'Fitness Workout';

    if (pts.length >= 2) {
      const startPt = pts[0];
      const endPt = pts[pts.length - 1];
      items.push({
        id: `fit_w_${w.id}`,
        type: 'maps',
        title: actLabel,
        subtitle,
        ts: w.startTime,
        dateObj: new Date(w.startTime),
        lat: startPt.lat!,
        lng: startPt.lng!,
        isRoute: true,
        pathPoints: pts.map(p => ({ lat: p.lat!, lng: p.lng! })),
        activityType: w.activityType,
        travelMode: w.activityType,
        distanceKm: distKm > 0 ? distKm.toFixed(2) : undefined,
        ms_played: (w.durationSeconds || 0) * 1000,
        origin: { lat: startPt.lat!, lng: startPt.lng!, address: 'Workout Start' },
        destination: { lat: endPt.lat!, lng: endPt.lng!, address: 'Workout Finish' },
        category: 'Fitness Workout',
        raw: w
      });
    } else if (pts.length === 1) {
      const pt = pts[0];
      items.push({
        id: `fit_w_${w.id}`,
        type: 'maps',
        title: actLabel,
        subtitle,
        ts: w.startTime,
        dateObj: new Date(w.startTime),
        lat: pt.lat!,
        lng: pt.lng!,
        activityType: w.activityType,
        distanceKm: distKm > 0 ? distKm.toFixed(2) : undefined,
        category: 'Fitness Workout',
        raw: w
      });
    } else {
      items.push({
        id: `fit_w_${w.id}`,
        type: 'maps',
        title: actLabel,
        subtitle,
        ts: w.startTime,
        dateObj: new Date(w.startTime),
        activityType: w.activityType,
        distanceKm: distKm > 0 ? distKm.toFixed(2) : undefined,
        category: 'Fitness Workout',
        raw: w
      });
    }
  });

  // 2. Convert daily health milestones (steps, calories, active minutes)
  (dataset.dailySummaries || []).forEach(day => {
    const steps = Number(day.values['Step count'] ?? day.values['steps'] ?? day.values['Steps'] ?? 0);
    const calories = Number(day.values['Calories (kcal)'] ?? day.values['calories'] ?? day.values['Calories'] ?? 0);
    const distanceMeters = Number(day.values['Distance (m)'] ?? day.values['distance'] ?? day.values['Distance'] ?? 0);
    const activeMin = Number(day.values['Move Minutes count'] ?? day.values['active_minutes'] ?? day.values['Active Minutes'] ?? 0);

    // Only create a day milestone if there was meaningful physical activity
    if (steps >= 100 || calories >= 100 || activeMin >= 5) {
      const distKm = distanceMeters > 0 ? `${(distanceMeters / 1000).toFixed(1)} km` : '';
      const summaryParts = [
        steps > 0 ? `${steps.toLocaleString()} steps` : '',
        distKm,
        calories > 0 ? `${Math.round(calories)} kcal` : '',
        activeMin > 0 ? `${Math.round(activeMin)} active min` : ''
      ].filter(Boolean);

      items.push({
        id: `fit_summary_${day.date}`,
        type: 'maps',
        title: `Daily Activity: ${steps > 0 ? `${steps.toLocaleString()} Steps` : `${Math.round(calories)} kcal`}`,
        subtitle: summaryParts.join(' · '),
        ts: `${day.date}T20:00:00.000Z`,
        dateObj: new Date(`${day.date}T20:00:00`),
        activityType: 'fitness_summary',
        category: 'Daily Fitness Activity',
        raw: day
      });
    }
  });

  return items;
}

