import React, { useState } from 'react';
import {
  Layers,
  RefreshCw,
  Folder,
  Tag,
  Plus,
  Link,
  ChevronDown,
  ChevronRight,
  Upload,
  Globe,
  Radio,
  FileCode,
  Brain,
  Boxes,
  CheckSquare,
  BookOpen,
  Sparkles,
  Kanban,
  Columns3,
  CheckCircle2,
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';
import { BookmarkServiceName } from '../../../utils/bookmarkSyncServices';

export type BookmarksSidebarSelection =
  | { type: 'view'; id: 'all' | 'kanban' | 'moodboard' }
  | { type: 'live_service'; id: 'raindrop' | 'pinterest' | 'pocket' | 'pinboard' | 'linkding' | 'mymind'; name: string }
  | { type: 'import'; id: string; name: string }
  | { type: 'folder'; id: string; name: string }
  | { type: 'tag'; id: string; name: string };

interface BookmarksSidebarProps {
  currentSelection: BookmarksSidebarSelection;
  onSelect: (selection: BookmarksSidebarSelection) => void;
  appCounts: Record<string, number>;
  totalCount: number;
  customApps?: string[];
  folders?: { name: string; count: number }[];
  tags?: { name: string; count: number }[];
  isRaindropConnected?: boolean;
  isPinterestConnected?: boolean;
  onOpenPasteLink: () => void;
  onOpenSyncModal: (service?: BookmarkServiceName) => void;
  onExportHtml?: () => void;
}

export const BookmarksSidebar: React.FC<BookmarksSidebarProps> = ({
  currentSelection,
  onSelect,
  appCounts,
  totalCount,
  customApps = [],
  folders = [],
  tags = [],
  isRaindropConnected = false,
  isPinterestConnected = false,
  onOpenPasteLink,
  onOpenSyncModal,
  onExportHtml
}) => {
  // Collapsible nested collections state
  const [isLiveSyncOpen, setIsLiveSyncOpen] = useState(true);
  const [isImportsOpen, setIsImportsOpen] = useState(true);
  const [isFoldersOpen, setIsFoldersOpen] = useState(true);
  const [isTagsOpen, setIsTagsOpen] = useState(false);

  // Live syncing services list
  const liveSyncServices = [
    {
      id: 'raindrop' as const,
      domId: 'bookmark-subview-tab-raindrop',
      name: 'Raindrop.io',
      count: appCounts['raindrop'] || 0,
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      ),
      color: '#0089FF',
      activeBg: 'bg-[#0089FF]/10 text-[#0089FF] dark:bg-[#0089FF]/20 font-bold',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      connected: isRaindropConnected,
      serviceKey: 'raindrop' as BookmarkServiceName
    },
    {
      id: 'pinterest' as const,
      domId: 'bookmark-subview-tab-pinterest',
      name: 'Pinterest',
      count: appCounts['pinterest'] || 0,
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.373-.057.24-.19.291-.439.175-1.644-.766-2.671-3.168-2.671-5.102 0-4.155 3.018-7.971 8.709-7.971 4.572 0 8.125 3.259 8.125 7.614 0 4.544-2.864 8.2-6.839 8.2-1.336 0-2.592-.695-3.021-1.513l-.824 3.143c-.298 1.144-1.104 2.578-1.644 3.454C9.539 23.834 10.749 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
        </svg>
      ),
      color: '#E60023',
      activeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      connected: isPinterestConnected,
      serviceKey: 'pinterest' as BookmarkServiceName
    },
    {
      id: 'mymind' as const,
      domId: 'bookmark-subview-tab-mymind',
      name: 'mymind',
      count: appCounts['mymind'] || 0,
      icon: <Brain className="w-3.5 h-3.5 text-orange-500" />,
      color: '#F97316',
      activeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold',
      badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      connected: false,
      serviceKey: 'manual' as any
    },
    {
      id: 'pocket' as const,
      domId: 'bookmark-subview-tab-pocket',
      name: 'Pocket',
      count: appCounts['pocket'] || 0,
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5l-4-4 1.41-1.41L11 13.67l6.59-6.59L19 8.5l-8 8z"/>
        </svg>
      ),
      color: '#ef4444',
      activeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      connected: false,
      serviceKey: 'pocket' as BookmarkServiceName
    },
    {
      id: 'linkding' as const,
      domId: 'bookmark-subview-tab-linkding',
      name: 'Linkding',
      count: appCounts['linkding'] || 0,
      icon: (
        <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M7 8h10M7 12h10M7 16h6" />
        </svg>
      ),
      color: '#059669',
      activeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      connected: false,
      serviceKey: 'linkding' as BookmarkServiceName
    },
    {
      id: 'pinboard' as const,
      domId: 'bookmark-subview-tab-pinboard',
      name: 'Pinboard',
      count: appCounts['pinboard'] || 0,
      icon: <Tag className="w-3.5 h-3.5" />,
      color: '#2563eb',
      activeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      connected: false,
      serviceKey: 'pinboard' as BookmarkServiceName
    }
  ];

  // Import sources list
  const importSources = [
    {
      id: 'browser',
      domId: 'bookmark-subview-tab-browser',
      name: 'Browser Bookmarks',
      count: appCounts['browser'] || 0,
      icon: <Globe className="w-3.5 h-3.5 text-amber-500" />,
      desc: 'Chrome, Safari, Firefox, Edge, Arc'
    },
    {
      id: 'html_file',
      domId: 'bookmark-subview-tab-html',
      name: 'Netscape HTML Files',
      count: appCounts['html'] || 0,
      icon: <FileCode className="w-3.5 h-3.5 text-sky-500" />,
      desc: 'Exported bookmark archives'
    },
    {
      id: 'fabric',
      domId: 'bookmark-subview-tab-fabric',
      name: 'Fabric.so',
      count: appCounts['fabric'] || 0,
      icon: <Boxes className="w-3.5 h-3.5 text-indigo-500" />,
      desc: 'Imported workspace'
    },
    {
      id: 'karakeep',
      domId: 'bookmark-subview-tab-karakeep',
      name: 'KaraKeep',
      count: appCounts['karakeep'] || 0,
      icon: <CheckSquare className="w-3.5 h-3.5 text-teal-500" />,
      desc: 'Imported lists'
    },
    {
      id: 'instapaper',
      domId: 'bookmark-subview-tab-instapaper',
      name: 'Instapaper',
      count: appCounts['instapaper'] || 0,
      icon: <BookOpen className="w-3.5 h-3.5 text-slate-500" />,
      desc: 'Reading list articles'
    }
  ];

  // Custom dynamically discovered apps from timelineData
  const dynamicCustomImports = customApps.map(appName => ({
    id: appName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    domId: `bookmark-subview-tab-${appName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    name: appName,
    count: appCounts[appName.toLowerCase()] || 0,
    icon: <Bookmark className="w-3.5 h-3.5 text-purple-500" />,
    desc: 'Custom import'
  }));

  const allImportSources = [...importSources, ...dynamicCustomImports];

  // Total count for live sync services & imports
  const totalLiveSyncCount = liveSyncServices.reduce((acc, s) => acc + s.count, 0);
  const totalImportsCount = allImportSources.reduce((acc, s) => acc + s.count, 0);

  return (
    <aside
      id="bookmarks-app-subviews-navigation"
      className="w-64 sm:w-72 shrink-0 border-r border-blue-500/20 bg-blue-950/5 dark:bg-[#0c1222]/85 backdrop-blur-xl flex flex-col h-full overflow-hidden select-none z-10"
    >
      {/* Sidebar Header */}
      <div className="px-4 py-3.5 border-b border-black/8 dark:border-white/10 flex items-center justify-between shrink-0 bg-white/40 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
            <Bookmark className="w-3.5 h-3.5 fill-current" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-gray-900 dark:text-white block leading-tight truncate">
              Library
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">
              {totalCount} {totalCount === 1 ? 'bookmark' : 'bookmarks'}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Navigation List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 no-scrollbar">
        {/* Core Views: All, Kanban, Moodboard */}
        <div className="space-y-0.5">
          <button
            type="button"
            id="bookmark-subview-tab-all"
            onClick={() => onSelect({ type: 'view', id: 'all' })}
            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              currentSelection.type === 'view' && currentSelection.id === 'all'
                ? 'bg-blue-500/15 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 shadow-2xs border border-blue-500/30 font-bold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-blue-500/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>All Bookmarks</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            id="bookmark-subview-tab-kanban"
            onClick={() => onSelect({ type: 'view', id: 'kanban' })}
            className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
              currentSelection.type === 'view' && currentSelection.id === 'kanban'
                ? 'bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shadow-2xs border border-indigo-500/30 font-bold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-500/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Kanban className="w-4 h-4 text-indigo-500" />
              <span>Kanban Moodboard</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              Board
            </span>
          </button>

          <button
            type="button"
            id="bookmark-subview-tab-moodboard"
            onClick={() => onSelect({ type: 'view', id: 'moodboard' })}
            className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
              currentSelection.type === 'view' && currentSelection.id === 'moodboard'
                ? 'bg-blue-500/15 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 shadow-2xs border border-blue-500/30 font-bold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-blue-500/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Columns3 className="w-4 h-4 text-blue-500" />
              <span>Moodboard Masonry</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              Pins
            </span>
          </button>
        </div>

        {/* NESTED COLLECTION 1: LIVE SYNC SERVICES */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <button
              type="button"
              onClick={() => setIsLiveSyncOpen(prev => !prev)}
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
            >
              {isLiveSyncOpen ? (
                <ChevronDown className="w-3 h-3 text-gray-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-400" />
              )}
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Services
              </span>
            </button>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                {liveSyncServices.filter(s => s.count > 0).length || 5}
              </span>
            </div>
          </div>

          {isLiveSyncOpen && (
            <div className="space-y-0.5 pl-1.5 border-l-2 border-emerald-500/20 ml-2 animate-in fade-in duration-150">
              {liveSyncServices.map(service => {
                const isSelected =
                  currentSelection.type === 'live_service' && currentSelection.id === service.id;

                return (
                  <button
                    key={service.id}
                    id={service.domId}
                    type="button"
                    onClick={() =>
                      onSelect({
                        type: 'live_service',
                        id: service.id,
                        name: service.name
                      })
                    }
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? service.activeBg
                        : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0" style={{ color: service.color }}>
                        {service.icon}
                      </span>
                      <span className="truncate">{service.name}</span>
                      {service.connected && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                          title="Account Live Connected"
                        />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                        isSelected ? 'bg-current/15' : 'bg-black/5 dark:bg-white/10 text-gray-500'
                      }`}
                    >
                      {service.count}
                    </span>
                  </button>
                );
              })}

              {/* Add / Connect Service Button */}
              <button
                type="button"
                onClick={() => onOpenSyncModal()}
                className="w-full px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-1.5 transition-colors cursor-pointer mt-1"
              >
                <Plus className="w-3 h-3" />
                <span>Connect service...</span>
              </button>
            </div>
          )}
        </div>

        {/* NESTED COLLECTION 2: IMPORTS */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <button
              type="button"
              onClick={() => setIsImportsOpen(prev => !prev)}
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
            >
              {isImportsOpen ? (
                <ChevronDown className="w-3 h-3 text-gray-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-400" />
              )}
              <span className="flex items-center gap-1.5">
                <Upload className="w-3 h-3 text-amber-500" />
                Imports
              </span>
            </button>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                {totalImportsCount}
              </span>
            </div>
          </div>

          {isImportsOpen && (
            <div className="space-y-0.5 pl-1.5 border-l-2 border-amber-500/20 ml-2 animate-in fade-in duration-150">
              {allImportSources.map(source => {
                const isSelected =
                  currentSelection.type === 'import' && currentSelection.id === source.id;

                return (
                  <button
                    key={source.id}
                    id={source.domId}
                    type="button"
                    onClick={() =>
                      onSelect({
                        type: 'import',
                        id: source.id,
                        name: source.name
                      })
                    }
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">{source.icon}</span>
                      <span className="truncate">{source.name}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                        isSelected ? 'bg-current/15' : 'bg-black/5 dark:bg-white/10 text-gray-500'
                      }`}
                    >
                      {source.count}
                    </span>
                  </button>
                );
              })}

              {/* Import Bookmarks File Button */}
              <button
                type="button"
                onClick={() => onOpenSyncModal('browser')}
                className="w-full px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1.5 transition-colors cursor-pointer mt-1"
              >
                <Upload className="w-3 h-3" />
                <span>Import HTML / files...</span>
              </button>
            </div>
          )}
        </div>

        {/* FOLDERS / COLLECTIONS (if any exist) */}
        {folders.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <button
                type="button"
                onClick={() => setIsFoldersOpen(prev => !prev)}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
              >
                {isFoldersOpen ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
                <span className="flex items-center gap-1.5">
                  <Folder className="w-3 h-3 text-blue-500" />
                  Folders
                </span>
              </button>
              <span className="text-[10px] text-gray-400 font-bold">{folders.length}</span>
            </div>

            {isFoldersOpen && (
              <div className="space-y-0.5 pl-1.5 border-l-2 border-blue-500/20 ml-2 animate-in fade-in duration-150 max-h-48 overflow-y-auto no-scrollbar">
                {folders.map(folder => {
                  const isSelected =
                    currentSelection.type === 'folder' && currentSelection.id === folder.name;

                  return (
                    <button
                      key={folder.name}
                      type="button"
                      onClick={() =>
                        onSelect({
                          type: 'folder',
                          id: folder.name,
                          name: folder.name
                        })
                      }
                      className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 font-bold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Folder className="w-3 h-3 text-blue-500/70 shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-gray-500">
                        {folder.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAGS (if any exist) */}
        {tags.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <button
                type="button"
                onClick={() => setIsTagsOpen(prev => !prev)}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
              >
                {isTagsOpen ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-purple-500" />
                  Tags
                </span>
              </button>
              <span className="text-[10px] text-gray-400 font-bold">{tags.length}</span>
            </div>

            {isTagsOpen && (
              <div className="space-y-0.5 pl-1.5 border-l-2 border-purple-500/20 ml-2 animate-in fade-in duration-150 max-h-48 overflow-y-auto no-scrollbar">
                {tags.map(tag => {
                  const isSelected =
                    currentSelection.type === 'tag' && currentSelection.id === tag.name;

                  return (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() =>
                        onSelect({
                          type: 'tag',
                          id: tag.name,
                          name: tag.name
                        })
                      }
                      className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 font-bold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-purple-500 text-xs">#</span>
                        <span className="truncate">{tag.name}</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-gray-500">
                        {tag.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
