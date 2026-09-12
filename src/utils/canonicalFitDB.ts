import {
  GoogleFitDataset,
  FitMeasurement,
  FitSession,
  FitWorkout,
  FitDailyInterval,
  FitDailySummary,
} from './googleFitParser';

export const DB_NAME = 'EmrehFitCanonicalDB';
export const DB_VERSION = 1;

export const FIT_STORES = {
  raw: 'fit_raw',
  derived: 'fit_derived',
  sessions: 'fit_sessions',
  activities: 'fit_activities',
  daily: 'fit_daily_aggregates',
  excluded: 'fit_excluded_points',
  meta: 'fit_meta',
} as const;

export interface FitRawRow {
  id: string;

  start_ns: number;
  end_ns: number;

  start_dt: string;
  end_dt: string;

  data_type: string;
  source_app: string | null;
  value_key: string | null;

  value_fp: number | null;
  value_int: number | null;

  originDataSourceId: string | null;

  provenance: {
    file: string;
    dataset: string;
    source?: string;
    recordIndex?: number;
  } | null;
}

export interface FitDerivedRow extends FitRawRow {}

export interface FitSessionRow {
  id: string;

  start_ms: number;
  end_ms: number;

  start_dt: string;
  end_dt: string;

  name: string | null;
  activity_type: number | null;
  activity_type_name: string | null;

  source_app: string | null;
  description: string | null;

  provenance: unknown;
}

export interface FitActivityRow {
  id: string;

  activity_id: string;
  sport: string | null;

  lap_start_dt: string | null;

  point_dt: string;
  point_ts: number;

  lat: number | null;
  lon: number | null;
  altitude_m: number | null;

  hr_bpm: number | null;

  speed_ms: number | null;
  cadence: number | null;
  power_w: number | null;

  filename: string | null;
}

export interface FitDailyAggregateRow {
  id: string;

  date: string;

  start_dt: string | null;
  end_dt: string | null;

  column_name: string;

  value_text: string | null;
  value_fp: number | null;

  source_file: string | null;
}

export interface FitExcludedPoint {
  id?: number;

  table_name: string;
  row_id: string;

  data_type?: string;
  point_dt?: string;
  value?: number;

  reason?: string;

  excluded_at: string;
}

export interface FitImportMeta {
  key: string;

  value: {
    importedAt: string;
    archiveName: string;

    filesScanned: number;
    filesRecognized: number;

    unrecognizedFiles: string[];
    parseErrors: unknown[];

    metricCounts: Record<string, number>;
    sourceCounts: Record<string, number>;

    dateRange: {
      start: string | null;
      end: string | null;
    };

    counts: {
      raw: number;
      derived: number;
      sessions: number;
      activities: number;
      daily: number;
    };
  };
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(FIT_STORES.raw)) {
        const store = db.createObjectStore(FIT_STORES.raw, {
          keyPath: 'id',
        });

        store.createIndex(
          'data_type_start_ns',
          ['data_type', 'start_ns']
        );

        store.createIndex(
          'source_app_data_type',
          ['source_app', 'data_type']
        );

        store.createIndex('start_ns', 'start_ns');
      }

      if (!db.objectStoreNames.contains(FIT_STORES.derived)) {
        const store = db.createObjectStore(FIT_STORES.derived, {
          keyPath: 'id',
        });

        store.createIndex(
          'data_type_start_ns',
          ['data_type', 'start_ns']
        );

        store.createIndex('start_ns', 'start_ns');
      }

      if (!db.objectStoreNames.contains(FIT_STORES.sessions)) {
        const store = db.createObjectStore(FIT_STORES.sessions, {
          keyPath: 'id',
        });

        store.createIndex('start_ms', 'start_ms');
        store.createIndex('activity_type_name', 'activity_type_name');
      }

      if (!db.objectStoreNames.contains(FIT_STORES.activities)) {
        const store = db.createObjectStore(FIT_STORES.activities, {
          keyPath: 'id',
        });

        store.createIndex('activity_id', 'activity_id');
        store.createIndex('point_ts', 'point_ts');
      }

      if (!db.objectStoreNames.contains(FIT_STORES.daily)) {
        const store = db.createObjectStore(FIT_STORES.daily, {
          keyPath: 'id',
        });

        store.createIndex('date', 'date');
        store.createIndex(
          'column_name_date',
          ['column_name', 'date']
        );
      }

      if (!db.objectStoreNames.contains(FIT_STORES.excluded)) {
        const store = db.createObjectStore(FIT_STORES.excluded, {
          keyPath: 'id',
          autoIncrement: true,
        });

        store.createIndex(
          'table_row',
          ['table_name', 'row_id'],
          { unique: true }
        );

        store.createIndex(
          'table_name',
          'table_name'
        );
      }

      if (!db.objectStoreNames.contains(FIT_STORES.meta)) {
        db.createObjectStore(FIT_STORES.meta, {
          keyPath: 'key',
        });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => db.close();

      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

export function txComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () =>
      reject(
        tx.error ||
        new Error('IndexedDB transaction aborted')
      );
  });
}

