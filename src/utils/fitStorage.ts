import { FitDailyMetric } from '../types';
import { dbGet, dbSet } from './storage';

export const FIT_STORAGE_KEY = 'emreh_fit_metrics_v1';

/**
 * Loads all stored Google Fit daily metrics from local IndexedDB storage.
 */
export async function loadStoredFitMetrics(): Promise<Record<string, FitDailyMetric>> {
  try {
    const saved = await dbGet<Record<string, FitDailyMetric>>(FIT_STORAGE_KEY, {});
    if (saved && typeof saved === 'object') {
      return saved;
    }
  } catch (err) {
    console.error('Failed to load fit metrics from storage:', err);
  }
  return {};
}

/**
 * Persists the entire Google Fit metrics map and notifies the application.
 */
export async function persistStoredFitMetrics(metrics: Record<string, FitDailyMetric>): Promise<void> {
  await dbSet(FIT_STORAGE_KEY, metrics);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('emreh_fit_updated', { detail: { count: Object.keys(metrics).length } }));
  }
}

/**
 * Merges and saves a single day's Fit metric.
 * NOTE: This performs a full read-modify-write cycle (write amplification).
 */
export async function saveSingleFitMetric(metric: FitDailyMetric): Promise<void> {
  const current = await loadStoredFitMetrics();
  const updated = {
    ...current,
    [metric.date]: {
      ...(current[metric.date] || {}),
      ...metric
    }
  };
  await persistStoredFitMetrics(updated);
}
