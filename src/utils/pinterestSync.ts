import { TimelineItem } from '../types';
import { extractDomain } from './urlMetadata';
import { UniversalBookmarkResult } from './bookmarkSyncServices';
import { resilientFetch, resilientFetchRss, RateLimitDetails, SyncErrorCategory } from './resilientFetch';

export interface PinterestConfig {
  apiToken: string;
  autoSync: boolean;
  lastSyncTime: string | null;
  lastSyncCount: number;
  selectedBoardId: string; // 'all' or specific board ID
  boardName?: string;
  username?: string;
  profileImage?: string;
  accountType?: string;
  publicBoardUrl?: string;
}

export interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  pin_count?: number;
  image_thumbnail_url?: string;
  privacy?: string;
}

export interface PinterestPin {
  id: string;
  title: string;
  description: string;
  link?: string; // original source website URL
  board_name?: string;
  board_id?: string;
  image_url: string;
  created_at: string;
  alt_text?: string;
  pin_url: string;
}

const STORAGE_KEY = 'pinterest_sync_config';

export const DEFAULT_PINTEREST_CONFIG: PinterestConfig = {
  apiToken: '',
  autoSync: false,
  lastSyncTime: null,
  lastSyncCount: 0,
  selectedBoardId: 'all',
  boardName: 'All Boards',
  publicBoardUrl: ''
};

export function getPinterestConfig(): PinterestConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PINTEREST_CONFIG };
    return { ...DEFAULT_PINTEREST_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PINTEREST_CONFIG };
  }
}

export function savePinterestConfig(cfg: Partial<PinterestConfig>): PinterestConfig {
  try {
    const current = getPinterestConfig();
    const updated = { ...current, ...cfg };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save Pinterest config to localStorage', err);
    return { ...DEFAULT_PINTEREST_CONFIG, ...cfg };
  }
}

export function clearPinterestConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to remove Pinterest config', err);
  }
}

/**
 * Validates a Pinterest API v5 token by fetching the user account profile.
 */
export async function testPinterestConnection(token: string): Promise<{
  ok: boolean;
  user?: { username: string; profile_image?: string; account_type?: string };
  error?: string;
  rateLimit?: RateLimitDetails;
  statusCode?: number;
  category?: SyncErrorCategory;
  isProxied?: boolean;
}> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { ok: false, error: 'Please enter a Pinterest API Access Token.' };
  }

  const res = await resilientFetch<any>('https://api.pinterest.com/v5/user_account', {
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    return {
      ok: false,
      error: res.error || `Pinterest API returned error HTTP ${res.status}`,
      statusCode: res.status,
      category: res.category,
      rateLimit: res.rateLimit,
      isProxied: res.isProxied
    };
  }

  const data = res.data;
  return {
    ok: true,
    user: {
      username: data?.username || 'Pinterest User',
      profile_image: data?.profile_image || '',
      account_type: data?.account_type || 'BUSINESS'
    },
    rateLimit: res.rateLimit,
    isProxied: res.isProxied
  };
}

/**
 * Fetches user boards from Pinterest API v5.
 */
export async function fetchPinterestBoards(token: string): Promise<PinterestBoard[]> {
  const cleanToken = token.trim();
  if (!cleanToken) return [{ id: 'all', name: 'All Boards', pin_count: 0 }];

  try {
    const res = await resilientFetch<any>('https://api.pinterest.com/v5/boards?page_size=100', {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/json'
      }
    });

    if (!res.ok || !res.data) return [{ id: 'all', name: 'All Boards', pin_count: 0 }];
    const data = res.data;
    const list: PinterestBoard[] = [
      { id: 'all', name: 'All Boards', pin_count: 0 }
    ];

    if (Array.isArray(data.items)) {
      data.items.forEach((b: any) => {
        list.push({
          id: b.id,
          name: b.name || `Board ${b.id}`,
          description: b.description || '',
          pin_count: b.pin_count || 0,
          privacy: b.privacy || 'PUBLIC'
        });
      });
    }

    return list;
  } catch (err) {
    console.warn('Failed to fetch Pinterest boards:', err);
    return [{ id: 'all', name: 'All Boards', pin_count: 0 }];
  }
}

/**
 * Syncs pins from Pinterest API v5 for a specific board or all boards.
 */
