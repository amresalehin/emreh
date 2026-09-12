import JSZip from 'jszip';
import {
  FitDailyMetric,
  FitWorkout,
  FitDataSourceType,
  TimelineItem,
  FitMetricResolution,
  FitMetricAlternative
} from '../types';
import { generateDeterministicId } from './deterministicId';
import { timelinePersistence, persistTimelineIncremental } from './persistence';
import { GoogleFitDataset, parseGoogleFitTakeout } from './googleFitParser';
import { syncFitEcosystem, mergeGoogleFitDatasets } from './fitSync';
import { parseCalendarDate, parseCalendarInstant, validateCoordinates, CalendarDate } from './calendarDate';

/**
 * Robustly normalizes any date string, timestamp, or filename into 'YYYY-MM-DD'.
 * Handles nanoseconds, microseconds, milliseconds, seconds, ISO strings, and BOM.
 * Returns null if parsing fails - callers must handle missing dates explicitly.
 */
export function normalizeDateKey(val: any, fallbackFileName?: string): string | null {
  const calDate = parseCalendarDate(val, fallbackFileName);
  return calDate ? calDate.toISOString() : null;
}

/**
 * Robust CSV line tokenizer that respects quoted strings, commas, and escaped quotes.
 */
export function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

/**
 * Parses any Google Fit Takeout CSV text.
 * Handles:
 * - Daily activity metrics / Daily Summaries (aggregated 1 row/day)
 * - 15-minute interval files (e.g. YYYY-MM-DD.csv)
 * - All Data derived telemetry: step_count.delta, calories.expended, distance.delta, heart_minutes, heart_rate.bpm
 * - Activities.csv and workout session summaries
 */
