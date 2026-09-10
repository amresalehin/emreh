import { ScreentimeDayData } from '../types';
import { dbGet, dbSet } from './storage';

export const SCREENTIME_STORAGE_KEY = 'emreh_screentime_data_v1';

/**
 * Loads all stored Screentime daily data from IndexedDB.
 */
export async function loadStoredScreentimeData(): Promise<Record<string, ScreentimeDayData>> {
  try {
    const saved = await dbGet<Record<string, ScreentimeDayData>>(SCREENTIME_STORAGE_KEY, {});
    return saved || {};
  } catch (err) {
    console.warn('Failed to load screentime data from storage:', err);
    return {};
  }
}

/**
 * Persists the entire Screentime data map into IndexedDB and dispatches an update event.
 */
export async function persistStoredScreentimeData(
  data: Record<string, ScreentimeDayData>
): Promise<void> {
  try {
    await dbSet(SCREENTIME_STORAGE_KEY, data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('emreh_screentime_updated', {
          detail: { count: Object.keys(data).length }
        })
      );
    }
  } catch (err) {
    console.warn('Failed to persist screentime data to storage:', err);
  }
}

/**
 * Merges and saves a single day's Screentime data.
 */
export async function saveSingleScreentimeDay(dayData: ScreentimeDayData): Promise<void> {
  try {
    const current = await loadStoredScreentimeData();
    const updated = {
      ...current,
      [dayData.date]: dayData
    };
    await persistStoredScreentimeData(updated);
  } catch (err) {
    console.warn('Failed to save single screentime day:', err);
  }
}
