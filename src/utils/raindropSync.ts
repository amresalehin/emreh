import { TimelineItem } from '../types';
import { extractDomain } from './urlMetadata';
import { normalizeTimestamp } from './dataParser';
import { resilientFetch, RateLimitDetails, SyncErrorCategory } from './resilientFetch';

export interface RaindropConfig {
  apiToken: string;
  autoSync: boolean;
  lastSyncTime: string | null;
  lastSyncCount: number;
  selectedCollectionId: number; // 0 for all, -1 for unsorted, or specific ID
  collectionName?: string;
  userName?: string;
  userEmail?: string;
}

export interface RaindropCollection {
  _id: number;
  title: string;
  count: number;
  color?: string;
}

export interface RaindropSyncResult {
  items: TimelineItem[];
  notes: Record<string, string>;
  tags: Record<string, string[]>;
  snapshots: Record<string, string>;
  count: number;
  collectionTitles: Record<number, string>;
  rateLimit?: RateLimitDetails;
  isProxied?: boolean;
  statusCode?: number;
  category?: SyncErrorCategory;
}

const STORAGE_KEY = 'raindrop_sync_config';

export const DEFAULT_RAINDROP_CONFIG: RaindropConfig = {
  apiToken: '',
  autoSync: false,
  lastSyncTime: null,
  lastSyncCount: 0,
  selectedCollectionId: 0,
  collectionName: 'All Bookmarks'
};

export function getRaindropConfig(): RaindropConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_RAINDROP_CONFIG };
    return { ...DEFAULT_RAINDROP_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_RAINDROP_CONFIG };
  }
}

export function saveRaindropConfig(cfg: Partial<RaindropConfig>): RaindropConfig {
  try {
    const current = getRaindropConfig();
    const updated = { ...current, ...cfg };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save Raindrop config to localStorage', err);
    return { ...DEFAULT_RAINDROP_CONFIG, ...cfg };
  }
}

export function clearRaindropConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to remove Raindrop config', err);
  }
}

/**
 * Validates a Raindrop API token by fetching user profile.
 */
export async function testRaindropConnection(token: string): Promise<{
  ok: boolean;
  user?: { id: number; name: string; email: string };
  error?: string;
  rateLimit?: RateLimitDetails;
  statusCode?: number;
  category?: SyncErrorCategory;
  isProxied?: boolean;
}> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { ok: false, error: 'Please enter a Raindrop.io API token.' };
  }

  const res = await resilientFetch<any>('https://api.raindrop.io/rest/v1/user', {
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    return {
      ok: false,
      error: res.error || `Raindrop API returned error: HTTP ${res.status}`,
      statusCode: res.status,
      category: res.category,
      rateLimit: res.rateLimit,
      isProxied: res.isProxied
    };
  }

  const data = res.data;
  if (data && data.item) {
    return {
      ok: true,
      user: {
        id: data.item._id,
        name: data.item.fullName || data.item.name || 'Raindrop User',
        email: data.item.email || ''
      },
      rateLimit: res.rateLimit,
      isProxied: res.isProxied
    };
  }

  return { ok: true, rateLimit: res.rateLimit, isProxied: res.isProxied };
}

/**
 * Fetches user collections from Raindrop.io.
 */
export async function fetchRaindropCollections(token: string): Promise<RaindropCollection[]> {
  const cleanToken = token.trim();
  if (!cleanToken) return [];

  try {
    const res = await resilientFetch<any>('https://api.raindrop.io/rest/v1/collections', {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/json'
      }
    });

    if (!res.ok || !res.data) return [];
    const data = res.data;
    const list: RaindropCollection[] = [
      { _id: 0, title: 'All Bookmarks', count: 0 },
      { _id: -1, title: 'Unsorted', count: 0 }
    ];

    if (Array.isArray(data.items)) {
      data.items.forEach((c: any) => {
        list.push({
          _id: c._id,
          title: c.title || `Collection #${c._id}`,
          count: c.count || 0,
          color: c.color
        });
      });
    }

    return list;
  } catch (err) {
    console.warn('Failed to fetch Raindrop collections:', err);
    return [{ _id: 0, title: 'All Bookmarks', count: 0 }];
  }
}

/**
 * Synchronizes bookmarks directly from the Raindrop.io REST API.
 */
