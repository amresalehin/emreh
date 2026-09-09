import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Smartphone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Plus,
  UploadCloud,
  CheckCircle2,
  Code2,
  Briefcase,
  Share2,
  Film,
  BookOpen,
  Sliders,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Monitor
} from 'lucide-react';
import { TimelineItem, ScreentimeDayData, ScreentimeAppItem, ScreentimeCategory } from '../../types';
import {
  computeScreentimeFromTimeline,
  formatMinutes,
  generateDemoScreentimeData,
  parseScreentimeFiles
} from '../../utils/screentimeCalculator';
import {
  loadStoredScreentimeData,
  persistStoredScreentimeData,
  saveSingleScreentimeDay
} from '../../utils/screentimeStorage';

interface ScreentimeViewProps {
  currentDate: Date;
  timelineData: TimelineItem[];
  onPrevDate: () => void;
  onNextDate: () => void;
  onSetToday: () => void;
  onJumpToDate?: (date: Date) => void;
  onOpenCalendar?: () => void;
}

const CATEGORY_CONFIG: Record<
  ScreentimeCategory | string,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  development: {
    label: 'Development',
    icon: <Code2 className="w-3.5 h-3.5 text-sky-400" />,
    color: 'text-sky-400',
    bg: 'bg-sky-500',
    border: 'border-sky-500/30'
  },
  productivity: {
    label: 'Productivity',
    icon: <Briefcase className="w-3.5 h-3.5 text-emerald-400" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500',
    border: 'border-emerald-500/30'
  },
  social: {
    label: 'Social',
    icon: <Share2 className="w-3.5 h-3.5 text-violet-400" />,
    color: 'text-violet-400',
    bg: 'bg-violet-500',
    border: 'border-violet-500/30'
  },
  entertainment: {
    label: 'Entertainment',
    icon: <Film className="w-3.5 h-3.5 text-rose-400" />,
    color: 'text-rose-400',
    bg: 'bg-rose-500',
    border: 'border-rose-500/30'
  },
  reading: {
    label: 'Reading',
    icon: <BookOpen className="w-3.5 h-3.5 text-amber-400" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500',
    border: 'border-amber-500/30'
  },
  utilities: {
    label: 'Utilities',
    icon: <Sliders className="w-3.5 h-3.5 text-slate-400" />,
    color: 'text-slate-400',
    bg: 'bg-slate-500',
    border: 'border-slate-500/30'
  },
  other: {
    label: 'Other',
    icon: <Clock className="w-3.5 h-3.5 text-zinc-400" />,
    color: 'text-zinc-400',
    bg: 'bg-zinc-500',
    border: 'border-zinc-500/30'
  }
};

