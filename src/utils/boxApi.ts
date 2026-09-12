/**
 * Box Cloud API & Storage Integration Utility
 * Supports real Box OAuth 2.0, Box Developer Tokens, file/folder browsing,
 * uploads, file ingestion into timeline, and clean empty state (no demo data).
 */

export interface BoxUser {
  id: string;
  name: string;
  login: string; // email address
  avatar_url?: string;
  space_amount: number; // total quota in bytes
  space_used: number; // used space in bytes
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
  clientSecret?: string;
  expiresAt?: number;
  user?: BoxUser | null;
  lastSyncTime?: string | null;
  selectedFolderId?: string;
}

export interface BoxServerConfig {
  configured: boolean;
  clientId: string;
  hasSecret: boolean;
}

const BOX_CONFIG_STORAGE_KEY = 'my_life_box_config_v2';
const BOX_CUSTOM_ITEMS_STORAGE_KEY = 'my_life_box_custom_items_v2';

// Empty seed list: NO demo data as requested by user
export const SEED_BOX_ITEMS: BoxItem[] = [];
export const DEMO_BOX_USER: BoxUser | null = null;

// Helper: Format bytes to human readable string
export function formatBoxFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper: Get item category
export function getBoxItemCategory(item: BoxItem): 'folder' | 'document' | 'image' | 'audio' | 'video' | 'archive' | 'data' | 'other' {
  if (item.type === 'folder') return 'folder';
  const ext = (item.extension || item.name.split('.').pop() || '').toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'heic'].includes(ext)) {
    return 'image';
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
    return 'audio';
  }
  if (['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)) {
    return 'video';
  }
  if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)) {
    return 'archive';
  }
  if (['json', 'geojson', 'csv', 'sql', 'xml', 'html'].includes(ext)) {
    return 'data';
  }
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt', 'pages', 'xlsx', 'xls', 'pptx'].includes(ext)) {
    return 'document';
  }
  return 'other';
}

// Local Storage helpers
export function getBoxConfig(): BoxConfig {
  try {
    const raw = localStorage.getItem(BOX_CONFIG_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
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
    localStorage.setItem(BOX_CONFIG_STORAGE_KEY, JSON.stringify(config));
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
    if (raw) {
      return JSON.parse(raw);
    }
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

// Check server environment configuration for Box OAuth
export async function fetchBoxServerConfig(): Promise<BoxServerConfig> {
  try {
    const res = await fetch('/api/box/config');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not fetch /api/box/config from server:', err);
  }
  return { configured: false, clientId: '', hasSecret: false };
}

// Construct Box OAuth Authorize URL
export function getBoxAuthorizeUrl(clientId: string, redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state: state || 'box_auth_' + Date.now()
  });
  return `https://account.box.com/api/oauth2/authorize?${params.toString()}`;
}

// Helper: Fetch with fallback to server proxy to bypass CORS
async function fetchWithBoxFallback(url: string, options: RequestInit): Promise<Response> {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (networkError) {
    console.warn('Direct Box API request failed, routing through server proxy', networkError);
    try {
      const u = new URL(url);
      const proxyUrl = `/api/box/proxy?endpoint=${encodeURIComponent(u.pathname + u.search)}`;
      return await fetch(proxyUrl, options);
    } catch {
      throw networkError;
    }
  }
}

// Exchange Code for Access Token via Server or Direct API
export async function exchangeBoxCode(
  code: string,
  clientId?: string,
  clientSecret?: string,
  redirectUri?: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  // First attempt backend server route (which has BOX_CLIENT_ID & BOX_CLIENT_SECRET in env)
  try {
    const serverRes = await fetch('/api/box/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        clientId,
        clientSecret,
        redirectUri
      })
    });

    if (serverRes.ok) {
      return await serverRes.json();
    }
    const errObj = await serverRes.json().catch(() => ({}));
    if (errObj.error && !clientSecret) {
      throw new Error(errObj.error);
    }
  } catch (serverErr: any) {
    // If clientSecret was passed explicitly, try direct Box API
    if (!clientSecret || !clientId) {
      throw serverErr;
    }
  }

  // Fallback to direct Box OAuth call if credentials are provided on client
  if (!clientId || !clientSecret) {
    throw new Error('BOX_CLIENT_ID or BOX_CLIENT_SECRET missing');
  }

  const formData = new URLSearchParams();
  formData.append('grant_type', 'authorization_code');
  formData.append('code', code);
  formData.append('client_id', clientId);
  formData.append('client_secret', clientSecret);
  if (redirectUri) {
    formData.append('redirect_uri', redirectUri);
  }

  const res = await fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Box OAuth token exchange failed (${res.status}): ${errorText}`);
  }

  return await res.json();
}

// Refresh Box Token via Server
export async function refreshBoxToken(
  refreshToken: string,
  clientId?: string,
  clientSecret?: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const res = await fetch('/api/box/oauth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refreshToken,
      clientId,
      clientSecret
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Token refresh failed with status ${res.status}`);
  }

  return await res.json();
}

