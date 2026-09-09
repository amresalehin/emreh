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
      className="h-full w-full flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#fdfcf9] dark:bg-[#0e0d0c]"
    >
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Top Hero Banner */}
        <div className="relative rounded-2xl bg-[#171614]/70 p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.05] hover:ring-white/[0.12] backdrop-blur-md transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-sans text-xs tracking-wide uppercase text-[#d4a373] font-medium">
                Companion Hub • همراه
              </span>
              <span className="text-neutral-500">•</span>
              <span className="font-sans text-xs tracking-wide uppercase text-neutral-400">
                {formattedToday}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium text-neutral-900 dark:text-neutral-100 tracking-tight">
              Welcome to Emreh
            </h1>
            <p className="font-serif italic text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mt-1 max-w-xl leading-relaxed">
              Your private personal life companion. Seamlessly tracking your daily journeys, wellness, reflections, media moments, and digital footprints.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onNavigateView && (
              <button
                aria-label="Action"
                onClick={() => onNavigateView('timeline')}
                className="px-3.5 py-2 rounded-xl bg-[#d4a373] hover:bg-[#e0a96d] text-neutral-950 font-sans text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5" /> Open Journal
              </button>
            )}
            {onOpenVoiceMemo && (
              <button
                aria-label="Action"
                onClick={onOpenVoiceMemo}
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/[0.08] text-[#d4a373] font-sans text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
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
