import { TimelineItem } from '../types';
import { loadGsiScript } from './googleDriveService';
import { resilientFetch } from './resilientFetch';
import firebaseConfig from '../../firebase-applet-config.json';

export interface GPhotosUser {
  displayName: string;
  emailAddress: string;
  photoLink?: string;
}

export interface GPhotosAuthState {
  isConnected: boolean;
  accessToken: string | null;
  expiresAt?: number | null;
  user?: GPhotosUser | null;
  clientId?: string;
  lastSynced?: string;
  totalPhotosCount?: number;
}

export interface GooglePhotosMediaItem {
  id: string;
  description?: string;
  productUrl?: string;
  baseUrl: string;
  mimeType: string;
  mediaMetadata?: {
    creationTime: string;
    width?: string;
    height?: string;
    photo?: {
      cameraMake?: string;
      cameraModel?: string;
      focalLength?: number;
      apertureFNumber?: number;
      isoEquivalent?: number;
      exposureTime?: string;
    };
    video?: {
      cameraMake?: string;
      cameraModel?: string;
      fps?: number;
      status?: string;
    };
  };
  filename: string;
}

const STORAGE_KEY_PHOTOS_AUTH = 'emreh_gphotos_auth_v1';

// Active Google OAuth Client ID for the app's Cloud Project
export const DEFAULT_GPHOTOS_CLIENT_ID =
  firebaseConfig?.oAuthClientId ||
  '557752141960-3dml0i9f7s4lgb51cdc6ub6gh1cqbv2e.apps.googleusercontent.com';

export function loadGPhotosAuth(): GPhotosAuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PHOTOS_AUTH);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // Automatically migrate away from old stale/unauthorized client IDs
        const isStaleClientId =
          !parsed.clientId ||
          parsed.clientId.startsWith('1081191024622') ||
          parsed.clientId.includes('exampleclientid');

        const activeClientId = isStaleClientId ? DEFAULT_GPHOTOS_CLIENT_ID : parsed.clientId;

        return {
          isConnected: Boolean(parsed.isConnected && parsed.accessToken),
          accessToken: parsed.accessToken || null,
          expiresAt: parsed.expiresAt || null,
          user: parsed.user || null,
          clientId: activeClientId,
          lastSynced: parsed.lastSynced || undefined,
          totalPhotosCount: parsed.totalPhotosCount || 0
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load Google Photos auth from storage:', e);
  }

  return {
    isConnected: false,
    accessToken: null,
    expiresAt: null,
    user: null,
    clientId: DEFAULT_GPHOTOS_CLIENT_ID,
    totalPhotosCount: 0
  };
}

export function saveGPhotosAuth(state: GPhotosAuthState): void {
  try {
    localStorage.setItem(STORAGE_KEY_PHOTOS_AUTH, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save Google Photos auth to storage:', e);
  }
}

export function clearGPhotosAuth(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PHOTOS_AUTH);
  } catch (e) {
    console.error('Failed to clear Google Photos auth:', e);
  }
}

/**
 * Initiates Client-Side Google Identity Services OAuth for Google Photos
 */