export function parseFitCsvText(csvText: string, fileName?: string): Record<string, FitDailyMetric> {
  const result: Record<string, FitDailyMetric> = {};
  if (!csvText) return result;

  // Clean UTF-8 BOM
  const cleanedText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanedText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return result;

  // Header tokens
  const header = parseCsvRow(lines[0]).map(h => h.toLowerCase().trim());

  // Date / timestamp column detection (flexible Google Takeout names)
  let dateIdx = header.findIndex(h =>
    h === 'date' ||
    h === 'start time' ||
    h === 'start_time' ||
    h === 'starttime' ||
    h === 'timestamp' ||
    h === 'time' ||
    h === 'end time' ||
    h === 'end_time' ||
    h.includes('start')
  );

  // Fallback date from filename if not explicit in header
  const fileDateKey = normalizeDateKey(null, fileName);

  // Column index lookups - separate Heart Activity (points/min) and Heart Rate (bpm)
  const stepsIdx = header.findIndex(h => h.includes('step'));
  const heartPointsIdx = header.findIndex(h => (h.includes('heart point') || h.includes('heart_point')) && !h.includes('rate') && !h.includes('bpm'));
  const heartMinutesIdx = header.findIndex(h => (h.includes('heart min') || h.includes('heart_min')) && !h.includes('rate') && !h.includes('bpm'));
  const moveMinIdx = header.findIndex(h => h.includes('move min') || h.includes('active min'));
  const calIdx = header.findIndex(h => h.includes('calorie') || h.includes('kcal') || h.includes('expended'));
  const distIdx = header.findIndex(h => h.includes('distance') || h.includes('meter'));
  const restingHrIdx = header.findIndex(h => h.includes('resting') && (h.includes('heart rate') || h.includes('hr') || h.includes('bpm')));
  const hrIdx = header.findIndex(h => (h.includes('heart rate') || h.includes('bpm') || h.includes('pulse')) && !h.includes('resting') && !h.includes('point') && !h.includes('min'));
  const minHrIdx = header.findIndex(h => (h.includes('min') || h.includes('minimum')) && (h.includes('heart rate') || h.includes('bpm')));
  const maxHrIdx = header.findIndex(h => (h.includes('max') || h.includes('maximum')) && (h.includes('heart rate') || h.includes('bpm')));
  const workoutIdx = header.findIndex(h => h.includes('activity') || h.includes('sport') || h.includes('workout'));
  const durationIdx = header.findIndex(h => h.includes('duration') || h.includes('elapsed'));

  // If no date column and no filename date, we cannot map rows to days
  if (dateIdx === -1 && !fileDateKey) {
    // Check if column 0 looks like an ISO date or timestamp in the first data row
    const testRow = parseCsvRow(lines[1]);
    if (testRow.length > 0 && normalizeDateKey(testRow[0])) {
      dateIdx = 0;
    } else {
      return result;
    }
  }

  // Temporary heart rate accumulators per day for true mathematical average and pulse range
  const hrStats: Record<string, { sum: number; count: number; min: number; max: number }> = {};

  // Detect whether this CSV is interval-based or delta-based (requires summing)
  const isDerivedOrInterval =
    (fileName && (
      fileName.includes('derived_') ||
      fileName.includes('delta') ||
      /^\d{4}[-_]\d{2}[-_]\d{2}/.test(fileName)
    )) ||
    header.some(h => h.includes('delta') || h.includes('interval'));

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const rawDateVal = dateIdx !== -1 ? row[dateIdx] : null;
    const dateKey = normalizeDateKey(rawDateVal, fileName) || fileDateKey;
    if (!dateKey) continue;

    const dataSourceType: FitDataSourceType = isDerivedOrInterval ? 'interval' : 'daily_summary';
    ensureMetricForDate(result, dateKey, dataSourceType);
    const target = result[dateKey];
    target.dataSourceType = dataSourceType;

    // 1. Steps
    if (stepsIdx !== -1 && row[stepsIdx]) {
      const parsedSteps = Math.round(parseFloat(row[stepsIdx]) || 0);
      if (parsedSteps > 0) {
        if (isDerivedOrInterval) {
          target.steps += parsedSteps;
        } else {
          target.steps = parsedSteps;
        }
        target.stepsSource = 'measured';
      }
    }

    // 2. Heart Activity: Heart Points (NEVER heart rate!)
    if (heartPointsIdx !== -1 && row[heartPointsIdx]) {
      const parsedHp = Math.round(parseFloat(row[heartPointsIdx]) || 0);
      if (parsedHp > 0) {
        if (isDerivedOrInterval) {
          target.heartPoints += parsedHp;
        } else {
          target.heartPoints = parsedHp;
        }
        target.heartPointsSource = 'measured';
      }
    }

    // 2b. Heart Activity: Heart Minutes (NEVER heart rate!)
    if (heartMinutesIdx !== -1 && row[heartMinutesIdx]) {
      const parsedHm = Math.round(parseFloat(row[heartMinutesIdx]) || 0);
      if (parsedHm > 0) {
        if (isDerivedOrInterval) {
          target.heartMinutes = (target.heartMinutes || 0) + parsedHm;
        } else {
          target.heartMinutes = parsedHm;
        }
        target.heartMinutesSource = 'measured';
      }
    }

    // 3. Move Minutes
    if (moveMinIdx !== -1 && row[moveMinIdx]) {
      const parsedMm = Math.round(parseFloat(row[moveMinIdx]) || 0);
      if (parsedMm > 0) {
        if (isDerivedOrInterval) {
          target.moveMinutes += parsedMm;
        } else {
          target.moveMinutes = parsedMm;
        }
        target.moveMinutesSource = 'measured';
      }
    }

    // 4. Calories
    if (calIdx !== -1 && row[calIdx]) {
      const parsedCal = Math.round(parseFloat(row[calIdx]) || 0);
      if (parsedCal > 0) {
        if (isDerivedOrInterval) {
          target.caloriesTotal += parsedCal;
        } else {
          target.caloriesTotal = parsedCal;
        }
        target.caloriesTotalSource = 'measured';
      }
    }

    // 5. Distance (Check if meters vs km using explicit unit in header)
    if (distIdx !== -1 && row[distIdx]) {
      const rawDist = parseFloat(row[distIdx]) || 0;
      if (rawDist > 0) {
        // Check header for explicit unit declaration
        const headerText = header[distIdx].toLowerCase();
        let distKm: number;
        
        if (headerText.includes('(m)') || headerText.includes('meter') || headerText.includes('metre')) {
          // Explicitly meters
          distKm = parseFloat((rawDist / 1000).toFixed(2));
        } else if (headerText.includes('(km)') || headerText.includes('kilometer') || headerText.includes('kilometre')) {
          // Explicitly kilometers
          distKm = parseFloat(rawDist.toFixed(2));
        } else if (headerText.includes('(mi)') || headerText.includes('mile')) {
          // Miles to km
          distKm = parseFloat((rawDist * 1.60934).toFixed(2));
        } else {
// No explicit unit - use source-specific convention based on file type
        // Daily metrics CSVs (YYYY-MM-DD.csv, daily activity metrics): Google Fit uses meters
        // Workout CSVs (Activities.csv, Sessions.csv): Google Fit typically uses km
        const isDailyMetricsFile = fileName && (
          /^\d{4}[-_]\d{2}[-_]\d{2}\.csv$/.test(fileName) ||
          fileName.toLowerCase().includes('daily activity metrics') ||
          fileName.toLowerCase().includes('daily summaries') ||
          fileName.toLowerCase().includes('daily aggregations')
        );
        const isWorkoutFile = fileName && (
          fileName.toLowerCase().includes('activities') ||
          fileName.toLowerCase().includes('sessions') ||
          fileName.toLowerCase().includes('workouts')
        );
        
        // Default: daily metrics = meters, workouts = km, unknown = meters (safer default)
        const defaultUnit = isWorkoutFile ? 'km' : 'm';
        distKm = defaultUnit === 'm' ? parseFloat((rawDist / 1000).toFixed(2)) : parseFloat(rawDist.toFixed(2));
        }

        if (isDerivedOrInterval) {
          target.distanceKm = parseFloat((target.distanceKm + distKm).toFixed(2));
        } else {
          target.distanceKm = distKm;
        }
        target.distanceKmSource = 'measured';
      }
    }

    // 6. Heart Rate (BPM: resting, average, min, max - NEVER heart points or minutes!)
    if (restingHrIdx !== -1 && row[restingHrIdx]) {
      const rVal = parseFloat(row[restingHrIdx]);
      if (rVal > 30 && rVal < 240) {
        target.restingHeartRate = Math.round(rVal);
      }
    }
    if (minHrIdx !== -1 && row[minHrIdx]) {
      const minVal = parseFloat(row[minHrIdx]);
      if (minVal > 30 && minVal < 240) target.minHeartRate = Math.round(minVal);
    }
    if (maxHrIdx !== -1 && row[maxHrIdx]) {
      const maxVal = parseFloat(row[maxHrIdx]);
      if (maxVal > 30 && maxVal < 240) target.maxHeartRate = Math.round(maxVal);
    }
    if (hrIdx !== -1 && row[hrIdx]) {
      const hrVal = parseFloat(row[hrIdx]);
      if (hrVal > 30 && hrVal < 240) {
        if (!hrStats[dateKey]) hrStats[dateKey] = { sum: 0, count: 0, min: hrVal, max: hrVal };
        hrStats[dateKey].sum += hrVal;
        hrStats[dateKey].count += 1;
        hrStats[dateKey].min = Math.min(hrStats[dateKey].min, hrVal);
        hrStats[dateKey].max = Math.max(hrStats[dateKey].max, hrVal);
      }
    }

    // 7. Workout record extraction (Activities.csv, Sessions.csv)
    if (workoutIdx !== -1 && row[workoutIdx]) {
      const activityName = row[workoutIdx].trim();
      if (activityName && activityName.toLowerCase() !== 'unknown' && activityName.toLowerCase() !== 'still') {
        const durVal = durationIdx !== -1 ? parseFloat(row[durationIdx]) || 0 : 0;
        const durMin = durVal > 1000 ? Math.round(durVal / 60000) : (durVal > 0 ? Math.round(durVal) : undefined);
        const hasCalSource = calIdx !== -1 && row[calIdx] && parseFloat(row[calIdx]) > 0;
        const workoutCal = hasCalSource ? Math.round(parseFloat(row[calIdx]) || 0) : undefined;
        const hasDistSource = distIdx !== -1 && row[distIdx] && parseFloat(row[distIdx]) > 0;
        const rawWkDist = hasDistSource ? parseFloat(row[distIdx]) || 0 : 0;
        let wkDistKm: number | undefined = undefined;
        if (hasDistSource) {
          // Use same unit detection logic as above
          const headerText = header[distIdx].toLowerCase();
          if (headerText.includes('(m)') || headerText.includes('meter') || headerText.includes('metre')) {
            wkDistKm = parseFloat((rawWkDist / 1000).toFixed(2));
          } else if (headerText.includes('(km)') || headerText.includes('kilometer') || headerText.includes('kilometre')) {
            wkDistKm = parseFloat(rawWkDist.toFixed(2));
          } else if (headerText.includes('(mi)') || headerText.includes('mile')) {
            wkDistKm = parseFloat((rawWkDist * 1.60934).toFixed(2));
          } else {
            // Use source-specific default (workout files typically use km)
            const isWorkoutFile = fileName && (
              fileName.toLowerCase().includes('activities') ||
              fileName.toLowerCase().includes('sessions') ||
              fileName.toLowerCase().includes('workouts')
            );
            const defaultUnit = isWorkoutFile ? 'km' : 'm';
            wkDistKm = defaultUnit === 'm' ? parseFloat((rawWkDist / 1000).toFixed(2)) : parseFloat(rawWkDist.toFixed(2));
          }
        }

        let wkType: FitWorkout['type'] = 'other';
        const actLower = activityName.toLowerCase();
        if (actLower.includes('run')) wkType = 'running';
        else if (actLower.includes('cycl') || actLower.includes('bike')) wkType = 'cycling';
        else if (actLower.includes('walk') || actLower.includes('hik')) wkType = 'walking';
        else if (actLower.includes('swim')) wkType = 'swimming';
        else if (actLower.includes('strength') || actLower.includes('weight') || actLower.includes('gym')) wkType = 'strength';
        else if (actLower.includes('yoga')) wkType = 'yoga';

        const startTimeStr = rawDateVal && rawDateVal.includes(':')
          ? rawDateVal.slice(11, 16)
          : undefined;

        target.workouts.push({
          id: generateDeterministicId('w_csv', dateKey),
          type: wkType,
          title: activityName,
          startTime: startTimeStr,
          durationMinutes: durMin,
          calories: workoutCal,
          distanceKm: wkDistKm,
        });
      }
    }
  }

  // Post-processing & normalization across all parsed days
  Object.keys(result).forEach(k => {
    const t = result[k];

    // Compute average heart rate and envelope - NEVER overwrite resting HR with average HR!
    if (hrStats[k] && hrStats[k].count > 0) {
      const avgHr = Math.round(hrStats[k].sum / hrStats[k].count);
      t.averageHeartRate = avgHr;
      t.minHeartRate = t.minHeartRate ?? Math.round(hrStats[k].min);
      t.maxHeartRate = t.maxHeartRate ?? Math.round(hrStats[k].max);
      t.currentHeartRate = avgHr;
    }

    // Set structured representations
    t.heartRate = {
      resting: t.restingHeartRate,
      average: t.averageHeartRate,
      min: t.minHeartRate,
      max: t.maxHeartRate
    };

    t.heartActivity = {
      points: t.heartPoints,
      minutes: t.heartMinutes
    };

    // NOTE: We no longer fabricate derived values for calories, distance, or move minutes.
    // These should remain undefined if not present in source data.
    // Consumers can apply their own estimation logic if needed.
  });

  return result;
}

