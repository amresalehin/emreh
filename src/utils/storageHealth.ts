/**
 * Storage Health Probe — Tests IndexedDB read/write/delete at startup.
 * If IndexedDB is unavailable (private browsing, quota exhausted, browser restriction),
 * this surfaces the issue immediately rather than letting it cause silent data loss.
 */

import { dbGet, dbSet, dbDelete } from './storage';

const HEALTH_KEY = '__emreh_storage_health_probe__';

export interface StorageHealthResult {
  indexedDBAvailable: boolean;
  readWriteWorking: boolean;
  error?: string;
  timestamp: string;
}

/**
 * Runs a quick write → read → delete cycle to verify IndexedDB is functioning.
 * Returns a health report. Does NOT throw — always returns a result.
 */
export async function checkStorageHealth(): Promise<StorageHealthResult> {
  const timestamp = new Date().toISOString();
  
  try {
    // Check if IndexedDB is available at all
    if (typeof window === 'undefined' || !window.indexedDB) {
      return {
        indexedDBAvailable: false,
        readWriteWorking: false,
        error: 'IndexedDB is not available in this environment',
        timestamp
      };
    }

    // Attempt a write → read → delete cycle
    const testValue = { probe: true, ts: Date.now() };
    await dbSet(HEALTH_KEY, testValue);
    
    const readBack = await dbGet<typeof testValue | null>(HEALTH_KEY, null);
    if (!readBack || readBack.probe !== true) {
      return {
        indexedDBAvailable: true,
        readWriteWorking: false,
        error: 'Write succeeded but read-back returned unexpected value',
        timestamp
      };
    }

    await dbDelete(HEALTH_KEY);

    return {
      indexedDBAvailable: true,
      readWriteWorking: true,
      timestamp
    };
  } catch (err) {
    return {
      indexedDBAvailable: typeof window !== 'undefined' && !!window.indexedDB,
      readWriteWorking: false,
      error: err instanceof Error ? err.message : String(err),
      timestamp
    };
  }
}