export async function syncRaindropBookmarks(options: {
  token?: string;
  collectionId?: number;
  onProgress?: (message: string, percent: number) => void;
  maxItems?: number;
}): Promise<RaindropSyncResult> {
  const cfg = getRaindropConfig();
  const token = (options.token || cfg.apiToken).trim();
  const collectionId = options.collectionId ?? cfg.selectedCollectionId ?? 0;
  const onProgress = options.onProgress || (() => {});
  const maxItems = options.maxItems || 2500;

  if (!token) {
    throw new Error('Raindrop API token is not configured. Please set up your token first.');
  }

  onProgress('Connecting to Raindrop.io (with CORS resilience)...', 10);

  // 1. Fetch collections for mapping IDs to names
  const collectionMap: Record<number, string> = {
    0: 'All',
    [-1]: 'Unsorted',
    [-99]: 'Trash'
  };

  try {
    const colls = await fetchRaindropCollections(token);
    colls.forEach(c => {
      collectionMap[c._id] = c.title;
    });
  } catch (e) {
    console.warn('Could not fetch collection names:', e);
  }

  onProgress('Fetching bookmarks...', 25);

  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};

  let page = 0;
  const perPage = 50;
  let totalCount = 0;
  let hasMore = true;
  let lastRateLimit: RateLimitDetails | undefined;
  let isProxied = false;

  while (hasMore && items.length < maxItems) {
    const url = `https://api.raindrop.io/rest/v1/raindrops/${collectionId}?perpage=${perPage}&page=${page}&sort=-created`;
    const res = await resilientFetch<any>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    if (res.rateLimit) lastRateLimit = res.rateLimit;
    if (res.isProxied) isProxied = true;

    if (!res.ok) {
      const customErr: any = new Error(res.error || `Raindrop API responded with status ${res.status}`);
      customErr.status = res.status;
      customErr.category = res.category;
      customErr.rateLimit = res.rateLimit;
      customErr.isProxied = res.isProxied;
      throw customErr;
    }

    const data = res.data;
    const rawItems: any[] = Array.isArray(data?.items) ? data.items : [];
    if (page === 0 && typeof data?.count === 'number') {
      totalCount = data.count;
    }

    if (rawItems.length === 0) {
      hasMore = false;
      break;
    }

    for (const r of rawItems) {
      const link = r.link || r.url;
      if (!link) continue;

      const domain = r.domain || extractDomain(link);
      const rawDate = r.created || r.lastUpdate || new Date().toISOString();
      const ts = normalizeTimestamp(rawDate) || new Date().toISOString();
      const dateObj = new Date(ts);
      const title = r.title || r.excerpt || link;
      const collId = r.collection?.$id;
      const collectionName = collId !== undefined && collectionMap[collId] ? collectionMap[collId] : undefined;

      const timelineItem: TimelineItem = {
        id: `raindrop_${r._id || `${ts}_${encodeURIComponent(link)}`}`,
        type: 'browser',
        ts,
        dateObj,
        title,
        subtitle: collectionName ? `${domain} • [${collectionName}]` : domain,
        url: link,
        domain,
        favicon_url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
        transition: 'BOOKMARK',
        platform: 'Raindrop.io'
      };

      items.push(timelineItem);

      // Extract User Notes & Excerpt
      const combinedNote = [r.note, r.excerpt].filter(Boolean).join('\n\n');
      if (combinedNote.trim()) {
        notes[link] = combinedNote.trim();
      }

      // Extract Tags
      const rawTags: string[] = Array.isArray(r.tags) ? r.tags : [];
      if (collectionName && collectionName !== 'All' && collectionName !== 'Unsorted') {
        if (!rawTags.includes(collectionName)) {
          rawTags.push(collectionName);
        }
      }
      if (rawTags.length > 0) {
        tags[link] = Array.from(new Set(rawTags.map(t => String(t).trim()).filter(Boolean)));
      }

      // Extract Cover / Thumbnail
      const coverUrl = r.cover || (Array.isArray(r.media) && r.media[0]?.link) || null;
      if (coverUrl) {
        snapshots[link] = coverUrl;
      }
    }

    page++;
    const percent = totalCount > 0
      ? Math.min(95, Math.round(25 + (items.length / totalCount) * 70))
      : Math.min(90, 25 + page * 10);
    onProgress(`Synced ${items.length} ${totalCount > 0 ? `of ${totalCount}` : ''} bookmarks...`, percent);

    if (rawItems.length < perPage || (totalCount > 0 && items.length >= totalCount)) {
      hasMore = false;
    }
  }

  onProgress(`Synchronization complete! Processed ${items.length} bookmarks.`, 100);

  // Update config with last sync time and count
  saveRaindropConfig({
    lastSyncTime: new Date().toISOString(),
    lastSyncCount: items.length
  });

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    collectionTitles: collectionMap,
    rateLimit: lastRateLimit,
    isProxied
  };
}

