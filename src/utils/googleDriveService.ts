import {
  GDriveDriveConfig,
  GDriveFile,
  GDriveCategory,
  GDriveStorageQuota,
  GDriveUser
} from '../types/gdrive';

const STORAGE_KEY_CONFIGS = 'emreh_gdrive_configs_v1';
const STORAGE_KEY_CUSTOM_FILES = 'emreh_gdrive_custom_files_v1';

// Standard Google Drive MIME types
export const GDRIVE_MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
  DOCUMENT: 'application/vnd.google-apps.document',
  SPREADSHEET: 'application/vnd.google-apps.spreadsheet',
  PRESENTATION: 'application/vnd.google-apps.presentation',
  FORM: 'application/vnd.google-apps.form',
  PDF: 'application/pdf'
};

export function formatGDriveFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '--';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileCategory(mimeType: string, name: string): GDriveCategory {
  if (mimeType === GDRIVE_MIME_TYPES.FOLDER) return 'folder';
  if (mimeType === GDRIVE_MIME_TYPES.DOCUMENT || name.endsWith('.gdoc') || name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.txt') || name.endsWith('.md')) {
    return 'document';
  }
  if (mimeType === GDRIVE_MIME_TYPES.SPREADSHEET || name.endsWith('.gsheet') || name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
    return 'spreadsheet';
  }
  if (mimeType === GDRIVE_MIME_TYPES.PRESENTATION || name.endsWith('.gslides') || name.endsWith('.ppt') || name.endsWith('.pptx')) {
    return 'presentation';
  }
  if (mimeType === GDRIVE_MIME_TYPES.PDF || name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) {
    return 'image';
  }
  if (mimeType.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(name)) {
    return 'video';
  }
  if (/\.(zip|tar|gz|rar|7z)$/i.test(name)) {
    return 'archive';
  }
  if (/\.(ts|tsx|js|jsx|json|html|css|py|rs|go|sql)$/i.test(name)) {
    return 'code';
  }
  return 'other';
}

const DEFAULT_DRIVE_1: GDriveDriveConfig = {
  id: 'drive-1',
  driveLetter: 'G:',
  name: 'Google Drive (Drive 1)',
  status: 'disconnected',
  user: undefined,
  storageQuota: undefined,
  lastSynced: undefined
};

const DEFAULT_DRIVE_2: GDriveDriveConfig = {
  id: 'drive-2',
  driveLetter: 'H:',
  name: 'Google Drive (Drive 2)',
  status: 'disconnected',
  user: undefined,
  storageQuota: undefined,
  lastSynced: undefined
};

export function loadDrivesConfig(): GDriveDriveConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Purge any demo status or fake mock accounts from previous runs
        return parsed.map((d: any) => {
          if (!d.accessToken || d.status === 'demo') {
            return {
              ...d,
              status: 'disconnected' as const,
              accessToken: null,
              user: undefined,
              storageQuota: undefined,
              lastSynced: undefined
            };
          }
          return d;
        });
      }
    }
  } catch {}
  return [DEFAULT_DRIVE_1, DEFAULT_DRIVE_2];
}

export function saveDrivesConfig(configs: GDriveDriveConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIGS, JSON.stringify(configs));
  } catch (err) {
    console.error('Failed to save Google Drive configs:', err);
  }
}

// Clean initial empty files (zero demo data)
export const SEED_FILES_DRIVE_1: GDriveFile[] = [];
export const SEED_FILES_DRIVE_2: GDriveFile[] = [];

// Helper to get custom or modified files per drive from localStorage
export function getCustomDriveFiles(driveId: string): GDriveFile[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_CUSTOM_FILES}_${driveId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((f: any) => !f.id?.startsWith("f1-") && !f.id?.startsWith("f2-"));
      }
    }
  } catch {}
  return [];
}

function saveCustomDriveFiles(driveId: string, files: GDriveFile[]) {
  try {
    localStorage.setItem(`${STORAGE_KEY_CUSTOM_FILES}_${driveId}`, JSON.stringify(files));
  } catch (err) {
    console.error('Failed to save custom drive files:', err);
  }
}

