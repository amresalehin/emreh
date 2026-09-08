import React, { useState, useMemo, useEffect } from 'react';
import {
  Kanban,
  Plus,
  SlidersHorizontal,
  Folder,
  Tag,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Trash2,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  Columns3,
  Search,
  Filter,
  Info
} from 'lucide-react';
import { TimelineItem } from '../../../types';
import { MoodboardCard } from './MoodboardCard';
import {
  RaindropViewMenu,
  RaindropLayoutMode,
  MoodboardDisplayConfig,
  DEFAULT_MOODBOARD_CONFIG
} from './RaindropViewMenu';
import { RaindropSearchDropdown } from './RaindropSearchDropdown';

interface KanbanMoodboardViewProps {
  bookmarks: TimelineItem[];
  bookmarkNotes: Record<string, string>;
  bookmarkTags: Record<string, string[]>;
  sessionSnapshots?: Record<string, string>;
  onOpenEditModal: (item: TimelineItem) => void;
  onCopyLink: (url: string) => void;
  copiedUrl: string | null;
  onDeleteItem?: (id: string) => void;
  onSelectTag?: (tag: string) => void;
  onSelectItem?: (item: TimelineItem) => void;
  activeItem?: TimelineItem | null;
  layoutMode: RaindropLayoutMode;
  onChangeLayoutMode: (mode: RaindropLayoutMode) => void;
  moodboardConfig: MoodboardDisplayConfig;
  onChangeMoodboardConfig: (config: MoodboardDisplayConfig) => void;
  onApplyToAll?: () => void;
}

export type KanbanGroupByOption = 'status' | 'collection' | 'type' | 'tag';

interface KanbanColumn {
  id: string;
  label: string;
  icon?: React.ReactNode;
  color: string;
  badgeBg: string;
  badgeText: string;
}

const DEFAULT_STATUS_COLUMNS: KanbanColumn[] = [
  {
    id: 'inbox',
    label: '📥 Inbox & Unsorted',
    color: '#0089FF',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-500 dark:text-blue-400'
  },
  {
    id: 'moodboard',
    label: '🎨 Moodboard & Inspo',
    color: '#8b5cf6',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-500 dark:text-purple-400'
  },
  {
    id: 'reading',
    label: '📖 Reading / To Review',
    color: '#f59e0b',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-500 dark:text-amber-400'
  },
  {
    id: 'favorites',
    label: '⭐ Top Favorites',
    color: '#ec4899',
    badgeBg: 'bg-pink-500/15',
    badgeText: 'text-pink-500 dark:text-pink-400'
  },
  {
    id: 'archived',
    label: '📦 Archived & Reference',
    color: '#10b981',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-500 dark:text-emerald-400'
  }
];