/**
 * Parses a TCX / XML workout file from Google Takeout.
 * Returns null if required data (start time) is missing - no fallback to filename.
 */
export function parseTcxWorkout(tcxText: string, fileName?: string): { date: string; workout: FitWorkout } | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(tcxText, 'application/xml');

    const activityEl = doc.querySelector('Activity');
    const sport = activityEl?.getAttribute('Sport')?.toLowerCase() || 'other';

    const idEl = doc.querySelector('Id') || doc.querySelector('Lap');
    const startTimeStr = idEl?.textContent || activityEl?.querySelector('Lap')?.getAttribute('StartTime') || '';
    const dateObj = new Date(startTimeStr);
    if (isNaN(dateObj.getTime())) {
      // No valid start time in TCX content - do not fall back to filename
      console.warn('TCX workout missing valid start time, skipping:', fileName);
      return null;
    }

    const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let durationSeconds = 0;
    let distanceMeters = 0;
    let calories = 0;
    let avgHeartRateBpm: number | undefined = undefined;

    const totalTimeEl = doc.querySelector('TotalTimeSeconds');
    if (totalTimeEl) durationSeconds = parseFloat(totalTimeEl.textContent || '0');

    const distEl = doc.querySelector('DistanceMeters');
    if (distEl) distanceMeters = parseFloat(distEl.textContent || '0');

    const calEl = doc.querySelector('Calories');
    if (calEl) calories = Math.round(parseFloat(calEl.textContent || '0'));

    const hrEl = doc.querySelector('AverageHeartRateBpm Value');
    if (hrEl) avgHeartRateBpm = Math.round(parseFloat(hrEl.textContent || '0'));

    let type: FitWorkout['type'] = 'other';
    if (sport.includes('run')) type = 'running';
    else if (sport.includes('bik') || sport.includes('cycl')) type = 'cycling';
    else if (sport.includes('walk') || sport.includes('hik')) type = 'walking';
    else if (sport.includes('swim')) type = 'swimming';
    else if (sport.includes('strength') || sport.includes('weight')) type = 'strength';
    else if (sport.includes('yoga')) type = 'yoga';

    const workoutTitle =
      fileName?.replace(/\.tcx$/i, '').replace(/[-_]/g, ' ') ||
      `${type.charAt(0).toUpperCase() + type.slice(1)} Workout`;

    const workout: FitWorkout = {
      id: generateDeterministicId('w_tcx', dateKey),
      type,
      title: workoutTitle,
      startTime: timeFormatted,
      durationMinutes: durationSeconds > 0 ? Math.round(durationSeconds / 60) : undefined,
      calories: calories > 0 ? calories : undefined,
      distanceKm: distanceMeters > 0 ? parseFloat((distanceMeters / 1000).toFixed(2)) : undefined,
      avgHeartRateBpm
    };

    return { date: dateKey, workout };
  } catch (e) {
    console.warn('Failed parsing TCX workout:', e);
    return null;
  }
}

/**
 * Parses Google Fit JSON files (e.g. Sessions.json, DailySummaries.json).
 */
export function parseFitJson(json: any, target: Record<string, FitDailyMetric>) {
  if (!json) return;
  if (Array.isArray(json)) {
    json.forEach(item => parseFitSingleJson(item, target));
  } else if (typeof json === 'object') {
    if (json.date || json.steps || json.dailyMetrics || json.startTime) {
      parseFitSingleJson(json, target);
    } else if (json.days || json.metrics || json.sessions || json.session) {
      const arr = json.days || json.metrics || json.sessions || json.session;
      if (Array.isArray(arr)) arr.forEach(item => parseFitSingleJson(item, target));
    }
  }
}

function parseFitSingleJson(obj: any, target: Record<string, FitDailyMetric>) {
  const dateKey = normalizeDateKey(obj.date || obj.timestamp || obj.startTime || obj.startTimeMillis);
  if (!dateKey) return;

  ensureMetricForDate(target, dateKey, 'daily_summary');
  const m = target[dateKey];
  m.dataSourceType = 'daily_summary';

  if (obj.steps !== undefined) {
    m.steps = Math.max(m.steps, Math.round(Number(obj.steps)));
    m.stepsSource = 'measured';
  }
  if (obj.heartPoints !== undefined) {
    m.heartPoints = Math.max(m.heartPoints, Math.round(Number(obj.heartPoints)));
    m.heartPointsSource = 'measured';
  }
  if (obj.moveMinutes !== undefined) {
    m.moveMinutes = Math.max(m.moveMinutes, Math.round(Number(obj.moveMinutes)));
    m.moveMinutesSource = 'measured';
  }
  if (obj.caloriesTotal !== undefined) {
    m.caloriesTotal = Math.max(m.caloriesTotal, Math.round(Number(obj.caloriesTotal)));
    m.caloriesTotalSource = 'measured';
  }
  if (obj.caloriesActive !== undefined) {
    m.caloriesActive = Math.max(m.caloriesActive, Math.round(Number(obj.caloriesActive)));
    m.caloriesActiveSource = 'measured';
  }
  if (obj.distanceKm !== undefined) {
    m.distanceKm = Math.max(m.distanceKm, parseFloat(Number(obj.distanceKm).toFixed(2)));
    m.distanceKmSource = 'measured';
  }
  if (obj.restingHeartRate !== undefined) m.restingHeartRate = Math.round(Number(obj.restingHeartRate));
  if (obj.sleepHours !== undefined) m.sleepHours = parseFloat(Number(obj.sleepHours).toFixed(1));
  if (obj.sleepScore !== undefined) m.sleepScore = Math.round(Number(obj.sleepScore));

  // Workout Session object
  if (obj.activityType || obj.activityName || obj.name) {
    const name = obj.name || obj.activityName || obj.activityType || 'Workout';
    const durMin = obj.durationMillis
      ? Math.round(Number(obj.durationMillis) / 60000)
      : (obj.durationMinutes ? Math.round(Number(obj.durationMinutes)) : 20);

    const hasCal = obj.calories !== undefined && Number(obj.calories) > 0;
    const hasDist = obj.distanceMeters !== undefined && Number(obj.distanceMeters) > 0;

    m.workouts.push({
      id: generateDeterministicId('w_json', dateKey),
      type: 'other',
      title: name,
      startTime: obj.startTime ? String(obj.startTime).slice(11, 16) : '12:00',
      durationMinutes: durMin,
      calories: hasCal ? Math.round(Number(obj.calories)) : undefined,
      distanceKm: hasDist ? parseFloat((Number(obj.distanceMeters) / 1000).toFixed(2)) : undefined
    });
  }

  if (Array.isArray(obj.workouts)) {
    m.workouts = [...m.workouts, ...obj.workouts];
  }
}

