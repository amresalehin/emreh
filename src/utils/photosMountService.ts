import { TimelineItem } from '../types';
import { normalizeTimestamp } from './dataParser';

export interface MountedPhotoFolderInfo {
  name: string;
  photoCount: number;
  geoCount: number;
  mountedAt: string;
}

export interface GooglePhotosTakeoutJson {
  title?: string;
  description?: string;
  imageViews?: string;
  creationTime?: {
    timestamp?: string | number;
    formatted?: string;
  };
  photoTakenTime?: {
    timestamp?: string | number;
    formatted?: string;
  };
  geoData?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    latitudeSpan?: number;
    longitudeSpan?: number;
  };
  geoDataExif?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
  people?: Array<{ name: string }>;
  url?: string;
  googlePhotosOrigin?: {
    mobileUpload?: {
      deviceType?: string;
    };
    webUpload?: Record<string, any>;
    driveDesktopSync?: Record<string, any>;
  };
}

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'heic', 'gif', 'avif', 'bmp', 'tiff'
]);

export function isImageFile(fileName: string): boolean {
  const parts = fileName.split('.');
  if (parts.length < 2) return false;
  const ext = parts[parts.length - 1].toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

/**
 * Parses timestamp from typical Google Photos filenames if no JSON sidecar exists.
 * e.g., IMG_20240514_143022.jpg, PXL_20231105_091522812.jpg, 2024-05-14 14.30.22.jpg
 */
export function extractDateFromFilename(fileName: string): string | null {
  // Pattern 1: YYYYMMDD_HHMMSS or PXL_YYYYMMDD_HHMMSS or IMG_YYYYMMDD_HHMMSS
  const match1 = fileName.match(/(?:IMG_|PXL_|VID_)?(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/i);
  if (match1) {
    const [_, y, m, d, hh, mm, ss] = match1;
    const date = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // Pattern 2: YYYY-MM-DD HH.MM.SS or YYYY-MM-DD_HH-MM-SS
  const match2 = fileName.match(/(\d{4})[-_](\d{2})[-_](\d{2})[\s_T](\d{2})[.:\-](\d{2})[.:\-](\d{2})/);
  if (match2) {
    const [_, y, m, d, hh, mm, ss] = match2;
    const date = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // Pattern 3: Just date YYYY-MM-DD or YYYYMMDD
  const match3 = fileName.match(/(?:Photos from )?(\d{4})[-_](\d{2})[-_](\d{2})/i);
  if (match3) {
    const [_, y, m, d] = match3;
    const date = new Date(Date.UTC(+y, +m - 1, +d, 12, 0, 0));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  return null;
}

/**
 * Format bytes to readable string (e.g. 2.4 MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Process a list of File objects (e.g. from directory picker, folder upload, or drag-and-drop)
 * Matches image files with their Google Takeout JSON sidecars.
 */
export async function processMountedPhotoFiles(
  files: File[],
  folderName: string = 'Mounted Folder',
  onProgress?: (progress: number, status: string) => void
): Promise<TimelineItem[]> {
  const fileMap = new Map<string, File>();
  const jsonMap = new Map<string, File>();

  onProgress?.(5, `Scanning ${files.length} files...`);

  // Index files by normalized path/name
  for (const file of files) {
    const relativePath = (file as any).webkitRelativePath || file.name;
    const nameLower = relativePath.toLowerCase();

    if (nameLower.endsWith('.json')) {
      jsonMap.set(relativePath, file);
      // Also map by basename for looser pairing
      const baseName = file.name.toLowerCase();
      jsonMap.set(baseName, file);
    } else if (isImageFile(file.name)) {
      fileMap.set(relativePath, file);
    }
  }

  const photoFiles = Array.from(fileMap.entries());
  const totalPhotos = photoFiles.length;
  const items: TimelineItem[] = [];

  for (let i = 0; i < totalPhotos; i++) {
    const [path, file] = photoFiles[i];
    if (i % 10 === 0 && onProgress) {
      const pct = Math.min(95, Math.round(10 + (i / totalPhotos) * 80));
      onProgress(pct, `Mounting photo ${i + 1} of ${totalPhotos}...`);
    }

    // Attempt to locate sidecar JSON in Takeout:
    // Pattern A: path + ".json" (e.g. "Photos/IMG_01.jpg.json")
    // Pattern B: file.name + ".json"
    // Pattern C: path without extension + ".json"
    let sidecarFile = jsonMap.get(path + '.json') ||
      jsonMap.get(file.name.toLowerCase() + '.json') ||
      jsonMap.get(path.replace(/\.[^/.]+$/, '') + '.json');

    // Google Takeout truncated names handle (e.g. "photo(1).jpg" -> "photo.jpg(1).json")
    if (!sidecarFile) {
      const parenMatch = file.name.match(/^(.+?)\((\d+)\)\.([^.]+)$/);
      if (parenMatch) {
        const altJson = `${parenMatch[1]}.${parenMatch[3]}(${parenMatch[2]}).json`.toLowerCase();
        sidecarFile = jsonMap.get(altJson);
      }
    }

    let takeoutMeta: GooglePhotosTakeoutJson | null = null;
    if (sidecarFile) {
      try {
        const text = await sidecarFile.text();
        takeoutMeta = JSON.parse(text);
      } catch (err) {
        console.warn('Failed to parse sidecar JSON for', file.name, err);
      }
    }

    // Determine timestamp
    let rawTimestamp: string | null = null;
    if (takeoutMeta?.photoTakenTime?.timestamp) {
      rawTimestamp = normalizeTimestamp(+takeoutMeta.photoTakenTime.timestamp * 1000);
    } else if (takeoutMeta?.photoTakenTime?.formatted) {
      rawTimestamp = normalizeTimestamp(takeoutMeta.photoTakenTime.formatted);
    } else if (takeoutMeta?.creationTime?.timestamp) {
      rawTimestamp = normalizeTimestamp(+takeoutMeta.creationTime.timestamp * 1000);
    }

    if (!rawTimestamp) {
      rawTimestamp = extractDateFromFilename(file.name);
    }

    if (!rawTimestamp) {
      rawTimestamp = new Date(file.lastModified || Date.now()).toISOString();
    }

    const dateObj = new Date(rawTimestamp);

    // Extract GPS
    let lat: number | null = null;
    let lng: number | null = null;

    if (takeoutMeta?.geoData && (takeoutMeta.geoData.latitude !== 0 || takeoutMeta.geoData.longitude !== 0)) {
      lat = takeoutMeta.geoData.latitude || null;
      lng = takeoutMeta.geoData.longitude || null;
    } else if (takeoutMeta?.geoDataExif && (takeoutMeta.geoDataExif.latitude !== 0 || takeoutMeta.geoDataExif.longitude !== 0)) {
      lat = takeoutMeta.geoDataExif.latitude || null;
      lng = takeoutMeta.geoDataExif.longitude || null;
    }

    // Extract People
    const people = (takeoutMeta?.people || []).map(p => p.name).filter(Boolean);

    // Camera / Device
    let camera: string | undefined;
    if (takeoutMeta?.googlePhotosOrigin?.mobileUpload?.deviceType) {
      camera = takeoutMeta.googlePhotosOrigin.mobileUpload.deviceType.replace(/_/g, ' ');
    }

    // Local Blob URL for high performance rendering without network cost
    const blobUrl = URL.createObjectURL(file);

    // Clean folder/album name from path
    const pathSegments = path.split('/');
    let album = folderName;
    if (pathSegments.length > 1) {
      album = pathSegments[pathSegments.length - 2];
      if (album === 'Photos from ' || album.toLowerCase() === 'google photos') {
        album = folderName;
      }
    }

    const title = takeoutMeta?.description || file.name;
    const subtitle = camera ? `${camera} • ${formatBytes(file.size)}` : `${album} • ${formatBytes(file.size)}`;

    const photoItem: TimelineItem = {
      id: `photo_${dateObj.getTime()}_${Math.random().toString(36).substring(2, 8)}`,
      type: 'photo',
      ts: dateObj.toISOString(),
      dateObj,
      title,
      subtitle,
      platform: 'Google Photos',
      photoUrl: blobUrl,
      thumbnailUrl: blobUrl,
      localBlobUrl: blobUrl,
      description: takeoutMeta?.description || '',
      camera,
      people: people.length > 0 ? people : undefined,
      album,
      folderName,
      lat,
      lng,
      fileSizeBytes: file.size,
      formattedFileSize: formatBytes(file.size),
      isMountedDirectly: true,
      takeoutUrl: takeoutMeta?.url
    };

    items.push(photoItem);
  }

  onProgress?.(100, `Successfully mounted ${items.length} Google Photos!`);
  return items;
}

/**
 * Triggers native directory picker (File System Access API) if available,
 * or returns null to signal falling back to standard input element.
 */
export async function promptNativeDirectoryMount(
  onProgress?: (progress: number, status: string) => void
): Promise<{ items: TimelineItem[]; folderName: string } | null> {
  if (typeof window === 'undefined' || !(window as any).showDirectoryPicker) {
    return null;
  }

  try {
    const dirHandle = await (window as any).showDirectoryPicker({
      id: 'google_photos_mount',
      mode: 'read'
    });

    const folderName = dirHandle.name || 'Google Photos';
    onProgress?.(5, `Scanning folder "${folderName}"...`);

    const files: File[] = [];

    async function scanDirectory(handle: any, currentPath: string = '') {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          try {
            const file = await entry.getFile();
            // Attach relative path for sidecar mapping
            Object.defineProperty(file, 'webkitRelativePath', {
              value: currentPath ? `${currentPath}/${file.name}` : file.name,
              writable: false
            });
            files.push(file);
          } catch (e) {
            console.warn('Could not read file in directory:', entry.name, e);
          }
        } else if (entry.kind === 'directory') {
          const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          await scanDirectory(entry, nextPath);
        }
      }
    }

    await scanDirectory(dirHandle);
    const items = await processMountedPhotoFiles(files, folderName, onProgress);
    return { items, folderName };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return null;
    }
    console.warn('Native directory picker failed, falling back:', err);
    return null;
  }
}

/**
 * Curated high-resolution Google Photos demo collection - purged of demo data.
 */
export function getDemoPhotos(): TimelineItem[] {
  return [];
}