export const KanbanMoodboardView: React.FC<KanbanMoodboardViewProps> = ({
  bookmarks,
  bookmarkNotes,
  bookmarkTags,
  sessionSnapshots = {},
  onOpenEditModal,
  onCopyLink,
  copiedUrl,
  onDeleteItem,
  onSelectTag,
  onSelectItem,
  activeItem,
  layoutMode,
  onChangeLayoutMode,
  moodboardConfig,
  onChangeMoodboardConfig,
  onApplyToAll
}) => {
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Group by option
  const [groupBy, setGroupBy] = useState<KanbanGroupByOption>(() => {
    try {
      return (localStorage.getItem('mylife_kanban_groupby') as KanbanGroupByOption) || 'status';
    } catch {
      return 'status';
    }
  });

  const handleSetGroupBy = (opt: KanbanGroupByOption) => {
    setGroupBy(opt);
    try {
      localStorage.setItem('mylife_kanban_groupby', opt);
    } catch (e) {
      console.warn(e);
    }
  };

  // Board Column Width
  const [columnWidth, setColumnWidth] = useState<'compact' | 'standard' | 'wide' | 'fluid'>('standard');

  // Stored item status overrides: itemId -> columnId
  const [itemStatuses, setItemStatuses] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('mylife_kanban_item_status');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Active Drag Over Column for drop highlighting
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // New Column Modal / inline add state
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [customColumns, setCustomColumns] = useState<KanbanColumn[]>(() => {
    try {
      const saved = localStorage.getItem('mylife_kanban_custom_cols');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save item status change
  const handleMoveToColumn = (item: TimelineItem, targetColId: string) => {
    setItemStatuses(prev => {
      const updated = { ...prev, [item.id]: targetColId };
      try {
        localStorage.setItem('mylife_kanban_item_status', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setDragOverColId(null);
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId) return;
    const item = bookmarks.find(b => b.id === itemId);
    if (item) {
      handleMoveToColumn(item, targetColId);
    }
  };

  // Handle Add Custom Column
  const handleAddCustomColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    const colId = `custom_${Date.now()}`;
    const newCol: KanbanColumn = {
      id: colId,
      label: newColumnName.trim(),
      color: '#6366f1',
      badgeBg: 'bg-indigo-500/15',
      badgeText: 'text-indigo-400'
    };
    const updated = [...customColumns, newCol];
    setCustomColumns(updated);
    try {
      localStorage.setItem('mylife_kanban_custom_cols', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  // Search filtering with Raindrop operator support
  const filteredBookmarks = useMemo(() => {
    let result = bookmarks;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();

      // Check operators
      if (q.startsWith('type:image')) {
        result = result.filter(b => b.cover || b.image_url);
      } else if (q.startsWith('type:audio')) {
        result = result.filter(b => b.platform?.toLowerCase().includes('spotify') || b.platform?.toLowerCase().includes('audio'));
      } else if (q.startsWith('type:link')) {
        result = result.filter(b => b.url);
      } else if (q.startsWith('note:true')) {
        result = result.filter(b => (b.url && bookmarkNotes[b.url]?.trim()) || b.description);
      } else if (q.startsWith('notag:true')) {
        result = result.filter(b => !(b.url && bookmarkTags[b.url]?.length));
      } else if (q.startsWith('#')) {
        const tagTerm = q.replace(/^#/, '');
        result = result.filter(b => {
          const tList = (b.url && bookmarkTags[b.url]) || [];
          return tList.some(t => t.toLowerCase().includes(tagTerm));
        });
      } else if (q.startsWith('in:title ')) {
        const term = q.replace('in:title ', '');
        result = result.filter(b => (b.title || '').toLowerCase().includes(term));
      } else if (q.startsWith('in:url ')) {
        const term = q.replace('in:url ', '');
        result = result.filter(b => (b.url || '').toLowerCase().includes(term));
      } else {
        result = result.filter(b => {
          const matchTitle = (b.title || '').toLowerCase().includes(q);
          const matchNote = (b.url && (bookmarkNotes[b.url] || '').toLowerCase().includes(q));
          const matchDomain = (b.domain || '').toLowerCase().includes(q);
          const matchTag = (b.url && (bookmarkTags[b.url] || []).some(t => t.toLowerCase().includes(q)));
          const matchDesc = (b.subtitle || b.description || '').toLowerCase().includes(q);
          return matchTitle || matchNote || matchDomain || matchTag || matchDesc;
        });
      }
    }

    return result;
  }, [bookmarks, searchQuery, bookmarkNotes, bookmarkTags]);

  // Determine board columns dynamically based on groupBy setting
  const columns: KanbanColumn[] = useMemo(() => {
    if (groupBy === 'status') {
      return [...DEFAULT_STATUS_COLUMNS, ...customColumns];
    }

    if (groupBy === 'collection') {
      const set = new Set<string>();
      bookmarks.forEach(b => {
        if (b.category && b.category !== 'Unsorted') {
          set.add(b.category);
        }
      });
      const list = Array.from(set).sort();
      const cols: KanbanColumn[] = list.map((cat, idx) => {
        const colors = ['#0089FF', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
        const color = colors[idx % colors.length];
        return {
          id: cat,
          label: cat,
          color,
          badgeBg: 'bg-blue-500/15',
          badgeText: 'text-blue-500 dark:text-blue-400'
        };
      });
      cols.push({
        id: 'Unsorted',
        label: 'Unsorted / General',
        color: '#6b7280',
        badgeBg: 'bg-gray-500/15',
        badgeText: 'text-gray-400'
      });
      return cols;
    }

    if (groupBy === 'type') {
      return [
        {
          id: 'images',
          label: '🖼️ Visuals & Moodboard',
          color: '#8b5cf6',
          badgeBg: 'bg-purple-500/15',
          badgeText: 'text-purple-400'
        },
        {
          id: 'articles',
          label: '📄 Articles & Reads',
          color: '#0089FF',
          badgeBg: 'bg-blue-500/15',
          badgeText: 'text-blue-400'
        },
        {
          id: 'tools',
          label: '🛠️ Code & Developer Tools',
          color: '#10b981',
          badgeBg: 'bg-emerald-500/15',
          badgeText: 'text-emerald-400'
        },
        {
          id: 'media',
          label: '🎵 Music, Video & Audio',
          color: '#ec4899',
          badgeBg: 'bg-pink-500/15',
          badgeText: 'text-pink-400'
        },
        {
          id: 'other',
          label: '🌐 General Web Links',
          color: '#6b7280',
          badgeBg: 'bg-gray-500/15',
          badgeText: 'text-gray-400'
        }
      ];
    }

    if (groupBy === 'tag') {
      const tagMap = new Map<string, number>();
      bookmarks.forEach(b => {
        const tList = (b.url && bookmarkTags[b.url]) || [];
        tList.forEach(t => {
          const lower = t.toLowerCase();
          tagMap.set(lower, (tagMap.get(lower) || 0) + 1);
        });
      });
      const topTags = Array.from(tagMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([tag]) => tag);

      const cols: KanbanColumn[] = topTags.map((t, idx) => {
        const colors = ['#0089FF', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
        return {
          id: `tag_${t}`,
          label: `#${t}`,
          color: colors[idx % colors.length],
          badgeBg: 'bg-blue-500/15',
          badgeText: 'text-blue-400'
        };
      });

      cols.push({
        id: 'no_tag',
        label: 'Without Tags',
        color: '#6b7280',
        badgeBg: 'bg-gray-500/15',
        badgeText: 'text-gray-400'
      });
      return cols;
    }

    return DEFAULT_STATUS_COLUMNS;
  }, [groupBy, bookmarks, bookmarkTags, customColumns]);

  // Group items by column
  const groupedItems = useMemo(() => {
    const map: Record<string, TimelineItem[]> = {};
    columns.forEach(c => {
      map[c.id] = [];
    });

    filteredBookmarks.forEach(item => {
      if (groupBy === 'status') {
        const customCol = itemStatuses[item.id];
        if (customCol && map[customCol]) {
          map[customCol].push(item);
        } else {
          // Auto assign based on heuristics if not manually moved
          const isFavorited = (item.url && (bookmarkTags[item.url] || []).includes('favorite')) || item.favorite;
          const hasImage = Boolean(item.cover || item.image_url);
          const hasNote = Boolean(item.url && bookmarkNotes[item.url]);

          if (isFavorited) {
            map['favorites'] ? map['favorites'].push(item) : map[columns[0].id]?.push(item);
          } else if (hasImage && (item.category?.toLowerCase().includes('design') || item.platform?.toLowerCase().includes('pinterest'))) {
            map['moodboard'] ? map['moodboard'].push(item) : map[columns[0].id]?.push(item);
          } else if (hasNote || item.category?.toLowerCase().includes('reading')) {
            map['reading'] ? map['reading'].push(item) : map[columns[0].id]?.push(item);
          } else {
            map['inbox'] ? map['inbox'].push(item) : map[columns[0].id]?.push(item);
          }
        }
      } else if (groupBy === 'collection') {
        const cat = item.category || 'Unsorted';
        if (map[cat]) {
          map[cat].push(item);
        } else {
          map['Unsorted'] ? map['Unsorted'].push(item) : map[columns[0].id]?.push(item);
        }
      } else if (groupBy === 'type') {
        const p = (item.platform || '').toLowerCase();
        if (item.cover || item.image_url || p.includes('pinterest')) {
          map['images']?.push(item);
        } else if (p.includes('pocket') || item.subtitle || (item.url && item.url.includes('blog'))) {
          map['articles']?.push(item);
        } else if (item.url && (item.url.includes('github') || item.url.includes('dev') || item.url.includes('docs'))) {
          map['tools']?.push(item);
        } else if (p.includes('spotify') || p.includes('youtube')) {
          map['media']?.push(item);
        } else {
          map['other']?.push(item);
        }
      } else if (groupBy === 'tag') {
        const tList = (item.url && bookmarkTags[item.url]) || [];
        let matched = false;
        for (const t of tList) {
          const targetId = `tag_${t.toLowerCase()}`;
          if (map[targetId]) {
            map[targetId].push(item);
            matched = true;
            break;
          }
        }
        if (!matched) {
          map['no_tag']?.push(item);
        }
      }
    });

    return map;
  }, [filteredBookmarks, columns, groupBy, itemStatuses, bookmarkNotes, bookmarkTags]);

  // Column width class
  const getColWidthClass = () => {
    switch (columnWidth) {
      case 'compact':
        return 'w-[280px] min-w-[280px] max-w-[280px]';
      case 'wide':
        return 'w-[400px] min-w-[400px] max-w-[400px]';
      case 'fluid':
        return 'flex-1 min-w-[320px] max-w-[480px]';
      case 'standard':
      default:
        return 'w-[330px] min-w-[330px] max-w-[330px]';
    }
  };

  const availableColOptions = useMemo(() => {
    return columns.map(c => ({ id: c.id, label: c.label }));
  }, [columns]);

  return (
    <div id="kanban-moodboard-container" className="flex-1 flex flex-col h-full overflow-hidden space-y-4">
      {/* Top Controls Bar: Group By, View Menu (Screenshot 2), Raindrop Search (Screenshot 1), Sizing */}
      <div className="bg-white dark:bg-[#18181b] p-3.5 rounded-2xl border border-gray-200/90 dark:border-white/10 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Brand Accent Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-500/30 font-bold text-xs">
            <Kanban className="w-3.5 h-3.5 text-indigo-500" />
            <span>Kanban Moodboard</span>
          </div>

          {/* Group By selector */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl text-xs">
            <span className="text-[11px] font-semibold text-gray-400 px-1.5 hidden sm:inline">
              Group by:
            </span>
            <button
              type="button"
              onClick={() => handleSetGroupBy('status')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                groupBy === 'status'
                  ? 'bg-white dark:bg-[#202124] text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Workflow
            </button>
            <button
              type="button"
              onClick={() => handleSetGroupBy('collection')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                groupBy === 'collection'
                  ? 'bg-white dark:bg-[#202124] text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Folders
            </button>
            <button
              type="button"
              onClick={() => handleSetGroupBy('type')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                groupBy === 'type'
                  ? 'bg-white dark:bg-[#202124] text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Media
            </button>
            <button
              type="button"
              onClick={() => handleSetGroupBy('tag')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                groupBy === 'tag'
                  ? 'bg-white dark:bg-[#202124] text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Tags
            </button>
          </div>

          {/* Uncropped Image Indicator Pill */}
          <div className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Uncropped & Unstretched · Image sizes card</span>
          </div>
        </div>

        {/* Right Controls: Search, View Menu Popover, Column Width */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Raindrop Search Dropdown (matching Screenshot 1) */}
          <RaindropSearchDropdown
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            bookmarks={bookmarks}
            bookmarkNotes={bookmarkNotes}
            bookmarkTags={bookmarkTags}
            className="w-full sm:w-64"
          />

          {/* Raindrop View Menu Popover (matching Screenshot 2) */}
          <RaindropViewMenu
            layoutMode={layoutMode}
            onChangeLayoutMode={onChangeLayoutMode}
            moodboardConfig={moodboardConfig}
            onChangeMoodboardConfig={onChangeMoodboardConfig}
            onApplyToAll={onApplyToAll}
            kanbanGroupBy={groupBy}
            onChangeKanbanGroupBy={handleSetGroupBy}
            columnWidth={columnWidth}
            onChangeColumnWidth={setColumnWidth}
          />

          {/* Add Custom Column Button */}
          {groupBy === 'status' && (
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              title="Add a custom column to board"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Column</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Column Dialog if open */}
      {isAddingColumn && (
        <form
          onSubmit={handleAddCustomColumn}
          className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-1"
        >
          <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 whitespace-nowrap">
            New Column:
          </div>
          <input
            type="text"
            autoFocus
            value={newColumnName}
            onChange={e => setNewColumnName(e.target.value)}
            placeholder="e.g., Ideas, Project Backlog, Inspiration"
            className="flex-1 px-3 py-1.5 bg-white dark:bg-[#18181b] border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setIsAddingColumn(false)}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* 2. THE KANBAN MOODBOARD LANES */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-3">
        <div className="flex items-stretch gap-4 h-full min-w-max pr-6">
          {columns.map(col => {
            const itemsInCol = groupedItems[col.id] || [];
            const isDropTarget = dragOverColId === col.id;

            return (
              <div
                key={col.id}
                id={`kanban-col-${col.id}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverColId !== col.id) {
                    setDragOverColId(col.id);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverColId === col.id) {
                    setDragOverColId(null);
                  }
                }}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col h-full rounded-2xl border transition-all duration-200 bg-neutral-50/70 dark:bg-[#141416]/80 ${getColWidthClass()} ${
                  isDropTarget
                    ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20'
                    : 'border-gray-200/80 dark:border-white/5 shadow-xs'
                }`}
              >
                {/* Column Header */}
                <div className="p-3.5 pb-2.5 flex items-center justify-between border-b border-gray-200/70 dark:border-white/5 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: col.color }}
                    />
                    <h3 className="text-xs font-black text-gray-900 dark:text-white truncate">
                      {col.label}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-200/80 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                      {itemsInCol.length}
                    </span>
                  </div>
                </div>

                {/* Column Body: Vertical stack of variable-height Moodboard Cards where uncropped image dictates height */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3.5 min-h-0">
                  {itemsInCol.length > 0 ? (
                    itemsInCol.map(item => (
                      <MoodboardCard
                        key={item.id}
                        item={item}
                        notes={bookmarkNotes[item.url || '']}
                        tags={bookmarkTags[item.url || ''] || []}
                        snapshot={sessionSnapshots[item.url || '']}
                        config={moodboardConfig}
                        isSelected={activeItem?.id === item.id}
                        onSelect={onSelectItem}
                        onCopyLink={onCopyLink}
                        onOpenEdit={onOpenEditModal}
                        onSelectTag={onSelectTag}
                        onDeleteItem={onDeleteItem}
                        onMoveToColumn={handleMoveToColumn}
                        availableColumns={availableColOptions}
                        currentColumnId={col.id}
                        isDraggable={true}
                        copiedUrl={copiedUrl}
                      />
                    ))
                  ) : (
                    /* Empty State inside column */
                    <div className="h-44 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center p-4 text-center text-gray-400 space-y-1 select-none">
                      <Kanban className="w-5 h-5 opacity-40 mb-1" />
                      <span className="text-xs font-semibold">Empty lane</span>
                      <span className="text-[10px] text-gray-400">
                        Drag & drop a moodboard card here
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
