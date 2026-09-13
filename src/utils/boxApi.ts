/**
 * Box Cloud API & Storage Integration Utility
 * Supports real Box OAuth 2.0, Box Developer Tokens, file/folder browsing,
 * uploads, file ingestion into timeline, and clean empty state (no demo data).
 */

export interface BoxUser {
  id: string;
  name: string;
  login: string;
  avatar_url?: string;
  space_amount: number;
  space_used: number;
  max_upload_size: number;
  status: string;
  job_title?: string;
  enterprise?: { id: string; name: string } | null;
}

export interface BoxItem {
  id: string;
  type: 'file' | 'folder';
  name: string;
  size: number;
  created_at: string;
  modified_at: string;
  description?: string;
  extension?: string;
  item_status?: string;
  parent_id?: string;
  shared_link?: { url: string; download_url?: string } | null;
  path_collection?: {
    total_count: number;
    entries: { id: string; name: string }[];
  };
  category?: 'folder' | 'document' | 'image' | 'audio' | 'video' | 'archive' | 'data' | 'other';
  thumbnail_url?: string;
  download_url?: string;
  content_preview?: string;
  tags?: string[];
}

export interface BoxBreadcrumb {
  id: string;
  name: string;
}

export interface BoxConfig {
  isConnected: boolean;
  authMode: 'oauth' | 'token';
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  expiresAt?: number;
  user?: BoxUser | null;
  lastSyncTime?: string | null;
  selectedFolderId?: string;
}

export interface BoxServerConfig {
  configured: boolean;
  clientId: string;
}

const BOX_CONFIG_STORAGE_KEY = 'my_life_box_config_v2';
const BOX_CUSTOM_ITEMS_STORAGE_KEY = 'my_life_box_custom_items_v2';

export const SEED_BOX_ITEMS: BoxItem[] = [];
export const DEMO_BOX_USER: BoxUser | null = null;

