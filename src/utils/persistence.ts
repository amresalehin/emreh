import { dbGet, dbSet, dbDelete } from './storage';
import { TimelineItem, FitDailyMetric, ScreentimeDayData, CalendarEvent } from '../types';
import { NoteObject } from '../types/notes';

export interface PersistenceConfig<T> {
  key: string;
  defaultValue: T;
  versionKey?: string;
}

export interface PatchOperation<T> {
  type: 'set' | 'delete' | 'merge';
  key: string;
  value?: T;
}

export interface VersionedData<T> {
  data: T;
  version: number;
  lastModified: number;
}

const VERSION_KEY_SUFFIX = '_version';

async function getVersion(key: string): Promise<number> {
  const versionKey = key + VERSION_KEY_SUFFIX;
  const version = await dbGet<number>(versionKey, 0);
  return version;
}

async function setVersion(key: string, version: number): Promise<void> {
  const versionKey = key + VERSION_KEY_SUFFIX;
  await dbSet(versionKey, version);
}

async function getVersionedData<T>(key: string, defaultValue: T): Promise<VersionedData<T>> {
  const [rawData, version] = await Promise.all([
    dbGet<T>(key, defaultValue),
    getVersion(key)
  ]);

  let data: any = rawData;
  if (Array.isArray(defaultValue)) {
    if (!Array.isArray(data)) {
      if (data && typeof data === 'object') {
        data = Object.values(data);
      } else {
        data = defaultValue;
      }
    }
  } else if (defaultValue !== null && typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      data = defaultValue;
    }
  }

  return {
    data: data as T,
    version,
    lastModified: Date.now()
  };
}

async function setVersionedData<T>(key: string, data: T, version: number): Promise<void> {
  await Promise.all([
    dbSet(key, data),
    setVersion(key, version)
  ]);
}

export class PersistenceManager<T> {
  private config: PersistenceConfig<T>;
  private pendingWrites: Map<string, { data: T; version: number }> = new Map();
  private writeQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private subscribers: Set<(data: T) => void> = new Set();

  constructor(config: PersistenceConfig<T>) {
    this.config = config;
  }

  async load(): Promise<VersionedData<T>> {
    return getVersionedData(this.config.key, this.config.defaultValue);
  }

  async save(data: T, expectedVersion?: number): Promise<VersionedData<T>> {
    let normalizedData = data;
    if (Array.isArray(this.config.defaultValue) && !Array.isArray(normalizedData)) {
      if (normalizedData && typeof normalizedData === 'object') {
        normalizedData = Object.values(normalizedData) as unknown as T;
      } else {
        normalizedData = this.config.defaultValue;
      }
    }

    const currentVersion = await getVersion(this.config.key);
    
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new Error(`Version conflict: expected ${expectedVersion}, current is ${currentVersion}`);
    }

    const newVersion = currentVersion + 1;
    await setVersionedData(this.config.key, normalizedData, newVersion);
    
    this.notifySubscribers(normalizedData);
    
    return { data: normalizedData, version: newVersion, lastModified: Date.now() };
  }

  async patch(patches: PatchOperation<unknown>[]): Promise<VersionedData<T>> {
    const current = await this.load();
    let newData: any;
    if (Array.isArray(current.data)) {
      newData = [...current.data];
    } else if (current.data && typeof current.data === 'object') {
      newData = { ...current.data };
    } else {
      newData = current.data;
    }
    
    for (const patch of patches) {
      switch (patch.type) {
        case 'set':
          if (patch.key && patch.value !== undefined) {
            (newData as Record<string, unknown>)[patch.key] = patch.value;
          }
          break;
        case 'delete':
          if (patch.key) {
            delete (newData as Record<string, unknown>)[patch.key];
          }
          break;
        case 'merge':
          if (patch.key && patch.value !== undefined) {
            const existing = (newData as Record<string, unknown>)[patch.key];
            if (existing && typeof existing === 'object' && typeof patch.value === 'object') {
              (newData as Record<string, unknown>)[patch.key] = { ...existing, ...patch.value };
            }
          }
          break;
      }
    }
    
    return this.save(newData, current.version);
  }

  subscribe(callback: (data: T) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(data: T): void {
    this.subscribers.forEach(cb => cb(data));
  }

  async delete(): Promise<void> {
    await Promise.all([
      dbDelete(this.config.key),
      dbDelete(this.config.key + VERSION_KEY_SUFFIX)
    ]);
    this.notifySubscribers(this.config.defaultValue);
  }
}

