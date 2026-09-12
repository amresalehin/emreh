import React, { useState } from 'react';
import {
  Bookmark,
  Layers,
  Globe,
  Tag,
  Database,
  BookOpen,
  Sparkles,
  Brain,
  Boxes,
  CheckSquare,
  Wand2,
  ChevronDown,
  Kanban,
  Columns3
} from 'lucide-react';
import { BookmarkServiceName } from '../../../utils/bookmarkSyncServices';

export type BookmarksAppSubviewId =
  | 'all'
  | 'kanban'
  | 'moodboard'
  | 'raindrop'
  | 'pinterest'
  | 'browser'
  | 'pocket'
  | 'pinboard'
  | 'linkding'
  | 'mymind'
  | 'fabric'
  | 'karakeep'
  | 'instapaper'
  | 'custom'
  | string;

export interface AppSubviewMeta {
  id: BookmarksAppSubviewId;
  label: string;
  count: number;
  icon: React.ReactNode;
  brandColor: string;
  activeColorClass: string;
  badgeClass: string;
  serviceKey?: BookmarkServiceName;
}

interface BookmarksAppNavigationProps {
  activeSubview: BookmarksAppSubviewId;
  onSelectSubview: (subviewId: BookmarksAppSubviewId) => void;
  appCounts: Record<string, number>;
  totalCount: number;
  customApps?: string[];
  isRaindropConnected?: boolean;
  isPinterestConnected?: boolean;
}

