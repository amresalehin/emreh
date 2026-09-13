import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeGoogleFitDatasets } from '../src/utils/fitSync';
import type { GoogleFitDataset, FitWorkout, FitSession, FitMeasurement } from '../src/utils/googleFitParser';

const provenance = { file: 'fixture.json', dataset: 'activities' as const };

function dataset(overrides: Partial<GoogleFitDataset> = {}): GoogleFitDataset {
  return {
    importedAt: '2025-01-01T00:00:00.000Z',
    archiveName: 'fixture',
    filesScanned: 1,
    filesRecognized: 1,
    unrecognizedFiles: [],
    parseErrors: [],
    measurements: [],
    sessions: [],
    workouts: [],
    dailyIntervals: [],
    dailySummaries: [],
    metricCounts: {},
    sourceCounts: {},
    dateRange: { start: null, end: null },
    ...overrides,
  };
}

void test('merges duplicate workouts while preserving existing trackpoints and incoming metadata', () => {
  const baseWorkout = {
    id: 'w1', title: 'Run', activityType: 'running', startTime: '2025-01-01T10:00:00Z',
    laps: [{ trackpoints: [{ time: '2025-01-01T10:00:00Z', lat: 1, lng: 2 }] }],
    trackpoints: [{ time: '2025-01-01T10:00:00Z', lat: 1, lng: 2 }], provenance,
  } as FitWorkout;
  const incomingWorkout = {
    ...baseWorkout, title: 'Morning Run', distanceMeters: 5000, laps: [], trackpoints: [],
  } as FitWorkout;

  const merged = mergeGoogleFitDatasets(dataset({ workouts: [baseWorkout] }), dataset({ workouts: [incomingWorkout] }));
  assert.equal(merged.workouts.length, 1);
  assert.equal(merged.workouts[0].title, 'Morning Run');
  assert.equal(merged.workouts[0].distanceMeters, 5000);
  assert.equal(merged.workouts[0].trackpoints.length, 1);
  assert.equal(merged.workouts[0].laps.length, 1);
});

void test('merges duplicate sessions and nested aggregates/segments', () => {
  const baseSession = {
    id: 's1', activityType: 'running', startTime: '2025-01-01T10:00:00Z', endTime: '2025-01-01T11:00:00Z',
    durationSeconds: 3600, segments: [{ activityType: 'running', startTime: 'a', endTime: 'b' }], aggregates: { steps: 100 }, provenance,
  } as FitSession;
  const incomingSession = { ...baseSession, segments: [], aggregates: { calories: 250 } } as FitSession;

  const merged = mergeGoogleFitDatasets(dataset({ sessions: [baseSession] }), dataset({ sessions: [incomingSession] }));
  assert.equal(merged.sessions.length, 1);
  assert.deepEqual(merged.sessions[0].aggregates, { steps: 100, calories: 250 });
  assert.equal(merged.sessions[0].segments.length, 1);
});

void test('deduplicates measurements by timestamp and metric identity', () => {
  const measurement = {
    id: 'm1', metric: 'steps', rawMetric: 'com.google.step_count.delta', value: 10, startTime: '2025-01-01T10:00:00Z', provenance: { file: 'a', dataset: 'all_data' },
  } as FitMeasurement;
  const replacement = { ...measurement, id: 'm2', value: 12 } as FitMeasurement;
  const merged = mergeGoogleFitDatasets(dataset({ measurements: [measurement] }), dataset({ measurements: [replacement] }));
  assert.equal(merged.measurements.length, 1);
  assert.equal(merged.measurements[0].value, 12);
});

void test('recomputes date range from both dataset boundaries', () => {
  const merged = mergeGoogleFitDatasets(
    dataset({ dateRange: { start: '2025-02-01', end: '2025-02-10' } }),
    dataset({ dateRange: { start: '2025-01-15', end: '2025-03-01' } })
  );
  assert.deepEqual(merged.dateRange, { start: '2025-01-15', end: '2025-03-01' });
});
