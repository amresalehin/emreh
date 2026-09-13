import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoogleMapsUrl,
  extractCoordsFromMapUrls,
  formatDuration,
  getDateKey,
  isGenericPlaceName,
  normalizeTimestamp,
  parseLatLng,
  decodePolyline,
} from '../src/utils/dataParser';

void test('formats durations across seconds, minutes and hours', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(5_000), '5s');
  assert.equal(formatDuration(65_000), '1m 5s');
  assert.equal(formatDuration(3_665_000), '1h 1m');
});

void test('normalizes timestamps from common numeric and string forms', () => {
  const iso = '2025-01-01T12:00:00.000Z';
  const ms = Date.parse(iso);
  assert.equal(normalizeTimestamp(ms), iso);
  assert.equal(normalizeTimestamp(String(Math.floor(ms / 1000))), iso);
  assert.equal(normalizeTimestamp('2025-01-01 12:00:00'), iso);
  assert.equal(normalizeTimestamp('not-a-date'), null);
});

void test('parses coordinates in common Google/GeoJSON representations', () => {
  assert.deepEqual(parseLatLng('geo:22.5726,88.3639'), { lat: 22.5726, lng: 88.3639 });
  assert.deepEqual(parseLatLng({ latitudeE7: 225726000, longitudeE7: 883639000 }), { lat: 22.5726, lng: 88.3639 });
  assert.deepEqual(parseLatLng({ coordinates: [88.3639, 22.5726] }), { lat: 22.5726, lng: 88.3639 });
  assert.deepEqual(parseLatLng([88.3639, 22.5726]), { lat: 22.5726, lng: 88.3639 });
  assert.equal(parseLatLng({ lat: Number.NaN, lng: Number.POSITIVE_INFINITY }), null);
});

void test('extracts map coordinates from search and route URLs', () => {
  assert.deepEqual(
    extractCoordsFromMapUrls('https://maps.google.com/maps?q=22.5726,88.3639&output=embed'),
    { lat: 22.5726, lng: 88.3639 }
  );
  assert.deepEqual(
    extractCoordsFromMapUrls(undefined, 'https://www.google.com/maps/dir/?api=1&origin=22.57,88.36&destination=23.02,72.57'),
    { origin: { lat: 22.57, lng: 88.36 }, destination: { lat: 23.02, lng: 72.57 } }
  );
});

void test('builds safe maps URLs for coordinates and addresses', () => {
  assert.equal(
    buildGoogleMapsUrl({ id: '1', type: 'maps', ts: '2025-01-01T00:00:00Z', dateObj: new Date(0), title: 'Place', subtitle: '', lat: 22.5, lng: 88.3 }),
    'https://www.google.com/maps/search/?api=1&query=22.5,88.3'
  );
  assert.equal(
    buildGoogleMapsUrl({ id: '2', type: 'maps', ts: '2025-01-01T00:00:00Z', dateObj: new Date(0), title: 'A & B', subtitle: '', address: 'A & B' }),
    'https://www.google.com/maps/search/?api=1&query=A%20%26%20B'
  );
});

void test('recognizes generic place labels and rejects meaningful names', () => {
  assert.equal(isGenericPlaceName('Unknown location'), true);
  assert.equal(isGenericPlaceName('22.5726, 88.3639'), true);
  assert.equal(isGenericPlaceName('Victoria Memorial'), false);
});

void test('creates local date keys and decodes a known polyline', () => {
  assert.equal(getDateKey(new Date(2025, 0, 3, 0, 0, 0)), '2025-01-03');
  const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
  assert.equal(points.length, 3);
  assert.ok(Math.abs(points[0].lat - 38.5) < 1e-5);
  assert.ok(Math.abs(points[0].lng + 120.2) < 1e-5);
});