// Fetch files from real Google Drive API or fallback to simulated network drive
export async function fetchFilesForFolder(
  driveConfig: GDriveDriveConfig,
  folderId?: string | null,
  onAuthExpired?: () => void
): Promise<GDriveFile[]> {
  const targetParent = folderId && folderId !== 'root' ? folderId : null;

  const tokenLooksExpired =
    !!driveConfig.tokenExpiry && Date.now() >= driveConfig.tokenExpiry;

  // Real Google Drive API if user has connected token
  if (driveConfig.status === 'connected' && driveConfig.accessToken && !tokenLooksExpired) {
    try {
      const q = targetParent
        ? `'${targetParent}' in parents and trashed = false`
        : `'root' in parents and trashed = false`;

      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        q
      )}&fields=files(id,name,mimeType,size,modifiedTime,parents,thumbnailLink,webViewLink,webContentLink,shared,starred)&pageSize=100`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${driveConfig.accessToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.files && Array.isArray(data.files)) {
          return data.files.map((f: any) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            category: getFileCategory(f.mimeType, f.name),
            isFolder: f.mimeType === GDRIVE_MIME_TYPES.FOLDER,
            size: f.size ? parseInt(f.size, 10) : undefined,
            formattedSize: formatGDriveFileSize(f.size ? parseInt(f.size, 10) : undefined),
            modifiedTime: f.modifiedTime,
            parentId: f.parents?.[0] || null,
            thumbnailLink: f.thumbnailLink,
            webViewLink: f.webViewLink,
            webContentLink: f.webContentLink,
            starred: Boolean(f.starred),
            shared: Boolean(f.shared),
            ownerName: 'Google Drive'
          }));
        }
      } else if (res.status === 401) {
        console.warn('Google Drive token expired or invalid, reverting to cached/demo drive');
        onAuthExpired?.();
      }
    } catch (err) {
      console.warn('Live Google Drive fetch error, using local/cached drive:', err);
    }
  } else if (driveConfig.status === 'connected' && driveConfig.accessToken && tokenLooksExpired) {
    // We know the token is past its expiry without even making a request —
    // skip the doomed network call and tell the caller right away so the UI
    // can flip the "Connected" badge off instead of silently serving stale
    // cached files under a badge that claims everything is fine.
    console.warn('Google Drive token has expired (past tokenExpiry), reverting to cached/demo drive');
    onAuthExpired?.();
  }

  // Local/Cached Simulated Network Drive
  const allFiles = getCustomDriveFiles(driveConfig.id);
  return allFiles.filter(f => {
    if (!targetParent) {
      return !f.parentId;
    }
    return f.parentId === targetParent;
  });
}

// Fetch file text content (for Docs or text files)
export async function fetchGDriveFileContent(
  driveConfig: GDriveDriveConfig,
  file: GDriveFile
): Promise<string> {
  if (file.textContent) {
    return file.textContent;
  }

  if (driveConfig.status === 'connected' && driveConfig.accessToken) {
    try {
      let downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
      if (file.mimeType === GDRIVE_MIME_TYPES.DOCUMENT) {
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`;
      }
      const res = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${driveConfig.accessToken}` }
      });
      if (res.ok) {
        return await res.text();
      }
    } catch (err) {
      console.warn('Failed to fetch live file content:', err);
    }
  }

  return `# ${file.name}\n\nFile Type: ${file.mimeType}\nSize: ${file.formattedSize || 'Unknown'}\nLast Modified: ${file.modifiedTime}\n\n[Content preview generated for network drive file]`;
}

