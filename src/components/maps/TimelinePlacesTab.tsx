import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Sparkles,
  Utensils,
  Building,
  TreePine,
  Heart,
  Briefcase,
  Home,
  Navigation,
  BookOpen,
  MapPin,
  ChevronRight,
  ArrowLeft,
  Search,
  SlidersHorizontal,
  Clock,
  ExternalLink,
  BarChart2,
  Calendar,
  Tag,
  Loader2,
  HelpCircle
} from 'lucide-react';
import { TimelineItem } from '../../types';
import {
  getPlaceCategory,
  PlaceCategoryInfo,
  formatDuration,
  formatTime,
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsUrl,
  isGenericPlaceName
} from '../../utils/dataParser';

interface TimelinePlacesTabProps {
  items: TimelineItem[];
  onSelectPlace: (item: TimelineItem) => void;
  onOpenInspector: (item: TimelineItem) => void;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
  onRenamePlace?: (
    targetItem: TimelineItem,
    newName: string,
    applyToAllMatching: boolean,
    newCategory?: string,
    newAddress?: string
  ) => void;
  onResolveGeo?: (lat: number, lng: number) => Promise<void> | void;
  onBatchResolveUnknown?: () => Promise<void> | void;
  onOpenRenameModal?: (item: TimelineItem) => void;
}

// Preset visual categories styled matching Google Maps Timeline (Screenshot 1)
export const CATEGORY_CONFIGS: {
  id: string;
  label: string;
  icon: any;
  color: string;
  bgGradient: string;
  badgeBg: string;
  badgeColor: string;
  accentColor: string;
}[] = [
  {
    id: 'shopping',
    label: 'Shopping',
    icon: ShoppingBag,
    color: 'text-sky-500',
    bgGradient: 'from-sky-500/20 via-sky-500/5 to-transparent dark:from-sky-950/40 dark:via-sky-900/10',
    badgeBg: 'bg-[#0288D1]',
    badgeColor: 'text-white',
    accentColor: '#0288D1'
  },
  {
    id: 'culture',
    label: 'Attractions',
    icon: Sparkles,
    color: 'text-teal-500',
    bgGradient: 'from-teal-500/20 via-teal-500/5 to-transparent dark:from-teal-950/40 dark:via-teal-900/10',
    badgeBg: 'bg-[#0097A7]',
    badgeColor: 'text-white',
    accentColor: '#0097A7'
  },
  {
    id: 'food',
    label: 'Food & Drink',
    icon: Utensils,
    color: 'text-amber-500',
    bgGradient: 'from-amber-500/20 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-amber-900/10',
    badgeBg: 'bg-[#EA8600]',
    badgeColor: 'text-white',
    accentColor: '#EA8600'
  },
  {
    id: 'lodging',
    label: 'Lodging',
    icon: Building,
    color: 'text-amber-800',
    bgGradient: 'from-amber-800/20 via-amber-800/5 to-transparent dark:from-amber-950/40 dark:via-amber-900/10',
    badgeBg: 'bg-[#795548]',
    badgeColor: 'text-white',
    accentColor: '#795548'
  },
  {
    id: 'outdoors',
    label: 'Parks & Nature',
    icon: TreePine,
    color: 'text-emerald-500',
    bgGradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:via-emerald-900/10',
    badgeBg: 'bg-[#2E7D32]',
    badgeColor: 'text-white',
    accentColor: '#2E7D32'
  },
  {
    id: 'health',
    label: 'Health & Fitness',
    icon: Heart,
    color: 'text-rose-500',
    bgGradient: 'from-rose-500/20 via-rose-500/5 to-transparent dark:from-rose-950/40 dark:via-rose-900/10',
    badgeBg: 'bg-[#D81B60]',
    badgeColor: 'text-white',
    accentColor: '#D81B60'
  },
  {
    id: 'work',
    label: 'Work & Office',
    icon: Briefcase,
    color: 'text-indigo-500',
    bgGradient: 'from-indigo-500/20 via-indigo-500/5 to-transparent dark:from-indigo-950/40 dark:via-indigo-900/10',
    badgeBg: 'bg-[#5C6BC0]',
    badgeColor: 'text-white',
    accentColor: '#5C6BC0'
  },
  {
    id: 'home',
    label: 'Home & Living',
    icon: Home,
    color: 'text-blue-500',
    bgGradient: 'from-blue-500/20 via-blue-500/5 to-transparent dark:from-blue-950/40 dark:via-blue-900/10',
    badgeBg: 'bg-[#1A73E8]',
    badgeColor: 'text-white',
    accentColor: '#1A73E8'
  },
  {
    id: 'transit',
    label: 'Travel & Transport',
    icon: Navigation,
    color: 'text-cyan-500',
    bgGradient: 'from-cyan-500/20 via-cyan-500/5 to-transparent dark:from-cyan-950/40 dark:via-cyan-900/10',
    badgeBg: 'bg-[#00ACC1]',
    badgeColor: 'text-white',
    accentColor: '#00ACC1'
  },
  {
    id: 'education',
    label: 'Education',
    icon: BookOpen,
    color: 'text-teal-600',
    bgGradient: 'from-teal-600/20 via-teal-600/5 to-transparent dark:from-teal-950/40 dark:via-teal-900/10',
    badgeBg: 'bg-[#00897B]',
    badgeColor: 'text-white',
    accentColor: '#00897B'
  }
];

