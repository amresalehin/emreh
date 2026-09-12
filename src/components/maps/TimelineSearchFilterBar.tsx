import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  MapPin,
  Route,
  Building2,
  Calendar,
  Sparkles,
  Check,
  Tag,
  Eye,
  EyeOff
} from 'lucide-react';
import { CATEGORY_CONFIGS } from './TimelinePlacesTab';

export interface MapTimelineFilterState {
  searchQuery: string;
  category: string;
  activityMode: string;
  selectedYear: string;
  selectedCity: string;
  attribute: 'all' | 'resolved' | 'unresolved' | 'with_notes' | 'frequent';
  showRoutesInPlaces: boolean;
  showRoutesInCities: boolean;
}

export const INITIAL_FILTER_STATE: MapTimelineFilterState = {
  searchQuery: '',
  category: 'all',
  activityMode: 'all',
  selectedYear: 'all',
  selectedCity: 'all',
  attribute: 'all',
  showRoutesInPlaces: false,
  showRoutesInCities: false
};

interface TimelineSearchFilterBarProps {
  filterState: MapTimelineFilterState;
  onFilterChange: (updates: Partial<MapTimelineFilterState>) => void;
  onResetFilters: () => void;
  totalCount: number;
  filteredCount: number;
  availableYears: string[];
  topCities: { name: string; count: number }[];
  activeTab: string;
}

