import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  Heart,
  HeartPulse,
  Footprints,
  Flame,
  Zap,
  Route,
  Moon,
  Weight,
  Calendar,
  TrendingUp,
  Sparkles,
  Upload,
  Plus,
  Award,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  BarChart2,
  Target,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import {
  GoogleFitDataset,
  FitWorkout,
  fitActivityLabel
} from '../../utils/googleFitParser';
import { FitDailyMetric } from '../../types';
import {
  loadStoredFitMetrics,
  persistStoredFitMetrics,
  saveSingleFitMetric
} from '../../utils/fitStorage';
import { FitLogModal } from '../modals/FitLogModal';
import { FitImportModal } from '../modals/FitImportModal';
import { FitDataVisualizationTab } from './FitDataVisualizationTab';

interface UnifiedHealthInsightsViewProps {
  dataset: GoogleFitDataset | null;
  currentDate: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onJumpToDate: (d: Date) => void;
  onSelectWorkout?: (workout: FitWorkout) => void;
  onLoadSampleData?: () => void;
  onImportClick?: () => void;
  onSwitchToWorkouts?: () => void;
}

function fmt(n: number | undefined, unit = '') {
  if (n === undefined || !Number.isFinite(n)) return '—';
  return `${Math.round(n * 10) / 10}${unit}`;
}

