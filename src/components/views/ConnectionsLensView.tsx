import React, { useState } from 'react';
import {
  Bookmark,
  Headphones,
  Youtube,
  Globe,
  HeartPulse,
  Clock,
  Sparkles
} from 'lucide-react';
import { BookmarksView } from './BookmarksView';
import { SpotifyView } from './SpotifyView';
import { YouTubeView } from './YouTubeView';
import { BrowserView } from './BrowserView';
import { GoogleFitView } from './GoogleFitView';
import { FitHealthView } from './FitHealthView';
import { ScreentimeView } from './ScreentimeView';
import {
  TimelineItem,
  DateRange,
  MetricsModalState,
  LuminanceMode,
  GlassTheme
} from '../../types';

export type ConnectionsSubTab = 'bookmarks' | 'spotify' | 'youtube' | 'browser' | 'fit' | 'screentime';

interface ConnectionsLensViewProps {
  initialTab?: ConnectionsSubTab;
  currentDate: Date;
  onPrevDate: () => void;
  onNextDate: () => void;
  onSetToday: () => void;
  onOpenCalendar: (mode: string, tab?: 'single' | 'range') => void;
  onJumpToDate: (date: Date) => void;
  viewDateRanges: Record<string, DateRange | null>;
  onClearDateRange: (key: string) => void;
  timelineData: TimelineItem[];
  combinedTimelineData: TimelineItem[];
  dateIndexMap: Map<string, TimelineItem[]>;
  googleFitData?: any;
  setGoogleFitData?: (data: any) => void;
  fitSubView: 'workouts' | 'vitals';
  setFitSubView: (view: 'workouts' | 'vitals') => void;
  bookmarkNotes: Record<string, string>;
  onSaveBookmarkNote: (id: string, note: string) => void;
  bookmarkTags: Record<string, string[]>;
  onAddBookmarkTag: (id: string, tag: string) => void;
  onRemoveBookmarkTag: (id: string, tag: string) => void;
  sessionSnapshots: any[];
  onSaveSessionSnapshot: (snap: any) => void;
  onOpenSyncModal: () => void;
  onApplySyncedData: (data: any[]) => void;
  onActiveServiceChange: (service: string, media: string) => void;
  onDeleteItem: (id: string) => void;
  onShowTrackProfile: (track: string, artist?: string) => void;
  onShowArtistProfile: (name: string) => void;
  onShowVideoProfile: (title: string, channel?: string) => void;
  onShowChannelProfile: (name: string) => void;
  onShowDomainProfile: (domain: string) => void;
  selectedBrowserItem: TimelineItem | null;
  onSelectBrowserItem: (item: TimelineItem | null) => void;
  onLaunchAuthenticatedSession?: (item: TimelineItem) => void;
  onCaptureActiveScreen?: (item: TimelineItem) => void;
  onOpenBrowserDetailModal?: (item: TimelineItem) => void;
  onImportClick: (mode: string) => void;
  luminance: LuminanceMode;
  theme: GlassTheme;
}

