import React, { useState } from 'react';
import {
  MapPin,
  ExternalLink,
  Clock,
  Car,
  Footprints,
  Bike,
  Navigation,
  Sparkles,
  Utensils,
  ShoppingBag,
  TreePine,
  Briefcase,
  Home,
  Heart,
  Building,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Route,
  BarChart2,
  Copy,
  Check,
  Plane,
  Train,
  CheckCircle2,
  MoreVertical,
  Plus,
  Tag,
  Loader2
} from 'lucide-react';
import { TimelineItem } from '../../types';
import {
  formatDuration,
  formatTime,
  getPlaceCategory,
  PlaceCategoryInfo,
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsUrl,
  isGenericPlaceName
} from '../../utils/dataParser';

interface TimelineDayViewProps {
  currentDate: Date;
  items: TimelineItem[];
  selectedItemId?: string | null;
  onSelectItem: (item: TimelineItem) => void;
  onOpenInspector: (item: TimelineItem) => void;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
  placeVisitCounts?: Map<string, number>;
  onImportClick?: () => void;
  onRenamePlace?: (
    targetItem: TimelineItem,
    newName: string,
    applyToAllMatching: boolean,
    newCategory?: string,
    newAddress?: string
  ) => void;
  onResolveGeo?: (lat: number, lng: number) => Promise<void> | void;
  onOpenRenameModal?: (item: TimelineItem) => void;
}

// Category icon renderer matching Google Maps Timeline aesthetics
const renderCategoryIcon = (category: PlaceCategoryInfo, className = 'w-4 h-4') => {
  switch (category.id) {
    case 'food':
      return <Utensils className={className} />;
    case 'shopping':
      return <ShoppingBag className={className} />;
    case 'outdoors':
      return <TreePine className={className} />;
    case 'health':
      return <Heart className={className} />;
    case 'work':
      return <Briefcase className={className} />;
    case 'home':
      return <Home className={className} />;
    case 'culture':
      return <Sparkles className={className} />;
    case 'lodging':
      return <Building className={className} />;
    case 'education':
      return <BookOpen className={className} />;
    case 'transit':
      return <Navigation className={className} />;
    default:
      return <MapPin className={className} />;
  }
};

// Mode icon renderer for movement segments
const renderMovementIcon = (item: TimelineItem, className = 'w-4 h-4') => {
  const mode = (item.activityType || item.travelMode || item.title || '').toLowerCase();
  if (mode.includes('walk') || mode.includes('run') || mode.includes('foot')) {
    return <Footprints className={className} />;
  }
  if (mode.includes('bike') || mode.includes('cycl')) {
    return <Bike className={className} />;
  }
  if (mode.includes('transit') || mode.includes('subway') || mode.includes('train') || mode.includes('metro') || mode.includes('bus')) {
    return <Train className={className} />;
  }
  if (mode.includes('flight') || mode.includes('fly') || mode.includes('plane')) {
    return <Plane className={className} />;
  }
  if (mode.includes('driv') || mode.includes('car') || mode.includes('vehic')) {
    return <Car className={className} />;
  }
  return <Navigation className={className} />;
};

