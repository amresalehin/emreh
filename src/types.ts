export type ItemType = 'spotify' | 'youtube' | 'maps' | 'browser' | 'photo';

export interface TimelineCorrelatedLocation {
  lat: number;
  lng: number;
  placeName: string;
  address?: string;
  method: 'exact_stop' | 'nearest_stop' | 'route_segment';
  timeDeltaMinutes: number;
  matchedMapItem?: TimelineItem;
}

export interface TimelineItem {
  id: string;
  type: ItemType;
  ts: string; // ISO 8601 string
  endTs?: string | null;
  dateObj: Date;
  title: string;
  subtitle: string;
  platform?: string;
  correlatedLocation?: TimelineCorrelatedLocation | null;
  // Spotify specifics
  ms_played?: number;
  album?: string;
  spotify_track_uri?: string;
  trackId?: string | null;
  master_metadata_track_name?: string;
  master_metadata_album_artist_name?: string;
  master_metadata_album_album_name?: string;
  // YouTube specifics
  youtube_video_id?: string | null;
  titleUrl?: string;
  // Maps specifics
  lat?: number | null;
  lng?: number | null;
  address?: string;
  placeId?: string | null;
  isRoute?: boolean;
  activityType?: string;
  travelMode?: string;
  distance?: number;
  distanceKm?: string | null;
  origin?: { lat: number; lng: number; address: string } | null;
  destination?: { lat: number; lng: number; address: string } | null;
  pathPoints?: { lat: number; lng: number }[];
  isGeocoded?: boolean;
  category?: string;
  place_name?: string;
  // Browser specifics
  url?: string;
  domain?: string;
  favicon_url?: string;
  transition?: string;
  client_id?: string | null;
  image_url?: string;
  cover?: string;
  media_type?: string;
  // Google Photos specifics
  photoUrl?: string;
  thumbnailUrl?: string;
  localBlobUrl?: string;
  width?: number;
  height?: number;
  camera?: string;
  cameraModel?: string;
  focalLength?: string;
  iso?: number;
  fNumber?: number;
  exposureTime?: string;
  people?: string[];
  favorite?: boolean;
  takeoutUrl?: string;
  photoTakenTime?: string;
  fileSizeBytes?: number;
  formattedFileSize?: string;
  isMountedDirectly?: boolean;
  folderName?: string;
  description?: string;
  raw?: any;
}

export interface CalendarEvent {
  id: number | string;
  title: string;
  date?: string;
  start: string;
  end?: string;
  category: string;
  description?: string;
  source?: string;
}

export interface ImportedFileRecord {
  id: string;
  name?: string;
  size?: string;
  importDate: string;
  count?: number;
  spotifyCount?: number;
  ytCount?: number;
  mapsCount?: number;
  browserCount?: number;
  photoCount?: number;
  fileName?: string;
  filename?: string;
  fileSize?: string;
  recordCount?: number;
  fileType?: string;
}

export type MetricType = 'track' | 'artist' | 'video' | 'channel' | 'domain';

export interface UrlMetadata {
  domain: string;
  protocol: string;
  isSecure: boolean;
  pathname: string;
  pathSegments: string[];
  category: string;
  categoryIcon: string;
  icon: string;
  accentColor: string;
  palette: string[];
  smartTags: string[];
  tags: string[];
  smartSynopsis: string;
  synopsis: string;
  readMinutes: number;
  readTime: string;
  snapshotUrl: string;
  imageUrl: string;
  requiresAuth: boolean;
  isLoginPage: boolean;
  authType: string | null;
  authServiceName: string;
  authBrandIcon: string;
  authBrandGradient: string;
  fallbackHeroSvg: string;
}

export interface ResolvedGeoInfo {
  title: string;
  subtitle: string;
  address: string;
  lat: number;
  lng: number;
}

export type ViewType = 'home' | 'timeline' | 'maptimeline' | 'photos' | 'spotify' | 'youtube' | 'browser' | 'notes' | 'bookmarks' | 'box' | 'gdrive' | 'fit' | 'screentime';
export type SubViewType = 'day' | 'week' | 'month' | 'log' | 'grid' | 'domains';
export type BrowserPreviewTab = 'card' | 'reader' | 'frame' | 'session';
export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface MetricsModalState {
  isOpen: boolean;
  type: 'track' | 'artist' | 'youtube-video' | 'youtube-channel' | 'browser-domain';
  title: string;
  subtitle?: string;
}

