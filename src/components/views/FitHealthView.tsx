import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Heart,
  Flame,
  Footprints,
  Moon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Compass,
  Zap,
  Award,
  Upload,
  Sparkles,
  FileSpreadsheet,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { FitDailyMetric, FitWorkout } from '../../types';
import { loadStoredFitMetrics, persistStoredFitMetrics, saveSingleFitMetric } from '../../utils/fitStorage';
import { FitImportModal } from '../modals/FitImportModal';
import { FitLogModal } from '../modals/FitLogModal';
import { RichDateNavButton } from '../common/RichDateNavButton';
import { FitDataVisualizationTab } from '../fit/FitDataVisualizationTab';
import { createSampleFitDailyMetrics } from '../fit/sampleFitData';
import { syncSampleFitData, syncFitEcosystem } from '../../utils/fitSync';
import { GoogleFitDataset } from '../../utils/googleFitParser';

interface FitHealthViewProps {
  currentDate: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onJumpToDate?: (date: Date) => void;
  onOpenCalendar?: () => void;
  onJumpToMap?: () => void;
  onSwitchToGpsWorkouts?: () => void;
  embedded?: boolean;
  initialTab?: 'vitals' | 'visualization';
  dataset?: GoogleFitDataset | null;
}

export const FitHealthView: React.FC<FitHealthViewProps> = ({
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onJumpToDate,
  onOpenCalendar,
  onJumpToMap,
  onSwitchToGpsWorkouts,
  embedded = false,
  initialTab = 'vitals',
  dataset = null
}) => {
  const [activeTab, setActiveTab] = useState<'vitals' | 'visualization'>(initialTab);
  const [metricsMap, setMetricsMap] = useState<Record<string, FitDailyMetric>>({});
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Load from persistent storage and listen to external changes
  useEffect(() => {
    async function loadMetrics() {
      const saved = await loadStoredFitMetrics();
      if (saved && typeof saved === 'object') {
        setMetricsMap(saved);
      }
    }
    loadMetrics();

    const handleExternalFitUpdated = async () => {
      const refreshed = await loadStoredFitMetrics();
      setMetricsMap(refreshed);
    };

    window.addEventListener('emreh_fit_updated', handleExternalFitUpdated);
    return () => {
      window.removeEventListener('emreh_fit_updated', handleExternalFitUpdated);
    };
  }, []);

  const persistMetrics = (updated: Record<string, FitDailyMetric>) => {
    setMetricsMap(updated);
    persistStoredFitMetrics(updated);
  };

  const handleImportMetrics = async (importedMap: Record<string, FitDailyMetric>) => {
    const { metrics: updated } = await syncFitEcosystem({ newMetrics: importedMap });
    setMetricsMap(updated);

    // Automatically navigate to the latest date that has recorded data
    const activeImportedDates = Object.keys(importedMap).filter(d => {
      const m = importedMap[d];
      return m && (m.steps > 0 || m.heartPoints > 0 || m.moveMinutes > 0 || (m.workouts && m.workouts.length > 0) || (m.sleepHours && m.sleepHours > 0));
    }).sort();

    const targetDateStr = activeImportedDates.length > 0 
      ? activeImportedDates[activeImportedDates.length - 1]
      : Object.keys(importedMap).sort().pop();

    if (targetDateStr && onJumpToDate) {
      const [y, m, d] = targetDateStr.split('-').map(Number);
      onJumpToDate(new Date(y, m - 1, d));
    }
  };

  const handleSaveMetric = async (savedMetric: FitDailyMetric) => {
    const { metrics: updated } = await syncFitEcosystem({ newMetrics: { [savedMetric.date]: savedMetric } });
    setMetricsMap(updated);
  };

  const dateStr = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentDate]);

  const metric: FitDailyMetric | null = metricsMap[dateStr] || null;

  const hasData = Boolean(
    metric &&
      (metric.steps > 0 ||
        metric.heartPoints > 0 ||
        metric.moveMinutes > 0 ||
        (metric.workouts && metric.workouts.length > 0) ||
        (metric.sleepHours && metric.sleepHours > 0))
  );

  const allRecordedDates = useMemo(() => {
    return Object.keys(metricsMap).filter(d => {
      const m = metricsMap[d];
      return m && (m.steps > 0 || m.heartPoints > 0 || m.moveMinutes > 0 || (m.workouts && m.workouts.length > 0) || (m.sleepHours && m.sleepHours > 0));
    }).sort();
  }, [metricsMap]);

  const hasAnyDataInApp = allRecordedDates.length > 0;
  const latestActiveDateStr = hasAnyDataInApp ? allRecordedDates[allRecordedDates.length - 1] : null;

  // Realistic 30-day sample data generator for immediate exploration
  const handleLoadSampleVitals = async () => {
    const { metrics: sampleMap } = await syncSampleFitData(currentDate);
    handleImportMetrics(sampleMap);
  };

  const stepsGoal = metric?.stepsGoal || 10000;
  const heartPointsGoal = metric?.heartPointsGoal || 40;
  const stepsPercent = metric ? Math.min(100, Math.round((metric.steps / stepsGoal) * 100)) : 0;
  const heartPointsPercent = metric
    ? Math.min(100, Math.round((metric.heartPoints / heartPointsGoal) * 100))
    : 0;

  const isToday = useMemo(() => {
    const now = new Date();
    return (
      now.getFullYear() === currentDate.getFullYear() &&
      now.getMonth() === currentDate.getMonth() &&
      now.getDate() === currentDate.getDate()
    );
  }, [currentDate]);

  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div id="google-fit-view" className="h-full flex flex-col overflow-hidden animate-fadeIn">
      {/* Top Header (Hidden if embedded in unified view) */}
      {!embedded && (
        <div className="shrink-0 px-6 py-4 border-b border-gray-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Google Fit & Health
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  {activeTab === 'visualization' ? '30-Day Trends' : 'Daily Vitals'}
                </span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Heart points, movement rings, sleep architecture & workout telemetry
              </p>
            </div>
          </div>

          {/* Tab Switcher & Date Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Vitals vs Visualization Tab Toggle */}
            <div className="inline-flex p-1 bg-stone-100 dark:bg-white/5 rounded-xl border border-stone-200/80 dark:border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('vitals')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                  activeTab === 'vitals'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Daily Vitals</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('visualization')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                  activeTab === 'visualization'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>30-Day Data Visualization</span>
              </button>
            </div>

            <RichDateNavButton
              currentDate={currentDate}
              onPrevDate={onPrevDate}
              onNextDate={onNextDate}
              onSetToday={onSetToday}
              onJumpToDate={onJumpToDate}
              onOpenCalendar={onOpenCalendar}
              accentColor="emerald"
            />

            {/* Import Button */}
            <button
              id="fit-import-takeout-btn"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-500/30 transition shadow-sm cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Takeout</span>
            </button>

            {/* Manual Log Button */}
            <button
              id="fit-log-activity-btn"
              onClick={() => setIsLogModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Vitals</span>
            </button>

            {onSwitchToGpsWorkouts && (
              <button
                id="fit-switch-to-gps-btn"
                onClick={onSwitchToGpsWorkouts}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 font-semibold text-xs border border-orange-500/30 transition shadow-sm cursor-pointer"
                title="Switch to GPS Routes & Workouts Explorer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>GPS Routes & Workouts</span>
              </button>
            )}

            {onJumpToMap && (
              <button
                onClick={onJumpToMap}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Map Timeline</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Dashboard */}
      <div className={`flex-1 overflow-y-auto space-y-6 ${embedded ? 'p-0' : 'p-6'}`}>
        {activeTab === 'visualization' ? (
          <FitDataVisualizationTab
            metricsMap={metricsMap}
            dataset={dataset}
            currentDate={currentDate}
            onJumpToDate={(d) => {
              onJumpToDate?.(d);
              setActiveTab('vitals');
            }}
            onLoadSampleData={handleLoadSampleVitals}
            onSwitchToVitals={() => setActiveTab('vitals')}
            onSwitchToWorkouts={onSwitchToGpsWorkouts}
          />
        ) : !hasAnyDataInApp ? (
          /* FIRST TIME EMPTY STATE (When no fit data has ever been imported) */
          <div className="text-center py-20 px-4 max-w-lg mx-auto flex flex-col items-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20 shadow-inner">
              <Activity className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
              Welcome to Google Fit & Health Studio
            </h3>

            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Import your Google Fit Takeout archive (daily steps, heart points, workouts, and sleep telemetry), load curated sample vitals to explore the dashboard, or log your vitals manually.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Import Google Fit (ZIP / CSV)</span>
              </button>
              <button
                onClick={handleLoadSampleVitals}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-500/30 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Load Sample Vitals</span>
              </button>
              <button
                onClick={() => setIsLogModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 font-semibold text-xs border border-gray-200 dark:border-zinc-700 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Log Vitals Manually</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* If currently selected day has no activity, show helpful jump strip above the dashboard */}
            {!hasData && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      No fitness activity recorded for {formattedDate}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      You have fitness activity recorded across {allRecordedDates.length} other day(s).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {latestActiveDateStr && onJumpToDate && (
                    <button
                      onClick={() => {
                        const [y, m, d] = latestActiveDateStr.split('-').map(Number);
                        onJumpToDate(new Date(y, m - 1, d));
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm cursor-pointer"
                    >
                      Jump to Latest Active Day ({latestActiveDateStr})
                    </button>
                  )}
                  <button
                    onClick={() => setIsLogModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 font-semibold text-xs border border-gray-200 dark:border-zinc-700 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1 text-emerald-500" />
                    Log Vitals for this Day
                  </button>
                </div>
              </div>
            )}

            {/* Quick Strip of Recent Active Days if on an empty date */}
            {!hasData && allRecordedDates.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border border-gray-200/60 dark:border-zinc-800/60">
                <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Recent Days with Recorded Activity
                </p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {allRecordedDates.slice(-8).reverse().map(dateKey => {
                    const m = metricsMap[dateKey];
                    return (
                      <button
                        key={dateKey}
                        onClick={() => {
                          if (onJumpToDate) {
                            const [y, m, d] = dateKey.split('-').map(Number);
                            onJumpToDate(new Date(y, m - 1, d));
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-800/90 border border-gray-200 dark:border-zinc-700/80 hover:border-emerald-500 dark:hover:border-emerald-500 text-left transition shrink-0 group shadow-2xs cursor-pointer"
                      >
                        <span className="text-[11px] font-semibold text-gray-800 dark:text-zinc-200 block group-hover:text-emerald-600">
                          {dateKey}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-zinc-400 block">
                          {(m?.steps || 0).toLocaleString()} steps
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TOP SIGNATURE GOOGLE FIT RINGS CARD */}
            <div className="w-full bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-cyan-950/20 border border-emerald-500/20 rounded-3xl p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* Dual Ring Visualizer (SVG) */}
                <div className="md:col-span-5 flex flex-col items-center justify-center">
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Heart Points Outer Track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="7"
                        className="text-emerald-200/50 dark:text-emerald-950"
                        fill="transparent"
                      />
                      {/* Heart Points Outer Progress */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#10b981"
                        strokeWidth="7"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * heartPointsPercent) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                      />

                      {/* Move Minutes Inner Track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="30"
                        stroke="currentColor"
                        strokeWidth="7"
                        className="text-cyan-200/50 dark:text-cyan-950"
                        fill="transparent"
                      />
                      {/* Move Minutes Inner Progress */}
                      <circle
                        cx="50"
                        cy="50"
                        r="30"
                        stroke="#06b6d4"
                        strokeWidth="7"
                        strokeDasharray={188.4}
                        strokeDashoffset={
                          188.4 - (188.4 * Math.min(100, (metric?.moveMinutes || 0) * 2)) / 100
                        }
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>

                    {/* Center Stats */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-gray-900 dark:text-white">
                        {metric?.heartPoints || 0}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                        Heart Pts
                      </span>
                      <span className="text-xs text-gray-400 mt-0.5">
                        {metric?.moveMinutes || 0} Move min
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mt-4 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-gray-700 dark:text-zinc-300">
                        Heart Points ({metric?.heartPoints || 0}/{heartPointsGoal})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-cyan-500" />
                      <span className="text-gray-700 dark:text-zinc-300">
                        Move Min ({metric?.moveMinutes || 0}m)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Metrics Grid */}
                <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {/* Steps */}
                  <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-gray-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-gray-500">
                      <Footprints className="w-4 h-4 text-blue-500" />
                      <span className="text-[10px] font-bold text-emerald-600">{stepsPercent}%</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-xl font-black text-gray-900 dark:text-white">
                        {(metric?.steps || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">
                        Goal: {stepsGoal.toLocaleString()}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-700"
                        style={{ width: `${stepsPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Calories */}
                  <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-gray-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-gray-500">
                      <Flame className="w-4 h-4 text-amber-500" />
                      <span className="text-[10px] font-bold text-amber-600">Active</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-xl font-black text-gray-900 dark:text-white">
                        {metric?.caloriesActive || 0} <span className="text-xs font-normal text-gray-400">Cal</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">
                        Total: {metric?.caloriesTotal || 0} Cal
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-3 font-mono">
                      Basal: {Math.max(0, (metric?.caloriesTotal || 0) - (metric?.caloriesActive || 0))} Cal
                    </div>
                  </div>

                  {/* Distance */}
                  <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-gray-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-gray-500">
                      <Compass className="w-4 h-4 text-purple-500" />
                      <span className="text-[10px] font-bold text-purple-600">Travel</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-xl font-black text-gray-900 dark:text-white">
                        {metric?.distanceKm || 0} <span className="text-xs font-normal text-gray-400">km</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">
                        {(((metric?.distanceKm || 0) * 0.621371)).toFixed(1)} miles
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-3 font-mono">Avg stride: 0.78m</div>
                  </div>

                  {/* Resting Heart Rate */}
                  <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-gray-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-gray-500">
                      <Heart className="w-4 h-4 text-rose-500" />
                      <span className="text-[10px] font-bold text-rose-600">Resting</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-xl font-black text-gray-900 dark:text-white">
                        {metric?.restingHeartRate || '--'} <span className="text-xs font-normal text-gray-400">bpm</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">
                        Current: {metric?.currentHeartRate || metric?.restingHeartRate || '--'} bpm
                      </div>
                    </div>
                    <div className="text-[10px] text-emerald-600 mt-3 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Normal HRV
                    </div>
                  </div>

                  {/* Sleep Duration */}
                  <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-gray-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-gray-500">
                      <Moon className="w-4 h-4 text-indigo-500" />
                      <span className="text-[10px] font-bold text-indigo-600">
                        {metric?.sleepScore ? `${metric.sleepScore}/100` : 'Sleep'}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-xl font-black text-gray-900 dark:text-white">
                        {metric?.sleepHours || '--'} <span className="text-xs font-normal text-gray-400">hrs</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">
                        {metric?.sleepHours && metric.sleepHours >= 7 ? 'Optimal Rest' : 'Logged'}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-3 font-mono">Rest Architecture</div>
                  </div>

                  {/* Streak */}
                  <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-gray-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-gray-500">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span className="text-[10px] font-bold text-emerald-600">Status</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-xl font-black text-gray-900 dark:text-white">
                        {stepsPercent >= 100 ? 'Goal Met' : 'Active'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">Heart points target</div>
                    </div>
                    <div className="text-[10px] text-amber-600 mt-3 font-medium">WHO benchmark track</div>
                  </div>
                </div>
              </div>
            </div>

            {/* WORKOUTS & RECENT ACTIVITIES */}
            <div className="bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Workouts & Tracked Activities ({metric?.workouts?.length || 0})
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Synchronized telemetry from wearable and GPS timeline
                  </p>
                </div>
                <button
                  onClick={() => setIsLogModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs font-semibold text-gray-700 dark:text-zinc-300 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Activity</span>
                </button>
              </div>

              {(!metric?.workouts || metric.workouts.length === 0) ? (
                <div className="p-6 rounded-2xl bg-gray-50/50 dark:bg-zinc-800/20 border border-dashed border-gray-200 dark:border-zinc-800 text-center text-xs text-gray-400">
                  No individual workout sessions logged for this day.
                </div>
              ) : (
                <div className="space-y-3">
                  {metric.workouts.map(workout => (
                    <div
                      key={workout.id}
                      className="p-4 rounded-2xl bg-gray-50/80 dark:bg-zinc-800/40 border border-gray-200/60 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 hover:border-emerald-500/40 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            {workout.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                            <span>{workout.startTime}</span>
                            <span>•</span>
                            <span>{workout.durationMinutes} minutes</span>
                            {workout.distanceKm && (
                              <>
                                <span>•</span>
                                <span>{workout.distanceKm} km</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {workout.calories} <span className="text-xs text-gray-400 font-normal">Cal</span>
                          </div>
                          <div className="text-[11px] text-gray-400">Burned</div>
                        </div>
                        {workout.avgHeartRateBpm && (
                          <div className="text-right">
                            <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                              {workout.avgHeartRateBpm}{' '}
                              <span className="text-xs text-gray-400 font-normal">bpm</span>
                            </div>
                            <div className="text-[11px] text-gray-400">Avg Heart Rate</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Google Fit Import Modal */}
      <FitImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportMetrics={handleImportMetrics}
      />

      {/* Manual Activity & Vitals Logging Modal */}
      <FitLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        targetDate={dateStr}
        existingMetric={metric}
        onSaveMetric={handleSaveMetric}
      />
    </div>
  );
};
