// Bookmark Sync Services: Universal Bookmark parsers for Raindrop, Chrome/Firefox/Safari, Pocket, Pinboard, Linkding
import { TimelineItem } from '../types';
import { RateLimitDetails, SyncErrorCategory } from './resilientFetch';

export interface UniversalBookmarkResult {
  items: TimelineItem[];
  notes: Record<string, string>;
  tags: Record<string, string[]>;
  snapshots: Record<string, string>;
  count: number;
  service: string;
  collections: string[];
  rateLimit?: RateLimitDetails;
  isProxied?: boolean;
  statusCode?: number;
  category?: SyncErrorCategory;
}

export type BookmarkServiceName =
  | 'raindrop'
  | 'pinterest'
  | 'browser'
  | 'pocket'
  | 'pinboard'
  | 'linkding'
  | 'mymind'
  | 'fabric'
  | 'karakeep'
  | 'instapaper'
  | 'custom'
  | 'manual';

/**
 * Parses Netscape HTML bookmark files (used by Chrome, Firefox, Safari, Edge, Brave, Arc, Pocket exports)
 */
export function parseNetscapeBookmarksHtml(htmlText: string, defaultPlatform = 'Browser Bookmarks'): UniversalBookmarkResult {
  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionsSet = new Set<string>();

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');

  // Traverse DOM to preserve folder/collection hierarchy
  function traverse(node: Element, currentFolder: string) {
    for (const child of Array.from(node.children)) {
      const tagName = child.tagName.toUpperCase();

      if (tagName === 'H3') {
        currentFolder = child.textContent?.trim() || 'Bookmarks';
        collectionsSet.add(currentFolder);
      } else if (tagName === 'A') {
        const a = child as HTMLAnchorElement;
        const href = a.getAttribute('href') || '';
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          const title = a.textContent?.trim() || href;
          const addDateSec = a.getAttribute('add_date') || a.getAttribute('time_added');
          let dateObj = new Date();
          if (addDateSec) {
            const num = parseInt(addDateSec, 10);
            if (!isNaN(num)) {
              dateObj = num > 1e11 ? new Date(num) : new Date(num * 1000);
            }
          }

          let domain = 'web';
          try {
            domain = new URL(href).hostname.replace(/^www\./, '');
          } catch {
            // fallback
          }

          const icon = a.getAttribute('icon') || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
          const rawTags = a.getAttribute('tags');
          const parsedTags = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : [];
          if (parsedTags.length > 0) {
            tags[href] = parsedTags;
          }

          // Check if there is a DD sibling for notes/excerpts
          let noteText = '';
          const nextEl = child.nextElementSibling;
          if (nextEl && nextEl.tagName.toUpperCase() === 'DD') {
            noteText = nextEl.textContent?.trim() || '';
          }
          if (noteText) {
            notes[href] = noteText;
          }

          const id = `bm_${domain.replace(/[^a-zA-Z0-9]/g, '_')}_${dateObj.getTime()}_${Math.random().toString(36).substring(2, 6)}`;

          items.push({
            id,
            type: 'browser',
            ts: dateObj.toISOString(),
            dateObj,
            title,
            subtitle: noteText || (currentFolder ? `Folder: ${currentFolder}` : domain),
            url: href,
            domain,
            favicon_url: icon,
            transition: 'BOOKMARK',
            platform: defaultPlatform,
            category: currentFolder || 'Unsorted'
          });
        }
      }

      if (child.children && child.children.length > 0) {
        traverse(child, currentFolder);
      }
    }
  }

  traverse(doc.body, 'Bookmarks');

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    service: defaultPlatform,
    collections: Array.from(collectionsSet)
  };
}

/**
 * Parses Pocket export HTML (often titled "Pocket Export" or ril_export.html)
 */
export function parsePocketHtml(htmlText: string): UniversalBookmarkResult {
  return parseNetscapeBookmarksHtml(htmlText, 'Pocket');
}

/**
 * Parses Pinboard JSON export ([{ href, description, extended, tags, time }])
 */
export function parsePinboardJson(jsonText: string): UniversalBookmarkResult {
  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionsSet = new Set<string>();

  try {
    const raw = JSON.parse(jsonText);
    const list = Array.isArray(raw) ? raw : (raw.posts || []);

    list.forEach((p: any) => {
      const href = p.href || p.url;
      if (!href || typeof href !== 'string') return;
      if (!href.startsWith('http://') && !href.startsWith('https://')) return;

      const title = p.description || p.title || href;
      const extended = p.extended || p.notes || '';
      const timeStr = p.time || p.date || p.datetime;
      let dateObj = new Date();
      if (timeStr) {
        const parsed = new Date(timeStr);
        if (!isNaN(parsed.getTime())) dateObj = parsed;
      }

      let domain = 'web';
      try {
        domain = new URL(href).hostname.replace(/^www\./, '');
      } catch {
        // fallback
      }

      const itemTags: string[] = [];
      if (typeof p.tags === 'string') {
        itemTags.push(...p.tags.split(/\s+/).filter(Boolean));
      } else if (Array.isArray(p.tags)) {
        itemTags.push(...p.tags.filter(Boolean));
      }

      if (itemTags.length > 0) {
        tags[href] = itemTags;
      }
      if (extended) {
        notes[href] = extended;
      }

      collectionsSet.add('Pinboard');

      const id = `pinboard_${dateObj.getTime()}_${Math.random().toString(36).substring(2, 6)}`;
      items.push({
        id,
        type: 'browser',
        ts: dateObj.toISOString(),
        dateObj,
        title,
        subtitle: extended || domain,
        url: href,
        domain,
        favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        transition: 'BOOKMARK',
        platform: 'Pinboard',
        category: 'Pinboard'
      });
    });
  } catch (err) {
    console.error('Failed to parse Pinboard JSON:', err);
  }

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    service: 'Pinboard',
    collections: Array.from(collectionsSet)
  };
}

