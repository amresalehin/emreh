/**
 * Calendar Date Utilities — Provides timezone-safe date-only string operations.
 *
 * Replaces the dangerous `toISOString().slice(0, 10)` pattern which produces
 * UTC calendar dates instead of local calendar dates. For a user at UTC+5:30,
 * an event at 01:00 local time on May 15th would be reported as May 14th.
 *
 * All functions in this module operate on LOCAL time by default.
 */

/**
 * Returns the local calendar date string in YYYY-MM-DD format.
 * This is the correct replacement for `new Date().toISOString().slice(0, 10)`.
 *
 * @param date - The date to format. Defaults to now.
 * @returns Local date string like '2025-05-15'
 */
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the UTC calendar date string in YYYY-MM-DD format.
 * Use only when you explicitly need UTC semantics (e.g., server-side storage).
 *
 * @param date - The date to format. Defaults to now.
 * @returns UTC date string like '2025-05-15'
 */
export function toUTCDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Parses a YYYY-MM-DD string into a Date at midnight local time.
 * This is the inverse of toLocalDateString.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date at midnight local time
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Checks if two dates fall on the same local calendar day.
 */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Returns the difference in calendar days between two dates (local time).
 * Positive if b is after a.
 */
export function daysBetween(a: Date, b: Date): number {
  const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bDay.getTime() - aDay.getTime()) / (1000 * 60 * 60 * 24));
}
