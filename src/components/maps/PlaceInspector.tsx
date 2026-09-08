import React, { useState, useMemo } from 'react';
import {
  X,
  MapPin,
  ExternalLink,
  Clock,
  Calendar,
  Sparkles,
  BarChart2,
  Copy,
  Check,
  Tag,
  StickyNote,
  Layers,
  ChevronRight,
  Navigation,
  Sun,
  Moon,
  Coffee,
  Sunset,
  Share2,
  Utensils,
  ShoppingBag,
  TreePine,
  Briefcase,
  Home,
  Heart,
  Building,
  BookOpen,
  Edit3,
  Loader2,
  Dumbbell
} from 'lucide-react';
import { TimelineItem } from '../../types';
import { LocationMapView } from './LocationMapView';
import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsUrl,
  formatDuration,
  formatTime,
  getPlaceCategory,
  PlaceCategoryInfo,
  isGenericPlaceName,
  reverseGeocodeItem
} from '../../utils/dataParser';

interface PlaceInspectorProps {
  item: TimelineItem | null;
  allItems: TimelineItem[];
  isOpen: boolean;
  onClose: () => void;
  onJumpToDate?: (date: Date) => void;
  placeNotes?: Record<string, string>;
  onSavePlaceNote?: (placeKey: string, note: string) => void;
  placeTags?: Record<string, string[]>;
  onAddPlaceTag?: (placeKey: string, tag: string) => void;
  onRemovePlaceTag?: (placeKey: string, tag: string) => void;
  onRenamePlace?: (
    targetItem: TimelineItem,
    newName: string,
    applyToAllMatching: boolean,
    newCategory?: string,
    newAddress?: string
  ) => void;
  onResolveGeo?: (lat: number, lng: number) => Promise<void> | void;
  onOpenRenameModal?: (item: TimelineItem) => void;
}