export function formatBoxFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getBoxItemCategory(item: BoxItem): 'folder' | 'document' | 'image' | 'audio' | 'video' | 'archive' | 'data' | 'other' {
  if (item.type === 'folder') return 'folder';
  const ext = (item.extension || item.name.split('.').pop() || '').toLowerCase();

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'heic'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) return 'audio';
  if (['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)) return 'archive';
  if (['json', 'geojson', 'csv', 'sql', 'xml', 'html'].includes(ext)) return 'data';
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt', 'pages', 'xlsx', 'xls', 'pptx'].includes(ext)) return 'document';
  return 'other';
}

export function getBoxConfig(): BoxConfig {
  try {
    const raw = localStorage.getItem(BOX_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BoxConfig;
      // Older versions persisted clientSecret locally. Remove it immediately on read.
      if ('clientSecret' in parsed) {
        delete (parsed as BoxConfig & { clientSecret?: string }).clientSecret;
        try {
          localStorage.setItem(BOX_CONFIG_STORAGE_KEY, JSON.stringify(parsed));
        } catch {}
      }
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse Box config from localStorage', err);
  }
  return {
    isConnected: false,
    authMode: 'oauth',
    user: null,
    selectedFolderId: '0'
  };
}

export function saveBoxConfig(config: BoxConfig): void {
  try {
    const safeConfig = { ...config } as BoxConfig & { clientSecret?: string };
    delete safeConfig.clientSecret;
    localStorage.setItem(BOX_CONFIG_STORAGE_KEY, JSON.stringify(safeConfig));
  } catch (err) {
    console.error('Failed to save Box config', err);
  }
}

export function clearBoxConfig(): void {
  try {
    localStorage.removeItem(BOX_CONFIG_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear Box config', err);
  }
}

export function getCustomBoxItems(): BoxItem[] {
  try {
    const raw = localStorage.getItem(BOX_CUSTOM_ITEMS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse custom Box items', err);
  }
  return [];
}

export function saveCustomBoxItems(items: BoxItem[]): void {
  try {
    localStorage.setItem(BOX_CUSTOM_ITEMS_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save custom Box items', err);
  }
}

export async function fetchBoxServerConfig(): Promise<BoxServerConfig> {
  try {
    const res = await fetch('/api/box/config');
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Could not fetch /api/box/config from server:', err);
  }
  return { configured: false, clientId: '' };
}

export function getBoxAuthorizeUrl(clientId: string, redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state: state || 'box_auth_' + Date.now()
  });
  return `https://account.box.com/api/oauth2/authorize?${params.toString()}`;
}

async function fetchWithBoxFallback(url: string, options: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (networkError) {
    console.warn('Direct Box API request failed, routing through server proxy', networkError);
    const u = new URL(url);
    return await fetch(`/api/box/proxy?endpoint=${encodeURIComponent(u.pathname + u.search)}`, options);
  }
}

// Exchange the authorization code exclusively through the backend.
export async function exchangeBoxCode(
  code: string,
  _clientId?: string,
  _unusedClientSecret?: string,
  redirectUri?: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const serverRes = await fetch('/api/box/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri })
  });

  const data = await serverRes.json().catch(() => ({}));
  if (!serverRes.ok) {
    throw new Error(data.error || `Box OAuth token exchange failed (${serverRes.status})`);
  }
  return data;
}

export async function refreshBoxToken(
  refreshToken: string,
  _clientId?: string,
  _unusedClientSecret?: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const res = await fetch('/api/box/oauth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Token refresh failed with status ${res.status}`);
  }
  return data;
}

export async function fetchBoxCurrentUser(token: string): Promise<BoxUser> {
  const res = await fetchWithBoxFallback('https://api.box.com/2.0/users/me', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error(`Failed to fetch Box user: ${res.statusText}`);
  const data = await res.json();
  return {
    id: data.id,
    name: data.name || data.login,
    login: data.login,
    avatar_url: data.avatar_url,
    space_amount: data.space_amount || 0,
    space_used: data.space_used || 0,
    max_upload_size: data.max_upload_size || 0,
    status: data.status || 'active',
    job_title: data.job_title,
    enterprise: data.enterprise ? { id: data.enterprise.id, name: data.enterprise.name } : null
  };
}

export async function fetchBoxFolderItems(folderId: string, token: string): Promise<BoxItem[]> {
  const fields = 'id,type,name,size,created_at,modified_at,description,shared_link,item_status,path_collection,content_created_at,extension';
  const res = await fetchWithBoxFallback(`https://api.box.com/2.0/folders/${folderId}/items?fields=${fields}&limit=100`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error(`Failed to fetch Box folder ${folderId}: ${res.statusText}`);
  const data = await res.json();
  const entries: any[] = data.entries || [];

  return entries.map(entry => ({
    id: entry.id,
    type: entry.type === 'folder' ? 'folder' : 'file',
    name: entry.name,
    size: entry.size || 0,
    created_at: entry.created_at,
    modified_at: entry.modified_at,
    description: entry.description,
    extension: entry.extension,
    item_status: entry.item_status,
    parent_id: entry.path_collection?.entries?.at(-1)?.id || folderId,
    shared_link: entry.shared_link || null,
    path_collection: entry.path_collection,
    category: getBoxItemCategory(entry as BoxItem)
  }));
}

export async function createBoxFolder(folderId: string, name: string, token: string): Promise<BoxItem> {
  const res = await fetchWithBoxFallback('https://api.box.com/2.0/folders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, parent: { id: folderId } })
  });
  if (!res.ok) throw new Error(`Failed to create Box folder: ${res.statusText}`);
  return await res.json();
}

export async function uploadBoxFile(folderId: string, file: File, token: string): Promise<BoxItem> {
  const form = new FormData();
  form.append('attributes', JSON.stringify({ name: file.name, parent: { id: folderId } }));
  form.append('file', file);

  const res = await fetchWithBoxFallback('https://upload.box.com/api/2.0/files/content', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  if (!res.ok) throw new Error(`Failed to upload file: ${res.statusText}`);
  const data = await res.json();
  return data.entries?.[0] || data;
}

export async function deleteBoxItem(itemId: string, itemType: 'file' | 'folder', token: string): Promise<void> {
  const path = itemType === 'folder' ? `/2.0/folders/${itemId}?recursive=true` : `/2.0/files/${itemId}`;
  const res = await fetchWithBoxFallback(`https://api.box.com${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Failed to delete Box item: ${res.statusText}`);
}

export function getStoredItemsForFolder(folderId: string): BoxItem[] {
  return getCustomBoxItems().filter(item => (item.parent_id || '0') === folderId);
}

export function buildBreadcrumbs(folderId: string, items: BoxItem[]): BoxBreadcrumb[] {
  const breadcrumbs: BoxBreadcrumb[] = [{ id: '0', name: 'All Files' }];
  let currentId = folderId;
  const seen = new Set<string>();
  while (currentId && currentId !== '0' && !seen.has(currentId)) {
    seen.add(currentId);
    const current = items.find(item => item.id === currentId && item.type === 'folder');
    if (!current) break;
    breadcrumbs.splice(1, 0, { id: current.id, name: current.name });
    currentId = current.parent_id || '0';
  }
  return breadcrumbs;
}
