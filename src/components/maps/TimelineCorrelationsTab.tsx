import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Headphones,
  Video,
  Globe,
  Camera,
  Search,
  ExternalLink,
  Sparkles,
  Navigation,
  Music,
  Compass,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { TimelineItem } from '../../types';
import {
  getPlaceCorrelationSummary,
  PlaceCorrelationSummary
} from '../../utils/geoCorrelation';
import { buildGoogleMapsEmbedUrl, buildGoogleMapsUrl, formatTime } from '../../utils/dataParser';

interface TimelineCorrelationsTabProps {
  timelineData: TimelineItem[];
  onSelectPlace?: (item: TimelineItem) => void;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
  onResolveGeo?: (lat: number, lng: number) => void;
}

export const TimelineCorrelationsTab: React.FC<TimelineCorrelationsTabProps> = ({
  timelineData,
  onSelectPlace,
  onOpenMapModal,
  onResolveGeo
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState<'all' | 'spotify' | 'youtube' | 'browser' | 'photo'>('all');
  const [expandedPlaceKeys, setExpandedPlaceKeys] = useState<Record<string, boolean>>({});

  // Compute correlation summary across all timeline items
  const placeSummaries: PlaceCorrelationSummary[] = useMemo(() => {
    return getPlaceCorrelationSummary(timelineData);
  }, [timelineData]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalSpotify = 0;
    let totalYouTube = 0;
    let totalBrowser = 0;
    let totalPhoto = 0;

    placeSummaries.forEach(p => {
      totalSpotify += p.itemCounts.spotify;
      totalYouTube += p.itemCounts.youtube;
      totalBrowser += p.itemCounts.browser;
      totalPhoto += p.itemCounts.photo;
    });

    return {
      placesCount: placeSummaries.length,
      totalSpotify,
      totalYouTube,
      totalBrowser,
      totalPhoto,
      totalCorrelated: totalSpotify + totalYouTube + totalBrowser + totalPhoto
    };
  }, [placeSummaries]);

  // Filtered list
  const filteredSummaries = useMemo(() => {
    return placeSummaries.filter(p => {
      // Media type filter
      if (selectedMediaType === 'spotify' && p.itemCounts.spotify === 0) return false;
      if (selectedMediaType === 'youtube' && p.itemCounts.youtube === 0) return false;
      if (selectedMediaType === 'browser' && p.itemCounts.browser === 0) return false;
      if (selectedMediaType === 'photo' && p.itemCounts.photo === 0) return false;

      // Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchPlace = p.placeName.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
        const matchItems = p.items.some(i => (i.title || '').toLowerCase().includes(q) || (i.subtitle || '').toLowerCase().includes(q));
        return matchPlace || matchItems;
      }

      return true;
    });
  }, [placeSummaries, selectedMediaType, searchQuery]);

  const toggleExpand = (placeKey: string) => {
    setExpandedPlaceKeys(prev => ({
      ...prev,
      [placeKey]: !prev[placeKey]
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-blue-500/15 border border-amber-500/20 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-gray-950 dark:text-white">
            Where Life Happened (Media & Place Correlations)
          </h3>
        </div>
        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          Emreh correlates your music, videos, web visits, and photos with your Google Maps Timeline, reconstructing what you experienced at each physical location.
        </p>

        {/* Aggregate Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs font-semibold">
          <div className="p-2 rounded-xl bg-white/70 dark:bg-white/5 border border-black/8 dark:border-white/10 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <div className="text-sm font-extrabold text-gray-950 dark:text-white">{stats.placesCount}</div>
              <div className="text-[10px] text-gray-600 dark:text-gray-400 font-normal">Places Visited</div>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-white/70 dark:bg-white/5 border border-black/8 dark:border-white/10 flex items-center gap-2">
            <Headphones className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="text-sm font-extrabold text-gray-950 dark:text-white">{stats.totalSpotify}</div>
              <div className="text-[10px] text-gray-600 dark:text-gray-400 font-normal">Tracks at Places</div>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-white/70 dark:bg-white/5 border border-black/8 dark:border-white/10 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <div>
              <div className="text-sm font-extrabold text-gray-950 dark:text-white">{stats.totalBrowser}</div>
              <div className="text-[10px] text-gray-600 dark:text-gray-400 font-normal">Web Visits</div>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-white/70 dark:bg-white/5 border border-black/8 dark:border-white/10 flex items-center gap-2">
            <Camera className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <div className="text-sm font-extrabold text-gray-950 dark:text-white">{stats.totalPhoto}</div>
              <div className="text-[10px] text-gray-600 dark:text-gray-400 font-normal">Photos Taken</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by place name, song title, or website..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/80 dark:bg-white/5 border border-black/10 dark:border-white/15 text-xs text-gray-950 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        {/* Media Type Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button aria-label="Action"
            onClick={() => setSelectedMediaType('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
              selectedMediaType === 'all'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-white/90'
            }`}
          >
            All ({stats.totalCorrelated})
          </button>
          <button aria-label="Action"
            onClick={() => setSelectedMediaType('spotify')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedMediaType === 'spotify'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-white/90'
            }`}
          >
            <Headphones className="w-3 h-3" /> Spotify ({stats.totalSpotify})
          </button>
          <button aria-label="Action"
            onClick={() => setSelectedMediaType('youtube')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedMediaType === 'youtube'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-white/90'
            }`}
          >
            <Video className="w-3 h-3" /> YouTube ({stats.totalYouTube})
          </button>
          <button aria-label="Action"
            onClick={() => setSelectedMediaType('browser')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedMediaType === 'browser'
                ? 'bg-sky-600 text-white font-bold'
                : 'bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-white/90'
            }`}
          >
            <Globe className="w-3 h-3" /> Browser ({stats.totalBrowser})
          </button>
          <button aria-label="Action"
            onClick={() => setSelectedMediaType('photo')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedMediaType === 'photo'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-white/90'
            }`}
          >
            <Camera className="w-3 h-3" /> Photos ({stats.totalPhoto})
          </button>
        </div>
      </div>

      {/* Place Summaries List */}
      {filteredSummaries.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white/40 dark:bg-white/5 border border-black/8 dark:border-white/10 space-y-2">
          <Compass className="w-8 h-8 text-gray-400 mx-auto" />
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">No Correlated Moments Found</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {searchQuery
              ? `No places or media items matched "${searchQuery}". Try a different search term.`
              : 'Import your Google Maps Timeline takeout along with Spotify, YouTube, or Chrome history to automatically link what you listened to or watched with where you traveled.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSummaries.map((summary) => {
            const key = summary.placeName.toLowerCase();
            const isExpanded = expandedPlaceKeys[key] ?? false;
            const previewItems = isExpanded ? summary.items : summary.items.slice(0, 4);
            const remainingCount = summary.items.length - 4;

            return (
              <div
                key={summary.placeName}
                className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-black/8 dark:border-white/10 shadow-2xs hover:border-amber-500/30 transition-all space-y-3"
              >
                {/* Place Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-gray-950 dark:text-white truncate">
                        {summary.placeName}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25">
                        {summary.items.length} moment{summary.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {summary.address && (
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 truncate mt-0.5">
                        {summary.address}
                      </p>
                    )}
                  </div>

                  {/* Place Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {onSelectPlace && (
                      <button aria-label="Action"
                        onClick={() => {
                          onSelectPlace({
                            id: `corr_place_${summary.placeName}`,
                            type: 'maps',
                            ts: summary.items[0]?.ts || new Date().toISOString(),
                            dateObj: summary.items[0]?.dateObj || new Date(),
                            title: summary.placeName,
                            subtitle: summary.address,
                            lat: summary.lat,
                            lng: summary.lng,
                            address: summary.address
                          });
                        }}
                        className="px-2 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Center map on this place"
                      >
                        <Navigation className="w-3 h-3" /> Focus Map
                      </button>
                    )}

                    {onOpenMapModal && (
                      <button aria-label="Action"
                        onClick={() => {
                          const dummy = { lat: summary.lat, lng: summary.lng, title: summary.placeName, subtitle: summary.address };
                          const embed = buildGoogleMapsEmbedUrl(dummy as any);
                          const ext = buildGoogleMapsUrl(dummy as any);
                          onOpenMapModal(summary.placeName, summary.address, embed, ext);
                        }}
                        className="p-1 rounded-lg text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Open interactive Google Maps"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-counts breakdown */}
                <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold pt-1 border-t border-black/5 dark:border-white/5">
                  {summary.itemCounts.spotify > 0 && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <Headphones className="w-3 h-3" /> {summary.itemCounts.spotify} Spotify track{summary.itemCounts.spotify !== 1 ? 's' : ''}
                    </span>
                  )}
                  {summary.itemCounts.youtube > 0 && (
                    <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400">
                      <Video className="w-3 h-3" /> {summary.itemCounts.youtube} video{summary.itemCounts.youtube !== 1 ? 's' : ''}
                    </span>
                  )}
                  {summary.itemCounts.browser > 0 && (
                    <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-400">
                      <Globe className="w-3 h-3" /> {summary.itemCounts.browser} web page{summary.itemCounts.browser !== 1 ? 's' : ''}
                    </span>
                  )}
                  {summary.itemCounts.photo > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                      <Camera className="w-3 h-3" /> {summary.itemCounts.photo} photo{summary.itemCounts.photo !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Correlated Items List */}
                <div className="space-y-1.5 pt-1">
                  {previewItems.map((item, idx) => {
                    const timeStr = item.dateObj ? formatTime(item.dateObj) : '';
                    const dateStr = item.ts ? item.ts.slice(0, 10) : '';

                    return (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {item.type === 'spotify' && <Headphones className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                          {item.type === 'youtube' && <Video className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                          {item.type === 'browser' && <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                          {item.type === 'photo' && <Camera className="w-3.5 h-3.5 text-amber-500 shrink-0" />}

                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400 shrink-0 text-right">
                          <div>{timeStr}</div>
                          <div className="text-[9px] opacity-75">{dateStr}</div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Toggle more/less button */}
                  {remainingCount > 0 && (
                    <button aria-label="Action"
                      onClick={() => toggleExpand(key)}
                      className="w-full py-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" /> Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" /> Show All {summary.items.length} Moments (+{remainingCount} more)
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