/**
 * Parses files (Google Takeout ZIP, CSVs, TCX, JSON, GPX) into daily Fit metrics.
 * Seamlessly extracts Google Takeout archives, merges with existing metrics,
 * saves to storage and dispatches update notification.
 */
/**
 * Authority Hierarchy for Fit Metrics:
 * Rank 1: Daily aggregate (daily_summary, daily_aggregate)
 * Rank 2: Derived aggregate (interval, derived_aggregate, derived)
 * Rank 3: Raw datapoints (raw, sensor, measurement, json)
 * Rank 4: Workout/session data (workout, session, tcx, gpx)
 */
export function getAuthorityRank(source?: string): number {
  if (!source) return 99;
  const s = source.toLowerCase();
  if (s.includes('daily_summary') || s.includes('daily_aggregate') || s === 'daily') return 1;
  if (s.includes('derived') || s.includes('interval')) return 2;
  if (s.includes('raw') || s.includes('measurement') || s.includes('sensor') || s.includes('json')) return 3;
  if (s.includes('workout') || s.includes('session') || s.includes('tcx') || s.includes('gpx')) return 4;
  return 10;
}

export function getAuthorityLabel(source?: string): string {
  const rank = getAuthorityRank(source);
  switch (rank) {
    case 1:
      return 'Google daily aggregate';
    case 2:
      return 'Derived aggregate';
    case 3:
      return 'Raw datapoints';
    case 4:
      return 'Workout/session data';
    default:
      return source || 'Google Fit';
  }
}

/**
 * Resolves a single numeric metric under the strict authority hierarchy:
 * Never add two representations of the same metric merely because they came from different files.
 * Instead stores:
 * {
 *   value: 10000,
 *   source: "daily_summary",
 *   alternatives: [
 *     { value: 10042, source: "interval" }
 *   ]
 * }
 */
export function resolveMetricValue(
  existingDetail: FitMetricResolution<number> | undefined,
  existingFallbackValue: number | undefined,
  existingFallbackSource: string | undefined,
  incomingValue: number,
  incomingSource: string,
  incomingLabel?: string
): FitMetricResolution<number> {
  const incVal = Number.isFinite(incomingValue) ? incomingValue : 0;
  const incSource = incomingSource || 'unknown';
  const incLabel = incomingLabel || getAuthorityLabel(incSource);

  const curVal = existingDetail?.value ?? existingFallbackValue ?? 0;
  const curSource = existingDetail?.source ?? existingFallbackSource ?? (curVal > 0 ? 'unknown' : '');
  const curLabel = existingDetail?.sourceLabel ?? (curSource ? getAuthorityLabel(curSource) : undefined);
  const curAlternatives: FitMetricAlternative<number>[] = existingDetail?.alternatives ? [...existingDetail.alternatives] : [];

  if (curVal <= 0 && incVal > 0) {
    return {
      value: incVal,
      source: incSource,
      sourceLabel: incLabel,
      alternatives: curAlternatives
    };
  }

  if (incVal <= 0) {
    return {
      value: curVal,
      source: curSource || incSource,
      sourceLabel: curLabel || incLabel,
      alternatives: curAlternatives
    };
  }

  const curRank = getAuthorityRank(curSource);
  const incRank = getAuthorityRank(incSource);

  // Incoming has strictly higher authority (lower rank number)
  if (incRank < curRank) {
    const alts = [...curAlternatives];
    if (Math.abs(curVal - incVal) >= 0.01 && !alts.some(a => Math.abs(a.value - curVal) < 0.01 && a.source === curSource)) {
      alts.push({
        value: curVal,
        source: curSource,
        sourceLabel: curLabel
      });
    }
    return {
      value: incVal,
      source: incSource,
      sourceLabel: incLabel,
      alternatives: alts
    };
  }

  // Existing has strictly higher authority (lower rank number)
  if (curRank < incRank) {
    const alts = [...curAlternatives];
    if (Math.abs(incVal - curVal) >= 0.01 && !alts.some(a => Math.abs(a.value - incVal) < 0.01 && a.source === incSource)) {
      alts.push({
        value: incVal,
        source: incSource,
        sourceLabel: incLabel
      });
    }
    return {
      value: curVal,
      source: curSource,
      sourceLabel: curLabel,
      alternatives: alts
    };
  }

  // Same rank: Never add! Store alternative if differing
  const alts = [...curAlternatives];
  if (Math.abs(incVal - curVal) >= 0.01) {
    const chosenVal = Math.max(curVal, incVal);
    const altVal = Math.min(curVal, incVal);
    if (!alts.some(a => Math.abs(a.value - altVal) < 0.01 && a.source === incSource)) {
      alts.push({
        value: altVal,
        source: incSource,
        sourceLabel: incLabel
      });
    }
    return {
      value: chosenVal,
      source: curSource,
      sourceLabel: curLabel,
      alternatives: alts
    };
  }

  return {
    value: curVal,
    source: curSource,
    sourceLabel: curLabel,
    alternatives: alts
  };
}

/**
 * Fast in-memory converter from a parsed GoogleFitDataset into a dictionary of FitDailyMetric.
 * Strictly respects the authority hierarchy:
 * Daily aggregate -> Derived aggregate -> Raw datapoints -> Workout/session data
 */
