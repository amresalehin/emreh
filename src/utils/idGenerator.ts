/**
 * Deterministic ID Generation — Content-hash-based IDs for import deduplication.
 * 
 * IDs are derived from the content of the item (type + timestamp + key fields),
 * not from the current time or Math.random(). This means re-importing the same
 * data always generates the same IDs, enabling true deduplication.
 */

/**
 * Generates a deterministic ID by hashing the input content string.
 * Uses a fast 53-bit hash (cyrb53) suitable for string-based deduplication.
 * NOT cryptographic — only for uniqueness within a local dataset.
 */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Creates a deterministic ID for a timeline item based on its content.
 * @param prefix - Type prefix (e.g., 'keep', 'fit', 'screen')
 * @param parts - Content parts to hash (e.g., timestamp, title, source)
 * @returns A stable, unique ID string like 'keep_a1b2c3d4e5f6'
 */
export function deterministicId(prefix: string, ...parts: (string | number | undefined | null)[]): string {
  const content = parts
    .filter(p => p !== undefined && p !== null)
    .map(String)
    .join('|');
  const hash = cyrb53(content);
  return `${prefix}_${hash.toString(36)}`;
}

/**
 * Creates a deterministic ID for a Keep note based on its content.
 */
export function keepNoteId(title: string, createdTs: string): string {
  return deterministicId('keep', title, createdTs);
}

/**
 * Creates a deterministic ID for a Google Fit workout.
 */
export function fitWorkoutId(activityType: string, startTs: string, endTs: string): string {
  return deterministicId('fit_workout', activityType, startTs, endTs);
}

/**
 * Creates a deterministic ID for a Google Fit daily summary.
 */
export function fitDailySummaryId(date: string): string {
  return deterministicId('fit_daily', date);
}

/**
 * Creates a deterministic ID for a Google Fit metric.
 */
export function fitMetricId(metricType: string, startTs: string): string {
  return deterministicId('fit_metric', metricType, startTs);
}
