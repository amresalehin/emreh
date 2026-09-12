import { TimelineItem, CorrelatedLocationItem } from '../types';

/**
 * Smart Geo-Correlation Utility:
 * Correlates timestamps from media, browser visits, bookmarks, and notes
 * with Google Maps Timeline place visits and route activities to discover
 * where the user was at that exact moment.
 */

interface MapCandidate {
  item: TimelineItem;
  startMs: number;
  endMs: number;
  lat: number;
  lng: number;
  placeName: string;
  address: string;
  isRoute: boolean;
}

export function extractMapCandidates(timelineItems: TimelineItem[]): MapCandidate[] {
  const candidates: MapCandidate[] = [];

  for (const item of timelineItems) {
    if (item.type !== 'maps') continue;

    const startMs = new Date(item.ts).getTime();
    if (isNaN(startMs)) continue;

    // End time: endTs or calculate from duration/fallback (default to 45 mins for a place visit)
    let endMs = item.endTs ? new Date(item.endTs).getTime() : startMs + 45 * 60 * 1000;
    if (isNaN(endMs) || endMs < startMs) {
      endMs = startMs + 30 * 60 * 1000;
    }

    let lat: number | null = null;
    let lng: number | null = null;
    let placeName = item.place_name || item.title || 'Visited Place';
    let address = item.address || item.subtitle || '';

    if (item.isRoute) {
      // For routes, use mid-point or origin
      if (item.pathPoints && item.pathPoints.length > 0) {
        const mid = item.pathPoints[Math.floor(item.pathPoints.length / 2)];
        lat = mid.lat;
        lng = mid.lng;
      } else if (item.origin) {
        lat = item.origin.lat;
        lng = item.origin.lng;
      } else if (item.destination) {
        lat = item.destination.lat;
        lng = item.destination.lng;
      }
    } else {
      if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
        lat = Number(item.lat);
        lng = Number(item.lng);
      }
    }

    if (lat !== null && lng !== null) {
      candidates.push({
        item,
        startMs,
        endMs,
        lat,
        lng,
        placeName,
        address,
        isRoute: Boolean(item.isRoute)
      });
    }
  }

  // Sort chronologically
  return candidates.sort((a, b) => a.startMs - b.startMs);
}

/**
 * Finds the exact or nearest location for a given timestamp.
 */
export function findLocationForTimestamp(
  targetTimestamp: string,
  mapCandidates: MapCandidate[],
  maxToleranceMinutes = 60
): {
  lat: number;
  lng: number;
  placeName: string;
  address: string;
  method: 'exact_stop' | 'nearest_stop' | 'route_segment';
  timeDeltaMinutes: number;
  matchedMapItem: TimelineItem;
} | null {
  const targetMs = new Date(targetTimestamp).getTime();
  if (isNaN(targetMs) || mapCandidates.length === 0) return null;

  // 1. Check if timestamp falls inside an active visit window
  for (const cand of mapCandidates) {
    if (targetMs >= cand.startMs && targetMs <= cand.endMs) {
      return {
        lat: cand.lat,
        lng: cand.lng,
        placeName: cand.placeName,
        address: cand.address,
        method: cand.isRoute ? 'route_segment' : 'exact_stop',
        timeDeltaMinutes: 0,
        matchedMapItem: cand.item
      };
    }
  }

  // 2. Nearest candidate within tolerance
  let closest: MapCandidate | null = null;
  let minDiffMs = Infinity;

  const maxToleranceMs = maxToleranceMinutes * 60 * 1000;

  for (const cand of mapCandidates) {
    const diffToStart = Math.abs(targetMs - cand.startMs);
    const diffToEnd = Math.abs(targetMs - cand.endMs);
    const minDiff = Math.min(diffToStart, diffToEnd);

    if (minDiff < minDiffMs && minDiff <= maxToleranceMs) {
      minDiffMs = minDiff;
      closest = cand;
    }
  }

  if (closest) {
    return {
      lat: closest.lat,
      lng: closest.lng,
      placeName: closest.placeName,
      address: closest.address,
      method: 'nearest_stop',
      timeDeltaMinutes: Math.round(minDiffMs / (60 * 1000)),
      matchedMapItem: closest.item
    };
  }

  return null;
}

/**
 * Correlates an array of timeline items (media, browser, bookmarks, etc.) with map timeline candidates.
 */