export interface MapOverleafModalState {
  isOpen: boolean;
  title: string;
  subtitle: string;
  embedUrl: string;
  externalUrl: string;
  lat?: number | null;
  lng?: number | null;
  origin?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
}

export interface BrowserLeafletModalState {
  isOpen: boolean;
  url: string;
  title: string;
  domain: string;
  ts: string;
}

export interface RecentSearchItem {
  id: string;
  query: string;
  timestamp: number;
  type?: 'all' | 'spotify' | 'youtube' | 'maps' | 'browser';
  matchCount?: number;
}

// Project & Dev types for auxiliary components
export interface VirtualFile {
  name: string;
  path: string;
  content: string;
  size?: number;
  blobUrl?: string;
  blob?: Blob;
  mimeType?: string;
  isDirectory?: boolean;
  lastModified?: number;
}

export interface FileTreeNode {
  id?: string;
  name: string;
  path: string;
  type?: 'file' | 'folder';
  isDirectory?: boolean;
  children?: FileTreeNode[];
  size?: number;
  mimeType?: string;
  extension?: string;
}

export interface ZipProject {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  entryPoint?: string;
  availableHtmlFiles?: string[];
  totalSize?: number;
  fileCount?: number;
  loadedAt?: Date;
  rawZipBlob?: Blob;
  files: Map<string, VirtualFile>;
}

export interface SampleApp {
  id: string;
  title: string;
  description: string;
  category?: string;
  tag?: string;
  tags?: string[];
  icon?: string;
  fileCount?: number;
  entryPoint?: string;
  files?: Record<string, string> | VirtualFile[];
}

export interface ConsoleMessage {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error';
  text: string;
  timestamp: number;
}

export interface ViewportDevice {
  id: string;
  name: string;
  width: number | string;
  height: number | string;
  type?: 'desktop' | 'tablet' | 'mobile';
  icon?: any;
}

export interface DeviceConfig {
  id: string;
  name: string;
  width: number | string;
  height: number | string;
  icon?: any;
}

export interface NetworkLogItem {
  id: string;
  url: string;
  method: string;
  status: number;
  time: number;
  type?: string;
}

export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';
export type GridColumnsOption = 'auto' | '2' | '3' | '4' | '5' | '6';
export type SortOrderOption = 'newest' | 'oldest' | 'title';
export type FontSizeOption = 'sm' | 'base' | 'lg';
export type FontFamilyOption = 'sans' | 'serif' | 'mono';

export interface SpotifyMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: string;
  track_id?: string;
  [key: string]: any;
}

export interface YouTubeMetadata {
  title?: string;
  channel?: string;
  duration?: string;
  video_id?: string;
  [key: string]: any;
}

export type GlassTheme = 'solid-glass' | 'liquid-glass';
export type LuminanceMode = 'dark' | 'light';
export type ThemeMode = GlassTheme | 'dark' | 'light' | 'system';

export interface UserSettings {
  theme: GlassTheme;
  luminance: LuminanceMode;
  backgroundEffect: 'dynamic' | 'subtle' | 'static';
  showFloatingOrbs: boolean;
  animationSpeed: 'relaxed' | 'balanced' | 'fast';
  timeFormat: '12h' | '24h';
  defaultView: ViewType;
  autoResolveGeo: boolean;
  defaultDateScope?: string;
  browserDefaultMode?: string;
  youtubeDefaultMode?: string;
  spotifyDefaultMode?: string;
  density?: LayoutDensity;
  gridColumns?: GridColumnsOption;
  fontFamily?: FontFamilyOption;
  fontSize?: FontSizeOption;
  defaultSortOrder?: SortOrderOption;
  autoSelectFirstItem?: boolean;
  enableSoundEffects?: boolean;
  accentColor?: 'logo' | 'violet' | 'emerald' | 'amber' | 'cyan';
  stripTrackingParams?: boolean;
  mediaAutoplayMuted?: boolean;
  highQualityArtwork?: boolean;
  youtubePrivacyMode?: boolean;
  exportFormat?: 'json' | 'minified' | 'csv';
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'solid-glass',
  luminance: 'dark',
  backgroundEffect: 'dynamic',
  showFloatingOrbs: true,
  animationSpeed: 'balanced',
  timeFormat: '12h',
  defaultView: 'home',
  autoResolveGeo: false,
};