export async function syncPinterestPins(options: {
  token: string;
  boardId?: string;
  maxPins?: number;
}): Promise<UniversalBookmarkResult> {
  const token = options.token.trim();
  if (!token) {
    throw new Error('Pinterest access token is required.');
  }

  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionsSet = new Set<string>();

  // If specific board or all boards
  let endpoint = 'https://api.pinterest.com/v5/pins?page_size=100';
  if (options.boardId && options.boardId !== 'all') {
    endpoint = `https://api.pinterest.com/v5/boards/${options.boardId}/pins?page_size=100`;
  }

  const res = await resilientFetch<any>(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const customErr: any = new Error(res.error || `Pinterest API returned error HTTP ${res.status}`);
    customErr.status = res.status;
    customErr.category = res.category;
    customErr.rateLimit = res.rateLimit;
    customErr.isProxied = res.isProxied;
    throw customErr;
  }

  const data = res.data;
  const rawPins = Array.isArray(data?.items) ? data.items : [];

  rawPins.forEach((p: any) => {
    const pinId = p.id || Math.random().toString(36).substring(2, 9);
    const pinUrl = `https://www.pinterest.com/pin/${pinId}/`;
    const targetUrl = p.link || pinUrl;
    const title = p.title || p.description?.slice(0, 70) || 'Pinterest Pin';
    const desc = p.description || p.note || '';
    const boardName = p.board_name || 'Pinterest';
    const createdAt = p.created_at || new Date().toISOString();
    const dateObj = new Date(createdAt);

    // Extract best image
    let imageUrl = '';
    if (p.media?.images) {
      imageUrl =
        p.media.images['1200x']?.url ||
        p.media.images['600x']?.url ||
        p.media.images['original']?.url ||
        p.media.images['400x300']?.url ||
        '';
    }

    const domain = extractDomain(targetUrl);
    const timelineId = `pinterest_${pinId}`;

    collectionsSet.add(boardName);

    if (desc) {
      notes[targetUrl] = desc;
      if (pinUrl !== targetUrl) notes[pinUrl] = desc;
    }

    const itemTags = [boardName, 'Pinterest'].filter(Boolean);
    tags[targetUrl] = itemTags;
    if (pinUrl !== targetUrl) tags[pinUrl] = itemTags;

    if (imageUrl) {
      snapshots[targetUrl] = imageUrl;
      if (pinUrl !== targetUrl) snapshots[pinUrl] = imageUrl;
    }

    items.push({
      id: timelineId,
      type: 'browser',
      ts: dateObj.toISOString(),
      dateObj,
      title,
      subtitle: desc ? `${boardName}: ${desc.slice(0, 100)}` : `Board: ${boardName}`,
      url: targetUrl,
      domain,
      favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      transition: 'BOOKMARK',
      platform: 'Pinterest',
      category: boardName,
      image_url: imageUrl
    });
  });

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    service: 'Pinterest',
    collections: Array.from(collectionsSet),
    rateLimit: res.rateLimit,
    isProxied: res.isProxied
  };
}

/**
 * Parses Pinterest JSON data export (e.g. pins.json from Pinterest "Download your data" archive).
 */
export function parsePinterestJson(jsonText: string): UniversalBookmarkResult {
  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionsSet = new Set<string>();

  try {
    const raw = JSON.parse(jsonText);
    const list = Array.isArray(raw)
      ? raw
      : raw.pins || raw.items || raw.data || raw.results || [];

    list.forEach((p: any) => {
      const pinId = p.id || p.pin_id || Math.random().toString(36).substring(2, 9);
      const pinUrl = p.pin_url || p.url || `https://www.pinterest.com/pin/${pinId}/`;
      const targetUrl = p.link || p.source || p.destination_url || pinUrl;
      const title = p.title || p.description?.slice(0, 80) || p.note?.slice(0, 80) || 'Pinterest Pin';
      const desc = p.description || p.note || p.details || '';
      const boardName = p.board || p.board_name || p.collection || 'Pinterest';
      const timeStr = p.created_at || p.date || p.timestamp || p.date_added;
      let dateObj = new Date();
      if (timeStr) {
        const parsed = new Date(timeStr);
        if (!isNaN(parsed.getTime())) dateObj = parsed;
      }

      let imageUrl = '';
      if (typeof p.image === 'string') {
        imageUrl = p.image;
      } else if (typeof p.image_url === 'string') {
        imageUrl = p.image_url;
      } else if (p.media?.images) {
        imageUrl =
          p.media.images['1200x']?.url ||
          p.media.images['600x']?.url ||
          p.media.images['original']?.url ||
          '';
      }

      const domain = extractDomain(targetUrl);
      const timelineId = `pinterest_${pinId}_${dateObj.getTime()}`;

      collectionsSet.add(boardName);

      if (desc) {
        notes[targetUrl] = desc;
        if (pinUrl !== targetUrl) notes[pinUrl] = desc;
      }

      const itemTags = [boardName, 'Pinterest'].filter(Boolean);
      tags[targetUrl] = itemTags;
      if (pinUrl !== targetUrl) tags[pinUrl] = itemTags;

      if (imageUrl) {
        snapshots[targetUrl] = imageUrl;
        if (pinUrl !== targetUrl) snapshots[pinUrl] = imageUrl;
      }

      items.push({
        id: timelineId,
        type: 'browser',
        ts: dateObj.toISOString(),
        dateObj,
        title,
        subtitle: desc ? `${boardName}: ${desc.slice(0, 100)}` : `Board: ${boardName}`,
        url: targetUrl,
        domain,
        favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        transition: 'BOOKMARK',
        platform: 'Pinterest',
        category: boardName,
        image_url: imageUrl
      });
    });
  } catch (err) {
    console.error('Failed to parse Pinterest JSON:', err);
  }

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    service: 'Pinterest',
    collections: Array.from(collectionsSet)
  };
}

