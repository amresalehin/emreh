export type GDriveCategory =
  | 'folder'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'pdf'
  | 'image'
  | 'video'
  | 'archive'
  | 'code'
  | 'other';

export interface GDriveFile {
  id: string;
  name: string;
  mimeType: string;
  category: GDriveCategory;
  size?: number;
  formattedSize?: string;
  modifiedTime: string;
  isFolder: boolean;
  parentId?: string | null;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  starred?: boolean;
  shared?: boolean;
  ownerName?: string;
  textContent?: string;
}

export interface GDriveStorageQuota {
  limit: number; // bytes, e.g. 15 * 1024 * 1024 * 1024 (15GB)
  usage: number; // bytes used
  usageInDrive: number;
  formattedLimit: string;
  formattedUsage: string;
  percentUsed: number;
}

export interface GDriveUser {
  displayName: string;
  emailAddress: string;
  photoLink?: string;
}

export interface GDriveDriveConfig {
  id: 'drive-1' | 'drive-2';
  driveLetter: 'G:' | 'H:';
  name: string;
  status: 'connected' | 'demo' | 'disconnected';
  clientId?: string;
  accessToken?: string | null;
  tokenExpiry?: number | null;
  user?: GDriveUser;
  storageQuota?: GDriveStorageQuota;
  lastSynced?: string;
}

export interface GDriveBreadcrumb {
  id: string;
  name: string;
}
