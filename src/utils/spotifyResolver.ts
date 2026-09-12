// Spotify Track ID Resolution Service
// Resolves Spotify Track IDs for streaming history records lacking URIs

const CACHE_KEY = 'emreh_spotify_track_id_cache';

const idCache = new Map<string, string>();
const inFlightResolutions = new Map<string, Promise<string | null>>();

// Load stored cache
try {
  const raw = localStorage.getItem(CACHE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([k, v]) => {
      if (typeof v === 'string') idCache.set(k, v);
    });
  }
} catch {
  // ignore
}

function saveCache() {
  try {
    const obj: Record<string, string> = {};
    let count = 0;
    for (const [k, v] of idCache.entries()) {
      if (count++ > 800) break;
      obj[k] = v;
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

function getCacheKey(title: string, artist?: string): string {
  const cleanTitle = (title || '')
    .toLowerCase()
    .replace(/\s*-\s*remaster(ed)?\s*\d*/gi, '')
    .replace(/\s*\(remaster(ed)?\s*\d*\)/gi, '')
    .replace(/\s*\[.*?\]/g, '')
    .replace(/\s*\(feat\..*?\)/gi, '')
    .replace(/\s*\(with.*?\)/gi, '')
    .trim();
  const cleanArtist = (artist || '').toLowerCase().trim();
  return `${cleanArtist}___${cleanTitle}`;
}

export function getCachedSpotifyTrackId(title: string, artist?: string): string | null {
  const key = getCacheKey(title, artist);
  return idCache.get(key) || null;
}

/**
 * Resolves Spotify Track ID from track title and artist using iTunes + Songlink cross-platform API
 */
export async function resolveSpotifyTrackId(
  title: string,
  artist?: string,
  knownTrackId?: string | null
): Promise<string | null> {
  if (knownTrackId && knownTrackId.length > 5 && !knownTrackId.includes('null')) {
    return knownTrackId;
  }

  const key = getCacheKey(title, artist);
  if (idCache.has(key)) {
    return idCache.get(key) || null;
  }

  if (inFlightResolutions.has(key)) {
    return inFlightResolutions.get(key)!;
  }

  const promise = (async (): Promise<string | null> => {
    try {
      const cleanTitle = (title || '')
        .replace(/\s*-\s*Remaster(ed)?\s*\d*/gi, '')
        .replace(/\s*\(Remaster(ed)?\s*\d*\)/gi, '')
        .replace(/\s*\[.*?\]/g, '')
        .replace(/\s*\(feat\..*?\)/gi, '')
        .replace(/\s*\(with.*?\)/gi, '')
        .trim();
      const query = [artist, cleanTitle].filter(Boolean).join(' ');
      if (!query.trim()) return null;

      // 1. Search iTunes for the track to obtain official Apple Music metadata
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`,
        { mode: 'cors' }
      );
      if (!itunesRes.ok) return null;

      const itunesData = await itunesRes.json();
      if (!itunesData.results || itunesData.results.length === 0) return null;

      const trackViewUrl = itunesData.results[0].trackViewUrl;
      if (!trackViewUrl) return null;

      // 2. Query Songlink (Odesli) API to cross-resolve to Spotify track ID
      const songlinkRes = await fetch(
        `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(trackViewUrl)}`,
        { mode: 'cors' }
      );
      if (!songlinkRes.ok) return null;

      const songlinkData = await songlinkRes.json();
      const spotifyPlatform = songlinkData?.linksByPlatform?.spotify;

      if (spotifyPlatform) {
        let spotifyId: string | null = null;
        if (spotifyPlatform.entityUniqueId) {
          // Format is typically "SPOTIFY_SONG::[id]"
          const parts = spotifyPlatform.entityUniqueId.split('::');
          spotifyId = parts[parts.length - 1];
        } else if (spotifyPlatform.url) {
          const match = spotifyPlatform.url.match(/track\/([a-zA-Z0-9]+)/);
          if (match) spotifyId = match[1];
        }

        if (spotifyId) {
          idCache.set(key, spotifyId);
          saveCache();
          return spotifyId;
        }
      }
    } catch {
      // Fallback
    }

    return null;
  })();

  inFlightResolutions.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlightResolutions.delete(key);
  }
}
