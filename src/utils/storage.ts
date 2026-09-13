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
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      dbPromise = Promise.resolve(db);
      resolve(db);
    };

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      dbPromise = null;
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
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB read transaction aborted'));
    });

    if (val !== undefined && val !== null) {
      return val;
    }

    // Fallback & migration from localStorage. Do not remove the source value
    // until the IndexedDB write has actually committed.
    if (typeof window !== 'undefined' && window.localStorage) {
      const localVal = localStorage.getItem(key);
      if (localVal) {
        let parsed: T;
        try {
          parsed = JSON.parse(localVal) as T;
        } catch {
          parsed = localVal as unknown as T;
        }
        try {
          await dbSet(key, parsed);
          localStorage.removeItem(key);
        } catch (migrationError) {
          console.warn(`[storage] Failed to migrate key "${key}" to IndexedDB; retaining localStorage copy.`, migrationError);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[storage] dbGet error for key "${key}", using fallback:`, err);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const localVal = localStorage.getItem(key);
        if (localVal) return JSON.parse(localVal) as T;
      } catch (_) {}
    }
  }

  return defaultValue;
}

/**
 * Save an item to IndexedDB and resolve only after the transaction commits.
 */
export async function dbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB write transaction aborted'));
    });

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    }
  } catch (err) {
    console.error(`[storage] dbSet error for key "${key}":`, err);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return;
      } catch (lsErr) {
        console.warn(`[storage] localStorage fallback also failed for key "${key}":`, lsErr);
        throw lsErr instanceof Error ? lsErr : new Error('Storage write failed');
      }
    }
    throw err instanceof Error ? err : new Error('Storage write failed');
  }
}

/**
 * Atomically compare-and-set a value and its version in one IndexedDB transaction.
 * This prevents lost updates between browser tabs/contexts that use the same store.
 */
export async function dbSetVersioned<T>(
  key: string,
  value: T,
  versionKey: string,
  expectedVersion?: number
): Promise<number> {
  try {
    const db = await getDB();
    return await new Promise<number>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const versionRequest = store.get(versionKey);
      let currentVersion = 0;
      let nextVersion = 0;
      let conflict = false;

      versionRequest.onsuccess = () => {
        currentVersion = Number(versionRequest.result) || 0;
        if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
          conflict = true;
          transaction.abort();
          return;
        }

        nextVersion = currentVersion + 1;
        store.put(value, key);
        store.put(nextVersion, versionKey);
      };

      versionRequest.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve(nextVersion);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => {
        if (conflict) {
          reject(new Error(`Version conflict: expected ${expectedVersion}, current is ${currentVersion}`));
        } else {
          reject(transaction.error || new Error('IndexedDB versioned write transaction aborted'));
        }
      };
    });
  } catch (err) {
    // Keep non-IDB environments usable. This fallback cannot provide true
    // cross-context atomicity, but it preserves both values together as far as
    // localStorage permits.
    if (typeof window !== 'undefined' && window.localStorage) {
      const rawVersion = localStorage.getItem(versionKey);
      const currentVersion = rawVersion ? Number(rawVersion) || 0 : 0;
      if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
        throw new Error(`Version conflict: expected ${expectedVersion}, current is ${currentVersion}`);
      }
      const nextVersion = currentVersion + 1;
      try {
        localStorage.setItem(key, JSON.stringify(value));
        localStorage.setItem(versionKey, JSON.stringify(nextVersion));
        return nextVersion;
      } catch (fallbackError) {
        throw fallbackError instanceof Error ? fallbackError : new Error('Versioned storage write failed');
      }
    }
    throw err instanceof Error ? err : new Error('Versioned storage write failed');
  }
}

/**
 * Delete multiple keys in one IndexedDB transaction.
 */
export async function dbDeleteMany(keys: string[]): Promise<void> {
  const uniqueKeys = [...new Set(keys.filter(Boolean))];
  if (!uniqueKeys.length) return;

  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      for (const key of uniqueKeys) store.delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB delete transaction aborted'));
    });
  } finally {
    if (typeof window !== 'undefined' && window.localStorage) {
      for (const key of uniqueKeys) {
        try { localStorage.removeItem(key); } catch (_) {}
      }
    }
  }
}

/**
 * Delete an item from IndexedDB and localStorage.
 */
export async function dbDelete(key: string): Promise<void> {
  await dbDeleteMany([key]);
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
      store.clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB clear transaction aborted'));
    });
  } catch (err) {
    console.warn('[storage] dbClear error:', err);
    throw err instanceof Error ? err : new Error('Storage clear failed');
  }
}