/**
 * Parses Linkding JSON export ({ results: [...] })
 */
export function parseLinkdingJson(jsonText: string): UniversalBookmarkResult {
  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionsSet = new Set<string>();

  try {
    const raw = JSON.parse(jsonText);
    const list = Array.isArray(raw) ? raw : (raw.results || raw.bookmarks || []);

    list.forEach((b: any) => {
      const url = b.url;
      if (!url || typeof url !== 'string') return;

      const title = b.title || url;
      const desc = b.description || b.notes || '';
      const dateStr = b.date_added || b.date_modified || b.created;
      let dateObj = new Date();
      if (dateStr) {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) dateObj = parsed;
      }

      let domain = 'web';
      try {
        domain = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        // fallback
      }

      const itemTags: string[] = Array.isArray(b.tag_names) ? b.tag_names : [];
      if (itemTags.length > 0) {
        tags[url] = itemTags;
      }
      if (desc) {
        notes[url] = desc;
      }

      collectionsSet.add('Linkding');

      const id = `linkding_${b.id || dateObj.getTime()}_${Math.random().toString(36).substring(2, 6)}`;
      items.push({
        id,
        type: 'browser',
        ts: dateObj.toISOString(),
        dateObj,
        title,
        subtitle: desc || domain,
        url,
        domain,
        favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        transition: 'BOOKMARK',
        platform: 'Linkding',
        category: 'Linkding'
      });
    });
  } catch (err) {
    console.error('Failed to parse Linkding JSON:', err);
  }

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    service: 'Linkding',
    collections: Array.from(collectionsSet)
  };
}

// ---------------------------------------------------------------------------
// Helpers for CSV and Text parsing
// ---------------------------------------------------------------------------

function splitCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField.trim());
      if (currentRow.length > 0 && currentRow.some(f => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function deriveCleanTitleFromUrl(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.replace(/^www\./, '');
    const pathname = parsed.pathname.replace(/\/$/, '');
    if (!pathname || pathname === '/') {
      return host.charAt(0).toUpperCase() + host.slice(1);
    }
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const last = decodeURIComponent(segments[segments.length - 1]).replace(/[-_]/g, ' ');
      if (last.length > 1) {
        return last.charAt(0).toUpperCase() + last.slice(1);
      }
    }
    return host;
  } catch {
    return urlStr;
  }
}

// ---------------------------------------------------------------------------
// 1. mymind Parser (JSON, CSV, Netscape HTML)
// ---------------------------------------------------------------------------
export function parseMymindExport(rawText: string): UniversalBookmarkResult {
  const trimmed = rawText.trim();

  // If HTML format, delegate to Netscape parser
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<DL') || trimmed.includes('<H3>') || trimmed.includes('<A HREF=')) {
    return parseNetscapeBookmarksHtml(trimmed, 'mymind');
  }

  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionsSet = new Set<string>();
  collectionsSet.add('mymind');

  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed)
        ? parsed
        : (parsed.cards || parsed.objects || parsed.items || parsed.bookmarks || parsed.notes || [parsed]);

      list.forEach((item: any, idx: number) => {
        const rawUrl = item.url || item.link || item.website || item.sourceUrl || item.source || '';
        const title = item.title || item.headline || item.name || item.text?.slice(0, 60) || (rawUrl ? deriveCleanTitleFromUrl(rawUrl) : `mymind note #${idx + 1}`);
        const note = item.note || item.notes || item.text || item.quote || item.snippet || item.content || '';
        const color = item.color || item.cardColor || '';
        const image = item.image || item.imageUrl || item.thumbnail || item.preview || '';
        const type = item.type || (rawUrl ? 'bookmark' : 'note');
        const folder = item.folder || item.space || (type ? `mymind (${type})` : 'mymind');
        collectionsSet.add(folder);

        // Date extraction
        const dateVal = item.createdAt || item.created_at || item.date || item.timestamp;
        let dateObj = new Date();
        if (dateVal) {
          const d = new Date(dateVal);
          if (!isNaN(d.getTime())) dateObj = d;
        }

        // Tags
        const rawTags = item.tags || item.labels || [];
        const itemTags: string[] = [];
        if (Array.isArray(rawTags)) {
          itemTags.push(...rawTags.map((t: any) => String(t).trim()).filter(Boolean));
        } else if (typeof rawTags === 'string') {
          itemTags.push(...rawTags.split(/[,\s]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean));
        }

        const validUrl = rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
          ? rawUrl
          : `https://mymind.com/card/${dateObj.getTime()}_${idx}`;

        let domain = 'mymind.com';
        try {
          domain = new URL(validUrl).hostname.replace(/^www\./, '');
        } catch {
          // fallback
        }

        if (itemTags.length > 0) tags[validUrl] = itemTags;
        if (note) notes[validUrl] = note;
        if (image) snapshots[validUrl] = image;

        const id = `mymind_${dateObj.getTime()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
        items.push({
          id,
          type: 'browser',
          ts: dateObj.toISOString(),
          dateObj,
          title,
          subtitle: note || (color ? `Color: ${color}` : domain),
          url: validUrl,
          domain,
          favicon_url: image || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          transition: 'BOOKMARK',
          platform: 'mymind',
          category: folder
        });
      });

      return {
        items,
        notes,
        tags,
        snapshots,
        count: items.length,
        service: 'mymind',
        collections: Array.from(collectionsSet)
      };
    } catch (e) {
      console.warn('mymind JSON parse error, falling back to CSV/text:', e);
    }
  }

  // Fallback: CSV parsing
  const rows = splitCsvRows(trimmed);
  if (rows.length > 1) {
    const header = rows[0].map(h => h.toLowerCase());
    const urlIdx = header.findIndex(h => h.includes('url') || h.includes('link'));
    const titleIdx = header.findIndex(h => h.includes('title') || h.includes('name'));
    const noteIdx = header.findIndex(h => h.includes('note') || h.includes('text') || h.includes('snippet'));
    const tagIdx = header.findIndex(h => h.includes('tag') || h.includes('label'));
    const dateIdx = header.findIndex(h => h.includes('date') || h.includes('created'));
    const typeIdx = header.findIndex(h => h.includes('type'));

    rows.slice(1).forEach((row, idx) => {
      const rawUrl = urlIdx >= 0 ? row[urlIdx] : '';
      const title = (titleIdx >= 0 ? row[titleIdx] : '') || (rawUrl ? deriveCleanTitleFromUrl(rawUrl) : `mymind #${idx + 1}`);
      const note = noteIdx >= 0 ? row[noteIdx] : '';
      const type = (typeIdx >= 0 ? row[typeIdx] : '') || 'card';
      const folder = `mymind (${type})`;
      collectionsSet.add(folder);

      let dateObj = new Date();
      if (dateIdx >= 0 && row[dateIdx]) {
        const d = new Date(row[dateIdx]);
        if (!isNaN(d.getTime())) dateObj = d;
      }

      const validUrl = rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
        ? rawUrl
        : `https://mymind.com/card/${dateObj.getTime()}_${idx}`;

      let domain = 'mymind.com';
      try {
        domain = new URL(validUrl).hostname.replace(/^www\./, '');
      } catch {
        // fallback
      }

      if (tagIdx >= 0 && row[tagIdx]) {
        const rowTags = row[tagIdx].split(/[,\s]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean);
        if (rowTags.length > 0) tags[validUrl] = rowTags;
      }
      if (note) notes[validUrl] = note;

      items.push({
        id: `mymind_${dateObj.getTime()}_${idx}`,
        type: 'browser',
        ts: dateObj.toISOString(),
        dateObj,
        title,
        subtitle: note || domain,
        url: validUrl,
        domain,
        favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        transition: 'BOOKMARK',
        platform: 'mymind',
        category: folder
      });
    });
  }

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    service: 'mymind',
    collections: Array.from(collectionsSet)
  };
}

