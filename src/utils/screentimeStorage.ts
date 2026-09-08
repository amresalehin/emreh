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
    console.error('Failed to load screentime data from storage:', err);
    return {};
  }
}

/**
 * Persists the entire Screentime data map into IndexedDB and dispatches an update event.
 */
export async function persistStoredScreentimeData(
  data: Record<string, ScreentimeDayData>
): Promise<void> {
  await dbSet(SCREENTIME_STORAGE_KEY, data);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('emreh_screentime_updated', {
        detail: { count: Object.keys(data).length }
      })
    );
  }
}

/**
 * Merges and saves a single day's Screentime data.
 * NOTE: This performs a full read-modify-write cycle (write amplification).
 */
export async function saveSingleScreentimeDay(dayData: ScreentimeDayData): Promise<void> {
  const current = await loadStoredScreentimeData();
  const updated = {
    ...current,
    [dayData.date]: dayData
  };
  await persistStoredScreentimeData(updated);
}
