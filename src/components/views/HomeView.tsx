import React, { useMemo } from 'react';
import {
  Compass,
  Sparkles,
  Calendar,
  Clock,
  HeartPulse,
  Smartphone,
  StickyNote,
  Cloud,
  Headphones,
  Video,
  Globe,
  Camera,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { TimelineItem, ViewType } from '../../types';
import { VoiceMemoWidget } from '../home/VoiceMemoWidget';
import { FitActivityWidget } from '../home/FitActivityWidget';
import { KeepNotesWidget } from '../home/KeepNotesWidget';
import { CloudStorageWidget } from '../home/CloudStorageWidget';
import { GeoActivityWidget } from '../home/GeoActivityWidget';
import { TimelineHighlightsWidget } from '../home/TimelineHighlightsWidget';
import { ScreentimeWidget } from '../home/ScreentimeWidget';

interface HomeViewProps {
  timelineData?: TimelineItem[];
  dailyNotesMap?: Record<string, string>;
  onSaveDailyNote?: (text: string) => void;
  photosList?: any[];
  currentDate?: Date;
  importedFilesCount?: number;
  onJumpToDate?: (date: Date) => void;
  onNavigateView?: (view: ViewType) => void;
  onOpenVoiceMemo?: () => void;
  onTriggerBackupModal?: () => void;
  onOpenImportedFiles?: () => void;
  onImportClick?: (type?: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  timelineData = [],
  dailyNotesMap = {},
  onSaveDailyNote,
  currentDate = new Date(),
  importedFilesCount = 0,
  onJumpToDate,
  onNavigateView,
  onOpenVoiceMemo,
  onTriggerBackupModal,
  onOpenImportedFiles,
  onImportClick
}) => {
  const formattedToday = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div
      id="home-view"
      className="h-full w-full flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#fdfcf9] dark:bg-[#121214]"
    >
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Top Hero Banner */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-blue-500/10 border border-black/8 dark:border-white/10 backdrop-blur-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                Companion Hub • همراه
              </span>
              <span className="text-[11px] text-gray-400">•</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                {formattedToday}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight">
              Welcome to Emreh
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-xl leading-relaxed">
              Your private personal life companion. Seamlessly tracking your daily journeys, wellness, reflections, media moments, and digital footprints.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateView && (
              <button
                onClick={() => onNavigateView('timeline')}
                className="px-3 py-2 rounded-xl bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" /> Open Journal
              </button>
            )}
            {onOpenVoiceMemo && (
              <button
                onClick={onOpenVoiceMemo}
                className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/25 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Voice Memo
              </button>
            )}
          </div>
        </div>

        {/* Widgets Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-start">
          {/* 1. Daily Fitness & Movement (Google Fit) */}
          <FitActivityWidget
            currentDate={currentDate}
            onNavigateView={onNavigateView}
            onImportClick={() => onImportClick && onImportClick('fit')}
          />

          {/* 2. Keep & Daily Reflections Note Log */}
          <KeepNotesWidget
            currentDate={currentDate}
            dailyNotesMap={dailyNotesMap}
            onSaveDailyNote={onSaveDailyNote}
            onNavigateView={onNavigateView}
            onOpenKeepImport={() => onImportClick && onImportClick('keep')}
          />

          {/* 3. Screentime & Focus Widget */}
          <ScreentimeWidget
            currentDate={currentDate}
            onNavigateView={onNavigateView}
          />

          {/* 4. Places & Life Moments (Geo Correlations) */}
          <GeoActivityWidget
            timelineData={timelineData}
            currentDate={currentDate}
            onNavigateView={onNavigateView}
          />

          {/* 5. Life Stream Highlights (Spotify, YouTube, Web, Photos) */}
          <TimelineHighlightsWidget
            timelineData={timelineData}
            currentDate={currentDate}
            onNavigateView={onNavigateView}
            onJumpToDate={onJumpToDate}
          />

          {/* 6. Audio Reflections & Voice Memos */}
          <VoiceMemoWidget
            onOpenVoiceMemo={onOpenVoiceMemo}
            onNavigateView={onNavigateView}
            dailyNotesMap={dailyNotesMap}
          />

          {/* 7. Cloud & Data Vault (Google Drive & Box Cloud) */}
          <div className="md:col-span-2 lg:col-span-3">
            <CloudStorageWidget
              timelineItemCount={timelineData.length}
              importedFilesCount={importedFilesCount}
              onNavigateView={onNavigateView}
              onTriggerBackupModal={onTriggerBackupModal}
              onOpenImportedFiles={onOpenImportedFiles}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
