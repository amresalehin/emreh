import JSZip from 'jszip';
import { TimelineItem, ImportedFileRecord } from '../types';
import { extractDomain } from './urlMetadata';
import { parseRaindropCsv, parseRaindropJson, parseRaindropHtml } from './raindropSync';
import { parsePinterestJson, parsePinterestCsv } from './pinterestSync';

export const parseSpotifyId = (uri?: string): string | null => {
  if (!uri) return null;
  const parts = uri.split(':');
  return parts[parts.length - 1] || null;
};

export const formatTime = (dateObj: Date): string => {
  return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const formatDuration = (ms?: number): string => {
  if (!ms || ms <= 0) return '0s';
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

export const getDateKey = (date: Date): string => {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const isGenericPlaceName = (title?: string): boolean => {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  if (
    t === '' || t === 'unknown' || t === 'unknown location' || t === 'unknown place' ||
    t === 'location' || t === 'location record' || t === 'gps location' ||
    t === 'gps location record' || t === 'visited location' || t === 'recorded visit' ||
    t === 'timeline location' || t === 'timeline point' || t === 'timeline' ||
    t === 'place visit' || t === 'travel activity' || t === 'google maps location visit' ||
    t === 'google location history' || t.startsWith('location (') || t.startsWith('gps (') ||
    t.startsWith('gps location (') || t.startsWith('point (')
  ) {
    return true;
  }
  if (/^[\s\d.,\-+ NSEWnsew()/:]+$/.test(title.trim())) {
    return true;
  }
  return false;
};

export const buildGoogleMapsUrl = (item: TimelineItem): string => {
  if (!item) return '#';
  if (item.isRoute && item.origin && item.destination) {
    const modeParam = item.travelMode ? `&travelmode=${item.travelMode}` : '';
    return `https://www.google.com/maps/dir/?api=1&origin=${item.origin.lat},${item.origin.lng}&destination=${item.destination.lat},${item.destination.lng}${modeParam}`;
  }
  if (item.lat != null && item.lng != null && item.placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}&query_place_id=${encodeURIComponent(item.placeId)}`;
  }
  if (item.lat != null && item.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
  }
  if (item.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`;
  }
  return '#';
};

export const buildGoogleMapsEmbedUrl = (item: TimelineItem): string => {
  if (!item) return '';
  if (item.isRoute && item.origin && item.destination) {
    return `https://maps.google.com/maps?saddr=${item.origin.lat},${item.origin.lng}&daddr=${item.destination.lat},${item.destination.lng}&hl=en&output=embed`;
  }
  if (item.lat != null && item.lng != null) {
    return `https://maps.google.com/maps?q=${item.lat},${item.lng}&hl=en&z=16&output=embed`;
  }
  if (item.title || item.address) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(item.title || item.address || '')}&hl=en&z=16&output=embed`;
  }
  return '';
};

export function extractCoordsFromMapUrls(
  embedUrl?: string,
  externalUrl?: string
): {
  lat?: number;
  lng?: number;
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
} {
  const urls = [embedUrl, externalUrl].filter(Boolean) as string[];

  // 1. Check for route origin & destination
  for (const u of urls) {
    const originMatch = u.match(/(?:origin|saddr)=([-\d.]+),([-\d.]+)/);
    const destMatch = u.match(/(?:destination|daddr)=([-\d.]+),([-\d.]+)/);
    if (originMatch && destMatch) {
      const oLat = parseFloat(originMatch[1]);
      const oLng = parseFloat(originMatch[2]);
      const dLat = parseFloat(destMatch[1]);
      const dLng = parseFloat(destMatch[2]);
      if (Number.isFinite(oLat) && Number.isFinite(oLng) && Number.isFinite(dLat) && Number.isFinite(dLng)) {
        return {
          origin: { lat: oLat, lng: oLng },
          destination: { lat: dLat, lng: dLng }
        };
      }
    }
  }

  // 2. Check for single coordinates (query=lat,lng or q=lat,lng)
  for (const u of urls) {
    const qMatch = u.match(/[?&](?:query|q)=([-\d.]+),([-\d.]+)/);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
  }

  return {};
}

export const normalizeTimestamp = (val: any): string | null => {
  if (!val) return null;
  if (typeof val === 'number') {
    let ms = val;
    if (val > 1e14) ms = Math.floor(val / 1000);
    else if (val < 1e11) ms = val * 1000;
    const d = new Date(ms);
    return !isNaN(d.getTime()) ? d.toISOString() : null;
  }
  if (typeof val === 'string') {
    let trimmed = val.trim();
    if (/^\d{10,18}$/.test(trimmed)) {
      let num = parseInt(trimmed, 10);
      if (trimmed.length >= 15) num = Math.floor(num / 1000);
      else if (trimmed.length === 10) num = num * 1000;
      const d = new Date(num);
      return !isNaN(d.getTime()) ? d.toISOString() : null;
    }
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(trimmed)) {
      trimmed = trimmed.replace(' ', 'T');
      if (!trimmed.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(trimmed)) {
        trimmed += 'Z';
      }
    }
    if (trimmed.includes('.')) {
      trimmed = trimmed.replace(/(\.\d{3})\d+/, '$1');
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
};

export const parseLatLng = (val: any): { lat: number; lng: number } | null => {
  if (!val) return null;
  if (typeof val === 'string') {
    const clean = val.replace(/^geo:/i, '').replace(/[^0-9.,-]/g, ' ').trim();
    const parts = clean.split(/[\s,]+/).filter(Boolean);
    if (parts.length >= 2) {
      let lat = parseFloat(parts[0]);
      let lng = parseFloat(parts[1]);
      if (Math.abs(lat) > 90 && Math.abs(lat) <= 900000000) lat /= 1e7;
      if (Math.abs(lng) > 180 && Math.abs(lng) <= 1800000000) lng /= 1e7;
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }
  if (typeof val === 'object') {
    if (val.latLng) return parseLatLng(val.latLng);
    if (val.point) return parseLatLng(val.point);
    if (val.location) return parseLatLng(val.location);
    if (val.position) return parseLatLng(val.position);
    if (val.startLocation) return parseLatLng(val.startLocation);
    if (val.endLocation) return parseLatLng(val.endLocation);
    if (val.placeLocation) return parseLatLng(val.placeLocation);
    if (val.geoPoint) return parseLatLng(val.geoPoint);

    if (val.latE7 !== undefined && val.lngE7 !== undefined) {
      return { lat: Number(val.latE7) / 1e7, lng: Number(val.lngE7) / 1e7 };
    }
    if (val.latitudeE7 !== undefined && val.longitudeE7 !== undefined) {
      return { lat: Number(val.latitudeE7) / 1e7, lng: Number(val.longitudeE7) / 1e7 };
    }
    if (val.centerLatE7 !== undefined && val.centerLngE7 !== undefined) {
      return { lat: Number(val.centerLatE7) / 1e7, lng: Number(val.centerLngE7) / 1e7 };
    }
    if (val.latitude !== undefined && val.longitude !== undefined) {
      let lat = Number(val.latitude);
      let lng = Number(val.longitude);
      if (Math.abs(lat) > 90) lat /= 1e7;
      if (Math.abs(lng) > 180) lng /= 1e7;
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
    }
    if (val.lat !== undefined && (val.lng !== undefined || val.lon !== undefined)) {
      let lat = Number(val.lat);
      let lng = Number(val.lng !== undefined ? val.lng : val.lon);
      if (Math.abs(lat) > 90) lat /= 1e7;
      if (Math.abs(lng) > 180) lng /= 1e7;
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
    }
    if (Array.isArray(val)) {
      if (val.length >= 2) {
        const a = Number(val[0]);
        const b = Number(val[1]);
        if (!isNaN(a) && !isNaN(b)) {
          if (b >= -90 && b <= 90 && a >= -180 && a <= 180) {
            return { lat: b, lng: a };
          }
          if (a >= -90 && a <= 90 && b >= -180 && b <= 180) {
            return { lat: a, lng: b };
          }
        }
      }
    }
    if (val.coordinates && Array.isArray(val.coordinates) && val.coordinates.length >= 2) {
      const lng = Number(val.coordinates[0]);
      const lat = Number(val.coordinates[1]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
};

/**
 * Decodes Google Encoded Polyline strings into coordinate arrays
 */
export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  if (!encoded || typeof encoded !== 'string') return [];
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  try {
    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
  } catch (err) {
    console.warn('Error decoding polyline:', err);
  }
  return points;
}

/**
 * Extracts intermediate GPS track points from all Google Timeline / Activity segment representations
 */
export function extractIntermediatePathPoints(
  act: any,
  startCoords?: { lat: number; lng: number } | null,
  endCoords?: { lat: number; lng: number } | null
): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];

  const addPoint = (p: { lat: number; lng: number } | null) => {
    if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return;
    if (p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) return;
    if (points.length > 0) {
      const last = points[points.length - 1];
      if (Math.abs(last.lat - p.lat) < 1e-6 && Math.abs(last.lng - p.lng) < 1e-6) return;
    }
    points.push({ lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) });
  };

  if (startCoords) addPoint(startCoords);

  // 1. Check for encoded polylines (encodedPath, polyline, overview_polyline)
  const polyStr =
    act.encodedPath ||
    act.polyline ||
    act.overview_polyline?.points ||
    act.polyline?.points ||
    (typeof act.points === 'string' ? act.points : null) ||
    (typeof act.path === 'string' ? act.path : null);
  if (typeof polyStr === 'string' && polyStr.length > 5) {
    const decoded = decodePolyline(polyStr);
    decoded.forEach(addPoint);
  }

  // 2. Simplified raw GPS breadcrumb track from Google Takeout & raw GPS signals
  const rawList =
    act.simplifiedRawPath?.points ||
    act.waypointPath?.waypoints ||
    act.waypointPath?.points ||
    act.transitPath?.transitStops ||
    act.rawSignals ||
    act.rawLocations ||
    act.rawLocationHistory ||
    act.timelinePath ||
    act.points ||
    act.path ||
    act.coordinates ||
    act.snappedPoints ||
    act.snappedCoordinates ||
    act.locations ||
    (Array.isArray(act.geometry?.coordinates) ? act.geometry.coordinates : null);

  if (Array.isArray(rawList)) {
    rawList.forEach((rawPt: any) => {
      const p =
        parseLatLng(rawPt) ||
        parseLatLng(rawPt.point) ||
        parseLatLng(rawPt.latLng) ||
        parseLatLng(rawPt.position) ||
        parseLatLng(rawPt.location) ||
        parseLatLng(rawPt.geoPoint) ||
        parseLatLng(rawPt.snappedPoint);
      if (p) addPoint(p);
    });
  }

  // 3. Road segments in waypointPath / transitPath
  const roadSegments =
    act.waypointPath?.roadSegment ||
    act.transitPath?.roadSegment ||
    act.roadSegments ||
    act.transitPath?.transitPathLegs;

  if (Array.isArray(roadSegments)) {
    roadSegments.forEach((road: any) => {
      const segPoints = road.points || road.point || road.waypoints || road.path || road.transitStops;
      if (Array.isArray(segPoints)) {
        segPoints.forEach((sp: any) => {
          const p = parseLatLng(sp) || parseLatLng(sp.point) || parseLatLng(sp.location);
          if (p) addPoint(p);
        });
      }
    });
  }

  // 4. Parking event location if embedded
  if (act.parkingEvent) {
    const parkCoords = parseLatLng(act.parkingEvent.location || act.parkingEvent);
    if (parkCoords) addPoint(parkCoords);
  }

  if (endCoords) addPoint(endCoords);

  return points;
}

export const formatSemanticType = (typeStr?: string): string | null => {
  if (!typeStr) return null;
  const clean = typeStr.replace(/^TYPE_/, '').replace(/_/g, ' ').toLowerCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

export interface PlaceCategoryInfo {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

export const getPlaceCategory = (item: TimelineItem | { title?: string; subtitle?: string; address?: string; semanticType?: string }): PlaceCategoryInfo => {
  const text = `${item.title || ''} ${item.subtitle || ''} ${item.address || ''} ${(item as any).semanticType || ''}`.toLowerCase();

  if (text.includes('cafe') || text.includes('coffee') || text.includes('starbucks') || text.includes('restaurant') || text.includes('pizza') || text.includes('burger') || text.includes('bakery') || text.includes('bar') || text.includes('pub') || text.includes('bistro') || text.includes('diner') || text.includes('food') || text.includes('sushi') || text.includes('taco') || text.includes('grill')) {
    return { id: 'food', label: 'Food & Drink', icon: 'utensils', color: 'text-amber-500', bg: 'bg-amber-500/10' };
  }
  if (text.includes('market') || text.includes('grocery') || text.includes('supermarket') || text.includes('mall') || text.includes('store') || text.includes('shop') || text.includes('target') || text.includes('walmart') || text.includes('costco') || text.includes('ikea') || text.includes('apple store')) {
    return { id: 'shopping', label: 'Shopping & Retail', icon: 'shopping-bag', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  }
  if (text.includes('park') || text.includes('beach') || text.includes('garden') || text.includes('trail') || text.includes('lake') || text.includes('forest') || text.includes('mountain') || text.includes('recreation') || text.includes('canyon') || text.includes('river')) {
    return { id: 'outdoors', label: 'Parks & Nature', icon: 'tree-pine', color: 'text-green-500', bg: 'bg-green-500/10' };
  }
  if (text.includes('gym') || text.includes('fitness') || text.includes('hospital') || text.includes('clinic') || text.includes('pharmacy') || text.includes('yoga') || text.includes('spa') || text.includes('health') || text.includes('dental') || text.includes('medical')) {
    return { id: 'health', label: 'Health & Fitness', icon: 'heart', color: 'text-rose-500', bg: 'bg-rose-500/10' };
  }
  if (text.includes('airport') || text.includes('terminal') || text.includes('station') || text.includes('subway') || text.includes('bus stop') || text.includes('transit') || text.includes('ferry') || text.includes('parking') || text.includes('gas station') || text.includes('metro')) {
    return { id: 'transit', label: 'Travel & Transport', icon: 'navigation', color: 'text-blue-500', bg: 'bg-blue-500/10' };
  }
  if (text.includes('office') || text.includes('work') || text.includes('building') || text.includes('headquarters') || text.includes('coworking') || text.includes('studio') || text.includes('enterprise') || text.includes('agency') || text.includes('firm')) {
    return { id: 'work', label: 'Work & Office', icon: 'briefcase', color: 'text-indigo-500', bg: 'bg-indigo-500/10' };
  }
  if (text.includes('home') || text.includes('residence') || text.includes('apartment') || text.includes('condo') || text.includes('house')) {
    return { id: 'home', label: 'Home & Living', icon: 'home', color: 'text-violet-500', bg: 'bg-violet-500/10' };
  }
  if (text.includes('museum') || text.includes('gallery') || text.includes('theater') || text.includes('cinema') || text.includes('library') || text.includes('historic') || text.includes('monument') || text.includes('stadium') || text.includes('arena')) {
    return { id: 'culture', label: 'Arts & Culture', icon: 'sparkles', color: 'text-purple-500', bg: 'bg-purple-500/10' };
  }
  if (text.includes('hotel') || text.includes('resort') || text.includes('motel') || text.includes('inn') || text.includes('hostel') || text.includes('lodge') || text.includes('stay')) {
    return { id: 'lodging', label: 'Hotel & Lodging', icon: 'building', color: 'text-cyan-500', bg: 'bg-cyan-500/10' };
  }
  if (text.includes('school') || text.includes('university') || text.includes('college') || text.includes('campus') || text.includes('academy')) {
    return { id: 'education', label: 'Education', icon: 'book-open', color: 'text-teal-500', bg: 'bg-teal-500/10' };
  }

  return { id: 'places', label: 'Place', icon: 'map-pin', color: 'text-blue-500', bg: 'bg-blue-500/10' };
};

export const getActivityBadge = (typeStr?: string) => {
  const t = (typeStr || '').toUpperCase();
  if (t.includes('WALK') || t.includes('PEDESTRIAN')) return { name: 'Walking', icon: 'footprints', gmapMode: 'walking' };
  if (t.includes('VEHICLE') || t.includes('DRIV') || t.includes('CAR')) return { name: 'Driving / Vehicle', icon: 'car', gmapMode: 'driving' };
  if (t.includes('CYCL') || t.includes('BIKE')) return { name: 'Cycling', icon: 'bike', gmapMode: 'bicycling' };
  if (t.includes('RUN')) return { name: 'Running', icon: 'flame', gmapMode: 'walking' };
  if (t.includes('TRAIN') || t.includes('BUS')) return { name: 'Public Transit', icon: 'train', gmapMode: 'transit' };
  if (t.includes('FLY') || t.includes('FLIGHT')) return { name: 'Flight', icon: 'plane', gmapMode: 'transit' };
  return { name: typeStr ? typeStr.replace(/_/g, ' ') : 'Movement', icon: 'navigation', gmapMode: 'driving' };
};

export function processImportPayload(jsonPayload: any): TimelineItem[] {
  if (!jsonPayload) return [];
  const items: TimelineItem[] = [];

  const processTimelineObject = (obj: any): boolean => {
    if (!obj) return false;
    const pv = obj.placeVisit || obj.visit || (obj.location && (obj.duration || obj.startTime) ? obj : null);
    if (pv) {
      const loc = pv.location || pv.placeLocation || pv.topCandidate || pv;
      const startTs = normalizeTimestamp(pv.duration?.startTimestamp || pv.duration?.startTime || pv.startTime || obj.startTime || obj.duration?.startTimestamp || obj.duration?.startTime || obj.startTime || obj.timestamp || obj.time);
      const endTs = normalizeTimestamp(pv.duration?.endTimestamp || pv.duration?.endTime || pv.endTime || obj.endTime || obj.duration?.endTimestamp || obj.duration?.endTime || obj.endTime);
      if (startTs) {
        const coords = parseLatLng(loc) || parseLatLng(loc.placeLocation) || parseLatLng(loc.latLng) || parseLatLng(pv) || parseLatLng(obj);
        let placeName = loc.name || loc.topCandidate?.name || formatSemanticType(loc.semanticType || loc.topCandidate?.semanticType) || loc.address;
        if (!placeName && coords) placeName = `Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
        else if (!placeName) placeName = 'Visited Location';
        const durationMs = (startTs && endTs) ? (new Date(endTs).getTime() - new Date(startTs).getTime()) : 0;
        items.push({
          id: `maps_${startTs}_${coords?.lat || 0}_${coords?.lng || 0}`,
          type: 'maps',
          ts: startTs,
          endTs: endTs,
          dateObj: new Date(startTs),
          title: placeName,
          subtitle: loc.address || (coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : 'Google Maps Location Visit'),
          address: loc.address || '',
          placeId: loc.placeId || pv.placeId || obj.placeId || null,
          lat: coords ? coords.lat : null,
          lng: coords ? coords.lng : null,
          ms_played: durationMs > 0 ? durationMs : 0,
          platform: 'Google Maps Timeline'
        });
        return true;
      }
    }

    const act = obj.activitySegment || obj.activity || (obj.startLocation || obj.start ? obj : null);
    if (act && (act.activityType || act.startLocation || act.start || act.distance || act.distanceMeters || act.topCandidate)) {
      const startTs = normalizeTimestamp(act.duration?.startTimestamp || act.duration?.startTime || act.startTime || obj.startTime || obj.duration?.startTimestamp || obj.duration?.startTime || obj.startTime || obj.timestamp || obj.time);
      const endTs = normalizeTimestamp(act.duration?.endTimestamp || act.duration?.endTime || act.endTime || obj.endTime || obj.duration?.endTimestamp || obj.duration?.endTime || obj.endTime);
      if (startTs) {
        const actType = act.activityType || act.topCandidate?.type || act.type || 'MOVING';
        const actInfo = getActivityBadge(actType);
        const distM = act.distance || act.distanceMeters || act.topCandidate?.distanceMeters;
        const distKm = distM ? (distM / 1000).toFixed(2) : null;
        const durationMs = (startTs && endTs) ? (new Date(endTs).getTime() - new Date(startTs).getTime()) : 0;
        const startCoords = parseLatLng(act.startLocation || act.start || act.startPoint);
        const endCoords = parseLatLng(act.endLocation || act.end || act.endPoint);
        const startAddr = act.startLocation?.address || act.start?.address || (startCoords ? `Origin (${startCoords.lat.toFixed(4)}, ${startCoords.lng.toFixed(4)})` : 'Origin');
        const endAddr = act.endLocation?.address || act.end?.address || (endCoords ? `Destination (${endCoords.lat.toFixed(4)}, ${endCoords.lng.toFixed(4)})` : 'Destination');

        // Extract intermediate raw GPS track points from Google Takeout simplifiedRawPath / waypointPath / polylines
        const pathPoints = extractIntermediatePathPoints(act, startCoords, endCoords);
        const hasPoints = pathPoints.length >= 2;
        const actualStart = hasPoints ? pathPoints[0] : startCoords;
        const actualEnd = hasPoints ? pathPoints[pathPoints.length - 1] : endCoords;

        items.push({
          id: `maps_act_${startTs}_${actualStart?.lat || 0}`,
          type: 'maps',
          ts: startTs,
          endTs: endTs,
          dateObj: new Date(startTs),
          title: actInfo.name,
          subtitle: distKm ? `${distKm} km trip` : (startAddr !== 'Origin' ? startAddr : 'Travel Activity'),
          distance: distM,
          distanceKm: distKm,
          activityType: actInfo.name,
          travelMode: actInfo.gmapMode,
          isRoute: !!(actualStart && actualEnd),
          origin: actualStart ? { lat: actualStart.lat, lng: actualStart.lng, address: startAddr } : null,
          destination: actualEnd ? { lat: actualEnd.lat, lng: actualEnd.lng, address: endAddr } : null,
          pathPoints: hasPoints ? pathPoints : undefined,
          lat: actualStart ? actualStart.lat : (actualEnd ? actualEnd.lat : null),
          lng: actualStart ? actualStart.lng : (actualEnd ? actualEnd.lng : null),
          ms_played: durationMs > 0 ? durationMs : 0,
          platform: 'Google Maps Activity'
        });
        return true;
      }
    }

    if (obj.latitudeE7 !== undefined || obj.latitude !== undefined || obj.latLng || obj.lat !== undefined) {
      const ts = normalizeTimestamp(obj.timestamp || obj.timestampMs || obj.time || obj.startTime);
      const coords = parseLatLng(obj);
      if (ts && coords) {
        items.push({
          id: `maps_pt_${ts}_${coords.lat}`,
          type: 'maps',
          ts: ts,
          dateObj: new Date(ts),
          title: obj.name || `Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
          subtitle: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
          lat: coords.lat,
          lng: coords.lng,
          ms_played: 0,
          platform: 'Google Location History'
        });
        return true;
      }
    }
    return false;
  };

  if (jsonPayload.features && Array.isArray(jsonPayload.features)) {
    jsonPayload.features.forEach((feat: any) => {
      const props = feat.properties || {};
      const ts = normalizeTimestamp(props.time || props.timestamp || props.Time || props.startTimestamp);
      
      // Handle LineString route geometries in GeoJSON
      if (feat.geometry?.type === 'LineString' && Array.isArray(feat.geometry.coordinates)) {
        const linePoints: { lat: number; lng: number }[] = [];
        feat.geometry.coordinates.forEach((c: any) => {
          if (Array.isArray(c) && c.length >= 2) {
            linePoints.push({ lat: Number(c[1]), lng: Number(c[0]) });
          }
        });
        if (linePoints.length >= 2 && ts) {
          const first = linePoints[0];
          const last = linePoints[linePoints.length - 1];
          items.push({
            id: `geojson_line_${ts}_${first.lat}`,
            type: 'maps',
            ts: ts,
            dateObj: new Date(ts),
            title: props.name || props.title || 'Travel Route',
            subtitle: props.description || `${linePoints.length} GPS Track Points`,
            isRoute: true,
            pathPoints: linePoints,
            origin: { lat: first.lat, lng: first.lng, address: 'Start' },
            destination: { lat: last.lat, lng: last.lng, address: 'End' },
            lat: first.lat,
            lng: first.lng,
            ms_played: 0,
            platform: 'GeoJSON Route Export'
          });
          return;
        }
      }

      const coords = parseLatLng(feat.geometry || feat);
      if (ts && coords) {
        items.push({
          id: `geojson_${ts}_${coords.lat}`,
          type: 'maps',
          ts: ts,
          dateObj: new Date(ts),
          title: props.name || props.title || props.Title || `Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
          subtitle: props.description || props.address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
          lat: coords.lat,
          lng: coords.lng,
          ms_played: 0,
          platform: 'GeoJSON Timeline Export'
        });
      }
    });
    if (items.length > 0) return items;
  }

  if (jsonPayload.locations && Array.isArray(jsonPayload.locations)) {
    jsonPayload.locations.forEach((loc: any) => {
      const ts = normalizeTimestamp(loc.timestamp || loc.timestampMs || loc.time);
      const coords = parseLatLng(loc);
      if (ts && coords) {
        items.push({
          id: `loc_${ts}_${coords.lat}`,
          type: 'maps',
          ts: ts,
          dateObj: new Date(ts),
          title: `Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
          subtitle: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
          lat: coords.lat,
          lng: coords.lng,
          ms_played: 0,
          platform: 'Google Location History'
        });
      }
    });
    return items;
  }

  if (jsonPayload.semanticSegments && Array.isArray(jsonPayload.semanticSegments)) {
    jsonPayload.semanticSegments.forEach(processTimelineObject);
    if (items.length > 0) return items;
  }

  if (jsonPayload.timelineObjects && Array.isArray(jsonPayload.timelineObjects)) {
    jsonPayload.timelineObjects.forEach(processTimelineObject);
    if (items.length > 0) return items;
  }

  const takeoutBrowserHistory = jsonPayload['Browser History'] || jsonPayload['browser_history'] || jsonPayload['browserHistory'] || jsonPayload['BrowserHistory'];
  if (Array.isArray(takeoutBrowserHistory)) {
    takeoutBrowserHistory.forEach(entry => {
      if (!entry || !entry.url) return;
      const rawTime = entry.time_usec ? Math.floor(entry.time_usec / 1000) : (entry.time || entry.timestamp || entry.visitTime || entry.lastVisitTime || entry.date);
      const ts = normalizeTimestamp(rawTime);
      if (!ts) return;
      const domain = extractDomain(entry.url);
      items.push({
        id: `browser_${ts}_${entry.url}`,
        type: 'browser',
        ts: ts,
        dateObj: new Date(ts),
        title: entry.title || entry.name || entry.url,
        subtitle: domain,
        url: entry.url,
        domain: domain,
        favicon_url: entry.favicon_url || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
        transition: entry.page_transition || entry.transition || 'LINK',
        client_id: entry.client_id || null,
        platform: 'Google Chrome / Takeout'
      });
    });
    if (items.length > 0) return items;
  }

  const targetArray = Array.isArray(jsonPayload)
    ? jsonPayload
    : (jsonPayload.items || jsonPayload.records || jsonPayload.history || jsonPayload.watchHistory || jsonPayload.data || jsonPayload.rawSignals || jsonPayload.visits || jsonPayload.places || jsonPayload.entries || null);

  if (Array.isArray(targetArray)) {
    for (let i = 0; i < targetArray.length; i++) {
      const item = targetArray[i];
      if (!item) continue;
      if (processTimelineObject(item)) {
        continue;
      }
      const isBrowserItem = (item.url || item.URL || item.link || item.uri) &&
        (item.time_usec || item.lastVisitTime || item.last_visit_date || item.visitTime || item.page_transition || item.favicon_url || item.typedCount !== undefined || item.visitCount !== undefined || item.client_id);
      if (isBrowserItem) {
        const url = item.url || item.URL || item.link || item.uri;
        const rawTime = item.time_usec ? Math.floor(item.time_usec / 1000) : (item.lastVisitTime || item.last_visit_date || item.visitTime || item.time || item.timestamp || item.date || item.visited_at);
        const ts = normalizeTimestamp(rawTime);
        if (ts && url) {
          const domain = extractDomain(url);
          items.push({
            id: `browser_${ts}_${url}`,
            type: 'browser',
            ts: ts,
            dateObj: new Date(ts),
            title: item.title || item.name || url,
            subtitle: domain,
            url: url,
            domain: domain,
            favicon_url: item.favicon_url || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
            transition: item.page_transition || item.transition || 'LINK',
            client_id: item.client_id || null,
            platform: item.platform || 'Browser History'
          });
          continue;
        }
      }

      const isYouTubeItem = item.header === 'YouTube' || item.header === 'YouTube Music' ||
        (item.products && (item.products.includes('YouTube') || item.products.includes('YouTube Music'))) ||
        (item.titleUrl && (item.titleUrl.includes('youtube.com') || item.titleUrl.includes('youtu.be')));
      if (isYouTubeItem) {
        const ts = normalizeTimestamp(item.time || item.timestamp);
        if (!ts) continue;
        const trackName = item.title ? item.title.replace(/^(Watched|Angeschaut|Visionn[e ]e?)\s+/, '') : 'YouTube Video';
        const channelName = (item.subtitles && item.subtitles.length > 0) ? item.subtitles[0].name : 'YouTube Channel';
        let videoId: string | null = null;
        if (item.titleUrl) {
          if (item.titleUrl.includes('v=')) videoId = item.titleUrl.split('v=')[1].split('&')[0];
          else if (item.titleUrl.includes('youtu.be/')) videoId = item.titleUrl.split('youtu.be/')[1].split('?')[0];
          else if (item.titleUrl.includes('/shorts/')) videoId = item.titleUrl.split('/shorts/')[1].split('?')[0];
        }
        items.push({
          id: `yt_${ts}_${videoId || trackName}`,
          type: 'youtube',
          ts: ts,
          dateObj: new Date(ts),
          ms_played: 180000,
          title: trackName,
          subtitle: channelName,
          youtube_video_id: videoId,
          titleUrl: item.titleUrl,
          platform: item.header || 'YouTube'
        });
        continue;
      }

      if (item.endTime && item.trackName) {
        const ts = normalizeTimestamp(item.endTime);
        if (!ts) continue;
        items.push({
          id: `sp_${ts}_${item.trackName}`,
          type: 'spotify',
          ts: ts,
          dateObj: new Date(ts),
          ms_played: item.msPlayed || 0,
          title: item.trackName,
          subtitle: item.artistName || 'Unknown Artist',
          album: 'Spotify Export',
          platform: 'Spotify'
        });
        continue;
      }

      if (item.ts && (item.master_metadata_track_name || item.spotify_track_uri)) {
        const ts = normalizeTimestamp(item.ts);
        if (!ts) continue;
        items.push({
          id: `sp_${ts}_${item.master_metadata_track_name || 'track'}`,
          type: 'spotify',
          ts: ts,
          dateObj: new Date(ts),
          ms_played: item.ms_played || 0,
          title: item.master_metadata_track_name || 'Spotify Track',
          subtitle: item.master_metadata_album_artist_name || 'Unknown Artist',
          album: item.master_metadata_album_album_name || '',
          spotify_track_uri: item.spotify_track_uri,
          trackId: parseSpotifyId(item.spotify_track_uri),
          platform: 'Spotify'
        });
        continue;
      }

      if (item.played_at && item.track) {
        const ts = normalizeTimestamp(item.played_at);
        if (!ts) continue;
        items.push({
          id: `sp_${ts}_${item.track.name || 'track'}`,
          type: 'spotify',
          ts: ts,
          dateObj: new Date(ts),
          ms_played: item.track.duration_ms || 0,
          title: item.track.name || 'Spotify Track',
          subtitle: (item.track.artists && item.track.artists[0]) ? item.track.artists[0].name : 'Unknown Artist',
          album: item.track.album ? item.track.album.name : '',
          spotify_track_uri: item.track.uri,
          trackId: parseSpotifyId(item.track.uri),
          platform: 'Spotify Web API'
        });
        continue;
      }

      if ((item.url || item.URL) && (item.title || item.name)) {
        const url = item.url || item.URL;
        const ts = normalizeTimestamp(item.time || item.timestamp || item.date || item.visitTime || item.lastVisitTime);
        if (ts && url) {
          const domain = extractDomain(url);
          items.push({
            id: `browser_${ts}_${url}`,
            type: 'browser',
            ts: ts,
            dateObj: new Date(ts),
            title: item.title || item.name || url,
            subtitle: domain,
            url: url,
            domain: domain,
            favicon_url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
            transition: item.transition || 'LINK',
            platform: 'Browser History'
          });
          continue;
        }
      }
    }
  }
  return items;
}

export function parseKmlData(kmlText: string, defaultTitle = 'GPS Track'): TimelineItem[] {
  const items: TimelineItem[] = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(kmlText, 'text/xml');

    // 1. Google Takeout / Google Earth <gx:Track>
    const tracks = doc.querySelectorAll('Track, gx\\:Track');
    tracks.forEach((track, tIdx) => {
      const whens = Array.from(track.querySelectorAll('when')).map(w => w.textContent?.trim());
      const coordsNodes = Array.from(track.querySelectorAll('coord, gx\\:coord')).map(c => c.textContent?.trim());
      const pathPoints: { lat: number; lng: number }[] = [];
      let startTs: string | null = null;
      let endTs: string | null = null;

      for (let i = 0; i < coordsNodes.length; i++) {
        const cStr = coordsNodes[i];
        if (!cStr) continue;
        const parts = cStr.split(/\s+/).map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const lng = parts[0];
          const lat = parts[1];
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            pathPoints.push({ lat, lng });
            if (!startTs && whens[i]) startTs = normalizeTimestamp(whens[i]);
            if (whens[i]) endTs = normalizeTimestamp(whens[i]);
          }
        }
      }

      if (pathPoints.length >= 2) {
        const ts = startTs || normalizeTimestamp(new Date().toISOString()) || new Date().toISOString();
        const first = pathPoints[0];
        const last = pathPoints[pathPoints.length - 1];
        items.push({
          id: `kml_track_${ts}_${tIdx}_${first.lat}`,
          type: 'maps',
          ts,
          endTs: endTs || ts,
          dateObj: new Date(ts),
          title: defaultTitle,
          subtitle: `${pathPoints.length} Raw GPS Coordinate Points`,
          isRoute: true,
          pathPoints,
          origin: { lat: first.lat, lng: first.lng, address: 'Start' },
          destination: { lat: last.lat, lng: last.lng, address: 'End' },
          lat: first.lat,
          lng: first.lng,
          ms_played: (startTs && endTs) ? Math.max(0, new Date(endTs).getTime() - new Date(startTs).getTime()) : 0,
          platform: 'Google Location History (KML)'
        });
      }
    });

    // 2. Standard LineString geometries
    const lineStrings = doc.querySelectorAll('LineString');
    lineStrings.forEach((ls, lIdx) => {
      const coordNode = ls.querySelector('coordinates');
      if (coordNode && coordNode.textContent) {
        const tuples = coordNode.textContent.trim().split(/\s+/);
        const pathPoints: { lat: number; lng: number }[] = [];
        tuples.forEach(t => {
          const parts = t.split(',').map(Number);
          if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const lng = parts[0];
            const lat = parts[1];
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
              pathPoints.push({ lat, lng });
            }
          }
        });
        if (pathPoints.length >= 2) {
          const ts = new Date().toISOString();
          const first = pathPoints[0];
          const last = pathPoints[pathPoints.length - 1];
          items.push({
            id: `kml_line_${lIdx}_${first.lat}`,
            type: 'maps',
            ts,
            dateObj: new Date(ts),
            title: defaultTitle,
            subtitle: `${pathPoints.length} Coordinate Path Points`,
            isRoute: true,
            pathPoints,
            origin: { lat: first.lat, lng: first.lng, address: 'Start' },
            destination: { lat: last.lat, lng: last.lng, address: 'End' },
            lat: first.lat,
            lng: first.lng,
            ms_played: 0,
            platform: 'KML Route Export'
          });
        }
      }
    });

    // 3. Discrete Placemarks
    const placemarks = doc.querySelectorAll('Placemark');
    placemarks.forEach((pm, pIdx) => {
      if (pm.querySelector('LineString') || pm.querySelector('Track') || pm.querySelector('gx\\:Track')) return;
      const point = pm.querySelector('Point coordinates');
      const name = pm.querySelector('name')?.textContent?.trim() || 'Saved Location';
      const address = pm.querySelector('address')?.textContent?.trim() || '';
      const ts = normalizeTimestamp(pm.querySelector('TimeStamp when')?.textContent?.trim() || new Date().toISOString()) || new Date().toISOString();
      if (point && point.textContent) {
        const parts = point.textContent.trim().split(',').map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const lng = parts[0];
          const lat = parts[1];
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            items.push({
              id: `kml_pm_${ts}_${pIdx}_${lat}`,
              type: 'maps',
              ts,
              dateObj: new Date(ts),
              title: name,
              subtitle: address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              address,
              lat,
              lng,
              ms_played: 0,
              platform: 'Google Earth / KML'
            });
          }
        }
      }
    });
  } catch (err) {
    console.warn('Error parsing KML content:', err);
  }
  return items;
}

export function parseGpxData(gpxText: string, defaultTitle = 'GPX Activity Track'): TimelineItem[] {
  const items: TimelineItem[] = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(gpxText, 'text/xml');
    const trksegs = doc.querySelectorAll('trkseg');
    trksegs.forEach((seg, sIdx) => {
      const trkpts = seg.querySelectorAll('trkpt');
      const pathPoints: { lat: number; lng: number }[] = [];
      let startTs: string | null = null;
      let endTs: string | null = null;

      trkpts.forEach(pt => {
        const lat = parseFloat(pt.getAttribute('lat') || '');
        const lon = parseFloat(pt.getAttribute('lon') || '');
        const time = pt.querySelector('time')?.textContent?.trim();
        if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          pathPoints.push({ lat, lng: lon });
          if (time) {
            const norm = normalizeTimestamp(time);
            if (!startTs && norm) startTs = norm;
            if (norm) endTs = norm;
          }
        }
      });

      if (pathPoints.length >= 2) {
        const ts = startTs || new Date().toISOString();
        const first = pathPoints[0];
        const last = pathPoints[pathPoints.length - 1];
        items.push({
          id: `gpx_track_${ts}_${sIdx}_${first.lat}`,
          type: 'maps',
          ts,
          endTs: endTs || ts,
          dateObj: new Date(ts),
          title: defaultTitle,
          subtitle: `${pathPoints.length} GPS Raw Waypoints`,
          isRoute: true,
          pathPoints,
          origin: { lat: first.lat, lng: first.lng, address: 'Start' },
          destination: { lat: last.lat, lng: last.lng, address: 'End' },
          lat: first.lat,
          lng: first.lng,
          ms_played: (startTs && endTs) ? Math.max(0, new Date(endTs).getTime() - new Date(startTs).getTime()) : 0,
          platform: 'GPX Activity Export'
        });
      }
    });
  } catch (err) {
    console.warn('Error parsing GPX content:', err);
  }
  return items;
}

export async function parseUploadedFiles(
  files: FileList | File[],
  onProgress: (percent: number, text: string) => void
): Promise<{
  newItems: TimelineItem[];
  fileBreakdowns: ImportedFileRecord[];
  bookmarkNotes?: Record<string, string>;
  bookmarkTags?: Record<string, string[]>;
  sessionSnapshots?: Record<string, string>;
}> {
  let totalNewItems: TimelineItem[] = [];
  const fileBreakdowns: ImportedFileRecord[] = [];
  const accumulatedNotes: Record<string, string> = {};
  const accumulatedTags: Record<string, string[]> = {};
  const accumulatedSnapshots: Record<string, string> = {};

  for (let fIdx = 0; fIdx < files.length; fIdx++) {
    const file = files[fIdx];
    const fileNameLower = file.name.toLowerCase();
    let fileSpotify = 0;
    let fileYt = 0;
    let fileMaps = 0;
    let fileBrowser = 0;
    let fileParsedItems: TimelineItem[] = [];

    onProgress(Math.round(((fIdx + 0.2) / files.length) * 100), `Reading ${file.name}...`);

    if (fileNameLower.endsWith('.json') || fileNameLower.endsWith('.geojson')) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        fileParsedItems = processImportPayload(parsed);
        if (fileParsedItems.length === 0) {
          if (fileNameLower.includes('pin') || fileNameLower.includes('pinterest')) {
            const pinRes = parsePinterestJson(text);
            if (pinRes.items.length > 0) {
              fileParsedItems = pinRes.items;
              Object.assign(accumulatedNotes, pinRes.notes);
              Object.assign(accumulatedTags, pinRes.tags);
              Object.assign(accumulatedSnapshots, pinRes.snapshots);
            }
          }
          if (fileParsedItems.length === 0) {
            const jsonRes = parseRaindropJson(parsed);
            if (jsonRes.items.length > 0) {
              fileParsedItems = jsonRes.items;
              Object.assign(accumulatedNotes, jsonRes.notes);
              Object.assign(accumulatedTags, jsonRes.tags);
              Object.assign(accumulatedSnapshots, jsonRes.snapshots);
            } else {
              const fallbackPinRes = parsePinterestJson(text);
              if (fallbackPinRes.items.length > 0) {
                fileParsedItems = fallbackPinRes.items;
                Object.assign(accumulatedNotes, fallbackPinRes.notes);
                Object.assign(accumulatedTags, fallbackPinRes.tags);
                Object.assign(accumulatedSnapshots, fallbackPinRes.snapshots);
              }
            }
          }
        }
      } catch (e) {
        console.warn(`Error parsing JSON file ${file.name}:`, e);
      }
    } else if (fileNameLower.endsWith('.csv')) {
      try {
        const text = await file.text();
        if (fileNameLower.includes('pin') || fileNameLower.includes('pinterest')) {
          const pinCsvRes = parsePinterestCsv(text);
          if (pinCsvRes.items.length > 0) {
            fileParsedItems = pinCsvRes.items;
            Object.assign(accumulatedNotes, pinCsvRes.notes);
            Object.assign(accumulatedTags, pinCsvRes.tags);
            Object.assign(accumulatedSnapshots, pinCsvRes.snapshots);
          }
        }
        if (fileParsedItems.length === 0) {
          const csvRes = parseRaindropCsv(text);
          if (csvRes.items.length > 0) {
            fileParsedItems = csvRes.items;
            Object.assign(accumulatedNotes, csvRes.notes);
            Object.assign(accumulatedTags, csvRes.tags);
            Object.assign(accumulatedSnapshots, csvRes.snapshots);
          } else {
            const fallbackPinCsv = parsePinterestCsv(text);
            if (fallbackPinCsv.items.length > 0) {
              fileParsedItems = fallbackPinCsv.items;
              Object.assign(accumulatedNotes, fallbackPinCsv.notes);
              Object.assign(accumulatedTags, fallbackPinCsv.tags);
              Object.assign(accumulatedSnapshots, fallbackPinCsv.snapshots);
            }
          }
        }
      } catch (e) {
        console.warn(`Error parsing CSV file ${file.name}:`, e);
      }
    } else if (fileNameLower.endsWith('.kml')) {
      try {
        const text = await file.text();
        fileParsedItems = parseKmlData(text, file.name.replace(/\.kml$/i, ''));
      } catch (e) {
        console.warn(`Error parsing KML file ${file.name}:`, e);
      }
    } else if (fileNameLower.endsWith('.gpx')) {
      try {
        const text = await file.text();
        fileParsedItems = parseGpxData(text, file.name.replace(/\.gpx$/i, ''));
      } catch (e) {
        console.warn(`Error parsing GPX file ${file.name}:`, e);
      }
    } else if (fileNameLower.endsWith('.html') || fileNameLower.endsWith('.htm')) {
      try {
        const text = await file.text();
        const htmlRes = parseRaindropHtml(text);
        if (htmlRes.items.length > 0) {
          fileParsedItems = htmlRes.items;
          Object.assign(accumulatedNotes, htmlRes.notes);
          Object.assign(accumulatedTags, htmlRes.tags);
          Object.assign(accumulatedSnapshots, htmlRes.snapshots);
        } else {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, 'text/html');
          const anchors = doc.querySelectorAll('a[href]');
          anchors.forEach(a => {
            const url = a.getAttribute('href');
            if (!url || url.startsWith('javascript:') || url.startsWith('data:') || url === '#') return;
            const addDate = a.getAttribute('add_date') || a.getAttribute('last_visit') || a.getAttribute('time') || a.getAttribute('date');
            let rawTime: any = null;
            if (addDate) {
              const num = parseInt(addDate, 10);
              rawTime = !isNaN(num) ? (num < 1e11 ? num * 1000 : num) : addDate;
            }
            const ts = normalizeTimestamp(rawTime || Date.now());
            if (ts) {
              const domain = extractDomain(url);
              fileParsedItems.push({
                id: `browser_${ts}_${url}`,
                type: 'browser',
                ts: ts,
                dateObj: new Date(ts),
                title: a.textContent?.trim() || url,
                subtitle: domain,
                url: url,
                domain: domain,
                favicon_url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
                transition: 'LINK',
                platform: 'HTML Export'
              });
            }
          });
        }
      } catch (e) {
        console.warn(`Error parsing HTML file ${file.name}:`, e);
      }
    } else if (fileNameLower.endsWith('.zip')) {
      try {
        const zip = new JSZip();
        const zipData = await zip.loadAsync(file);
        const zipFiles: { path: string; entry: JSZip.JSZipObject }[] = [];
        zipData.forEach((relPath, entry) => {
          const pLower = relPath.toLowerCase();
          if (
            !entry.dir &&
            (pLower.endsWith('.json') ||
              pLower.endsWith('.geojson') ||
              pLower.endsWith('.kml') ||
              pLower.endsWith('.gpx') ||
              pLower.endsWith('.html') ||
              pLower.endsWith('.htm'))
          ) {
            zipFiles.push({ path: relPath, entry: entry });
          }
        });

        for (let zIdx = 0; zIdx < zipFiles.length; zIdx++) {
          const zf = zipFiles[zIdx];
          const pLower = zf.path.toLowerCase();
          try {
            if (pLower.endsWith('.html') || pLower.endsWith('.htm')) {
              const htmlText = await zf.entry.async('text');
              const parser = new DOMParser();
              const doc = parser.parseFromString(htmlText, 'text/html');
              const anchors = doc.querySelectorAll('a[href]');
              anchors.forEach(a => {
                const url = a.getAttribute('href');
                if (!url || url.startsWith('javascript:') || url === '#') return;
                const addDate = a.getAttribute('add_date') || a.getAttribute('last_visit') || a.getAttribute('time');
                let rawTime: any = null;
                if (addDate) {
                  const num = parseInt(addDate, 10);
                  rawTime = !isNaN(num) ? (num < 1e11 ? num * 1000 : num) : addDate;
                }
                const ts = normalizeTimestamp(rawTime || Date.now());
                if (ts) {
                  const domain = extractDomain(url);
                  fileParsedItems.push({
                    id: `browser_${ts}_${url}`,
                    type: 'browser',
                    ts: ts,
                    dateObj: new Date(ts),
                    title: a.textContent?.trim() || url,
                    subtitle: domain,
                    url: url,
                    domain: domain,
                    favicon_url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
                    transition: 'LINK',
                    platform: 'HTML Export'
                  });
                }
              });
            } else if (pLower.endsWith('.kml')) {
              const kmlText = await zf.entry.async('text');
              const items = parseKmlData(kmlText, zf.path.split('/').pop()?.replace(/\.kml$/i, '') || 'KML Route');
              fileParsedItems = fileParsedItems.concat(items);
            } else if (pLower.endsWith('.gpx')) {
              const gpxText = await zf.entry.async('text');
              const items = parseGpxData(gpxText, zf.path.split('/').pop()?.replace(/\.gpx$/i, '') || 'GPX Route');
              fileParsedItems = fileParsedItems.concat(items);
            } else {
              const jsonText = await zf.entry.async('text');
              const parsed = JSON.parse(jsonText);
              const items = processImportPayload(parsed);
              fileParsedItems = fileParsedItems.concat(items);
            }
          } catch (err) {
            console.warn(`Skipping unparseable entry in zip: ${zf.path}`);
          }
        }
      } catch (err) {
        console.warn(`Error unpacking zip ${file.name}:`, err);
      }
    }

    fileParsedItems.forEach(i => {
      if (i.type === 'spotify') fileSpotify++;
      else if (i.type === 'youtube') fileYt++;
      else if (i.type === 'maps') fileMaps++;
      else if (i.type === 'browser') fileBrowser++;
    });

    fileBreakdowns.push({
      id: `file_${Date.now()}_${fIdx}_${Math.random().toString(36).substring(2, 9)}`,
      name: file.name,
      fileName: file.name,
      filename: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
      importDate: new Date().toISOString(),
      count: fileParsedItems.length,
      recordCount: fileParsedItems.length,
      spotifyCount: fileSpotify,
      ytCount: fileYt,
      mapsCount: fileMaps,
      browserCount: fileBrowser
    });

    totalNewItems = totalNewItems.concat(fileParsedItems);
  }

  onProgress(100, 'Import completed successfully!');
  return {
    newItems: totalNewItems,
    fileBreakdowns,
    bookmarkNotes: accumulatedNotes,
    bookmarkTags: accumulatedTags,
    sessionSnapshots: accumulatedSnapshots
  };
}

export async function parseDataFile(file: File): Promise<TimelineItem[]> {
  const res = await parseUploadedFiles([file], () => {});
  return res.newItems;
}

export interface ResolvedPlaceInfo {
  name: string;
  address: string;
  city?: string;
  category?: string;
  poi?: string;
}

// Local in-memory geocoding cache to prevent redundant network lookups
const GEOCODE_CACHE = new Map<string, ResolvedPlaceInfo>();

export async function reverseGeocodeItem(
  lat: number,
  lng: number
): Promise<ResolvedPlaceInfo> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (GEOCODE_CACHE.has(cacheKey)) {
    return GEOCODE_CACHE.get(cacheKey)!;
  }

  // Check localStorage for persisted cache
  try {
    const saved = localStorage.getItem(`geo_${cacheKey}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      GEOCODE_CACHE.set(cacheKey, parsed);
      return parsed;
    }
  } catch (_) {}

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'MyLifeTimelineApp/1.0'
        }
      }
    );

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      // Determine human-readable POI or Place Name
      let poi = data.name || addr.amenity || addr.shop || addr.tourism || addr.building || addr.leisure || addr.office || null;
      if (!poi && data.namedetails?.name) {
        poi = data.namedetails.name;
      }

      // Format clean street / locality
      const streetPart = [addr.house_number, addr.road || addr.pedestrian || addr.footway || addr.path].filter(Boolean).join(' ');
      const suburbPart = addr.neighbourhood || addr.suburb || addr.quarter || addr.district;
      const cityPart = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state;

      let name = poi;
      if (!name) {
        if (streetPart && suburbPart) {
          name = `${streetPart}, ${suburbPart}`;
        } else if (streetPart) {
          name = streetPart;
        } else if (suburbPart) {
          name = suburbPart;
        } else if (data.display_name) {
          name = data.display_name.split(',')[0].trim();
        } else {
          name = `Place (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        }
      }

      const address = data.display_name || [streetPart, suburbPart, cityPart].filter(Boolean).join(', ') || `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      // Infer recommended category
      let category: string | undefined;
      const amenity = (addr.amenity || '').toLowerCase();
      const shop = (addr.shop || '').toLowerCase();
      const leisure = (addr.leisure || '').toLowerCase();
      const tourism = (addr.tourism || '').toLowerCase();

      if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'bistro', 'bakery', 'food_court'].includes(amenity)) {
        category = 'food';
      } else if (shop || ['supermarket', 'mall', 'convenience', 'department_store'].includes(amenity)) {
        category = 'shopping';
      } else if (['hotel', 'motel', 'hostel', 'guest_house', 'resort'].includes(tourism) || ['hotel', 'motel'].includes(amenity)) {
        category = 'lodging';
      } else if (['park', 'nature_reserve', 'garden', 'playground', 'pitch', 'beach'].includes(leisure) || ['viewpoint', 'attraction'].includes(tourism)) {
        category = 'outdoors';
      } else if (['gym', 'fitness_centre', 'sports_centre', 'hospital', 'clinic', 'pharmacy', 'doctors', 'dentist'].includes(amenity)) {
        category = 'health';
      } else if (['museum', 'gallery', 'theme_park', 'zoo', 'aquarium'].includes(tourism) || ['theatre', 'cinema', 'arts_centre'].includes(amenity)) {
        category = 'culture';
      } else if (['school', 'university', 'college', 'library'].includes(amenity)) {
        category = 'education';
      } else if (addr.office || ['office', 'coworking_space'].includes(amenity)) {
        category = 'work';
      }

      const result: ResolvedPlaceInfo = {
        name,
        address,
        city: cityPart,
        category,
        poi: poi || undefined
      };

      GEOCODE_CACHE.set(cacheKey, result);
      try {
        localStorage.setItem(`geo_${cacheKey}`, JSON.stringify(result));
      } catch (_) {}

      return result;
    }
  } catch (err) {
    console.warn('Geocoding request failed:', err);
  }

  const fallback: ResolvedPlaceInfo = {
    name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    address: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
  };
  return fallback;
}

