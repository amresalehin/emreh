import React, { useMemo } from 'react';
import {
  BarChart2,
  MapPin,
  Route,
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
  Car,
  Footprints,
  Bike,
  Flame,
  Award,
  Globe,
  Clock,
  Compass,
  ArrowRight
} from 'lucide-react';
import { TimelineItem } from '../../types';
import {
  formatDuration,
  getPlaceCategory,
  PlaceCategoryInfo
} from '../../utils/dataParser';

interface PlaceAnalyticsHubProps {
  items: TimelineItem[];
  onSelectPlace?: (item: TimelineItem) => void;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
}

export const PlaceAnalyticsHub: React.FC<PlaceAnalyticsHubProps> = ({
  items,
  onSelectPlace
}) => {
  // Aggregate Place Analytics & Insights
  const {
    totalPlacesVisited,
    totalVisitsCount,
    totalDwellMs,
    topPlaces,
    categoryBreakdown,
    travelStats,
    timeOfDaySummary,
    dwellTimeBuckets
  } = useMemo(() => {
    const placeMap = new Map<
      string,
      {
        sampleItem: TimelineItem;
        visits: number;
        totalDwell: number;
        category: PlaceCategoryInfo;
      }
    >();

    const categories: Record<string, { info: PlaceCategoryInfo; count: number; dwellMs: number }> = {};
    const travel = {
      totalTrips: 0,
      totalKm: 0,
      walkingKm: 0,
      drivingKm: 0,
      bikingKm: 0,
      transitKm: 0,
      totalMovingMs: 0
    };

    const tod = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    const buckets = { under30m: 0, m30to2h: 0, h2to6h: 0, over6h: 0 };

    let totalVisits = 0;
    let totalDwell = 0;

    items.forEach(item => {
      // 1. Travel Segment / Trip Activity
      if (item.isRoute || item.activityType || item.travelMode) {
        travel.totalTrips++;
        const dist = item.distanceKm ? parseFloat(item.distanceKm) : (item.distance ? item.distance / 1000 : 0);
        if (dist > 0) travel.totalKm += dist;
        if (item.ms_played) travel.totalMovingMs += item.ms_played;

        const mode = (item.activityType || item.travelMode || '').toLowerCase();
        if (mode.includes('walk') || mode.includes('run') || mode.includes('foot')) travel.walkingKm += dist;
        else if (mode.includes('bike') || mode.includes('cycl')) travel.bikingKm += dist;
        else if (mode.includes('transit') || mode.includes('train') || mode.includes('bus')) travel.transitKm += dist;
        else travel.drivingKm += dist;
        return;
      }

      // 2. Place Visit
      if (item.type === 'maps') {
        totalVisits++;
        const key = item.title || item.address || `loc_${item.lat}_${item.lng}`;
        const dwell = item.ms_played || 0;
        totalDwell += dwell;

        const cat = getPlaceCategory(item);
        if (!categories[cat.id]) {
          categories[cat.id] = { info: cat, count: 0, dwellMs: 0 };
        }
        categories[cat.id].count++;
        categories[cat.id].dwellMs += dwell;

        if (!placeMap.has(key)) {
          placeMap.set(key, { sampleItem: item, visits: 0, totalDwell: 0, category: cat });
        }
        const existing = placeMap.get(key)!;
        existing.visits++;
        existing.totalDwell += dwell;

        // Dwell buckets
        if (dwell > 0) {
          const mins = dwell / 60000;
          if (mins < 30) buckets.under30m++;
          else if (mins < 120) buckets.m30to2h++;
          else if (mins < 360) buckets.h2to6h++;
          else buckets.over6h++;
        }

        // Time of Day
        const d = item.dateObj || new Date(item.ts);
        const hour = d.getHours();
        if (hour >= 6 && hour < 12) tod.morning++;
        else if (hour >= 12 && hour < 18) tod.afternoon++;
        else if (hour >= 18 && hour < 22) tod.evening++;
        else tod.night++;
      }
    });

    const sortedPlaces = Array.from(placeMap.values())
      .sort((a, b) => b.visits - a.visits || b.totalDwell - a.totalDwell)
      .slice(0, 10);

    const sortedCategories = Object.values(categories).sort((a, b) => b.count - a.count);

    return {
      totalPlacesVisited: placeMap.size,
      totalVisitsCount: totalVisits,
      totalDwellMs: totalDwell,
      topPlaces: sortedPlaces,
      categoryBreakdown: sortedCategories,
      travelStats: travel,
      timeOfDaySummary: tod,
      dwellTimeBuckets: buckets
    };
  }, [items]);

  const maxPlaceVisits = topPlaces.length > 0 ? topPlaces[0].visits : 1;
  const totalCategoryVisits = Math.max(
    categoryBreakdown.reduce((acc, c) => acc + c.count, 0),
    1
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-2 text-blue-500 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Unique Places</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {totalPlacesVisited.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">{totalVisitsCount.toLocaleString()} total visits logged</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Dwell Time</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {totalDwellMs > 0 ? formatDuration(totalDwellMs) : '0h'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Time spent at locations</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-2 text-indigo-500 mb-1">
            <Route className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Distance Traveled</span>
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {travelStats.totalKm.toFixed(1)} <span className="text-sm font-semibold">km</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">{travelStats.totalTrips} route segments</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Top Category</span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 truncate">
            {categoryBreakdown[0]?.info.label || 'Places'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {categoryBreakdown[0] ? `${categoryBreakdown[0].count} visits` : 'Various'}
          </p>
        </div>
      </div>

      {/* Main Grid: Top Visited Places Leaderboard & Place Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Visited Places Leaderboard */}
        <div className="p-4 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-sm">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Most Visited Places</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-gray-400">Top 10</span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {topPlaces.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No visited places recorded</p>
            ) : (
              topPlaces.map((p, idx) => {
                const widthPct = Math.max(12, (p.visits / maxPlaceVisits) * 100);
                return (
                  <div
                    key={idx}
                    onClick={() => onSelectPlace && onSelectPlace(p.sampleItem)}
                    className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white truncate">
                          {p.sampleItem.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                        <span className="font-bold text-blue-600 dark:text-blue-400">{p.visits} visits</span>
                        {p.totalDwell > 0 && (
                          <span className="text-gray-400 text-[10px]">({formatDuration(p.totalDwell)})</span>
                        )}
                      </div>
                    </div>

                    {/* Progress visual bar */}
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Place Category Breakdown */}
        <div className="p-4 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-sm">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Category Breakdown</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-gray-400">{categoryBreakdown.length} Categories</span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {categoryBreakdown.map(cat => {
              const sharePct = ((cat.count / totalCategoryVisits) * 100).toFixed(1);
              return (
                <div key={cat.info.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`p-1.5 rounded-lg ${cat.info.bg} ${cat.info.color}`}>
                        {cat.info.id === 'food' && <Utensils className="w-3.5 h-3.5" />}
                        {cat.info.id === 'shopping' && <ShoppingBag className="w-3.5 h-3.5" />}
                        {cat.info.id === 'outdoors' && <TreePine className="w-3.5 h-3.5" />}
                        {cat.info.id === 'health' && <Heart className="w-3.5 h-3.5" />}
                        {cat.info.id === 'transit' && <Navigation className="w-3.5 h-3.5" />}
                        {cat.info.id === 'work' && <Briefcase className="w-3.5 h-3.5" />}
                        {cat.info.id === 'home' && <Home className="w-3.5 h-3.5" />}
                        {cat.info.id === 'culture' && <Sparkles className="w-3.5 h-3.5" />}
                        {cat.info.id === 'lodging' && <Building className="w-3.5 h-3.5" />}
                        {cat.info.id === 'education' && <BookOpen className="w-3.5 h-3.5" />}
                        {cat.info.id === 'places' && <MapPin className="w-3.5 h-3.5" />}
                      </span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{cat.info.label}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="font-bold text-gray-900 dark:text-white">{cat.count} visits</span>
                      <span className="text-gray-400 font-semibold">{sharePct}%</span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all bg-emerald-500"
                      style={{ width: `${sharePct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Movement & Travel Stats by Mode */}
      <div className="p-4 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-sm">
            <Route className="w-4 h-4 text-blue-500" />
            <span>Movement & Travel Mode Breakdown</span>
          </div>
          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
            Total {travelStats.totalKm.toFixed(1)} km
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
              <Footprints className="w-3.5 h-3.5" />
              <span>Walking / Running</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">
              {travelStats.walkingKm.toFixed(1)} <span className="text-xs text-gray-400">km</span>
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-500 text-xs font-bold">
              <Bike className="w-3.5 h-3.5" />
              <span>Cycling</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">
              {travelStats.bikingKm.toFixed(1)} <span className="text-xs text-gray-400">km</span>
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-blue-500 text-xs font-bold">
              <Car className="w-3.5 h-3.5" />
              <span>Driving</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">
              {travelStats.drivingKm.toFixed(1)} <span className="text-xs text-gray-400">km</span>
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-purple-500 text-xs font-bold">
              <Navigation className="w-3.5 h-3.5" />
              <span>Transit / Other</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">
              {travelStats.transitKm.toFixed(1)} <span className="text-xs text-gray-400">km</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
