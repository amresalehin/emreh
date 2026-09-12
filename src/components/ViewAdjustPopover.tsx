import React, { useState, useRef, useEffect } from 'react';
import {
  SlidersHorizontal,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Check,
  RotateCcw,
  Settings,
  Sparkles,
  Eye,
  Type,
  ArrowUpDown,
  Image as ImageIcon,
  Clock,
  Tag,
  FileText,
  Radio,
  BookmarkCheck
} from 'lucide-react';
import {
  UserSettings,
  LayoutDensity,
  GridColumnsOption,
  SortOrderOption,
  FontSizeOption,
  FontFamilyOption
} from '../types';

export interface ViewAdjustPopoverProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onSaveAsDefault?: () => void;
  onResetToDefault?: () => void;
  onOpenSettingsModal?: () => void;
  // Specific contextual switches if relevant
  showColumnsControl?: boolean;
  showAudioControl?: boolean;
  showVideoControl?: boolean;
  className?: string;
}

export const ViewAdjustPopover: React.FC<ViewAdjustPopoverProps> = ({
  settings,
  onUpdateSettings,
  onSaveAsDefault,
  onResetToDefault,
  onOpenSettingsModal,
  showColumnsControl = true,
  showAudioControl = false,
  showVideoControl = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSaveDefault = () => {
    if (onSaveAsDefault) {
      onSaveAsDefault();
    }
    setSaveFeedback(true);
    setTimeout(() => {
      setSaveFeedback(false);
    }, 2000);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2.5 py-1 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border active:scale-95 ${
          isOpen
            ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
            : 'bg-white/90 dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 border-gray-200/80 dark:border-white/10'
        }`}
        title="Granular View Adjustments & Display Options"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500 group-hover:rotate-45 transition-transform" />
        <span className="hidden sm:inline">Adjust View</span>
        <span className="sm:hidden">View</span>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-[#18181c] border border-gray-200 dark:border-gray-700/80 shadow-2xl z-50 p-3.5 text-xs text-gray-800 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-2">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-gray-900 dark:text-white tracking-tight">View Adjustments</span>
            </div>
            {onOpenSettingsModal && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettingsModal();
                }}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Settings className="w-3 h-3" />
                Defaults
              </button>
            )}
          </div>

          {/* 1. Layout Density */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <span>Layout Density</span>
              <span className="text-emerald-600 dark:text-emerald-400 capitalize">{settings.density}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-900/90 p-1 rounded-xl border border-gray-200/70 dark:border-gray-800">
              {(['compact', 'comfortable', 'spacious'] as LayoutDensity[]).map(d => (
                <button
                  key={d}
                  onClick={() => onUpdateSettings({ density: d })}
                  className={`py-1 px-1.5 rounded-lg font-semibold text-center transition-all cursor-pointer capitalize flex items-center justify-center gap-1 ${
                    settings.density === d
                      ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {d === 'compact' && <Minimize2 className="w-3 h-3" />}
                  {d === 'comfortable' && <LayoutGrid className="w-3 h-3" />}
                  {d === 'spacious' && <Maximize2 className="w-3 h-3" />}
                  <span className="text-[11px]">{d}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Grid Columns (if applicable) */}
          {showColumnsControl && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <span>Grid Columns</span>
                <span className="text-emerald-600 dark:text-emerald-400">{settings.gridColumns.toUpperCase()}</span>
              </div>
              <div className="grid grid-cols-4 gap-1 bg-gray-100 dark:bg-gray-900/90 p-1 rounded-xl border border-gray-200/70 dark:border-gray-800">
                {(['auto', '2', '3', '4'] as GridColumnsOption[]).map(cols => (
                  <button
                    key={cols}
                    onClick={() => onUpdateSettings({ gridColumns: cols })}
                    className={`py-1 px-1.5 rounded-lg font-semibold text-center transition-all cursor-pointer ${
                      settings.gridColumns === cols
                        ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="text-[11px]">{cols === 'auto' ? 'Auto' : `${cols} Cols`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Content Visibility Toggles */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Display Elements
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {/* Thumbnails */}
              <button
                onClick={() => onUpdateSettings({ showThumbnails: !settings.showThumbnails })}
                className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  settings.showThumbnails
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'bg-gray-50 dark:bg-gray-900/60 border-gray-200/80 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                <span className="flex items-center gap-1.5 text-[11px]">
                  <ImageIcon className="w-3.5 h-3.5" /> Artwork
                </span>
                {settings.showThumbnails && <Check className="w-3 h-3 text-emerald-500" />}
              </button>

              {/* Timestamps */}
              <button
                onClick={() => onUpdateSettings({ showTimestamps: !settings.showTimestamps })}
                className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  settings.showTimestamps
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'bg-gray-50 dark:bg-gray-900/60 border-gray-200/80 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5" /> Time Chips
                </span>
                {settings.showTimestamps && <Check className="w-3 h-3 text-emerald-500" />}
              </button>

              {/* Tags */}
              <button
                onClick={() => onUpdateSettings({ showTags: !settings.showTags })}
                className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  settings.showTags
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'bg-gray-50 dark:bg-gray-900/60 border-gray-200/80 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Tag className="w-3.5 h-3.5" /> Tags & Mood
                </span>
                {settings.showTags && <Check className="w-3 h-3 text-emerald-500" />}
              </button>

              {/* Synopsis */}
              <button
                onClick={() => onUpdateSettings({ showSynopsis: !settings.showSynopsis })}
                className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  settings.showSynopsis
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'bg-gray-50 dark:bg-gray-900/60 border-gray-200/80 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                <span className="flex items-center gap-1.5 text-[11px]">
                  <FileText className="w-3.5 h-3.5" /> Synopsis
                </span>
                {settings.showSynopsis && <Check className="w-3 h-3 text-emerald-500" />}
              </button>

              {/* Audio Radars (Spotify) */}
              {showAudioControl && (
                <button
                  onClick={() => onUpdateSettings({ showAudioRadars: !settings.showAudioRadars })}
                  className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    settings.showAudioRadars
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'bg-gray-50 dark:bg-gray-900/60 border-gray-200/80 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Radio className="w-3.5 h-3.5" /> Audio Radar
                  </span>
                  {settings.showAudioRadars && <Check className="w-3 h-3 text-emerald-500" />}
                </button>
              )}

              {/* Video Chapters (YouTube) */}
              {showVideoControl && (
                <button
                  onClick={() => onUpdateSettings({ showVideoChapters: !settings.showVideoChapters })}
                  className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    settings.showVideoChapters
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'bg-gray-50 dark:bg-gray-900/60 border-gray-200/80 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" /> Chapters
                  </span>
                  {settings.showVideoChapters && <Check className="w-3 h-3 text-emerald-500" />}
                </button>
              )}
            </div>
          </div>

          {/* 4. Sorting & Typography */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100 dark:border-gray-800/80">
            {/* Sort Order */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" /> Sorting
              </label>
              <select
                value={settings.defaultSortOrder}
                onChange={e => onUpdateSettings({ defaultSortOrder: e.target.value as SortOrderOption })}
                className="w-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 text-[11px] font-medium outline-none focus:border-emerald-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="alphabetical">Title (A-Z)</option>
                <option value="duration">Length / Time</option>
              </select>
            </div>

            {/* Font Scale */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Type className="w-3 h-3" /> Text Size
              </label>
              <div className="flex bg-gray-100 dark:bg-gray-900 p-0.5 rounded-lg border border-gray-200 dark:border-gray-800">
                {(['sm', 'md', 'lg'] as FontSizeOption[]).map(sz => (
                  <button
                    key={sz}
                    onClick={() => onUpdateSettings({ fontSize: sz })}
                    className={`flex-1 py-0.5 rounded font-semibold text-center text-[10px] uppercase transition-all cursor-pointer ${
                      settings.fontSize === sz
                        ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                        : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Footer Actions: Set as Default & Reset */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-2">
            {onResetToDefault && (
              <button
                onClick={onResetToDefault}
                className="text-[11px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                title="Reset to factory defaults"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}

            <button
              onClick={handleSaveDefault}
              className="ml-auto px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Save these adjustments as your permanent default settings"
            >
              {saveFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 animate-bounce" /> Saved as Default!
                </>
              ) : (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5" /> Set as Default
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
