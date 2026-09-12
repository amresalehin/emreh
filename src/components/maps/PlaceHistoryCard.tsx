import React, { useState } from 'react';
import {
  MapPin,
  ExternalLink,
  Clock,
  Calendar,
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
  Copy,
  Check,
  BarChart2,
  Route
} from 'lucide-react';
import { TimelineItem } from '../../types';
import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsUrl,
  formatDuration,
  formatTime,
  getPlaceCategory,
  PlaceCategoryInfo
} from '../../utils/dataParser';

interface PlaceHistoryCardProps {
  item: TimelineItem;
  layoutMode?: 'feed' | 'grid' | 'compact' | 'detailed';
  isSelected?: boolean;
  onSelect?: (item: TimelineItem) => void;
  onOpenInspector?: (item: TimelineItem) => void;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
  showCategoryBadge?: boolean;
  showDwellDuration?: boolean;
  showAddress?: boolean;
  showCoordinates?: boolean;
  showActionButtons?: boolean;
  totalVisitCount?: number;
}

export const PlaceHistoryCard: React.FC<PlaceHistoryCardProps> = ({
  item,
  layoutMode = 'feed',
  isSelected = false,
  onSelect,
  onOpenInspector,
  onOpenMapModal,
  showCategoryBadge = true,
  showDwellDuration = true,
  showAddress = true,
  showCoordinates = true,
  showActionButtons = true,
  totalVisitCount
}) => {
  const [copied, setCopied] = useState(false);
  const categoryInfo: PlaceCategoryInfo = getPlaceCategory(item);
  const isRoute = !!item.isRoute;
  const gmapsUrl = buildGoogleMapsUrl(item);
  const gmapsEmbed = buildGoogleMapsEmbedUrl(item);

  const handleCopyCoord = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.lat != null && item.lng != null) {
      navigator.clipboard.writeText(`${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleOpenMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenMapModal) {
      onOpenMapModal(item.title, item.subtitle || item.address || '', gmapsEmbed, gmapsUrl);
    }
  };

  const handleInspectorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenInspector) {
      onOpenInspector(item);
    }
  };

  const dateObj = item.dateObj || new Date(item.ts);
  const timeStr = formatTime(dateObj);
  const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // 1. COMPACT ROW LAYOUT
  if (layoutMode === 'compact') {
    return (
      <div
        onClick={() => onSelect && onSelect(item)}
        className={`px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer border ${
          isSelected
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
            : 'bg-white dark:bg-[#181818] hover:bg-gray-50 dark:hover:bg-gray-800/80 border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${categoryInfo.bg} ${categoryInfo.color}`}>
            {categoryInfo.id === 'food' && <Utensils className="w-3.5 h-3.5" />}
            {categoryInfo.id === 'shopping' && <ShoppingBag className="w-3.5 h-3.5" />}
            {categoryInfo.id === 'outdoors' && <TreePine className="w-3.5 h-3.5" />}
            {categoryInfo.id === 'health' && <Heart className="w-3.5 h-3.5" />}
            {categoryInfo.id === 'transit' && <Navigation className="w-3.5 h-3.5" />}
            {categoryInfo.id === 'work' && <Briefcase className="w-3.5 h-3.5" />}
            {categoryInfo.id === 'home' && <Home className="w-3.5 h-3.5" />}
            {categoryInfo.id === 'culture' && <Sparkles className="w-3.5 h-3.5" />}
            {categoryInfo.id === 'lodging' && <Building className="w-3.5 h-3.5" />}
            {categoryInfo.id === 'education' && <BookOpen className="w-3.5 h-3.5" />}
            {categoryInfo.id === 'places' && <MapPin className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold truncate" title={item.title}>{item.title}</span>
              {showCategoryBadge && (
                <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${categoryInfo.bg} ${categoryInfo.color} shrink-0`}>
                  {categoryInfo.label}
                </span>
              )}
            </div>
            {item.address && (
              <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.address}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
          <span className="text-gray-400">{timeStr}</span>
          {item.ms_played ? (
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
              {formatDuration(item.ms_played)}
            </span>
          ) : null}
          <button
            onClick={handleInspectorClick}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 rounded-lg transition-colors cursor-pointer"
            title="Inspect Place History & Analytics"
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 2. GRID BENTO CARD LAYOUT
  if (layoutMode === 'grid') {
    return (
      <div
        onClick={() => onSelect && onSelect(item)}
        className={`p-3.5 rounded-2xl flex flex-col justify-between transition-all cursor-pointer border ${
          isSelected
            ? 'bg-blue-500/10 border-blue-500/40 shadow-sm'
            : 'bg-white dark:bg-[#181818] hover:bg-gray-50 dark:hover:bg-gray-800/80 border-gray-200 dark:border-gray-800'
        }`}
      >
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${categoryInfo.bg} ${categoryInfo.color}`}>
              {categoryInfo.id === 'food' && <Utensils className="w-4 h-4" />}
              {categoryInfo.id === 'shopping' && <ShoppingBag className="w-4 h-4" />}
              {categoryInfo.id === 'outdoors' && <TreePine className="w-4 h-4" />}
              {categoryInfo.id === 'health' && <Heart className="w-4 h-4" />}
              {categoryInfo.id === 'transit' && <Navigation className="w-4 h-4" />}
              {categoryInfo.id === 'work' && <Briefcase className="w-4 h-4" />}
              {categoryInfo.id === 'home' && <Home className="w-4 h-4" />}
              {categoryInfo.id === 'culture' && <Sparkles className="w-4 h-4" />}
              {categoryInfo.id === 'lodging' && <Building className="w-4 h-4" />}
              {categoryInfo.id === 'education' && <BookOpen className="w-4 h-4" />}
              {categoryInfo.id === 'places' && <MapPin className="w-4 h-4" />}
            </div>
            <div className="flex items-center gap-1">
              {showCategoryBadge && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${categoryInfo.bg} ${categoryInfo.color}`}>
                  {categoryInfo.label}
                </span>
              )}
              {totalVisitCount && totalVisitCount > 1 ? (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {totalVisitCount}x
                </span>
              ) : null}
            </div>
          </div>

          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate" title={item.title}>
            {item.title}
          </h4>
          {showAddress && item.address && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-relaxed">
              {item.address}
            </p>
          )}
        </div>

        <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400 font-mono">
          <span>{timeStr}</span>
          <div className="flex items-center gap-1.5">
            {showDwellDuration && item.ms_played ? (
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {formatDuration(item.ms_played)}
              </span>
            ) : null}
            <button
              onClick={handleInspectorClick}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 rounded-md transition-colors cursor-pointer"
              title="Inspect Place History"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. FEED / DETAILED CARD LAYOUT
  return (
    <div
      onClick={() => onSelect && onSelect(item)}
      className={`p-4 rounded-2xl transition-all cursor-pointer border ${
        isSelected
          ? 'bg-blue-500/10 border-blue-500/40 shadow-sm'
          : 'bg-white dark:bg-[#181818] hover:bg-gray-50 dark:hover:bg-gray-800/80 border-gray-200 dark:border-gray-800'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${categoryInfo.bg} ${categoryInfo.color}`}>
            {categoryInfo.id === 'food' && <Utensils className="w-5 h-5" />}
            {categoryInfo.id === 'shopping' && <ShoppingBag className="w-5 h-5" />}
            {categoryInfo.id === 'outdoors' && <TreePine className="w-5 h-5" />}
            {categoryInfo.id === 'health' && <Heart className="w-5 h-5" />}
            {categoryInfo.id === 'transit' && <Navigation className="w-5 h-5" />}
            {categoryInfo.id === 'work' && <Briefcase className="w-5 h-5" />}
            {categoryInfo.id === 'home' && <Home className="w-5 h-5" />}
            {categoryInfo.id === 'culture' && <Sparkles className="w-5 h-5" />}
            {categoryInfo.id === 'lodging' && <Building className="w-5 h-5" />}
            {categoryInfo.id === 'education' && <BookOpen className="w-5 h-5" />}
            {categoryInfo.id === 'places' && <MapPin className="w-5 h-5" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {showCategoryBadge && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${categoryInfo.bg} ${categoryInfo.color}`}>
                  {categoryInfo.label}
                </span>
              )}
              {totalVisitCount && totalVisitCount > 1 ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                  {totalVisitCount} Visits Recorded
                </span>
              ) : null}
            </div>

            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate mt-1" title={item.title}>
              {item.title}
            </h3>

            {showAddress && (item.address || item.subtitle) && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                {item.address || item.subtitle}
              </p>
            )}

            {/* Timestamps & Dwell Time */}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400 font-mono flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-500" />
                <span>{timeStr}</span>
              </span>
              {showDwellDuration && item.ms_played ? (
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                  {formatDuration(item.ms_played)}
                </span>
              ) : null}
              {showCoordinates && item.lat != null && item.lng != null && (
                <span className="text-gray-400 text-[10px]">
                  ({item.lat.toFixed(4)}, {item.lng.toFixed(4)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action button cluster */}
        {showActionButtons && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleInspectorClick}
              className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              title="Open Place History & Analytics Inspector"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
            <a
              href={gmapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              title="Open in Google Maps"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
