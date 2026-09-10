import React, { useMemo } from 'react';
import {
  BarChart2,
  Car,
  Footprints,
  Bike,
  Train,
  Plane,
  Clock,
  MapPin,
  Route,
  Award,
  Sparkles,
  Home,
  Briefcase
} from 'lucide-react';
import { TimelineItem } from '../../types';
import {
  formatDuration,
  getPlaceCategory,
  PlaceCategoryInfo
} from '../../utils/dataParser';

interface TimelineInsightsTabProps {
  items: TimelineItem[];
  onSelectPlace: (item: TimelineItem) => void;
  onOpenInspector: (item: TimelineItem) => void;
}

export const TimelineInsightsTab: React.FC<TimelineInsightsTabProps> = ({
  items,
  onSelectPlace,
  onOpenInspector
}) => {
  const {
    totalPlaces,
    totalVisits,
    totalDwellMs,
    totalMovingMs,
    travelStats,
    topPlaces,
    categoryBreakdown,
    dowDistribution
  } = useMemo(() => {
    const placeMap = new Map<string, { sampleItem: TimelineItem; visits: number; dwellMs: number }>();
    const categories: Record<string, { info: PlaceCategoryInfo; count: number; dwell: number }> = {};
    const dow = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat

    const travel = {
      totalKm: 0,
      walkingKm: 0,
      drivingKm: 0,
      bikingKm: 0,
      transitKm: 0,
      flightKm: 0
    };

    let dwell = 0;
    let moving = 0;
    let visitsCount = 0;

    items.forEach(item => {
      const date = item.dateObj || new Date(item.ts);
      dow[date.getDay()]++;

      if (item.isRoute || item.activityType || item.travelMode) {
        const dist = item.distanceKm ? parseFloat(item.distanceKm) : (item.distance ? item.distance / 1000 : 0);
        if (dist > 0) travel.totalKm += dist;
        if (item.ms_played) moving += item.ms_played;

        const mode = (item.activityType || item.travelMode || '').toLowerCase();
        if (mode.includes('walk') || mode.includes('run') || mode.includes('foot')) travel.walkingKm += dist;
        else if (mode.includes('bike') || mode.includes('cycl')) travel.bikingKm += dist;
        else if (mode.includes('transit') || mode.includes('subway') || mode.includes('train') || mode.includes('bus')) travel.transitKm += dist;
        else if (mode.includes('flight') || mode.includes('plane')) travel.flightKm += dist;
        else travel.drivingKm += dist;
        return;
      }

      if (item.type === 'maps') {
        visitsCount++;
        const key = item.title || item.address || `loc_${item.lat}_${item.lng}`;
        const itemDwell = item.ms_played || 0;
        dwell += itemDwell;

        const cat = getPlaceCategory(item);
        if (!categories[cat.id]) {
          categories[cat.id] = { info: cat, count: 0, dwell: 0 };
        }
        categories[cat.id].count++;
        categories[cat.id].dwell += itemDwell;

        if (!placeMap.has(key)) {
          placeMap.set(key, { sampleItem: item, visits: 0, dwellMs: 0 });
        }
        const entry = placeMap.get(key)!;
        entry.visits++;
        entry.dwellMs += itemDwell;
      }
    });

    const sortedPlaces = Array.from(placeMap.values())
      .sort((a, b) => b.visits - a.visits || b.dwellMs - a.dwellMs)
      .slice(0, 8);

    const sortedCats = Object.values(categories).sort((a, b) => b.count - a.count);

    return {
      totalPlaces: placeMap.size,
      totalVisits: visitsCount,
      totalDwellMs: dwell,
      totalMovingMs: moving,
      travelStats: travel,
      topPlaces: sortedPlaces,
      categoryBreakdown: sortedCats,
      dowDistribution: dow
    };
  }, [items]);

  const maxVisits = topPlaces.length > 0 ? topPlaces[0].visits : 1;
  const safeTotalKm = Math.max(travelStats.totalKm, 0.01);
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxDow = Math.max(...dowDistribution, 1);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="pb-1 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
          Timeline Insights & Analytics
        </h2>
        <p className="text-xs text-gray-400">Comprehensive movement and dwell patterns</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-blue-500 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase text-gray-400">Places</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {totalPlaces.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">{totalVisits} visits</p>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-indigo-500 mb-1">
            <Route className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase text-gray-400">Distance</span>
          </div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {travelStats.totalKm.toFixed(1)} <span className="text-xs">km</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">Total traveled</p>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase text-gray-400">Stayed</span>
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalDwellMs > 0 ? formatDuration(totalDwellMs) : '0h'}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">At locations</p>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-amber-500 mb-1">
            <Car className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase text-gray-400">Moving</span>
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {totalMovingMs > 0 ? formatDuration(totalMovingMs) : '0h'}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">In transit</p>
        </div>
      </div>

      {/* Modes of Transport Breakdown */}
      <div className="p-4 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Route className="w-4 h-4 text-[#1A73E8]" />
          <span>Modes of Transport</span>
        </h3>

        {/* Stacked Progress Bar */}
        <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex shadow-inner">
          {travelStats.drivingKm > 0 && (
            <div
              style={{ width: `${(travelStats.drivingKm / safeTotalKm) * 100}%` }}
              className="bg-[#1A73E8] h-full"
              title={`Driving: ${travelStats.drivingKm.toFixed(1)} km`}
            />
          )}
          {travelStats.walkingKm > 0 && (
            <div
              style={{ width: `${(travelStats.walkingKm / safeTotalKm) * 100}%` }}
              className="bg-emerald-500 h-full"
              title={`Walking: ${travelStats.walkingKm.toFixed(1)} km`}
            />
          )}
          {travelStats.transitKm > 0 && (
            <div
              style={{ width: `${(travelStats.transitKm / safeTotalKm) * 100}%` }}
              className="bg-purple-500 h-full"
              title={`Transit: ${travelStats.transitKm.toFixed(1)} km`}
            />
          )}
          {travelStats.bikingKm > 0 && (
            <div
              style={{ width: `${(travelStats.bikingKm / safeTotalKm) * 100}%` }}
              className="bg-amber-500 h-full"
              title={`Cycling: ${travelStats.bikingKm.toFixed(1)} km`}
            />
          )}
          {travelStats.flightKm > 0 && (
            <div
              style={{ width: `${(travelStats.flightKm / safeTotalKm) * 100}%` }}
              className="bg-cyan-500 h-full"
              title={`Flight: ${travelStats.flightKm.toFixed(1)} km`}
            />
          )}
        </div>

        {/* Mode Legend & Distances */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1A73E8]" />
            <span className="text-gray-600 dark:text-gray-300 font-medium">
              Driving ({travelStats.drivingKm.toFixed(1)} km)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-gray-600 dark:text-gray-300 font-medium">
              Walking ({travelStats.walkingKm.toFixed(1)} km)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-gray-600 dark:text-gray-300 font-medium">
              Transit ({travelStats.transitKm.toFixed(1)} km)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-gray-600 dark:text-gray-300 font-medium">
              Cycling ({travelStats.bikingKm.toFixed(1)} km)
            </span>
          </div>
        </div>
      </div>

      {/* Most Visited Places Leaderboard */}
      <div className="p-4 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Top Visited Locations</span>
        </h3>

        <div className="space-y-2.5">
          {topPlaces.map((place, idx) => {
            const item = place.sampleItem;
            const pct = Math.round((place.visits / maxVisits) * 100);

            return (
              <div
                key={idx}
                onClick={() => onSelectPlace(item)}
                className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-gray-400 text-[10px] w-4">#{idx + 1}</span>
                    <span className="font-bold text-gray-900 dark:text-white truncate group-hover:text-[#1A73E8]">
                      {item.title}
                    </span>
                  </div>
                  <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0 ml-2">
                    {place.visits} visits
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div style={{ width: `${pct}%` }} className="bg-[#1A73E8] h-full rounded-full" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