// Fit Health & Activity types
export interface FitWorkout {
  id?: string;
  title: string;
  type?: string;
  activityType?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  durationSeconds?: number;
  calories?: number;
  distanceKm?: number;
  distanceMeters?: number;
  avgHeartRateBpm?: number;
  maxHeartRateBpm?: number;
  steps?: number;
  laps?: any[];
  trackpoints?: any[];
  provenance?: any;
}

export type FitDataSourceType = 'daily_summary' | 'interval' | 'json' | 'workout' | 'derived' | 'raw' | (string & {});

export interface FitMetricAlternative<T = number> {
  value: T;
  source: string;
  sourceLabel?: string;
}

export interface FitMetricResolution<T = number> {
  value: T;
  source: string;
  sourceLabel?: string;
  alternatives?: FitMetricAlternative<T>[];
}

export interface FitDailyMetric {
  date: string;
  steps: number;
  stepsGoal?: number;
  stepsSource?: string;
  stepsDetail?: FitMetricResolution<number>;
  // Heart Activity (intensity & active minutes)
  heartPoints?: number;
  heartPointsGoal?: number;
  heartPointsSource?: string;
  heartPointsDetail?: FitMetricResolution<number>;
  heartMinutes?: number;
  heartMinutesGoal?: number;
  heartMinutesSource?: string;
  heartMinutesDetail?: FitMetricResolution<number>;
  heartActivity?: {
    points?: number;
    minutes?: number;
  };

  moveMinutes?: number;
  moveMinutesSource?: string;
  moveMinutesDetail?: FitMetricResolution<number>;
  caloriesActive?: number;
  caloriesActiveSource?: string;
  caloriesActiveDetail?: FitMetricResolution<number>;
  caloriesTotal?: number;
  caloriesTotalSource?: string;
  caloriesTotalDetail?: FitMetricResolution<number>;
  distanceKm?: number;
  distanceKmSource?: string;
  distanceKmDetail?: FitMetricResolution<number>;

  // Heart Rate in BPM (resting, average, minimum, maximum)
  restingHeartRate?: number;
  restingHeartRateDetail?: FitMetricResolution<number>;
  averageHeartRate?: number;
  averageHeartRateDetail?: FitMetricResolution<number>;
  minHeartRate?: number;
  minHeartRateDetail?: FitMetricResolution<number>;
  maxHeartRate?: number;
  maxHeartRateDetail?: FitMetricResolution<number>;
  currentHeartRate?: number;
  heartRate?: {
    resting?: number;
    average?: number;
    min?: number;
    max?: number;
  };
  sleepHours?: number;
  sleepScore?: number;
  workouts?: FitWorkout[];
  weightKg?: number;
  heightM?: number;
  dataSourceType?: FitDataSourceType;
  metricDetails?: Record<string, FitMetricResolution<number>>;
}

export interface FitnessDailyMetric {
  date: string;
  steps?: number;
  caloriesKcal?: number;
  distanceM?: number;
  heartPoints?: number;
  sleepMinutes?: number;
  weightKg?: number;
}

export interface FitnessWeightEntry {
  date: string;
  weightKg: number;
}

// Keep Notes types
export interface KeepChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface KeepNote {
  id: string;
  title: string;
  content: string;
  color?: string;
  labels?: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
  isChecklist?: boolean;
  checklistItems?: KeepChecklistItem[];
  hasAudio?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Correlated Location types
export interface CorrelatedLocationItem {
  id: string;
  originalItem: TimelineItem;
  itemType: 'spotify' | 'youtube' | 'browser' | 'maps' | 'notes' | 'bookmarks';
  title: string;
  subtitle?: string;
  timestamp: string;
  lat: number;
  lng: number;
  placeName: string;
  address: string;
  correlationMethod: 'exact_stop' | 'nearest_stop' | 'route_segment';
  timeDeltaMinutes: number;
}

// Screentime types
export type ScreentimeCategory =
  | 'productivity'
  | 'development'
  | 'social'
  | 'entertainment'
  | 'reading'
  | 'utilities'
  | 'other';

export interface ScreentimeAppItem {
  id: string;
  name: string;
  category: ScreentimeCategory;
  durationMinutes: number;
  icon?: string;
  percentage?: number;
  domain?: string;
}

export interface ScreentimeDayData {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  pickupsCount: number;
  notificationsCount?: number;
  firstPickup?: string;
  lastActivity?: string;
  hourlyMinutes: number[]; // 24 entries (0..23)
  categories: Record<ScreentimeCategory | string, number>;
  apps: ScreentimeAppItem[];
}

export type { NoteObject } from './types/notes';


