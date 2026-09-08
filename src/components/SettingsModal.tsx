import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sliders,
  Palette,
  ArrowUpDown,
  MapPin,
  ShieldCheck,
  Info,
  Check,
  Search,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  Moon,
  Sun,
  Layers,
  Headphones,
  Youtube,
  Globe,
  StickyNote,
  Bookmark,
  Cloud,
  Image as ImageIcon,
  GraduationCap,
  Linkedin,
  Mail,
  ExternalLink,
  Sparkles,
  LayoutDashboard,
  Clock,
  HeartPulse,
  HardDrive
} from 'lucide-react';
import { UserSettings, ViewType, LayoutDensity, FontFamilyOption } from '../types';
import { PWAInstallButton } from './pwa/PWAInstallButton';
import { AppZoomControls } from './common/AppZoomControls';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (updater: Partial<UserSettings>) => void;
  totalEventsCount?: number;
  itemsByType?: {
    spotify?: number;
    youtube?: number;
    maps?: number;
    browser?: number;
    photo?: number;
  };
  notesCount?: number;
  eventsCount?: number;
  importedFilesCount?: number;
  onClearDataset: (type: 'spotify' | 'youtube' | 'maps' | 'browser' | 'notes' | 'events') => void;
  onClearAllData: () => void;
  onExportFullBackup: () => void;
  onImportBackup: (file: File) => void;
  onLoadDemoData?: () => void;
  onBatchResolveGeo?: () => void;
  unresolvedCount?: number;
  isGeoResolving?: boolean;
  onOpenRaindropSync?: () => void;
  onOpenImportedFiles?: () => void;
  isAmoled?: boolean;
  onToggleAmoled?: () => void;
  zoom?: number;
  onSetZoom?: (z: number) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
}

export type SettingsCategory =
  | 'general'
  | 'appearance'
  | 'data'
  | 'geo'
  | 'privacy'
  | 'about';

