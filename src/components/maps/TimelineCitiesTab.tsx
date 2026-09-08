import React, { useState, useMemo } from 'react';
import {
  Building2,
  MapPin,
  Calendar,
  ChevronRight,
  Search,
  ArrowLeft,
  Navigation,
  ExternalLink,
  BarChart2,
  X,
  Clock,
  Route
} from 'lucide-react';
import { TimelineItem } from '../../types';
import { formatDuration, formatTime, getPlaceCategory } from '../../utils/dataParser';

interface TimelineCitiesTabProps {
  items: TimelineItem[];
  onSelectPlace: (item: TimelineItem) => void;
  onOpenInspector: (item: TimelineItem) => void;
  selectedCity?: string | null;
  onSelectCity?: (city: string | null) => void;
}

// Helper to extract city/municipality name from addresses or location names
export function extractCityName(item: TimelineItem): string {
  const addr = item.address || item.subtitle || (item.origin && item.origin.address) || '';
  if (!addr) {
    if (item.lat && item.lng) {
      return `Region (${item.lat.toFixed(1)}°, ${item.lng.toFixed(1)}°)`;
    }
    return 'Other Locations';
  }

  // Common address patterns (e.g. "123 Main St, Savannah, GA 31401, USA")
  const parts = addr.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    // City is usually the 2nd or 3rd from the end before State/Country
    const potentialCity = parts[parts.length - 3] || parts[1];
    if (potentialCity && isNaN(Number(potentialCity))) {
      return potentialCity;
    }
  }
  if (parts.length === 2) {
    return parts[1];
  }
  return parts[0] || 'Local Area';
}

interface CityAggregate {
  cityName: string;
  places: TimelineItem[];
  trips: TimelineItem[];
  uniquePlaces: Set<string>;
  firstVisited: Date;
  lastVisited: Date;
  sampleCoord?: [number, number];
}

export const TimelineCitiesTab: React.FC<TimelineCitiesTabProps> = ({
  items,
  onSelectPlace,
  onOpenInspector,
  selectedCity: selectedCityProp,
  onSelectCity
}) => {
  const [internalCity, setInternalCity] = useState<string | null>(null);
  const selectedCity = selectedCityProp !== undefined ? selectedCityProp : internalCity;

  const handleSelectCity = (city: string | null) => {
    setInternalCity(city);
    if (onSelectCity) onSelectCity(city);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [cityPlaceSearch, setCityPlaceSearch] = useState('');

  // Group places by city
  const cityMap = useMemo(() => {
    const map = new Map<string, CityAggregate>();

    items.forEach(item => {
      if (item.type !== 'maps') return;
      const city = extractCityName(item);
      const date = item.dateObj || new Date(item.ts);
      const placeName = item.title || item.address || '';

      if (!map.has(city)) {
        map.set(city, {
          cityName: city,
          places: [],
          trips: [],
          uniquePlaces: new Set(),
          firstVisited: date,
          lastVisited: date,
          sampleCoord: item.lat && item.lng ? [item.lat, item.lng] : undefined
        });
      }

      const entry = map.get(city)!;
      if (item.isRoute) {
        entry.trips.push(item);
      } else {
        entry.places.push(item);
        if (placeName) entry.uniquePlaces.add(placeName);
      }

      if (date < entry.firstVisited) entry.firstVisited = date;
      if (date > entry.lastVisited) entry.lastVisited = date;
      if (!entry.sampleCoord && item.lat && item.lng) {
        entry.sampleCoord = [item.lat, item.lng];
      }
    });

    return map;
  }, [items]);

  const q = searchQuery.trim().toLowerCase();

  const citiesList = useMemo(() => {
    let list: CityAggregate[] = Array.from(cityMap.values());
    if (q) {
      list = list.filter(c => c.cityName.toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.places.length - a.places.length);
  }, [cityMap, q]);

  // 1. DRILLDOWN: Places in selected city
  if (selectedCity && cityMap.has(selectedCity)) {
    const data = cityMap.get(selectedCity)!;
    const subQ = cityPlaceSearch.trim().toLowerCase();
    const filteredCityPlaces = subQ
      ? data.places.filter(
          p =>
            (p.title || '').toLowerCase().includes(subQ) ||
            (p.address || '').toLowerCase().includes(subQ)
        )
      : data.places;

    return (
      <div className="space-y-4 pb-12 animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => handleSelectCity(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-[#1A73E8] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Cities</span>
          </button>
          <div className="text-xs font-bold text-gray-500">
            {data.places.length} places • {data.trips.length} local trips
          </div>
        </div>

        {/* City Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent dark:from-blue-950/40 rounded-2xl border border-gray-200/80 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1A73E8] text-white flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                {data.cityName}
              </h3>
              <p className="text-xs text-gray-500">
                {data.uniquePlaces.size} unique places • Visited{' '}
                {data.firstVisited.toLocaleDateString()} – {data.lastVisited.toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Search within this city */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={cityPlaceSearch}
            onChange={e => setCityPlaceSearch(e.target.value)}
            placeholder={`Search places in ${data.cityName}...`}
            className="w-full pl-8 pr-8 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs outline-none focus:border-blue-500 text-gray-900 dark:text-white"
          />
          {cityPlaceSearch && (
            <button
              onClick={() => setCityPlaceSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Places List */}
        <div className="space-y-2.5">
          {filteredCityPlaces.map((place, idx) => (
            <div
              key={idx}
              onClick={() => onSelectPlace(place)}
              className="p-3.5 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[#1A73E8] transition-colors">
                    {place.title}
                  </h4>
                  {place.address && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                      {place.address}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1.5 font-medium">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(place.ts).toLocaleDateString()}</span>
                    {place.ms_played ? (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {formatDuration(place.ms_played)}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <button
                  onClick={e => {
                    e.stopPropagation();
                    onOpenInspector(place);
                  }}
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                  title="Inspect Place"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. ROOT CITIES LIST
  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
            {citiesList.length} Cities Visited
          </h2>
          <p className="text-xs text-gray-400">Locations grouped by municipality</p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search cities..."
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {citiesList.map((city, idx) => (
          <div
            key={idx}
            onClick={() => handleSelectCity(city.cityName)}
            className="p-4 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#1A73E8] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[#1A73E8] transition-colors">
                  {city.cityName}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {city.uniquePlaces.size} places • {city.places.length} visits
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        ))}
      </div>
    </div>
  );
};