export const PlaceInspector: React.FC<PlaceInspectorProps> = ({
  item,
  allItems,
  isOpen,
  onClose,
  onJumpToDate,
  placeNotes = {},
  onSavePlaceNote,
  placeTags = {},
  onAddPlaceTag,
  onRemovePlaceTag,
  onRenamePlace,
  onResolveGeo,
  onOpenRenameModal
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'map' | 'category' | 'notes'>('analytics');
  const [copyCoordFeedback, setCopyCoordFeedback] = useState(false);
  const [copyAddressFeedback, setCopyAddressFeedback] = useState(false);
  const [copyMdFeedback, setCopyMdFeedback] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineName, setInlineName] = useState('');
  const [inlineApplyAll, setInlineApplyAll] = useState(true);

  if (!isOpen || !item) return null;

  const placeKey = item.title || item.address || `loc_${item.lat}_${item.lng}`;
  const categoryInfo: PlaceCategoryInfo = getPlaceCategory(item);
  const isUnnamed = isGenericPlaceName(item.title);

  const handleTriggerAutoResolve = async () => {
    if (item.lat == null || item.lng == null) return;
    setIsResolving(true);
    try {
      if (onResolveGeo) {
        await onResolveGeo(Number(item.lat), Number(item.lng));
      } else if (onRenamePlace) {
        const res = await reverseGeocodeItem(Number(item.lat), Number(item.lng));
        if (res) {
          onRenamePlace(item, res.name, true, res.category, res.address);
        }
      }
    } catch (e) {
      console.warn('Auto resolve error:', e);
    } finally {
      setIsResolving(false);
    }
  };

  const handleStartInlineEdit = () => {
    setInlineName(item.title || '');
    setIsInlineEditing(true);
  };

  const handleSaveInlineEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineName.trim()) return;
    if (onRenamePlace) {
      onRenamePlace(item, inlineName.trim(), inlineApplyAll);
    }
    setIsInlineEditing(false);
  };

  const handleQuickPreset = (presetName: string, presetCat?: string) => {
    if (onRenamePlace) {
      onRenamePlace(item, presetName, true, presetCat);
    }
  };

  // Compute all visits and statistics for this place across the full history
  const {
    allVisits,
    totalVisits,
    totalDwellMs,
    avgDwellMs,
    firstVisitStr,
    lastVisitStr,
    timeOfDayDistribution,
    dayOfWeekDistribution,
    sameCategoryPlaces
  } = useMemo(() => {
    const visits = allItems.filter(i => {
      if (i.type !== 'maps') return false;
      if (item.title && i.title === item.title) return true;
      if (item.address && i.address && i.address === item.address) return true;
      if (item.lat != null && item.lng != null && i.lat != null && i.lng != null) {
        return Math.abs(Number(item.lat) - Number(i.lat)) < 0.0005 && Math.abs(Number(item.lng) - Number(i.lng)) < 0.0005;
      }
      return false;
    });

    const sortedVisits = [...visits].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    const totalDwell = sortedVisits.reduce((acc, curr) => acc + (curr.ms_played || 0), 0);
    const avgDwell = sortedVisits.length > 0 ? totalDwell / sortedVisits.length : 0;

    const dates = sortedVisits.map(d => new Date(d.ts).getTime()).filter(t => !isNaN(t));
    const firstStr = dates.length > 0 ? new Date(Math.min(...dates)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
    const lastStr = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

    // Time of day breakdown
    const tod = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    const dow = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat

    sortedVisits.forEach(v => {
      const d = v.dateObj || new Date(v.ts);
      const hour = d.getHours();
      if (hour >= 6 && hour < 12) tod.morning++;
      else if (hour >= 12 && hour < 18) tod.afternoon++;
      else if (hour >= 18 && hour < 22) tod.evening++;
      else tod.night++;

      const day = d.getDay();
      dow[day]++;
    });

    // Related places in same category
    const catMap = new Map<string, number>();
    allItems.forEach(i => {
      if (i.type === 'maps' && i.title && i.title !== item.title) {
        const cat = getPlaceCategory(i);
        if (cat.id === categoryInfo.id) {
          catMap.set(i.title, (catMap.get(i.title) || 0) + 1);
        }
      }
    });

    const related = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return {
      allVisits: sortedVisits,
      totalVisits: sortedVisits.length,
      totalDwellMs: totalDwell,
      avgDwellMs: avgDwell,
      firstVisitStr: firstStr,
      lastVisitStr: lastStr,
      timeOfDayDistribution: tod,
      dayOfWeekDistribution: dow,
      sameCategoryPlaces: related
    };
  }, [item, allItems, categoryInfo.id]);

  const maxDow = Math.max(...dayOfWeekDistribution, 1);
  const totalTod = Math.max(
    timeOfDayDistribution.morning +
      timeOfDayDistribution.afternoon +
      timeOfDayDistribution.evening +
      timeOfDayDistribution.night,
    1
  );

  const currentNote = placeNotes[placeKey] || '';
  const currentTags = placeTags[placeKey] || [];

  const handleCopyCoords = () => {
    if (item.lat != null && item.lng != null) {
      navigator.clipboard.writeText(`${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}`);
      setCopyCoordFeedback(true);
      setTimeout(() => setCopyCoordFeedback(false), 1500);
    }
  };

  const handleCopyAddress = () => {
    const addr = item.address || item.subtitle || item.title;
    if (addr) {
      navigator.clipboard.writeText(addr);
      setCopyAddressFeedback(true);
      setTimeout(() => setCopyAddressFeedback(false), 1500);
    }
  };

  const handleCopyMarkdown = () => {
    const coordsStr = item.lat != null && item.lng != null ? `(${item.lat.toFixed(6)}, ${item.lng.toFixed(6)})` : '';
    const md = `### 📍 ${item.title}\n- **Category**: ${categoryInfo.label}\n- **Address**: ${item.address || item.subtitle || 'N/A'}\n- **Coordinates**: ${coordsStr}\n- **Total Visits**: ${totalVisits}\n- **Total Time Spent**: ${formatDuration(totalDwellMs)}\n- **First Visited**: ${firstVisitStr}\n- **Last Visited**: ${lastVisitStr}\n- **Google Maps**: ${buildGoogleMapsUrl(item)}`;
    navigator.clipboard.writeText(md);
    setCopyMdFeedback(true);
    setTimeout(() => setCopyMdFeedback(false), 1500);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    if (onAddPlaceTag) {
      onAddPlaceTag(placeKey, tagInput.trim());
    }
    setTagInput('');
  };

  const gmapsUrl = buildGoogleMapsUrl(item);
  const gmapsEmbed = buildGoogleMapsEmbedUrl(item);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#151515] border-l border-gray-200 dark:border-gray-800 text-xs shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-900/30">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${categoryInfo.bg} ${categoryInfo.color}`}>
                  {categoryInfo.label}
                </span>
                {totalVisits > 1 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                    {totalVisits} Visits
                  </span>
                )}
                {isUnnamed && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Unresolved
                  </span>
                )}
              </div>

              {isInlineEditing ? (
                <form onSubmit={handleSaveInlineEdit} className="mt-1.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={inlineName}
                      onChange={e => setInlineName(e.target.value)}
                      placeholder="Enter place name..."
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <button aria-label="Action"
                      type="submit"
                      disabled={!inlineName.trim()}
                      className="px-2 py-1 bg-[#1A73E8] text-white rounded-lg font-bold text-[11px] hover:bg-blue-600 transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                    <button aria-label="Action"
                      type="button"
                      onClick={() => setIsInlineEditing(false)}
                      className="px-2 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-bold text-[11px] hover:bg-gray-300 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <label className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inlineApplyAll}
                      onChange={e => setInlineApplyAll(e.target.checked)}
                      className="rounded accent-[#1A73E8]"
                    />
                    <span>Apply to all {totalVisits} visits</span>
                  </label>
                </form>
              ) : (
                <div className="flex items-center gap-1.5 mt-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate" title={item.title}>
                    {item.title}
                  </h3>
                  <button
                    onClick={handleStartInlineEdit}
                    className="p-1 text-gray-400 hover:text-[#1A73E8] rounded-md transition-colors cursor-pointer shrink-0"
                    title="Quick rename place"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Unresolved Place Banner */}
        {isUnnamed && (
          <div className="mt-2.5 p-2.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 dark:via-amber-900/10 rounded-xl border border-amber-500/25 flex items-center justify-between gap-2">
            <div className="min-w-0 pr-1">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block">
                Unknown Coordinates
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Reverse geocode to find the venue name or assign a custom label
              </span>
            </div>
            <button aria-label="Action"
              onClick={handleTriggerAutoResolve}
              disabled={isResolving}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-bold text-[11px] shadow-2xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
            >
              {isResolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              <span>{isResolving ? 'Resolving...' : 'Auto-Resolve'}</span>
            </button>
          </div>
        )}

        {/* Address and quick actions */}
        {item.address && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
            {item.address}
          </p>
        )}

        {/* Action Button Bar */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {/* Auto Resolve Button */}
          {item.lat != null && item.lng != null && (
            <button
              onClick={handleTriggerAutoResolve}
              disabled={isResolving}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold text-[11px] transition-colors shadow-xs cursor-pointer"
              title="Reverse geocode place name and address"
            >
              {isResolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              <span>{isResolving ? 'Resolving...' : 'Auto-Resolve'}</span>
            </button>
          )}

          {/* Rename Modal Button */}
          <button aria-label="Action"
            onClick={() => (onOpenRenameModal ? onOpenRenameModal(item) : handleStartInlineEdit())}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[11px] transition-colors shadow-xs cursor-pointer"
            title="Custom rename and label place"
          >
            <Tag className="w-3 h-3" />
            <span>Rename / Label</span>
          </button>

          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-[11px] transition-colors shadow-xs"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={handleCopyCoords}
            className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
            title="Copy Latitude, Longitude"
          >
            {copyCoordFeedback ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copyCoordFeedback ? 'Copied' : 'Coords'}</span>
          </button>
          <button
            onClick={handleCopyAddress}
            className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
            title="Copy Address"
          >
            {copyAddressFeedback ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copyAddressFeedback ? 'Copied' : 'Address'}</span>
          </button>
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
            title="Share / Copy Markdown summary"
          >
            {copyMdFeedback ? <Check className="w-3 h-3 text-emerald-500" /> : <Share2 className="w-3 h-3" />}
            <span>{copyMdFeedback ? 'Copied MD' : 'Share'}</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mt-4 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl">
          <button aria-label="Action"
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-[#1a1a1a] text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
          <button aria-label="Action"
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'map'
                ? 'bg-white dark:bg-[#1a1a1a] text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Map Preview</span>
          </button>
          <button aria-label="Action"
            onClick={() => setActiveTab('category')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'category'
                ? 'bg-white dark:bg-[#1a1a1a] text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Related</span>
          </button>
          <button aria-label="Action"
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'notes'
                ? 'bg-white dark:bg-[#1a1a1a] text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>Notes & Tags</span>
          </button>
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            {/* Route-Specific Metrics if item is a route */}
            {item.isRoute ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                    <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Distance</span>
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                      {item.distanceKm ? `${Number(item.distanceKm).toFixed(2)} km` : (item.distance ? `${(item.distance / 1000).toFixed(2)} km` : 'N/A')}
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                    <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Moving Time</span>
                    <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                      {item.ms_played ? formatDuration(item.ms_played) : 'N/A'}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Transport Mode</span>
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1 capitalize">
                      {item.activityType || item.travelMode || 'Trip'}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">GPS Points</span>
                    <div className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 mt-1">
                      {item.pathPoints?.length || 2} recorded
                    </div>
                  </div>
                </div>

                {/* Origin & Destination Cards */}
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center">A</span>
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Origin</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {item.origin?.address || item.origin?.name || (item.origin?.lat ? `${item.origin.lat.toFixed(5)}, ${item.origin.lng.toFixed(5)}` : 'Start point')}
                    </p>
                  </div>

                  <div className="p-3 bg-red-50/60 dark:bg-red-950/30 rounded-2xl border border-red-100 dark:border-red-900/40">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[9px] flex items-center justify-center">B</span>
                      <span className="text-[10px] font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">Destination</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {item.destination?.address || item.destination?.name || (item.destination?.lat ? `${item.destination.lat.toFixed(5)}, ${item.destination.lng.toFixed(5)}` : 'End point')}
                    </p>
                  </div>
                </div>

                {/* Path Points List if available */}
                {item.pathPoints && item.pathPoints.length > 0 && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                      Route Trajectory Coordinates ({item.pathPoints.length} points)
                    </span>
                    <div className="max-h-40 overflow-y-auto space-y-1 text-[10px] font-mono">
                      {item.pathPoints.slice(0, 50).map((pt, idx) => (
                        <div key={idx} className="flex justify-between items-center text-gray-600 dark:text-gray-400 py-0.5 border-b border-gray-100 dark:border-gray-800/40">
                          <span>#{idx + 1}</span>
                          <span>{pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Place Quick Naming & Custom Labels Section */}
                <div className="p-3 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 tracking-wider flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#1A73E8]" />
                      <span>Quick Label Preset</span>
                    </span>
                    <button aria-label="Action"
                      onClick={() => (onOpenRenameModal ? onOpenRenameModal(item) : handleStartInlineEdit())}
                      className="text-[10px] font-bold text-[#1A73E8] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Custom Name</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'Home', cat: 'home', icon: Home },
                      { name: 'Office', cat: 'work', icon: Briefcase },
                      { name: 'Gym', cat: 'health', icon: Dumbbell },
                      { name: 'Cafe', cat: 'food', icon: Coffee },
                      { name: 'Supermarket', cat: 'shopping', icon: ShoppingBag },
                      { name: 'Restaurant', cat: 'food', icon: Utensils }
                    ].map(preset => {
                      const IconC = preset.icon;
                      const isCurr = item.title === preset.name;
                      return (
                        <button aria-label="Action"
                          key={preset.name}
                          type="button"
                          onClick={() => handleQuickPreset(preset.name, preset.cat)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                            isCurr
                              ? 'bg-[#1A73E8] text-white border-[#1A73E8] shadow-xs'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:text-[#1A73E8]'
                          }`}
                        >
                          <IconC className="w-3 h-3" />
                          <span>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4-Stat Metric Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Visits</span>
                    <div className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{totalVisits}</div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Dwell Time</span>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {totalDwellMs > 0 ? formatDuration(totalDwellMs) : '< 10m'}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Avg Duration</span>
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1">
                      {avgDwellMs > 0 ? formatDuration(avgDwellMs) : 'Brief visit'}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Coordinates</span>
                    <div className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 mt-1 truncate">
                      {item.lat != null && item.lng != null ? `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}` : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* First & Last Visited */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                    <span className="text-gray-400 font-semibold">First Visited:</span>
                    <span className="font-bold">{firstVisitStr}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800 pt-1.5">
                    <span className="text-gray-400 font-semibold">Most Recent:</span>
                    <span className="font-bold">{lastVisitStr}</span>
                  </div>
                </div>

                {/* Time of Day Distribution */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                    Time of Day Distribution
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-amber-500 font-semibold">
                        <Sun className="w-3 h-3" />
                        <span>Morning</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all"
                          style={{ width: `${(timeOfDayDistribution.morning / totalTod) * 100}%` }}
                        />
                      </div>
                      <div className="font-bold text-gray-700 dark:text-gray-300 font-mono">
                        {timeOfDayDistribution.morning}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-orange-500 font-semibold">
                        <Coffee className="w-3 h-3" />
                        <span>Afternoon</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="bg-orange-500 h-full rounded-full transition-all"
                          style={{ width: `${(timeOfDayDistribution.afternoon / totalTod) * 100}%` }}
                        />
                      </div>
                      <div className="font-bold text-gray-700 dark:text-gray-300 font-mono">
                        {timeOfDayDistribution.afternoon}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-indigo-500 font-semibold">
                        <Sunset className="w-3 h-3" />
                        <span>Evening</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all"
                          style={{ width: `${(timeOfDayDistribution.evening / totalTod) * 100}%` }}
                        />
                      </div>
                      <div className="font-bold text-gray-700 dark:text-gray-300 font-mono">
                        {timeOfDayDistribution.evening}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-purple-500 font-semibold">
                        <Moon className="w-3 h-3" />
                        <span>Night</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full transition-all"
                          style={{ width: `${(timeOfDayDistribution.night / totalTod) * 100}%` }}
                        />
                      </div>
                      <div className="font-bold text-gray-700 dark:text-gray-300 font-mono">
                        {timeOfDayDistribution.night}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Day of Week Frequency */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Day of Week Frequency
              </span>
              <div className="flex items-end justify-between h-14 pt-2 gap-1.5">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                  const count = dayOfWeekDistribution[idx];
                  const heightPct = Math.max(10, (count / maxDow) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-t-sm flex items-end justify-center overflow-hidden h-full">
                        <div
                          className="w-full bg-blue-500 hover:bg-blue-600 transition-all rounded-t-sm"
                          style={{ height: `${heightPct}%` }}
                          title={`${day}: ${count} visits`}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-gray-400">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Historic Visits Timeline Log */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Historic Visits ({allVisits.length})
                </span>
                <span className="text-[10px] text-gray-400">Click to jump to date</span>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {allVisits.map((v, idx) => {
                  const vDate = v.dateObj || new Date(v.ts);
                  const isCurrent = v.id === item.id;
                  return (
                    <div
                      key={v.id || idx}
                      onClick={() => {
                        if (onJumpToDate) onJumpToDate(vDate);
                      }}
                      className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-all border ${
                        isCurrent
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold'
                          : 'bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-800/80 border-gray-100 dark:border-gray-800/60 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate text-[11px]">
                          {vDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                          {formatTime(vDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {v.ms_played ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200/80 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {formatDuration(v.ms_played)}
                          </span>
                        ) : null}
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 aspect-video bg-gray-100 dark:bg-gray-900 relative">
              <LocationMapView
                lat={item.lat}
                lng={item.lng}
                title={item.title}
                subtitle={item.subtitle || item.address}
                externalUrl={gmapsUrl}
                category={categoryInfo.label}
                className="w-full h-full border-0"
                showControls={true}
              />
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Place Coordinates</span>
              <div className="flex items-center justify-between text-xs font-mono font-bold text-gray-800 dark:text-gray-200">
                <span>Latitude: {item.lat != null ? item.lat.toFixed(6) : 'N/A'}</span>
                <span>Longitude: {item.lng != null ? item.lng.toFixed(6) : 'N/A'}</span>
              </div>
            </div>

            <a
              href={gmapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <span>Explore on Google Maps Full View</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {activeTab === 'category' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-gray-50 dark:bg-gray-900/50 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`p-2 rounded-xl ${categoryInfo.bg} ${categoryInfo.color}`}>
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-xs">{categoryInfo.label} Category</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Automatically classified based on Google semantic signals & location markers
                  </p>
                </div>
              </div>
            </div>

            {sameCategoryPlaces.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Other {categoryInfo.label} Places You Visited
                </span>
                <div className="space-y-1.5">
                  {sameCategoryPlaces.map(([title, count]) => (
                    <div
                      key={title}
                      className="p-2.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-800/60"
                    >
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate pr-2 text-[11px]">{title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold shrink-0">
                        {count} visits
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4">
            {/* Custom Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                <span>Place Notes & Memories</span>
              </label>
              <textarea
                rows={4}
                value={currentNote}
                onChange={e => {
                  if (onSavePlaceNote) {
                    onSavePlaceNote(placeKey, e.target.value);
                  }
                }}
                placeholder="Write your private notes, recommendations, or favorite items for this place..."
                className="w-full p-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            {/* Custom Tags */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                <span>Custom Tags</span>
              </label>

              {/* Tag Badges */}
              <div className="flex flex-wrap gap-1.5 min-h-6">
                {currentTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[11px] border border-blue-500/20"
                  >
                    <span>#{tag}</span>
                    <button aria-label="Action"
                      onClick={() => onRemovePlaceTag && onRemovePlaceTag(placeKey, tag)}
                      className="hover:text-red-500 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Tag Input Form */}
              <form onSubmit={handleAddTag} className="flex gap-1.5">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder="Add a tag (e.g. coffee, wifi, cozy)..."
                  className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button aria-label="Action"
                  type="submit"
                  disabled={!tagInput.trim()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Add
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
