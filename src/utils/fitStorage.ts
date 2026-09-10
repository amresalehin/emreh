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
    console.warn('Failed to load fit metrics from storage:', err);
  }
  return {};
}

/**
 * Persists the entire Google Fit metrics map and notifies the application.
 */
export async function persistStoredFitMetrics(metrics: Record<string, FitDailyMetric>): Promise<void> {
  try {
    await dbSet(FIT_STORAGE_KEY, metrics);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('emreh_fit_updated', { detail: { count: Object.keys(metrics).length } }));
    }
  } catch (err) {
    console.warn('Failed to persist fit metrics to storage:', err);
  }
}

/**
 * Merges and saves a single day's Fit metric.
 */
export async function saveSingleFitMetric(metric: FitDailyMetric): Promise<void> {
  try {
    const current = await loadStoredFitMetrics();
    const updated = {
      ...current,
      [metric.date]: {
        ...(current[metric.date] || {}),
        ...metric
      }
    };
    await persistStoredFitMetrics(updated);
  } catch (err) {
    console.warn('Failed to save single fit metric:', err);
  }
}
