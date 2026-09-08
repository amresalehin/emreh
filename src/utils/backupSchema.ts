/**
 * Backup Schema — Defines the canonical backup archive format, store registry,
 * validation, and migration for Emreh backup/restore operations.
 *
 * The STORE_REGISTRY is the single source of truth for which persistent stores
 * exist in the application. All backup, restore, and clear operations should
 * iterate this registry rather than maintaining separate hardcoded lists.
 */

import { dbGet, dbSet, dbDelete } from './storage';
import { FIT_STORAGE_KEY, loadStoredFitMetrics } from './fitStorage';
import { SCREENTIME_STORAGE_KEY, loadStoredScreentimeData } from './screentimeStorage';
import { NOTES_STORAGE_KEY, loadStoredNotes } from './notesStorage';
import type { TimelineItem, CalendarEvent, ImportedFileRecord, UserSettings } from '../types';
import type { NoteObject } from '../types/notes';
import type { FitDailyMetric, ScreentimeDayData } from '../types';

export const BACKUP_VERSION = '3.0';

/**
 * All data included in a v3.0 full backup archive.
 */
export interface BackupArchive {
  app: string;
  version: string;
  exportDate: string;
  // Core stores (present since v2.5)
  timelineData: TimelineItem[];
  calendarEvents: CalendarEvent[];
  dailyNotesMap: Record<string, string>;
  importedFiles: ImportedFileRecord[];
  bookmarkNotes: Record<string, string>;
  bookmarkTags: Record<string, string[]>;
  sessionSnapshots: Record<string, any>;
  settings: UserSettings;
  // New in v3.0 — previously missing from backup
  googleFitData: any | null;
  fitMetrics: Record<string, FitDailyMetric> | null;
  screentimeData: Record<string, ScreentimeDayData> | null;
  powerNotes: NoteObject[] | null;
  // View-specific notes/tags from localStorage
  viewNotes: Record<string, string> | null;
  viewTags: Record<string, string[]> | null;
}

/**
 * Registry entry for a persistent store.
 */
export interface StoreRegistryEntry {
  key: string;
  description: string;
  backupIncluded: boolean;
}

/**
 * All known persistent storage keys in the application.
 * This is the authoritative list used by backup, restore, and clear operations.
 */
export const STORE_REGISTRY: StoreRegistryEntry[] = [
  { key: 'mylife_timeline_items', description: 'Unified timeline items', backupIncluded: true },
  { key: 'mylife_calendar_events', description: 'Calendar events', backupIncluded: true },
  { key: 'mylife_daily_notes', description: 'Legacy daily journal notes', backupIncluded: true },
  { key: 'mylife_imported_files', description: 'Import history metadata', backupIncluded: true },
  { key: 'mylife_bookmark_notes', description: 'Bookmark annotations', backupIncluded: true },
  { key: 'mylife_bookmark_tags', description: 'Bookmark tags', backupIncluded: true },
  { key: 'mylife_session_snapshots', description: 'Session snapshots', backupIncluded: true },
  { key: 'mylife_google_fit', description: 'Raw Google Fit dataset', backupIncluded: true },
  { key: FIT_STORAGE_KEY, description: 'Google Fit daily metrics', backupIncluded: true },
  { key: SCREENTIME_STORAGE_KEY, description: 'Screentime daily data', backupIncluded: true },
  { key: NOTES_STORAGE_KEY, description: 'Rich block-based notes', backupIncluded: true },
];

/**
 * localStorage keys used by views for notes/tags (not in IndexedDB).
 */
export const VIEW_LOCALSTORAGE_KEYS = {
  notes: ['mylife_spotify_notes', 'mylife_yt_notes', 'maps_place_notes'],
  tags: ['mylife_spotify_tags', 'mylife_yt_tags', 'maps_place_tags'],
};

/**
 * Collect view-specific notes from localStorage.
 */
export function collectViewNotes(): Record<string, string> {
  const result: Record<string, string> = {};
  if (typeof window === 'undefined' || !window.localStorage) return result;
  for (const key of VIEW_LOCALSTORAGE_KEYS.notes) {
    const val = localStorage.getItem(key);
    if (val) result[key] = val;
  }
  return result;
}

/**
 * Collect view-specific tags from localStorage.
 */
export function collectViewTags(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (typeof window === 'undefined' || !window.localStorage) return result;
  for (const key of VIEW_LOCALSTORAGE_KEYS.tags) {
    const val = localStorage.getItem(key);
    if (val) {
      try { result[key] = JSON.parse(val); } catch { /* skip */ }
    }
  }
  return result;
}

/**
 * Restore view-specific notes/tags to localStorage.
 */
export function restoreViewData(
  viewNotes: Record<string, string> | null,
  viewTags: Record<string, string[]> | null
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (viewNotes) {
    for (const [key, val] of Object.entries(viewNotes)) {
      localStorage.setItem(key, val);
    }
  }
  if (viewTags) {
    for (const [key, val] of Object.entries(viewTags)) {
      localStorage.setItem(key, JSON.stringify(val));
    }
  }
}

/**
 * Validates and optionally migrates an imported backup to the v3.0 schema.
 * Returns null if the data is not a valid Emreh backup.
 */
export function validateAndMigrateBackup(data: any): BackupArchive | null {
  if (!data || typeof data !== 'object') return null;

  // Must have at least timelineData to be recognized as an Emreh backup
  if (!data.timelineData && !data.calendarEvents && !data.settings) {
    return null;
  }

  // Migrate v2.5 → v3.0: fill in missing stores with null
  return {
    app: data.app || 'Emreh Takeout Dashboard',
    version: data.version || '2.5',
    exportDate: data.exportDate || new Date().toISOString(),
    // Core stores (always expected)
    timelineData: Array.isArray(data.timelineData) ? data.timelineData : [],
    calendarEvents: Array.isArray(data.calendarEvents) ? data.calendarEvents : [],
    dailyNotesMap: (data.dailyNotesMap && typeof data.dailyNotesMap === 'object') ? data.dailyNotesMap : {},
    importedFiles: Array.isArray(data.importedFiles) ? data.importedFiles : [],
    bookmarkNotes: (data.bookmarkNotes && typeof data.bookmarkNotes === 'object') ? data.bookmarkNotes : {},
    bookmarkTags: (data.bookmarkTags && typeof data.bookmarkTags === 'object') ? data.bookmarkTags : {},
    sessionSnapshots: (data.sessionSnapshots && typeof data.sessionSnapshots === 'object') ? data.sessionSnapshots : {},
    settings: (data.settings && typeof data.settings === 'object') ? data.settings : {} as UserSettings,
    // New in v3.0 — null if migrating from v2.5
    googleFitData: data.googleFitData ?? null,
    fitMetrics: data.fitMetrics ?? null,
    screentimeData: data.screentimeData ?? null,
    powerNotes: data.powerNotes ?? null,
    viewNotes: data.viewNotes ?? null,
    viewTags: data.viewTags ?? null,
  };
}