export function nsFromIso(value?: string): number {
  if (!value) return 0;

  const ms = Date.parse(value);

  if (!Number.isFinite(ms)) return 0;

  return ms * 1_000_000;
}

export function msFromIso(value?: string): number {
  if (!value) return 0;

  const ms = Date.parse(value);

  return Number.isFinite(ms) ? ms : 0;
}

export function hashId(prefix: string, value: string): string {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `${prefix}_${(hash >>> 0).toString(16)}`;
}

export function numericValue(value: unknown): {
  fp: number | null;
  int: number | null;
} {
  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    if (Number.isInteger(value)) {
      return {
        fp: null,
        int: value,
      };
    }

    return {
      fp: value,
      int: null,
    };
  }

  return {
    fp: null,
    int: null,
  };
}

export function measurementRows(
  measurement: FitMeasurement,
  datasetKind: 'raw' | 'derived'
): FitRawRow[] {
  const values =
    measurement.values && measurement.values.length
      ? measurement.values
      : measurement.value !== undefined
        ? [measurement.value]
        : [];

  if (!values.length) {
    values.push(NaN);
  }

  return values.map((value, index) => {
    const numeric = numericValue(value);

    return {
      id: hashId(
        datasetKind === 'raw' ? 'fitr' : 'fitd',
        [
          measurement.id,
          datasetKind,
          measurement.startTime,
          measurement.endTime || '',
          measurement.rawMetric,
          index,
        ].join('|')
      ),

      start_ns: nsFromIso(measurement.startTime),
      end_ns: nsFromIso(
        measurement.endTime || measurement.startTime
      ),

      start_dt: measurement.startTime,
      end_dt:
        measurement.endTime ||
        measurement.startTime,

      data_type: measurement.rawMetric,

      source_app:
        measurement.source ||
        null,

      value_key:
        measurement.metric ||
        null,

      value_fp: numeric.fp,
      value_int: numeric.int,

      originDataSourceId:
        measurement.originDataSourceId ||
        null,

      provenance:
        measurement.provenance
          ? {
              file: measurement.provenance.file,
              dataset: measurement.provenance.dataset,
              source: measurement.provenance.source,
              recordIndex:
                measurement.provenance.recordIndex,
            }
          : null,
    };
  });
}

export function sessionRow(
  session: FitSession
): FitSessionRow {
  return {
    id: session.id,

    start_ms: msFromIso(session.startTime),
    end_ms: msFromIso(session.endTime),

    start_dt: session.startTime,
    end_dt: session.endTime,

    name: null,

    activity_type: null,

    activity_type_name:
      session.activityType ||
      null,

    source_app:
      session.provenance?.source ||
      null,

    description: null,

    provenance: session,
  };
}