export async function reverseGeocodeLocation(lat: number, lng: number): Promise<string | null> {
  const res = await reverseGeocodeItem(lat, lng);
  return res ? res.name || res.address || null : null;
}

const ROUTE_GEOMETRY_CACHE = new Map<string, { lat: number; lng: number }[]>();

/**
 * Fetches street-level driving/walking route geometry between two coordinates using OSRM routing service
 * to replace straight lines with accurate road paths
 */
export async function extractRoadGeometryBetweenPoints(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  mode: 'driving' | 'walking' | 'biking' | string = 'driving'
): Promise<{ lat: number; lng: number }[] | null> {
  const profile = mode.includes('walk') ? 'foot' : mode.includes('bike') ? 'bike' : 'car';
  const cacheKey = `route_${profile}_${startLat.toFixed(4)},${startLng.toFixed(4)}_${endLat.toFixed(4)},${endLng.toFixed(4)}`;

  if (ROUTE_GEOMETRY_CACHE.has(cacheKey)) {
    return ROUTE_GEOMETRY_CACHE.get(cacheKey)!;
  }

  try {
    const local = localStorage.getItem(cacheKey);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        ROUTE_GEOMETRY_CACHE.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch (_) {}

  try {
    // OpenStreetMap OSRM Public Routing API
    const url = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0 && data.routes[0].geometry?.coordinates) {
        const coords: [number, number][] = data.routes[0].geometry.coordinates;
        const pathPoints = coords.map(([lng, lat]) => ({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6))
        }));

        ROUTE_GEOMETRY_CACHE.set(cacheKey, pathPoints);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(pathPoints));
        } catch (_) {}

        return pathPoints;
      }
    }
  } catch (err) {
    console.warn('OSRM route extraction failed:', err);
  }

  return null;
}