export const TimelineSearchFilterBar: React.FC<TimelineSearchFilterBarProps> = ({
  filterState,
  onFilterChange,
  onResetFilters,
  totalCount,
  filteredCount,
  availableYears,
  topCities,
  activeTab
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if any non-default filter is active
  const hasActiveFilters =
    filterState.searchQuery.trim() !== '' ||
    filterState.category !== 'all' ||
    filterState.activityMode !== 'all' ||
    filterState.selectedYear !== 'all' ||
    filterState.selectedCity !== 'all' ||
    filterState.attribute !== 'all';

  const activeFilterCount = [
    filterState.searchQuery.trim() !== '',
    filterState.category !== 'all',
    filterState.activityMode !== 'all',
    filterState.selectedYear !== 'all',
    filterState.selectedCity !== 'all',
    filterState.attribute !== 'all'
  ].filter(Boolean).length;

  return (
    <div className="bg-white/75 dark:bg-[#121214]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-[#121214]/75 border-b border-black/8 dark:border-white/10 transition-all z-10 shadow-2xs">
      {/* Primary Search & Quick Filter Bar */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Omnisearch Input */}
        <div className="relative flex-1 min-w-[200px] max-w-xl">
          <Search className="w-4 h-4 text-gray-500 dark:text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterState.searchQuery}
            onChange={e => onFilterChange({ searchQuery: e.target.value })}
            placeholder={`Search across ${activeTab} (places, cities, addresses, routes, tags)...`}
            className="w-full pl-9 pr-8 py-1.5 bg-white/60 dark:bg-white/8 hover:bg-white/80 dark:hover:bg-white/12 focus:bg-white dark:focus:bg-[#18181b] backdrop-blur-xl border border-black/10 dark:border-white/15 rounded-xl text-xs font-medium text-gray-950 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-500 dark:placeholder:text-gray-400 shadow-2xs"
          />
          {filterState.searchQuery && (
            <button
              onClick={() => onFilterChange({ searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded-full hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Quick Filter Toggles & Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Category Dropdown */}
          <select
            value={filterState.category}
            onChange={e => onFilterChange({ category: e.target.value })}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer outline-none backdrop-blur-xl shadow-2xs ${
              filterState.category !== 'all'
                ? 'bg-blue-500/18 dark:bg-blue-500/25 border-blue-500/40 text-blue-700 dark:text-blue-300'
                : 'bg-white/60 dark:bg-white/8 border-black/10 dark:border-white/15 text-gray-800 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-white/15'
            }`}
          >
            <option value="all">All Categories</option>
            {CATEGORY_CONFIGS.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Mode / Type Dropdown */}
          <select
            value={filterState.activityMode}
            onChange={e => onFilterChange({ activityMode: e.target.value })}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer outline-none backdrop-blur-xl shadow-2xs ${
              filterState.activityMode !== 'all'
                ? 'bg-indigo-500/18 dark:bg-indigo-500/25 border-indigo-500/40 text-indigo-700 dark:text-indigo-300'
                : 'bg-white/60 dark:bg-white/8 border-black/10 dark:border-white/15 text-gray-800 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-white/15'
            }`}
          >
            <option value="all">All Modes & Types</option>
            <option value="places_only">📍 Places / Visits Only</option>
            <option value="trips_only">🛣️ Trips & Routes Only</option>
            <option value="driving">🚗 Driving / Car</option>
            <option value="walking">🚶 Walking & Running</option>
            <option value="transit">🚆 Transit / Train</option>
            <option value="biking">🚴 Cycling</option>
            <option value="flight">✈️ Flights</option>
          </select>

          {/* Year Filter */}
          {availableYears.length > 1 && (
            <select
              value={filterState.selectedYear}
              onChange={e => onFilterChange({ selectedYear: e.target.value })}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer outline-none backdrop-blur-sm ${
                filterState.selectedYear !== 'all'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/60 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'bg-gray-50/70 dark:bg-gray-900/60 border-gray-200/80 dark:border-white/10 text-gray-700 dark:text-gray-300'
              }`}
            >
              <option value="all">All Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          )}

          {/* Toggle More Filters Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm ${
              isExpanded || activeFilterCount > 0
                ? 'bg-gray-900/90 text-white dark:bg-white/90 dark:text-gray-900 border-transparent shadow-xs'
                : 'bg-gray-50/70 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 border-gray-200/80 dark:border-white/10 hover:bg-gray-100/80'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#1A73E8] text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50/60 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Advanced Filter Panel */}
      {isExpanded && (
        <div className="px-4 py-3 bg-gray-50/70 dark:bg-gray-900/40 backdrop-blur-md border-t border-gray-200/60 dark:border-white/10 animate-in slide-in-from-top-2 duration-150 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* City Selection */}
            <div>
              <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 block mb-1">
                Filter by City / Municipality
              </label>
              <select
                value={filterState.selectedCity}
                onChange={e => onFilterChange({ selectedCity: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white/70 dark:bg-white/5 backdrop-blur-md border border-gray-200/80 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
              >
                <option value="all">All Cities ({topCities.length})</option>
                {topCities.map(city => (
                  <option key={city.name} value={city.name}>
                    {city.name} ({city.count} visits)
                  </option>
                ))}
              </select>
            </div>

            {/* Place Attributes / Status */}
            <div>
              <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 block mb-1">
                Place Attributes & Status
              </label>
              <select
                value={filterState.attribute}
                onChange={e => onFilterChange({ attribute: e.target.value as any })}
                className="w-full px-2.5 py-1.5 bg-white/70 dark:bg-white/5 backdrop-blur-md border border-gray-200/80 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
              >
                <option value="all">All Places & Stops</option>
                <option value="resolved">✨ Named / Geocoded Venues Only</option>
                <option value="unresolved">📍 Raw Coordinates (Pending Geocode)</option>
                <option value="with_notes">📝 Places with Custom Notes & Tags</option>
                <option value="frequent">🔥 Frequent Locations (3+ visits)</option>
              </select>
            </div>

            {/* Route Display in Places / Cities toggles */}
            <div>
              <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 block mb-1">
                Map Route Polylines Layer
              </label>
              <div className="flex items-center gap-2">
                {activeTab === 'places' && (
                  <button
                    type="button"
                    onClick={() =>
                      onFilterChange({ showRoutesInPlaces: !filterState.showRoutesInPlaces })
                    }
                    className={`flex-1 px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer backdrop-blur-md ${
                      filterState.showRoutesInPlaces
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-[#1A73E8] text-[#1A73E8]'
                        : 'bg-white/70 dark:bg-white/5 border-gray-200/80 dark:border-white/10 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <span>Routes in Places Tab</span>
                    {filterState.showRoutesInPlaces ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {activeTab === 'cities' && (
                  <button
                    type="button"
                    onClick={() =>
                      onFilterChange({ showRoutesInCities: !filterState.showRoutesInCities })
                    }
                    className={`flex-1 px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      filterState.showRoutesInCities
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-[#1A73E8] text-[#1A73E8]'
                        : 'bg-white dark:bg-[#181818] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <span>Routes in Cities Tab</span>
                    {filterState.showRoutesInCities ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {activeTab !== 'places' && activeTab !== 'cities' && (
                  <div className="text-xs text-gray-400 py-1.5">
                    Routes automatically rendered for {activeTab}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips & Result Counter */}
      {hasActiveFilters && (
        <div className="px-4 py-1.5 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between gap-2 text-xs flex-wrap border-t border-gray-100 dark:border-gray-800/60">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Active:</span>

            {filterState.searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px] font-semibold">
                <span>"{filterState.searchQuery}"</span>
                <X
                  className="w-3 h-3 cursor-pointer hover:text-blue-800"
                  onClick={() => onFilterChange({ searchQuery: '' })}
                />
              </span>
            )}

            {filterState.category !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-semibold">
                <span>Cat: {filterState.category}</span>
                <X
                  className="w-3 h-3 cursor-pointer hover:text-amber-800"
                  onClick={() => onFilterChange({ category: 'all' })}
                />
              </span>
            )}

            {filterState.activityMode !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[11px] font-semibold">
                <span>Mode: {filterState.activityMode}</span>
                <X
                  className="w-3 h-3 cursor-pointer hover:text-indigo-800"
                  onClick={() => onFilterChange({ activityMode: 'all' })}
                />
              </span>
            )}

            {filterState.selectedYear !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                <span>Year: {filterState.selectedYear}</span>
                <X
                  className="w-3 h-3 cursor-pointer hover:text-emerald-800"
                  onClick={() => onFilterChange({ selectedYear: 'all' })}
                />
              </span>
            )}

            {filterState.selectedCity !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[11px] font-semibold">
                <span>City: {filterState.selectedCity}</span>
                <X
                  className="w-3 h-3 cursor-pointer hover:text-purple-800"
                  onClick={() => onFilterChange({ selectedCity: 'all' })}
                />
              </span>
            )}

            {filterState.attribute !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-[11px] font-semibold">
                <span>Status: {filterState.attribute}</span>
                <X
                  className="w-3 h-3 cursor-pointer hover:text-cyan-800"
                  onClick={() => onFilterChange({ attribute: 'all' })}
                />
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 font-medium text-gray-500 text-[11px]">
            <span>
              Showing <strong className="text-gray-900 dark:text-white">{filteredCount}</strong> of{' '}
              {totalCount} events
            </span>
            <button
              onClick={onResetFilters}
              className="text-[#1A73E8] font-bold hover:underline cursor-pointer ml-1"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
