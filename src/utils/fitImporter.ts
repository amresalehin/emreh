import JSZip from 'jszip';
import { FitDailyMetric, FitWorkout } from '../types';
import { persistStoredFitMetrics, loadStoredFitMetrics } from './fitStorage';
import { deterministicId } from './idGenerator';
import { parseCsvLine } from './csvParser';

/**
 * Robustly normalizes any date string, timestamp, or filename into 'YYYY-MM-DD'.
 * Handles nanoseconds, microseconds, milliseconds, seconds, ISO strings, and BOM.
 */
export function normalizeDateKey(val: any, fallbackFileName?: string): string | null {
  if (!val && !fallbackFileName) return null;

  // 1. If string, clean BOM, quotes, and whitespace
  if (typeof val === 'string') {
    let clean = val.replace(/^\uFEFF/, '').replace(/^["']|["']$/g, '').trim();

    // Check for direct YYYY-MM-DD
    const isoMatch = clean.match(/\b(\d{4})[-/](\d{2})[-/](\d{2})\b/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    // Check if numeric string (timestamp)
    const asNum = Number(clean);
    if (!isNaN(asNum) && clean.length >= 8) {
      return normalizeNumericTimestamp(asNum);
    }

    // Attempt Date object parse (handles ISO 8601, RFC2822, etc.)
    const d = new Date(clean.replace(' ', 'T'));
    if (!isNaN(d.getTime()) && d.getFullYear() > 1990 && d.getFullYear() < 2100) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }

  // 2. Numeric timestamp handling
  if (typeof val === 'number') {
    return normalizeNumericTimestamp(val);
  }

  // 3. Fallback extraction from filename (e.g. 2023-08-15.csv, 2023_08_15_Walking.tcx)
  if (fallbackFileName) {
    const fnMatch = fallbackFileName.match(/\b(\d{4})[-_](\d{2})[-_](\d{2})\b/);
    if (fnMatch) {
      return `${fnMatch[1]}-${fnMatch[2]}-${fnMatch[3]}`;
    }
  }

  return null;
}

function normalizeNumericTimestamp(val: number): string | null {
  let ms = val;
  // Nanoseconds (> 1e16, e.g. 1609459200000000000)
  if (val > 1e16) {
    ms = Math.round(val / 1e6);
  }
  // Microseconds (> 1e14)
  else if (val > 1e14) {
    ms = Math.round(val / 1000);
  }
  // Seconds (< 1e11)
  else if (val < 1e11) {
    ms = val * 1000;
  }

  const d = new Date(ms);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1990 && d.getFullYear() < 2100) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return null;
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
  const header = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());

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

  // Column index lookups
  const stepsIdx = header.findIndex(h => h.includes('step'));
  const heartPointsIdx = header.findIndex(h => h.includes('heart point') || h.includes('heart min'));
  const moveMinIdx = header.findIndex(h => h.includes('move min') || h.includes('active min'));
  const calIdx = header.findIndex(h => h.includes('calorie') || h.includes('kcal') || h.includes('expended'));
  const distIdx = header.findIndex(h => h.includes('distance') || h.includes('meter'));
  const hrIdx = header.findIndex(h => h.includes('heart rate') || h.includes('bpm'));
  const workoutIdx = header.findIndex(h => h.includes('activity') || h.includes('sport') || h.includes('workout'));
  const durationIdx = header.findIndex(h => h.includes('duration') || h.includes('elapsed'));

  // If no date column and no filename date, we cannot map rows to days
  if (dateIdx === -1 && !fileDateKey) {
    // Check if column 0 looks like an ISO date or timestamp in the first data row
    const testRow = parseCsvLine(lines[1]);
    if (testRow.length > 0 && normalizeDateKey(testRow[0])) {
      dateIdx = 0;
    } else {
      return result;
    }
  }

  // Temporary heart rate accumulators per day for true mathematical average
  const hrStats: Record<string, { sum: number; count: number }> = {};

  // Detect whether this CSV is interval-based or delta-based (requires summing)
  const isDerivedOrInterval =
    (fileName && (
      fileName.includes('derived_') ||
      fileName.includes('delta') ||
      /^\d{4}[-_]\d{2}[-_]\d{2}/.test(fileName)
    )) ||
    header.some(h => h.includes('delta') || h.includes('interval'));

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const rawDateVal = dateIdx !== -1 ? row[dateIdx] : null;
    const dateKey = normalizeDateKey(rawDateVal, fileName) || fileDateKey;
    if (!dateKey) continue;

    ensureMetricForDate(result, dateKey);
    const target = result[dateKey];

    // 1. Steps
    if (stepsIdx !== -1 && row[stepsIdx]) {
      const parsedSteps = Math.round(parseFloat(row[stepsIdx]) || 0);
      if (parsedSteps > 0) {
        if (isDerivedOrInterval) {
          target.steps += parsedSteps;
        } else {
          target.steps = parsedSteps;
        }
      }
    }

    // 2. Heart Points
    if (heartPointsIdx !== -1 && row[heartPointsIdx]) {
      const parsedHp = Math.round(parseFloat(row[heartPointsIdx]) || 0);
      if (parsedHp > 0) {
        if (isDerivedOrInterval) {
          target.heartPoints += parsedHp;
        } else {
          target.heartPoints = parsedHp;
        }
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
      }
    }

    // 5. Distance (Check if meters vs km)
    if (distIdx !== -1 && row[distIdx]) {
      const rawDist = parseFloat(row[distIdx]) || 0;
      if (rawDist > 0) {
        // Google Takeout Fit CSVs typically provide distance in meters.
        // Convert to km if the header indicates meters, or if the value is unreasonably large for km (e.g., > 40 km in a day).
        let distKm = parseFloat(rawDist.toFixed(2));
        if (header[distIdx].includes('(m)') || header[distIdx].includes('meter') || rawDist > 100) {
          distKm = parseFloat((rawDist / 1000).toFixed(2));
        }

        if (isDerivedOrInterval) {
          target.distanceKm = parseFloat((target.distanceKm + distKm).toFixed(2));
        } else {
          target.distanceKm = distKm;
        }
      }
    }

    // 6. Heart Rate (Accumulate for average)
    if (hrIdx !== -1 && row[hrIdx]) {
      const hrVal = parseFloat(row[hrIdx]);
      if (hrVal > 30 && hrVal < 240) {
        if (!hrStats[dateKey]) hrStats[dateKey] = { sum: 0, count: 0 };
        hrStats[dateKey].sum += hrVal;
        hrStats[dateKey].count += 1;
      }
    }

    // 7. Workout record extraction (Activities.csv, Sessions.csv)
    if (workoutIdx !== -1 && row[workoutIdx]) {
      const activityName = row[workoutIdx].trim();
      if (activityName && activityName.toLowerCase() !== 'unknown' && activityName.toLowerCase() !== 'still') {
        const durVal = durationIdx !== -1 ? parseFloat(row[durationIdx]) || 0 : 0;
        const durMin = durVal > 1000 ? Math.round(durVal / 60000) : (durVal > 0 ? Math.round(durVal) : undefined);
        const workoutCal = calIdx !== -1 ? Math.round(parseFloat(row[calIdx]) || 0) : undefined;
        const rawWkDist = distIdx !== -1 ? parseFloat(row[distIdx]) || 0 : 0;
        let wkDistKm = parseFloat(rawWkDist.toFixed(2));
        if (header[distIdx] && (header[distIdx].includes('(m)') || header[distIdx].includes('meter')) || rawWkDist > 100) {
          wkDistKm = parseFloat((rawWkDist / 1000).toFixed(2));
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
          id: deterministicId('fit_workout', dateKey, activityName, startTimeStr),
          type: wkType,
          title: activityName,
          startTime: startTimeStr,
          durationMinutes: durMin,
          calories: workoutCal || undefined,
          distanceKm: wkDistKm || undefined,
        });
      }
    }
  }

  // Post-processing & normalization across all parsed days
  Object.keys(result).forEach(k => {
    const t = result[k];

    // Compute average heart rate
    if (hrStats[k] && hrStats[k].count > 0) {
      const avgHr = Math.round(hrStats[k].sum / hrStats[k].count);
      t.restingHeartRate = avgHr;
      t.currentHeartRate = avgHr;
    }

    // Removed synthetic fallback formulas for calories, distance, and move minutes.
    // If the data is missing from Google Fit, it should remain missing in Emreh
    // rather than being fabricated.
  });

  return result;
}

