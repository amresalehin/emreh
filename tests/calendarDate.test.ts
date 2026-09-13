import test from 'node:test';
import assert from 'node:assert/strict';
import { CalendarDate, parseCalendarDate, parseCalendarInstant, validateCoordinates } from '../src/utils/calendarDate';

void test('parses calendar dates without timezone drift', () => {
  assert.equal(parseCalendarDate('2025-03-09T23:30:00Z')?.toISOString(), '2025-03-09');
  assert.equal(parseCalendarDate('2025/03/09')?.toISOString(), '2025-03-09');
  assert.equal(parseCalendarDate('not-a-date'), null);
});

void test('handles second, millisecond, microsecond and nanosecond timestamps', () => {
  const expected = '2025-01-01';
  const ms = Date.parse('2025-01-01T12:00:00Z');
  assert.equal(parseCalendarDate(ms / 1000)?.toISOString(), expected);
  assert.equal(parseCalendarDate(ms)?.toISOString(), expected);
  assert.equal(parseCalendarDate(ms * 1000)?.toISOString(), expected);
  assert.equal(parseCalendarDate(ms * 1_000_000)?.toISOString(), expected);
});

void test('uses a filename date only when the value itself is absent', () => {
  assert.equal(parseCalendarDate(null, '2024-12-31.csv')?.toISOString(), '2024-12-31');
  assert.equal(parseCalendarDate(new CalendarDate(2024, 1, 2), '2024-12-31.csv')?.toISOString(), '2024-01-02');
});

void test('returns null for invalid instants and coordinates', () => {
  assert.equal(parseCalendarInstant('not-a-date'), null);
  assert.equal(validateCoordinates(91, 0), null);
  assert.equal(validateCoordinates(0, 181), null);
  assert.deepEqual(validateCoordinates('22.5726', '88.3639'), { lat: 22.5726, lng: 88.3639 });
});