// ---------------------------------------------------------------------------
// 2. Fabric.so Parser (JSON, CSV, Netscape HTML)
// ---------------------------------------------------------------------------
export function parseFabricExport(rawText: string): UniversalBookmarkResult {
  const trimmed = rawText.trim();

  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<DL') || trimmed.includes('<H3>') || trimmed.includes('<A HREF=')) {
    return parseNetscapeBookmarksHtml(trimmed, 'Fabric.so');
  }

  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionsSet = new Set<string>();
  collectionsSet.add('Fabric Workspace');

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed)
        ? parsed
        : (parsed.bookmarks || parsed.items || parsed.blocks || parsed.results || [parsed]);

      list.forEach((item: any, idx: number) => {
        const url = item.url || item.link || item.href || '';
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return;

        const title = item.title || item.name || deriveCleanTitleFromUrl(url);
        const note = item.notes || item.comment || item.summary || item.excerpt || item.description || '';
        const workspace = item.workspace || item.space || item.folder || item.collection || 'Fabric Workspace';
        collectionsSet.add(workspace);

        const dateVal = item.createdAt || item.created_at || item.date_added || item.date;
        let dateObj = new Date();
        if (dateVal) {
          const d = new Date(dateVal);
          if (!isNaN(d.getTime())) dateObj = d;
        }

        const rawTags = item.tags || item.labels || [];
        const itemTags: string[] = [];
        if (Array.isArray(rawTags)) {
          itemTags.push(...rawTags.map(t => String(t).trim()).filter(Boolean));
        } else if (typeof rawTags === 'string') {
          itemTags.push(...rawTags.split(/[,;\s]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean));
        }

        let domain = 'web';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          // fallback
        }

        if (itemTags.length > 0) tags[url] = itemTags;
        if (note) notes[url] = note;
        if (item.image || item.screenshot || item.thumbnail) {
          snapshots[url] = item.image || item.screenshot || item.thumbnail;
        }

        items.push({
          id: `fabric_${dateObj.getTime()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'browser',
          ts: dateObj.toISOString(),
          dateObj,
          title,
          subtitle: note || (workspace !== 'Fabric Workspace' ? `Space: ${workspace}` : domain),
          url,
          domain,
          favicon_url: item.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          transition: 'BOOKMARK',
          platform: 'Fabric.so',
          category: workspace
        });
      });

      return {
        items,
        notes,
        tags,
        snapshots,
        count: items.length,
        service: 'Fabric.so',
        collections: Array.from(collectionsSet)
      };
    } catch (e) {
      console.warn('Fabric JSON parse error, checking CSV:', e);
    }
  }

  // Fallback: CSV format
  const rows = splitCsvRows(trimmed);
  if (rows.length > 1) {
    const header = rows[0].map(h => h.toLowerCase());
    const urlIdx = header.findIndex(h => h.includes('url') || h.includes('link'));
    const titleIdx = header.findIndex(h => h.includes('title') || h.includes('name'));
    const descIdx = header.findIndex(h => h.includes('desc') || h.includes('note') || h.includes('summary'));
    const tagIdx = header.findIndex(h => h.includes('tag'));
    const folderIdx = header.findIndex(h => h.includes('folder') || h.includes('space') || h.includes('workspace'));
    const dateIdx = header.findIndex(h => h.includes('date') || h.includes('created'));

    if (urlIdx >= 0) {
      rows.slice(1).forEach((row, idx) => {
        const url = row[urlIdx];
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return;

        const title = (titleIdx >= 0 ? row[titleIdx] : '') || deriveCleanTitleFromUrl(url);
        const desc = descIdx >= 0 ? row[descIdx] : '';
        const folder = (folderIdx >= 0 ? row[folderIdx] : '') || 'Fabric Workspace';
        collectionsSet.add(folder);

        let dateObj = new Date();
        if (dateIdx >= 0 && row[dateIdx]) {
          const d = new Date(row[dateIdx]);
          if (!isNaN(d.getTime())) dateObj = d;
        }

        let domain = 'web';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          // fallback
        }

        if (tagIdx >= 0 && row[tagIdx]) {
          const tList = row[tagIdx].split(/[,;\s]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean);
          if (tList.length > 0) tags[url] = tList;
        }
        if (desc) notes[url] = desc;

        items.push({
          id: `fabric_${dateObj.getTime()}_${idx}`,
          type: 'browser',
          ts: dateObj.toISOString(),
          dateObj,
          title,
          subtitle: desc || domain,
          url,
          domain,
          favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          transition: 'BOOKMARK',
          platform: 'Fabric.so',
          category: folder
        });
      });
    }
  }

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    service: 'Fabric.so',
    collections: Array.from(collectionsSet)
  };
}

// ---------------------------------------------------------------------------
// 3. KaraKeep Parser (JSON, CSV, Netscape HTML)
// ---------------------------------------------------------------------------
export function parseKarakeepExport(rawText: string): UniversalBookmarkResult {
  const trimmed = rawText.trim();

  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<DL') || trimmed.includes('<H3>') || trimmed.includes('<A HREF=')) {
    return parseNetscapeBookmarksHtml(trimmed, 'KaraKeep');
  }

  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionsSet = new Set<string>();
  collectionsSet.add('KaraKeep');

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed)
        ? parsed
        : (parsed.bookmarks || parsed.items || parsed.links || parsed.data || [parsed]);

      list.forEach((item: any, idx: number) => {
        const url = item.url || item.link || item.href || '';
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return;

        const title = item.title || item.name || deriveCleanTitleFromUrl(url);
        const desc = item.description || item.notes || item.summary || item.highlights || '';
        const collection = item.collection || item.folder || item.category || 'KaraKeep';
        collectionsSet.add(collection);

        const dateVal = item.timestamp || item.createdAt || item.date || item.created;
        let dateObj = new Date();
        if (dateVal) {
          const num = typeof dateVal === 'number' ? dateVal : parseInt(dateVal, 10);
          if (!isNaN(num) && num > 1e9) {
            dateObj = num > 1e11 ? new Date(num) : new Date(num * 1000);
          } else {
            const d = new Date(dateVal);
            if (!isNaN(d.getTime())) dateObj = d;
          }
        }

        const rawTags = item.tags || item.labels || [];
        const itemTags: string[] = [];
        if (Array.isArray(rawTags)) {
          itemTags.push(...rawTags.map(t => String(t).trim()).filter(Boolean));
        } else if (typeof rawTags === 'string') {
          itemTags.push(...rawTags.split(/[,;\s]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean));
        }

        let domain = 'web';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          // fallback
        }

        if (itemTags.length > 0) tags[url] = itemTags;
        if (desc) notes[url] = desc;
        if (item.screenshot || item.image || item.cover) {
          snapshots[url] = item.screenshot || item.image || item.cover;
        }

        items.push({
          id: `karakeep_${dateObj.getTime()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'browser',
          ts: dateObj.toISOString(),
          dateObj,
          title,
          subtitle: desc || domain,
          url,
          domain,
          favicon_url: item.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          transition: 'BOOKMARK',
          platform: 'KaraKeep',
          category: collection
        });
      });

      return {
        items,
        notes,
        tags,
        snapshots,
        count: items.length,
        service: 'KaraKeep',
        collections: Array.from(collectionsSet)
      };
    } catch (e) {
      console.warn('KaraKeep JSON parse error:', e);
    }
  }

  // Fallback: CSV
  const rows = splitCsvRows(trimmed);
  if (rows.length > 1) {
    const header = rows[0].map(h => h.toLowerCase());
    const urlIdx = header.findIndex(h => h.includes('url') || h.includes('link'));
    const titleIdx = header.findIndex(h => h.includes('title') || h.includes('name'));
    const descIdx = header.findIndex(h => h.includes('desc') || h.includes('note') || h.includes('summary'));
    const tagIdx = header.findIndex(h => h.includes('tag'));
    const colIdx = header.findIndex(h => h.includes('collection') || h.includes('folder'));
    const dateIdx = header.findIndex(h => h.includes('date') || h.includes('time'));

    if (urlIdx >= 0) {
      rows.slice(1).forEach((row, idx) => {
        const url = row[urlIdx];
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return;

        const title = (titleIdx >= 0 ? row[titleIdx] : '') || deriveCleanTitleFromUrl(url);
        const desc = descIdx >= 0 ? row[descIdx] : '';
        const col = (colIdx >= 0 ? row[colIdx] : '') || 'KaraKeep';
        collectionsSet.add(col);

        let dateObj = new Date();
        if (dateIdx >= 0 && row[dateIdx]) {
          const d = new Date(row[dateIdx]);
          if (!isNaN(d.getTime())) dateObj = d;
        }

        let domain = 'web';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          // fallback
        }

        if (tagIdx >= 0 && row[tagIdx]) {
          const tList = row[tagIdx].split(/[,;\s]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean);
          if (tList.length > 0) tags[url] = tList;
        }
        if (desc) notes[url] = desc;

        items.push({
          id: `karakeep_${dateObj.getTime()}_${idx}`,
          type: 'browser',
          ts: dateObj.toISOString(),
          dateObj,
          title,
          subtitle: desc || domain,
          url,
          domain,
          favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          transition: 'BOOKMARK',
          platform: 'KaraKeep',
          category: col
        });
      });
    }
  }

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    service: 'KaraKeep',
    collections: Array.from(collectionsSet)
  };
}