// Create new folder in drive
export async function createGDriveFolder(
  driveConfig: GDriveDriveConfig,
  parentId: string | null,
  folderName: string
): Promise<GDriveFile> {
  const newFolder: GDriveFile = {
    id: `gdrive-fld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: folderName,
    mimeType: GDRIVE_MIME_TYPES.FOLDER,
    category: 'folder',
    isFolder: true,
    parentId: parentId || null,
    modifiedTime: new Date().toISOString(),
    starred: false,
    ownerName: driveConfig.user?.displayName || 'Me'
  };

  const current = getCustomDriveFiles(driveConfig.id);
  saveCustomDriveFiles(driveConfig.id, [newFolder, ...current]);
  return newFolder;
}

// Upload file to drive
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadFileToGDrive(
  driveConfig: GDriveDriveConfig,
  parentId: string | null,
  file: File
): Promise<GDriveFile> {
  // Read as Data URL or text. We intentionally use a base64 data URL (not
  // URL.createObjectURL) for the thumbnail because this record gets persisted
  // to localStorage via saveCustomDriveFiles — object URLs are revoked/invalidated
  // as soon as the page reloads, which previously caused uploaded image
  // thumbnails to silently break (broken-image icon) after any refresh.
  let textContent: string | undefined;
  let thumbnailLink: string | undefined;

  if (file.type.startsWith('image/')) {
    try {
      thumbnailLink = await readFileAsDataUrl(file);
    } catch (err) {
      console.warn('Failed to read image for thumbnail:', err);
    }
  } else if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.json')) {
    textContent = await file.text();
  }

  const newFile: GDriveFile = {
    id: `gdrive-file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    category: getFileCategory(file.type, file.name),
    isFolder: false,
    parentId: parentId || null,
    size: file.size,
    formattedSize: formatGDriveFileSize(file.size),
    modifiedTime: new Date().toISOString(),
    thumbnailLink,
    textContent,
    starred: false,
    ownerName: driveConfig.user?.displayName || 'Me'
  };

  const current = getCustomDriveFiles(driveConfig.id);
  saveCustomDriveFiles(driveConfig.id, [newFile, ...current]);
  return newFile;
}

// Delete item from drive (and, if it's a folder, all of its nested descendants —
// previously only direct children were removed, orphaning grandchildren that
// would then reappear as "unreachable" files with a dangling parentId)
export function deleteGDriveItem(driveId: string, fileId: string): void {
  const current = getCustomDriveFiles(driveId);

  const idsToDelete = new Set<string>([fileId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of current) {
      if (f.parentId && idsToDelete.has(f.parentId) && !idsToDelete.has(f.id)) {
        idsToDelete.add(f.id);
        changed = true;
      }
    }
  }

  const next = current.filter(f => !idsToDelete.has(f.id));
  saveCustomDriveFiles(driveId, next);
}

// Google Identity Services (GSI) Client Loader
let gsiScriptPromise: Promise<void> | null = null;

export function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (!gsiScriptPromise) {
    gsiScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (err) => {
        gsiScriptPromise = null;
        reject(err);
      };
      document.head.appendChild(script);
    });
  }

  return gsiScriptPromise;
}

// Request Token via Google Identity Services Token Client
export async function authenticateWithGoogleDrive(
  clientId: string
): Promise<{ accessToken: string; user?: GDriveUser; tokenExpiry?: number }> {
  await loadGsiScript();

  return new Promise((resolve, reject) => {
    try {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        throw new Error('Google Identity Services SDK is not available in browser');
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }

          const accessToken = response.access_token;
          // Google access tokens from GIS typically expire in 3600s; fall back
          // to a conservative 55 minutes if expires_in isn't provided so we
          // still proactively detect staleness rather than never checking.
          const expiresInSeconds = Number(response.expires_in) || 55 * 60;
          const tokenExpiry = Date.now() + expiresInSeconds * 1000;
          let user: GDriveUser | undefined;

          try {
            // Fetch User Profile
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (userRes.ok) {
              const u = await userRes.json();
              user = {
                displayName: u.name || 'Google User',
                emailAddress: u.email || '',
                photoLink: u.picture
              };
            }
          } catch (e) {
            console.warn('Could not fetch user profile info:', e);
          }

          resolve({ accessToken, user, tokenExpiry });
        }
      });

      client.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
}
