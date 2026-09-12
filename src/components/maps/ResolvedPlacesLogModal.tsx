import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  MapPin,
  Sparkles,
  ExternalLink,
  Download,
  Copy,
  Check,
  Tag,
  Building,
  Filter,
  CheckCircle2,
  ChevronRight,
  Database
} from 'lucide-react';
import { TimelineItem } from '../../types';
import { ResolvedPlaceInfo, isGenericPlaceName, buildGoogleMapsUrl } from '../../utils/dataParser';

interface ResolvedPlacesLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  timelineData: TimelineItem[];
  onSelectPlace?: (item: TimelineItem) => void;
  onExportClick?: () => void;
}

export const ResolvedPlacesLogModal: React.FC<ResolvedPlacesLogModalProps> = ({
  isOpen,
  onClose,
  timelineData,
  onSelectPlace,
  onExportClick
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'resolved' | 'unresolved'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Group unique places across timeline data
  const { placeList, stats, categories } = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        title: string;
        address?: string;
        lat: number;
        lng: number;
        category?: string;
        visitCount: number;
        isResolved: boolean;
        sampleItem: TimelineItem;
        lastVisited: Date;
      }
    >();

    const catSet = new Set<string>();
    let resolvedCount = 0;
    let unresolvedCount = 0;

    timelineData.forEach(item => {
      if (item.type !== 'maps') return;
      const lat = item.lat != null ? Number(item.lat) : item.origin?.lat != null ? Number(item.origin.lat) : null;
      const lng = item.lng != null ? Number(item.lng) : item.origin?.lng != null ? Number(item.origin.lng) : null;
      if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;

      const isGen = isGenericPlaceName(item.title);
      const isResolved = !isGen || !!item.isGeocoded;
      const cat = item.category || (item as any).semanticType || 'general';
      catSet.add(cat);

      const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      const placeKey = item.title && !isGen ? `name_${item.title.toLowerCase().trim()}` : `coord_${coordKey}`;

      if (!map.has(placeKey)) {
        map.set(placeKey, {
          key: placeKey,
          title: item.title || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          address: item.address,
          lat,
          lng,
          category: cat,
          visitCount: 1,
          isResolved,
          sampleItem: item,
          lastVisited: item.dateObj || new Date(item.ts)
        });
        if (isResolved) resolvedCount++;
        else unresolvedCount++;
      } else {
        const entry = map.get(placeKey)!;
        entry.visitCount++;
        if (item.address && !entry.address) entry.address = item.address;
        const d = item.dateObj || new Date(item.ts);
        if (d > entry.lastVisited) entry.lastVisited = d;
      }
    });

    const list = Array.from(map.values()).sort((a, b) => b.visitCount - a.visitCount);

    return {
      placeList: list,
      stats: {
        total: list.length,
        resolved: resolvedCount,
        unresolved: unresolvedCount
      },
      categories: Array.from(catSet).filter(Boolean)
    };
  }, [timelineData]);

  // Filter list by search query & categories
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return placeList.filter(place => {
      if (filterType === 'resolved' && !place.isResolved) return false;
      if (filterType === 'unresolved' && place.isResolved) return false;
      if (selectedCategory !== 'all' && place.category !== selectedCategory) return false;

      if (!q) return true;
      return (
        place.title.toLowerCase().includes(q) ||
        (place.address && place.address.toLowerCase().includes(q)) ||
        `${place.lat.toFixed(4)},${place.lng.toFixed(4)}`.includes(q)
      );
    });
  }, [placeList, searchQuery, selectedCategory, filterType]);

  const handleCopyCoord = (place: (typeof placeList)[0]) => {
    const text = `${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedKey(place.key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleExportJson = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      type: 'ResolvedPlacesLog',
      totalPlaces: filteredList.length,
      places: filteredList.map(p => ({
        title: p.title,
        address: p.address || '',
        latitude: p.lat,
        longitude: p.lng,
        category: p.category,
        visitCount: p.visitCount,
        isResolved: p.isResolved,
        lastVisited: p.lastVisited.toISOString()
      }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resolved_places_log_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#181818] border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <span>Resolved Places & Geocode Log</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  {stats.resolved} Resolved
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Log of extracted and reverse geocoded venues, coordinates, and custom-labeled places
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Download Log as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Log</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#181818]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by venue name, address, or coordinates..."
              className="w-full pl-9 pr-4 py-1.5 bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              All ({placeList.length})
            </button>
            <button
              onClick={() => setFilterType('resolved')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              Resolved ({stats.resolved})
            </button>
            {stats.unresolved > 0 && (
              <button
                onClick={() => setFilterType('unresolved')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'unresolved'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                }`}
              >
                Unresolved ({stats.unresolved})
              </button>
            )}
          </div>
        </div>

        {/* Content Table / Card List */}
        <div className="flex-1 overflow-y-auto p-6 divide-y divide-gray-100 dark:divide-gray-800/60">
          {filteredList.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">No places match your search or filter</p>
            </div>
          ) : (
            filteredList.map(place => {
              const isCopied = copiedKey === place.key;
              const gmapsUrl = buildGoogleMapsUrl(place.sampleItem);

              return (
                <div
                  key={place.key}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 px-2 rounded-2xl transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        place.isResolved
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {place.isResolved ? <MapPin className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {place.title}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            place.isResolved
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {place.isResolved ? 'Resolved' : 'Raw Coord'}
                        </span>
                        {place.category && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                            {place.category}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-gray-400">
                          {place.visitCount} {place.visitCount === 1 ? 'visit' : 'visits'}
                        </span>
                      </div>

                      {place.address && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {place.address}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400 font-mono">
                        <span>
                          {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
                        </span>
                        <span>•</span>
                        <span>Last visited: {place.lastVisited.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopyCoord(place)}
                      className="p-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                      title="Copy Coordinates"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                      title="Open in Google Maps"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {onSelectPlace && (
                      <button
                        onClick={() => {
                          onSelectPlace(place.sampleItem);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 bg-[#1A73E8] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing {filteredList.length} of {placeList.length} total places
          </span>
          {onExportClick && (
            <button
              onClick={() => {
                onClose();
                onExportClick();
              }}
              className="text-[#1A73E8] font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Full Map Dataset Export (GeoJSON, KML, CSV)</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