// ---------------------------------------------------------------------------
// 4. Instapaper Parser (CSV, Netscape HTML, JSON)
// ---------------------------------------------------------------------------
export function parseInstapaperExport(rawText: string): UniversalBookmarkResult {
  const trimmed = rawText.trim();

  // Netscape HTML export format
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<DL') || trimmed.includes('<H3>') || trimmed.includes('<A HREF=')) {
    return parseNetscapeBookmarksHtml(trimmed, 'Instapaper');
  }

  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionsSet = new Set<string>();
  collectionsSet.add('Instapaper');

  // Standard Instapaper CSV Export format (URL, Title, Selection, Folder, Timestamp)
  const rows = splitCsvRows(trimmed);
  if (rows.length > 1) {
    const header = rows[0].map(h => h.toLowerCase());
    const urlIdx = header.findIndex(h => h === 'url' || h.includes('url') || h.includes('link'));
    const titleIdx = header.findIndex(h => h === 'title' || h.includes('title'));
    const selIdx = header.findIndex(h => h === 'selection' || h.includes('selection') || h.includes('note') || h.includes('summary'));
    const folderIdx = header.findIndex(h => h === 'folder' || h.includes('folder'));
    const timeIdx = header.findIndex(h => h === 'timestamp' || h.includes('time') || h.includes('date'));

    if (urlIdx >= 0) {
      rows.slice(1).forEach((row, idx) => {
        const url = row[urlIdx];
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return;

        const title = (titleIdx >= 0 ? row[titleIdx] : '') || deriveCleanTitleFromUrl(url);
        const selection = selIdx >= 0 ? row[selIdx] : '';
        const folder = (folderIdx >= 0 ? row[folderIdx] : '') || 'Unread';
        collectionsSet.add(folder);

        let dateObj = new Date();
        if (timeIdx >= 0 && row[timeIdx]) {
          const rawTime = row[timeIdx];
          const num = parseInt(rawTime, 10);
          if (!isNaN(num)) {
            dateObj = num > 1e11 ? new Date(num) : new Date(num * 1000);
          } else {
            const d = new Date(rawTime);
            if (!isNaN(d.getTime())) dateObj = d;
          }
        }

        let domain = 'web';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          // fallback
        }

        if (selection) {
          notes[url] = selection;
        }

        tags[url] = ['instapaper', folder.toLowerCase()];

        items.push({
          id: `instapaper_${dateObj.getTime()}_${idx}`,
          type: 'browser',
          ts: dateObj.toISOString(),
          dateObj,
          title,
          subtitle: selection || (folder !== 'Unread' ? `Folder: ${folder}` : domain),
          url,
          domain,
          favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          transition: 'BOOKMARK',
          platform: 'Instapaper',
          category: folder
        });
      });

      return {
        items,
        notes,
        tags,
        snapshots,
        count: items.length,
        service: 'Instapaper',
        collections: Array.from(collectionsSet)
      };
    }
  }

  // JSON export
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : (parsed.bookmarks || parsed.items || [parsed]);

      list.forEach((item: any, idx: number) => {
        const url = item.url || item.link;
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return;

        const title = item.title || deriveCleanTitleFromUrl(url);
        const folder = item.folder || 'Unread';
        const note = item.description || item.selection || item.notes || '';
        collectionsSet.add(folder);

        let dateObj = new Date();
        if (item.time || item.timestamp) {
          const num = parseInt(item.time || item.timestamp, 10);
          if (!isNaN(num)) dateObj = num > 1e11 ? new Date(num) : new Date(num * 1000);
        }

        let domain = 'web';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          // fallback
        }

        if (note) notes[url] = note;
        tags[url] = ['instapaper', folder.toLowerCase()];

        items.push({
          id: `instapaper_${dateObj.getTime()}_${idx}`,
          type: 'browser',
          ts: dateObj.toISOString(),
          dateObj,
          title,
          subtitle: note || domain,
          url,
          domain,
          favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          transition: 'BOOKMARK',
          platform: 'Instapaper',
          category: folder
        });
      });
    } catch (e) {
      console.warn('Instapaper JSON error:', e);
    }
  }

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    service: 'Instapaper',
    collections: Array.from(collectionsSet)
  };
}