/**
 * Parses Pinterest CSV export (from browser extension or export services)
 */
export function parsePinterestCsv(csvText: string): UniversalBookmarkResult {
  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionsSet = new Set<string>();

  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return {
      items: [],
      notes: {},
      tags: {},
      snapshots: {},
      count: 0,
      service: 'Pinterest',
      collections: []
    };
  }

  // Parse header
  const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const titleIdx = header.findIndex(h => h.includes('title') || h.includes('name'));
  const descIdx = header.findIndex(h => h.includes('desc') || h.includes('note') || h.includes('body'));
  const linkIdx = header.findIndex(h => h.includes('link') || h.includes('source') || h.includes('target') || h.includes('destination'));
  const pinUrlIdx = header.findIndex(h => h.includes('pin') && h.includes('url'));
  const boardIdx = header.findIndex(h => h.includes('board') || h.includes('folder') || h.includes('category'));
  const imageIdx = header.findIndex(h => h.includes('image') || h.includes('photo') || h.includes('pic') || h.includes('media'));
  const dateIdx = header.findIndex(h => h.includes('date') || h.includes('created') || h.includes('time'));
  const idIdx = header.findIndex(h => h === 'id' || h.includes('pin_id'));

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length === 0) continue;

    const title = titleIdx !== -1 ? cols[titleIdx]?.trim() : '';
    const desc = descIdx !== -1 ? cols[descIdx]?.trim() : '';
    const link = linkIdx !== -1 ? cols[linkIdx]?.trim() : '';
    const pinUrl = pinUrlIdx !== -1 ? cols[pinUrlIdx]?.trim() : '';
    const board = boardIdx !== -1 ? cols[boardIdx]?.trim() : 'Pinterest';
    const image = imageIdx !== -1 ? cols[imageIdx]?.trim() : '';
    const dateStr = dateIdx !== -1 ? cols[dateIdx]?.trim() : '';
    const rawId = idIdx !== -1 ? cols[idIdx]?.trim() : '';

    const targetUrl = link || pinUrl;
    if (!targetUrl && !title) continue;

    const effectiveUrl = targetUrl || (rawId ? `https://www.pinterest.com/pin/${rawId}/` : `https://pinterest.com/item_${i}`);
    let dateObj = new Date();
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) dateObj = parsed;
    }

    const domain = extractDomain(effectiveUrl);
    const pinId = rawId || Math.random().toString(36).substring(2, 8);
    const timelineId = `pinterest_csv_${pinId}_${i}`;

    collectionsSet.add(board || 'Pinterest');

    if (desc) {
      notes[effectiveUrl] = desc;
    }

    const itemTags = [board, 'Pinterest'].filter(Boolean);
    tags[effectiveUrl] = itemTags;

    if (image) {
      snapshots[effectiveUrl] = image;
    }

    items.push({
      id: timelineId,
      type: 'browser',
      ts: dateObj.toISOString(),
      dateObj,
      title: title || desc.slice(0, 70) || 'Pinterest Pin',
      subtitle: desc ? `${board}: ${desc.slice(0, 100)}` : `Board: ${board}`,
      url: effectiveUrl,
      domain,
      favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      transition: 'BOOKMARK',
      platform: 'Pinterest',
      category: board || 'Pinterest',
      image_url: image
    });
  }

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    service: 'Pinterest',
    collections: Array.from(collectionsSet)
  };
}

/**
 * Fetches public Pinterest board or user pins via RSS feed.
 * E.g. https://www.pinterest.com/username/board-slug/
 */
