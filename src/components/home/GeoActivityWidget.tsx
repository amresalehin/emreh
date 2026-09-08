import React, { useMemo } from 'react';
import {
  MapPin,
  Navigation,
  Headphones,
  Camera,
  ArrowUpRight,
  Compass,
  Sparkles
} from 'lucide-react';
import { TimelineItem, ViewType } from '../../types';
import { getPlaceCorrelationSummary } from '../../utils/geoCorrelation';

interface GeoActivityWidgetProps {
  timelineData?: TimelineItem[];
  currentDate?: Date;
  onNavigateView?: (view: ViewType) => void;
}

export const GeoActivityWidget: React.FC<GeoActivityWidgetProps> = ({
  timelineData = [],
  currentDate = new Date(),
  onNavigateView
}) => {
  const dateKey = currentDate.toISOString().slice(0, 10);

  // Summarize places & correlations
  const placeSummaries = useMemo(() => {
    return getPlaceCorrelationSummary(timelineData);
  }, [timelineData]);

  // Today's maps items
  const todayMaps = useMemo(() => {
    return timelineData.filter(i => i.type === 'maps' && i.ts?.startsWith(dateKey) && !i.isRoute);
  }, [timelineData, dateKey]);

  // Top 3 places overall or today's places
  const displayedPlaces = todayMaps.length > 0
    ? todayMaps.slice(0, 3)
    : placeSummaries.slice(0, 3).map(p => ({
        id: p.placeName,
        title: p.placeName,
        subtitle: p.address,
        ts: p.items[0]?.ts || '',
        correlatedCount: p.items.length
      }));

  const totalLinkedPlaces = placeSummaries.length;
  const totalLinkedMoments = placeSummaries.reduce((sum, p) => sum + p.items.length, 0);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-black/8 dark:border-white/10 shadow-2xs hover:border-amber-500/30 transition-all flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-white">
                Places & Life Moments
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                {todayMaps.length > 0 ? `Today's Journey (${todayMaps.length} stops)` : 'Correlated Places'}
              </p>
            </div>
          </div>

          {onNavigateView && (
            <button aria-label="Action"
              onClick={() => onNavigateView('maptimeline')}
              className="px-2 py-1 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Explore Map</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Highlights banner */}
        <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs text-gray-800 dark:text-gray-200 font-medium">
              <strong className="text-gray-950 dark:text-white">{totalLinkedMoments}</strong> media moments linked across <strong className="text-gray-950 dark:text-white">{totalLinkedPlaces}</strong> places
            </span>
          </div>
        </div>

        {/* Places List */}
        {displayedPlaces.length > 0 ? (
          <div className="space-y-1.5">
            {displayedPlaces.map((place: any, idx) => (
              <div
                key={place.id || idx}
                onClick={() => onNavigateView && onNavigateView('maptimeline')}
                className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 hover:bg-black/[0.04] transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                      {place.title}
                    </div>
                    {place.subtitle && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {place.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                {place.correlatedCount ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 shrink-0">
                    {place.correlatedCount} moments
                  </span>
                ) : (
                  <ArrowUpRight className="w-3 h-3 text-gray-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center rounded-xl bg-black/[0.02] dark:bg-white/[0.02] text-xs text-gray-500 dark:text-gray-400">
            No visited places recorded yet. Import your Google Maps takeout to see your places and journeys.
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5">
        <button aria-label="Action"
          onClick={() => onNavigateView && onNavigateView('maptimeline')}
          className="w-full py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Navigation className="w-3 h-3" /> Open Full Map Timeline
        </button>
      </div>
    </div>
  );
};