export async function authenticateWithGooglePhotos(
  clientId: string = DEFAULT_GPHOTOS_CLIENT_ID
): Promise<{ accessToken: string; user?: GPhotosUser }> {
  await loadGsiScript();

  return new Promise((resolve, reject) => {
    try {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        throw new Error('Google Identity Services SDK is not available in browser');
      }

      const effectiveClientId = clientId.trim() || DEFAULT_GPHOTOS_CLIENT_ID;

      const client = google.accounts.oauth2.initTokenClient({
        client_id: effectiveClientId,
        scope:
          'https://www.googleapis.com/auth/photoslibrary.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (response: any) => {
          if (response.error) {
            if (response.error === 'popup_closed_by_user') {
              reject(new Error('Google sign-in popup was closed before completing authorization.'));
            } else if (response.error === 'access_denied') {
              reject(new Error('Access denied: Google Photos permissions were not granted.'));
            } else {
              reject(new Error(response.error_description || response.error));
            }
            return;
          }

          const accessToken = response.access_token;
          if (!accessToken) {
            reject(new Error('No access token returned by Google OAuth.'));
            return;
          }

          let user: GPhotosUser | undefined;

          try {
            // Fetch User Profile via resilient fetch
            const userRes = await resilientFetch<any>('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (userRes.ok && userRes.data) {
              user = {
                displayName: userRes.data.name || 'Google Photos User',
                emailAddress: userRes.data.email || '',
                photoLink: userRes.data.picture
              };
            }
          } catch (e) {
            console.warn('Could not fetch user profile info:', e);
          }

          resolve({ accessToken, user });
        }
      });

      // Prompt account selection to ensure clean login experience
      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Converts a Google Photos API MediaItem into the app's TimelineItem format
 */
export function convertGooglePhotoToTimelineItem(item: GooglePhotosMediaItem): TimelineItem {
  const dateStr = item.mediaMetadata?.creationTime || new Date().toISOString();
  const d = new Date(dateStr);
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const cameraMake = item.mediaMetadata?.photo?.cameraMake;
  const cameraModel = item.mediaMetadata?.photo?.cameraModel;
  const camera = cameraMake || cameraModel ? `${cameraMake || ''} ${cameraModel || ''}`.trim() : undefined;

  const width = item.mediaMetadata?.width ? parseInt(item.mediaMetadata.width, 10) : undefined;
  const height = item.mediaMetadata?.height ? parseInt(item.mediaMetadata.height, 10) : undefined;

  // Google Photos image scaling parameter:
  // =w1600-h1200 gives high res view, =w400-h400-c gives square cropped thumbnail
  const highResUrl = `${item.baseUrl}=w1600-h1200`;
  const thumbUrl = `${item.baseUrl}=w400-h400-c`;

  return {
    id: `gphoto_${item.id}`,
    type: 'photo',
    ts: dateStr,
    title: item.description || item.filename || 'Google Photo',
    subtitle: `${item.filename || 'Photo'} • Google Photos`,
    platform: 'Google Photos',
    url: highResUrl,
    photoUrl: highResUrl,
    thumbnailUrl: thumbUrl,
    camera,
    cameraModel,
    width,
    height,
    description: item.description || undefined,
    album: 'Google Photos Cloud',
    favorite: false,
    dateObj: validDate
  };
}

/**
 * Fetches media items from Google Photos Library API
 */
export async function fetchGooglePhotosMediaItems(
  accessToken: string,
  pageSize: number = 50,
  pageToken?: string
): Promise<{ items: GooglePhotosMediaItem[]; nextPageToken?: string }> {
  let url = `https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=${Math.min(pageSize, 100)}`;
  if (pageToken) {
    url += `&pageToken=${encodeURIComponent(pageToken)}`;
  }

  const res = await resilientFetch<any>(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Google Photos session expired. Please sign in again.');
    }
    if (res.status === 403) {
      throw new Error(
        `Google Photos API access error: ${res.error || 'Access forbidden'}. Ensure the Google Photos Library API is enabled in your Google Cloud project console.`
      );
    }
    throw new Error(`Google Photos API request failed (${res.status}): ${res.error || 'Unknown error'}`);
  }

  const data = res.data || {};
  return {
    items: data.mediaItems || [],
    nextPageToken: data.nextPageToken
  };
}

/**
 * Synchronizes recent photos from Google Photos directly into TimelineItems
 */
export async function syncGooglePhotos(
  accessToken: string,
  targetCount: number = 100,
  onProgress?: (count: number, message: string) => void
): Promise<TimelineItem[]> {
  const resultPhotos: TimelineItem[] = [];
  let nextPageToken: string | undefined = undefined;
  let pageNumber = 1;

  onProgress?.(0, 'Connecting to Google Photos Library...');

  do {
    const remaining = targetCount - resultPhotos.length;
    const pageSize = Math.min(50, remaining);

    onProgress?.(resultPhotos.length, `Fetching photo batch ${pageNumber}...`);
    const page = await fetchGooglePhotosMediaItems(accessToken, pageSize, nextPageToken);

    if (page.items && page.items.length > 0) {
      for (const item of page.items) {
        resultPhotos.push(convertGooglePhotoToTimelineItem(item));
      }
      onProgress?.(resultPhotos.length, `Fetched ${resultPhotos.length} photos...`);
    } else {
      break;
    }

    nextPageToken = page.nextPageToken;
    pageNumber++;
  } while (nextPageToken && resultPhotos.length < targetCount);

  onProgress?.(resultPhotos.length, `Sync completed: ${resultPhotos.length} photos loaded.`);
  return resultPhotos;
}