export const TIMELINE_STORAGE_KEY = 'mylife_timeline_items';
export const CALENDAR_EVENTS_KEY = 'mylife_calendar_events';
export const DAILY_NOTES_KEY = 'mylife_daily_notes';
export const BOOKMARK_NOTES_KEY = 'mylife_bookmark_notes';
export const BOOKMARK_TAGS_KEY = 'mylife_bookmark_tags';
export const SESSION_SNAPSHOTS_KEY = 'mylife_session_snapshots';
export const IMPORTED_FILES_KEY = 'mylife_imported_files';
export const GOOGLE_FIT_KEY = 'mylife_google_fit';
export const FIT_METRICS_KEY = 'emreh_fit_metrics_v1';
export const SCREENTIME_KEY = 'emreh_screentime_data_v1';
export const NOTES_KEY = 'mylife_power_notes_v1';
export const SETTINGS_KEY = 'mylife_settings';

export const timelinePersistence = new PersistenceManager<TimelineItem[]>({
  key: TIMELINE_STORAGE_KEY,
  defaultValue: []
});

export const calendarEventsPersistence = new PersistenceManager<CalendarEvent[]>({
  key: CALENDAR_EVENTS_KEY,
  defaultValue: []
});

export const dailyNotesPersistence = new PersistenceManager<Record<string, string>>({
  key: DAILY_NOTES_KEY,
  defaultValue: {}
});

export const bookmarkNotesPersistence = new PersistenceManager<Record<string, string>>({
  key: BOOKMARK_NOTES_KEY,
  defaultValue: {}
});

export const bookmarkTagsPersistence = new PersistenceManager<Record<string, string[]>>({
  key: BOOKMARK_TAGS_KEY,
  defaultValue: {}
});

export const sessionSnapshotsPersistence = new PersistenceManager<Record<string, string>>({
  key: SESSION_SNAPSHOTS_KEY,
  defaultValue: {}
});

export const importedFilesPersistence = new PersistenceManager<any[]>({
  key: IMPORTED_FILES_KEY,
  defaultValue: []
});

export const googleFitPersistence = new PersistenceManager<any>({
  key: GOOGLE_FIT_KEY,
  defaultValue: null
});

export const fitMetricsPersistence = new PersistenceManager<Record<string, FitDailyMetric>>({
  key: FIT_METRICS_KEY,
  defaultValue: {}
});

export const screentimePersistence = new PersistenceManager<Record<string, ScreentimeDayData>>({
  key: SCREENTIME_KEY,
  defaultValue: {}
});

export const notesPersistence = new PersistenceManager<NoteObject[]>({
  key: NOTES_KEY,
  defaultValue: []
});

export async function persistTimelineIncremental(
  updates: Array<{ id: string; item?: TimelineItem; delete?: boolean }>
): Promise<VersionedData<TimelineItem[]>> {
  const current = await timelinePersistence.load();
  const currentList: TimelineItem[] = Array.isArray(current.data)
    ? current.data
    : (current.data && typeof current.data === 'object' ? Object.values(current.data) : []);
  
  const map = new Map<string, TimelineItem>();
  for (const item of currentList) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  for (const u of updates) {
    if (u.delete) {
      map.delete(u.id);
    } else if (u.item) {
      map.set(u.id, u.item);
    }
  }

  const updatedList = Array.from(map.values());
  return timelinePersistence.save(updatedList);
}

export async function persistFitMetricIncremental(
  date: string,
  metric: FitDailyMetric
): Promise<VersionedData<Record<string, FitDailyMetric>>> {
  return fitMetricsPersistence.patch([{
    type: 'merge',
    key: date,
    value: metric
  }]);
}

export async function persistScreentimeDayIncremental(
  date: string,
  dayData: ScreentimeDayData
): Promise<VersionedData<Record<string, ScreentimeDayData>>> {
  return screentimePersistence.patch([{
    type: 'set',
    key: date,
    value: dayData
  }]);
}

export async function persistDailyNoteIncremental(
  date: string,
  note: string
): Promise<VersionedData<Record<string, string>>> {
  return dailyNotesPersistence.patch([{
    type: 'set',
    key: date,
    value: note
  }]);
}

export async function persistBookmarkNoteIncremental(
  url: string,
  note: string
): Promise<VersionedData<Record<string, string>>> {
  return bookmarkNotesPersistence.patch([{
    type: note ? 'set' : 'delete',
    key: url,
    value: note
  }]);
}

export async function persistBookmarkTagIncremental(
  url: string,
  tag: string,
  add: boolean
): Promise<VersionedData<Record<string, string[]>>> {
  const current = await bookmarkTagsPersistence.load();
  const existing = current.data[url] || [];
  const updated = add
    ? [...new Set([...existing, tag])]
    : existing.filter(t => t !== tag);
  
  return bookmarkTagsPersistence.patch([{
    type: updated.length > 0 ? 'set' : 'delete',
    key: url,
    value: updated
  }]);
}

