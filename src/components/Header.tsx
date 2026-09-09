import React, { useState, useEffect } from 'react';
import {
  Layers,
  Moon,
  Sun,
  BookOpen,
  MapPin,
  Headphones,
  Youtube,
  Globe,
  StickyNote,
  Search,
  Command,
  Sparkles,
  Settings,
  LayoutDashboard,
  Image as ImageIcon,
  Cloud,
  HardDrive,
  Bookmark,
  HeartPulse,
  Clock
} from 'lucide-react';
import { ViewType, TimelineItem, CalendarEvent, MetricsModalState } from '../types';
import { GlobalSearchPalette } from './search/GlobalSearchPalette';

interface HeaderProps {
  currentView?: ViewType;
  isAmoled: boolean;
  onToggleAmoled: () => void;
  totalEventsCount: number;
  timelineData?: TimelineItem[];
  dailyNotesMap?: Record<string, string>;
  calendarEvents?: CalendarEvent[];
  onSelectView?: (view: ViewType) => void;
  onJumpToDate?: (date: Date) => void;
  onSelectSearchResult?: (dateStr: string, item: TimelineItem) => void;
  onOpenMetricsModal?: (state: MetricsModalState) => void;
  onOpenBrowserModal?: (item: TimelineItem) => void;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
  onOpenSettings?: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentView = 'timeline',
  isAmoled,
  onToggleAmoled,
  totalEventsCount,
  timelineData = [],
  dailyNotesMap = {},
  calendarEvents = [],
  onSelectView = () => {},
  onJumpToDate = () => {},
  onSelectSearchResult = () => {},
  onOpenMetricsModal,
  onOpenBrowserModal,
  onOpenMapModal,
  onOpenSettings,
  className = ''
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMac, setIsMac] = useState<boolean>(false);

  useEffect(() => {
    setIsMac(typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent));
  }, []);

  // Global keyboard shortcuts: Cmd+K / Ctrl+K / '/' and Cmd+, / Ctrl+, for Settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (e.key === '/' && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === ',' && onOpenSettings) {
        e.preventDefault();
        onOpenSettings();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSettings]);

  const getViewName = (view: string) => {
    switch (view) {
      case 'home':
        return { name: 'Home Canvas', icon: <LayoutDashboard className="w-3.5 h-3.5 text-amber-500" /> };
      case 'timeline':
        return { name: 'Journal', icon: <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> };
      case 'maptimeline':
        return { name: 'Map Timeline', icon: <MapPin className="w-3.5 h-3.5 text-blue-500" /> };
      case 'photos':
        return { name: 'Photos', icon: <ImageIcon className="w-3.5 h-3.5 text-rose-500" /> };
      case 'box':
        return { name: 'Box Cloud', icon: <Cloud className="w-3.5 h-3.5 text-blue-500" /> };
      case 'gdrive':
        return { name: 'Google Drive', icon: <HardDrive className="w-3.5 h-3.5 text-sky-500" /> };
      case 'spotify':
        return { name: 'Spotify Music', icon: <Headphones className="w-3.5 h-3.5 text-emerald-500" /> };
      case 'youtube':
        return { name: 'YouTube History', icon: <Youtube className="w-3.5 h-3.5 text-red-500" /> };
      case 'browser':
        return { name: 'Browsing Activity', icon: <Globe className="w-3.5 h-3.5 text-cyan-500" /> };
      case 'bookmarks':
        return { name: 'Bookmarks', icon: <Bookmark className="w-3.5 h-3.5 text-pink-500" /> };
      case 'notes':
        return { name: 'Notes & Diary', icon: <StickyNote className="w-3.5 h-3.5 text-amber-500" /> };
      case 'fit':
        return { name: 'Google Fit', icon: <HeartPulse className="w-3.5 h-3.5 text-orange-500" /> };
      case 'screentime':
        return { name: 'Screentime', icon: <Clock className="w-3.5 h-3.5 text-indigo-500" /> };
      default:
        return { name: 'Timeline', icon: <Layers className="w-3.5 h-3.5 text-emerald-500" /> };
    }
  };

  const activeView = getViewName(currentView || 'timeline');

  return (
    <>
      <header className={`border-b border-black/[0.05] dark:border-white/[0.06] bg-white/75 dark:bg-[#121110]/70 backdrop-blur-md px-3 sm:px-4 py-2 flex items-center justify-between z-30 shrink-0 transition-all gap-2 sm:gap-4 ${className}`}>
        {/* Brand & View Identity */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <div className="flex items-center gap-2" title="Emreh — همراه (Hamrah)">
            <div className="w-7 h-7 rounded-xl overflow-hidden shadow-xs flex items-center justify-center ring-1 ring-black/[0.06] dark:ring-white/[0.08] shrink-0 bg-[#081318] dark:bg-[#071114] p-0.5">
              <img
                src={`${import.meta.env.BASE_URL}app-icon.svg`}
                alt="Emreh Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('emreh-logo.jpg')) {
                    target.src = `${import.meta.env.BASE_URL}emreh-logo.jpg`;
                  }
                }}
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-serif font-medium text-stone-900 dark:text-neutral-100 tracking-tight leading-tight hidden xs:block">
                Emreh
              </h1>
              <span className="text-[11px] font-serif font-medium text-stone-500 dark:text-neutral-400 tracking-wide hidden sm:block -mt-0.5">
                همراه
              </span>
            </div>
          </div>

          {/* View Breadcrumb Pill */}
          <div className="hidden lg:flex items-center gap-1.5 pl-2.5 border-l border-gray-300/60 dark:border-white/10 font-sans text-xs tracking-wide uppercase text-neutral-400">
            {activeView.icon}
            <span>{activeView.name}</span>
          </div>
        </div>

        {/* Center: Powerful Global Omnibar Search Trigger */}
        <div className="flex-1 max-w-xl mx-auto px-1 sm:px-2">
          <button
            aria-label="Action"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between gap-2.5 px-3 py-1.5 sm:py-2 bg-white/70 dark:bg-white/[0.03] hover:bg-white/90 dark:hover:bg-white/[0.06] ring-1 ring-black/[0.05] dark:ring-white/[0.05] hover:ring-amber-500/30 dark:hover:ring-white/[0.12] rounded-2xl text-left transition-all group cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.15)]"
            title={`Search across all life events (${isMac ? '⌘K' : 'Ctrl+K'})`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#d4a373]/10 text-[#d4a373] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Search className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex items-center gap-1.5 font-sans text-xs">
                <span className="font-normal text-neutral-700 dark:text-neutral-200 truncate">
                  Search all life history...
                </span>
                <span className="hidden xl:inline text-[11px] text-neutral-400 dark:text-neutral-500 font-normal">
                  (music, videos, places, web, notes)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-sans font-medium text-neutral-400 bg-white/[0.05] ring-1 ring-white/[0.08] rounded-md">
                {isMac ? '⌘K' : 'Ctrl+K'}
              </kbd>
              <span className="sm:hidden text-neutral-400">
                <Search className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>
        </div>

        {/* Right: Event Count Badge & Theme Toggle */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 bg-gray-100/90 dark:bg-white/5 px-2.5 py-1 rounded-xl border border-gray-200/80 dark:border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
              {(totalEventsCount || 0).toLocaleString()} <span className="text-gray-400 font-normal">records</span>
            </span>
          </div>

          {/* Theme Toggle (Light / AMOLED Dark) */}
          <button
            onClick={onToggleAmoled}
            className="w-8 h-8 bg-gray-100/90 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200/80 dark:border-white/10 hover:bg-gray-200/80 dark:hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
            title="Toggle Dark/Light Mode"
          >
            {isAmoled ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Settings & System Control Gear Button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="w-8 h-8 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 group"
              title={`Settings & Control (${isMac ? '⌘,' : 'Ctrl+,'})`}
              aria-label="Settings and Control"
            >
              <Settings className="w-4 h-4 transition-transform duration-500 group-hover:rotate-45" />
            </button>
          )}
        </div>
      </header>

      {/* Full Global Search Palette Modal */}
      <GlobalSearchPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        timelineData={timelineData}
        dailyNotesMap={dailyNotesMap}
        calendarEvents={calendarEvents}
        currentView={currentView}
        onSelectView={onSelectView}
        onJumpToDate={onJumpToDate}
        onSelectSearchResult={onSelectSearchResult}
        onOpenMetricsModal={onOpenMetricsModal}
        onOpenBrowserModal={onOpenBrowserModal}
        onOpenMapModal={onOpenMapModal}
      />
    </>
  );
};