/**
 * Standard CSV line parser that respects quoted commas and multiline cells.
 */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += c;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses Raindrop CSV export file.
 * Common columns: id, title, note, excerpt, url, tags, created, collection, cover
 */
export function parseRaindropCsv(csvText: string): RaindropSyncResult {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return { items: [], notes: {}, tags: {}, snapshots: {}, count: 0, collectionTitles: {} };
  }

  // Header matching
  const headers = rows[0].map(h => h.toLowerCase().trim().replace(/^[\uFEFF]/, ''));
  const urlIdx = headers.findIndex(h => h === 'url' || h === 'link' || h === 'href');
  const titleIdx = headers.findIndex(h => h === 'title' || h === 'name');
  const noteIdx = headers.findIndex(h => h === 'note' || h === 'notes' || h === 'description');
  const excerptIdx = headers.findIndex(h => h === 'excerpt' || h === 'summary');
  const tagsIdx = headers.findIndex(h => h === 'tags' || h === 'tag');
  const dateIdx = headers.findIndex(h => h === 'created' || h === 'created_at' || h === 'date' || h === 'time');
  const collIdx = headers.findIndex(h => h === 'collection' || h === 'folder');
  const coverIdx = headers.findIndex(h => h === 'cover' || h === 'image' || h === 'preview');
  const idIdx = headers.findIndex(h => h === 'id' || h === '_id');

  if (urlIdx === -1) {
    throw new Error('CSV does not contain a "url" or "link" column header.');
  }

  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionTitles: Record<number, string> = {};

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const url = row[urlIdx]?.trim();
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) continue;

    const title = (titleIdx !== -1 && row[titleIdx]?.trim()) || url;
    const note = noteIdx !== -1 ? row[noteIdx]?.trim() : '';
    const excerpt = excerptIdx !== -1 ? row[excerptIdx]?.trim() : '';
    const rawDate = dateIdx !== -1 ? row[dateIdx]?.trim() : '';
    const collection = collIdx !== -1 ? row[collIdx]?.trim() : '';
    const cover = coverIdx !== -1 ? row[coverIdx]?.trim() : '';
    const idVal = idIdx !== -1 ? row[idIdx]?.trim() : `${r}`;

    const domain = extractDomain(url);
    const ts = normalizeTimestamp(rawDate) || new Date().toISOString();
    const dateObj = new Date(ts);

    items.push({
      id: `raindrop_csv_${idVal}_${encodeURIComponent(url)}`,
      type: 'browser',
      ts,
      dateObj,
      title,
      subtitle: collection ? `${domain} • [${collection}]` : domain,
      url,
      domain,
      favicon_url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
      transition: 'BOOKMARK',
      platform: 'Raindrop.io CSV'
    });

    const combinedNote = [note, excerpt].filter(Boolean).join('\n\n');
    if (combinedNote) {
      notes[url] = combinedNote;
    }

    const rowTags: string[] = [];
    if (tagsIdx !== -1 && row[tagsIdx]) {
      const splitTags = row[tagsIdx]
        .split(/[,;#]+/)
        .map(t => t.trim().replace(/^#/, ''))
        .filter(Boolean);
      rowTags.push(...splitTags);
    }
    if (collection && !rowTags.includes(collection)) {
      rowTags.push(collection);
    }
    if (rowTags.length > 0) {
      tags[url] = Array.from(new Set(rowTags));
    }

    if (cover) {
      snapshots[url] = cover;
    }
  }

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    collectionTitles
  };
}

/**
 * Parses Raindrop JSON export format.
 */
export function parseRaindropJson(jsonData: any): RaindropSyncResult {
  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionTitles: Record<number, string> = {};

  const list = Array.isArray(jsonData)
    ? jsonData
    : Array.isArray(jsonData?.items)
    ? jsonData.items
    : Array.isArray(jsonData?.bookmarks)
    ? jsonData.bookmarks
    : [];

  list.forEach((entry: any, idx: number) => {
    const url = entry.link || entry.url || entry.href;
    if (!url) return;

    const domain = entry.domain || extractDomain(url);
    const rawDate = entry.created || entry.created_at || entry.lastUpdate || entry.date || new Date().toISOString();
    const ts = normalizeTimestamp(rawDate) || new Date().toISOString();
    const title = entry.title || entry.name || url;
    const collName = entry.collection?.title || entry.collectionName || (typeof entry.collection === 'string' ? entry.collection : undefined);

    items.push({
      id: `raindrop_json_${entry._id || idx}_${encodeURIComponent(url)}`,
      type: 'browser',
      ts,
      dateObj: new Date(ts),
      title,
      subtitle: collName ? `${domain} • [${collName}]` : domain,
      url,
      domain,
      favicon_url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
      transition: 'BOOKMARK',
      platform: 'Raindrop.io JSON'
    });

    const combinedNote = [entry.note, entry.excerpt].filter(Boolean).join('\n\n');
    if (combinedNote) {
      notes[url] = combinedNote;
    }

    const rawTags: string[] = Array.isArray(entry.tags) ? [...entry.tags] : [];
    if (collName && !rawTags.includes(collName)) {
      rawTags.push(collName);
    }
    if (rawTags.length > 0) {
      tags[url] = Array.from(new Set(rawTags.map(t => String(t).trim()).filter(Boolean)));
    }

    const cover = entry.cover || (Array.isArray(entry.media) && entry.media[0]?.link);
    if (cover) {
      snapshots[url] = cover;
    }
  });

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    collectionTitles
  };
}

