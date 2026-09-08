import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  ArrowRight,
  X,
  Headphones,
  Youtube,
  MapPin,
  Globe,
  StickyNote,
  BookOpen,
  Calendar,
  CalendarRange,
  RotateCcw,
  Check,
  Clock,
  Smartphone,
  Activity,
  Bookmark,
  Box,
  HardDrive
} from 'lucide-react';
import { TimelineItem, CalendarEvent, DateRange } from '../types';

export type CalendarModalMode = 'all' | 'journal' | 'spotify' | 'youtube' | 'maps' | 'browser' | 'notes' | 'photos' | 'bookmarks' | 'box' | 'gdrive' | 'fit' | 'screentime';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  dateRange?: DateRange | null;
  onSelectDateRange?: (range: DateRange | null) => void;
  dateIndexMap: Map<string, TimelineItem[]>;
  mode?: CalendarModalMode;
  dailyNotesMap?: Record<string, string>;
  calendarEvents?: CalendarEvent[];
  initialTab?: 'single' | 'range';
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  onSelectDate,
  dateRange,
  onSelectDateRange,
  dateIndexMap,
  mode = 'all',
  dailyNotesMap = {},
  calendarEvents = [],
  initialTab = 'single'
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'range'>(initialTab);
  const [pickerDate, setPickerDate] = useState<Date>(new Date(currentDate));
  const [isGoToOpen, setIsGoToOpen] = useState(false);
  const [typedDate, setTypedDate] = useState('');
  const [typeError, setTypeError] = useState(false);

  // Date Range state
  const [rangeStart, setRangeStart] = useState<string>(dateRange?.startDate || '');
  const [rangeEnd, setRangeEnd] = useState<string>(dateRange?.endDate || '');
  const [hoverDateKey, setHoverDateKey] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPickerDate(new Date(currentDate));
      setIsGoToOpen(false);
      setTypedDate('');
      setTypeError(false);
      setActivePreset(null);
      setActiveTab(initialTab || (dateRange ? 'range' : 'single'));
      if (dateRange) {
        setRangeStart(dateRange.startDate);
        setRangeEnd(dateRange.endDate);
      } else {
        const dKey = getDateKey(currentDate);
        setRangeStart(dKey);
        setRangeEnd(dKey);
      }
    }
  }, [isOpen, currentDate, initialTab, dateRange]);

  const year = pickerDate.getFullYear();
  const month = pickerDate.getMonth();
  const monthTitle = pickerDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function getDateKey(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const currKey = getDateKey(currentDate);
  const todayKey = getDateKey(new Date());

  const handlePrevMonth = () => {
    const d = new Date(pickerDate);
    d.setMonth(d.getMonth() - 1);
    setPickerDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(pickerDate);
    d.setMonth(d.getMonth() + 1);
    setPickerDate(d);
  };

  const handleGoToday = () => {
    const today = new Date();
    setPickerDate(new Date(today));
    if (activeTab === 'single') {
      onSelectDate(today);
      if (onSelectDateRange) onSelectDateRange(null);
      onClose();
    } else {
      const k = getDateKey(today);
      setRangeStart(k);
      setRangeEnd(k);
    }
  };

  const handleTypeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTypeError(false);
    if (!typedDate.trim()) return;
    const clean = typedDate.trim().toLowerCase();
    let d: Date | null = null;
    const today = new Date();
    if (clean === 'today') d = today;
    else if (clean === 'yesterday') {
      d = new Date(today);
      d.setDate(d.getDate() - 1);
    } else {
      const parsed = new Date(clean);
      if (!isNaN(parsed.getTime())) d = parsed;
    }
    if (d && !isNaN(d.getTime())) {
      onSelectDate(d);
      if (onSelectDateRange) onSelectDateRange(null);
      setTypedDate('');
      onClose();
    } else {
      setTypeError(true);
    }
  };

  // Mode configuration
  const modeConfig = useMemo(() => {
    switch (mode) {
      case 'spotify':
        return {
          title: 'Spotify Listening Calendar',
          subtitle: 'Select days or date range with music history',
          icon: <Headphones className="w-4 h-4 text-emerald-500" />,
          accentBg: 'bg-emerald-500',
          accentText: 'text-emerald-500',
          accentBgSoft: 'bg-emerald-500/10',
          badgeText: 'text-emerald-600 dark:text-emerald-400',
          itemFilter: (item: TimelineItem) => item.type === 'spotify',
          unitLabel: 'plays'
        };
      case 'youtube':
        return {
          title: 'YouTube Watch Calendar',
          subtitle: 'Select days or date range with video watch history',
          icon: <Youtube className="w-4 h-4 text-red-500" />,
          accentBg: 'bg-red-500',
          accentText: 'text-red-500',
          accentBgSoft: 'bg-red-500/10',
          badgeText: 'text-red-600 dark:text-red-400',
          itemFilter: (item: TimelineItem) => item.type === 'youtube',
          unitLabel: 'videos'
        };
      case 'maps':
        return {
          title: 'Location & Travel Calendar',
          subtitle: 'Select days or date range with places & GPS trips',
          icon: <MapPin className="w-4 h-4 text-blue-500" />,
          accentBg: 'bg-blue-500',
          accentText: 'text-blue-500',
          accentBgSoft: 'bg-blue-500/10',
          badgeText: 'text-blue-600 dark:text-blue-400',
          itemFilter: (item: TimelineItem) => item.type === 'maps',
          unitLabel: 'places'
        };
      case 'browser':
        return {
          title: 'Browsing Activity Calendar',
          subtitle: 'Select days or date range with web visits',
          icon: <Globe className="w-4 h-4 text-cyan-500" />,
          accentBg: 'bg-cyan-500',
          accentText: 'text-cyan-500',
          accentBgSoft: 'bg-cyan-500/10',
          badgeText: 'text-cyan-600 dark:text-cyan-400',
          itemFilter: (item: TimelineItem) => item.type === 'browser',
          unitLabel: 'visits'
        };
      case 'notes':
        return {
          title: 'Diary & Notes Calendar',
          subtitle: 'Select days or date range with diary logs',
          icon: <StickyNote className="w-4 h-4 text-amber-500" />,
          accentBg: 'bg-amber-500',
          accentText: 'text-amber-500',
          accentBgSoft: 'bg-amber-500/10',
          badgeText: 'text-amber-600 dark:text-amber-400',
          itemFilter: () => false,
          unitLabel: 'notes'
        };
      case 'photos':
        return {
          title: 'Google Photos Calendar',
          subtitle: 'Select days or date range with photo memories',
          icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 2a5 5 0 0 0-5 5v5h5a5 5 0 0 0 0-10z" />
              <path fill="#FBBC05" d="M22 12a5 5 0 0 0-5-5h-5v5a5 5 0 0 0 10 0z" />
              <path fill="#34A853" d="M12 22a5 5 0 0 0 5-5v-5h-5a5 5 0 0 0 0 10z" />
              <path fill="#4285F4" d="M2 12a5 5 0 0 0 5 5h5v-5a5 5 0 0 0-10 0z" />
            </svg>
          ),
          accentBg: 'bg-rose-500',
          accentText: 'text-rose-500',
          accentBgSoft: 'bg-rose-500/10',
          badgeText: 'text-rose-600 dark:text-rose-400',
          itemFilter: (item: TimelineItem) => item.type === 'photo',
          unitLabel: 'photos'
        };
      case 'screentime':
        return {
          title: 'Screen Time Activity Calendar',
          subtitle: 'Select days or date range with device activity',
          icon: <Smartphone className="w-4 h-4 text-violet-500" />,
          accentBg: 'bg-violet-600',
          accentText: 'text-violet-500',
          accentBgSoft: 'bg-violet-500/10',
          badgeText: 'text-violet-600 dark:text-violet-400',
          itemFilter: (item: TimelineItem) => item.type === 'browser' || item.type === 'youtube' || item.type === 'spotify',
          unitLabel: 'records'
        };
      case 'fit':
        return {
          title: 'Google Fit Calendar',
          subtitle: 'Select days or date range with fitness & health data',
          icon: <Activity className="w-4 h-4 text-emerald-500" />,
          accentBg: 'bg-emerald-500',
          accentText: 'text-emerald-500',
          accentBgSoft: 'bg-emerald-500/10',
          badgeText: 'text-emerald-600 dark:text-emerald-400',
          itemFilter: () => false,
          unitLabel: 'activities'
        };
      case 'bookmarks':
        return {
          title: 'Browser Bookmarks Calendar',
          subtitle: 'Select days or date range with bookmarks saved',
          icon: <Bookmark className="w-4 h-4 text-teal-500" />,
          accentBg: 'bg-teal-500',
          accentText: 'text-teal-500',
          accentBgSoft: 'bg-teal-500/10',
          badgeText: 'text-teal-600 dark:text-teal-400',
          itemFilter: () => false,
          unitLabel: 'bookmarks'
        };
      case 'box':
        return {
          title: 'Box Cloud Storage Calendar',
          subtitle: 'Select days or date range with Box file events',
          icon: <Box className="w-4 h-4 text-blue-600" />,
          accentBg: 'bg-blue-600',
          accentText: 'text-blue-500',
          accentBgSoft: 'bg-blue-500/10',
          badgeText: 'text-blue-600 dark:text-blue-400',
          itemFilter: () => false,
          unitLabel: 'files'
        };
      case 'gdrive':
        return {
          title: 'Google Drive Calendar',
          subtitle: 'Select days or date range with Drive file events',
          icon: <HardDrive className="w-4 h-4 text-amber-500" />,
          accentBg: 'bg-amber-600',
          accentText: 'text-amber-500',
          accentBgSoft: 'bg-amber-500/10',
          badgeText: 'text-amber-600 dark:text-amber-400',
          itemFilter: () => false,
          unitLabel: 'files'
        };
      case 'journal':
      default:
        return {
          title: 'Journal Timeline Calendar',
          subtitle: 'Daily composite logs and activities',
          icon: <BookOpen className="w-4 h-4 text-emerald-500" />,
          accentBg: 'bg-emerald-500',
          accentText: 'text-emerald-500',
          accentBgSoft: 'bg-emerald-500/10',
          badgeText: 'text-emerald-600 dark:text-emerald-400',
          itemFilter: () => true,
          unitLabel: 'events'
        };
    }
  }, [mode]);

  // Helper to get count for a specific dateKey based on mode
  const getDayCount = (dateKey: string) => {
    if (mode === 'notes') {
      const note = dailyNotesMap[dateKey];
      return typeof note === 'string' && note.trim().length > 0 ? 1 : 0;
    }
    const items = dateIndexMap.get(dateKey) || [];
    if (mode === 'journal' || mode === 'all') {
      const eventsCount = calendarEvents.filter(e => e.date === dateKey).length;
      return items.length + eventsCount;
    }
    return items.filter(modeConfig.itemFilter).length;
  };

  // Recent active days list for quick jump
  const recentActiveDays = useMemo(() => {
    const days: { dateKey: string; count: number; date: Date }[] = [];
    if (mode === 'notes') {
      Object.entries(dailyNotesMap).forEach(([k, text]) => {
        if (typeof text === 'string' && text.trim().length > 0) {
          days.push({ dateKey: k, count: 1, date: new Date(k + 'T00:00:00') });
        }
      });
    } else {
      dateIndexMap.forEach((items, k) => {
        const filtered = mode === 'journal' || mode === 'all' ? items : items.filter(modeConfig.itemFilter);
        if (filtered.length > 0) {
          days.push({ dateKey: k, count: filtered.length, date: new Date(k + 'T00:00:00') });
        }
      });
    }
    return days.sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 4);
  }, [dateIndexMap, dailyNotesMap, mode, modeConfig]);

  // Total range items count calculation
  const totalRangeCount = useMemo(() => {
    if (!rangeStart || !rangeEnd) return 0;
    const startK = rangeStart < rangeEnd ? rangeStart : rangeEnd;
    const endK = rangeStart < rangeEnd ? rangeEnd : rangeStart;
    let total = 0;
    if (mode === 'notes') {
      Object.entries(dailyNotesMap).forEach(([k, text]) => {
        if (k >= startK && k <= endK && typeof text === 'string' && text.trim().length > 0) {
          total++;
        }
      });
    } else {
      dateIndexMap.forEach((items, k) => {
        if (k >= startK && k <= endK) {
          const filtered = mode === 'journal' || mode === 'all' ? items : items.filter(modeConfig.itemFilter);
          total += filtered.length;
        }
      });
    }
    return total;
  }, [rangeStart, rangeEnd, dateIndexMap, dailyNotesMap, mode, modeConfig]);

  // Calculate range days span
  const rangeDaysCount = useMemo(() => {
    if (!rangeStart || !rangeEnd) return 1;
    const s = new Date(rangeStart + 'T00:00:00').getTime();
    const e = new Date(rangeEnd + 'T00:00:00').getTime();
    if (isNaN(s) || isNaN(e)) return 1;
    const diff = Math.abs(e - s);
    return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [rangeStart, rangeEnd]);

  // Preset Date Range Handlers
  const applyPreset = (preset: 'today' | 'yesterday' | 'last7' | 'last14' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'allTime') => {
    setActivePreset(preset);
    const today = new Date();
    const todayK = getDateKey(today);

    let start = todayK;
    let end = todayK;

    if (preset === 'today') {
      start = todayK;
      end = todayK;
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      start = getDateKey(y);
      end = getDateKey(y);
    } else if (preset === 'last7') {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      start = getDateKey(d);
      end = todayK;
    } else if (preset === 'last14') {
      const d = new Date(today);
      d.setDate(d.getDate() - 13);
      start = getDateKey(d);
      end = todayK;
    } else if (preset === 'last30') {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      start = getDateKey(d);
      end = todayK;
    } else if (preset === 'thisMonth') {
      const d1 = new Date(today.getFullYear(), today.getMonth(), 1);
      const d2 = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      start = getDateKey(d1);
      end = getDateKey(d2);
    } else if (preset === 'lastMonth') {
      const d1 = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const d2 = new Date(today.getFullYear(), today.getMonth(), 0);
      start = getDateKey(d1);
      end = getDateKey(d2);
    } else if (preset === 'thisYear') {
      start = `${today.getFullYear()}-01-01`;
      end = `${today.getFullYear()}-12-31`;
    } else if (preset === 'allTime') {
      const allKeys: string[] = [];
      dateIndexMap.forEach((_, k) => allKeys.push(k));
      Object.keys(dailyNotesMap).forEach(k => allKeys.push(k));
      allKeys.sort();
      if (allKeys.length > 0) {
        start = allKeys[0];
        end = allKeys[allKeys.length - 1];
      }
    }

    setRangeStart(start);
    setRangeEnd(end);
    setPickerDate(new Date(start + 'T00:00:00'));
  };

  // Handle Day Click in Range or Single Tab
  const handleDayClick = (dObj: Date, dateKey: string) => {
    if (activeTab === 'single') {
      onSelectDate(dObj);
      if (onSelectDateRange) onSelectDateRange(null);
      onClose();
    } else {
      // In Range mode: Click 1 sets start, Click 2 sets end
      setActivePreset(null);
      if (!rangeStart || (rangeStart && rangeEnd && rangeStart !== rangeEnd)) {
        setRangeStart(dateKey);
        setRangeEnd(dateKey);
      } else {
        if (dateKey < rangeStart) {
          setRangeEnd(rangeStart);
          setRangeStart(dateKey);
        } else {
          setRangeEnd(dateKey);
        }
      }
    }
  };

  const handleApplyRange = () => {
    if (!rangeStart || !rangeEnd) return;
    const start = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
    const end = rangeStart <= rangeEnd ? rangeEnd : rangeStart;

    if (onSelectDateRange) {
      onSelectDateRange({ startDate: start, endDate: end });
    }
    // Also sync currentDate with start date
    onSelectDate(new Date(start + 'T00:00:00'));
    onClose();
  };

  const handleClearRange = () => {
    setActivePreset(null);
    if (onSelectDateRange) {
      onSelectDateRange(null);
    }
    onClose();
  };

  if (!isOpen) return null;

  const currentActiveStart = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
  const currentActiveEnd = rangeStart <= rangeEnd ? rangeEnd : rangeStart;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="bg-white dark:bg-[#151515] rounded-3xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto relative z-10 flex flex-col border border-gray-200 dark:border-gray-800 p-4 sm:p-5 space-y-3">
        
        {/* Modal Top Header with Mode Branding & Close */}
        <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-xl ${modeConfig.accentBgSoft}`}>
              {modeConfig.icon}
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                {modeConfig.title}
              </h3>
              <p className="text-[10px] text-gray-400 leading-tight">
                {modeConfig.subtitle}
              </p>
            </div>
          </div>
          <button aria-label="Action"
            onClick={onClose}
            className="w-7 h-7 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Switcher: Single Day vs Date Range */}
        <div className="flex bg-gray-100 dark:bg-[#1f1f1f] p-1 rounded-2xl border border-gray-200/80 dark:border-gray-800">
          <button aria-label="Action"
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'single'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Single Day</span>
          </button>
          <button aria-label="Action"
            onClick={() => setActiveTab('range')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'range'
                ? `${modeConfig.accentBg} text-white shadow-xs`
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Date Range Picker</span>
            {dateRange && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </button>
        </div>

        {/* Single Day helper notice to discover range mode */}
        {activeTab === 'single' && (
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1a1a1a] px-3 py-2 rounded-2xl border border-gray-200/80 dark:border-gray-800">
            <span className="flex items-center gap-1.5 text-[11px]">
              <CalendarRange className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              Filter by date range instead?
            </span>
            <button aria-label="Action"
              onClick={() => setActiveTab('range')}
              className={`font-bold text-xs ${modeConfig.badgeText} hover:underline flex items-center gap-1 cursor-pointer`}
            >
              <span>Date Range Presets</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Range Presets Bar (when in Date Range mode) */}
        {activeTab === 'range' && (
          <div className="space-y-2.5 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl border border-gray-200/80 dark:border-gray-800">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-0.5">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" /> Quick Presets
              </span>
              {rangeDaysCount > 0 && rangeStart && rangeEnd && (
                <span className={`${modeConfig.badgeText} font-mono font-bold`}>
                  {rangeDaysCount} Day{rangeDaysCount > 1 ? 's' : ''} ({totalRangeCount} {modeConfig.unitLabel})
                </span>
              )}
            </div>

            {/* Prominent Quick Preset Buttons */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'last7', label: 'Last 7 Days' },
                { id: 'thisMonth', label: 'This Month' },
                { id: 'thisYear', label: 'This Year' },
                { id: 'last30', label: 'Last 30 Days' },
                { id: 'lastMonth', label: 'Last Month' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'allTime', label: 'All Time' }
              ].map(p => {
                const isActive = activePreset === p.id;
                return (
                  <button aria-label="Action"
                    key={p.id}
                    onClick={() => applyPreset(p.id as any)}
                    className={`px-2 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                      isActive
                        ? `${modeConfig.accentBg} text-white shadow-xs scale-[1.02]`
                        : 'bg-white dark:bg-[#242424] hover:bg-gray-100 dark:hover:bg-[#2e2e2e] text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700/80'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Manual Start / End inputs */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-800">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={e => {
                    setRangeStart(e.target.value);
                    setActivePreset(null);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={e => {
                    setRangeEnd(e.target.value);
                    setActivePreset(null);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Month Navigator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <button aria-label="Action"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button aria-label="Action"
              onClick={() => setIsGoToOpen(!isGoToOpen)}
              className="flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded-xl transition-colors cursor-pointer"
            >
              <span className="text-xs font-bold text-gray-900 dark:text-white tracking-tight">{monthTitle}</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            <button aria-label="Action"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button aria-label="Action"
            onClick={handleGoToday}
            className={`px-2.5 py-1 ${modeConfig.accentBgSoft} ${modeConfig.badgeText} rounded-lg text-[11px] font-semibold transition-colors cursor-pointer`}
          >
            Today
          </button>
        </div>

        {/* Go to Date Popup */}
        {isGoToOpen && (
          <div className="bg-gray-50 dark:bg-[#181818] border border-gray-200 dark:border-gray-800 rounded-2xl p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Month</label>
                <select
                  value={pickerDate.getMonth()}
                  onChange={(e) => {
                    const d = new Date(pickerDate);
                    d.setMonth(parseInt(e.target.value, 10));
                    setPickerDate(d);
                  }}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 outline-none"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Year</label>
                <select
                  value={pickerDate.getFullYear()}
                  onChange={(e) => {
                    const d = new Date(pickerDate);
                    d.setFullYear(parseInt(e.target.value, 10));
                    setPickerDate(d);
                  }}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 outline-none"
                >
                  {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() + 2 - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Single Day Search Box (only in Single Day mode) */}
        {activeTab === 'single' && (
          <>
            <form onSubmit={handleTypeSubmit} className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-gray-400" />
              <input
                type="text"
                placeholder="Jump to date (e.g. May 15, 2025, yesterday)..."
                value={typedDate}
                onChange={(e) => {
                  setTypedDate(e.target.value);
                  setTypeError(false);
                }}
                className="w-full pl-8 pr-7 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-400"
              />
              <button aria-label="Action" type="submit" className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 cursor-pointer">
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
            {typeError && <div className="text-[10px] text-red-500 ml-1 font-medium">Date format not recognized</div>}
          </>
        )}

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 text-center">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <span key={d} className="text-[10px] font-bold text-gray-400">{d}</span>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8 rounded-lg opacity-0 pointer-events-none" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dObj = new Date(year, month, day);
            const dateKey = getDateKey(dObj);
            const count = getDayCount(dateKey);

            if (activeTab === 'single') {
              const isSelected = dateKey === currKey;
              const isToday = dateKey === todayKey;

              let btnClass = isSelected
                ? `${modeConfig.accentBg} text-white font-bold shadow-xs`
                : isToday
                ? `border border-current font-bold ${modeConfig.badgeText} ${modeConfig.accentBgSoft}`
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200';

              return (
                <button aria-label="Action"
                  key={day}
                  onClick={() => handleDayClick(dObj, dateKey)}
                  className={`h-8 rounded-lg flex flex-col items-center justify-center relative transition-all cursor-pointer ${btnClass}`}
                  title={`${dateKey} (${count} ${modeConfig.unitLabel})`}
                >
                  <span className="text-xs leading-none">{day}</span>
                  {count > 0 && !isSelected && (
                    <span className={`w-1 h-1 rounded-full ${modeConfig.accentBg} mt-1`} />
                  )}
                </button>
              );
            } else {
              // Date Range Grid logic
              const isStart = dateKey === currentActiveStart;
              const isEnd = dateKey === currentActiveEnd;
              const inRange = Boolean(currentActiveStart && currentActiveEnd && dateKey >= currentActiveStart && dateKey <= currentActiveEnd);
              const isToday = dateKey === todayKey;

              let rangeStyle = '';
              if (isStart || isEnd) {
                rangeStyle = `${modeConfig.accentBg} text-white font-bold shadow-xs z-10`;
              } else if (inRange) {
                rangeStyle = `${modeConfig.accentBgSoft} ${modeConfig.badgeText} font-semibold rounded-none`;
              } else if (isToday) {
                rangeStyle = `border border-current font-bold ${modeConfig.badgeText}`;
              } else {
                rangeStyle = 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200';
              }

              return (
                <button aria-label="Action"
                  key={day}
                  onClick={() => handleDayClick(dObj, dateKey)}
                  onMouseEnter={() => setHoverDateKey(dateKey)}
                  onMouseLeave={() => setHoverDateKey(null)}
                  className={`h-8 rounded-lg flex flex-col items-center justify-center relative transition-all cursor-pointer ${rangeStyle}`}
                  title={`${dateKey} (${count} ${modeConfig.unitLabel})`}
                >
                  <span className="text-xs leading-none">{day}</span>
                  {count > 0 && !isStart && !isEnd && (
                    <span className={`w-1 h-1 rounded-full ${modeConfig.accentBg} mt-1`} />
                  )}
                </button>
              );
            }
          })}
        </div>

        {/* Date Range Action Bottom Bar */}
        {activeTab === 'range' && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
            <button aria-label="Action"
              onClick={handleClearRange}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Single Day</span>
            </button>
            <button aria-label="Action"
              onClick={handleApplyRange}
              disabled={!rangeStart || !rangeEnd}
              className={`px-4 py-1.5 ${modeConfig.accentBg} hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Range ({rangeDaysCount}d)</span>
            </button>
          </div>
        )}

        {/* Individualized Active Days Shortcuts (in Single Day mode) */}
        {activeTab === 'single' && recentActiveDays.length > 0 && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Recent Active Days:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentActiveDays.map(item => (
                <button aria-label="Action"
                  key={item.dateKey}
                  onClick={() => {
                    onSelectDate(item.date);
                    if (onSelectDateRange) onSelectDateRange(null);
                    onClose();
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${modeConfig.accentBgSoft} ${modeConfig.badgeText} hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1`}
                >
                  <span>{item.dateKey}</span>
                  <span className="opacity-60">({item.count})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
