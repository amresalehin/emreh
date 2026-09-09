import { FitDailyMetric } from '../types';
import { dbGet, dbSet, dbSetMulti, dbGetAllByPrefix, dbDeleteAllByPrefix } from './storage';

export const FIT_STORAGE_KEY_V1 = 'emreh_fit_metrics_v1';
export const FIT_STORAGE_PREFIX = 'fit_metric_v2_';

let migrationPromise: Promise<void> | null = null;

async function runMigration() {
  const savedV1 = await dbGet<Record<string, FitDailyMetric>>(FIT_STORAGE_KEY_V1, {});
  if (savedV1 && typeof savedV1 === 'object' && Object.keys(savedV1).length > 0) {
    console.log('Migrating fit metrics to fine-grained v2 storage...');
    await persistStoredFitMetrics(savedV1);
    await dbSet(FIT_STORAGE_KEY_V1, {});
  }
}

/**
 * Loads all stored Google Fit daily metrics from local IndexedDB storage.
 */
export async function loadStoredFitMetrics(): Promise<Record<string, FitDailyMetric>> {
  try {
    if (!migrationPromise) {
      migrationPromise = runMigration();
    }
    await migrationPromise;

    const v2Data = await dbGetAllByPrefix<FitDailyMetric>(FIT_STORAGE_PREFIX);
    const result: Record<string, FitDailyMetric> = {};
    for (const [key, val] of Object.entries(v2Data)) {
      const dateKey = key.replace(FIT_STORAGE_PREFIX, '');
      result[dateKey] = val;
    }
    return result;
  } catch (err) {
    console.error('Failed to load fit metrics from storage:', err);
  }
  return {};
}

/**
 * Replaces the entire Google Fit metrics dataset.
 * We clear old V2 prefix keys first to ensure deleted keys don't linger.
 */
export async function persistStoredFitMetrics(metrics: Record<string, FitDailyMetric>): Promise<void> {
  await dbDeleteAllByPrefix(FIT_STORAGE_PREFIX);
  const entries: Record<string, FitDailyMetric> = {};
  for (const [date, metric] of Object.entries(metrics)) {
    entries[FIT_STORAGE_PREFIX + date] = metric;
  }
  await dbSetMulti(entries);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('emreh_fit_updated', { detail: { count: Object.keys(metrics).length } }));
  }
}

/**
 * Merges and saves a single day's Fit metric.
 * Write amplification is resolved: we only update the specific day's record!
 */
export async function saveSingleFitMetric(metric: FitDailyMetric): Promise<void> {
  const key = FIT_STORAGE_PREFIX + metric.date;
  const existing = await dbGet<FitDailyMetric | null>(key, null);
  const updated = {
    ...(existing || {}),
    ...metric
  };
  await dbSet(key, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('emreh_fit_updated', { detail: { count: 1 } }));
  }
}
