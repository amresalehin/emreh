import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MapPin,
  Sparkles,
  ExternalLink,
  Check,
  Tag,
  Home,
  Briefcase,
  Dumbbell,
  Coffee,
  ShoppingBag,
  GraduationCap,
  Utensils,
  Building,
  Plane,
  TreePine,
  HeartPulse,
  Layers,
  Loader2
} from 'lucide-react';
import { TimelineItem } from '../../types';
import {
  buildGoogleMapsUrl,
  reverseGeocodeItem,
  getPlaceCategory,
  PlaceCategoryInfo
} from '../../utils/dataParser';

interface PlaceRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem: TimelineItem | null;
  allItems: TimelineItem[];
  onSaveRename: (
    targetItem: TimelineItem,
    newName: string,
    applyToAllMatching: boolean,
    newCategory?: string,
    newAddress?: string
  ) => void;
}

const PRESET_LABELS = [
  { label: 'Home', icon: Home, category: 'home', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800' },
  { label: 'Office / Work', icon: Briefcase, category: 'work', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800' },
  { label: 'Gym / Fitness', icon: Dumbbell, category: 'health', color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800' },
  { label: 'Cafe / Coffee', icon: Coffee, category: 'food', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800' },
  { label: 'Supermarket / Grocery', icon: ShoppingBag, category: 'shopping', color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800' },
  { label: 'School / Campus', icon: GraduationCap, category: 'education', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800' },
  { label: 'Restaurant / Dining', icon: Utensils, category: 'food', color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800' },
  { label: 'Hotel / Lodging', icon: Building, category: 'lodging', color: 'text-amber-800 bg-amber-100/60 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800' },
  { label: 'Airport / Transit', icon: Plane, category: 'transit', color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800' },
  { label: 'Park / Outdoors', icon: TreePine, category: 'outdoors', color: 'text-green-600 bg-green-50 dark:bg-green-950/60 border-green-200 dark:border-green-800' },
  { label: 'Hospital / Clinic', icon: HeartPulse, category: 'health', color: 'text-red-500 bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800' }
];

const CATEGORIES = [
  { id: 'places', label: 'General Place' },
  { id: 'food', label: 'Food & Drink' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'work', label: 'Work & Office' },
  { id: 'home', label: 'Home' },
  { id: 'outdoors', label: 'Parks & Nature' },
  { id: 'culture', label: 'Attractions' },
  { id: 'health', label: 'Health & Fitness' },
  { id: 'education', label: 'Education' },
  { id: 'lodging', label: 'Lodging' },
  { id: 'transit', label: 'Transit & Travel' }
];

export const PlaceRenameModal: React.FC<PlaceRenameModalProps> = ({
  isOpen,
  onClose,
  targetItem,
  allItems,
  onSaveRename
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('places');
  const [applyToAll, setApplyToAll] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveSuccess, setResolveSuccess] = useState(false);

  useEffect(() => {
    if (targetItem) {
      setName(targetItem.title || '');
      setAddress(targetItem.address || targetItem.subtitle || '');
      const cat = getPlaceCategory(targetItem);
      setCategory(cat.id || 'places');
      setResolveSuccess(false);
    }
  }, [targetItem]);

  // Find all matching visits for this location
  const matchingVisitsCount = useMemo(() => {
    if (!targetItem) return 1;
    return allItems.filter(i => {
      if (i.type !== 'maps') return false;
      if (targetItem.placeId && i.placeId && targetItem.placeId === i.placeId) return true;
      if (targetItem.lat != null && targetItem.lng != null && i.lat != null && i.lng != null) {
        return (
          Math.abs(Number(targetItem.lat) - Number(i.lat)) < 0.0008 &&
          Math.abs(Number(targetItem.lng) - Number(i.lng)) < 0.0008
        );
      }
      if (targetItem.title && i.title === targetItem.title) return true;
      return false;
    }).length;
  }, [targetItem, allItems]);

  if (!isOpen || !targetItem) return null;

  const handleAutoResolve = async () => {
    if (targetItem.lat == null || targetItem.lng == null) return;
    setIsResolving(true);
    setResolveSuccess(false);
    try {
      const resolved = await reverseGeocodeItem(Number(targetItem.lat), Number(targetItem.lng));
      if (resolved) {
        if (resolved.name) setName(resolved.name);
        if (resolved.address) setAddress(resolved.address);
        if (resolved.category) setCategory(resolved.category);
        setResolveSuccess(true);
      }
    } catch (err) {
      console.warn('Auto resolve error in modal:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const handleSelectPreset = (preset: (typeof PRESET_LABELS)[0]) => {
    setName(preset.label);
    setCategory(preset.category);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSaveRename(targetItem, name.trim(), applyToAll, category, address.trim() || undefined);
    onClose();
  };

  const gmapsUrl = buildGoogleMapsUrl(targetItem);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#181818] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh] text-xs"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#1A73E8]/10 text-[#1A73E8] flex items-center justify-center shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Resolve & Rename Place
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Assign a custom name, preset, or auto-resolve location details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Current GPS & Google Maps Location Box */}
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                <MapPin className="w-3 h-3" />
                <span>GPS Coordinates</span>
              </div>
              <p className="font-mono font-bold text-gray-800 dark:text-gray-200 text-xs mt-0.5 truncate">
                {targetItem.lat != null && targetItem.lng != null
                  ? `${targetItem.lat.toFixed(5)}, ${targetItem.lng.toFixed(5)}`
                  : 'Coordinates N/A'}
              </p>
            </div>
            <a
              href={gmapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/50 text-[#1A73E8] rounded-xl font-bold text-[11px] border border-blue-200 dark:border-blue-800 shadow-2xs transition-colors flex items-center gap-1 shrink-0"
              title="Open coordinate on Google Maps"
            >
              <span>View on Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Quick 1-Click Presets */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Quick Preset Labels
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_LABELS.map(preset => {
                const IconComponent = preset.icon;
                const isSelected = name === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1A73E8] text-white border-[#1A73E8] shadow-xs'
                        : `${preset.color} hover:opacity-90`
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reverse Geocoding Action */}
          <div className="p-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/30 dark:via-teal-950/10 rounded-2xl border border-emerald-500/20 flex items-center justify-between gap-2">
            <div className="min-w-0 pr-2">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Auto-Resolve with Reverse Geocoding</span>
              </span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                Automatically fetches the building name, business, and street address from satellite and location databases
              </p>
            </div>
            <button
              type="button"
              onClick={handleAutoResolve}
              disabled={isResolving || targetItem.lat == null || targetItem.lng == null}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              {isResolving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Looking up...</span>
                </>
              ) : resolveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Resolved!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Resolve</span>
                </>
              )}
            </button>
          </div>

          {/* Place Name Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <span>Place Name / Label *</span>
              <span className="text-gray-400 font-normal">e.g. My Apartment, Blue Bottle Coffee</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter custom place name..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          {/* Category Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#1A73E8]" />
              <span>Place Category</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Address / Location Details */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Street Address / Subtitle (Optional)
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St, New York, NY"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Bulk Update Toggle */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="font-bold text-gray-900 dark:text-white text-xs block">
                Update All Matching Visits
              </span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Automatically rename all {matchingVisitsCount} recorded visits at this location in your timeline
              </p>
            </div>
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={e => setApplyToAll(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded accent-[#1A73E8] cursor-pointer shrink-0"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 bg-[#1A73E8] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Place Name</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