export async function batchReverseGeocodePlaces(
  items: { id?: string; lat: number; lng: number }[],
  onProgress?: (completed: number, total: number, currentItem?: any) => void
): Promise<Map<string, ResolvedPlaceInfo>> {
  const results = new Map<string, ResolvedPlaceInfo>();
  const uniqueCoords: { lat: number; lng: number; key: string }[] = [];
  const seen = new Set<string>();

  items.forEach(i => {
    if (i.lat != null && i.lng != null) {
      const key = `${i.lat.toFixed(4)},${i.lng.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCoords.push({ lat: i.lat, lng: i.lng, key });
      }
    }
  });

  const total = uniqueCoords.length;
  let completed = 0;

  for (const item of uniqueCoords) {
    try {
      const resolved = await reverseGeocodeItem(item.lat, item.lng);
      results.set(item.key, resolved);
      completed++;
      if (onProgress) {
        onProgress(completed, total, resolved);
      }
      // Delay 350ms between queries to respect Nominatim usage policy
      if (completed < total && !GEOCODE_CACHE.has(item.key)) {
        await new Promise(r => setTimeout(r, 350));
      }
    } catch (e) {
      console.warn(`Failed resolving coord ${item.key}:`, e);
    }
  }

  return results;
}

/**
 * Exports timeline map items (places and extracted routes) to standard GeoJSON FeatureCollection
 */
export function exportTimelineToGeoJSON(items: TimelineItem[], includeMetadata: boolean = true): string {
  const features: any[] = [];

  items.forEach(item => {
    if (item.type !== 'maps') return;

    if (item.isRoute) {
      // LineString or MultiPoint for route
      let coordinates: [number, number][] = [];
      if (item.pathPoints && item.pathPoints.length >= 2) {
        coordinates = item.pathPoints.map(p => [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))]);
      } else if (item.origin && item.destination) {
        coordinates = [
          [Number(item.origin.lng.toFixed(6)), Number(item.origin.lat.toFixed(6))],
          [Number(item.destination.lng.toFixed(6)), Number(item.destination.lat.toFixed(6))]
        ];
      }

      if (coordinates.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates
          },
          properties: {
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            activityType: item.activityType || item.travelMode || 'Trip',
            distanceKm: item.distanceKm,
            timestamp: item.ts,
            endTimestamp: item.endTs,
            durationMs: item.ms_played,
            originAddress: item.origin?.address,
            destinationAddress: item.destination?.address
          }
        });
      }
    } else {
      // Point for visited location
      const lat = item.lat != null ? Number(item.lat) : item.origin?.lat != null ? Number(item.origin.lat) : null;
      const lng = item.lng != null ? Number(item.lng) : item.origin?.lng != null ? Number(item.origin.lng) : null;

      if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [Number(lng.toFixed(6)), Number(lat.toFixed(6))]
          },
          properties: {
            id: item.id,
            title: item.title,
            address: item.address,
            category: item.category || (item as any).semanticType,
            timestamp: item.ts,
            durationMs: item.ms_played,
            isResolved: !isGenericPlaceName(item.title)
          }
        });
      }
    }
  });

  const collection = {
    type: 'FeatureCollection',
    metadata: {
      generatedAt: new Date().toISOString(),
      featureCount: features.length,
      generator: 'Google Maps Timeline Visualizer'
    },
    features
  };

  return JSON.stringify(collection, null, 2);
}

/**
 * Exports timeline map items to Google Earth KML
 */
export function exportTimelineToKML(items: TimelineItem[]): string {
  const placemarks: string[] = [];

  items.forEach(item => {
    if (item.type !== 'maps') return;

    const escapeXml = (unsafe: string) => {
      return (unsafe || '').replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    };

    const title = escapeXml(item.title || 'Location');
    const desc = escapeXml(`${item.subtitle || ''} ${item.address ? `• ${item.address}` : ''} • ${item.ts}`);

    if (item.isRoute) {
      let coords: string[] = [];
      if (item.pathPoints && item.pathPoints.length >= 2) {
        coords = item.pathPoints.map(p => `${p.lng},${p.lat},0`);
      } else if (item.origin && item.destination) {
        coords = [`${item.origin.lng},${item.origin.lat},0`, `${item.destination.lng},${item.destination.lat},0`];
      }

      if (coords.length >= 2) {
        placemarks.push(`
    <Placemark>
      <name>${title}</name>
      <description>${desc}</description>
      <Style>
        <LineStyle>
          <color>ff0000ff</color>
          <width>4</width>
        </LineStyle>
      </Style>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
          ${coords.join(' ')}
        </coordinates>
      </LineString>
    </Placemark>`);
      }
    } else {
      const lat = item.lat != null ? item.lat : item.origin?.lat;
      const lng = item.lng != null ? item.lng : item.origin?.lng;

      if (lat != null && lng != null) {
        placemarks.push(`
    <Placemark>
      <name>${title}</name>
      <description>${desc}</description>
      <Point>
        <coordinates>${lng},${lat},0</coordinates>
      </Point>
    </Placemark>`);
      }
    }
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Google Maps Timeline Export</name>
    <description>Exported timeline locations and routes</description>
    ${placemarks.join('\n')}
  </Document>
</kml>`;
}

/**
 * Exports timeline map items to CSV
 */
export function exportTimelineToCSV(items: TimelineItem[]): string {
  const headers = ['id', 'timestamp', 'type', 'title', 'subtitle', 'latitude', 'longitude', 'address', 'category', 'isRoute', 'distanceKm'];
  const rows: string[] = [headers.join(',')];

  items.forEach(item => {
    if (item.type !== 'maps') return;

    const lat = item.lat != null ? item.lat : item.origin?.lat || '';
    const lng = item.lng != null ? item.lng : item.origin?.lng || '';
    const clean = (val?: string | null | number) => `"${String(val || '').replace(/"/g, '""')}"`;

    rows.push([
      clean(item.id),
      clean(item.ts),
      clean(item.type),
      clean(item.title),
      clean(item.subtitle),
      clean(lat),
      clean(lng),
      clean(item.address),
      clean(item.category || (item as any).semanticType),
      clean(item.isRoute ? 'true' : 'false'),
      clean(item.distanceKm || '')
    ].join(','));
  });

  return rows.join('\n');
}

/**
 * Triggers a client-side file download
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