export function extractFitDailyMetricsFromDataset(dataset: GoogleFitDataset): Record<string, FitDailyMetric> {
  const result: Record<string, FitDailyMetric> = {};
  if (!dataset) return result;

  // 1. Ingest daily summaries (Rank 1: Daily aggregate)
  (dataset.dailySummaries || []).forEach(s => {
    const dateKey = s.date;
    if (!dateKey) return;
    const vals = s.values || {};
    const steps = Number(vals['Step count'] ?? vals['steps'] ?? vals['Steps'] ?? vals['step_count'] ?? 0);
    const distM = Number(vals['Distance (m)'] ?? vals['distance'] ?? vals['Distance'] ?? vals['distance_m'] ?? 0);
    const cal = Number(vals['Calories (kcal)'] ?? vals['calories'] ?? vals['Calories'] ?? vals['calories_kcal'] ?? 0);
    const move = Number(vals['Move Minutes count'] ?? vals['move_minutes'] ?? vals['active_minutes'] ?? vals['Active Minutes'] ?? 0);

    const stepsDetail = !isNaN(steps) && steps > 0
      ? resolveMetricValue(undefined, undefined, undefined, steps, 'daily_summary', 'Google daily aggregate')
      : undefined;

    const distKm = !isNaN(distM) && distM > 0 ? parseFloat((distM / 1000).toFixed(2)) : 0;
    const distDetail = distKm > 0
      ? resolveMetricValue(undefined, undefined, undefined, distKm, 'daily_summary', 'Google daily aggregate')
      : undefined;

    const calTotal = !isNaN(cal) && cal > 0 ? Math.round(cal) : 0;
    const calDetail = calTotal > 0
      ? resolveMetricValue(undefined, undefined, undefined, calTotal, 'daily_summary', 'Google daily aggregate')
      : undefined;

    const moveMin = !isNaN(move) && move > 0 ? Math.round(move) : 0;
    const moveDetail = moveMin > 0
      ? resolveMetricValue(undefined, undefined, undefined, moveMin, 'daily_summary', 'Google daily aggregate')
      : undefined;

    // 1. Heart Activity: Heart Points & Heart Minutes - NEVER heart rate!
    const rawHeartPts = Number(vals['Heart Points'] ?? vals['heart_points'] ?? 0);
    const rawHeartMin = Number(vals['Heart Minutes'] ?? vals['heart_minutes'] ?? 0);

    const heartPtsDetail = !isNaN(rawHeartPts) && rawHeartPts > 0
      ? resolveMetricValue(undefined, undefined, undefined, Math.round(rawHeartPts), 'daily_summary', 'Google daily aggregate')
      : undefined;

    const heartMinDetail = !isNaN(rawHeartMin) && rawHeartMin > 0
      ? resolveMetricValue(undefined, undefined, undefined, Math.round(rawHeartMin), 'daily_summary', 'Google daily aggregate')
      : undefined;

    // 2. Heart Rate in BPM: Resting, Average, Min, Max - NEVER heart activity (points/minutes)!
    const rawRestingHr = Number(vals['Resting heart rate (bpm)'] ?? vals['resting_heart_rate'] ?? 0);
    const rawAvgHr = Number(vals['Average heart rate (bpm)'] ?? vals['average_heart_rate'] ?? 0);
    const rawMinHr = Number(vals['Min heart rate (bpm)'] ?? vals['min_heart_rate'] ?? 0);
    const rawMaxHr = Number(vals['Max heart rate (bpm)'] ?? vals['max_heart_rate'] ?? 0);

    const restingHr = rawRestingHr > 30 && rawRestingHr < 240 ? Math.round(rawRestingHr) : undefined;
    const avgHr = rawAvgHr > 30 && rawAvgHr < 240 ? Math.round(rawAvgHr) : undefined;
    const minHr = rawMinHr > 30 && rawMinHr < 240 ? Math.round(rawMinHr) : undefined;
    const maxHr = rawMaxHr > 30 && rawMaxHr < 240 ? Math.round(rawMaxHr) : undefined;

    const restingHrDetail = restingHr
      ? resolveMetricValue(undefined, undefined, undefined, restingHr, 'daily_summary', 'Google daily aggregate')
      : undefined;

    const avgHrDetail = avgHr
      ? resolveMetricValue(undefined, undefined, undefined, avgHr, 'daily_summary', 'Google daily aggregate')
      : undefined;

    result[dateKey] = {
      date: dateKey,
      steps: stepsDetail?.value || (isNaN(steps) ? 0 : steps),
      stepsGoal: 10000,
      stepsSource: 'daily_summary',
      stepsDetail,
      // Heart Activity
      heartPoints: heartPtsDetail?.value || (isNaN(rawHeartPts) ? 0 : Math.round(rawHeartPts)),
      heartPointsGoal: 40,
      heartPointsSource: 'daily_summary',
      heartPointsDetail: heartPtsDetail,
      heartMinutes: heartMinDetail?.value || (isNaN(rawHeartMin) ? 0 : Math.round(rawHeartMin)),
      heartMinutesSource: 'daily_summary',
      heartMinutesDetail: heartMinDetail,
      heartActivity: {
        points: heartPtsDetail?.value || (isNaN(rawHeartPts) ? 0 : Math.round(rawHeartPts)),
        minutes: heartMinDetail?.value || (isNaN(rawHeartMin) ? 0 : Math.round(rawHeartMin))
      },
      moveMinutes: moveDetail?.value || (isNaN(move) ? 0 : move),
      moveMinutesSource: 'daily_summary',
      moveMinutesDetail: moveDetail,
      caloriesActive: 0,
      caloriesTotal: calDetail?.value || (isNaN(cal) ? 0 : Math.round(cal)),
      caloriesTotalSource: 'daily_summary',
      caloriesTotalDetail: calDetail,
      distanceKm: distDetail?.value || distKm,
      distanceKmSource: 'daily_summary',
      distanceKmDetail: distDetail,
      // Heart Rate
      restingHeartRate: restingHrDetail?.value || restingHr,
      restingHeartRateDetail: restingHrDetail,
      averageHeartRate: avgHrDetail?.value || avgHr,
      averageHeartRateDetail: avgHrDetail,
      minHeartRate: minHr,
      maxHeartRate: maxHr,
      heartRate: {
        resting: restingHrDetail?.value || restingHr,
        average: avgHrDetail?.value || avgHr,
        min: minHr,
        max: maxHr
      },
      workouts: [],
      dataSourceType: 'daily_summary'
    };
  });

  // 2. Ingest daily intervals (Rank 2: Derived aggregate)
  // First, accumulate interval segments within the same day interval stream
  const intervalDayTotals: Record<string, { steps: number; distM: number; cal: number; move: number; heartPoints: number; heartMinutes: number }> = {};
  (dataset.dailyIntervals || []).forEach(interval => {
    const dateKey = interval.date || (interval.startTime ? interval.startTime.slice(0, 10) : '');
    if (!dateKey) return;
    if (!intervalDayTotals[dateKey]) {
      intervalDayTotals[dateKey] = { steps: 0, distM: 0, cal: 0, move: 0, heartPoints: 0, heartMinutes: 0 };
    }
    const it = intervalDayTotals[dateKey];
    const vals = interval.values || {};
    const steps = Number(vals['Step count'] ?? vals['steps'] ?? vals['Steps'] ?? 0);
    const distM = Number(vals['Distance (m)'] ?? vals['distance'] ?? vals['Distance'] ?? 0);
    const cal = Number(vals['Calories (kcal)'] ?? vals['calories'] ?? vals['Calories'] ?? 0);
    const move = Number(vals['Move Minutes count'] ?? vals['move_minutes'] ?? vals['active_minutes'] ?? 0);
    const heartPts = Number(vals['Heart Points'] ?? vals['heart_points'] ?? 0);
    const heartMin = Number(vals['Heart Minutes'] ?? vals['heart_minutes'] ?? 0);
    if (!isNaN(steps) && steps > 0) it.steps += steps;
    if (!isNaN(distM) && distM > 0) it.distM += distM;
    if (!isNaN(cal) && cal > 0) it.cal += cal;
    if (!isNaN(move) && move > 0) it.move += move;
    if (!isNaN(heartPts) && heartPts > 0) it.heartPoints += heartPts;
    if (!isNaN(heartMin) && heartMin > 0) it.heartMinutes += heartMin;
  });

  // Now resolve intervals against daily aggregates under authority hierarchy (Never sum!)
  Object.entries(intervalDayTotals).forEach(([dateKey, it]) => {
    ensureMetricForDate(result, dateKey, 'interval');
    const m = result[dateKey];

    if (it.steps > 0) {
      m.stepsDetail = resolveMetricValue(m.stepsDetail, m.steps, m.stepsSource, it.steps, 'interval', 'Derived aggregate');
      m.steps = m.stepsDetail.value;
      m.stepsSource = m.stepsDetail.source;
    }

    const intervalDistKm = parseFloat((it.distM / 1000).toFixed(2));
    if (intervalDistKm > 0) {
      m.distanceKmDetail = resolveMetricValue(m.distanceKmDetail, m.distanceKm, m.distanceKmSource, intervalDistKm, 'interval', 'Derived aggregate');
      m.distanceKm = m.distanceKmDetail.value;
      m.distanceKmSource = m.distanceKmDetail.source;
    }

    if (it.cal > 0) {
      m.caloriesTotalDetail = resolveMetricValue(m.caloriesTotalDetail, m.caloriesTotal, m.caloriesTotalSource, Math.round(it.cal), 'interval', 'Derived aggregate');
      m.caloriesTotal = m.caloriesTotalDetail.value;
      m.caloriesTotalSource = m.caloriesTotalDetail.source;
    }

    if (it.move > 0) {
      m.moveMinutesDetail = resolveMetricValue(m.moveMinutesDetail, m.moveMinutes, m.moveMinutesSource, Math.round(it.move), 'interval', 'Derived aggregate');
      m.moveMinutes = m.moveMinutesDetail.value;
      m.moveMinutesSource = m.moveMinutesDetail.source;
    }

    if (it.heartPoints > 0) {
      m.heartPointsDetail = resolveMetricValue(m.heartPointsDetail, m.heartPoints, m.heartPointsSource, Math.round(it.heartPoints), 'interval', 'Derived aggregate');
      m.heartPoints = m.heartPointsDetail.value;
      m.heartPointsSource = m.heartPointsDetail.source;
    }

    if (it.heartMinutes > 0) {
      m.heartMinutesDetail = resolveMetricValue(m.heartMinutesDetail, m.heartMinutes, m.heartMinutesSource, Math.round(it.heartMinutes), 'interval', 'Derived aggregate');
      m.heartMinutes = m.heartMinutesDetail.value;
      m.heartMinutesSource = m.heartMinutesDetail.source;
    }

    m.heartActivity = {
      points: m.heartPoints,
      minutes: m.heartMinutes
    };
  });

  // 3. Attach workouts (Rank 4: Workout/session data)
  (dataset.workouts || []).forEach(w => {
    const dateKey = w.startTime ? w.startTime.slice(0, 10) : '';
    if (!dateKey) return;
    ensureMetricForDate(result, dateKey, 'workout');
    const m = result[dateKey];
    if (!m.workouts) m.workouts = [];
    m.workouts.push(w);

    const distKm = (w.distanceMeters || 0) / 1000;
    if (distKm > 0) {
      m.distanceKmDetail = resolveMetricValue(m.distanceKmDetail, m.distanceKm, m.distanceKmSource, parseFloat(distKm.toFixed(2)), 'workout', 'Workout/session data');
      m.distanceKm = m.distanceKmDetail.value;
      m.distanceKmSource = m.distanceKmDetail.source;
    }
    if (w.calories && w.calories > 0) {
      m.caloriesTotalDetail = resolveMetricValue(m.caloriesTotalDetail, m.caloriesTotal, m.caloriesTotalSource, Math.round(w.calories), 'workout', 'Workout/session data');
      m.caloriesTotal = m.caloriesTotalDetail.value;
      m.caloriesTotalSource = m.caloriesTotalDetail.source;
    }
  });

  // 4. Attach measurements (Rank 3: Raw datapoints)
  (dataset.measurements || []).forEach(meas => {
    const dateKey = meas.startTime ? meas.startTime.slice(0, 10) : '';
    if (!dateKey) return;
    ensureMetricForDate(result, dateKey, 'raw');
    const m = result[dateKey];
    if (meas.metric === 'weight' && meas.value) {
      m.weightKg = Number(meas.value);
    } else if (meas.rawMetric && meas.rawMetric.toLowerCase().includes('sleep') && meas.value) {
      m.sleepHours = Number(meas.value);
    } else if (meas.metric === 'heart_rate' && meas.value) {
      const hr = Number(meas.value);
      if (hr > 30 && hr < 240) {
        const roundedHr = Math.round(hr);
        m.currentHeartRate = roundedHr;
        m.minHeartRate = m.minHeartRate !== undefined ? Math.min(m.minHeartRate, roundedHr) : roundedHr;
        m.maxHeartRate = m.maxHeartRate !== undefined ? Math.max(m.maxHeartRate, roundedHr) : roundedHr;
        if (!m.heartRate) m.heartRate = {};
        m.heartRate.min = m.minHeartRate;
        m.heartRate.max = m.maxHeartRate;

        // If explicitly tagged as resting pulse in raw metric stream
        if (meas.rawMetric && (meas.rawMetric.toLowerCase().includes('resting') || meas.rawMetric.toLowerCase().includes('basal'))) {
          m.restingHeartRateDetail = resolveMetricValue(m.restingHeartRateDetail, m.restingHeartRate, 'raw', roundedHr, 'raw', 'Raw datapoints (Resting)');
          m.restingHeartRate = m.restingHeartRateDetail.value;
          m.heartRate.resting = m.restingHeartRate;
        }
      }
    }
  });

  return result;
}

