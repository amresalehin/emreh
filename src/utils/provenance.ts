/**
 * Data Provenance — Marks data values as measured (from source) or derived (estimated/fabricated).
 *
 * The Emreh importers historically fabricated values when data was missing:
 * - calories = duration * 7
 * - activeCalories = steps * 0.04 + heartPoints * 6
 * - distance = steps * 0.00078
 * - duration = 3 min (hardcoded per interaction)
 * - notifications = pickups * 2.8
 * - pickupsCount = 25 (hardcoded)
 *
 * These values were presented as real data, misleading the user.
 * This module provides types to explicitly mark values as estimates.
 */

/**
 * A value with explicit provenance tracking.
 * T is the underlying data type (number, string, etc.)
 */
export interface ProvenancedValue<T> {
  value: T;
  source: 'measured' | 'derived' | 'default';
  /** Human-readable explanation of how the value was derived */
  derivation?: string;
}

/**
 * Creates a measured (real data from source) provenance wrapper.
 */
export function measured<T>(value: T): ProvenancedValue<T> {
  return { value, source: 'measured' };
}

/**
 * Creates a derived (estimated/fabricated) provenance wrapper.
 */
export function derived<T>(value: T, derivation: string): ProvenancedValue<T> {
  return { value, source: 'derived', derivation };
}

/**
 * Creates a default (fallback when no data available) provenance wrapper.
 */
export function defaultValue<T>(value: T, derivation?: string): ProvenancedValue<T> {
  return { value, source: 'default', derivation: derivation || 'No data available, using default' };
}

/**
 * Checks if a provenanced value was directly measured (not derived or default).
 */
export function isMeasured<T>(pv: ProvenancedValue<T>): boolean {
  return pv.source === 'measured';
}

/**
 * Checks if a provenanced value was derived/estimated.
 */
export function isDerived<T>(pv: ProvenancedValue<T>): boolean {
  return pv.source === 'derived';
}

/**
 * Unwraps a provenanced value to get the raw value.
 */
export function unwrap<T>(pv: ProvenancedValue<T>): T {
  return pv.value;
}

/**
 * Returns a display label suffix for derived values.
 * Can be used by UI components to show "~" or "(est)" next to estimates.
 */
export function provenanceLabel(pv: ProvenancedValue<any>): string {
  if (pv.source === 'derived') return '~';
  if (pv.source === 'default') return '(default)';
  return '';
}