export function activityRows(
  workout: FitWorkout
): FitActivityRow[] {
  const result: FitActivityRow[] = [];

  for (let i = 0; i < workout.trackpoints.length; i++) {
    const point = workout.trackpoints[i];

    const timeMs = Date.parse(point.time);

    result.push({
      id: hashId(
        'fita',
        [
          workout.id,
          i,
          point.time,
          point.lat ?? '',
          point.lng ?? '',
        ].join('|')
      ),

      activity_id: workout.id,

      sport:
        workout.activityType ||
        null,

      lap_start_dt: null,

      point_dt: point.time,

      point_ts:
        Number.isFinite(timeMs)
          ? Math.floor(timeMs / 1000)
          : 0,

      lat: point.lat ?? null,
      lon: point.lng ?? null,

      altitude_m:
        point.altitude ?? null,

      hr_bpm:
        point.heartRate ?? null,

      speed_ms: null,
      cadence: null,
      power_w: null,

      filename:
        workout.provenance?.file ||
        null,
    });
  }

  return result;
}

export function dailyRowsFromInterval(
  interval: FitDailyInterval
): FitDailyAggregateRow[] {
  return Object.entries(
    interval.values || {}
  ).map(([key, value]) => {
    const numberValue = Number(value);

    return {
      id: hashId(
        'fitday',
        [
          interval.id,
          interval.startTime,
          key,
        ].join('|')
      ),

      date: interval.date,

      start_dt: interval.startTime,
      end_dt: interval.endTime,

      column_name: key,

      value_text:
        value === null ||
        value === undefined
          ? null
          : String(value),

      value_fp:
        Number.isFinite(numberValue)
          ? numberValue
          : null,

      source_file:
        interval.provenance?.file ||
        null,
    };
  });
}

export function dailyRowsFromSummary(
  summary: FitDailySummary
): FitDailyAggregateRow[] {
  return Object.entries(
    summary.values || {}
  ).map(([key, value]) => {
    const numberValue = Number(value);

    return {
      id: hashId(
        'fitday',
        [
          summary.date,
          'summary',
          key,
        ].join('|')
      ),

      date: summary.date,

      start_dt: null,
      end_dt: null,

      column_name: key,

      value_text:
        value === null ||
        value === undefined
          ? null
          : String(value),

      value_fp:
        Number.isFinite(numberValue)
          ? numberValue
          : null,

      source_file: 'daily_summary',
    };
  });
}

export async function clearDataStores(): Promise<void> {
  const db = await openDB();

  const names = [
    FIT_STORES.raw,
    FIT_STORES.derived,
    FIT_STORES.sessions,
    FIT_STORES.activities,
    FIT_STORES.daily,
  ];

  const tx = db.transaction(names, 'readwrite');

  for (const name of names) {
    tx.objectStore(name).clear();
  }

  await txComplete(tx);
}

export async function bulkPut<T>(
  storeName: string,
  rows: T[],
  chunkSize = 5000
): Promise<void> {
  if (!rows.length) return;

  const db = await openDB();

  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(
      offset,
      offset + chunkSize
    );

    const tx = db.transaction(
      storeName,
      'readwrite'
    );

    const store = tx.objectStore(
      storeName
    );

    for (const row of chunk) {
      store.put(row);
    }

    await txComplete(tx);
  }
}