/**
 * Parses Raindrop HTML bookmark export (Netscape format with TAGS, ADD_DATE, and <DD> notes).
 */
export function parseRaindropHtml(htmlText: string): RaindropSyncResult {
  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionTitles: Record<number, string> = {};

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const anchors = doc.querySelectorAll('a[href]');

    anchors.forEach((a, idx) => {
      const url = a.getAttribute('href');
      if (!url || url.startsWith('javascript:') || url.startsWith('data:') || url === '#') return;

      const title = a.textContent?.trim() || url;
      const domain = extractDomain(url);
      const addDate = a.getAttribute('add_date') || a.getAttribute('last_visit') || a.getAttribute('created');
      let rawTime: any = null;
      if (addDate) {
        const num = parseInt(addDate, 10);
        rawTime = !isNaN(num) ? (num < 1e11 ? num * 1000 : num) : addDate;
      }
      const ts = normalizeTimestamp(rawTime || Date.now()) || new Date().toISOString();

      // Check for parent folder/collection heading
      let currentFolder = '';
      let parent = a.closest('dl');
      if (parent && parent.previousElementSibling && /^h\d$/i.test(parent.previousElementSibling.tagName)) {
        currentFolder = parent.previousElementSibling.textContent?.trim() || '';
      }

      // Tags attribute
      const tagAttr = a.getAttribute('tags') || a.getAttribute('tag');
      const itemTags: string[] = tagAttr ? tagAttr.split(',').map(t => t.trim()).filter(Boolean) : [];
      if (currentFolder && !itemTags.includes(currentFolder)) {
        itemTags.push(currentFolder);
      }

      // Check next sibling for <DD> note/description
      let note = '';
      let nextElem = a.nextElementSibling;
      if (nextElem && nextElem.tagName.toLowerCase() === 'dd') {
        note = nextElem.textContent?.trim() || '';
      }

      items.push({
        id: `raindrop_html_${idx}_${encodeURIComponent(url)}`,
        type: 'browser',
        ts,
        dateObj: new Date(ts),
        title,
        subtitle: currentFolder ? `${domain} • [${currentFolder}]` : domain,
        url,
        domain,
        favicon_url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
        transition: 'BOOKMARK',
        platform: 'Raindrop.io HTML'
      });

      if (note) {
        notes[url] = note;
      }

      if (itemTags.length > 0) {
        tags[url] = Array.from(new Set(itemTags));
      }
    });
  } catch (err) {
    console.warn('Error parsing Raindrop HTML export:', err);
  }

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    collectionTitles
  };
}