export const ScreentimeView: React.FC<ScreentimeViewProps> = ({
  currentDate,
  timelineData,
  onPrevDate,
  onNextDate,
  onSetToday,
  onOpenCalendar
}) => {
  const [storedData, setStoredData] = useState<Record<string, ScreentimeDayData>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual log state
  const [manualAppName, setManualAppName] = useState('');
  const [manualDuration, setManualDuration] = useState('30');
  const [manualCategory, setManualCategory] = useState<ScreentimeCategory>('productivity');

  const dateKey = currentDate.toISOString().slice(0, 10);
  const formattedDate = currentDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Load stored data on mount and on storage events
  useEffect(() => {
    let mounted = true;
    const fetchStorage = async () => {
      const data = await loadStoredScreentimeData();
      if (mounted) setStoredData(data);
    };
    fetchStorage();

    const handleUpdate = () => fetchStorage();
    window.addEventListener('emreh_screentime_updated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('emreh_screentime_updated', handleUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Active day data: prioritize explicitly stored data, or derive on-the-fly from timeline
  const activeDayData = useMemo<ScreentimeDayData>(() => {
    if (storedData[dateKey]) {
      return storedData[dateKey];
    }
    // Fallback: derive directly from timeline data
    return computeScreentimeFromTimeline(timelineData, dateKey);
  }, [storedData, dateKey, timelineData]);

  // Yesterday's data for trend comparison
  const yesterdayData = useMemo<ScreentimeDayData | null>(() => {
    const yDate = new Date(currentDate);
    yDate.setDate(yDate.getDate() - 1);
    const yKey = yDate.toISOString().slice(0, 10);
    if (storedData[yKey]) return storedData[yKey];
    return computeScreentimeFromTimeline(timelineData, yKey);
  }, [storedData, currentDate, timelineData]);

  // Screen time delta comparison
  const comparison = useMemo(() => {
    if (!yesterdayData || yesterdayData.totalMinutes === 0) return null;
    const diff = activeDayData.totalMinutes - yesterdayData.totalMinutes;
    const pct = Math.round(Math.abs(diff) / yesterdayData.totalMinutes * 100);
    return {
      diff,
      pct,
      isHigher: diff > 0
    };
  }, [activeDayData, yesterdayData]);

  // Compute Focus Balance Score (0 - 100)
  const balanceScore = useMemo(() => {
    if (activeDayData.totalMinutes === 0) return 85;
    const prod = (activeDayData.categories['productivity'] || 0) + (activeDayData.categories['development'] || 0);
    const ent = (activeDayData.categories['entertainment'] || 0) + (activeDayData.categories['social'] || 0);
    const ratio = (prod + 10) / (prod + ent + 20);
    const score = Math.min(100, Math.max(30, Math.round(ratio * 100)));
    return score;
  }, [activeDayData]);

  // Filtered apps
  const filteredApps = useMemo(() => {
    return activeDayData.apps.filter(app => {
      const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.domain && app.domain.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [activeDayData, selectedCategory, searchQuery]);

  // Handle recomputing from timeline
  const handleRecomputeFromTimeline = async () => {
    const computed = computeScreentimeFromTimeline(timelineData, dateKey);
    await saveSingleScreentimeDay(computed);
    setStoredData(prev => ({ ...prev, [dateKey]: computed }));
    showToast('Recalculated screentime from timeline streams.');
  };

  // Handle loading demo data
  const handleLoadDemoData = async () => {
    const demo = generateDemoScreentimeData(currentDate);
    await persistStoredScreentimeData({ ...storedData, ...demo });
    setStoredData(prev => ({ ...prev, ...demo }));
    showToast('Loaded 7 days of sample screentime data.');
  };

  // Handle manual session save
  const handleSaveManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAppName.trim()) return;

    const min = parseInt(manualDuration, 10) || 15;
    const current = activeDayData;
    const existingApp = current.apps.find(a => a.name.toLowerCase() === manualAppName.trim().toLowerCase());

    let newApps: ScreentimeAppItem[];
    if (existingApp) {
      newApps = current.apps.map(a =>
        a.id === existingApp.id ? { ...a, durationMinutes: a.durationMinutes + min } : a
      );
    } else {
      newApps = [
        ...current.apps,
        {
          id: `manual_${current.date}_${manualAppName.trim()}`,
          name: manualAppName.trim(),
          category: manualCategory,
          durationMinutes: min
        }
      ];
    }

    const newTotal = current.totalMinutes + min;
    const newCategories = {
      ...current.categories,
      [manualCategory]: (current.categories[manualCategory] || 0) + min
    };

    newApps.forEach(a => {
      a.percentage = Math.round((a.durationMinutes / newTotal) * 100);
    });
    newApps.sort((a, b) => b.durationMinutes - a.durationMinutes);

    const updated: ScreentimeDayData = {
      ...current,
      totalMinutes: newTotal,
      categories: newCategories,
      apps: newApps
    };

    await saveSingleScreentimeDay(updated);
    setStoredData(prev => ({ ...prev, [dateKey]: updated }));
    setIsManualModalOpen(false);
    setManualAppName('');
    setManualDuration('30');
    showToast(`Added ${min}m to ${manualAppName}.`);
  };

  // Handle file import
  const handleFileDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    try {
      const parsed = await parseScreentimeFiles(Array.from(files));
      const count = Object.keys(parsed).length;
      if (count > 0) {
        const merged = { ...storedData, ...parsed };
        await persistStoredScreentimeData(merged);
        setStoredData(merged);
        showToast(`Imported screentime for ${count} day(s).`);
      } else {
        showToast('No recognized screentime entries found.');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to parse file.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const maxHourly = Math.max(...activeDayData.hourlyMinutes, 30);

  return (
    <div className="flex flex-col flex-1 h-full w-full overflow-y-auto px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-gray-900/90 dark:bg-white/95 text-white dark:text-gray-900 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 border border-white/10 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Date Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200/50 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-inner">
              <Clock className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Screentime & Focus
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Daily digital activity, screen time distribution & app usage
              </p>
            </div>
          </div>
        </div>

        {/* Date Controls & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-white/60 dark:bg-zinc-900/60 border border-gray-200/80 dark:border-white/10 rounded-xl p-1 shadow-sm backdrop-blur-md">
            <button
              onClick={onPrevDate}
              title="Previous Day"
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button aria-label="Action"
              onClick={onOpenCalendar}
              className="px-2.5 py-1 text-xs font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>{formattedDate}</span>
            </button>
            <button
              onClick={onNextDate}
              title="Next Day"
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button aria-label="Action"
              onClick={onSetToday}
              className="ml-1 px-2 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
            >
              Today
            </button>
          </div>

          <button
            onClick={handleRecomputeFromTimeline}
            title="Recalculate from browser history & activity"
            className="px-2.5 py-1.5 text-xs font-medium bg-white/60 dark:bg-zinc-900/60 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-white/10 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">Sync Timeline</span>
          </button>

          <button aria-label="Action"
            onClick={() => setIsManualModalOpen(true)}
            className="px-2.5 py-1.5 text-xs font-medium bg-white/60 dark:bg-zinc-900/60 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-white/10 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Add Log</span>
          </button>

          <label
            className="px-2.5 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{isImporting ? 'Importing...' : 'Import'}</span>
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileDrop}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Top 4 Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Screen Time */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-gray-200/70 dark:border-white/10 shadow-sm backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Screen Time</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            {formatMinutes(activeDayData.totalMinutes)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
            {comparison ? (
              <>
                {comparison.isHigher ? (
                  <span className="flex items-center text-rose-500 dark:text-rose-400">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                    +{comparison.pct}% vs yesterday
                  </span>
                ) : (
                  <span className="flex items-center text-emerald-500 dark:text-emerald-400">
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                    -{comparison.pct}% vs yesterday
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-400">Recorded for this date</span>
            )}
          </div>
        </div>

        {/* Card 2: App Sessions */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-gray-200/70 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Inferred Sessions</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-sky-500" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            {activeDayData.pickupsCount || (activeDayData.totalMinutes > 0 ? 'Data Unavailable' : 0)}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {activeDayData.pickupsCount && activeDayData.totalMinutes > 0
              ? `Avg 1 session every ~${Math.round(720 / Math.max(1, activeDayData.pickupsCount))}m`
              : 'Based on chronological gaps'}
          </p>
        </div>

        {/* Card 3: First & Last Session */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-gray-200/70 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Window</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
            {activeDayData.firstPickup || 'Unknown'} - {activeDayData.lastActivity || 'Unknown'}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {activeDayData.notificationsCount !== undefined ? `${activeDayData.notificationsCount} alerts & updates` : 'Daily interaction span'}
          </p>
        </div>

        {/* Card 4: Work/Leisure Ratio */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-gray-200/70 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Work / Leisure Ratio</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              {balanceScore}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">/ 100</span>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {balanceScore >= 75 ? 'Healthy work / leisure balance' : 'Higher entertainment ratio'}

          </p>
        </div>
      </div>

      {/* Hourly 24-Hour Distribution Histogram */}
      <div className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-gray-200/70 dark:border-white/10 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Hourly Screen Time Distribution</span>
              {hoveredHour !== null && (
                <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-500/20">
                  {hoveredHour.toString().padStart(2, '0')}:00 — {activeDayData.hourlyMinutes[hoveredHour] || 0}m active
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Activity intensity across all 24 hours of the day
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Active Hours
            </span>
            <span>Peak: {maxHourly}m/hr</span>
          </div>
        </div>

        {/* 24-hour bars */}
        <div className="pt-4 pb-2">
          <div className="flex items-end gap-1.5 h-32 w-full">
            {activeDayData.hourlyMinutes.map((minutes, hour) => {
              const heightPct = Math.min(100, Math.max(4, Math.round((minutes / maxHourly) * 100)));
              const isHovered = hoveredHour === hour;
              return (
                <div
                  key={hour}
                  onMouseEnter={() => setHoveredHour(hour)}
                  onMouseLeave={() => setHoveredHour(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="absolute -top-9 z-20 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded-md shadow-lg pointer-events-none whitespace-nowrap">
                      {hour}:00 · {minutes}m
                    </div>
                  )}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      minutes > 0
                        ? isHovered
                          ? 'bg-indigo-400 dark:bg-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                          : 'bg-indigo-500/80 dark:bg-indigo-500/70 hover:bg-indigo-500'
                        : 'bg-gray-100 dark:bg-white/5'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Time axis labels */}
          <div className="flex justify-between text-[10px] font-mono text-gray-400 mt-2 px-1">
            <span>12 AM</span>
            <span>4 AM</span>
            <span>8 AM</span>
            <span>12 PM</span>
            <span>4 PM</span>
            <span>8 PM</span>
            <span>11 PM</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown Bar & Category Pills */}
      <div className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-gray-200/70 dark:border-white/10 shadow-sm backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            Category Breakdown
          </h2>
          <span className="text-xs text-gray-400">
            {Object.keys(activeDayData.categories).length} categories tracked
          </span>
        </div>

        {/* Multi-segment bar */}
        <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden flex shadow-inner">
          {activeDayData.totalMinutes > 0 ? (
            Object.entries(activeDayData.categories).map(([cat, rawMins]) => {
              const mins = Number(rawMins) || 0;
              if (mins <= 0) return null;
              const widthPct = (mins / activeDayData.totalMinutes) * 100;
              const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
              return (
                <div
                  key={cat}
                  style={{ width: `${widthPct}%` }}
                  title={`${cfg.label}: ${formatMinutes(mins)} (${Math.round(widthPct)}%)`}
                  className={`${cfg.bg} h-full transition-all duration-300 hover:opacity-90`}
                />
              );
            })
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-white/10" />
          )}
        </div>

        {/* Filter / Category Selector Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button aria-label="Action"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            <span>All Apps ({activeDayData.apps.length})</span>
          </button>

          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
            const mins = activeDayData.categories[key] || 0;
            if (mins === 0 && selectedCategory !== key) return null;
            const isSelected = selectedCategory === key;
            return (
              <button aria-label="Action"
                key={key}
                onClick={() => setSelectedCategory(isSelected ? 'all' : key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                {cfg.icon}
                <span>{cfg.label}</span>
                <span className="text-[10px] opacity-75 font-mono">({formatMinutes(mins)})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Apps & Websites List Section */}
      <div className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-gray-200/70 dark:border-white/10 shadow-sm backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Application & Web Usage
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sorted by active duration
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search app or website..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-100 dark:bg-white/5 border border-transparent focus:border-indigo-500/50 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {/* List of Apps */}
        {filteredApps.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {filteredApps.map(app => {
              const cfg = CATEGORY_CONFIG[app.category] || CATEGORY_CONFIG.other;
              return (
                <div
                  key={app.id}
                  className="py-3 flex items-center justify-between gap-4 group hover:bg-gray-50/50 dark:hover:bg-white/5 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl ${cfg.bg}/10 border ${cfg.border} flex items-center justify-center shrink-0`}>
                      {cfg.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {app.name}
                        </span>
                        {app.domain && (
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                            {app.domain}
                          </span>
                        )}
                      </div>
                      {/* Visual progress bar of percentage */}
                      <div className="mt-1.5 flex items-center gap-2 max-w-xs">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                          <div
                            style={{ width: `${app.percentage || 5}%` }}
                            className={`h-full rounded-full ${cfg.bg}`}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">
                          {app.percentage || 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-gray-900 dark:text-white">
                      {formatMinutes(app.durationMinutes)}
                    </div>
                    <span className={`text-[10px] font-semibold ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center space-y-3">
            <Monitor className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No screentime entries found for this date.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button aria-label="Action"
                onClick={handleLoadDemoData}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-colors"
              >
                Load Sample Week Data
              </button>
              <button aria-label="Action"
                onClick={handleRecomputeFromTimeline}
                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                Scan From Timeline
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Add Log Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Log Screentime Session
              </h3>
              <button aria-label="Action"
                onClick={() => setIsManualModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManualLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  App or Website Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Visual Studio Code, Figma, YouTube"
                  value={manualAppName}
                  onChange={e => setManualAppName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-indigo-500 text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  required
                  value={manualDuration}
                  onChange={e => setManualDuration(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-indigo-500 text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={manualCategory}
                  onChange={e => setManualCategory(e.target.value as ScreentimeCategory)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-indigo-500 text-gray-900 dark:text-white focus:outline-none"
                >
                  <option value="development">Development</option>
                  <option value="productivity">Productivity</option>
                  <option value="social">Social</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="reading">Reading</option>
                  <option value="utilities">Utilities</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button aria-label="Action"
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button aria-label="Action"
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