export async function fetchPinterestRss(urlOrUsername: string, boardSlug?: string): Promise<UniversalBookmarkResult> {
  let cleanInput = urlOrUsername.trim();
  let rssUrl = '';

  // Case 1: Full Pinterest URL
  if (cleanInput.includes('pinterest.com')) {
    try {
      const parsed = new URL(cleanInput);
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length >= 2) {
        // e.g. /username/board-name/
        const user = segments[0];
        const board = segments[1].replace('.rss', '');
        rssUrl = `https://www.pinterest.com/${user}/${board}.rss`;
      } else if (segments.length === 1) {
        // e.g. /username/
        const user = segments[0];
        rssUrl = `https://www.pinterest.com/${user}/feed.rss`;
      }
    } catch {
      // Fallback
    }
  }

  // Case 2: username and board
  if (!rssUrl) {
    if (cleanInput.includes('/')) {
      const parts = cleanInput.split('/').filter(Boolean);
      rssUrl = `https://www.pinterest.com/${parts[0]}/${parts[1]}.rss`;
    } else if (boardSlug) {
      rssUrl = `https://www.pinterest.com/${cleanInput}/${boardSlug}.rss`;
    } else {
      rssUrl = `https://www.pinterest.com/${cleanInput}/feed.rss`;
    }
  }

  // Fetch with local backend proxy and resilient fallback
  const fetchResult = await resilientFetchRss(rssUrl);
  if (!fetchResult.ok || !fetchResult.xmlText) {
    throw new Error(fetchResult.error || `Could not access Pinterest RSS at ${rssUrl}. Ensure the board is public.`);
  }

  return parsePinterestRssXml(fetchResult.xmlText, rssUrl);
}

/**
 * Parses raw Pinterest RSS XML text into bookmark items with images.
 */
export function parsePinterestRssXml(xmlText: string, sourceUrl?: string): UniversalBookmarkResult {
  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionsSet = new Set<string>();

  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const channelTitle = xml.querySelector('channel > title')?.textContent?.trim() || 'Pinterest Board';
  const boardName = channelTitle.replace(/^.*?\/\s*/, '') || 'Pinterest';
  collectionsSet.add(boardName);

  const rawItems = xml.querySelectorAll('item');
  rawItems.forEach((item, idx) => {
    const title = item.querySelector('title')?.textContent?.trim() || 'Pinterest Pin';
    const link = item.querySelector('link')?.textContent?.trim() || '';
    const descHtml = item.querySelector('description')?.textContent?.trim() || '';
    const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';

    let dateObj = new Date();
    if (pubDate) {
      const parsed = new Date(pubDate);
      if (!isNaN(parsed.getTime())) dateObj = parsed;
    }

    // Extract high-res image and text description from HTML inside <description>
    let imageUrl = '';
    let cleanDesc = '';
    if (descHtml) {
      const doc = parser.parseFromString(descHtml, 'text/html');
      const img = doc.querySelector('img');
      if (img && img.src) {
        // Upgrade thumbnail /236x/ to /736x/ high-res
        imageUrl = img.src.replace('/236x/', '/736x/');
      }
      cleanDesc = doc.body.textContent?.trim() || '';
    }

    const pinUrl = link || `https://pinterest.com/pin_${idx}`;
    const domain = extractDomain(pinUrl);
    const id = `pinterest_rss_${dateObj.getTime()}_${idx}`;

    if (cleanDesc) {
      notes[pinUrl] = cleanDesc;
    }

    const itemTags = [boardName, 'Pinterest'].filter(Boolean);
    tags[pinUrl] = itemTags;

    if (imageUrl) {
      snapshots[pinUrl] = imageUrl;
    }

    items.push({
      id,
      type: 'browser',
      ts: dateObj.toISOString(),
      dateObj,
      title,
      subtitle: cleanDesc ? `${boardName}: ${cleanDesc.slice(0, 100)}` : `Board: ${boardName}`,
      url: pinUrl,
      domain,
      favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      transition: 'BOOKMARK',
      platform: 'Pinterest',
      category: boardName,
      image_url: imageUrl
    });
  });

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    service: 'Pinterest',
    collections: Array.from(collectionsSet)
  };
}

/**
 * Parses a list of pasted Pinterest URLs (single or multiple links)
 */
export function parsePinterestUrlBatch(rawText: string, customBoard = 'Pinterest'): UniversalBookmarkResult {
  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionsSet = new Set<string>([customBoard]);

  const lines = rawText.split(/[\r\n\s,;]+/).filter(l => l.trim().startsWith('http'));

  lines.forEach((url, i) => {
    let pinId = '';
    const match = url.match(/\/pin\/(\d+)/);
    if (match) {
      pinId = match[1];
    } else {
      pinId = Math.random().toString(36).substring(2, 9);
    }

    const title = pinId ? `Pinterest Pin #${pinId}` : 'Saved Pin';
    const dateObj = new Date();
    const id = `pinterest_manual_${pinId}_${i}`;
    const domain = 'pinterest.com';

    tags[url] = [customBoard, 'Pinterest'];

    items.push({
      id,
      type: 'browser',
      ts: dateObj.toISOString(),
      dateObj,
      title,
      subtitle: `Board: ${customBoard}`,
      url,
      domain,
      favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      transition: 'BOOKMARK',
      platform: 'Pinterest',
      category: customBoard
    });
  });

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    service: 'Pinterest',
    collections: Array.from(collectionsSet)
  };
}

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let curr = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        curr += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(curr);
      curr = '';
    } else {
      curr += c;
    }
  }
  result.push(curr);
  return result;
}