export function correlateItemsWithMap(
  items: TimelineItem[],
  allTimelineData: TimelineItem[],
  itemTypeFilter?: 'spotify' | 'youtube' | 'browser' | 'notes' | 'bookmarks'
): CorrelatedLocationItem[] {
  const mapCandidates = extractMapCandidates(allTimelineData);
  if (mapCandidates.length === 0) return [];

  const results: CorrelatedLocationItem[] = [];

  for (const item of items) {
    if (item.type === 'maps') continue;

    if (itemTypeFilter && item.type !== itemTypeFilter) continue;

    // If item already has explicit coordinates, use them
    if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
      results.push({
        id: `corr_${item.id}`,
        originalItem: item,
        itemType: (item.type === 'photo' ? 'browser' : item.type) as any,
        title: item.title,
        subtitle: item.subtitle,
        timestamp: item.ts,
        lat: Number(item.lat),
        lng: Number(item.lng),
        placeName: item.place_name || item.address || 'Saved Location',
        address: item.address || '',
        correlationMethod: 'exact_stop',
        timeDeltaMinutes: 0
      });
      continue;
    }

    const match = findLocationForTimestamp(item.ts, mapCandidates);
    if (match) {
      results.push({
        id: `corr_${item.id}`,
        originalItem: item,
        itemType: (item.type === 'photo' ? 'browser' : item.type) as any,
        title: item.title,
        subtitle: item.subtitle,
        timestamp: item.ts,
        lat: match.lat,
        lng: match.lng,
        placeName: match.placeName,
        address: match.address,
        correlationMethod: match.method,
        timeDeltaMinutes: match.timeDeltaMinutes
      });
    }
  }

  return results;
}

/**
 * Decorates items with correlated location metadata from map candidates.
 */
export function attachGeoCorrelationToItems(
  items: TimelineItem[],
  mapCandidatesOrAllTimeline: MapCandidate[] | TimelineItem[],
  maxToleranceMinutes = 60
): TimelineItem[] {
  if (!items || items.length === 0) return [];

  const candidates: MapCandidate[] =
    mapCandidatesOrAllTimeline.length > 0 && 'startMs' in mapCandidatesOrAllTimeline[0]
      ? (mapCandidatesOrAllTimeline as MapCandidate[])
      : extractMapCandidates(mapCandidatesOrAllTimeline as TimelineItem[]);

  if (candidates.length === 0) return items;

  return items.map(item => {
    if (item.type === 'maps' || item.correlatedLocation) return item;

    // If item already has explicit coordinates, preserve as exact
    if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
      return {
        ...item,
        correlatedLocation: {
          lat: Number(item.lat),
          lng: Number(item.lng),
          placeName: item.place_name || item.address || 'Tagged Location',
          address: item.address || '',
          method: 'exact_stop',
          timeDeltaMinutes: 0
        }
      };
    }

    const match = findLocationForTimestamp(item.ts, candidates, maxToleranceMinutes);
    if (!match) return item;

    return {
      ...item,
      correlatedLocation: {
        lat: match.lat,
        lng: match.lng,
        placeName: match.placeName,
        address: match.address,
        method: match.method,
        timeDeltaMinutes: match.timeDeltaMinutes,
        matchedMapItem: match.matchedMapItem
      }
    };
  });
}

export interface PlaceCorrelationSummary {
  placeName: string;
  address: string;
  lat: number;
  lng: number;
  visitCount: number;
  items: TimelineItem[];
  itemCounts: {
    spotify: number;
    youtube: number;
    browser: number;
    photo: number;
  };
}

/**
 * Groups non-map timeline items by their correlated place.
 */
export function getPlaceCorrelationSummary(
  allTimelineItems: TimelineItem[]
): PlaceCorrelationSummary[] {
  const mapCandidates = extractMapCandidates(allTimelineItems);
  if (mapCandidates.length === 0) return [];

  const placeMap = new Map<string, PlaceCorrelationSummary>();

  for (const item of allTimelineItems) {
    if (item.type === 'maps') continue;

    const match = item.correlatedLocation || findLocationForTimestamp(item.ts, mapCandidates);
    if (!match) continue;

    const key = match.placeName.toLowerCase().trim();
    if (!key) continue;

    if (!placeMap.has(key)) {
      placeMap.set(key, {
        placeName: match.placeName,
        address: match.address || '',
        lat: match.lat,
        lng: match.lng,
        visitCount: 1,
        items: [],
        itemCounts: { spotify: 0, youtube: 0, browser: 0, photo: 0 }
      });
    }

    const entry = placeMap.get(key)!;
    entry.items.push(item);
    if (item.type in entry.itemCounts) {
      entry.itemCounts[item.type as keyof typeof entry.itemCounts]++;
    }
  }

  return Array.from(placeMap.values()).sort((a, b) => b.items.length - a.items.length);
}

