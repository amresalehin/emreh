/**
 * Generates a deterministic, stable identifier from string/number components.
 */
export function generateDeterministicId(...parts: (string | number | undefined | null)[]): string {
  const raw = parts
    .filter(p => p !== undefined && p !== null && p !== '')
    .map(p => String(p).trim())
    .join('_');

  if (!raw) {
    return 'id_' + Math.random().toString(36).slice(2, 10);
  }

  // DJB2 / sdbm hash for deterministic string output
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) + raw.charCodeAt(i);
    hash |= 0;
  }

  const prefix = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32);
  const hashHex = (Math.abs(hash)).toString(16).padStart(8, '0');
  return `${prefix}_${hashHex}`;
}
