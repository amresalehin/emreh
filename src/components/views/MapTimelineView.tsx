import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MapPin,
  Route,
  Columns2,
  List,
  Maximize2,
  SlidersHorizontal,
  Calendar as CalendarIcon,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Building2,
  Compass,
  Globe,
  Upload,
  Search,
  X,
  Layers,
  Eye,
  EyeOff,
  Download,
  Database,
  FileSpreadsheet,
  Settings
} from 'lucide-react';
import { TimelineItem, DateRange } from '../../types';
import { ViewToolbar } from '../ViewToolbar';
import { LeafletMap } from '../LeafletMap';
import { useResizablePane } from '../../hooks/useResizablePane';
import { PaneResizer } from '../common/PaneResizer';
import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsUrl,
  formatDuration,
  formatTime,
  getPlaceCategory,
  isGenericPlaceName
} from '../../utils/dataParser';
import { PlaceInspector } from '../maps/PlaceInspector';
import { PlaceRenameModal } from '../maps/PlaceRenameModal';
import { ResolvedPlacesLogModal } from '../maps/ResolvedPlacesLogModal';
import { MapDataExportModal } from '../maps/MapDataExportModal';
import { TimelineCalendarNavigator } from '../maps/TimelineCalendarNavigator';
import { TimelineDayView } from '../maps/TimelineDayView';
import { TimelinePlacesTab } from '../maps/TimelinePlacesTab';
import { extractCityName } from '../maps/TimelineCitiesTab';
import { TimelineInsightsTab } from '../maps/TimelineInsightsTab';
import { TimelineCorrelationsTab } from '../maps/TimelineCorrelationsTab';
import {
  TimelineSearchFilterBar,
  MapTimelineFilterState,
  INITIAL_FILTER_STATE
} from '../maps/TimelineSearchFilterBar';

export type GoogleTimelineTab = 'day' | 'trips' | 'insights' | 'places' | 'cities' | 'world' | 'correlations';

interface MapTimelineViewProps {
  currentDate: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onOpenCalendar?: () => void;
  onJumpToDate?: (date: Date) => void;
  onImportClick?: () => void;
  dateRange?: DateRange | null;
  onClearDateRange?: () => void;
  onOpenDateRangePicker?: () => void;
  items: TimelineItem[];
  processedData?: TimelineItem[];
  dateIndexMap?: Map<string, TimelineItem[]>;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
  onResolveGeo?: (lat: number, lng: number) => void;
  onShowPlaceProfile?: (item: TimelineItem) => void;
  onRenamePlace?: (
    targetItem: TimelineItem,
    newName: string,
    applyToAllMatching: boolean,
    newCategory?: string,
    newAddress?: string
  ) => void;
  onBatchResolveUnknown?: () => Promise<void> | void;
  luminance?: 'light' | 'dark';
  theme?: 'solid-glass' | 'liquid-glass';
}