export const BookmarksAppNavigation: React.FC<BookmarksAppNavigationProps> = ({
  activeSubview,
  onSelectSubview,
  appCounts,
  totalCount,
  customApps = [],
  isRaindropConnected = false,
  isPinterestConnected = false
}) => {
  const standardApps: AppSubviewMeta[] = [
    {
      id: 'all',
      label: 'All Bookmarks',
      count: totalCount,
      icon: <Layers className="w-3.5 h-3.5" />,
      brandColor: '#4f46e5',
      activeColorClass: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs',
      badgeClass: 'bg-gray-200 text-gray-800 dark:bg-black/20 dark:text-gray-200'
    },
    {
      id: 'raindrop',
      label: 'Raindrop.io',
      count: appCounts['raindrop'] || 0,
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      ),
      brandColor: '#0089FF',
      activeColorClass: 'bg-[#0089FF] text-white shadow-xs',
      badgeClass: 'bg-blue-100 text-blue-900 dark:bg-white/20 dark:text-white',
      serviceKey: 'raindrop'
    },
    {
      id: 'pinterest',
      label: 'Pinterest',
      count: appCounts['pinterest'] || 0,
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.373-.057.24-.19.291-.439.175-1.644-.766-2.671-3.168-2.671-5.102 0-4.155 3.018-7.971 8.709-7.971 4.572 0 8.125 3.259 8.125 7.614 0 4.544-2.864 8.2-6.839 8.2-1.336 0-2.592-.695-3.021-1.513l-.824 3.143c-.298 1.144-1.104 2.578-1.644 3.454C9.539 23.834 10.749 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
        </svg>
      ),
      brandColor: '#E60023',
      activeColorClass: 'bg-[#E60023] text-white shadow-xs',
      badgeClass: 'bg-rose-100 text-rose-900 dark:bg-white/20 dark:text-white',
      serviceKey: 'pinterest'
    },
    {
      id: 'browser',
      label: 'Browser Bookmarks',
      count: appCounts['browser'] || 0,
      icon: <Globe className="w-3.5 h-3.5" />,
      brandColor: '#d97706',
      activeColorClass: 'bg-amber-600 text-white shadow-xs',
      badgeClass: 'bg-amber-100 text-amber-900 dark:bg-white/20 dark:text-white',
      serviceKey: 'browser'
    },
    {
      id: 'pocket',
      label: 'Pocket',
      count: appCounts['pocket'] || 0,
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5l-4-4 1.41-1.41L11 13.67l6.59-6.59L19 8.5l-8 8z"/>
        </svg>
      ),
      brandColor: '#ef4444',
      activeColorClass: 'bg-rose-600 text-white shadow-xs',
      badgeClass: 'bg-rose-100 text-rose-900 dark:bg-white/20 dark:text-white',
      serviceKey: 'pocket'
    },
    {
      id: 'pinboard',
      label: 'Pinboard',
      count: appCounts['pinboard'] || 0,
      icon: <Tag className="w-3.5 h-3.5" />,
      brandColor: '#2563eb',
      activeColorClass: 'bg-blue-600 text-white shadow-xs',
      badgeClass: 'bg-blue-100 text-blue-900 dark:bg-white/20 dark:text-white',
      serviceKey: 'pinboard'
    },
    {
      id: 'linkding',
      label: 'Linkding',
      count: appCounts['linkding'] || 0,
      icon: <Database className="w-3.5 h-3.5" />,
      brandColor: '#059669',
      activeColorClass: 'bg-emerald-600 text-white shadow-xs',
      badgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-white/20 dark:text-white',
      serviceKey: 'linkding'
    },
    {
      id: 'mymind',
      label: 'mymind',
      count: appCounts['mymind'] || 0,
      icon: <Brain className="w-3.5 h-3.5" />,
      brandColor: '#111827',
      activeColorClass: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs',
      badgeClass: 'bg-gray-200 text-gray-800 dark:bg-white/20 dark:text-white',
      serviceKey: 'mymind'
    },
    {
      id: 'fabric',
      label: 'Fabric.so',
      count: appCounts['fabric'] || 0,
      icon: <Boxes className="w-3.5 h-3.5" />,
      brandColor: '#6366f1',
      activeColorClass: 'bg-indigo-600 text-white shadow-xs',
      badgeClass: 'bg-indigo-100 text-indigo-900 dark:bg-white/20 dark:text-white',
      serviceKey: 'fabric'
    },
    {
      id: 'karakeep',
      label: 'KaraKeep',
      count: appCounts['karakeep'] || 0,
      icon: <CheckSquare className="w-3.5 h-3.5" />,
      brandColor: '#0ea5e9',
      activeColorClass: 'bg-sky-600 text-white shadow-xs',
      badgeClass: 'bg-sky-100 text-sky-900 dark:bg-white/20 dark:text-white',
      serviceKey: 'karakeep'
    },
    {
      id: 'instapaper',
      label: 'Instapaper',
      count: appCounts['instapaper'] || 0,
      icon: <BookOpen className="w-3.5 h-3.5" />,
      brandColor: '#334155',
      activeColorClass: 'bg-slate-700 text-white shadow-xs',
      badgeClass: 'bg-slate-100 text-slate-900 dark:bg-white/20 dark:text-white',
      serviceKey: 'instapaper'
    },
    {
      id: 'custom',
      label: 'Custom / God Mode',
      count: appCounts['custom'] || 0,
      icon: <Wand2 className="w-3.5 h-3.5" />,
      brandColor: '#8b5cf6',
      activeColorClass: 'bg-purple-600 text-white shadow-xs',
      badgeClass: 'bg-purple-100 text-purple-900 dark:bg-white/20 dark:text-white',
      serviceKey: 'custom'
    }
  ];

  // Custom dynamically discovered apps (e.g., if user imports from other platforms)
  const customAppMetas: AppSubviewMeta[] = customApps.map(appName => ({
    id: appName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    label: appName,
    count: appCounts[appName.toLowerCase()] || 0,
    icon: <Bookmark className="w-3.5 h-3.5 text-purple-500" />,
    brandColor: '#9333ea',
    activeColorClass: 'bg-purple-600 text-white shadow-xs',
    badgeClass: 'bg-purple-100 text-purple-900 dark:bg-white/20 dark:text-white'
  }));

  const allAppTabs = [...standardApps, ...customAppMetas];

  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(false);

  return (
    <div
      id="bookmarks-app-subviews-navigation"
      className="px-4 py-2 border-b border-black/8 dark:border-white/10 bg-white/60 dark:bg-[#151518]/60 backdrop-blur-2xl overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0"
    >
      <div className="relative shrink-0 mr-1">
        <button
          type="button"
          onClick={() => setIsNavDropdownOpen(prev => !prev)}
          className="p-1.5 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-gray-200 border border-black/5 dark:border-white/10 flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors"
          title="Quick Switch App Subview"
        >
          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden sm:inline">
            Apps
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
        </button>

        {isNavDropdownOpen && (
          <div className="absolute top-full left-0 mt-1.5 z-50 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-2xl border border-black/10 dark:border-white/15 rounded-2xl p-2 shadow-2xl min-w-[240px] max-h-80 overflow-y-auto space-y-0.5 animate-in fade-in slide-in-from-top-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 px-2 py-1">
              Select Subview
            </div>
            {allAppTabs.map(app => (
              <button
                key={app.id}
                type="button"
                onClick={() => {
                  onSelectSubview(app.id);
                  setIsNavDropdownOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer ${
                  activeSubview === app.id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0">{app.icon}</span>
                  <span>{app.label}</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                  {app.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {allAppTabs.map(app => {
        const isActive = activeSubview === app.id;
        const isRaindrop = app.id === 'raindrop';
        const isPinterest = app.id === 'pinterest';

        return (
          <button
            key={app.id}
            id={`bookmark-subview-tab-${app.id}`}
            type="button"
            onClick={() => onSelectSubview(app.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
              isActive
                ? app.activeColorClass
                : 'bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white border border-black/5 dark:border-white/5'
            }`}
          >
            <span className="shrink-0">{app.icon}</span>
            <span>{app.label}</span>

            {/* Connection dot indicator */}
            {isRaindrop && isRaindropConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="API Connected" />
            )}
            {isPinterest && isPinterestConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="API Connected" />
            )}

            {/* Count Badge */}
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold shrink-0 ${
                isActive ? 'bg-white/20 text-current' : 'bg-black/8 dark:bg-white/10 text-gray-700 dark:text-gray-300'
              }`}
            >
              {app.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
