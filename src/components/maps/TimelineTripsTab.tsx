import React, { useState, useMemo } from 'react';
import {
  Compass,
  Route,
  Car,
  Plane,
  Train,
  Bike,
  Footprints,
  Calendar,
  ChevronRight,
  MapPin,
  Clock,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { TimelineItem } from '../../types';
import { formatDuration, formatTime } from '../../utils/dataParser';

interface TimelineTripsTabProps {
  items: TimelineItem[];
  onSelectTrip: (item: TimelineItem) => void;
  onOpenInspector: (item: TimelineItem) => void;
  onJumpToDate?: (date: Date) => void;
}

export const TimelineTripsTab: React.FC<TimelineTripsTabProps> = ({
  items,
  onSelectTrip,
  onOpenInspector,
  onJumpToDate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [minDistance, setMinDistance] = useState<number>(0);

  // Aggregate route segments and multi-stop trips
  const allTrips = useMemo(() => {
    return items
      .filter(i => i.isRoute || i.activityType || i.travelMode)
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [items]);

  const filteredTrips = useMemo(() => {
    let list = allTrips;
    const q = searchQuery.trim().toLowerCase();

    if (q) {
      list = list.filter(t => {
        const title = (t.title || '').toLowerCase();
        const subtitle = (t.subtitle || '').toLowerCase();
        const mode = (t.activityType || t.travelMode || '').toLowerCase();
        const origin = (t.origin?.address || '').toLowerCase();
        const dest = (t.destination?.address || '').toLowerCase();
        const dateStr = t.ts ? t.ts.slice(0, 10) : '';

        return (
          title.includes(q) ||
          subtitle.includes(q) ||
          mode.includes(q) ||
          origin.includes(q) ||
          dest.includes(q) ||
          dateStr.includes(q)
        );
      });
    }

    if (selectedMode !== 'all') {
      list = list.filter(t => {
        const mode = (t.activityType || t.travelMode || t.title || '').toLowerCase();
        if (selectedMode === 'driving') return mode.includes('driv') || mode.includes('car') || mode.includes('vehic');
        if (selectedMode === 'walking') return mode.includes('walk') || mode.includes('foot') || mode.includes('run');
        if (selectedMode === 'transit') return mode.includes('transit') || mode.includes('train') || mode.includes('bus') || mode.includes('subway');
        if (selectedMode === 'flight') return mode.includes('flight') || mode.includes('plane');
        if (selectedMode === 'biking') return mode.includes('bike') || mode.includes('cycl');
        return true;
      });
    }

    if (minDistance > 0) {
      list = list.filter(t => {
        const distKm = t.distanceKm ? parseFloat(t.distanceKm) : (t.distance ? t.distance / 1000 : 0);
        return distKm >= minDistance;
      });
    }

    return list;
  }, [allTrips, searchQuery, selectedMode, minDistance]);

  let totalKm = 0;
  filteredTrips.forEach(t => {
    if (t.distanceKm) totalKm += parseFloat(t.distanceKm);
    else if (t.distance) totalKm += t.distance / 1000;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Tab Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
            {filteredTrips.length} Trips & Pathways
          </h2>
          <p className="text-xs text-gray-400">
            {totalKm > 0 ? `${totalKm.toFixed(1)} km total travel distance logged` : 'Travel segments'}
          </p>
        </div>
      </div>

      {/* Internal Trip Filter Toolbar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search trips, places, dates or routes..."
            className="w-full pl-8 pr-8 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs outline-none focus:border-blue-500 text-gray-900 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mode Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All Modes' },
            { id: 'driving', label: '🚗 Driving', icon: Car },
            { id: 'walking', label: '🚶 Walking', icon: Footprints },
            { id: 'transit', label: '🚆 Transit', icon: Train },
            { id: 'biking', label: '🚴 Cycling', icon: Bike },
            { id: 'flight', label: '✈️ Flights', icon: Plane }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMode(m.id)}
              className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer border text-[11px] ${
                selectedMode === m.id
                  ? 'bg-blue-500 text-white border-blue-500 shadow-2xs'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#1A73E8] flex items-center justify-center mx-auto mb-3">
            <Route className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">No Trips Matching Criteria</h4>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            Try adjusting your search query or mode filters to view trips.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrips.map((trip, idx) => {
            const distKm = trip.distanceKm ? parseFloat(trip.distanceKm) : (trip.distance ? trip.distance / 1000 : 0);
            const dateObj = trip.dateObj || new Date(trip.ts);
            const mode = (trip.activityType || trip.travelMode || trip.title || '').toLowerCase();

            return (
              <div
                key={trip.id || idx}
                onClick={() => onSelectTrip(trip)}
                className="p-4 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      {mode.includes('flight') || mode.includes('plane') ? (
                        <Plane className="w-5 h-5" />
                      ) : mode.includes('train') || mode.includes('subway') || mode.includes('transit') ? (
                        <Train className="w-5 h-5" />
                      ) : mode.includes('walk') || mode.includes('foot') || mode.includes('run') ? (
                        <Footprints className="w-5 h-5" />
                      ) : mode.includes('bike') || mode.includes('cycl') ? (
                        <Bike className="w-5 h-5" />
                      ) : (
                        <Car className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[#1A73E8] transition-colors">
                        {trip.title || 'Travel Journey'}
                      </h4>
                      {trip.subtitle && trip.subtitle !== trip.title && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                          {trip.subtitle}
                        </p>
                      )}
                      <div className="flex items-center gap-2.5 text-[11px] text-gray-400 mt-2 font-medium flex-wrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{dateObj.toLocaleDateString()}</span>
                        </div>
                        {trip.ms_played ? (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span>{formatDuration(trip.ms_played)}</span>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {distKm > 0 && (
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-[#1A73E8]">
                        {distKm.toFixed(1)} km
                      </div>
                      {onJumpToDate && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onJumpToDate(dateObj);
                          }}
                          className="text-[10px] font-bold text-gray-400 hover:text-blue-500 hover:underline mt-1 cursor-pointer block text-right"
                        >
                          View Day →
                        </button>
                      )}
                    </div>
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
