import React, { useState, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Sparkles,
  Search,
  BookOpen,
  MapPin,
  Image as ImageIcon,
  Cloud,
  HardDrive,
  Headphones,
  Youtube,
  Globe,
  Bookmark,
  StickyNote,
  HeartPulse,
  LayoutDashboard,
  Clock
} from 'lucide-react';
import { ViewType } from '../types';
import { EmrehProfileHoverCard } from './modals/EmrehProfileHoverCard';

interface SidebarProps {
  currentView: ViewType;
  onSetView: (view: ViewType) => void;
  onOpenSearch?: () => void;
  importedFilesCount?: number;
  onOpenImportedFiles?: () => void;
  onOpenSettings?: () => void;
  isSettingsOpen?: boolean;
  onBatchResolveGeo?: () => void;
  unresolvedCount?: number;
  isGeoResolving?: boolean;
  isAmoled?: boolean;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSetView,
  onOpenSearch,
  importedFilesCount,
  onOpenImportedFiles,
  onOpenSettings,
  isSettingsOpen = false,
  onBatchResolveGeo,
  unresolvedCount = 0,
  isGeoResolving = false,
  isAmoled = false,
  className = '',
  isCollapsed: propIsCollapsed,
  onToggleCollapsed,
}) => {
  const profileBtnRef = useRef<HTMLButtonElement>(null);

  // Profile card is click-only.
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleProfileClick = () => {
    setIsProfileOpen(prev => !prev);
  };

  // Left panel is fixed as a compact bar.
  const isCollapsed = true;

  const navLinks: {
    id: ViewType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'home',
      label: 'Home Canvas',
      icon: <LayoutDashboard className="w-[18px] h-[18px] stroke-[1.75]" />,
    },
    {
      id: 'timeline',
      label: 'Journal',
      icon: <BookOpen className="w-[18px] h-[18px] stroke-[1.75]" />,
    },
    {
      id: 'maptimeline',
      label: 'Map Timeline',
      icon: <MapPin className="w-[18px] h-[18px] stroke-[1.75]" />,
    },
    {
      id: 'photos',
      label: 'Photos',
      icon: <ImageIcon className="w-[18px] h-[18px] stroke-[1.75]" />,
    },
    {
      id: 'box',
      label: 'Box Cloud',
      icon: <Cloud className="w-[18px] h-[18px] stroke-[1.75]" />,
    },
    {
      id: 'gdrive',
      label: 'Google Drive',
      icon: <HardDrive className="w-[18px] h-[18px] stroke-[1.75]" />,
    },
    {
      id: 'spotify',
      label: 'Spotify',
      icon: <Headphones className="w-[18px] h-[18px] stroke-[1.75]" />,
    },
    {
      id: 'youtube',
      label: 'YouTube',
      icon: <Youtube className="w-[18px] h-[18px] stroke-[1.75]" />,
    },
    {
      id: 'browser',
      label: 'Browsing',
      icon: <Globe className="w-[18px] h-[18px] stroke-[1.75]" />,
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: <Bookmark className="w-[18px] h-[18px] stroke-[1.75]" />,
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: <StickyNote className="w-[18px] h-[18px] stroke-[1.75]" />,
    },
    {
      id: 'fit',
      label: 'Google Fit',
      icon: <HeartPulse className="w-[18px] h-[18px] stroke-[1.75]" />,
    },
    {
      id: 'screentime',
      label: 'Screentime',
      icon: <Clock className="w-[18px] h-[18px] stroke-[1.75]" />,
    },
  ];

  return (
    <nav
      aria-label="Editorial Navigation Sidebar"
      className={`
        hidden
        md:flex
        w-16
        px-2
        py-4
        shrink-0
        h-full
        flex-col
        justify-between
        border-r
        border-black/5
        dark:border-white/[0.06]
        bg-white/75
        dark:bg-[#0e0d0c]/85
        backdrop-blur-xl
        supports-[backdrop-filter]:bg-white/70
        dark:supports-[backdrop-filter]:bg-[#0e0d0c]/80
        shadow-[4px_0_24px_rgba(0,0,0,0.03)]
        transition-all
        duration-300
        ease-in-out
        select-none
        z-30
        ${className}
      `}
    >
      {/* Top Section */}
      <div className="flex flex-col w-full">

        {/* Emreh Profile — click to open */}
        <div className="flex flex-col items-center justify-center mb-4 w-full">
          <button
            ref={profileBtnRef}
            type="button"
            id="sidebar-emreh-profile-btn"
            onClick={handleProfileClick}
            aria-label="About Emreh"
            aria-expanded={isProfileOpen}
            title="About Emreh"
            className="
              group
              relative
              w-10
              h-10
              rounded-2xl
              flex
              items-center
              justify-center
              overflow-hidden
              bg-[#111214]
              dark:bg-[#0d0e10]
              border
              border-black/10
              dark:border-white/10
              transition-transform
              duration-200
              hover:scale-105
              active:scale-95
              cursor-pointer
              focus:outline-none
              focus:ring-2
              focus:ring-black/10
              dark:focus:ring-white/20
            "
          >
            <img
              src={`${import.meta.env.BASE_URL}app-icon.svg`}
              alt="Emreh"
              className="
                w-full
                h-full
                object-contain
                transition-transform
                duration-200
                group-hover:scale-105
              "
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('emreh-logo.jpg')) {
                  target.src = `${import.meta.env.BASE_URL}emreh-logo.jpg`;
                }
              }}
            />
          </button>
        </div>

        {/* Global Search Button */}
        {onOpenSearch && (
          <div className="flex flex-col items-center justify-center mb-3 w-full">
            <button
              type="button"
              id="sidebar-search-btn"
              onClick={onOpenSearch}
              aria-label="Search Timeline (⌘K)"
              title="Search Timeline (⌘K or /)"
              className="
                w-10
                h-10
                rounded-xl
                flex
                items-center
                justify-center
                text-stone-600
                dark:text-stone-400
                hover:text-stone-900
                dark:hover:text-stone-100
                bg-stone-200/50
                dark:bg-stone-800/50
                hover:bg-stone-300/60
                dark:hover:bg-stone-700/60
                border
                border-black/5
                dark:border-white/8
                transition-all
                duration-200
                hover:scale-105
                active:scale-95
                cursor-pointer
                shadow-2xs
              "
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <ul className="flex flex-col gap-1.5 list-none p-0 m-0 w-full">
          {navLinks.map(item => {
            const isActive = currentView === item.id;

            return (
              <li key={item.id} className="w-full">
                <button aria-label={item.label}
                  onClick={() => onSetView(item.id)}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    w-full
                    flex
                    items-center
                    ${
                      isCollapsed
                        ? 'justify-center px-2 py-2.5'
                        : 'justify-start gap-3 px-3 py-2.5'
                    }
                    rounded-xl
                    text-[0.85rem]
                    font-medium
                    transition-all
                    cursor-pointer
                    backdrop-blur-xl
                    ${
                      isActive
                        ? 'bg-[#d4a373]/20 text-neutral-950 dark:bg-[#d4a373]/25 dark:text-[#fdfcf9] font-medium shadow-[0_2px_12px_rgba(212,163,115,0.18)] ring-1 ring-[#d4a373]/40'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-transparent hover:bg-white/[0.04] ring-1 ring-transparent hover:ring-white/[0.08]'
                    }
                  `}
                >
                  <span
                    className={`
                      shrink-0
                      transition-opacity
                      ${
                        isActive
                          ? 'opacity-100 scale-105'
                          : 'opacity-75'
                      }
                    `}
                  >
                    {item.icon}
                  </span>

                  {!isCollapsed && (
                    <span className="truncate">
                      {item.label}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Sidebar Footer */}
      <div className="flex flex-col gap-1.5 pt-4 border-t border-black/8 dark:border-white/10 w-full">

        {/* Location Resolver */}
        {unresolvedCount > 0 && onBatchResolveGeo && (
          <button
            onClick={onBatchResolveGeo}
            disabled={isGeoResolving}
            aria-label={`Resolve ${unresolvedCount} Places`}
            title={`Resolve ${unresolvedCount} Places pending reverse geocoding`}
            className={`
              w-full
              flex
              items-center
              ${
                isCollapsed
                  ? 'justify-center p-2 relative'
                  : 'justify-between px-2.5 py-2 gap-2'
              }
              rounded-xl
              text-xs
              font-semibold
              text-blue-700
              dark:text-blue-300
              bg-blue-500/15
              dark:bg-blue-500/20
              hover:bg-blue-500/25
              dark:hover:bg-blue-500/30
              border
              border-blue-500/30
              backdrop-blur-xl
              transition-all
              cursor-pointer
              shadow-2xs
            `}
          >
            <div className="flex items-center gap-2">
              <Sparkles
                className={`w-3.5 h-3.5 ${
                  isGeoResolving ? 'animate-spin' : ''
                }`}
              />

              {!isCollapsed && (
                <span className="font-semibold">
                  Resolve Places
                </span>
              )}
            </div>

            <span
              className={`
                font-mono
                bg-blue-600
                dark:bg-blue-500
                text-white
                px-1.5
                py-0.5
                text-[9px]
                font-bold
                rounded-full
                shadow-2xs
                ${
                  isCollapsed
                    ? 'absolute -top-1 -right-1'
                    : ''
                }
              `}
            >
              {unresolvedCount}
            </span>
          </button>
        )}

        {/* Settings */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            aria-label="Open Settings"
            title="Settings (⌘,)"
            className={`
              w-full
              flex
              items-center
              ${
                isCollapsed
                  ? 'justify-center p-2.5'
                  : 'justify-between px-2.5 py-2 gap-2'
              }
              rounded-xl
              text-[0.85rem]
              font-medium
              transition-all
              cursor-pointer
              backdrop-blur-xl
              ${
                isSettingsOpen
                  ? 'bg-blue-600/18 text-blue-900 dark:bg-blue-500/25 dark:text-blue-100 font-semibold border border-blue-500/35 dark:border-blue-400/40 shadow-xs'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white bg-white/20 dark:bg-white/[0.03] hover:bg-white/60 dark:hover:bg-white/12 border border-black/5 dark:border-white/8 hover:border-black/12 dark:hover:border-white/20 shadow-2xs hover:shadow-xs'
              }
            `}
          >
            <div className="flex items-center gap-2.5">
              <SettingsIcon className="w-4 h-4 opacity-75" />

              {!isCollapsed && (
                <span className="font-medium">
                  Settings
                </span>
              )}
            </div>

            {!isCollapsed && (
              <kbd
                className="
                  text-[9px]
                  font-mono
                  px-1.5
                  py-0.5
                  rounded-md
                  bg-black/5
                  dark:bg-white/10
                  text-gray-600
                  dark:text-gray-300
                  border
                  border-black/5
                  dark:border-white/5
                "
              >
                ⌘,
              </kbd>
            )}
          </button>
        )}
      </div>

      {/* Emreh Profile Card */}
      <EmrehProfileHoverCard
        isOpen={isProfileOpen}
        anchorRef={profileBtnRef}
        onClose={() => setIsProfileOpen(false)}
      />
    </nav>
  );
};