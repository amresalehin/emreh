/**
 * Robust IndexedDB storage utility for large datasets (Timeline, History, Notes, Files).
 * Overcomes the 5MB browser localStorage quota limitation with virtually unlimited capacity.
 */
import {
  StorageWriteError,
  StorageDeleteError,
  StorageQuotaError,
  StorageUnavailableError
} from './storageErrors';

export type StorageWriteResult = { backend: 'indexeddb' | 'localstorage' | 'none' };

const DB_NAME = 'MyLifeTimelineDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      dbPromise = null;
      reject(new StorageUnavailableError('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      console.error('IndexedDB open error:', request.error);
      reject(new StorageUnavailableError('IndexedDB open error: ' + (request.error?.message || 'Unknown error')));
    };
  });

  return dbPromise;
}

/**
 * Get an item from IndexedDB, automatically migrating from localStorage if found there.
 */
export async function dbGet<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await getDB();
    const val = await new Promise<T | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (val !== undefined && val !== null) {
      return val;
    }

    // Fallback & migration from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const localVal = localStorage.getItem(key);
      if (localVal) {
        try {
          const parsed = JSON.parse(localVal);
          // Migrate to IndexedDB in the background and clean localStorage ONLY on success
          dbSet(key, parsed)
            .then(() => {
              try {
                localStorage.removeItem(key);
              } catch (_) {}
            })
            .catch(err => console.warn('Migration failed, localStorage copy preserved:', key, err));
          
          return parsed;
        } catch {
          // If string value
          return localVal as unknown as T;
        }
      }
    }
  } catch (err) {
    console.warn(`[storage] dbGet error for key "${key}", using fallback:`, err);
    // Fallback to localStorage if IndexedDB failed
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const localVal = localStorage.getItem(key);
        if (localVal) return JSON.parse(localVal);
      } catch (_) {}
    }
  }

  return defaultValue;
}

/**
 * Save an item to IndexedDB with virtually unlimited storage.
 */
export async function dbSet<T>(key: string, value: T): Promise<StorageWriteResult> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
      
      store.put(value, key);
    });

    // Also remove from localStorage if it existed there to prevent quota issues
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    }
    
    return { backend: 'indexeddb' };
  } catch (err: any) {
    console.error(`[storage] dbSet error for key "${key}":`, err);
    // Safe fallback attempt for small metadata
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const strVal = JSON.stringify(value);
        if (strVal.length < 1048576) {
          localStorage.setItem(key, strVal);
          return { backend: 'localstorage' };
        }
      } catch (lsErr) {
        console.warn(`[storage] localStorage fallback also failed for key "${key}":`, lsErr);
      }
    }
    
    // Always re-throw/propagate the error
    if (err?.name === 'QuotaExceededError') {
      throw new StorageQuotaError(key, err);
    }
    throw new StorageWriteError(key, err);
  }
}

/**
 * Save multiple items to IndexedDB in a single atomic transaction.
 */
export async function dbSetMulti(entries: Record<string, any>): Promise<void> {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

    for (const [key, value] of Object.entries(entries)) {
      store.put(value, key);
    }
  });

  if (typeof window !== 'undefined' && window.localStorage) {
    for (const key of Object.keys(entries)) {
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    }
  }
}

/**
 * Delete multiple items from IndexedDB in a single atomic transaction.
 */
export async function dbDeleteMulti(keys: string[]): Promise<void> {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

    for (const key of keys) {
      store.delete(key);
    }
  });

  if (typeof window !== 'undefined' && window.localStorage) {
    for (const key of keys) {
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    }
  }
}

/**
 * Delete an item from IndexedDB and localStorage.
 */
export async function dbDelete(key: string): Promise<void> {
  let idbError: any = null;
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
      
      store.delete(key);
    });
  } catch (err) {
    console.warn(`[storage] dbDelete error for key "${key}":`, err);
    idbError = err;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }
  
  if (idbError) {
    throw new StorageDeleteError(key, idbError);
  }
}

/**
 * Clear all records from the storage database.
 */
export async function dbClear(): Promise<void> {
  let idbError: any = null;
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
      
      store.clear();
    });
  } catch (err) {
    console.warn('[storage] dbClear error:', err);
    idbError = err;
  }
  
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('mylife_') || 
          key.startsWith('emreh_') || 
          key.startsWith('maps_place_') || 
          key.startsWith('geo_') ||
          key.startsWith('raindrop_') ||
          key.startsWith('pinterest_') ||
          key.startsWith('notes_') ||
          key.startsWith('google_fit_') ||
          key.startsWith('spotify_') ||
          key.startsWith('timeline_') ||
          key.startsWith('global_')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('[storage] dbClear localStorage cleanup error:', e);
    }
  }
  
  if (idbError) {
    throw new StorageDeleteError('__all__', idbError);
  }
}

/**
 * Retrieve all items from IndexedDB that have a key starting with the given prefix.
 */
export async function dbGetAllByPrefix<T>(prefix: string): Promise<Record<string, T>> {
  try {
    const db = await getDB();
    return await new Promise<Record<string, T>>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
      const request = store.openCursor(range);
      
      const results: Record<string, T> = {};
      
      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          results[cursor.key] = cursor.value;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[storage] dbGetAllByPrefix error for prefix "${prefix}":`, err);
    return {};
  }
}

/**
 * Delete all items from IndexedDB that have a key starting with the given prefix.
 */
export async function dbDeleteAllByPrefix(prefix: string): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
      const request = store.openCursor(range);
      
      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch (err) {
    console.error(`[storage] dbDeleteAllByPrefix error for prefix "${prefix}":`, err);
  }
}
