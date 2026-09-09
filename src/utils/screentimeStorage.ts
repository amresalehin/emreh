import { ScreentimeDayData } from '../types';
import { dbGet, dbSet, dbSetMulti, dbGetAllByPrefix, dbDeleteAllByPrefix } from './storage';

export const SCREENTIME_STORAGE_KEY_V1 = 'emreh_screentime_data_v1';
export const SCREENTIME_STORAGE_PREFIX = 'screentime_data_v2_';

let migrationPromise: Promise<void> | null = null;

async function runMigration() {
  const savedV1 = await dbGet<Record<string, ScreentimeDayData>>(SCREENTIME_STORAGE_KEY_V1, {});
  if (savedV1 && typeof savedV1 === 'object' && Object.keys(savedV1).length > 0) {
    console.log('Migrating screentime to fine-grained v2 storage...');
    await persistStoredScreentimeData(savedV1);
    await dbSet(SCREENTIME_STORAGE_KEY_V1, {});
  }
}

/**
 * Loads all stored Screentime daily data from IndexedDB.
 */
export async function loadStoredScreentimeData(): Promise<Record<string, ScreentimeDayData>> {
  try {
    if (!migrationPromise) {
      migrationPromise = runMigration();
    }
    await migrationPromise;

    const v2Data = await dbGetAllByPrefix<ScreentimeDayData>(SCREENTIME_STORAGE_PREFIX);
    const result: Record<string, ScreentimeDayData> = {};
    for (const [key, val] of Object.entries(v2Data)) {
      const dateKey = key.replace(SCREENTIME_STORAGE_PREFIX, '');
      result[dateKey] = val;
    }
    return result;
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
  await dbDeleteAllByPrefix(SCREENTIME_STORAGE_PREFIX);
  const entries: Record<string, ScreentimeDayData> = {};
  for (const [date, metric] of Object.entries(data)) {
    entries[SCREENTIME_STORAGE_PREFIX + date] = metric;
  }
  await dbSetMulti(entries);
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
 * Write amplification is resolved: we only update the specific day's record!
 */
export async function saveSingleScreentimeDay(dayData: ScreentimeDayData): Promise<void> {
  const key = SCREENTIME_STORAGE_PREFIX + dayData.date;
  const existing = await dbGet<ScreentimeDayData | null>(key, null);
  const updated = {
    ...(existing || {}),
    ...dayData
  };
  await dbSet(key, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('emreh_screentime_updated', {
        detail: { count: 1 }
      })
    );
  }
}