export async function parseFitFiles(
  files: File[] | FileList,
  onProgress?: (percent: number, msg: string) => void
): Promise<Record<string, FitDailyMetric>> {
  const aggregated: Record<string, FitDailyMetric> = {};
  const fileArray = Array.from(files);
  let aggregatedDataset: GoogleFitDataset | null = null;

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    const nameLower = file.name.toLowerCase();

    if (onProgress) {
      onProgress(Math.round((i / fileArray.length) * 100), `Parsing ${file.name}...`);
    }

    if (nameLower.endsWith('.zip')) {
      // Delegate ZIP handling to parseGoogleFitTakeout for consistent parsing
      try {
        const parsedDataset = await parseGoogleFitTakeout(file);
        aggregatedDataset = mergeGoogleFitDatasets(aggregatedDataset, parsedDataset);
        const extracted = extractFitDailyMetricsFromDataset(parsedDataset);
        mergeFitMetrics(aggregated, extracted);
      } catch (err) {
        console.error('Error parsing Fit ZIP archive:', err);
      }
    } else if (nameLower.endsWith('.csv')) {
      try {
        const text = await file.text();
        const parsed = parseFitCsvText(text, file.name);
        mergeFitMetrics(aggregated, parsed);
      } catch (err) {
        console.warn(`Error parsing CSV ${file.name}:`, err);
      }
    } else if (nameLower.endsWith('.tcx')) {
      try {
        const text = await file.text();
        const res = parseTcxWorkout(text, file.name);
        if (res) {
          ensureMetricForDate(aggregated, res.date, 'workout');
          aggregated[res.date].dataSourceType = 'workout';
          aggregated[res.date].workouts.push(res.workout);

          // Also merge into aggregatedDataset to preserve GPS trackpoints & polylines
          const tcxDataset: GoogleFitDataset = {
            importedAt: new Date().toISOString(),
            archiveName: file.name,
            filesScanned: 1,
            filesRecognized: 1,
            unrecognizedFiles: [],
            parseErrors: [],
            measurements: [],
            sessions: [{
              id: res.workout.id || generateDeterministicId(res.workout.startTime, res.workout.title),
              activityType: res.workout.activityType || 'Workout',
              startTime: res.workout.startTime,
              endTime: res.workout.endTime || res.workout.startTime,
              durationSeconds: res.workout.durationSeconds || (res.workout.durationMinutes ? res.workout.durationMinutes * 60 : 0),
              segments: [],
              aggregates: {},
              provenance: res.workout.provenance || { file: file.name, dataset: 'activities' }
            }],
            workouts: [{
              id: res.workout.id || generateDeterministicId(res.workout.startTime, res.workout.title),
              title: res.workout.title || 'Workout Session',
              activityType: res.workout.activityType || 'Workout',
              startTime: res.workout.startTime,
              endTime: res.workout.endTime || res.workout.startTime,
              durationSeconds: res.workout.durationSeconds || (res.workout.durationMinutes ? res.workout.durationMinutes * 60 : 0),
              distanceMeters: res.workout.distanceMeters || (res.workout.distanceKm ? Math.round(res.workout.distanceKm * 1000) : 0),
              calories: res.workout.calories,
              laps: (res.workout.laps || []).map(lap => ({
                startTime: lap.startTime,
                durationSeconds: lap.durationSeconds,
                distanceMeters: lap.distanceMeters,
                calories: lap.calories,
                intensity: lap.intensity,
                trackpoints: lap.trackpoints || []
              })),
              trackpoints: res.workout.trackpoints || [],
              provenance: res.workout.provenance || { file: file.name, dataset: 'activities' }
            }],
            dailyIntervals: [],
            dailySummaries: [],
            metricCounts: {},
            sourceCounts: { TCX: 1 },
            dateRange: { start: res.date, end: res.date }
          };
          aggregatedDataset = mergeGoogleFitDatasets(aggregatedDataset, tcxDataset);
        }
      } catch (err) {
        console.warn(`Error parsing TCX ${file.name}:`, err);
      }
    } else if (nameLower.endsWith('.json')) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        parseFitJson(json, aggregated);
      } catch (err) {
        console.warn(`Error parsing JSON ${file.name}:`, err);
      }
    }
  }

  // Bidirectionally synchronize GoogleFitDataset and daily vitals
  const { metrics: fullyMerged } = await syncFitEcosystem({
    newDataset: aggregatedDataset,
    newMetrics: aggregated
  });

  if (onProgress) onProgress(100, 'Fit data parsing complete');
  return fullyMerged;
}

