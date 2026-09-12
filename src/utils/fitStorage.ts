import { FitDailyMetric } from '../types';
import { FIT_STORAGE_KEY } from './fitConstants';
import {
  loadCanonicalFitStore,
  persistCanonicalFitStore,
  saveCanonicalDailyMetric
} from './canonicalFitStore';

export { FIT_STORAGE_KEY };

/**
 * Loads all stored Google Fit daily metrics directly from the Canonical Fit Store.
 */
export async function loadStoredFitMetrics(): Promise<Record<string, FitDailyMetric>> {
  try {
    const store = await loadCanonicalFitStore();
    return store.daily || {};
  } catch (err) {
    console.warn('Failed to load fit metrics from canonical store:', err);
    return {};
  }
}

/**
 * Persists the entire Google Fit metrics map into the Canonical Fit Store.
 */
export async function persistStoredFitMetrics(metrics: Record<string, FitDailyMetric>): Promise<void> {
  try {
    const store = await loadCanonicalFitStore();
    store.daily = { ...store.daily, ...metrics };
    await persistCanonicalFitStore(store);
  } catch (err) {
    console.warn('Failed to persist fit metrics to canonical store:', err);
  }
}

/**
 * Merges and saves a single day's Fit metric directly into the Canonical Fit Store.
 */
export async function saveSingleFitMetric(metric: FitDailyMetric): Promise<void> {
  try {
    await saveCanonicalDailyMetric(metric);
  } catch (err) {
    console.warn('Failed to save single fit metric into canonical store:', err);
  }
}