export async function replaceCanonicalFitData(
  dataset: GoogleFitDataset
): Promise<void> {
  const rawRows: FitRawRow[] = [];
  const derivedRows: FitDerivedRow[] = [];
  const sessionRows: FitSessionRow[] = [];
  const activityRowsList: FitActivityRow[] = [];
  const dailyRows: FitDailyAggregateRow[] = [];

  for (const measurement of dataset.measurements || []) {
    const origin =
      measurement.originDataSourceId ||
      '';

    const file =
      measurement.provenance?.file ||
      '';

    const isDerived =
      origin.startsWith('derived:') ||
      /^derived_/i.test(
        file.split('/').pop() || ''
      );

    const rows = measurementRows(
      measurement,
      isDerived ? 'derived' : 'raw'
    );

    if (isDerived) {
      derivedRows.push(...rows);
    } else {
      rawRows.push(...rows);
    }
  }

  for (const session of dataset.sessions || []) {
    sessionRows.push(
      sessionRow(session)
    );
  }

  for (const workout of dataset.workouts || []) {
    activityRowsList.push(
      ...activityRows(workout)
    );
  }

  for (const interval of dataset.dailyIntervals || []) {
    dailyRows.push(
      ...dailyRowsFromInterval(interval)
    );
  }

  for (const summary of dataset.dailySummaries || []) {
    dailyRows.push(
      ...dailyRowsFromSummary(summary)
    );
  }

  await clearDataStores();

  await bulkPut(
    FIT_STORES.raw,
    rawRows
  );

  await bulkPut(
    FIT_STORES.derived,
    derivedRows
  );

  await bulkPut(
    FIT_STORES.sessions,
    sessionRows
  );

  await bulkPut(
    FIT_STORES.activities,
    activityRowsList
  );

  await bulkPut(
    FIT_STORES.daily,
    dailyRows
  );

  const db = await openDB();

  const tx = db.transaction(
    FIT_STORES.meta,
    'readwrite'
  );

  tx.objectStore(FIT_STORES.meta).put({
    key: 'current_import',

    value: {
      importedAt: dataset.importedAt,

      archiveName:
        dataset.archiveName,

      filesScanned:
        dataset.filesScanned,

      filesRecognized:
        dataset.filesRecognized,

      unrecognizedFiles:
        dataset.unrecognizedFiles,

      parseErrors:
        dataset.parseErrors,

      metricCounts:
        dataset.metricCounts,

      sourceCounts:
        dataset.sourceCounts,

      dateRange:
        dataset.dateRange,

      counts: {
        raw: rawRows.length,
        derived: derivedRows.length,
        sessions: sessionRows.length,
        activities: activityRowsList.length,
        daily: dailyRows.length,
      },
    },
  } satisfies FitImportMeta);

  await txComplete(tx);

  window.dispatchEvent(
    new CustomEvent(
      'emreh_fit_canonical_updated'
    )
  );
}

export async function getImportMeta() {
  const db = await openDB();

  return new Promise<FitImportMeta | null>(
    (resolve, reject) => {
      const tx = db.transaction(
        FIT_STORES.meta,
        'readonly'
      );

      const request =
        tx.objectStore(
          FIT_STORES.meta
        ).get('current_import');

      request.onsuccess = () => {
        resolve(
          request.result || null
        );
      };

      request.onerror = () => {
        reject(request.error);
      };
    }
  );
}

export async function getRawRows(): Promise<FitRawRow[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      FIT_STORES.raw,
      'readonly'
    );

    const request =
      tx.objectStore(
        FIT_STORES.raw
      ).getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getDerivedRows(): Promise<FitDerivedRow[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      FIT_STORES.derived,
      'readonly'
    );

    const request =
      tx.objectStore(
        FIT_STORES.derived
      ).getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getSessionRows(): Promise<FitSessionRow[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      FIT_STORES.sessions,
      'readonly'
    );

    const request =
      tx.objectStore(
        FIT_STORES.sessions
      ).getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getActivityRows(
  activityId?: string
): Promise<FitActivityRow[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      FIT_STORES.activities,
      'readonly'
    );

    const store =
      tx.objectStore(
        FIT_STORES.activities
      );

    if (!activityId) {
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };

      return;
    }

    const index =
      store.index('activity_id');

    const request =
      index.getAll(activityId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getDailyRows(date?: string): Promise<FitDailyAggregateRow[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FIT_STORES.daily, 'readonly');
    const store = tx.objectStore(FIT_STORES.daily);

    if (date) {
      const index = store.index('date');
      const request = index.getAll(date);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
      return;
    }

    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getExcludedPoints(): Promise<FitExcludedPoint[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FIT_STORES.excluded, 'readonly');
    const request = tx.objectStore(FIT_STORES.excluded).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function addExcludedPoint(point: Omit<FitExcludedPoint, 'id' | 'excluded_at'>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(FIT_STORES.excluded, 'readwrite');
  const store = tx.objectStore(FIT_STORES.excluded);

  const row: FitExcludedPoint = {
    ...point,
    excluded_at: new Date().toISOString()
  };

  store.add(row);
  await txComplete(tx);

  window.dispatchEvent(new CustomEvent('emreh_fit_canonical_updated'));
}

export async function removeExcludedPoint(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(FIT_STORES.excluded, 'readwrite');
  tx.objectStore(FIT_STORES.excluded).delete(id);
  await txComplete(tx);

  window.dispatchEvent(new CustomEvent('emreh_fit_canonical_updated'));
}