// ---------------------------------------------------------------------------
// 5. God Mode Custom Importer (Universal Multi-Format Ingestion Engine)
// ---------------------------------------------------------------------------
export interface GodModeImportOptions {
  defaultPlatform?: string;
  defaultFolder?: string;
  fallbackTags?: string[];
}

export function parseGodModeCustomImport(
  rawText: string,
  options: GodModeImportOptions = {}
): UniversalBookmarkResult & { detectedFormat: string } {
  const platformName = options.defaultPlatform || 'Custom Archive';
  const defaultFolder = options.defaultFolder || 'General';
  const fallbackTags = options.fallbackTags || [];

  const items: TimelineItem[] = [];
  const notes: Record<string, string> = {};
  const tags: Record<string, string[]> = {};
  const snapshots: Record<string, string> = {};
  const collectionsSet = new Set<string>();
  collectionsSet.add(defaultFolder);

  const trimmed = rawText.trim();
  let detectedFormat = 'Text / Raw URLs';

  // Format A: Netscape Bookmarks HTML or OPML / XML
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<DL') ||
    trimmed.includes('<H3>') ||
    (trimmed.includes('<A') && trimmed.includes('HREF='))
  ) {
    detectedFormat = 'Netscape HTML Bookmarks';
    const res = parseNetscapeBookmarksHtml(trimmed, platformName);
    return { ...res, detectedFormat };
  }

  // Format B: OPML (Outline Processor Markup Language) or RSS XML
  if (trimmed.includes('<opml') || (trimmed.includes('<outline') && trimmed.includes('xmlUrl') || trimmed.includes('htmlUrl'))) {
    detectedFormat = 'OPML / XML Reading List';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'text/xml');
      const outlines = doc.querySelectorAll('outline');

      outlines.forEach((el, idx) => {
        const url = el.getAttribute('htmlUrl') || el.getAttribute('xmlUrl') || el.getAttribute('url');
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return;

        const title = el.getAttribute('text') || el.getAttribute('title') || deriveCleanTitleFromUrl(url);
        const folder = el.parentElement?.getAttribute('text') || el.parentElement?.getAttribute('title') || defaultFolder;
        collectionsSet.add(folder);

        let domain = 'web';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          // fallback
        }

        const dateObj = new Date();
        const id = `opml_${dateObj.getTime()}_${idx}`;
        if (fallbackTags.length > 0) tags[url] = [...fallbackTags];

        items.push({
          id,
          type: 'browser',
          ts: dateObj.toISOString(),
          dateObj,
          title,
          subtitle: `OPML Feed: ${domain}`,
          url,
          domain,
          favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          transition: 'BOOKMARK',
          platform: platformName,
          category: folder
        });
      });

      if (items.length > 0) {
        return {
          items,
          notes,
          tags,
          snapshots,
          count: items.length,
          service: platformName,
          collections: Array.from(collectionsSet),
          detectedFormat
        };
      }
    } catch (e) {
      console.warn('OPML parse failed, checking next format:', e);
    }
  }

  // Format C: JSON (Deep-Walked Object or Array)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsedJson = JSON.parse(trimmed);
      detectedFormat = 'Deep-Walked JSON';

      // Deep recursive scanner to locate ANY objects containing URL-like properties
      const foundObjects: any[] = [];
      const visited = new Set<any>();

      function deepScan(node: any, depth = 0) {
        if (!node || typeof node !== 'object' || depth > 8 || visited.has(node)) return;
        visited.add(node);

        if (Array.isArray(node)) {
          node.forEach(child => deepScan(child, depth + 1));
        } else {
          // Check if this object contains a URL property
          const keys = Object.keys(node);
          const hasUrlKey = keys.some(k => {
            const kl = k.toLowerCase();
            if (['url', 'link', 'href', 'uri', 'web_url', 'source_url', 'target', 'page_url', 'site', 'website'].includes(kl)) {
              return typeof node[k] === 'string' && (node[k].startsWith('http://') || node[k].startsWith('https://'));
            }
            return false;
          });

          if (hasUrlKey) {
            foundObjects.push(node);
          } else {
            // Recurse into children
            keys.forEach(k => {
              if (typeof node[k] === 'object' && node[k] !== null) {
                deepScan(node[k], depth + 1);
              }
            });
          }
        }
      }

      deepScan(parsedJson);

      if (foundObjects.length > 0) {
        foundObjects.forEach((obj, idx) => {
          // Extract URL
          const urlKey = Object.keys(obj).find(k => {
            const kl = k.toLowerCase();
            return (
              ['url', 'link', 'href', 'uri', 'web_url', 'source_url', 'target', 'page_url', 'site', 'website'].includes(kl) &&
              typeof obj[k] === 'string' &&
              (obj[k].startsWith('http://') || obj[k].startsWith('https://'))
            );
          });
          if (!urlKey) return;
          const url = obj[urlKey];

          // Extract Title
          const titleKey = Object.keys(obj).find(k =>
            ['title', 'name', 'label', 'headline', 'subject', 'header', 'text', 'caption'].includes(k.toLowerCase()) &&
            typeof obj[k] === 'string' && obj[k].trim()
          );
          const title = (titleKey ? obj[titleKey].trim() : '') || deriveCleanTitleFromUrl(url);

          // Extract Note / Description
          const noteKey = Object.keys(obj).find(k =>
            ['notes', 'note', 'description', 'desc', 'summary', 'excerpt', 'snippet', 'body', 'memo', 'comment'].includes(k.toLowerCase()) &&
            typeof obj[k] === 'string' && obj[k].trim()
          );
          const note = noteKey ? obj[noteKey].trim() : '';

          // Extract Folder
          const folderKey = Object.keys(obj).find(k =>
            ['folder', 'collection', 'category', 'board', 'workspace', 'list', 'group', 'directory'].includes(k.toLowerCase()) &&
            typeof obj[k] === 'string' && obj[k].trim()
          );
          const folder = folderKey ? obj[folderKey].trim() : defaultFolder;
          collectionsSet.add(folder);

          // Extract Tags
          const tagKey = Object.keys(obj).find(k =>
            ['tags', 'labels', 'keywords', 'categories', 'topics'].includes(k.toLowerCase())
          );
          const itemTags: string[] = [...fallbackTags];
          if (tagKey && obj[tagKey]) {
            const val = obj[tagKey];
            if (Array.isArray(val)) {
              itemTags.push(...val.map(t => String(t).trim()).filter(Boolean));
            } else if (typeof val === 'string') {
              itemTags.push(...val.split(/[,;\s]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean));
            }
          }

          // Extract Image / Snapshot
          const imgKey = Object.keys(obj).find(k =>
            ['image', 'imageUrl', 'thumbnail', 'cover', 'screenshot', 'preview'].includes(k.toLowerCase()) &&
            typeof obj[k] === 'string' && (obj[k].startsWith('http') || obj[k].startsWith('data:'))
          );
          if (imgKey) {
            snapshots[url] = obj[imgKey];
          }

          // Extract Date
          const dateKey = Object.keys(obj).find(k =>
            ['created_at', 'createdAt', 'date', 'timestamp', 'time', 'added', 'published', 'ts'].includes(k.toLowerCase())
          );
          let dateObj = new Date();
          if (dateKey && obj[dateKey]) {
            const dVal = obj[dateKey];
            const num = typeof dVal === 'number' ? dVal : parseInt(dVal, 10);
            if (!isNaN(num) && num > 1e9) {
              dateObj = num > 1e11 ? new Date(num) : new Date(num * 1000);
            } else {
              const d = new Date(dVal);
              if (!isNaN(d.getTime())) dateObj = d;
            }
          }

          let domain = 'web';
          try {
            domain = new URL(url).hostname.replace(/^www\./, '');
          } catch {
            // fallback
          }

          if (itemTags.length > 0) tags[url] = itemTags;
          if (note) notes[url] = note;

          items.push({
            id: `custom_json_${dateObj.getTime()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
            type: 'browser',
            ts: dateObj.toISOString(),
            dateObj,
            title,
            subtitle: note || (folder !== defaultFolder ? `Folder: ${folder}` : domain),
            url,
            domain,
            favicon_url: snapshots[url] || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
            transition: 'BOOKMARK',
            platform: platformName,
            category: folder
          });
        });

        if (items.length > 0) {
          return {
            items,
            notes,
            tags,
            snapshots,
            count: items.length,
            service: platformName,
            collections: Array.from(collectionsSet),
            detectedFormat
          };
        }
      }
    } catch (e) {
      console.warn('Deep JSON parse error, trying CSV/Markdown:', e);
    }
  }

  // Format D: CSV / TSV / Semicolon / Pipe-delimited Data
  const csvRows = splitCsvRows(trimmed);
  if (csvRows.length > 1) {
    const firstRow = csvRows[0].map(c => c.toLowerCase());
    const urlIdx = firstRow.findIndex(c =>
      c.includes('url') || c.includes('link') || c.includes('href') || c.includes('address') || c.includes('website')
    );

    // Or check if row 0 itself contains a direct URL (meaning no header)
    const hasHeader = urlIdx >= 0;
    const effectiveUrlCol = hasHeader
      ? urlIdx
      : csvRows[0].findIndex(c => c.startsWith('http://') || c.startsWith('https://'));

    if (effectiveUrlCol >= 0) {
      detectedFormat = 'CSV / Delimited Table';
      const titleIdx = hasHeader
        ? firstRow.findIndex(c => c.includes('title') || c.includes('name') || c.includes('headline'))
        : -1;
      const noteIdx = hasHeader
        ? firstRow.findIndex(c => c.includes('note') || c.includes('desc') || c.includes('comment') || c.includes('summary'))
        : -1;
      const tagIdx = hasHeader
        ? firstRow.findIndex(c => c.includes('tag') || c.includes('label') || c.includes('keyword'))
        : -1;
      const folderIdx = hasHeader
        ? firstRow.findIndex(c => c.includes('folder') || c.includes('category') || c.includes('collection') || c.includes('board'))
        : -1;
      const dateIdx = hasHeader
        ? firstRow.findIndex(c => c.includes('date') || c.includes('time') || c.includes('created'))
        : -1;

      const dataRows = hasHeader ? csvRows.slice(1) : csvRows;
      dataRows.forEach((row, idx) => {
        const url = row[effectiveUrlCol];
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return;

        const title = (titleIdx >= 0 ? row[titleIdx] : '') || deriveCleanTitleFromUrl(url);
        const note = noteIdx >= 0 ? row[noteIdx] : '';
        const folder = (folderIdx >= 0 ? row[folderIdx] : '') || defaultFolder;
        collectionsSet.add(folder);

        let dateObj = new Date();
        if (dateIdx >= 0 && row[dateIdx]) {
          const d = new Date(row[dateIdx]);
          if (!isNaN(d.getTime())) dateObj = d;
        }

        const itemTags: string[] = [...fallbackTags];
        if (tagIdx >= 0 && row[tagIdx]) {
          itemTags.push(...row[tagIdx].split(/[,;\s]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean));
        }

        let domain = 'web';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          // fallback
        }

        if (itemTags.length > 0) tags[url] = itemTags;
        if (note) notes[url] = note;

        items.push({
          id: `custom_csv_${dateObj.getTime()}_${idx}`,
          type: 'browser',
          ts: dateObj.toISOString(),
          dateObj,
          title,
          subtitle: note || domain,
          url,
          domain,
          favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          transition: 'BOOKMARK',
          platform: platformName,
          category: folder
        });
      });

      if (items.length > 0) {
        return {
          items,
          notes,
          tags,
          snapshots,
          count: items.length,
          service: platformName,
          collections: Array.from(collectionsSet),
          detectedFormat
        };
      }
    }
  }

  // Format E: Markdown Links / Pipe-delimited lines / Raw URLs
  const lines = trimmed.split('\n');
  const seenUrls = new Set<string>();

  // Markdown link regex: [Title](https://...)
  const mdRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

  lines.forEach((line, lineIdx) => {
    let match;
    let foundMdOnLine = false;

    // Check for markdown links
    while ((match = mdRegex.exec(line)) !== null) {
      foundMdOnLine = true;
      detectedFormat = 'Markdown Links';
      const title = match[1].trim();
      const url = match[2].trim();

      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      // Check for trailing tags like #tag1 #tag2
      const restOfLine = line.replace(match[0], '');
      const tagMatches = restOfLine.match(/#([\w-]+)/g) || [];
      const itemTags = [...fallbackTags, ...tagMatches.map(t => t.replace('#', ''))];

      let domain = 'web';
      try {
        domain = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        // fallback
      }

      const dateObj = new Date();
      if (itemTags.length > 0) tags[url] = itemTags;

      items.push({
        id: `md_${dateObj.getTime()}_${lineIdx}_${items.length}`,
        type: 'browser',
        ts: dateObj.toISOString(),
        dateObj,
        title,
        subtitle: domain,
        url,
        domain,
        favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        transition: 'BOOKMARK',
        platform: platformName,
        category: defaultFolder
      });
    }

    if (foundMdOnLine) return;

    // Check for pipe-separated line: "URL | Title | tags | notes"
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      const urlPart = parts.find(p => p.startsWith('http://') || p.startsWith('https://'));
      if (urlPart && !seenUrls.has(urlPart)) {
        detectedFormat = 'Pipe-Separated Text';
        seenUrls.add(urlPart);
        const otherParts = parts.filter(p => p !== urlPart);
        const title = otherParts[0] || deriveCleanTitleFromUrl(urlPart);
        const note = otherParts[2] || '';
        const itemTags = [...fallbackTags];
        if (otherParts[1]) {
          itemTags.push(...otherParts[1].split(/[,;\s]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean));
        }

        let domain = 'web';
        try {
          domain = new URL(urlPart).hostname.replace(/^www\./, '');
        } catch {
          // fallback
        }

        const dateObj = new Date();
        if (itemTags.length > 0) tags[urlPart] = itemTags;
        if (note) notes[urlPart] = note;

        items.push({
          id: `pipe_${dateObj.getTime()}_${lineIdx}`,
          type: 'browser',
          ts: dateObj.toISOString(),
          dateObj,
          title,
          subtitle: note || domain,
          url: urlPart,
          domain,
          favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          transition: 'BOOKMARK',
          platform: platformName,
          category: defaultFolder
        });
        return;
      }
    }

    // Format F: Raw URL in text
    const rawUrlRegex = /https?:\/\/[^\s"'<>()]+/g;
    let urlMatch;
    while ((urlMatch = rawUrlRegex.exec(line)) !== null) {
      const cleanUrl = urlMatch[0].replace(/[.,;:!?)]+$/, '');
      if (seenUrls.has(cleanUrl)) continue;
      seenUrls.add(cleanUrl);

      const title = deriveCleanTitleFromUrl(cleanUrl);
      let domain = 'web';
      try {
        domain = new URL(cleanUrl).hostname.replace(/^www\./, '');
      } catch {
        // fallback
      }

      const dateObj = new Date();
      if (fallbackTags.length > 0) tags[cleanUrl] = [...fallbackTags];

      items.push({
        id: `raw_url_${dateObj.getTime()}_${items.length}`,
        type: 'browser',
        ts: dateObj.toISOString(),
        dateObj,
        title,
        subtitle: domain,
        url: cleanUrl,
        domain,
        favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        transition: 'BOOKMARK',
        platform: platformName,
        category: defaultFolder
      });
    }
  });

  return {
    items,
    notes,
    tags,
    snapshots,
    count: items.length,
    service: platformName,
    collections: Array.from(collectionsSet),
    detectedFormat
  };
}


/**
 * Generates standard Netscape Bookmarks HTML file for exporting
 */
export function exportToNetscapeHtml(items: TimelineItem[], tagsMap: Record<string, string[]> = {}, notesMap: Record<string, string> = {}): string {
  const dateStr = Math.floor(Date.now() / 1000);
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

  // Group by collection/category
  const groups: Record<string, TimelineItem[]> = {};
  items.forEach(it => {
    const col = it.category || 'Unsorted';
    if (!groups[col]) groups[col] = [];
    groups[col].push(it);
  });

  Object.entries(groups).forEach(([folder, folderItems]) => {
    html += `    <DT><H3 ADD_DATE="${dateStr}" LAST_MODIFIED="${dateStr}">${escapeHtml(folder)}</H3>\n    <DL><p>\n`;
    folderItems.forEach(it => {
      const url = it.url || '';
      if (!url) return;
      const addTime = Math.floor(it.dateObj ? it.dateObj.getTime() / 1000 : Date.now() / 1000);
      const tags = tagsMap[url] ? ` TAGS="${escapeHtml(tagsMap[url].join(','))}"` : '';
      const icon = it.favicon_url ? ` ICON="${escapeHtml(it.favicon_url)}"` : '';
      html += `        <DT><A HREF="${escapeHtml(url)}" ADD_DATE="${addTime}"${tags}${icon}>${escapeHtml(it.title || url)}</A>\n`;
      const note = notesMap[url] || (it.subtitle !== it.domain ? it.subtitle : '');
      if (note) {
        html += `        <DD>${escapeHtml(note)}\n`;
      }
    });
    html += `    </DL><p>\n`;
  });

  html += `</DL><p>\n`;
  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
