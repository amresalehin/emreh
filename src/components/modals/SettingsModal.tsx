import React, { useState } from 'react';
import {
  X,
  Settings,
  LayoutGrid,
  Maximize2,
  Minimize2,
  BookOpen,
  MapPin,
  Headphones,
  Youtube,
  Globe,
  StickyNote,
  Type,
  Eye,
  SlidersHorizontal,
  BookmarkCheck,
  RotateCcw,
  Download,
  Upload,
  Check,
  Calendar,
  Sparkles,
  Layers,
  FileText,
  Clock,
  Tag,
  Radio,
  Image as ImageIcon,
  LayoutDashboard,
  HeartPulse
} from 'lucide-react';
import {
  UserSettings,
  DEFAULT_USER_SETTINGS,
  ViewType,
  LayoutDensity,
  GridColumnsOption,
  SortOrderOption,
  FontFamilyOption,
  FontSizeOption
} from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (newSettings: UserSettings) => void;
  onResetSettings: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetSettings
}) => {
  const [draftSettings, setDraftSettings] = useState<UserSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'startup' | 'layout' | 'visibility' | 'sorting'>('startup');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync draft when opened
  React.useEffect(() => {
    if (isOpen) {
      setDraftSettings({ ...settings });
      setSavedSuccess(false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleUpdateDraft = (partial: Partial<UserSettings>) => {
    setDraftSettings(prev => ({ ...prev, ...partial }));
  };

  const handleSave = () => {
    onSaveSettings(draftSettings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all view settings to their default values?')) {
      setDraftSettings({ ...DEFAULT_USER_SETTINGS });
      onResetSettings();
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(draftSettings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mylife-view-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (typeof parsed === 'object') {
          setDraftSettings(prev => ({ ...prev, ...parsed }));
          alert('Settings imported successfully! Click "Save Defaults" to apply.');
        }
      } catch (err) {
        alert('Invalid JSON settings file.');
      }
    };
    reader.readAsText(file);
  };

  const viewOptions: { id: ViewType; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'home', label: 'Home Canvas (Default)', icon: <LayoutDashboard className="w-4 h-4 text-amber-500" />, desc: 'Central companion hub with widgets & life metrics' },
    { id: 'screentime', label: 'Screentime & Focus', icon: <Clock className="w-4 h-4 text-indigo-500" />, desc: 'App usage duration, pickup counters & hourly curves' },
    { id: 'timeline', label: 'Journal & Daily Timeline', icon: <BookOpen className="w-4 h-4 text-emerald-500" />, desc: 'Chronological timeline & hourly reflection' },
    { id: 'maptimeline', label: 'Map Timeline', icon: <MapPin className="w-4 h-4 text-blue-500" />, desc: 'Geographic routes, visited places & coordinates' },
    { id: 'spotify', label: 'Spotify Music', icon: <Headphones className="w-4 h-4 text-emerald-500" />, desc: 'Listening sessions, artists, audio features & lyrics' },
    { id: 'youtube', label: 'YouTube History', icon: <Youtube className="w-4 h-4 text-red-500" />, desc: 'Watched videos, channels, chapters & transcripts' },
    { id: 'browser', label: 'Browsing Activity', icon: <Globe className="w-4 h-4 text-cyan-500" />, desc: 'Web history, bookmarks, visual mind & reader view' },
    { id: 'notes', label: 'Notes & Diary', icon: <StickyNote className="w-4 h-4 text-amber-500" />, desc: 'Personal reflections, markdown notes & highlights' },
    { id: 'fit', label: 'Google Fit Health', icon: <HeartPulse className="w-4 h-4 text-orange-500" />, desc: 'Steps, heart points, calories, sleep & workout sessions' }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#151518] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-[#18181c]/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                View Preferences & Defaults
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configure default startup tabs, visual density, typography scale, and layout preferences.
              </p>
            </div>
          </div>
          <button aria-label="Action"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 pb-0 border-b border-gray-100 dark:border-gray-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 bg-white dark:bg-[#151518]">
          <button aria-label="Action"
            onClick={() => setActiveTab('startup')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'startup'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Default Views & Scope</span>
          </button>
          <button aria-label="Action"
            onClick={() => setActiveTab('layout')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'layout'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Density & Grid</span>
          </button>
          <button aria-label="Action"
            onClick={() => setActiveTab('visibility')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'visibility'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Content Visibility</span>
          </button>
          <button aria-label="Action"
            onClick={() => setActiveTab('sorting')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'sorting'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Sorting & Behavior</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: DEFAULT VIEWS & SCOPE */}
          {activeTab === 'startup' && (
            <div className="space-y-6">
              {/* Startup View Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Default View on App Launch
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {viewOptions.map(opt => {
                    const isSelected = draftSettings.defaultView === opt.id;
                    return (
                      <button aria-label="Action"
                        key={opt.id}
                        type="button"
                        onClick={() => handleUpdateDraft({ defaultView: opt.id })}
                        className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 text-gray-900 dark:text-white shadow-2xs'
                            : 'bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 shrink-0">
                          {opt.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 dark:text-white text-xs">{opt.label}</span>
                            {isSelected && <Check className="w-4 h-4 text-emerald-500" />}
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Default Date Scope */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Default Date Range Scope
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button aria-label="Action"
                    type="button"
                    onClick={() => handleUpdateDraft({ defaultDateScope: 'day' })}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      draftSettings.defaultDateScope === 'day'
                        ? 'bg-emerald-500/10 border-emerald-500 text-gray-900 dark:text-white font-bold'
                        : 'bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold">Single Day View</div>
                      <div className="text-[11px] text-gray-500 font-normal">Focuses on current day with day-by-day navigation</div>
                    </div>
                    {draftSettings.defaultDateScope === 'day' && <Check className="w-4 h-4 text-emerald-500" />}
                  </button>
                  <button aria-label="Action"
                    type="button"
                    onClick={() => handleUpdateDraft({ defaultDateScope: 'all' })}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      draftSettings.defaultDateScope === 'all'
                        ? 'bg-emerald-500/10 border-emerald-500 text-gray-900 dark:text-white font-bold'
                        : 'bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold">All-Time Library</div>
                      <div className="text-[11px] text-gray-500 font-normal">Shows entire history archive across all dates</div>
                    </div>
                    {draftSettings.defaultDateScope === 'all' && <Check className="w-4 h-4 text-emerald-500" />}
                  </button>
                </div>
              </div>

              {/* Module Default Layout Sub-Modes */}
              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Default Sub-Layout per Module
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Browser Default */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl space-y-2">
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-500" /> Browsing History
                    </span>
                    <select
                      value={draftSettings.browserDefaultMode}
                      onChange={e => handleUpdateDraft({ browserDefaultMode: e.target.value as any })}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-white outline-none focus:border-emerald-500"
                    >
                      <option value="mind">Visual Mind Grid</option>
                      <option value="reader">Distraction-Free Reader</option>
                      <option value="split">Deep Split Inspector</option>
                    </select>
                  </div>

                  {/* YouTube Default */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl space-y-2">
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Youtube className="w-3.5 h-3.5 text-red-500" /> YouTube History
                    </span>
                    <select
                      value={draftSettings.youtubeDefaultMode}
                      onChange={e => handleUpdateDraft({ youtubeDefaultMode: e.target.value as any })}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-white outline-none focus:border-emerald-500"
                    >
                      <option value="mind">Visual Mind Grid</option>
                      <option value="theater">Theater & Transcripts</option>
                      <option value="split">Deep Split Inspector</option>
                      <option value="log">High-Density Log</option>
                      <option value="calendar">Calendar Rhythm</option>
                    </select>
                  </div>

                  {/* Spotify Default */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl space-y-2">
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-emerald-500" /> Spotify Music
                    </span>
                    <select
                      value={draftSettings.spotifyDefaultMode}
                      onChange={e => handleUpdateDraft({ spotifyDefaultMode: e.target.value as any })}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-white outline-none focus:border-emerald-500"
                    >
                      <option value="mind">Visual Mind Grid</option>
                      <option value="player">Live Player & Lyrics</option>
                      <option value="split">Deep Split Inspector</option>
                      <option value="log">High-Density Log</option>
                      <option value="calendar">Calendar Rhythm</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DENSITY & GRID */}
          {activeTab === 'layout' && (
            <div className="space-y-6">
              {/* Density Setting */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Default Layout Density
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'compact', title: 'Compact', icon: <Minimize2 className="w-4 h-4" />, desc: 'Tighter margins & maximized data density' },
                    { id: 'comfortable', title: 'Comfortable', icon: <LayoutGrid className="w-4 h-4" />, desc: 'Balanced spacing, standard text size' },
                    { id: 'spacious', title: 'Spacious', icon: <Maximize2 className="w-4 h-4" />, desc: 'Generous padding & relaxed visual breathing room' }
                  ].map(d => {
                    const isSelected = draftSettings.density === d.id;
                    return (
                      <button aria-label="Action"
                        key={d.id}
                        type="button"
                        onClick={() => handleUpdateDraft({ density: d.id as LayoutDensity })}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 text-gray-900 dark:text-white shadow-2xs font-bold'
                            : 'bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                            {d.icon} {d.title}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-emerald-500" />}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight font-normal">
                          {d.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid Column Count */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Default Grid Columns (Mind & Gallery Views)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'auto', label: 'Auto Responsive', desc: '1 to 4 cols based on screen' },
                    { id: '2', label: '2 Columns', desc: 'Dual-column layout' },
                    { id: '3', label: '3 Columns', desc: 'Triple-column layout' },
                    { id: '4', label: '4 Columns', desc: 'Quad-column gallery' }
                  ].map(c => {
                    const isSelected = draftSettings.gridColumns === c.id;
                    return (
                      <button aria-label="Action"
                        key={c.id}
                        type="button"
                        onClick={() => handleUpdateDraft({ gridColumns: c.id as GridColumnsOption })}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                            : 'bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <div className="font-bold text-xs">{c.label}</div>
                        <div className="text-[10px] text-gray-400 font-normal mt-0.5">{c.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Typography Options */}
              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Typography & Text Hierarchy
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Font Family */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl space-y-2">
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-emerald-500" /> Font Archetype
                    </span>
                    <select
                      value={draftSettings.fontFamily}
                      onChange={e => handleUpdateDraft({ fontFamily: e.target.value as FontFamilyOption })}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-white outline-none focus:border-emerald-500"
                    >
                      <option value="sans">Modern Sans-Serif (Plus Jakarta)</option>
                      <option value="serif">Editorial Serif (Playfair / Merriweather)</option>
                      <option value="mono">Technical Monospace (JetBrains / Fira)</option>
                    </select>
                  </div>

                  {/* Font Size */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl space-y-2">
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-emerald-500" /> Default Base Font Size
                    </span>
                    <select
                      value={draftSettings.fontSize}
                      onChange={e => handleUpdateDraft({ fontSize: e.target.value as FontSizeOption })}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-white outline-none focus:border-emerald-500"
                    >
                      <option value="sm">Small (High compactness)</option>
                      <option value="md">Medium (Standard 16px baseline)</option>
                      <option value="lg">Large (Enhanced readability)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Live Card Preview Box */}
              <div className="p-4 rounded-2xl bg-gray-100/80 dark:bg-black/40 border border-gray-200/80 dark:border-gray-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
                  <span>LIVE CARD PREVIEW</span>
                  <span className="text-emerald-500 font-mono">
                    {draftSettings.density} • {draftSettings.fontSize} • {draftSettings.fontFamily}
                  </span>
                </div>
                <div
                  className={`rounded-xl bg-white dark:bg-[#18181c] border border-gray-200 dark:border-gray-700/80 shadow-xs ${
                    draftSettings.density === 'compact' ? 'p-2.5' : draftSettings.density === 'spacious' ? 'p-5' : 'p-3.5'
                  } ${
                    draftSettings.fontFamily === 'serif' ? 'font-serif' : draftSettings.fontFamily === 'mono' ? 'font-mono' : 'font-sans'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-1.5 mb-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      <Sparkles className="w-3 h-3" /> Sample Life Event
                    </span>
                    {draftSettings.showTimestamps && (
                      <span className="text-[10px] text-gray-400 font-mono">10:45 AM</span>
                    )}
                  </div>
                  <h4 className={`${draftSettings.fontSize === 'lg' ? 'text-sm' : 'text-xs'} font-bold text-gray-900 dark:text-white`}>
                    Building Autonomous Workflows with Gemini & Multi-Agent Loops
                  </h4>
                  {draftSettings.showSynopsis && (
                    <p className={`${draftSettings.fontSize === 'sm' ? 'text-[10px]' : 'text-xs'} text-gray-500 dark:text-gray-400 mt-1 line-clamp-2`}>
                      Exploration of reactive state managers, resilient offline IndexedDB storage, and fast execution principles.
                    </p>
                  )}
                  {draftSettings.showTags && (
                    <div className="flex items-center gap-1.5 mt-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-600 dark:text-gray-300 font-medium">
                        #ai
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-600 dark:text-gray-300 font-medium">
                        #engineering
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTENT VISIBILITY */}
          {activeTab === 'visibility' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose which element badges, media artwork, and metadata fields are displayed by default across cards and lists.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'showThumbnails', label: 'Media Artwork & Video Covers', icon: <ImageIcon className="w-4 h-4 text-sky-500" />, desc: 'Show album art, video thumbnails, and website snapshots' },
                  { key: 'showTimestamps', label: 'Timestamps & Time Chips', icon: <Clock className="w-4 h-4 text-emerald-500" />, desc: 'Display exact record times (e.g., 03:45 PM)' },
                  { key: 'showTags', label: 'Smart Tags & Categories', icon: <Tag className="w-4 h-4 text-amber-500" />, desc: 'Display hashtags, genre pills, and archetype tags' },
                  { key: 'showSynopsis', label: 'AI Synopsis & Summaries', icon: <FileText className="w-4 h-4 text-purple-500" />, desc: 'Show smart synopsis blurbs on cards and inspectors' },
                  { key: 'showAudioRadars', label: 'Spotify Audio Radars', icon: <Radio className="w-4 h-4 text-emerald-500" />, desc: 'Show energy, valence, and danceability indicators' },
                  { key: 'showVideoChapters', label: 'YouTube Video Chapters', icon: <Sparkles className="w-4 h-4 text-red-500" />, desc: 'Show interactive timestamped chapter markers' },
                  { key: 'showDomainFavicons', label: 'Domain Favicons & Badges', icon: <Globe className="w-4 h-4 text-cyan-500" />, desc: 'Render site favicon icons next to web links' },
                  { key: 'showMapPreviews', label: 'Journal Inline Mini-Maps', icon: <MapPin className="w-4 h-4 text-blue-500" />, desc: 'Display embedded Google Maps cards inside daily timeline' }
                ].map(item => {
                  const val = draftSettings[item.key as keyof UserSettings] as boolean;
                  return (
                    <div
                      key={item.key}
                      onClick={() => handleUpdateDraft({ [item.key]: !val })}
                      className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                        val
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-gray-900 dark:text-white'
                          : 'bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 shrink-0">
                          {item.icon}
                        </div>
                        <div>
                          <div className="font-bold text-xs">{item.label}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5 leading-snug">{item.desc}</div>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                          val
                            ? 'bg-emerald-500 border-emerald-600 text-white'
                            : 'border-gray-300 dark:border-gray-600 bg-transparent'
                        }`}
                      >
                        {val && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SORTING & BEHAVIOR */}
          {activeTab === 'sorting' && (
            <div className="space-y-6">
              {/* Default Sort Order */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Default History Sorting Order
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'newest', label: 'Newest First', desc: 'Most recent activities appear at top' },
                    { id: 'oldest', label: 'Oldest First', desc: 'Chronological order starting from morning' },
                    { id: 'alphabetical', label: 'Alphabetical (A → Z)', desc: 'Ordered alphabetically by title' },
                    { id: 'duration', label: 'Duration / Playtime', desc: 'Longest tracks & videos first' }
                  ].map(s => {
                    const isSelected = draftSettings.defaultSortOrder === s.id;
                    return (
                      <button aria-label="Action"
                        key={s.id}
                        type="button"
                        onClick={() => handleUpdateDraft({ defaultSortOrder: s.id as SortOrderOption })}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 text-gray-900 dark:text-white font-bold shadow-2xs'
                            : 'bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{s.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-emerald-500" />}
                        </div>
                        <p className="text-[11px] text-gray-400 font-normal mt-0.5">{s.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Behaviors */}
              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Interaction & Player Behaviors
                </label>
                <div className="space-y-2">
                  <div
                    onClick={() => handleUpdateDraft({ autoSelectFirstItem: !draftSettings.autoSelectFirstItem })}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      draftSettings.autoSelectFirstItem
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-gray-900 dark:text-white'
                        : 'bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">Auto-Select First Item in Deep Views</div>
                      <div className="text-[11px] text-gray-400">Automatically open first media item when switching to Theater, Reader, or Player</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                        draftSettings.autoSelectFirstItem ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {draftSettings.autoSelectFirstItem && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  <div
                    onClick={() => handleUpdateDraft({ enableSoundEffects: !draftSettings.enableSoundEffects })}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      draftSettings.enableSoundEffects
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-gray-900 dark:text-white'
                        : 'bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">Simulated Audio Effects & Previews</div>
                      <div className="text-[11px] text-gray-400">Enable simulated audio cues during track and video playback</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                        draftSettings.enableSoundEffects ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {draftSettings.enableSoundEffects && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Import / Export Settings */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">Backup & Sync</span>
                  <p className="text-[11px] text-gray-400">Export or import your complete view defaults configuration</p>
                </div>
                <div className="flex items-center gap-2">
                  <button aria-label="Action"
                    onClick={handleExport}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                  <label className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> Import
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-[#18181c]/60 flex items-center justify-between shrink-0">
          <button aria-label="Action"
            onClick={handleReset}
            className="px-3 py-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to Factory Defaults
          </button>

          <div className="flex items-center gap-2">
            <button aria-label="Action"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button aria-label="Action"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 animate-bounce" /> Saved as Defaults!
                </>
              ) : (
                <>
                  <BookmarkCheck className="w-4 h-4" /> Save as Defaults
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