export function ensureMetricForDate(target: Record<string, FitDailyMetric>, dateKey: string | CalendarDate, dataSourceType?: FitDataSourceType) {
  const key = dateKey instanceof CalendarDate ? dateKey.toISOString() : dateKey;
  if (!target[key]) {
    target[key] = {
      date: key,
      steps: 0,
      stepsGoal: 10000,
      heartPoints: 0,
      heartPointsGoal: 40,
      heartMinutes: 0,
      moveMinutes: 0,
      caloriesActive: 0,
      caloriesTotal: 0,
      distanceKm: 0,
      workouts: [],
      dataSourceType,
      heartActivity: {
        points: 0,
        minutes: 0
      },
      heartRate: {}
    };
  } else if (dataSourceType && !target[key].dataSourceType) {
    target[key].dataSourceType = dataSourceType;
  }
}

export function mergeFitMetrics(
  target: Record<string, FitDailyMetric>,
  source: Record<string, FitDailyMetric>
) {
  Object.keys(source).forEach(dateKey => {
    if (!target[dateKey]) {
      target[dateKey] = source[dateKey];
      return;
    }
    const t = target[dateKey];
    const s = source[dateKey];

    // Steps - resolve under authority hierarchy (Never sum two representations of steps!)
    if (s.steps > 0 || s.stepsDetail) {
      t.stepsDetail = resolveMetricValue(
        t.stepsDetail,
        t.steps,
        t.stepsSource,
        s.steps,
        s.stepsDetail?.source || s.stepsSource || s.dataSourceType || 'daily_summary',
        s.stepsDetail?.sourceLabel
      );
      if (s.stepsDetail?.alternatives) {
        s.stepsDetail.alternatives.forEach(alt => {
          t.stepsDetail!.alternatives = t.stepsDetail!.alternatives || [];
          if (!t.stepsDetail!.alternatives.some(a => Math.abs(a.value - alt.value) < 0.01 && a.source === alt.source)) {
            t.stepsDetail!.alternatives.push(alt);
          }
        });
      }
      t.steps = t.stepsDetail.value;
      t.stepsSource = t.stepsDetail.source;
    }

    // Heart Points (Heart Activity)
    if (s.heartPoints && (s.heartPoints > 0 || s.heartPointsDetail)) {
      t.heartPointsDetail = resolveMetricValue(
        t.heartPointsDetail,
        t.heartPoints,
        t.heartPointsSource,
        s.heartPoints,
        s.heartPointsDetail?.source || s.heartPointsSource || s.dataSourceType || 'daily_summary',
        s.heartPointsDetail?.sourceLabel
      );
      if (s.heartPointsDetail?.alternatives) {
        s.heartPointsDetail.alternatives.forEach(alt => {
          t.heartPointsDetail!.alternatives = t.heartPointsDetail!.alternatives || [];
          if (!t.heartPointsDetail!.alternatives.some(a => Math.abs(a.value - alt.value) < 0.01 && a.source === alt.source)) {
            t.heartPointsDetail!.alternatives.push(alt);
          }
        });
      }
      t.heartPoints = t.heartPointsDetail.value;
      t.heartPointsSource = t.heartPointsDetail.source;
    }

    // Heart Minutes (Heart Activity)
    if (s.heartMinutes && (s.heartMinutes > 0 || s.heartMinutesDetail)) {
      t.heartMinutesDetail = resolveMetricValue(
        t.heartMinutesDetail,
        t.heartMinutes,
        t.heartMinutesSource,
        s.heartMinutes,
        s.heartMinutesDetail?.source || s.heartMinutesSource || s.dataSourceType || 'daily_summary',
        s.heartMinutesDetail?.sourceLabel
      );
      if (s.heartMinutesDetail?.alternatives) {
        s.heartMinutesDetail.alternatives.forEach(alt => {
          t.heartMinutesDetail!.alternatives = t.heartMinutesDetail!.alternatives || [];
          if (!t.heartMinutesDetail!.alternatives.some(a => Math.abs(a.value - alt.value) < 0.01 && a.source === alt.source)) {
            t.heartMinutesDetail!.alternatives.push(alt);
          }
        });
      }
      t.heartMinutes = t.heartMinutesDetail.value;
      t.heartMinutesSource = t.heartMinutesDetail.source;
    }

    // Move Minutes
    if (s.moveMinutes && (s.moveMinutes > 0 || s.moveMinutesDetail)) {
      t.moveMinutesDetail = resolveMetricValue(
        t.moveMinutesDetail,
        t.moveMinutes,
        t.moveMinutesSource,
        s.moveMinutes,
        s.moveMinutesDetail?.source || s.moveMinutesSource || s.dataSourceType || 'daily_summary',
        s.moveMinutesDetail?.sourceLabel
      );
      if (s.moveMinutesDetail?.alternatives) {
        s.moveMinutesDetail.alternatives.forEach(alt => {
          t.moveMinutesDetail!.alternatives = t.moveMinutesDetail!.alternatives || [];
          if (!t.moveMinutesDetail!.alternatives.some(a => Math.abs(a.value - alt.value) < 0.01 && a.source === alt.source)) {
            t.moveMinutesDetail!.alternatives.push(alt);
          }
        });
      }
      t.moveMinutes = t.moveMinutesDetail.value;
      t.moveMinutesSource = t.moveMinutesDetail.source;
    }

    // Calories Total
    if (s.caloriesTotal && (s.caloriesTotal > 0 || s.caloriesTotalDetail)) {
      t.caloriesTotalDetail = resolveMetricValue(
        t.caloriesTotalDetail,
        t.caloriesTotal,
        t.caloriesTotalSource,
        s.caloriesTotal,
        s.caloriesTotalDetail?.source || s.caloriesTotalSource || s.dataSourceType || 'daily_summary',
        s.caloriesTotalDetail?.sourceLabel
      );
      if (s.caloriesTotalDetail?.alternatives) {
        s.caloriesTotalDetail.alternatives.forEach(alt => {
          t.caloriesTotalDetail!.alternatives = t.caloriesTotalDetail!.alternatives || [];
          if (!t.caloriesTotalDetail!.alternatives.some(a => Math.abs(a.value - alt.value) < 0.01 && a.source === alt.source)) {
            t.caloriesTotalDetail!.alternatives.push(alt);
          }
        });
      }
      t.caloriesTotal = t.caloriesTotalDetail.value;
      t.caloriesTotalSource = t.caloriesTotalDetail.source;
    }

    // Distance Km
    if (s.distanceKm && (s.distanceKm > 0 || s.distanceKmDetail)) {
      t.distanceKmDetail = resolveMetricValue(
        t.distanceKmDetail,
        t.distanceKm,
        t.distanceKmSource,
        s.distanceKm,
        s.distanceKmDetail?.source || s.distanceKmSource || s.dataSourceType || 'daily_summary',
        s.distanceKmDetail?.sourceLabel
      );
      if (s.distanceKmDetail?.alternatives) {
        s.distanceKmDetail.alternatives.forEach(alt => {
          t.distanceKmDetail!.alternatives = t.distanceKmDetail!.alternatives || [];
          if (!t.distanceKmDetail!.alternatives.some(a => Math.abs(a.value - alt.value) < 0.01 && a.source === alt.source)) {
            t.distanceKmDetail!.alternatives.push(alt);
          }
        });
      }
      t.distanceKm = t.distanceKmDetail.value;
      t.distanceKmSource = t.distanceKmDetail.source;
    }

    // Resting HR (Heart Rate bpm)
    if (s.restingHeartRate) {
      t.restingHeartRateDetail = resolveMetricValue(
        t.restingHeartRateDetail,
        t.restingHeartRate,
        'raw',
        s.restingHeartRate,
        s.restingHeartRateDetail?.source || 'raw',
        s.restingHeartRateDetail?.sourceLabel
      );
      t.restingHeartRate = t.restingHeartRateDetail.value;
    }

    // Average HR (Heart Rate bpm)
    if (s.averageHeartRate) {
      t.averageHeartRateDetail = resolveMetricValue(
        t.averageHeartRateDetail,
        t.averageHeartRate,
        'raw',
        s.averageHeartRate,
        s.averageHeartRateDetail?.source || 'raw',
        s.averageHeartRateDetail?.sourceLabel
      );
      t.averageHeartRate = t.averageHeartRateDetail.value;
    }

    // Min & Max HR (Heart Rate bpm)
    if (s.minHeartRate) {
      t.minHeartRate = t.minHeartRate !== undefined ? Math.min(t.minHeartRate, s.minHeartRate) : s.minHeartRate;
    }
    if (s.maxHeartRate) {
      t.maxHeartRate = t.maxHeartRate !== undefined ? Math.max(t.maxHeartRate, s.maxHeartRate) : s.maxHeartRate;
    }
    if (s.currentHeartRate) {
      t.currentHeartRate = s.currentHeartRate;
    }

    // Maintain structured objects
    t.heartRate = {
      resting: t.restingHeartRate,
      average: t.averageHeartRate,
      min: t.minHeartRate,
      max: t.maxHeartRate
    };
    t.heartActivity = {
      points: t.heartPoints,
      minutes: t.heartMinutes
    };

    if (s.sleepHours) t.sleepHours = s.sleepHours;
    if (s.weightKg) t.weightKg = s.weightKg;

    // Workouts - deduplicate workouts by id or (title + startTime)
    if (s.workouts && s.workouts.length > 0) {
      t.workouts = t.workouts || [];
      const existingWorkoutIds = new Set(t.workouts.map(w => w.id || `${w.title}_${w.startTime}`));
      s.workouts.forEach(w => {
        const k = w.id || `${w.title}_${w.startTime}`;
        if (!existingWorkoutIds.has(k)) {
          t.workouts!.push(w);
          existingWorkoutIds.add(k);
        }
      });
    }

    // Preserve the more authoritative data source type
    if (getAuthorityRank(s.dataSourceType) < getAuthorityRank(t.dataSourceType)) {
      t.dataSourceType = s.dataSourceType;
    }
  });
}
