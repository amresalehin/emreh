import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  MapPin,
  Headphones,
  Menu,
  X,
  Search,
  Settings,
  Image as ImageIcon,
  Bookmark,
  StickyNote,
  HeartPulse,
  Clock,
  HardDrive,
  Cloud,
  Youtube,
  Globe
} from 'lucide-react';
import { ViewType } from '../../types';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { AppZoomControls } from '../common/AppZoomControls';

interface MobileNavigationProps {
  currentView: ViewType;
  onSetView: (view: ViewType) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  zoom: number;
  onSetZoom: (z: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  importedFilesCount?: number;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentView,
  onSetView,
  onOpenSearch,
  onOpenSettings,
  zoom,
  onSetZoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  importedFilesCount = 0
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const primaryTabs: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'timeline', label: 'Journal', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'maptimeline', label: 'Map', icon: <MapPin className="w-5 h-5" /> },
    { id: 'spotify', label: 'Music', icon: <Headphones className="w-5 h-5" /> },
  ];

  const secondaryViews: { id: ViewType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'photos', label: 'Photos & Heritage', icon: <ImageIcon className="w-4 h-4" />, color: 'text-rose-500' },
    { id: 'bookmarks', label: 'Bookmarks', icon: <Bookmark className="w-4 h-4" />, color: 'text-teal-500' },
    { id: 'notes', label: 'Daily Notes', icon: <StickyNote className="w-4 h-4" />, color: 'text-amber-500' },
    { id: 'youtube', label: 'YouTube Watch', icon: <Youtube className="w-4 h-4" />, color: 'text-red-500' },
    { id: 'browser', label: 'Chrome History', icon: <Globe className="w-4 h-4" />, color: 'text-yellow-500' },
    { id: 'screentime', label: 'Screen Time', icon: <Clock className="w-4 h-4" />, color: 'text-indigo-500' },
    { id: 'fit', label: 'Google Fit', icon: <HeartPulse className="w-4 h-4" />, color: 'text-emerald-500' },
    { id: 'box', label: 'Box Cloud', icon: <Cloud className="w-4 h-4" />, color: 'text-blue-500' },
    { id: 'gdrive', label: 'Google Drive', icon: <HardDrive className="w-4 h-4" />, color: 'text-cyan-500' },
  ];

  const handleSelectView = (view: ViewType) => {
    onSetView(view);
    setIsDrawerOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header (Sticky) */}
      <header className="md:hidden shrink-0 h-13 px-3 bg-white/85 dark:bg-[#121214]/85 backdrop-blur-xl border-b border-black/8 dark:border-white/10 flex items-center justify-between z-30 select-none">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-stone-950 font-serif font-bold text-sm shadow-xs">
            E
          </div>
          <div>
            <h1 className="text-xs font-bold leading-tight text-gray-900 dark:text-white capitalize flex items-center gap-1.5">
              <span>{currentView === 'maptimeline' ? 'Map Timeline' : currentView === 'timeline' ? 'Life Journal' : currentView}</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-serif italic">Emreh همراه</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <PWAInstallButton variant="compact" className="text-[11px] px-2 py-0.5" />
          <AppZoomControls
            zoom={zoom}
            onSetZoom={onSetZoom}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onResetZoom={onResetZoom}
          />
          <button
            onClick={onOpenSearch}
            aria-label="Search"
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Thumb Friendly) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#121214]/90 backdrop-blur-xl border-t border-black/8 dark:border-white/10 flex items-center justify-around px-2 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-lg select-none"
      >
        {primaryTabs.map((tab) => {
          const isActive = currentView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectView(tab.id)}
              className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-amber-500 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-amber-500/15' : ''}`}>
                {tab.icon}
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}

        {/* More Button to trigger full drawer */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer ${
            isDrawerOpen || !['home', 'timeline', 'maptimeline', 'spotify'].includes(currentView)
              ? 'text-amber-500 font-bold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className={`p-1 rounded-lg ${isDrawerOpen ? 'bg-amber-500/15' : ''}`}>
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">More</span>
        </button>
      </nav>

      {/* More Views Bottom Sheet Drawer */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="flex-1 w-full"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="w-full bg-white dark:bg-[#18181b] rounded-t-3xl border-t border-black/10 dark:border-white/10 p-5 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">All Companion Views</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Switch to specialized modules</p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of Views */}
            <div className="grid grid-cols-3 gap-2.5">
              {secondaryViews.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectView(item.id)}
                    className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold'
                        : 'bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-gray-700 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className={item.color}>{item.icon}</div>
                    <span className="text-[11px] leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* In-Drawer Quick PWA Install & Zoom */}
            <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-3">
              <PWAInstallButton variant="full" />
              <AppZoomControls
                variant="full"
                zoom={zoom}
                onSetZoom={onSetZoom}
                onZoomIn={onZoomIn}
                onZoomOut={onZoomOut}
                onResetZoom={onResetZoom}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