export const ConnectionsLensView: React.FC<ConnectionsLensViewProps> = ({
  initialTab = 'bookmarks',
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onOpenCalendar,
  onJumpToDate,
  viewDateRanges,
  onClearDateRange,
  timelineData,
  combinedTimelineData,
  dateIndexMap,
  googleFitData,
  setGoogleFitData,
  fitSubView,
  setFitSubView,
  bookmarkNotes,
  onSaveBookmarkNote,
  bookmarkTags,
  onAddBookmarkTag,
  onRemoveBookmarkTag,
  sessionSnapshots,
  onSaveSessionSnapshot,
  onOpenSyncModal,
  onApplySyncedData,
  onActiveServiceChange,
  onDeleteItem,
  onShowTrackProfile,
  onShowArtistProfile,
  onShowVideoProfile,
  onShowChannelProfile,
  onShowDomainProfile,
  selectedBrowserItem,
  onSelectBrowserItem,
  onLaunchAuthenticatedSession,
  onCaptureActiveScreen,
  onOpenBrowserDetailModal,
  onImportClick,
  luminance,
  theme
}) => {
  const [activeTab, setActiveTab] = useState<ConnectionsSubTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const tabs: { id: ConnectionsSubTab; label: string; icon: React.ReactNode; badgeColor: string }[] = [
    {
      id: 'bookmarks',
      label: 'LaterLinks & Web',
      icon: <Bookmark className="w-3.5 h-3.5" />,
      badgeColor: 'text-teal-500'
    },
    {
      id: 'spotify',
      label: 'Spotify Music',
      icon: <Headphones className="w-3.5 h-3.5" />,
      badgeColor: 'text-emerald-500'
    },
    {
      id: 'youtube',
      label: 'YouTube History',
      icon: <Youtube className="w-3.5 h-3.5" />,
      badgeColor: 'text-red-500'
    },
    {
      id: 'browser',
      label: 'Browsing Stream',
      icon: <Globe className="w-3.5 h-3.5" />,
      badgeColor: 'text-yellow-500'
    },
    {
      id: 'fit',
      label: 'Fit & Wellness',
      icon: <HeartPulse className="w-3.5 h-3.5" />,
      badgeColor: 'text-orange-500'
    },
    {
      id: 'screentime',
      label: 'Screentime & Focus',
      icon: <Clock className="w-3.5 h-3.5" />,
      badgeColor: 'text-indigo-500'
    }
  ];

  return (
    <div className="h-full w-full flex flex-col min-h-0 bg-[#fdfcf9] dark:bg-[#0e0d0c] overflow-hidden">
      {/* Editorial Sub-Lens Header Selector */}
      <div className="shrink-0 px-4 sm:px-6 py-2.5 border-b border-black/[0.05] dark:border-white/[0.06] bg-white/70 dark:bg-[#121110]/70 backdrop-blur-md flex items-center justify-between gap-3 overflow-x-auto no-scrollbar z-20">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-100 dark:bg-stone-900/70 border border-stone-200/60 dark:border-stone-800/80 shrink-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-sans transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-white/40 dark:hover:bg-stone-800/40'
                }`}
              >
                <span className={isActive ? tab.badgeColor : 'text-stone-400'}>
                  {tab.icon}
                </span>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500 font-serif italic">
          <span>Connected Life Streams</span>
        </div>
      </div>

      {/* Sub-View Content Pane */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {activeTab === 'bookmarks' && (
          <BookmarksView
            currentDate={currentDate}
            onPrevDate={onPrevDate}
            onNextDate={onNextDate}
            onSetToday={onSetToday}
            onOpenCalendar={() => onOpenCalendar('bookmarks')}
            onImportClick={() => onImportClick('bookmarks')}
            dateRange={viewDateRanges.bookmarks}
            onClearDateRange={() => onClearDateRange('bookmarks')}
            onOpenDateRangePicker={() => onOpenCalendar('bookmarks', 'range')}
            timelineData={timelineData}
            bookmarkNotes={bookmarkNotes}
            onSaveBookmarkNote={onSaveBookmarkNote}
            bookmarkTags={bookmarkTags}
            onAddBookmarkTag={onAddBookmarkTag}
            onRemoveBookmarkTag={onRemoveBookmarkTag}
            sessionSnapshots={sessionSnapshots}
            onOpenSyncModal={onOpenSyncModal}
            onApplySyncedData={onApplySyncedData}
            onActiveServiceChange={onActiveServiceChange}
            onDeleteItem={onDeleteItem}
          />
        )}

        {activeTab === 'spotify' && (
          <SpotifyView
            currentDate={currentDate}
            onPrevDate={onPrevDate}
            onNextDate={onNextDate}
            onSetToday={onSetToday}
            onOpenCalendar={() => onOpenCalendar('spotify')}
            onJumpToDate={onJumpToDate}
            dateRange={viewDateRanges.spotify}
            onClearDateRange={() => onClearDateRange('spotify')}
            onOpenDateRangePicker={() => onOpenCalendar('spotify', 'range')}
            processedData={timelineData}
            dateIndexMap={dateIndexMap}
            onShowTrackProfile={onShowTrackProfile}
            onShowArtistProfile={onShowArtistProfile}
            onImportClick={() => onImportClick('spotify')}
          />
        )}

        {activeTab === 'youtube' && (
          <YouTubeView
            currentDate={currentDate}
            onPrevDate={onPrevDate}
            onNextDate={onNextDate}
            onSetToday={onSetToday}
            onOpenCalendar={() => onOpenCalendar('youtube')}
            onJumpToDate={onJumpToDate}
            dateRange={viewDateRanges.youtube}
            onClearDateRange={() => onClearDateRange('youtube')}
            onOpenDateRangePicker={() => onOpenCalendar('youtube', 'range')}
            processedData={timelineData}
            dateIndexMap={dateIndexMap}
            onShowVideoProfile={onShowVideoProfile}
            onShowChannelProfile={onShowChannelProfile}
            onImportClick={() => onImportClick('youtube')}
          />
        )}

        {activeTab === 'browser' && (
          <BrowserView
            currentDate={currentDate}
            onPrevDate={onPrevDate}
            onNextDate={onNextDate}
            onSetToday={onSetToday}
            onOpenCalendar={() => onOpenCalendar('browser')}
            onImportClick={() => onImportClick('browser')}
            onJumpToDate={onJumpToDate}
            dateRange={viewDateRanges.browser}
            onClearDateRange={() => onClearDateRange('browser')}
            onOpenDateRangePicker={() => onOpenCalendar('browser', 'range')}
            processedData={timelineData}
            dateIndexMap={dateIndexMap}
            onShowDomainProfile={onShowDomainProfile}
            selectedBrowserItem={selectedBrowserItem}
            onSelectBrowserItem={onSelectBrowserItem}
            bookmarkNotes={bookmarkNotes}
            onSaveBookmarkNote={onSaveBookmarkNote}
            bookmarkTags={bookmarkTags}
            onAddBookmarkTag={onAddBookmarkTag}
            onRemoveBookmarkTag={onRemoveBookmarkTag}
            sessionSnapshots={sessionSnapshots}
            onSaveSessionSnapshot={onSaveSessionSnapshot}
            onLaunchAuthenticatedSession={onLaunchAuthenticatedSession}
            onCaptureActiveScreen={onCaptureActiveScreen}
            onOpenDetailModal={onOpenBrowserDetailModal}
          />
        )}

        {activeTab === 'fit' && (
          fitSubView === 'vitals' ? (
            <FitHealthView
              currentDate={currentDate}
              onPrevDate={onPrevDate}
              onNextDate={onNextDate}
              onSetToday={onSetToday}
              onJumpToDate={onJumpToDate}
              onOpenCalendar={() => onOpenCalendar('fit', 'single')}
              onJumpToMap={() => {}}
              onSwitchToGpsWorkouts={() => setFitSubView('workouts')}
            />
          ) : (
            <GoogleFitView
              dataset={googleFitData}
              currentDate={currentDate}
              dateRange={viewDateRanges.fit}
              onImportClick={() => onImportClick('fit')}
              onOpenCalendar={() => onOpenCalendar('fit', 'single')}
              onOpenRange={() => onOpenCalendar('fit', 'range')}
              onClearRange={() => onClearDateRange('fit')}
              onPrevDate={onPrevDate}
              onNextDate={onNextDate}
              onSetToday={onSetToday}
              onJumpToDate={onJumpToDate}
              onLoadSampleData={(sample) => {
                if (setGoogleFitData) setGoogleFitData(sample);
              }}
              onSwitchToVitals={() => setFitSubView('vitals')}
              luminance={luminance}
              theme={theme}
            />
          )
        )}

        {activeTab === 'screentime' && (
          <ScreentimeView
            currentDate={currentDate}
            timelineData={combinedTimelineData}
            onPrevDate={onPrevDate}
            onNextDate={onNextDate}
            onSetToday={onSetToday}
            onOpenCalendar={() => onOpenCalendar('screentime')}
            onImportClick={() => onImportClick('screentime')}
            dateRange={viewDateRanges.screentime}
            onClearDateRange={() => onClearDateRange('screentime')}
            onOpenDateRangePicker={() => onOpenCalendar('screentime', 'range')}
          />
        )}
      </div>
    </div>
  );
};