/**
 * Parses a TCX / XML workout file from Google Takeout.
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
    const dateKey = !isNaN(dateObj.getTime())
      ? dateObj.toISOString().slice(0, 10)
      : normalizeDateKey(null, fileName);

    if (!dateKey) return null;

    const timeFormatted = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : undefined;

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
      id: deterministicId('fit_workout', dateKey, workoutTitle, timeFormatted),
      type,
      title: workoutTitle,
      startTime: timeFormatted,
      durationMinutes: durationSeconds > 0 ? Math.round(durationSeconds / 60) : undefined,
      calories: calories || undefined,
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

  ensureMetricForDate(target, dateKey);
  const m = target[dateKey];

  if (obj.steps !== undefined) m.steps = Math.max(m.steps, Math.round(Number(obj.steps)));
  if (obj.heartPoints !== undefined) m.heartPoints = Math.max(m.heartPoints, Math.round(Number(obj.heartPoints)));
  if (obj.moveMinutes !== undefined) m.moveMinutes = Math.max(m.moveMinutes, Math.round(Number(obj.moveMinutes)));
  if (obj.caloriesTotal !== undefined) m.caloriesTotal = Math.max(m.caloriesTotal, Math.round(Number(obj.caloriesTotal)));
  if (obj.caloriesActive !== undefined) m.caloriesActive = Math.max(m.caloriesActive, Math.round(Number(obj.caloriesActive)));
  if (obj.distanceKm !== undefined) m.distanceKm = Math.max(m.distanceKm, parseFloat(Number(obj.distanceKm).toFixed(2)));
  if (obj.restingHeartRate !== undefined) m.restingHeartRate = Math.round(Number(obj.restingHeartRate));
  if (obj.sleepHours !== undefined) m.sleepHours = parseFloat(Number(obj.sleepHours).toFixed(1));
  if (obj.sleepScore !== undefined) m.sleepScore = Math.round(Number(obj.sleepScore));

  // Workout Session object
  if (obj.activityType || obj.activityName || obj.name) {
    const name = obj.name || obj.activityName || obj.activityType || 'Workout';
    const durMin = obj.durationMillis
      ? Math.round(Number(obj.durationMillis) / 60000)
      : (obj.durationMinutes ? Math.round(Number(obj.durationMinutes)) : undefined);

    m.workouts.push({
      id: deterministicId('fit_workout', dateKey, name, obj.startTime ? String(obj.startTime).slice(11, 16) : undefined),
      type: 'other',
      title: name,
      startTime: obj.startTime ? String(obj.startTime).slice(11, 16) : undefined,
      durationMinutes: durMin,
      calories: obj.calories ? Math.round(Number(obj.calories)) : undefined,
      distanceKm: obj.distanceMeters ? parseFloat((Number(obj.distanceMeters) / 1000).toFixed(2)) : undefined
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
export async function parseFitFiles(
  files: File[] | FileList,
  onProgress?: (percent: number, msg: string) => void
): Promise<Record<string, FitDailyMetric>> {
  const aggregated: Record<string, FitDailyMetric> = {};
  const fileArray = Array.from(files);

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    const nameLower = file.name.toLowerCase();

    if (onProgress) {
      onProgress(Math.round((i / fileArray.length) * 100), `Parsing ${file.name}...`);
    }

    if (nameLower.endsWith('.zip')) {
      try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(file);
        const entries: { path: string; file: JSZip.JSZipObject }[] = [];

        loadedZip.forEach((relPath, entry) => {
          if (!entry.dir) {
            const p = relPath.toLowerCase();
            // Match any relevant Google Fit files inside Takeout/Fit/ or root
            if (p.endsWith('.csv') || p.endsWith('.tcx') || p.endsWith('.json') || p.endsWith('.gpx')) {
              entries.push({ path: relPath, file: entry });
            }
          }
        });

        for (let j = 0; j < entries.length; j++) {
          const entry = entries[j];
          const pLower = entry.path.toLowerCase();
          const fileName = entry.path.split('/').pop() || '';

          if (onProgress && j % 10 === 0) {
            const subPercent = Math.round(((j + 1) / entries.length) * 100);
            onProgress(subPercent, `Extracting ${fileName}...`);
          }

          try {
            const text = await entry.file.async('text');
            if (pLower.endsWith('.csv')) {
              const parsed = parseFitCsvText(text, fileName);
              mergeFitMetrics(aggregated, parsed);
            } else if (pLower.endsWith('.tcx')) {
              const res = parseTcxWorkout(text, fileName);
              if (res) {
                ensureMetricForDate(aggregated, res.date);
                aggregated[res.date].workouts.push(res.workout);
              }
            } else if (pLower.endsWith('.json')) {
              try {
                const json = JSON.parse(text);
                parseFitJson(json, aggregated);
              } catch {
                // Ignore non-json files
              }
            }
          } catch (entryErr) {
            console.warn(`Could not parse entry ${entry.path}:`, entryErr);
          }
        }
      } catch (err) {
        console.error('Error unzipping Fit archive:', err);
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
          ensureMetricForDate(aggregated, res.date);
          aggregated[res.date].workouts.push(res.workout);
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

  // Merge with any pre-existing stored metrics so we don't wipe out previous history
  const stored = await loadStoredFitMetrics();
  const fullyMerged = { ...stored, ...aggregated };
  await persistStoredFitMetrics(fullyMerged);

  if (onProgress) onProgress(100, 'Fit data parsing complete');
  return aggregated;
}

export function ensureMetricForDate(target: Record<string, FitDailyMetric>, dateKey: string) {
  if (!target[dateKey]) {
    target[dateKey] = {
      date: dateKey,
      steps: 0,
      stepsGoal: 10000,
      heartPoints: 0,
      heartPointsGoal: 40,
      moveMinutes: 0,
      caloriesActive: 0,
      caloriesTotal: 0,
      distanceKm: 0,
      workouts: []
    };
  }
}

export function mergeFitMetrics(
  target: Record<string, FitDailyMetric>,
  source: Record<string, FitDailyMetric>
) {
  Object.keys(source).forEach(dateKey => {
    if (!target[dateKey]) {
      target[dateKey] = source[dateKey];
    } else {
      const t = target[dateKey];
      const s = source[dateKey];
      if (s.steps > 0) t.steps = Math.max(t.steps, s.steps);
      if (s.heartPoints > 0) t.heartPoints = Math.max(t.heartPoints, s.heartPoints);
      if (s.moveMinutes > 0) t.moveMinutes = Math.max(t.moveMinutes, s.moveMinutes);
      if (s.caloriesTotal > 0) t.caloriesTotal = Math.max(t.caloriesTotal, s.caloriesTotal);
      if (s.caloriesActive > 0) t.caloriesActive = Math.max(t.caloriesActive, s.caloriesActive);
      if (s.distanceKm > 0) t.distanceKm = Math.max(t.distanceKm, s.distanceKm);
      if (s.restingHeartRate) t.restingHeartRate = s.restingHeartRate;
      if (s.sleepHours) t.sleepHours = s.sleepHours;
      if (s.workouts && s.workouts.length > 0) {
        const existingWorkoutIds = new Set(t.workouts.map(w => w.title + w.startTime));
        s.workouts.forEach(w => {
          if (!existingWorkoutIds.has(w.title + w.startTime)) {
            t.workouts.push(w);
            existingWorkoutIds.add(w.title + w.startTime);
          }
        });
      }
    }
  });
}
