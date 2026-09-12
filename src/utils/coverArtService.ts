// Album Artwork Resolution Service for Spotify and Audio Tracks

const CACHE_KEY = 'mylife_spotify_cover_cache_v2';

// In-memory cache for fast lookups
const inMemoryCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string | null>>();
// Tracks lookups that came back with no artwork at all, so we don't hammer
// Spotify oEmbed / iTunes with the same 2-3 network requests on every single
// re-render or scroll-into-view of the same track within this session.
const notFoundCache = new Set<string>();

// Load stored cache from localStorage on startup
try {
  const raw = localStorage.getItem(CACHE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([k, v]) => {
      if (typeof v === 'string') {
        inMemoryCache.set(k, v);
      }
    });
  }
} catch {
  // Ignore storage errors
}

function saveCacheToStorage() {
  try {
    const obj: Record<string, string> = {};
    // Cap localStorage cache at 500 items to avoid quota limits
    let count = 0;
    for (const [k, v] of inMemoryCache.entries()) {
      if (count++ > 500) break;
      obj[k] = v;
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Ignore quota errors
  }
}

function getCacheKey(title: string, artist?: string, trackId?: string | null): string {
  if (trackId) return `id_${trackId}`;
  const cleanTitle = (title || '').trim().toLowerCase();
  const cleanArtist = (artist || '').trim().toLowerCase();
  return `${cleanArtist}___${cleanTitle}`;
}

function cleanSongTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\s*-\s*Remaster(ed)?\s*\d*/gi, '')
    .replace(/\s*\(Remaster(ed)?\s*\d*\)/gi, '')
    .replace(/\s*\[.*?\]/g, '')
    .replace(/\s*\(feat\..*?\)/gi, '')
    .replace(/\s*\(with.*?\)/gi, '')
    .replace(/\s*\(Live.*?\)/gi, '')
    .trim();
}

/**
 * Resolves high-resolution album cover artwork using Spotify oEmbed and iTunes Public Search API
 */
export async function fetchCoverArt(
  title: string,
  artist?: string,
  trackId?: string | null
): Promise<string | null> {
  const key = getCacheKey(title, artist, trackId);

  // Check cache
  if (inMemoryCache.has(key)) {
    return inMemoryCache.get(key) || null;
  }

  // Skip re-fetching tracks we already confirmed have no artwork anywhere
  if (notFoundCache.has(key)) {
    return null;
  }

  // De-duplicate concurrent requests for the exact same track
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const promise = (async (): Promise<string | null> => {
    // 1. Try Spotify oEmbed if trackId is present
    if (trackId) {
      try {
        const res = await fetch(
          `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${encodeURIComponent(trackId)}`,
          { mode: 'cors' }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.thumbnail_url) {
            const url = data.thumbnail_url;
            inMemoryCache.set(key, url);
            saveCacheToStorage();
            return url;
          }
        }
      } catch {
        // Fall through to iTunes Search API
      }
    }

    // 2. Try iTunes Search API (Free, high-res, reliable, CORS enabled)
    try {
      const cleanTitle = cleanSongTitle(title);
      const query = [artist, cleanTitle].filter(Boolean).join(' ');
      if (query.trim().length > 0) {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`,
          { mode: 'cors' }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
            // Replace 100x100 with 600x600 for HD album artwork
            const hdArtwork = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
            inMemoryCache.set(key, hdArtwork);
            saveCacheToStorage();
            return hdArtwork;
          }
        }
      }
    } catch {
      // Fall through
    }

    // 3. Fallback: Search with artist only if title search didn't yield anything
    if (artist && artist.toLowerCase() !== 'unknown artist') {
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=musicArtist&limit=1`,
          { mode: 'cors' }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
            const hdArtwork = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
            inMemoryCache.set(key, hdArtwork);
            saveCacheToStorage();
            return hdArtwork;
          }
        }
      } catch {
        // Fall through
      }
    }

    return null;
  })();

  inFlightRequests.set(key, promise);
  try {
    const result = await promise;
    if (!result) {
      notFoundCache.add(key);
    }
    return result;
  } finally {
    inFlightRequests.delete(key);
  }
}

/**
 * Synchronous cache lookup helper
 */
export function getCachedCoverArt(title: string, artist?: string, trackId?: string | null): string | null {
  const key = getCacheKey(title, artist, trackId);
  return inMemoryCache.get(key) || null;
}

// In-memory cache for audio preview streams
const audioPreviewCache = new Map<string, string>();

/**
 * Resolves 30-second audio preview stream URL for tracks using iTunes Search API
 */
export async function fetchAudioPreview(title: string, artist?: string): Promise<string | null> {
  const cleanTitle = cleanSongTitle(title);
  const key = `${(artist || '').trim().toLowerCase()}___${cleanTitle.trim().toLowerCase()}`;

  if (audioPreviewCache.has(key)) {
    return audioPreviewCache.get(key) || null;
  }

  try {
    const query = [artist, cleanTitle].filter(Boolean).join(' ');
    if (query.trim().length > 0) {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`,
        { mode: 'cors' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0 && data.results[0].previewUrl) {
          const previewUrl = data.results[0].previewUrl;
          audioPreviewCache.set(key, previewUrl);
          return previewUrl;
        }
      }
    }
  } catch {
    // Ignore network error
  }

  return null;
}