// Fetch Box Current User Info
export async function fetchBoxCurrentUser(token: string): Promise<BoxUser> {
  const res = await fetchWithBoxFallback('https://api.box.com/2.0/users/me', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Box user: ${res.statusText}`);
  }

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

// Fetch Items inside a Folder
export async function fetchBoxFolderItems(folderId: string, token: string): Promise<BoxItem[]> {
  const fields = 'id,type,name,size,created_at,modified_at,description,shared_link,item_status,path_collection,content_created_at,extension';
  const res = await fetchWithBoxFallback(`https://api.box.com/2.0/folders/${folderId}/items?fields=${fields}&limit=100`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Box folder ${folderId}: ${res.statusText}`);
  }

  const data = await res.json();
  const entries: any[] = data.entries || [];

  return entries.map(entry => {
    const item: BoxItem = {
      id: entry.id,
      type: entry.type === 'folder' ? 'folder' : 'file',
      name: entry.name,
      size: entry.size || 0,
      created_at: entry.created_at || entry.content_created_at || new Date().toISOString(),
      modified_at: entry.modified_at || new Date().toISOString(),
      description: entry.description || '',
      extension: entry.extension || (entry.type === 'file' ? entry.name.split('.').pop() : undefined),
      parent_id: folderId,
      shared_link: entry.shared_link ? { url: entry.shared_link.url, download_url: entry.shared_link.download_url } : null,
      path_collection: entry.path_collection
    };
    item.category = getBoxItemCategory(item);
    return item;
  });
}

// Create a new folder on Box
export async function createBoxFolder(parentId: string, name: string, token: string): Promise<BoxItem> {
  const res = await fetchWithBoxFallback('https://api.box.com/2.0/folders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      parent: { id: parentId }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create folder on Box: ${err}`);
  }

  const data = await res.json();
  const item: BoxItem = {
    id: data.id,
    type: 'folder',
    name: data.name,
    size: 0,
    created_at: data.created_at || new Date().toISOString(),
    modified_at: data.modified_at || new Date().toISOString(),
    parent_id: parentId,
    category: 'folder',
    description: ''
  };
  return item;
}

// Upload a file to Box
export async function uploadBoxFile(parentId: string, file: File, token: string): Promise<BoxItem> {
  const formData = new FormData();
  const attributes = {
    name: file.name,
    parent: { id: parentId }
  };
  formData.append('attributes', JSON.stringify(attributes));
  formData.append('file', file);

  const res = await fetch('https://upload.box.com/api/2.0/files/content', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to upload file to Box: ${err}`);
  }

  const data = await res.json();
  const entry = data.entries?.[0] || data;

  const item: BoxItem = {
    id: entry.id,
    type: 'file',
    name: entry.name,
    size: entry.size || file.size,
    created_at: entry.created_at || new Date().toISOString(),
    modified_at: entry.modified_at || new Date().toISOString(),
    description: entry.description || '',
    extension: file.name.split('.').pop() || '',
    parent_id: parentId
  };
  item.category = getBoxItemCategory(item);
  return item;
}

// Delete item on Box
export async function deleteBoxItem(id: string, type: 'file' | 'folder', token: string): Promise<void> {
  const endpoint = type === 'folder' ? `https://api.box.com/2.0/folders/${id}?recursive=true` : `https://api.box.com/2.0/files/${id}`;
  const res = await fetchWithBoxFallback(endpoint, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete Box item: ${res.statusText}`);
  }
}

// Unified repository to get items for folder (no demo data, custom uploaded items only)
export function getStoredItemsForFolder(folderId: string): BoxItem[] {
  const custom = getCustomBoxItems();
  return custom.filter(item => (item.parent_id || '0') === folderId);
}

// Build breadcrumb trail from folder ID
export function buildBreadcrumbs(folderId: string, currentItems: BoxItem[] = []): BoxBreadcrumb[] {
  if (folderId === '0' || !folderId) {
    return [{ id: '0', name: 'All Files' }];
  }

  const custom = getCustomBoxItems();
  const allKnown = [...currentItems, ...custom];
  const trail: BoxBreadcrumb[] = [];
  let currentId: string | undefined = folderId;

  while (currentId && currentId !== '0') {
    const found = allKnown.find(i => i.id === currentId && i.type === 'folder');
    if (found) {
      trail.unshift({ id: found.id, name: found.name });
      currentId = found.parent_id;
    } else {
      break;
    }
  }

  trail.unshift({ id: '0', name: 'All Files' });
  return trail;
}
