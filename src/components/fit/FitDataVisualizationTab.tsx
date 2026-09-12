import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import {
  Activity,
  Award,
  Calendar,
  ChevronRight,
  Flame,
  Heart,
  HeartPulse,
  Info,
  Layers,
  Sparkles,
  TrendingUp,
  Zap
} from 'lucide-react';
import { FitDailyMetric } from '../../types';
import { GoogleFitDataset } from '../../utils/googleFitParser';

interface FitDataVisualizationTabProps {
  metricsMap?: Record<string, FitDailyMetric>;
  dataset?: GoogleFitDataset | null;
  currentDate: Date;
  onJumpToDate: (date: Date) => void;
  onLoadSampleData?: () => void;
  onSwitchToVitals?: () => void;
  onSwitchToWorkouts?: () => void;
}

type TimeRangeOption = 7 | 14 | 30;
type ChartViewMode = 'combined' | 'steps_focus' | 'heart_focus';

export const FitDataVisualizationTab: React.FC<FitDataVisualizationTabProps> = ({
  metricsMap = {},
  dataset = null,
  currentDate,
  onJumpToDate,
  onLoadSampleData,
  onSwitchToVitals,
  onSwitchToWorkouts
}) => {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>(30);
  const [viewMode, setViewMode] = useState<ChartViewMode>('combined');
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Selected date formatted as YYYY-MM-DD
  const selectedDateStr = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentDate]);

  // Merge metricsMap and dataset.dailySummaries into a single lookup table
  const unifiedDailyMetrics = useMemo(() => {
    const map = new Map<string, {
      steps: number;
      heartPoints: number;
      moveMinutes: number;
      calories: number;
      distanceKm: number;
      workoutsCount: number;
    }>();

    // 1. Ingest from dataset dailySummaries if available
    if (dataset?.dailySummaries) {
      for (const s of dataset.dailySummaries) {
        if (!s.date) continue;
        const vals = s.values || {};
        const steps = Number(vals['Step count'] || vals['steps'] || vals['Steps'] || 0);
        const heartPoints = Number(vals['Heart Points'] || vals['Heart Minutes'] || vals['heart_minutes'] || 0);
        const moveMinutes = Number(vals['Move Minutes count'] || vals['move_minutes'] || 0);
        const calories = Number(vals['Calories (kcal)'] || vals['calories'] || 0);
        const distM = Number(vals['Distance (m)'] || vals['distance'] || 0);

        map.set(s.date, {
          steps,
          heartPoints,
          moveMinutes,
          calories,
          distanceKm: distM > 0 ? distM / 1000 : 0,
          workoutsCount: 0
        });
      }
    }

    // 2. Count workouts by day from dataset
    if (dataset?.workouts) {
      for (const w of dataset.workouts) {
        const d = w.startTime ? w.startTime.slice(0, 10) : '';
        if (!d) continue;
        const existing = map.get(d) || {
          steps: 0,
          heartPoints: 0,
          moveMinutes: 0,
          calories: 0,
          distanceKm: 0,
          workoutsCount: 0
        };
        existing.workoutsCount += 1;
        map.set(d, existing);
      }
    }

    // 3. Ingest or override with stored metricsMap
    for (const [dateKey, rawM] of Object.entries(metricsMap)) {
      const m = rawM as FitDailyMetric;
      const existing = map.get(dateKey);
      map.set(dateKey, {
        steps: m.steps || existing?.steps || 0,
        heartPoints: m.heartPoints || existing?.heartPoints || 0,
        moveMinutes: m.moveMinutes || existing?.moveMinutes || 0,
        calories: m.caloriesActive || m.caloriesTotal || existing?.calories || 0,
        distanceKm: m.distanceKm || existing?.distanceKm || 0,
        workoutsCount: (m.workouts?.length || 0) || (existing?.workoutsCount || 0)
      });
    }

    return map;
  }, [metricsMap, dataset]);

  // Determine anchor date for the range:
  // If currentDate has data or is within dataset range, use currentDate; otherwise find latest date in data
  const anchorDate = useMemo(() => {
    if (unifiedDailyMetrics.size === 0) return currentDate;
    // Check if currentDate is in or near the range
    if (unifiedDailyMetrics.has(selectedDateStr)) {
      return currentDate;
    }
    // Find latest date in data
    const allDates = (Array.from(unifiedDailyMetrics.keys()) as string[]).sort();
    const latest = allDates[allDates.length - 1];
    if (typeof latest === 'string') {
      const parts = latest.split('-').map(Number);
      if (parts.length === 3) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    return currentDate;
  }, [unifiedDailyMetrics, selectedDateStr, currentDate]);

  // Build the timeRange (e.g. 30 days) array
  const chartData = useMemo(() => {
    const result = [];
    const count = timeRange;

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(anchorDate.getTime() - i * 86400000);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${dayNum}`;

      const metric = unifiedDailyMetrics.get(dateKey) || {
        steps: 0,
        heartPoints: 0,
        moveMinutes: 0,
        calories: 0,
        distanceKm: 0,
        workoutsCount: 0
      };

      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      const isSelected = dateKey === selectedDateStr;

      result.push({
        date: dateKey,
        displayDate: `${monthName} ${dayNum}`,
        weekday,
        steps: metric.steps,
        stepsGoal: 10000,
        heartPoints: metric.heartPoints,
        heartPointsGoal: 40,
        moveMinutes: metric.moveMinutes,
        calories: metric.calories,
        distanceKm: Number(metric.distanceKm.toFixed(2)),
        workoutsCount: metric.workoutsCount,
        isSelected,
        stepsMet: metric.steps >= 10000,
        heartMet: metric.heartPoints >= 40
      });
    }

    return result;
  }, [anchorDate, timeRange, unifiedDailyMetrics, selectedDateStr]);

  // Summary statistics for the selected time range
  const summaryStats = useMemo(() => {
    const totalSteps = chartData.reduce((s, d) => s + d.steps, 0);
    const totalHeartPoints = chartData.reduce((s, d) => s + d.heartPoints, 0);
    const totalDistance = chartData.reduce((s, d) => s + d.distanceKm, 0);
    const totalCalories = chartData.reduce((s, d) => s + d.calories, 0);
    const count = chartData.length || 1;

    const avgSteps = Math.round(totalSteps / count);
    const avgHeartPoints = Math.round((totalHeartPoints / count) * 10) / 10;
    
    const daysStepGoalMet = chartData.filter(d => d.stepsMet).length;
    const daysHeartGoalMet = chartData.filter(d => d.heartMet).length;

    // Peak day
    let peakStepsDay = chartData[0];
    for (const d of chartData) {
      if (d.steps > (peakStepsDay?.steps || 0)) {
        peakStepsDay = d;
      }
    }

    // Weekly Heart Points projection (AHA recommends 150/week)
    const weeklyHeartRatePace = Math.round(avgHeartPoints * 7);

    return {
      totalSteps,
      avgSteps,
      totalHeartPoints,
      avgHeartPoints,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalCalories,
      daysStepGoalMet,
      daysHeartGoalMet,
      consistencyRate: Math.round((daysStepGoalMet / count) * 100),
      peakStepsDay,
      weeklyHeartRatePace
    };
  }, [chartData]);

  // Day-of-week averages
  const weekdayAverages = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const buckets: Record<string, { steps: number[]; heart: number[] }> = {
      Mon: { steps: [], heart: [] },
      Tue: { steps: [], heart: [] },
      Wed: { steps: [], heart: [] },
      Thu: { steps: [], heart: [] },
      Fri: { steps: [], heart: [] },
      Sat: { steps: [], heart: [] },
      Sun: { steps: [], heart: [] }
    };

    for (const item of chartData) {
      if (buckets[item.weekday]) {
        buckets[item.weekday].steps.push(item.steps);
        buckets[item.weekday].heart.push(item.heartPoints);
      }
    }

    return days.map(d => {
      const sList = buckets[d].steps;
      const hList = buckets[d].heart;
      const avgS = sList.length > 0 ? Math.round(sList.reduce((a, b) => a + b, 0) / sList.length) : 0;
      const avgH = hList.length > 0 ? Math.round(hList.reduce((a, b) => a + b, 0) / hList.length) : 0;
      return { day: d, avgSteps: avgS, avgHeart: avgH };
    });
  }, [chartData]);

  const handleBarClick = (entry: any) => {
    if (entry && entry.date) {
      const parts = entry.date.split('-').map(Number);
      if (parts.length === 3) {
        onJumpToDate(new Date(parts[0], parts[1] - 1, parts[2]));
      }
    }
  };

  const hasData = summaryStats.totalSteps > 0 || summaryStats.totalHeartPoints > 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Controls & Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-stone-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Activity & Heart Telemetry Trends
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
              Last {timeRange} Days
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Plotting daily step count against cardiovascular heart points with goal compliance baselines
          </p>
        </div>

        {/* Action / Mode Pickers */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Range Selector */}
          <div className="inline-flex p-1 bg-stone-100 dark:bg-white/5 rounded-xl border border-stone-200/80 dark:border-white/10 text-xs">
            {([7, 14, 30] as TimeRangeOption[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                  timeRange === r
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {r} Days
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex p-1 bg-stone-100 dark:bg-white/5 rounded-xl border border-stone-200/80 dark:border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('combined')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'combined'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs'
                  : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
              }`}
              title="Dual Y-Axis: Steps and Heart Points together"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span>Dual Metric</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('steps_focus')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'steps_focus'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs'
                  : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>Steps Only</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('heart_focus')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'heart_focus'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs'
                  : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Heart Pts Only</span>
            </button>
          </div>

          {!hasData && onLoadSampleData && (
            <button
              type="button"
              onClick={onLoadSampleData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load 30-Day Sample</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Headline Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Steps & Daily Average */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-stone-200/80 dark:border-white/10 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
              {timeRange}-Day Steps
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {summaryStats.totalSteps.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-stone-100 dark:border-white/5">
            <span className="text-stone-500 dark:text-zinc-400">Avg / Day:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {summaryStats.avgSteps.toLocaleString()} steps
            </span>
          </div>
        </div>

        {/* Metric 2: Heart Points */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-stone-200/80 dark:border-white/10 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
              {timeRange}-Day Heart Points
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {summaryStats.totalHeartPoints.toLocaleString()} <span className="text-sm font-semibold text-rose-500">pts</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-stone-100 dark:border-white/5">
            <span className="text-stone-500 dark:text-zinc-400">Weekly Pace:</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {summaryStats.weeklyHeartRatePace} pts <span className="text-[10px] font-normal text-stone-400">({summaryStats.weeklyHeartRatePace >= 150 ? '≥ 150 Target' : '< 150'})</span>
            </span>
          </div>
        </div>

        {/* Metric 3: Goal Consistency */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-stone-200/80 dark:border-white/10 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
              Goal Consistency
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {summaryStats.consistencyRate}%
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-stone-100 dark:border-white/5">
            <span className="text-stone-500 dark:text-zinc-400">10k Step Days:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {summaryStats.daysStepGoalMet} of {chartData.length} days
            </span>
          </div>
        </div>

        {/* Metric 4: Peak Activity Day */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-stone-200/80 dark:border-white/10 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
              Peak Movement Day
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {summaryStats.peakStepsDay ? summaryStats.peakStepsDay.steps.toLocaleString() : '0'} <span className="text-xs font-semibold text-stone-400">steps</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-stone-100 dark:border-white/5">
            <span className="text-stone-500 dark:text-zinc-400">Date:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {summaryStats.peakStepsDay?.displayDate || 'N/A'} ({summaryStats.peakStepsDay?.heartPoints || 0} pts)
            </span>
          </div>
        </div>
      </div>

      {/* Primary Visualizer Chart Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-stone-200/80 dark:border-white/10 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-stone-200/60 dark:border-white/10">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Daily Steps & Cardiovascular Intensity</span>
              <span className="text-[11px] font-normal text-stone-500 dark:text-zinc-400">
                (Click any column to jump to that day's logs)
              </span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
              Green bars represent step count (left axis); Rose curve represents heart points (right axis).
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
              <span className="text-stone-700 dark:text-stone-300 font-medium">Daily Steps</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-rose-500 inline-block" />
              <span className="text-stone-700 dark:text-stone-300 font-medium">Heart Points</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0 border-t-2 border-dashed border-emerald-400 inline-block" />
              <span className="text-stone-400 font-medium">10k Goal</span>
            </div>
          </div>
        </div>

        {/* Recharts Composed Chart */}
        <div className="w-full h-[380px] sm:h-[420px] select-none">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length > 0) {
                  handleBarClick(state.activePayload[0].payload);
                }
              }}
            >
              <defs>
                <linearGradient id="emeraldBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.65} />
                </linearGradient>
                <linearGradient id="selectedBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="roseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-stone-200 dark:text-zinc-800"
              />

              <XAxis
                dataKey="displayDate"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />

              {/* Left Y Axis: Steps */}
              <YAxis
                yAxisId="steps"
                orientation="left"
                stroke="#10b981"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`)}
                domain={[0, (dataMax: number) => Math.max(12000, Math.ceil(dataMax * 1.15))]}
              />

              {/* Right Y Axis: Heart Points */}
              <YAxis
                yAxisId="heartPoints"
                orientation="right"
                stroke="#f43f5e"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}p`}
                domain={[0, (dataMax: number) => Math.max(50, Math.ceil(dataMax * 1.2))]}
              />

              {/* Goal Reference Lines */}
              <ReferenceLine
                yAxisId="steps"
                y={10000}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{
                  value: '10,000 Step Goal',
                  fill: '#10b981',
                  fontSize: 10,
                  position: 'insideTopLeft'
                }}
              />

              <ReferenceLine
                yAxisId="heartPoints"
                y={40}
                stroke="#f43f5e"
                strokeDasharray="3 3"
                label={{
                  value: '40 Heart Points Goal',
                  fill: '#f43f5e',
                  fontSize: 10,
                  position: 'insideTopRight'
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="p-3.5 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-stone-200 dark:border-zinc-700 shadow-xl text-xs space-y-2 min-w-[200px]">
                      <div className="flex items-center justify-between border-b border-stone-200 dark:border-zinc-800 pb-1.5">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {item.weekday}, {item.displayDate}
                        </span>
                        {item.isSelected && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 font-bold text-[10px]">
                            Selected
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-stone-600 dark:text-zinc-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Steps:
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {item.steps.toLocaleString()}{' '}
                            <span className={`text-[10px] ${item.stepsMet ? 'text-emerald-500' : 'text-stone-400'}`}>
                              ({Math.round((item.steps / 10000) * 100)}%)
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-stone-600 dark:text-zinc-300">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            Heart Points:
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {item.heartPoints} pts{' '}
                            <span className={`text-[10px] ${item.heartMet ? 'text-rose-500' : 'text-stone-400'}`}>
                              ({Math.round((item.heartPoints / 40) * 100)}%)
                            </span>
                          </span>
                        </div>

                        {item.distanceKm > 0 && (
                          <div className="flex items-center justify-between text-stone-500">
                            <span>Distance:</span>
                            <span className="font-medium text-stone-700 dark:text-zinc-300">{item.distanceKm} km</span>
                          </div>
                        )}

                        {item.calories > 0 && (
                          <div className="flex items-center justify-between text-stone-500">
                            <span>Active Calories:</span>
                            <span className="font-medium text-stone-700 dark:text-zinc-300">{item.calories} kcal</span>
                          </div>
                        )}

                        {item.workoutsCount > 0 && (
                          <div className="flex items-center justify-between text-stone-500">
                            <span>Workouts:</span>
                            <span className="font-semibold text-orange-500">{item.workoutsCount} logged</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-1.5 border-t border-stone-100 dark:border-zinc-800 text-[10px] text-stone-400 italic">
                        Click to jump to this date
                      </div>
                    </div>
                  );
                }}
              />

              {/* View mode 1: Combined Dual Axis */}
              {viewMode === 'combined' && (
                <>
                  <Bar
                    yAxisId="steps"
                    dataKey="steps"
                    radius={[4, 4, 0, 0]}
                    name="Daily Steps"
                    cursor="pointer"
                  >
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.isSelected ? 'url(#selectedBarGrad)' : 'url(#emeraldBarGrad)'}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="heartPoints"
                    type="monotone"
                    dataKey="heartPoints"
                    stroke="#f43f5e"
                    strokeWidth={2.75}
                    dot={{ r: 3, fill: '#f43f5e', strokeWidth: 1 }}
                    activeDot={{ r: 6, fill: '#f43f5e' }}
                    name="Heart Points"
                  />
                </>
              )}

              {/* View mode 2: Steps Focus */}
              {viewMode === 'steps_focus' && (
                <Bar
                  yAxisId="steps"
                  dataKey="steps"
                  radius={[4, 4, 0, 0]}
                  name="Daily Steps"
                  cursor="pointer"
                >
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.isSelected ? 'url(#selectedBarGrad)' : 'url(#emeraldBarGrad)'}
                    />
                  ))}
                </Bar>
              )}

              {/* View mode 3: Heart Points Focus */}
              {viewMode === 'heart_focus' && (
                <Area
                  yAxisId="heartPoints"
                  type="monotone"
                  dataKey="heartPoints"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  fill="url(#roseAreaGrad)"
                  dot={{ r: 3.5, fill: '#f43f5e' }}
                  activeDot={{ r: 6, fill: '#f43f5e' }}
                  name="Heart Points"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Analytics: Day-of-Week Rhythm & 30-Day Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Day of Week Movement Profile */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-stone-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              Day-of-Week Rhythm
            </h4>
            <span className="text-[10px] text-stone-400">Average steps</span>
          </div>

          <p className="text-xs text-stone-500 dark:text-zinc-400 mb-4">
            Movement patterns across days of the week over the last {timeRange} days:
          </p>

          <div className="space-y-2.5">
            {weekdayAverages.map(item => {
              const pct = Math.min(100, Math.round((item.avgSteps / 12000) * 100));
              return (
                <div key={item.day} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-700 dark:text-zinc-300 w-10">
                      {item.day}
                    </span>
                    <span className="text-stone-500 dark:text-zinc-400 font-mono text-[11px]">
                      {item.avgSteps.toLocaleString()} steps · {item.avgHeart} pts
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Chronological 30-Day Activity List & Jump Portal */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-stone-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              Recent Daily Breakdown
            </h4>
            <span className="text-[11px] text-stone-400">
              Showing {chartData.length} days
            </span>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-white/5 max-h-[290px] overflow-y-auto pr-1">
            {chartData.slice().reverse().map(item => (
              <div
                key={item.date}
                onClick={() => handleBarClick(item)}
                className={`py-2 px-3 rounded-xl flex items-center justify-between text-xs transition cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 ${
                  item.isSelected ? 'bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 text-stone-500 dark:text-zinc-400 font-medium text-[11px]">
                    {item.weekday}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {item.displayDate}
                    </span>
                    {item.workoutsCount > 0 && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 font-semibold">
                        {item.workoutsCount} workout{item.workoutsCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`font-bold ${item.stepsMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-700 dark:text-zinc-300'}`}>
                      {item.steps.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-stone-400 ml-1">steps</span>
                  </div>

                  <div className="text-right w-16">
                    <span className={`font-bold ${item.heartMet ? 'text-rose-600 dark:text-rose-400' : 'text-stone-700 dark:text-zinc-300'}`}>
                      {item.heartPoints}
                    </span>
                    <span className="text-[10px] text-stone-400 ml-1">pts</span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