interface CategoryConfig {
  id: SettingsCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  totalEventsCount = 0,
  itemsByType = { spotify: 0, youtube: 0, maps: 0, browser: 0 },
  notesCount = 0,
  eventsCount = 0,
  importedFilesCount = 0,
  onClearDataset,
  onClearAllData,
  onExportFullBackup,
  onImportBackup,
  onLoadDemoData,
  onBatchResolveGeo,
  unresolvedCount = 0,
  isGeoResolving = false,
  onOpenRaindropSync,
  onOpenImportedFiles,
  isAmoled = true,
  onToggleAmoled,
  zoom = 1.0,
  onSetZoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [confirmClearType, setConfirmClearType] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLogoStory, setShowLogoStory] = useState<boolean>(false);
  const [storageEstimate, setStorageEstimate] = useState<{ usedMB: number; quotaMB: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        const usedMB = Math.round(((estimate.usage || 0) / (1024 * 1024)) * 10) / 10;
        const quotaMB = Math.round((estimate.quota || 0) / (1024 * 1024));
        setStorageEstimate({ usedMB, quotaMB });
      }).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLogoStory) {
          setShowLogoStory(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showLogoStory, onClose]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
      showToast(`Imported ${file.name}`);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportCSV = () => {
    try {
      const csvHeader = 'Dataset,Count\n';
      const rows = [
        `Spotify,${itemsByType.spotify || 0}`,
        `YouTube,${itemsByType.youtube || 0}`,
        `Maps,${itemsByType.maps || 0}`,
        `Browser,${itemsByType.browser || 0}`,
        `Notes,${notesCount}`,
        `Events,${eventsCount}`,
        `Total Life Events,${totalEventsCount}`
      ].join('\n');
      const blob = new Blob([csvHeader + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emreh-data-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Exported CSV summary');
    } catch {
      showToast('Export failed');
    }
  };

  const categories: CategoryConfig[] = [
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'data', label: 'Data & Backups', icon: ArrowUpDown, badge: (totalEventsCount + notesCount) > 0 ? (totalEventsCount + notesCount) : null },
    { id: 'geo', label: 'Geo & Cloud', icon: MapPin, badge: unresolvedCount > 0 ? unresolvedCount : null },
    { id: 'privacy', label: 'Privacy & Storage', icon: ShieldCheck },
    { id: 'about', label: 'About', icon: Info }
  ];

  const viewsList: { id: ViewType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home Canvas', icon: LayoutDashboard },
    { id: 'screentime', label: 'Screentime', icon: Clock },
    { id: 'timeline', label: 'Journal', icon: Layers },
    { id: 'maptimeline', label: 'Map', icon: MapPin },
    { id: 'photos', label: 'Photos', icon: ImageIcon },
    { id: 'spotify', label: 'Spotify', icon: Headphones },
    { id: 'youtube', label: 'YouTube', icon: Youtube },
    { id: 'browser', label: 'Browser', icon: Globe },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'fit', label: 'Fit Health', icon: HeartPulse },
    { id: 'box', label: 'Box Cloud', icon: Cloud },
    { id: 'gdrive', label: 'Google Drive', icon: HardDrive }
  ];

  return (
    <div id="settings-modal-wrapper" className="fixed inset-0 z-[220] overflow-hidden">
      {/* Calm semi-transparent backdrop */}
      <div
        className="fixed inset-0 z-[219] bg-stone-950/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Mounted to Left Border Sheet */}
      <div
        id="settings-modal-card"
        className="fixed inset-y-0 left-0 z-[220] flex h-full w-full max-w-3xl bg-stone-50 dark:bg-[#141416] border-r border-stone-200 dark:border-stone-800 shadow-2xl flex-col sm:flex-row overflow-hidden animate-in slide-in-from-left duration-200"
      >
        {/* Left Navigation Sidebar */}
        <aside className="w-full sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-stone-200 dark:border-stone-800/80 bg-stone-100/70 dark:bg-[#18181b]/70 flex flex-col">
          {/* Header with Emreh Logo & Farsi Branding */}
          <div className="p-4 border-b border-stone-200 dark:border-stone-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowLogoStory(!showLogoStory)}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
              title="About Emreh"
            >
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-stone-300 dark:border-stone-700 bg-[#081318] dark:bg-[#071114] p-0.5 shrink-0 group-hover:border-stone-400 transition-colors">
                <img src={`${import.meta.env.BASE_URL}app-icon.svg`} alt="Emreh" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">Emreh</span>
                  <span className="text-xs font-serif text-stone-500 dark:text-stone-400">همراه</span>
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">Life Companion</div>
              </div>
            </button>

            <button
              onClick={onClose}
              className="sm:hidden p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Minimal Search Filter */}
          <div className="p-2.5 border-b border-stone-200 dark:border-stone-800/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Search settings..."
                className="w-full pl-7 pr-6 py-1 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700/80 rounded-lg text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-2 flex-1 overflow-y-auto space-y-0.5">
            {categories
              .filter(cat => !searchFilter || cat.label.toLowerCase().includes(searchFilter.toLowerCase()))
              .map(cat => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id && !showLogoStory;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setShowLogoStory(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </div>
                    {cat.badge !== undefined && cat.badge !== null && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-700/60 text-stone-600 dark:text-stone-300">
                        {cat.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </nav>

          {/* Clean Footer */}
          <div className="p-3 border-t border-stone-200 dark:border-stone-800/80 text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
            <span>IndexedDB Local</span>
            <span className="font-mono">v2.5</span>
          </div>
        </aside>

        {/* Right Detail Sub-Panel */}
        <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-[#141416]">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {showLogoStory ? 'About Emreh (همراه)' : categories.find(c => c.id === activeCategory)?.label}
              </h2>
              {toastMessage && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                  {toastMessage}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-Panel Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Minimal App Story Popover (when clicking logo) */}
            {showLogoStory ? (
              <div className="space-y-4 max-w-lg animate-in fade-in duration-150">
                <div className="flex items-center gap-3 pb-2 border-b border-stone-200 dark:border-stone-800">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-stone-300 dark:border-stone-700 bg-[#081318] dark:bg-[#071114] p-0.5 shrink-0">
                    <img src={`${import.meta.env.BASE_URL}app-icon.svg`} alt="Emreh" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      Emreh
                      <span className="text-sm font-serif text-stone-500 dark:text-stone-400">همراه</span>
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      همراه و همسفر در مسیر روزمره زندگی
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  <p>
                    <strong>Emreh</strong> (from the Persian <strong>همراه</strong>, meaning companion or traveler along the way) is a private, sovereign life journal and memory archive.
                  </p>
                  <p>
                    It gathers your daily notes, music listening, video watching, visited places, and photos into one cohesive timeline.
                  </p>
                  <p>
                    All records stay strictly inside your browser’s local IndexedDB. No tracking, no external server storage.
                  </p>
                </div>

                {/* Creator Details */}
                <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 space-y-2 text-xs">
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-stone-100 text-xs">Amre Salehin</div>
                    <div className="text-[11px] text-stone-600 dark:text-stone-400 flex items-center gap-1.5 mt-0.5">
                      <GraduationCap className="w-3.5 h-3.5 shrink-0 text-stone-500 dark:text-stone-400" />
                      <span>MBBS Student, Medical College Kolkata</span>
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-stone-200/80 dark:border-stone-800/80 flex flex-wrap items-center gap-3 text-[11px]">
                    <a
                      href="https://www.linkedin.com/in/amresalehin/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                    >
                      <Linkedin className="w-3 h-3" />
                      <span>LinkedIn</span>
                      <ExternalLink className="w-2.5 h-2.5 text-stone-400" />
                    </a>
                    <span className="text-stone-300 dark:text-stone-700">•</span>
                    <a
                      href="mailto:amresalehin@duck.com"
                      className="inline-flex items-center gap-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                    >
                      <Mail className="w-3 h-3" />
                      <span>amresalehin@duck.com</span>
                    </a>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => setShowLogoStory(false)}
                    className="px-3.5 py-1.5 text-xs font-medium bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-lg hover:opacity-90 cursor-pointer"
                  >
                    Back to Settings
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 1. GENERAL */}
                {activeCategory === 'general' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    {/* Startup View */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                        Default Startup View
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {viewsList.map(v => {
                          const Icon = v.icon;
                          const isSelected = settings.defaultView === v.id;
                          return (
                            <button
                              key={v.id}
                              onClick={() => {
                                onUpdateSettings({ defaultView: v.id });
                                showToast(`Startup view: ${v.label}`);
                              }}
                              className={`p-2 rounded-lg border text-left flex items-center gap-2 text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-stone-200 dark:bg-stone-800 border-stone-400 dark:border-stone-600 text-stone-900 dark:text-stone-100 font-medium'
                                  : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-700'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{v.label}</span>
                              {isSelected && <Check className="w-3 h-3 ml-auto text-stone-700 dark:text-stone-300 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time Format */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                        Clock Format
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            onUpdateSettings({ timeFormat: '12h' });
                            showToast('12-Hour clock');
                          }}
                          className={`py-1.5 px-3 rounded-lg border text-xs text-center transition-colors cursor-pointer ${
                            settings.timeFormat === '12h'
                              ? 'bg-stone-200 dark:bg-stone-800 border-stone-400 dark:border-stone-600 text-stone-900 dark:text-stone-100 font-medium'
                              : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          12-Hour (3:45 PM)
                        </button>
                        <button
                          onClick={() => {
                            onUpdateSettings({ timeFormat: '24h' });
                            showToast('24-Hour clock');
                          }}
                          className={`py-1.5 px-3 rounded-lg border text-xs text-center transition-colors cursor-pointer ${
                            settings.timeFormat === '24h'
                              ? 'bg-stone-200 dark:bg-stone-800 border-stone-400 dark:border-stone-600 text-stone-900 dark:text-stone-100 font-medium'
                              : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          24-Hour (15:45)
                        </button>
                      </div>
                    </div>

                    {/* Density */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                        Layout Density
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['compact', 'comfortable', 'spacious'] as LayoutDensity[]).map(d => (
                          <button
                            key={d}
                            onClick={() => {
                              onUpdateSettings({ density: d });
                              showToast(`Density: ${d}`);
                            }}
                            className={`py-1.5 px-2 rounded-lg border text-xs text-center capitalize transition-colors cursor-pointer ${
                              (settings.density || 'comfortable') === d
                                ? 'bg-stone-200 dark:bg-stone-800 border-stone-400 dark:border-stone-600 text-stone-900 dark:text-stone-100 font-medium'
                                : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="pt-2 border-t border-stone-200 dark:border-stone-800/80 space-y-2">
                      <label className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 cursor-pointer">
                        <div className="text-xs">
                          <div className="text-stone-800 dark:text-stone-200 font-medium">Auto-select initial item</div>
                          <div className="text-stone-500 text-[11px]">Automatically opens the first record in media views</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.autoSelectFirstItem ?? true}
                          onChange={e => onUpdateSettings({ autoSelectFirstItem: e.target.checked })}
                          className="w-4 h-4 rounded border-stone-300 text-stone-700 accent-stone-700 dark:accent-stone-300"
                        />
                      </label>
                    </div>

                    {/* UI Scaling & Zoom Controls */}
                    {onSetZoom && onZoomIn && onZoomOut && onResetZoom && (
                      <div className="pt-2 border-t border-stone-200 dark:border-stone-800/80 space-y-2">
                        <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                          Laptop & Mobile Display Scaling
                        </label>
                        <AppZoomControls
                          variant="full"
                          zoom={zoom}
                          onSetZoom={onSetZoom}
                          onZoomIn={onZoomIn}
                          onZoomOut={onZoomOut}
                          onResetZoom={onResetZoom}
                        />
                      </div>
                    )}

                    {/* PWA & Mobile Companion Installation */}
                    <div className="pt-2 border-t border-stone-200 dark:border-stone-800/80 space-y-2">
                      <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                        Android & Web App (PWA)
                      </label>
                      <PWAInstallButton variant="full" />
                    </div>
                  </div>
                )}

                {/* 2. APPEARANCE */}
                {activeCategory === 'appearance' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    {/* Independent Theme & Luminance Matrix */}
                    <div className="space-y-4">
                      {/* 1. Glass Theme Selection */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                            Glass Theme
                          </label>
                          <span className="text-[11px] text-stone-500">
                            Surface optics & material
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            {
                              id: 'solid-glass',
                              label: 'Solid Glass',
                              desc: 'Frosted architectural glass with calm structural surfaces',
                              icon: Layers
                            },
                            {
                              id: 'liquid-glass',
                              label: 'Liquid Glass',
                              desc: 'Fluid optic glass with caustics, highlights & liquid bodies',
                              icon: Sparkles
                            }
                          ].map(t => {
                            const Icon = t.icon;
                            const isSelected = settings.theme === t.id;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  onUpdateSettings({ theme: t.id as any });
                                  showToast(`Theme: ${t.label}`);
                                }}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? t.id === 'liquid-glass'
                                      ? 'bg-sky-500/15 border-sky-400/80 text-sky-950 dark:text-sky-100 shadow-[0_0_16px_rgba(56,189,248,0.25)] ring-1 ring-sky-400/50'
                                      : 'bg-stone-200/80 dark:bg-stone-800 border-stone-400 dark:border-stone-600 text-stone-900 dark:text-stone-100 shadow-xs ring-1 ring-stone-400/40'
                                    : 'bg-stone-50/70 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Icon className={`w-4 h-4 shrink-0 ${isSelected && t.id === 'liquid-glass' ? 'text-sky-400 animate-pulse' : ''}`} />
                                  <span className="text-xs font-semibold">{t.label}</span>
                                </div>
                                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                                  {t.desc}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Luminance Selection (Dark vs Light) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                            Luminance
                          </label>
                          <span className="text-[11px] text-stone-500">
                            Lighting & tone
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            {
                              id: 'light',
                              label: 'Light Luminance',
                              desc: 'High clarity & crisp contrast for bright spaces',
                              icon: Sun
                            },
                            {
                              id: 'dark',
                              label: 'Dark Luminance',
                              desc: 'Low glare & deep contrast for dark environments',
                              icon: Moon
                            }
                          ].map(lum => {
                            const Icon = lum.icon;
                            const isSelected = settings.luminance === lum.id;
                            return (
                              <button
                                key={lum.id}
                                type="button"
                                onClick={() => {
                                  onUpdateSettings({ luminance: lum.id as any });
                                  showToast(`Luminance: ${lum.label}`);
                                }}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-500/15 border-blue-400/80 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/50'
                                    : 'bg-stone-50/70 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-500 dark:text-blue-400' : ''}`} />
                                  <span className="text-xs font-semibold">{lum.label}</span>
                                </div>
                                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                                  {lum.desc}
                                </p>
                              </button>
                            );
                          })}
                        </div>

                        {/* Current Matrix State Indicator */}
                        <div className="p-2.5 rounded-lg border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-stone-500 text-[11px]">Active Profile:</span>
                            <span className="font-semibold text-stone-800 dark:text-stone-200 capitalize">
                              {settings.theme === 'liquid-glass' ? 'Liquid Glass' : 'Solid Glass'} • {settings.luminance === 'dark' ? 'Dark' : 'Light'}
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                            Independent Axes
                          </span>
                        </div>

                        {/* AMOLED toggle - strictly applies when luminance is Dark */}
                        {settings.luminance === 'dark' && onToggleAmoled && (
                          <label className="flex items-center justify-between p-2.5 mt-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 cursor-pointer">
                            <div className="text-xs">
                              <div className="text-stone-800 dark:text-stone-200 font-medium">True Black (AMOLED)</div>
                              <div className="text-stone-500 text-[11px]">Uses pitch-black backgrounds for OLED displays</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isAmoled}
                              onChange={onToggleAmoled}
                              className="w-4 h-4 rounded border-stone-300 accent-stone-700 dark:accent-stone-300 cursor-pointer"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. DATA & BACKUPS */}
                {activeCategory === 'data' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    {/* Counts overview */}
                    <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40">
                      <div className="text-xs font-medium text-stone-700 dark:text-stone-300 mb-2">Stored Datasets</div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-stone-600 dark:text-stone-400">
                        <div>Spotify: <strong className="text-stone-900 dark:text-stone-200">{itemsByType.spotify || 0}</strong></div>
                        <div>YouTube: <strong className="text-stone-900 dark:text-stone-200">{itemsByType.youtube || 0}</strong></div>
                        <div>Maps: <strong className="text-stone-900 dark:text-stone-200">{itemsByType.maps || 0}</strong></div>
                        <div>Browser: <strong className="text-stone-900 dark:text-stone-200">{itemsByType.browser || 0}</strong></div>
                        <div>Notes: <strong className="text-stone-900 dark:text-stone-200">{notesCount}</strong></div>
                        <div>Events: <strong className="text-stone-900 dark:text-stone-200">{eventsCount}</strong></div>
                      </div>
                    </div>

                    {/* Export & Import actions */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Backup & Restore</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          onClick={onExportFullBackup}
                          className="py-2 px-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/70 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export JSON</span>
                        </button>

                        <button
                          onClick={handleExportCSV}
                          className="py-2 px-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/70 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Export CSV</span>
                        </button>

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="py-2 px-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/70 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Restore Archive</span>
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>

                    {/* Sample dataset section */}
                    {onLoadDemoData && (
                      <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
                        <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Sample Timeline</label>
                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
                          <div className="text-xs text-stone-600 dark:text-stone-400">
                            Load realistic sample data (music, places, journal reflections, photos)
                          </div>
                          <button
                            onClick={() => {
                              onLoadDemoData();
                              showToast('Loaded sample demo timeline');
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg hover:opacity-90 cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 transition-all shadow-2xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Load Sample Data</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Reset section */}
                    <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
                      <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Reset Data</label>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
                        <div className="text-xs text-stone-600 dark:text-stone-400">
                          Clear stored datasets from local browser storage
                        </div>
                        {isResetConfirmOpen ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                onClearAllData();
                                setIsResetConfirmOpen(false);
                                showToast('All data cleared');
                              }}
                              className="px-2.5 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
                            >
                              Confirm Clear
                            </button>
                            <button
                              onClick={() => setIsResetConfirmOpen(false)}
                              className="px-2.5 py-1 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsResetConfirmOpen(true)}
                            className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded border border-red-200 dark:border-red-900/50 cursor-pointer"
                          >
                            Reset All Data
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. GEO & CLOUD */}
                {activeCategory === 'geo' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    {/* Reverse Geocoding */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Geo-Engine</label>
                      <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 space-y-3">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="text-xs">
                            <div className="text-stone-800 dark:text-stone-200 font-medium">Automatic Reverse Geocoding</div>
                            <div className="text-stone-500 text-[11px]">Resolves coordinates to city and country names via Nominatim</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.autoResolveGeo ?? false}
                            onChange={e => onUpdateSettings({ autoResolveGeo: e.target.checked })}
                            className="w-4 h-4 rounded border-stone-300 accent-stone-700 dark:accent-stone-300"
                          />
                        </label>

                        {onBatchResolveGeo && (
                          <div className="pt-2 border-t border-stone-200 dark:border-stone-800/80 flex items-center justify-between">
                            <span className="text-xs text-stone-500">
                              {unresolvedCount > 0 ? `${unresolvedCount} locations pending resolution` : 'All locations resolved'}
                            </span>
                            <button
                              onClick={onBatchResolveGeo}
                              disabled={isGeoResolving || unresolvedCount === 0}
                              className="py-1 px-2.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 text-stone-700 dark:text-stone-200 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className={`w-3 h-3 ${isGeoResolving ? 'animate-spin' : ''}`} />
                              <span>{isGeoResolving ? 'Resolving...' : 'Batch Resolve'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* External integrations shortcuts */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Connected Services</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {onOpenRaindropSync && (
                          <button
                            onClick={onOpenRaindropSync}
                            className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-left hover:border-stone-300 dark:hover:border-stone-700 transition-colors cursor-pointer"
                          >
                            <div className="text-xs font-medium text-stone-800 dark:text-stone-200">Raindrop.io Bookmarks</div>
                            <div className="text-[11px] text-stone-500">Sync web reading collections</div>
                          </button>
                        )}

                        {onOpenImportedFiles && (
                          <button
                            onClick={onOpenImportedFiles}
                            className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-left hover:border-stone-300 dark:hover:border-stone-700 transition-colors cursor-pointer"
                          >
                            <div className="text-xs font-medium text-stone-800 dark:text-stone-200">Imported Files Archive</div>
                            <div className="text-[11px] text-stone-500">{importedFilesCount} files stored locally</div>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. PRIVACY & STORAGE */}
                {activeCategory === 'privacy' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Privacy Preferences</label>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 cursor-pointer">
                          <div className="text-xs">
                            <div className="text-stone-800 dark:text-stone-200 font-medium">Strip Tracking Parameters</div>
                            <div className="text-stone-500 text-[11px]">Removes utm_*, fbclid, and referral tokens from imported URLs</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.stripTrackingParams ?? true}
                            onChange={e => onUpdateSettings({ stripTrackingParams: e.target.checked })}
                            className="w-4 h-4 rounded border-stone-300 accent-stone-700 dark:accent-stone-300"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 cursor-pointer">
                          <div className="text-xs">
                            <div className="text-stone-800 dark:text-stone-200 font-medium">YouTube Privacy-Enhanced Mode</div>
                            <div className="text-stone-500 text-[11px]">Uses youtube-nocookie.com player domain for embeds</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.youtubePrivacyMode ?? true}
                            onChange={e => onUpdateSettings({ youtubePrivacyMode: e.target.checked })}
                            className="w-4 h-4 rounded border-stone-300 accent-stone-700 dark:accent-stone-300"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Storage usage */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Browser Storage</label>
                      <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-xs text-stone-600 dark:text-stone-400 space-y-1">
                        <div>Local IndexedDB usage: <strong className="text-stone-900 dark:text-stone-200">{storageEstimate ? `${storageEstimate.usedMB} MB` : 'Calculating...'}</strong></div>
                        {storageEstimate?.quotaMB && (
                          <div className="text-[11px] text-stone-500">Available quota: ~{storageEstimate.quotaMB} MB</div>
                        )}
                        <div className="text-[11px] text-stone-500 pt-1">
                          All data is stored directly on this device. No remote servers receive your personal history.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. ABOUT */}
                {activeCategory === 'about' && (
                  <div className="space-y-4 max-w-lg animate-in fade-in duration-150">
                    <div className="flex items-center gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-stone-300 dark:border-stone-700 bg-[#081318] dark:bg-[#071114] p-0.5 shrink-0">
                        <img src={`${import.meta.env.BASE_URL}app-icon.svg`} alt="Emreh" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                          Emreh
                          <span className="text-sm font-serif text-stone-500 dark:text-stone-400">همراه</span>
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          همراه و همسفر وفادار در تمام لحظات زندگی
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                      <p>
                        <strong>Emreh (همراه)</strong> is a minimal, sovereign personal timeline. It consolidates daily journal entries, music listening, video history, places visited, and photos into one private space.
                      </p>
                      <p>
                        Derived from the Persian word <strong>همراه</strong> (companion / one who walks the road with you), the app emphasizes simplicity, quiet focus, and client-side data sovereignty.
                      </p>
                    </div>

                    {/* Creator Details */}
                    <div className="p-3.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 space-y-2.5">
                      <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                        Creator & Developer
                      </div>
                      <div>
                        <div className="font-semibold text-stone-900 dark:text-stone-100 text-sm">Amre Salehin</div>
                        <div className="text-xs text-stone-600 dark:text-stone-400 flex items-center gap-1.5 mt-0.5">
                          <GraduationCap className="w-3.5 h-3.5 shrink-0 text-stone-500 dark:text-stone-400" />
                          <span>MBBS Student, Medical College Kolkata</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800/80 flex flex-wrap items-center gap-3 text-xs">
                        <a
                          href="https://www.linkedin.com/in/amresalehin/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                          <span>LinkedIn</span>
                          <ExternalLink className="w-3 h-3 text-stone-400" />
                        </a>
                        <span className="text-stone-300 dark:text-stone-700">•</span>
                        <a
                          href="mailto:amresalehin@duck.com"
                          className="inline-flex items-center gap-1.5 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>amresalehin@duck.com</span>
                        </a>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-xs text-stone-600 dark:text-stone-400 space-y-1">
                      <div>Version: <strong>2.5</strong></div>
                      <div>Architecture: <strong>100% Client-side React + IndexedDB</strong></div>
                      <div>Telemetry: <strong>Zero tracking or analytics</strong></div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
export default SettingsModal;