export const MapTimelineView: React.FC<MapTimelineViewProps> = ({
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onOpenCalendar,
  onJumpToDate,
  onImportClick,
  dateRange,
  onClearDateRange,
  onOpenDateRangePicker,
  items,
  processedData,
  dateIndexMap,
  onOpenMapModal,
  onResolveGeo,
  onShowPlaceProfile,
  onRenamePlace,
  onBatchResolveUnknown,
  luminance = 'dark',
  theme = 'solid-glass'
}) => {
  // Google Maps Timeline Primary Tabs (Day, Trips, Insights, Places, Cities, World)
  const [activeTab, setActiveTab] = useState<GoogleTimelineTab>('day');
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');
  const [showRoutes, setShowRoutes] = useState<boolean>(true);

  // Selected place / item for map & inspector
  const [selectedCoord, setSelectedCoord] = useState<[number, number] | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [inspectedItem, setInspectedItem] = useState<TimelineItem | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  // Resizable Panes for Timeline & Inspector
  const leftResizer = useResizablePane({
    initialWidth: 440,
    minWidth: 280,
    maxWidth: 750,
    storageKey: 'map_timeline_left_width',
    direction: 'left'
  });

  const inspectorResizer = useResizablePane({
    initialWidth: 380,
    minWidth: 280,
    maxWidth: 650,
    storageKey: 'map_timeline_inspector_width',
    direction: 'right'
  });

  // Custom Place Renaming Modal
  const [renameModalItem, setRenameModalItem] = useState<TimelineItem | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);

  // Resolved Places Log & Map Data Export Modals
  const [isPlacesLogOpen, setIsPlacesLogOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);


  const handleOpenRenameModal = (item: TimelineItem) => {
    setRenameModalItem(item);
    setIsRenameModalOpen(true);
  };

  const handleCloseRenameModal = () => {
    setIsRenameModalOpen(false);
    setRenameModalItem(null);
  };

  const handleSaveRenameModal = (newName: string, applyToAllMatching: boolean, category?: string, address?: string) => {
    if (renameModalItem && onRenamePlace) {
      onRenamePlace(renameModalItem, newName, applyToAllMatching, category, address);
      // Also update inspected item if active
      if (inspectedItem && (inspectedItem.id === renameModalItem.id || inspectedItem.title === renameModalItem.title)) {
        setInspectedItem({
          ...inspectedItem,
          title: newName,
          place_name: newName,
          category: category || inspectedItem.category,
          address: address !== undefined ? address : inspectedItem.address
        });
      }
    }
    handleCloseRenameModal();
  };

  // Unified Global Filter State across all Timeline tabs
  const [filterState, setFilterState] = useState<MapTimelineFilterState>(INITIAL_FILTER_STATE);

  const handleFilterChange = (updates: Partial<MapTimelineFilterState>) => {
    setFilterState(prev => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilterState(INITIAL_FILTER_STATE);
  };

  // Active sub-filters inside Places and Cities tabs
  const selectedPlaceCategory = filterState.category !== 'all' ? filterState.category : null;
  const setSelectedPlaceCategory = (cat: string | null) => {
    handleFilterChange({ category: cat || 'all' });
  };

  const selectedCityName = filterState.selectedCity !== 'all' ? filterState.selectedCity : null;
  const setSelectedCityName = (city: string | null) => {
    handleFilterChange({ selectedCity: city || 'all' });
  };

  // Local place notes & custom tags
  const [placeNotes, setPlaceNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('maps_place_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [placeTags, setPlaceTags] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('maps_place_tags');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleSavePlaceNote = (key: string, note: string) => {
    setPlaceNotes(prev => {
      const updated = { ...prev, [key]: note };
      try {
        localStorage.setItem('maps_place_notes', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const handleAddPlaceTag = (key: string, tag: string) => {
    setPlaceTags(prev => {
      const existing = prev[key] || [];
      if (existing.includes(tag)) return prev;
      const updated = { ...prev, [key]: [...existing, tag] };
      try {
        localStorage.setItem('maps_place_tags', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const handleRemovePlaceTag = (key: string, tag: string) => {
    setPlaceTags(prev => {
      const existing = prev[key] || [];
      const updated = { ...prev, [key]: existing.filter(t => t !== tag) };
      try {
        localStorage.setItem('maps_place_tags', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const getDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const dayKey = getDateKey(currentDate);

  // All maps items in dataset
  const allMapsInDataset = useMemo(() => {
    return (processedData || items).filter(s => s.type === 'maps');
  }, [processedData, items]);

  // Dynamically compute available distinct years and top visited cities
  const { availableYears, topCities } = useMemo(() => {
    const yearsSet = new Set<string>();
    const cityMap = new Map<string, number>();

    allMapsInDataset.forEach(i => {
      if (i.ts) {
        yearsSet.add(i.ts.slice(0, 4));
      }
      const city = extractCityName(i);
      if (city && city !== 'Other Locations') {
        cityMap.set(city, (cityMap.get(city) || 0) + 1);
      }
    });

    const years = Array.from(yearsSet).filter(Boolean).sort((a, b) => b.localeCompare(a));
    const cities = Array.from(cityMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);

    return { availableYears: years, topCities: cities };
  }, [allMapsInDataset]);

  // Compute Place visit counts across all history for badges
  const placeVisitCounts = useMemo(() => {
    const map = new Map<string, number>();
    allMapsInDataset.forEach(i => {
      if (i.title) {
        map.set(i.title, (map.get(i.title) || 0) + 1);
      }
    });
    return map;
  }, [allMapsInDataset]);

  // Unified Multi-Dimensional Filtered Dataset
  const filteredDataset = useMemo(() => {
    let list = allMapsInDataset;
    const q = filterState.searchQuery.trim().toLowerCase();

    return list.filter(item => {
      // 1. Omnisearch Query (title, address, city, notes, tags, dates, mode, category)
      if (q) {
        const title = (item.title || '').toLowerCase();
        const subtitle = (item.subtitle || '').toLowerCase();
        const address = (item.address || '').toLowerCase();
        const city = extractCityName(item).toLowerCase();
        const mode = (item.activityType || item.travelMode || '').toLowerCase();
        const catInfo = getPlaceCategory(item);
        const cat = (item.category || catInfo.id || catInfo.label).toLowerCase();
        const dateStr = item.ts ? item.ts.slice(0, 10) : '';
        const notes = (placeNotes[item.title || ''] || '').toLowerCase();
        const tags = (placeTags[item.title || ''] || []).join(' ').toLowerCase();

        const matches =
          title.includes(q) ||
          subtitle.includes(q) ||
          address.includes(q) ||
          city.includes(q) ||
          mode.includes(q) ||
          cat.includes(q) ||
          dateStr.includes(q) ||
          notes.includes(q) ||
          tags.includes(q);

        if (!matches) return false;
      }

      // 2. Category Filter
      if (filterState.category && filterState.category !== 'all') {
        const cat = getPlaceCategory(item);
        if (cat.id !== filterState.category) return false;
      }

      // 3. Activity / Mode Filter
      if (filterState.activityMode && filterState.activityMode !== 'all') {
        if (filterState.activityMode === 'places_only' && item.isRoute) return false;
        if (filterState.activityMode === 'trips_only' && !item.isRoute && !item.activityType && !item.travelMode) return false;
        if (filterState.activityMode === 'driving') {
          const m = (item.activityType || item.travelMode || item.title || '').toLowerCase();
          if (!item.isRoute || (!m.includes('driv') && !m.includes('car') && !m.includes('vehic'))) return false;
        }
        if (filterState.activityMode === 'walking') {
          const m = (item.activityType || item.travelMode || item.title || '').toLowerCase();
          if (!m.includes('walk') && !m.includes('foot') && !m.includes('run')) return false;
        }
        if (filterState.activityMode === 'transit') {
          const m = (item.activityType || item.travelMode || item.title || '').toLowerCase();
          if (!m.includes('transit') && !m.includes('train') && !m.includes('bus') && !m.includes('subway')) return false;
        }
        if (filterState.activityMode === 'flight') {
          const m = (item.activityType || item.travelMode || item.title || '').toLowerCase();
          if (!m.includes('flight') && !m.includes('plane')) return false;
        }
        if (filterState.activityMode === 'biking') {
          const m = (item.activityType || item.travelMode || item.title || '').toLowerCase();
          if (!m.includes('bike') && !m.includes('cycl')) return false;
        }
      }

      // 4. Year Filter
      if (filterState.selectedYear && filterState.selectedYear !== 'all') {
        const itemYear = item.ts ? item.ts.slice(0, 4) : '';
        if (itemYear !== filterState.selectedYear) return false;
      }

      // 5. City Filter
      if (filterState.selectedCity && filterState.selectedCity !== 'all') {
        const itemCity = extractCityName(item);
        if (itemCity !== filterState.selectedCity) return false;
      }

      // 6. Attribute / Status Filter
      if (filterState.attribute === 'resolved' && isGenericPlaceName(item.title)) return false;
      if (filterState.attribute === 'unresolved' && !isGenericPlaceName(item.title)) return false;
      if (filterState.attribute === 'with_notes') {
        const hasNote = !!placeNotes[item.title || ''];
        const hasTags = (placeTags[item.title || ''] || []).length > 0;
        if (!hasNote && !hasTags) return false;
      }
      if (filterState.attribute === 'frequent') {
        const count = placeVisitCounts.get(item.title || '') || 0;
        if (count < 3) return false;
      }

      return true;
    });
  }, [allMapsInDataset, filterState, placeNotes, placeTags, placeVisitCounts]);

  // Day items for current selected date (filtered by active global filter state)
  const dayItems = useMemo(() => {
    if (dateRange) {
      return filteredDataset.filter(s => {
        const k = s.ts.slice(0, 10);
        return k >= dateRange.startDate && k <= dateRange.endDate;
      });
    }
    return filteredDataset.filter(s => s.ts.slice(0, 10) === dayKey);
  }, [dateRange, filteredDataset, dayKey]);

  const formattedDayTitle = currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Map items to feed into the Leaflet Map depending on active tab and active filter
  // Crucial: strictly excludes route lines in Places and Cities tab unless explicitly toggled
  const { mapDisplayItems, activeFilterLabel } = useMemo(() => {
    if (activeTab === 'day') {
      const label = dateRange
        ? `Filtered: ${dateRange.startDate} to ${dateRange.endDate} (${dayItems.length} locations)`
        : `Day: ${formattedDayTitle} (${dayItems.length} locations)`;
      return { mapDisplayItems: dayItems, activeFilterLabel: label };
    }

    if (activeTab === 'places') {
      const placesOnly = filteredDataset.filter(i => !i.isRoute);
      const itemsToRender = filterState.showRoutesInPlaces
        ? filteredDataset
        : placesOnly;

      const catLabel = selectedPlaceCategory ? ` (${selectedPlaceCategory.toUpperCase()})` : '';
      return {
        mapDisplayItems: itemsToRender,
        activeFilterLabel: `Places${catLabel}: ${placesOnly.length} locations`
      };
    }

    if (activeTab === 'cities') {
      const placesInCity = selectedCityName
        ? filteredDataset.filter(i => !i.isRoute && extractCityName(i) === selectedCityName)
        : filteredDataset.filter(i => !i.isRoute);

      let itemsToRender = placesInCity;
      if (filterState.showRoutesInCities) {
        if (selectedCityName) {
          const cityRoutes = filteredDataset.filter(
            i =>
              i.isRoute &&
              (extractCityName(i) === selectedCityName ||
                extractCityName({ address: i.origin?.address } as any) === selectedCityName ||
                extractCityName({ address: i.destination?.address } as any) === selectedCityName)
          );
          itemsToRender = [...placesInCity, ...cityRoutes];
        } else {
          itemsToRender = filteredDataset;
        }
      }

      const cityLabel = selectedCityName ? ` in ${selectedCityName}` : '';
      return {
        mapDisplayItems: itemsToRender,
        activeFilterLabel: `Cities: ${placesInCity.length} places${cityLabel}`
      };
    }

    if (activeTab === 'trips') {
      const tripsOnly = filteredDataset.filter(i => i.isRoute || i.activityType || i.travelMode);
      return {
        mapDisplayItems: tripsOnly,
        activeFilterLabel: `Trips & Pathways (${tripsOnly.length} segments)`
      };
    }

    if (activeTab === 'insights') {
      const places = filteredDataset.filter(i => !i.isRoute);
      return {
        mapDisplayItems: places,
        activeFilterLabel: `Insights (${places.length} places)`
      };
    }

    // World tab
    const worldPlaces = filteredDataset.filter(i => !i.isRoute);
    return {
      mapDisplayItems: worldPlaces,
      activeFilterLabel: `World (${worldPlaces.length} spots)`
    };
  }, [
    activeTab,
    dayItems,
    filteredDataset,
    selectedPlaceCategory,
    selectedCityName,
    filterState.showRoutesInPlaces,
    filterState.showRoutesInCities,
    dateRange,
    formattedDayTitle
  ]);

  // Combined key that changes when the user switches tabs, dates, categories, or cities to trigger smooth fitBounds
  const fitKey = `${activeTab}_${dayKey}_${dateRange?.startDate || ''}_${dateRange?.endDate || ''}_${selectedPlaceCategory || ''}_${selectedCityName || ''}_${mapDisplayItems.length}`;

  const handleSelectWaypoint = (item: TimelineItem) => {
    setSelectedItemId(item.id);
    let coord: [number, number] | null = null;
    if (item.lat != null && item.lng != null && !isNaN(Number(item.lat)) && !isNaN(Number(item.lng))) {
      coord = [Number(item.lat), Number(item.lng)];
    } else if (
      item.origin?.lat != null &&
      item.origin?.lng != null &&
      !isNaN(Number(item.origin.lat)) &&
      !isNaN(Number(item.origin.lng))
    ) {
      coord = [Number(item.origin.lat), Number(item.origin.lng)];
    } else if (
      item.destination?.lat != null &&
      item.destination?.lng != null &&
      !isNaN(Number(item.destination.lat)) &&
      !isNaN(Number(item.destination.lng))
    ) {
      coord = [Number(item.destination.lat), Number(item.destination.lng)];
    }
    if (coord) {
      setSelectedCoord([coord[0], coord[1]]);
    }
  };

  const handleOpenInspector = (item: TimelineItem) => {
    setInspectedItem(item);
    setIsInspectorOpen(true);
    handleSelectWaypoint(item);
    if (onShowPlaceProfile) {
      onShowPlaceProfile(item);
    }
  };

  const handleHistogramSelectDate = (date: Date) => {
    if (onJumpToDate) {
      onJumpToDate(date);
    }
  };

  return (
    <div className="flex-1 h-full overflow-hidden bg-transparent flex flex-col min-h-0">
      {/* Minimalist ViewToolbar */}
      <ViewToolbar
        badge={
          <span className="font-['Space_Mono',monospace] text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1a1a1a]/8 dark:bg-white/10 text-[#1a1a1a] dark:text-stone-200">
            {allMapsInDataset.length.toLocaleString()} locations
          </span>
        }
        showDateNavigation={false}
        onImportClick={onImportClick}
        importLabel="Import"
        leftActions={
          <div className="flex bg-blue-500/10 dark:bg-blue-500/15 p-0.5 rounded-lg border border-blue-500/20 text-xs overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'day', label: 'Day', icon: CalendarIcon },
                { id: 'places', label: 'Places', icon: ShoppingBag },
                { id: 'insights', label: 'Insights', icon: BarChart2 },
                { id: 'correlations', label: 'Media & Places', icon: Sparkles }
              ] as const
            ).map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer font-medium whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-500 text-white shadow-2xs font-semibold'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-500/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        }
      >
        {/* Section: View Layout Mode */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
            Layout Mode
          </span>
          <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200/80 dark:border-white/10 text-xs">
            <button
              onClick={() => setViewMode('split')}
              className={`py-1.5 px-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer font-semibold ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-gray-800 text-[#1A73E8] shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="text-[10px]">Split</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`py-1.5 px-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer font-semibold ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-800 text-[#1A73E8] shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="text-[10px]">List</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`py-1.5 px-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer font-semibold ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-gray-800 text-[#1A73E8] shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-[10px]">Full Map</span>
            </button>
          </div>
        </div>

        {/* Section: Data & Tools */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
            Data & Tools
          </span>
          <div className="flex flex-col gap-1.5">
            {onImportClick && (
              <button
                onClick={onImportClick}
                className="w-full px-3 py-2 bg-[#1A73E8] hover:bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs transition-all cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Takeout Maps</span>
                </div>
                <span className="text-[10px] bg-blue-700/60 px-1.5 py-0.5 rounded font-mono">JSON</span>
              </button>
            )}

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5" />
                <span>Export Map Data</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">GeoJSON / CSV</span>
            </button>

            <button
              onClick={() => setIsPlacesLogOpen(true)}
              className="w-full px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-between border border-emerald-200/60 dark:border-emerald-800/40 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5" />
                <span>Resolved Places Log</span>
              </div>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/80 px-1.5 py-0.5 rounded font-mono font-bold">Coordinates</span>
            </button>
          </div>
        </div>
      </ViewToolbar>

      {/* Global Search & Multi-Dimensional Filter Toolbar across all Tabs */}
      <TimelineSearchFilterBar
        filterState={filterState}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        totalCount={allMapsInDataset.length}
        filteredCount={filteredDataset.length}
        availableYears={availableYears}
        topCities={topCities}
        activeTab={activeTab}
      />

      {/* 2. Main Content Split View (Sidebar Panel + Full Map) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative bg-transparent">
        {/* Left / Bottom Panel: Google Maps Timeline Views */}
        {viewMode !== 'map' && (
          <div
            className={`overflow-y-auto overscroll-contain min-h-0 border-b md:border-b-0 md:border-r transition-all ${
              theme === 'liquid-glass'
                ? 'bg-white/55 dark:bg-[#0c1626]/50 backdrop-blur-2xl border-white/50 dark:border-white/10 shadow-md'
                : 'bg-white/50 dark:bg-black/35 backdrop-blur-xl border-stone-200/50 dark:border-white/10 shadow-2xs'
            } relative shrink-0 ${
              viewMode === 'list'
                ? 'w-full h-full max-w-5xl mx-auto p-4'
                : 'w-full h-1/2 md:h-full'
            }`}
            style={{
              width: viewMode === 'list' ? '100%' : (typeof window !== 'undefined' && window.innerWidth >= 768 ? `${leftResizer.width}px` : undefined),
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y'
            }}
          >
            {/* SUB-VIEW 1: DAY TIMELINE (With Calendar Navigator) */}
            {activeTab === 'day' && (
              <div className="flex flex-col h-full">
                {/* Calendar Navigator */}
                <TimelineCalendarNavigator
                  currentDate={currentDate}
                  onSelectDate={handleHistogramSelectDate}
                  dateIndexMap={dateIndexMap}
                  allMapsItems={filteredDataset}
                  onPrevDate={onPrevDate}
                  onNextDate={onNextDate}
                  onSetToday={onSetToday}
                />

                <div className="p-4 flex-1">
                  <TimelineDayView
                    currentDate={currentDate}
                    items={dayItems}
                    selectedItemId={selectedItemId}
                    onSelectItem={handleSelectWaypoint}
                    onOpenInspector={handleOpenInspector}
                    onOpenMapModal={onOpenMapModal}
                    placeVisitCounts={placeVisitCounts}
                    onImportClick={onImportClick}
                    onRenamePlace={onRenamePlace}
                    onResolveGeo={onResolveGeo}
                    onOpenRenameModal={handleOpenRenameModal}
                  />
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: PLACES TAB (Screenshot 1 Category Cards) */}
            {activeTab === 'places' && (
              <div className="p-4">
                <TimelinePlacesTab
                  items={filteredDataset}
                  onSelectPlace={handleSelectWaypoint}
                  onOpenInspector={handleOpenInspector}
                  onOpenMapModal={onOpenMapModal}
                  selectedCategory={selectedPlaceCategory}
                  onSelectCategory={setSelectedPlaceCategory}
                  onRenamePlace={onRenamePlace}
                  onResolveGeo={onResolveGeo}
                  onBatchResolveUnknown={onBatchResolveUnknown}
                  onOpenRenameModal={handleOpenRenameModal}
                />
              </div>
            )}

            {/* SUB-VIEW 3: INSIGHTS TAB */}
            {activeTab === 'insights' && (
              <div className="p-4">
                <TimelineInsightsTab
                  items={filteredDataset}
                  onSelectPlace={handleSelectWaypoint}
                  onOpenInspector={handleOpenInspector}
                />
              </div>
            )}

            {/* SUB-VIEW 4: CORRELATIONS TAB (Media & Places) */}
            {activeTab === 'correlations' && (
              <div className="p-4">
                <TimelineCorrelationsTab
                  timelineData={processedData || items}
                  onSelectPlace={handleSelectWaypoint}
                  onOpenMapModal={onOpenMapModal}
                  onResolveGeo={onResolveGeo}
                />
              </div>
            )}
          </div>
        )}

        {/* Drag Resizer between Left Timeline Panel and Map */}
        {viewMode === 'split' && (
          <PaneResizer
            isDragging={leftResizer.isDragging}
            onMouseDown={leftResizer.handleMouseDown}
            onTouchStart={leftResizer.handleTouchStart}
            accentColor="blue"
            title="Drag to resize timeline sidebar"
          />
        )}

        {/* Right / Top: Interactive Leaflet Map Engine with Google Maps Styling */}
        {viewMode !== 'list' && (
          <div
            className="h-1/2 md:h-full relative overflow-hidden bg-gray-100 dark:bg-[#1e1e1e] flex-1 z-0 isolate contain-paint"
            style={{
              contain: 'paint layout',
              isolation: 'isolate'
            }}
          >
            <LeafletMap
              containerId="google-timeline-leaflet-map"
              items={mapDisplayItems}
              selectedCoord={selectedCoord}
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectWaypoint}
              onPreviewOpen={onOpenMapModal}
              showRoutes={showRoutes}
              onToggleRoutes={setShowRoutes}
              fitKey={fitKey}
              filterLabel={activeFilterLabel}
              isDark={luminance === 'dark'}
            />
          </div>
        )}

        {/* Right-Side PlaceInspector: Docked in-flow side-by-side with resizer on desktop so it NEVER covers the map */}
        {isInspectorOpen && inspectedItem && (
          <>
            <PaneResizer
              isDragging={inspectorResizer.isDragging}
              onMouseDown={inspectorResizer.handleMouseDown}
              onTouchStart={inspectorResizer.handleTouchStart}
              accentColor="blue"
              title="Drag to resize Place Inspector"
            />
            <div
              style={{
                width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${inspectorResizer.width}px` : undefined
              }}
              className="w-full md:w-auto shrink-0 h-1/2 md:h-full border-t md:border-t-0 md:border-l border-stone-200/80 dark:border-stone-800/80 z-20 flex flex-col min-h-0 bg-white dark:bg-[#12141a] animate-in slide-in-from-right duration-200"
            >
              <PlaceInspector
                item={inspectedItem}
                allItems={allMapsInDataset}
                isOpen={isInspectorOpen}
                onClose={() => setIsInspectorOpen(false)}
                onJumpToDate={onJumpToDate}
                placeNotes={placeNotes}
                onSavePlaceNote={handleSavePlaceNote}
                placeTags={placeTags}
                onAddPlaceTag={handleAddPlaceTag}
                onRemovePlaceTag={handleRemovePlaceTag}
                onRenamePlace={onRenamePlace}
                onResolveGeo={onResolveGeo}
                onOpenRenameModal={handleOpenRenameModal}
              />
            </div>
          </>
        )}

        {/* Custom Place Renaming Modal */}
        {isRenameModalOpen && renameModalItem && (
          <PlaceRenameModal
            item={renameModalItem}
            allItems={allMapsInDataset}
            isOpen={isRenameModalOpen}
            onClose={handleCloseRenameModal}
            onSave={handleSaveRenameModal}
          />
        )}

        {/* Resolved Places Log & Geocoding Explorer Modal */}
        {isPlacesLogOpen && (
          <ResolvedPlacesLogModal
            isOpen={isPlacesLogOpen}
            onClose={() => setIsPlacesLogOpen(false)}
            timelineData={allMapsInDataset}
            onSelectPlace={item => {
              handleOpenInspector(item);
            }}
            onExportClick={() => {
              setIsExportModalOpen(true);
            }}
          />
        )}

        {/* Map Data Export Modal (GeoJSON, KML, CSV, JSON) */}
        {isExportModalOpen && (
          <MapDataExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            timelineData={allMapsInDataset}
            currentDate={currentDate}
          />
        )}
      </div>
    </div>
  );
};