export async function persistSessionSnapshotIncremental(
  url: string,
  snapshot: string
): Promise<VersionedData<Record<string, string>>> {
  return sessionSnapshotsPersistence.patch([{
    type: snapshot ? 'set' : 'delete',
    key: url,
    value: snapshot
  }]);
}

export async function persistImportedFileIncremental(
  file: any
): Promise<VersionedData<any[]>> {
  const current = await importedFilesPersistence.load();
  const currentList: any[] = Array.isArray(current.data)
    ? current.data
    : (current.data && typeof current.data === 'object' ? Object.values(current.data) : []);
  const existing = currentList.find(f => f && f.id === file.id);
  const updated = existing
    ? currentList.map(f => (f && f.id === file.id ? file : f))
    : [file, ...currentList];
  
  return importedFilesPersistence.save(updated);
}

export async function hydrateAllState(): Promise<{
  timeline: TimelineItem[];
  calendarEvents: CalendarEvent[];
  dailyNotes: Record<string, string>;
  bookmarkNotes: Record<string, string>;
  bookmarkTags: Record<string, string[]>;
  sessionSnapshots: Record<string, string>;
  importedFiles: any[];
  googleFit: any;
  fitMetrics: Record<string, FitDailyMetric>;
  screentime: Record<string, ScreentimeDayData>;
  notes: NoteObject[];
}> {
  const [
    timeline,
    calendarEvents,
    dailyNotes,
    bookmarkNotes,
    bookmarkTags,
    sessionSnapshots,
    importedFiles,
    googleFit,
    fitMetrics,
    screentime,
    notes
  ] = await Promise.all([
    timelinePersistence.load(),
    calendarEventsPersistence.load(),
    dailyNotesPersistence.load(),
    bookmarkNotesPersistence.load(),
    bookmarkTagsPersistence.load(),
    sessionSnapshotsPersistence.load(),
    importedFilesPersistence.load(),
    googleFitPersistence.load(),
    fitMetricsPersistence.load(),
    screentimePersistence.load(),
    notesPersistence.load()
  ]);

  return {
    timeline: Array.isArray(timeline.data) ? timeline.data : (timeline.data && typeof timeline.data === 'object' ? Object.values(timeline.data) : []),
    calendarEvents: Array.isArray(calendarEvents.data) ? calendarEvents.data : (calendarEvents.data && typeof calendarEvents.data === 'object' ? Object.values(calendarEvents.data) : []),
    dailyNotes: (dailyNotes.data && typeof dailyNotes.data === 'object' && !Array.isArray(dailyNotes.data)) ? dailyNotes.data : {},
    bookmarkNotes: (bookmarkNotes.data && typeof bookmarkNotes.data === 'object' && !Array.isArray(bookmarkNotes.data)) ? bookmarkNotes.data : {},
    bookmarkTags: (bookmarkTags.data && typeof bookmarkTags.data === 'object' && !Array.isArray(bookmarkTags.data)) ? bookmarkTags.data : {},
    sessionSnapshots: (sessionSnapshots.data && typeof sessionSnapshots.data === 'object' && !Array.isArray(sessionSnapshots.data)) ? sessionSnapshots.data : {},
    importedFiles: Array.isArray(importedFiles.data) ? importedFiles.data : (importedFiles.data && typeof importedFiles.data === 'object' ? Object.values(importedFiles.data) : []),
    googleFit: googleFit.data,
    fitMetrics: (fitMetrics.data && typeof fitMetrics.data === 'object' && !Array.isArray(fitMetrics.data)) ? fitMetrics.data : {},
    screentime: (screentime.data && typeof screentime.data === 'object' && !Array.isArray(screentime.data)) ? screentime.data : {},
    notes: Array.isArray(notes.data) ? notes.data : (notes.data && typeof notes.data === 'object' ? Object.values(notes.data) : [])
  };
}

export function subscribeToTimeline(cb: (data: TimelineItem[]) => void): () => void {
  return timelinePersistence.subscribe(cb);
}

export function subscribeToFitMetrics(cb: (data: Record<string, FitDailyMetric>) => void): () => void {
  return fitMetricsPersistence.subscribe(cb);
}

export function subscribeToScreentime(cb: (data: Record<string, ScreentimeDayData>) => void): () => void {
  return screentimePersistence.subscribe(cb);
}

export function subscribeToDailyNotes(cb: (data: Record<string, string>) => void): () => void {
  return dailyNotesPersistence.subscribe(cb);
}

export function subscribeToCalendarEvents(cb: (data: CalendarEvent[]) => void): () => void {
  return calendarEventsPersistence.subscribe(cb);
}

export function subscribeToNotes(cb: (data: NoteObject[]) => void): () => void {
  return notesPersistence.subscribe(cb);
}