export const TimelineDayView: React.FC<TimelineDayViewProps> = ({
  currentDate,
  items,
  selectedItemId,
  onSelectItem,
  onOpenInspector,
  onOpenMapModal,
  placeVisitCounts = new Map(),
  onImportClick,
  onRenamePlace,
  onResolveGeo,
  onOpenRenameModal
}) => {
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleAutoResolveClick = async (e: React.MouseEvent, item: TimelineItem) => {
    e.stopPropagation();
    if (item.lat == null || item.lng == null) return;
    setResolvingId(item.id);
    try {
      if (onResolveGeo) {
        await onResolveGeo(Number(item.lat), Number(item.lng));
      }
    } finally {
      setResolvingId(null);
    }
  };

  const handleRenameClick = (e: React.MouseEvent, item: TimelineItem) => {
    e.stopPropagation();
    if (onOpenRenameModal) {
      onOpenRenameModal(item);
    } else {
      onOpenInspector(item);
    }
  };

  const handleCopyCoord = (e: React.MouseEvent, item: TimelineItem) => {
    e.stopPropagation();
    if (item.lat != null && item.lng != null) {
      navigator.clipboard.writeText(`${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}`);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handleOpenMap = (e: React.MouseEvent, item: TimelineItem) => {
    e.stopPropagation();
    if (onOpenMapModal) {
      const gmapsEmbed = buildGoogleMapsEmbedUrl(item);
      const gmapsUrl = buildGoogleMapsUrl(item);
      onOpenMapModal(item.title, item.subtitle || item.address || '', gmapsEmbed, gmapsUrl);
    }
  };

  // Calculate day summary metrics
  const placeItems = items.filter(i => !i.isRoute && !i.activityType);
  const tripItems = items.filter(i => i.isRoute || i.activityType || i.travelMode);
  let totalDistanceKm = 0;
  let totalMovingMs = 0;
  let totalDwellMs = 0;

  tripItems.forEach(i => {
    if (i.distanceKm) totalDistanceKm += parseFloat(i.distanceKm);
    else if (i.distance) totalDistanceKm += i.distance / 1000;
    if (i.ms_played) totalMovingMs += i.ms_played;
  });

  placeItems.forEach(i => {
    if (i.ms_played) totalDwellMs += i.ms_played;
  });

  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#1A73E8] flex items-center justify-center mb-4 shadow-xs">
          <MapPin className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          No Timeline Activity on {formattedDate}
        </h3>
        <p className="text-xs text-gray-500 max-w-sm mt-1.5 leading-relaxed">
          Google Maps Timeline records your visited places and travel routes. Import your Google Takeout Location History JSON to visualize your day.
        </p>
        {onImportClick && (
          <button
            onClick={onImportClick}
            className="mt-4 px-4 py-2 bg-[#1A73E8] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Import Google Location History</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Day Overview Header Card */}
      <div className="mb-4 bg-white/60 dark:bg-black/35 backdrop-blur-md p-3.5 rounded-2xl border border-black/8 dark:border-white/10 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-950 dark:text-white">
            {formattedDate}
          </span>
          <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-blue-200/80 dark:border-blue-800/80 shadow-2xs">
            {placeItems.length} {placeItems.length === 1 ? 'place' : 'places'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-700 dark:text-gray-300 mt-2 font-medium">
          {totalDistanceKm > 0 && (
            <div className="flex items-center gap-1">
              <Route className="w-3.5 h-3.5 text-[#1A73E8]" />
              <span>{totalDistanceKm.toFixed(1)} km</span>
            </div>
          )}
          {totalMovingMs > 0 && (
            <div className="flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-indigo-500" />
              <span>{formatDuration(totalMovingMs)} moving</span>
            </div>
          )}
          {totalDwellMs > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>{formatDuration(totalDwellMs)} stayed</span>
            </div>
          )}
        </div>
      </div>

      {/* The Google Maps Activity Feed - Each item is an individual standalone card */}
      <div className="space-y-3">
        {items.map((item, index) => {
          const isSelected = selectedItemId === item.id;
          const isRoute = !!item.isRoute || !!item.activityType || !!item.travelMode;
          const dateObj = item.dateObj || new Date(item.ts);
          const startTimeStr = formatTime(dateObj);
          const endTimeStr = item.endTs ? formatTime(new Date(item.endTs)) : null;
          const timeRange = endTimeStr && endTimeStr !== startTimeStr ? `${startTimeStr} – ${endTimeStr}` : startTimeStr;
          const category = getPlaceCategory(item);
          const visitCount = placeVisitCounts.get(item.title) || 1;

          // Route / Movement Segment Card
          if (isRoute) {
            const distKm = item.distanceKm ? parseFloat(item.distanceKm) : (item.distance ? item.distance / 1000 : 0);
            const isExpanded = expandedRouteId === item.id;
            const hasGpsPoints = item.pathPoints && item.pathPoints.length > 0;

            return (
              <div
                key={item.id || index}
                onClick={() => onSelectItem(item)}
                className={`group relative p-3.5 rounded-2xl bg-white/60 dark:bg-black/35 backdrop-blur-md border transition-all cursor-pointer shadow-xs ${
                  isSelected
                    ? 'border-blue-500/70 ring-2 ring-blue-500/25 dark:border-blue-400 shadow-md'
                    : 'border-black/8 dark:border-white/10 hover:border-black/15 dark:hover:border-white/15 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Movement Node Circle */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-black/5 dark:border-white/10 transition-transform ${
                      isSelected
                        ? 'bg-[#1A73E8] text-white scale-105'
                        : 'bg-blue-50 dark:bg-blue-950/50 text-[#1A73E8] group-hover:scale-105'
                    }`}
                  >
                    {renderMovementIcon(item, 'w-4 h-4')}
                  </div>

                  {/* Movement Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200 truncate">
                        <span>{item.title || 'Movement'}</span>
                        <span className="text-gray-400 font-normal">•</span>
                        <span className="text-gray-500 font-semibold">{timeRange}</span>
                      </div>
                      <div className="text-[11px] font-bold text-[#1A73E8] bg-blue-100/70 dark:bg-blue-900/40 px-2 py-0.5 rounded-full shrink-0">
                        {distKm > 0 ? `${distKm.toFixed(1)} km` : ''}
                        {item.ms_played ? ` • ${formatDuration(item.ms_played)}` : ''}
                      </div>
                    </div>

                    {item.subtitle && item.subtitle !== item.title && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {item.subtitle}
                      </p>
                    )}

                    {/* Expandable Raw GPS Track Points */}
                    {hasGpsPoints && (
                      <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setExpandedRouteId(isExpanded ? null : item.id);
                          }}
                          className="text-[10px] font-bold text-[#1A73E8] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          <span>{item.pathPoints?.length} GPS route points recorded</span>
                        </button>

                        {isExpanded && (
                          <div className="mt-2 p-2.5 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-xl border border-gray-200/80 dark:border-white/10 text-[10px] space-y-1 max-h-36 overflow-y-auto">
                            <div className="font-bold text-gray-400 uppercase tracking-wider mb-1">
                              Raw Waypoint Coordinates
                            </div>
                            {item.pathPoints?.slice(0, 20).map((pt, ptIdx) => (
                              <div key={ptIdx} className="flex items-center justify-between font-mono text-gray-600 dark:text-gray-400">
                                <span>#{ptIdx + 1}</span>
                                <span>{pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}</span>
                              </div>
                            ))}
                            {(item.pathPoints?.length || 0) > 20 && (
                              <div className="text-gray-400 italic pt-1">
                                + {(item.pathPoints?.length || 0) - 20} more GPS points along track
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // Place Stop Individual Card (YouTube Style)
          return (
            <div
              key={item.id || index}
              onClick={() => onSelectItem(item)}
              className={`group relative p-3.5 rounded-2xl bg-white/60 dark:bg-black/35 backdrop-blur-md border transition-all cursor-pointer shadow-xs ${
                isSelected
                  ? 'border-blue-500/70 ring-2 ring-blue-500/25 dark:border-blue-400 shadow-md'
                  : 'border-black/8 dark:border-white/10 hover:border-black/15 dark:hover:border-white/15 hover:shadow-md'
              }`}
            >
              {/* Top: Category Icon, Place Title & Time */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs transition-transform ${
                    category.id === 'food'
                      ? 'bg-[#EA8600]'
                      : category.id === 'shopping'
                      ? 'bg-[#0288D1]'
                      : category.id === 'lodging'
                      ? 'bg-[#795548]'
                      : category.id === 'outdoors'
                      ? 'bg-[#2E7D32]'
                      : category.id === 'culture'
                      ? 'bg-[#0097A7]'
                      : category.id === 'home'
                      ? 'bg-[#1A73E8]'
                      : category.id === 'work'
                      ? 'bg-[#5C6BC0]'
                      : category.id === 'health'
                      ? 'bg-[#D81B60]'
                      : 'bg-[#EA4335]'
                  } ${isSelected ? 'scale-105 ring-2 ring-blue-400' : 'group-hover:scale-105'}`}
                  title={category.label}
                >
                  {renderCategoryIcon(category, 'w-4 h-4')}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {item.title}
                        </h4>
                        {visitCount > 1 && (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-1.5 py-0.5 rounded-full shrink-0">
                            {visitCount} visits
                          </span>
                        )}
                      </div>

                      {/* Time & Dwell */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                        <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>{timeRange}</span>
                        {item.ms_played ? (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              {formatDuration(item.ms_played)}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Inspect Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onOpenInspector(item);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition-colors cursor-pointer shrink-0"
                      title="Inspect place history & analytics"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Address */}
                  {(item.address || (item.subtitle && item.subtitle !== item.title)) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.address || item.subtitle}
                    </p>
                  )}

                  {/* Bottom Action Pills */}
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 text-[11px] font-bold flex-wrap">
                    {/* Auto Resolve Pill for Unresolved / Generic Places */}
                    {isGenericPlaceName(item.title) && item.lat != null && item.lng != null && (
                      <button
                        onClick={e => handleAutoResolveClick(e, item)}
                        disabled={resolvingId === item.id}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Auto-lookup venue name and address"
                      >
                        {resolvingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        <span>{resolvingId === item.id ? 'Resolving...' : 'Auto-Resolve'}</span>
                      </button>
                    )}

                    {/* Rename / Label Pill */}
                    <button
                      onClick={e => handleRenameClick(e, item)}
                      className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#1A73E8] dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                      title="Rename or assign custom label"
                    >
                      <Tag className="w-3 h-3" />
                      <span>Label</span>
                    </button>

                    {/* View on Map Modal */}
                    <button
                      onClick={e => handleOpenMap(e, item)}
                      className="px-2.5 py-1 bg-black/5 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-gray-700 dark:text-gray-300 hover:text-[#1A73E8] rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Google Maps</span>
                    </button>

                    {/* Copy Coordinates */}
                    {item.lat != null && item.lng != null && (
                      <button
                        onClick={e => handleCopyCoord(e, item)}
                        className="px-2 py-1 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                        title="Copy GPS coordinates"
                      >
                        {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span className="font-mono text-[10px]">
                          {item.lat.toFixed(3)}, {item.lng.toFixed(3)}
                        </span>
                      </button>
                    )}

                    {/* Highlight on Map Trigger */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectItem(item);
                      }}
                      className="ml-auto px-2.5 py-1 text-[#1A73E8] hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-bold"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>Focus</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
