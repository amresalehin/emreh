/**
 * Robust IndexedDB storage utility for large datasets (Timeline, History, Notes, Files).
 * Overcomes the 5MB browser localStorage quota limitation with virtually unlimited capacity.
 */

const DB_NAME = 'MyLifeTimelineDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
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
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
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
          // Migrate to IndexedDB in the background and clean localStorage to free space
          dbSet(key, parsed).catch(err => console.warn('Failed to migrate key to IDB:', key, err));
          try {
            localStorage.removeItem(key);
          } catch (_) {}
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
export async function dbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Also remove from localStorage if it existed there to prevent quota issues
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    }
  } catch (err) {
    console.error(`[storage] dbSet error for key "${key}":`, err);
    // Safe fallback attempt for small metadata
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (lsErr) {
        console.warn(`[storage] localStorage fallback also failed for key "${key}":`, lsErr);
      }
    }
  }
}

/**
 * Delete an item from IndexedDB and localStorage.
 */
export async function dbDelete(key: string): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[storage] dbDelete error for key "${key}":`, err);
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }
}

/**
 * Clear all records from the storage database.
 */
export async function dbClear(): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[storage] dbClear error:', err);
  }
}