interface PlaceAggregate {
  sampleItem: TimelineItem;
  visits: number;
  totalDwell: number;
  lastVisited: Date;
  category: PlaceCategoryInfo;
  allItems: TimelineItem[];
}

export const TimelinePlacesTab: React.FC<TimelinePlacesTabProps> = ({
  items,
  onSelectPlace,
  onOpenInspector,
  onOpenMapModal,
  selectedCategory: selectedCategoryProp,
  onSelectCategory,
  onRenamePlace,
  onResolveGeo,
  onBatchResolveUnknown,
  onOpenRenameModal
}) => {
  const [internalCategory, setInternalCategory] = useState<string | null>(null);
  const selectedCategory = selectedCategoryProp !== undefined ? selectedCategoryProp : internalCategory;

  const handleSelectCategory = (cat: string | null) => {
    setInternalCategory(cat);
    if (onSelectCategory) onSelectCategory(cat);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'most_visited' | 'recently_visited' | 'name_asc'>('most_visited');
  const [isBatchResolving, setIsBatchResolving] = useState(false);
  const [resolvingPlaceKey, setResolvingPlaceKey] = useState<string | null>(null);

  // Aggregate places across history
  const { placeMap, categoryCounts, totalUniquePlaces, unresolvedCount } = useMemo(() => {
    const map = new Map<string, PlaceAggregate>();
    const catCounts: Record<string, number> = {};
    let unres = 0;

    items.forEach(item => {
      if (item.type !== 'maps' || item.isRoute || item.activityType) return;
      const key = item.title || item.address || `loc_${item.lat}_${item.lng}`;
      const cat = getPlaceCategory(item);
      const date = item.dateObj || new Date(item.ts);
      const dwell = item.ms_played || 0;

      if (!map.has(key)) {
        map.set(key, {
          sampleItem: item,
          visits: 0,
          totalDwell: 0,
          lastVisited: date,
          category: cat,
          allItems: []
        });
        catCounts[cat.id] = (catCounts[cat.id] || 0) + 1;
        if (isGenericPlaceName(item.title)) {
          unres++;
        }
      }

      const entry = map.get(key)!;
      entry.visits++;
      entry.totalDwell += dwell;
      entry.allItems.push(item);
      if (date > entry.lastVisited) {
        entry.lastVisited = date;
      }
    });

    return {
      placeMap: map,
      categoryCounts: catCounts,
      totalUniquePlaces: map.size,
      unresolvedCount: unres
    };
  }, [items]);

  const handleTriggerBatchResolve = async () => {
    setIsBatchResolving(true);
    try {
      if (onBatchResolveUnknown) {
        await onBatchResolveUnknown();
      }
    } finally {
      setIsBatchResolving(false);
    }
  };

  const handleSingleResolve = async (e: React.MouseEvent, item: TimelineItem) => {
    e.stopPropagation();
    if (item.lat == null || item.lng == null) return;
    const key = item.title || item.address || `loc_${item.lat}_${item.lng}`;
    setResolvingPlaceKey(key);
    try {
      if (onResolveGeo) {
        await onResolveGeo(Number(item.lat), Number(item.lng));
      }
    } finally {
      setResolvingPlaceKey(null);
    }
  };

  const handleSingleRename = (e: React.MouseEvent, item: TimelineItem) => {
    e.stopPropagation();
    if (onOpenRenameModal) {
      onOpenRenameModal(item);
    } else {
      onOpenInspector(item);
    }
  };

  const q = searchQuery.trim().toLowerCase();

  // Filtered places inside selected category or global search
  const categoryPlaces = useMemo(() => {
    let list: PlaceAggregate[] = Array.from(placeMap.values());

    if (selectedCategory) {
      list = list.filter(p => p.category.id === selectedCategory);
    }

    if (q) {
      list = list.filter(
        p =>
          p.sampleItem.title?.toLowerCase().includes(q) ||
          p.sampleItem.address?.toLowerCase().includes(q) ||
          p.sampleItem.subtitle?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'most_visited') {
        return b.visits - a.visits || b.totalDwell - a.totalDwell;
      }
      if (sortBy === 'recently_visited') {
        return b.lastVisited.getTime() - a.lastVisited.getTime();
      }
      return (a.sampleItem.title || '').localeCompare(b.sampleItem.title || '');
    });

    return list;
  }, [placeMap, selectedCategory, q, sortBy]);

  const activeCategoryConfig = CATEGORY_CONFIGS.find(c => c.id === selectedCategory);

  // 1. CATEGORY DRILLDOWN VIEW
  if (selectedCategory && activeCategoryConfig) {
    const IconComponent = activeCategoryConfig.icon;

    return (
      <div className="space-y-4 pb-12 animate-in fade-in duration-150">
        {/* Drilldown Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => handleSelectCategory(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-[#1A73E8] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Categories</span>
          </button>
          <div className="text-xs font-bold text-gray-500">
            {categoryPlaces.length} {categoryPlaces.length === 1 ? 'place' : 'places'}
          </div>
        </div>

        {/* Category Header Banner */}
        <div
          className={`p-4 rounded-2xl bg-gradient-to-r ${activeCategoryConfig.bgGradient} border border-gray-200/80 dark:border-gray-800 flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full ${activeCategoryConfig.badgeBg} ${activeCategoryConfig.badgeColor} flex items-center justify-center shadow-md`}
            >
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                {activeCategoryConfig.label}
              </h3>
              <p className="text-xs text-gray-500">
                {categoryPlaces.length} saved & visited locations
              </p>
            </div>
          </div>
        </div>

        {/* Filter / Sort Control */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search in ${activeCategoryConfig.label}...`}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 outline-none"
          >
            <option value="most_visited">Most Visited</option>
            <option value="recently_visited">Recently Visited</option>
            <option value="name_asc">Name (A-Z)</option>
          </select>
        </div>

        {/* Places List */}
        <div className="space-y-2.5">
          {categoryPlaces.map((place, idx) => {
            const item = place.sampleItem;
            return (
              <div
                key={idx}
                onClick={() => onSelectPlace(item)}
                className="p-3.5 bg-white/60 dark:bg-black/35 backdrop-blur-md rounded-2xl border border-black/8 dark:border-white/10 shadow-xs hover:shadow-md hover:border-black/15 dark:hover:border-white/15 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-1.5 py-0.5 rounded-full shrink-0">
                        {place.visits} {place.visits === 1 ? 'visit' : 'visits'}
                      </span>
                    </div>

                    {item.address && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                        {item.address}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1.5 font-medium">
                      <span>Last: {place.lastVisited.toLocaleDateString()}</span>
                      {place.totalDwell > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatDuration(place.totalDwell)} total
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {/* If generic/unresolved coordinate */}
                    {isGenericPlaceName(item.title) && item.lat != null && item.lng != null && (
                      <button
                        onClick={e => handleSingleResolve(e, item)}
                        disabled={resolvingPlaceKey === (item.title || item.address || `loc_${item.lat}_${item.lng}`)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Auto resolve place name from coordinates"
                      >
                        {resolvingPlaceKey === (item.title || item.address || `loc_${item.lat}_${item.lng}`) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        <span>Auto-Resolve</span>
                      </button>
                    )}

                    {/* Rename / Label Trigger */}
                    <button
                      onClick={e => handleSingleRename(e, item)}
                      className="px-2 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#1A73E8] dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                      title="Rename or assign custom label"
                    >
                      <Tag className="w-3 h-3" />
                      <span>Label</span>
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onOpenInspector(item);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Inspect Place History"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (onOpenMapModal) {
                          onOpenMapModal(
                            item.title,
                            item.subtitle || item.address || '',
                            buildGoogleMapsEmbedUrl(item),
                            buildGoogleMapsUrl(item)
                          );
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Open Google Maps"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. ROOT CATEGORY CARDS GRID (Screenshot 1 Google Maps Timeline Places Tab)
  return (
    <div className="space-y-4 pb-12">
      {/* Places Header (Screenshot 1) */}
      <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
            {totalUniquePlaces.toLocaleString()} places
          </h2>
          <p className="text-xs text-gray-400">Categorized location visits</p>
        </div>

        {/* Global Batch Auto-Resolve Button */}
        {unresolvedCount > 0 && (
          <button
            onClick={handleTriggerBatchResolve}
            disabled={isBatchResolving}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isBatchResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isBatchResolving ? 'Resolving Places...' : `Auto-Resolve (${unresolvedCount})`}</span>
          </button>
        )}
      </div>

      {/* Unresolved Places Banner if any exist */}
      {unresolvedCount > 0 && (
        <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                {unresolvedCount} Unnamed Coordinates Found
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Automatically resolve venue names via reverse geocoding or assign custom labels.
              </span>
            </div>
          </div>
          <button
            onClick={handleTriggerBatchResolve}
            disabled={isBatchResolving}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1"
          >
            {isBatchResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Resolve All</span>
          </button>
        </div>
      )}

      {/* Category Grid (Matches Screenshot 1 layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {CATEGORY_CONFIGS.map(cat => {
          const count = categoryCounts[cat.id] || 0;
          const IconComponent = cat.icon;

          return (
            <div
              key={cat.id}
              onClick={() => handleSelectCategory(cat.id)}
              className="group relative overflow-hidden bg-white/60 dark:bg-black/35 backdrop-blur-md rounded-2xl border border-black/8 dark:border-white/10 shadow-xs hover:shadow-md hover:border-black/15 dark:hover:border-white/15 transition-all cursor-pointer p-4 flex flex-col justify-between min-h-[110px]"
            >
              {/* Background gradient styling */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${cat.bgGradient} opacity-60 group-hover:opacity-100 transition-opacity`}
              />

              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#1A73E8] transition-colors">
                    {cat.label}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {count} {count === 1 ? 'place' : 'places'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Bottom Icon Badge overlapping bottom left */}
              <div className="relative z-10 mt-3 flex items-center justify-between">
                <div
                  className={`w-9 h-9 rounded-full ${cat.badgeBg} ${cat.badgeColor} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-gray-400 group-hover:text-[#1A73E8] transition-colors">
                  Explore →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