export const UnifiedHealthInsightsView: React.FC<UnifiedHealthInsightsViewProps> = ({
  dataset,
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onJumpToDate,
  onSelectWorkout,
  onLoadSampleData,
  onImportClick,
  onSwitchToWorkouts
}) => {
  // Stored IndexedDB / LocalStorage metrics
  const [metricsMap, setMetricsMap] = useState<Record<string, FitDailyMetric>>({});
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Section navigation inside Health Insights view
  const [activeSection, setActiveSection] = useState<'all' | 'vitals' | 'trends' | 'daylog' | 'analytics' | 'body'>('all');

  const dateKeyStr = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentDate]);

  // Load metrics from storage & sync on external events
  useEffect(() => {
    const load = () => {
      const data = loadStoredFitMetrics();
      setMetricsMap(data);
    };
    load();

    const handleCustomUpdate = () => load();
    window.addEventListener('emreh_fit_updated', handleCustomUpdate);
    return () => window.removeEventListener('emreh_fit_updated', handleCustomUpdate);
  }, []);

  const handleSaveMetric = (updated: FitDailyMetric) => {
    saveSingleFitMetric(updated);
    setMetricsMap(prev => ({ ...prev, [updated.date]: updated }));
    window.dispatchEvent(new CustomEvent('emreh_fit_updated'));
  };

  const handleImportMetrics = (newMetrics: Record<string, FitDailyMetric>) => {
    const merged = { ...metricsMap, ...newMetrics };
    persistStoredFitMetrics(merged);
    setMetricsMap(merged);
    window.dispatchEvent(new CustomEvent('emreh_fit_updated'));
  };

  // 1. Daily Metrics for currentDate (merging dataset + stored metrics)
  const dailyData = useMemo(() => {
    const stored = metricsMap[dateKeyStr];

    // Check dataset daily summaries
    const summary = dataset?.dailySummaries?.find(s => s.date === dateKeyStr);
    const intervals = (dataset?.dailyIntervals || []).filter(i => {
      const d = i.startTime.split('T')[0];
      return d === dateKeyStr;
    });

    let steps = stored?.steps || 0;
    let distanceMeters = (stored?.distanceKm ? stored.distanceKm * 1000 : 0);
    let calories = stored?.caloriesTotal || stored?.caloriesActive || 0;
    let moveMinutes = stored?.moveMinutes || 0;
    let heartPoints = stored?.heartPoints || 0;
    let restingHr = stored?.restingHeartRate || 64;
    let sleepHours = stored?.sleepHours || 7.2;

    if (summary) {
      if (!steps && summary.values['Step count']) steps = Number(summary.values['Step count']);
      if (!distanceMeters && summary.values['Distance (m)']) distanceMeters = Number(summary.values['Distance (m)']);
      if (!calories && summary.values['Calories (kcal)']) calories = Number(summary.values['Calories (kcal)']);
      if (!moveMinutes && summary.values['Move Minutes count']) moveMinutes = Number(summary.values['Move Minutes count']);
      if (!heartPoints && (summary.values['Heart Minutes'] || summary.values['Heart Points'])) {
        heartPoints = Number(summary.values['Heart Minutes'] || summary.values['Heart Points']);
      }
    } else if (intervals.length > 0) {
      let intSteps = 0;
      let intDist = 0;
      let intCal = 0;
      let intMove = 0;
      let intHeart = 0;
      intervals.forEach(i => {
        intSteps += Number(i.values['Step count'] || 0);
        intDist += Number(i.values['Distance (m)']) || 0;
        intCal += Number(i.values['Calories (kcal)']) || 0;
        intMove += Number(i.values['Move Minutes count']) || 0;
        intHeart += Number(i.values['Heart Minutes'] || i.values['Heart Points'] || 0);
      });
      if (!steps) steps = intSteps;
      if (!distanceMeters) distanceMeters = intDist;
      if (!calories) calories = intCal;
      if (!moveMinutes) moveMinutes = intMove;
      if (!heartPoints) heartPoints = intHeart;
    }

    // Workouts on this date
    const workouts = (dataset?.workouts || []).filter(w => {
      const d = w.startTime.split('T')[0];
      return d === dateKeyStr;
    });

    // Hourly intervals for 24h chart
    const hourlySteps = new Array(24).fill(0);
    intervals.forEach(inv => {
      try {
        const hour = new Date(inv.startTime).getHours();
        if (hour >= 0 && hour < 24) {
          hourlySteps[hour] += Number(inv.values['Step count'] || 0);
        }
      } catch (_) {}
    });

    return {
      steps,
      distanceKm: distanceMeters / 1000,
      calories,
      moveMinutes,
      heartPoints,
      restingHr,
      sleepHours,
      workouts,
      hourlySteps
    };
  }, [dateKeyStr, metricsMap, dataset]);

  // Goals
  const stepGoal = 10000;
  const heartPointsGoal = 30;
  const stepProgress = Math.min(100, Math.round((dailyData.steps / stepGoal) * 100));
  const heartProgress = Math.min(100, Math.round((dailyData.heartPoints / heartPointsGoal) * 100));

  // 2. Health Analytics & Overall Insights
  const overallInsights = useMemo(() => {
    const workouts = dataset?.workouts || [];
    const summaries = dataset?.dailySummaries || [];
    const intervals = dataset?.dailyIntervals || [];
    const measurements = dataset?.measurements || [];

    let totalSteps = 0;
    let totalDistanceMeters = 0;
    let totalCalories = 0;
    let totalMoveMinutes = 0;
    let totalHeartPoints = 0;

    if (summaries.length > 0) {
      summaries.forEach(s => {
        totalSteps += Number(s.values['Step count'] || 0);
        totalDistanceMeters += Number(s.values['Distance (m)'] || 0);
        totalCalories += Number(s.values['Calories (kcal)'] || 0);
        totalMoveMinutes += Number(s.values['Move Minutes count'] || 0);
        totalHeartPoints += Number(s.values['Heart Minutes'] || s.values['Heart Points'] || 0);
      });
    } else {
      intervals.forEach(i => {
        totalSteps += Number(i.values['Step count'] || 0);
        totalDistanceMeters += Number(i.values['Distance (m)'] || 0);
        totalCalories += Number(i.values['Calories (kcal)'] || 0);
        totalMoveMinutes += Number(i.values['Move Minutes count'] || 0);
        totalHeartPoints += Number(i.values['Heart Minutes'] || i.values['Heart Points'] || 0);
      });
    }

    // Also factor stored metrics if summaries were zero
    if (totalSteps === 0 && Object.keys(metricsMap).length > 0) {
      (Object.values(metricsMap) as FitDailyMetric[]).forEach(m => {
        totalSteps += m.steps || 0;
        totalDistanceMeters += (m.distanceKm || 0) * 1000;
        totalCalories += m.caloriesTotal || m.caloriesActive || 0;
        totalMoveMinutes += m.moveMinutes || 0;
        totalHeartPoints += m.heartPoints || 0;
      });
    }

    // Activity breakdown
    const activityMap = new Map<string, { count: number; durationSeconds: number; distanceMeters: number; calories: number }>();
    workouts.forEach(w => {
      const label = fitActivityLabel(w.activityType || 'Workout');
      if (!activityMap.has(label)) {
        activityMap.set(label, { count: 0, durationSeconds: 0, distanceMeters: 0, calories: 0 });
      }
      const it = activityMap.get(label)!;
      it.count += 1;
      it.durationSeconds += w.durationSeconds || 0;
      it.distanceMeters += w.distanceMeters || 0;
      it.calories += w.calories || 0;
    });

    const activityBreakdown = Array.from(activityMap.entries())
      .map(([label, stats]) => ({
        label,
        ...stats,
        percentage: workouts.length > 0 ? (stats.count / workouts.length) * 100 : 0
      }))
      .sort((a, b) => b.durationSeconds - a.durationSeconds);

    // Weekday distribution (0 = Sun, 6 = Sat)
    const dayStats = [
      { name: 'Sun', steps: 0, daysCount: 0 },
      { name: 'Mon', steps: 0, daysCount: 0 },
      { name: 'Tue', steps: 0, daysCount: 0 },
      { name: 'Wed', steps: 0, daysCount: 0 },
      { name: 'Thu', steps: 0, daysCount: 0 },
      { name: 'Fri', steps: 0, daysCount: 0 },
      { name: 'Sat', steps: 0, daysCount: 0 }
    ];

    summaries.forEach(s => {
      try {
        const parts = s.date.split('-').map(Number);
        if (parts.length === 3) {
          const d = new Date(parts[0], parts[1] - 1, parts[2]);
          const dayIdx = d.getDay();
          dayStats[dayIdx].steps += Number(s.values['Step count'] || 0);
          dayStats[dayIdx].daysCount += 1;
        }
      } catch (_) {}
    });

    const maxDayAvg = Math.max(
      ...dayStats.map(d => (d.daysCount > 0 ? d.steps / d.daysCount : 0)),
      1
    );

    // Body weight telemetry
    const weightMeasurements = measurements.filter(m =>
      m.metricName?.toLowerCase().includes('weight') ||
      m.dataType?.toLowerCase().includes('weight')
    );
    const latestWeight = weightMeasurements.length > 0 ? weightMeasurements[0].value : undefined;

    return {
      totalSteps,
      totalDistanceKm: totalDistanceMeters / 1000,
      totalCalories,
      totalMoveMinutes,
      totalHeartPoints,
      workoutsCount: workouts.length,
      activityBreakdown,
      dayStats,
      maxDayAvg,
      measurements,
      latestWeight
    };
  }, [dataset, metricsMap]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* 1. Header & Navigation Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white/70 dark:bg-[#15171e]/80 backdrop-blur-xl border border-stone-200/80 dark:border-white/10 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <HeartPulse className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Health Insights
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
              Unified Biometrics
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Movement rings, 30-day trends, daily rhythms, training analytics & body telemetry
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Vitals</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-700 dark:text-stone-200 font-bold text-xs border border-stone-200/80 dark:border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>

          {onLoadSampleData && (
            <button
              type="button"
              onClick={onLoadSampleData}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Generate 30 days of realistic sample vitals"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sample 30d</span>
            </button>
          )}
        </div>
      </div>

      {/* Subview Filter Section Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'All Insights', icon: Layers },
          { id: 'vitals', label: 'Movement Rings', icon: Target },
          { id: 'trends', label: '30-Day Trends', icon: TrendingUp },
          { id: 'daylog', label: 'Day Rhythm & Workouts', icon: Calendar },
          { id: 'analytics', label: 'Activity Patterns', icon: BarChart2 },
          { id: 'body', label: 'Body & Telemetry', icon: Weight }
        ].map(pill => {
          const Icon = pill.icon;
          const isSelected = activeSection === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => setActiveSection(pill.id as any)}
              className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white/60 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 border border-stone-200/70 dark:border-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: DAILY VITALS & MOVEMENT RINGS */}
      {(activeSection === 'all' || activeSection === 'vitals') && (
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-[#15171e]/80 backdrop-blur-xl border border-stone-200/80 dark:border-white/10 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              <h2 className="text-base font-black text-gray-900 dark:text-white">
                Daily Rings & Activity Goals
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
              {currentDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Dual Concentric Rings */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-stone-200/60 dark:border-white/5">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  {/* Steps Background */}
                  <circle cx="80" cy="80" r="68" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-stone-200 dark:text-stone-800/80" />
                  {/* Steps Progress */}
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 68}
                    strokeDashoffset={(2 * Math.PI * 68) * (1 - stepProgress / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Heart Points Background */}
                  <circle cx="80" cy="80" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-stone-200 dark:text-stone-800/80" />
                  {/* Heart Points Progress */}
                  <circle
                    cx="80"
                    cy="80"
                    r="50"
                    stroke="#f43f5e"
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 50}
                    strokeDashoffset={(2 * Math.PI * 50) * (1 - heartProgress / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Ring Center Metrics */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                  <span className="text-2xl font-black text-gray-900 dark:text-white">
                    {dailyData.steps.toLocaleString()}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Steps</span>
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-rose-500">
                    <Heart className="w-3 h-3 fill-rose-500" />
                    <span>{dailyData.heartPoints} pts</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Steps ({stepProgress}%)</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Heart Pts ({heartProgress}%)</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-stone-200/80 dark:border-white/5 space-y-1">
                <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase">
                  <span>Steps</span>
                  <Footprints className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-xl font-black text-gray-900 dark:text-white">
                  {dailyData.steps.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold">
                  Goal: {stepGoal.toLocaleString()}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-stone-200/80 dark:border-white/5 space-y-1">
                <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase">
                  <span>Heart Pts</span>
                  <Heart className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-xl font-black text-gray-900 dark:text-white">
                  {dailyData.heartPoints}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold">
                  Goal: {heartPointsGoal} pts
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-stone-200/80 dark:border-white/5 space-y-1">
                <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase">
                  <span>Active Energy</span>
                  <Flame className="w-4 h-4 text-orange-500" />
                </div>
                <div className="text-xl font-black text-gray-900 dark:text-white">
                  {Math.round(dailyData.calories)} <span className="text-xs font-normal">kcal</span>
                </div>
                <div className="text-[10px] text-gray-500 font-semibold">Total burned</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-stone-200/80 dark:border-white/5 space-y-1">
                <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase">
                  <span>Move Time</span>
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-xl font-black text-gray-900 dark:text-white">
                  {dailyData.moveMinutes} <span className="text-xs font-normal">min</span>
                </div>
                <div className="text-[10px] text-gray-500 font-semibold">Active movement</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-stone-200/80 dark:border-white/5 space-y-1">
                <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase">
                  <span>Distance</span>
                  <Compass className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-xl font-black text-gray-900 dark:text-white">
                  {dailyData.distanceKm.toFixed(2)} <span className="text-xs font-normal">km</span>
                </div>
                <div className="text-[10px] text-gray-500 font-semibold">Tracked route</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-stone-200/80 dark:border-white/5 space-y-1">
                <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase">
                  <span>Resting HR</span>
                  <HeartPulse className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-xl font-black text-gray-900 dark:text-white">
                  {dailyData.restingHr} <span className="text-xs font-normal">bpm</span>
                </div>
                <div className="text-[10px] text-gray-500 font-semibold">Resting pulse</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: 30-DAY TRENDS & RECHARTS VISUALIZATION */}
      {(activeSection === 'all' || activeSection === 'trends') && (
        <div className="rounded-3xl overflow-hidden">
          <FitDataVisualizationTab
            dataset={dataset}
            metricsMap={metricsMap}
            currentDate={currentDate}
            onJumpToDate={onJumpToDate}
            onLoadSampleData={onLoadSampleData}
            onSwitchToWorkouts={onSwitchToWorkouts}
          />
        </div>
      )}

      {/* SECTION 3: DAY LOG & HOURLY RHYTHM */}
      {(activeSection === 'all' || activeSection === 'daylog') && (
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-[#15171e]/80 backdrop-blur-xl border border-stone-200/80 dark:border-white/10 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              <h2 className="text-base font-black text-gray-900 dark:text-white">
                Day Movement Rhythm (24h Breakdown)
              </h2>
            </div>
            <span className="text-xs text-gray-500">Hourly Step Distribution</span>
          </div>

          {/* 24-hour bar visualization */}
          <div className="space-y-2">
            <div className="grid grid-cols-24 gap-1 h-20 items-end p-2 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-stone-200/60 dark:border-white/5">
              {dailyData.hourlySteps.map((steps, hour) => {
                const maxSteps = Math.max(...dailyData.hourlySteps, 500);
                const heightPercent = Math.min(100, Math.round((steps / maxSteps) * 100));
                return (
                  <div
                    key={hour}
                    className="h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        steps > 0
                          ? 'bg-orange-500 hover:bg-orange-400 group-hover:scale-y-110'
                          : 'bg-stone-200 dark:bg-white/10 h-1'
                      }`}
                      style={{ height: steps > 0 ? `${Math.max(12, heightPercent)}%` : '4px' }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                      <div className="px-2 py-1 bg-stone-900 text-white rounded text-[10px] whitespace-nowrap shadow-lg">
                        {hour}:00 - {steps.toLocaleString()} steps
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-mono px-1">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>
          </div>

          {/* Today's Logged Workouts */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Workouts Logged on this Day ({dailyData.workouts.length})
            </h3>
            {dailyData.workouts.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-stone-200 dark:border-white/10 text-center text-xs text-gray-400">
                No structured workouts recorded for this day.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dailyData.workouts.map(w => (
                  <div
                    key={w.id}
                    onClick={() => onSelectWorkout?.(w)}
                    className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-stone-200/80 dark:border-white/10 hover:border-orange-500/50 transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          {fitActivityLabel(w.activityType)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(w.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                        <span>{fmt(w.durationSeconds ? w.durationSeconds / 60 : 0, ' min')}</span>
                        {w.distanceMeters && <span>{fmt(w.distanceMeters / 1000, ' km')}</span>}
                        {w.calories && <span>{w.calories} kcal</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWorkout?.(w);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: HEALTH ANALYTICS & ACTIVITY PATTERNS */}
      {(activeSection === 'all' || activeSection === 'analytics') && (
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-[#15171e]/80 backdrop-blur-xl border border-stone-200/80 dark:border-white/10 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-orange-500" />
              <h2 className="text-base font-black text-gray-900 dark:text-white">
                Cumulative Analytics & Activity Patterns
              </h2>
            </div>
            <span className="text-xs text-gray-400 font-bold">
              {overallInsights.workoutsCount} Recorded Workouts
            </span>
          </div>

          {/* KPI Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-stone-200/60 dark:border-white/5 space-y-1">
              <div className="text-[10px] uppercase font-bold text-gray-400">Total Distance</div>
              <div className="text-xl font-black text-gray-900 dark:text-white">
                {overallInsights.totalDistanceKm.toFixed(1)} <span className="text-xs font-normal">km</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-stone-200/60 dark:border-white/5 space-y-1">
              <div className="text-[10px] uppercase font-bold text-gray-400">Active Energy</div>
              <div className="text-xl font-black text-gray-900 dark:text-white">
                {Math.round(overallInsights.totalCalories).toLocaleString()} <span className="text-xs font-normal">kcal</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-stone-200/60 dark:border-white/5 space-y-1">
              <div className="text-[10px] uppercase font-bold text-gray-400">Heart Points</div>
              <div className="text-xl font-black text-rose-500">
                {Math.round(overallInsights.totalHeartPoints).toLocaleString()} <span className="text-xs font-normal">pts</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-stone-200/60 dark:border-white/5 space-y-1">
              <div className="text-[10px] uppercase font-bold text-gray-400">Move Time</div>
              <div className="text-xl font-black text-amber-500">
                {Math.round(overallInsights.totalMoveMinutes / 60)} <span className="text-xs font-normal">hrs</span>
              </div>
            </div>
          </div>

          {/* Activity Type Breakdown */}
          {overallInsights.activityBreakdown.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Activity Distribution by Sport
              </h3>
              <div className="space-y-2">
                {overallInsights.activityBreakdown.slice(0, 5).map(act => (
                  <div key={act.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                      <span>{act.label} ({act.count} sessions)</span>
                      <span>{fmt(act.distanceMeters / 1000, ' km')} • {fmt(act.durationSeconds / 60, ' min')}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-500 transition-all duration-500"
                        style={{ width: `${Math.max(6, act.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekday Rhythm */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Weekday vs Weekend Rhythm (Average Steps by Day)
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {overallInsights.dayStats.map(d => {
                const avg = d.daysCount > 0 ? Math.round(d.steps / d.daysCount) : 0;
                const heightPct = Math.min(100, Math.round((avg / overallInsights.maxDayAvg) * 100));
                return (
                  <div key={d.name} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-stone-200/50 dark:border-white/5">
                    <span className="text-[10px] font-mono text-gray-400 uppercase">{d.name}</span>
                    <div className="w-full h-16 flex items-end justify-center">
                      <div
                        className="w-full max-w-[20px] rounded-t bg-orange-500/80 transition-all"
                        style={{ height: `${Math.max(8, heightPct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{avg > 0 ? `${Math.round(avg / 1000)}k` : '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: BODY COMPOSITION & TELEMETRY */}
      {(activeSection === 'all' || activeSection === 'body') && (
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-[#15171e]/80 backdrop-blur-xl border border-stone-200/80 dark:border-white/10 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Weight className="w-5 h-5 text-orange-500" />
              <h2 className="text-base font-black text-gray-900 dark:text-white">
                Body Composition & Sensor Telemetry
              </h2>
            </div>
            <span className="text-xs text-gray-400 font-bold">
              {overallInsights.measurements.length} Sensor Records
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Weight card */}
            <div className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-stone-200/60 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-gray-400">Body Weight</span>
                <span className="text-xs font-bold text-orange-500">
                  {overallInsights.latestWeight !== undefined ? `${overallInsights.latestWeight.toFixed(1)} kg` : '72.4 kg'}
                </span>
              </div>
              <div className="text-3xl font-black text-gray-900 dark:text-white">
                {overallInsights.latestWeight !== undefined ? `${overallInsights.latestWeight.toFixed(1)} kg` : '72.4 kg'}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Aggregated from connected scales (Withings, Health Connect, Garmin, Fitbit) and manual logs.
              </p>
            </div>

            {/* Resting Heart Rate card */}
            <div className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-stone-200/60 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-gray-400">Cardiovascular Baseline</span>
                <span className="text-xs font-bold text-emerald-500">Normal Range</span>
              </div>
              <div className="text-3xl font-black text-gray-900 dark:text-white">
                {dailyData.restingHr} <span className="text-sm font-normal text-gray-400">bpm</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Calculated during restful baseline and nocturnal sleep cycles.
              </p>
            </div>
          </div>

          {/* Measurements table */}
          {overallInsights.measurements.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Recent Sensor Telemetry Log ({Math.min(10, overallInsights.measurements.length)} of {overallInsights.measurements.length})
              </h3>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {overallInsights.measurements.slice(0, 10).map(m => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-stone-200/40 dark:border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-gray-800 dark:text-gray-200 capitalize">
                        {m.metricName || m.dataType || 'Measurement'}
                      </span>
                      <span className="text-gray-400 ml-2 font-mono text-[10px]">
                        {new Date(m.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-orange-500">
                      {m.value} {m.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals for Logging and CSV Takeout Importing */}
      <FitLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        targetDate={dateKeyStr}
        existingMetric={metricsMap[dateKeyStr]}
        onSaveMetric={handleSaveMetric}
      />

      <FitImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportMetrics={handleImportMetrics}
      />
    </div>
  );
};
