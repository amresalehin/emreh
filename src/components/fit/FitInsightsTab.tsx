import React, { useMemo } from 'react';
import {
  Activity,
  Award,
  Bike,
  Calendar,
  Flame,
  Footprints,
  Heart,
  HeartPulse,
  MapPin,
  Route,
  Sparkles,
  Timer,
  TrendingUp,
  Weight,
  Zap
} from 'lucide-react';
import { GoogleFitDataset, FitWorkout, fitActivityLabel } from '../../utils/googleFitParser';

interface FitInsightsTabProps {
  dataset: GoogleFitDataset;
  onSelectWorkout?: (workout: FitWorkout) => void;
  onJumpToDate?: (date: Date) => void;
}

export const FitInsightsTab: React.FC<FitInsightsTabProps> = ({
  dataset,
  onSelectWorkout,
  onJumpToDate
}) => {
  const insights = useMemo(() => {
    const workouts = dataset.workouts || [];
    const summaries = dataset.dailySummaries || [];
    const intervals = dataset.dailyIntervals || [];
    const measurements = dataset.measurements || [];

    // 1. Overall Totals
    let totalSteps = 0;
    let totalDistanceMeters = 0;
    let totalCalories = 0;
    let totalMoveMinutes = 0;
    let totalHeartPoints = 0;

    // Aggregate from summaries if available, else intervals
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

    // If workouts exist, add any workout distance if summaries were empty
    if (totalDistanceMeters === 0) {
      totalDistanceMeters = workouts.reduce((sum, w) => sum + (w.distanceMeters || 0), 0);
    }
    if (totalCalories === 0) {
      totalCalories = workouts.reduce((sum, w) => sum + (w.calories || 0), 0);
    }

    // 2. Activity Type Breakdown
    const activityMap = new Map<
      string,
      { count: number; durationSeconds: number; distanceMeters: number; calories: number; workouts: FitWorkout[] }
    >();

    workouts.forEach(w => {
      const type = w.activityType || 'Workout';
      const label = fitActivityLabel(type);
      if (!activityMap.has(label)) {
        activityMap.set(label, { count: 0, durationSeconds: 0, distanceMeters: 0, calories: 0, workouts: [] });
      }
      const item = activityMap.get(label)!;
      item.count += 1;
      item.durationSeconds += w.durationSeconds || 0;
      item.distanceMeters += w.distanceMeters || 0;
      item.calories += w.calories || 0;
      item.workouts.push(w);
    });

    const activityBreakdown = Array.from(activityMap.entries())
      .map(([label, stats]) => ({
        label,
        ...stats,
        percentage: workouts.length > 0 ? (stats.count / workouts.length) * 100 : 0
      }))
      .sort((a, b) => b.durationSeconds - a.durationSeconds);

    // 3. Day of Week Step & Workout Distribution
    // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const dowSteps = [0, 0, 0, 0, 0, 0, 0];
    const dowDayCount = [0, 0, 0, 0, 0, 0, 0];
    const dowWorkouts = [0, 0, 0, 0, 0, 0, 0];

    summaries.forEach(s => {
      const date = new Date(`${s.date}T00:00:00`);
      if (!isNaN(date.getTime())) {
        const dayIdx = date.getDay();
        dowSteps[dayIdx] += Number(s.values['Step count'] || 0);
        dowDayCount[dayIdx] += 1;
      }
    });

    workouts.forEach(w => {
      const date = new Date(w.startTime);
      if (!isNaN(date.getTime())) {
        dowWorkouts[date.getDay()] += 1;
      }
    });

    const dowAverageSteps = dowSteps.map((sum, idx) =>
      dowDayCount[idx] > 0 ? Math.round(sum / dowDayCount[idx]) : 0
    );

    // 4. Hourly Distribution (from dailyIntervals)
    const hourlySteps = Array(24).fill(0);
    intervals.forEach(i => {
      const date = new Date(i.startTime);
      if (!isNaN(date.getTime())) {
        const hour = date.getHours();
        hourlySteps[hour] += Number(i.values['Step count'] || 0);
      }
    });

    // 5. Goals & Milestones
    let daysWith10kSteps = 0;
    let daysWith30HeartPoints = 0;
    let bestStepDay = { date: '', steps: 0 };
    let longestWorkout: FitWorkout | null = null;

    summaries.forEach(s => {
      const steps = Number(s.values['Step count'] || 0);
      const hp = Number(s.values['Heart Minutes'] || s.values['Heart Points'] || 0);
      if (steps >= 10000) daysWith10kSteps += 1;
      if (hp >= 30) daysWith30HeartPoints += 1;
      if (steps > bestStepDay.steps) {
        bestStepDay = { date: s.date, steps };
      }
    });

    workouts.forEach(w => {
      if (!longestWorkout || (w.durationSeconds || 0) > (longestWorkout.durationSeconds || 0)) {
        longestWorkout = w;
      }
    });

    // 6. Weight & Vitals Trend
    const weightRecords = measurements
      .filter(m => m.metric === 'weight' && m.value != null && Number.isFinite(m.value))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const heartRateRecords = measurements
      .filter(m => m.metric === 'heart_rate' && m.value != null && Number.isFinite(m.value))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return {
      totalSteps,
      totalDistanceKm: totalDistanceMeters / 1000,
      totalCalories,
      totalMoveMinutes,
      totalHeartPoints,
      totalWorkouts: workouts.length,
      activityBreakdown,
      dowAverageSteps,
      dowWorkouts,
      hourlySteps,
      daysWith10kSteps,
      daysWith30HeartPoints,
      bestStepDay,
      longestWorkout,
      weightRecords,
      heartRateRecords,
      daysCount: Math.max(summaries.length, 1)
    };
  }, [dataset]);

  const maxDowStep = Math.max(...insights.dowAverageSteps, 1);
  const maxHourlyStep = Math.max(...insights.hourlySteps, 1);
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="pb-2 border-b border-gray-200/80 dark:border-white/10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-orange-500 font-bold text-xs uppercase tracking-[0.2em]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google Fit Intelligence</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white mt-0.5">
            Movement & Health Insights
          </h2>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {insights.daysCount} days recorded
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white/65 dark:bg-[#181818]/65 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-2xs">
          <div className="flex items-center justify-between text-orange-500 mb-1">
            <Footprints className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase text-gray-400">Total Steps</span>
          </div>
          <div className="text-xl font-black text-gray-900 dark:text-white mt-1">
            {insights.totalSteps.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            Avg {Math.round(insights.totalSteps / insights.daysCount).toLocaleString()} / day
          </div>
        </div>

        <div className="p-3.5 bg-white/65 dark:bg-[#181818]/65 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-2xs">
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <Route className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase text-gray-400">Distance</span>
          </div>
          <div className="text-xl font-black text-gray-900 dark:text-white mt-1">
            {insights.totalDistanceKm.toFixed(1)} <span className="text-xs font-normal">km</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {(insights.totalDistanceKm * 0.621371).toFixed(1)} miles total
          </div>
        </div>

        <div className="p-3.5 bg-white/65 dark:bg-[#181818]/65 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-2xs">
          <div className="flex items-center justify-between text-red-500 mb-1">
            <Flame className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase text-gray-400">Calories</span>
          </div>
          <div className="text-xl font-black text-gray-900 dark:text-white mt-1">
            {Math.round(insights.totalCalories).toLocaleString()} <span className="text-xs font-normal">kcal</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            Active energy burned
          </div>
        </div>

        <div className="p-3.5 bg-white/65 dark:bg-[#181818]/65 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-500 mb-1">
            <HeartPulse className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase text-gray-400">Heart Points</span>
          </div>
          <div className="text-xl font-black text-gray-900 dark:text-white mt-1">
            {Math.round(insights.totalHeartPoints)} <span className="text-xs font-normal">pts</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            AHA / WHO Target &gt;150/wk
          </div>
        </div>

        <div className="p-3.5 bg-white/65 dark:bg-[#181818]/65 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-indigo-500 mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase text-gray-400">Workouts</span>
          </div>
          <div className="text-xl font-black text-gray-900 dark:text-white mt-1">
            {insights.totalWorkouts} <span className="text-xs font-normal">sessions</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {dataset.workouts.filter(w => w.trackpoints.length > 0).length} with GPS tracks
          </div>
        </div>
      </div>

      {/* Activity Type Breakdown */}
      <div className="p-4 bg-white/65 dark:bg-[#181818]/65 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bike className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">Activity Types & Volume</h3>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {insights.activityBreakdown.length} categories
          </span>
        </div>

        {insights.activityBreakdown.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No distinct structured workouts recorded yet in this dataset.
          </p>
        ) : (
          <div className="space-y-3">
            {insights.activityBreakdown.map(act => (
              <div key={act.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {act.label}
                  </span>
                  <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 font-mono">
                    <span>{act.count} sessions</span>
                    <span>{Math.round(act.durationSeconds / 60)} min</span>
                    {act.distanceMeters > 0 && (
                      <span>{(act.distanceMeters / 1000).toFixed(1)} km</span>
                    )}
                    {act.calories > 0 && <span>{act.calories} kcal</span>}
                  </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(act.percentage, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Day of Week Rhythm */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-white/65 dark:bg-[#181818]/65 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Day-of-Week Rhythm</h3>
            </div>
            <span className="text-[10px] text-gray-400 uppercase font-mono">Avg Steps</span>
          </div>

          <div className="space-y-2">
            {dowNames.map((dayName, idx) => {
              const avg = insights.dowAverageSteps[idx];
              const pct = (avg / maxDowStep) * 100;
              const workoutCount = insights.dowWorkouts[idx];
              return (
                <div key={dayName} className="flex items-center gap-2 text-xs">
                  <span className="w-8 font-mono text-gray-500 font-semibold">{dayName}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-white/5 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-orange-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-mono text-gray-700 dark:text-gray-300 font-bold">
                    {avg.toLocaleString()}
                  </span>
                  {workoutCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-medium">
                      {workoutCount} {workoutCount === 1 ? 'act' : 'acts'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 24-Hour Movement Histogram */}
        <div className="p-4 bg-white/65 dark:bg-[#181818]/65 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">24-Hour Activity Spread</h3>
              </div>
              <span className="text-[10px] text-gray-400 uppercase font-mono">Peak Hours</span>
            </div>

            <div className="h-28 flex items-end gap-1 pt-2">
              {insights.hourlySteps.map((steps, hour) => {
                const heightPct = maxHourlyStep > 0 ? (steps / maxHourlyStep) * 100 : 0;
                return (
                  <div
                    key={hour}
                    className="flex-1 flex flex-col items-center group relative cursor-pointer"
                    title={`${hour}:00 - ${steps.toLocaleString()} steps`}
                  >
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-orange-500/60 to-amber-400 group-hover:from-orange-500 group-hover:to-amber-300 transition-all"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-[10px] text-gray-400 font-mono mt-2 pt-1 border-t border-gray-100 dark:border-white/5">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Zap className="w-3.5 h-3.5" />
              <span>Most Active Window</span>
            </div>
            <span className="font-bold text-orange-900 dark:text-orange-200">
              Morning & Evening commute
            </span>
          </div>
        </div>
      </div>

      {/* Goal Milestones & Achievements */}
      <div className="p-4 bg-white/65 dark:bg-[#181818]/65 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-sm text-gray-900 dark:text-white">Fitness Milestones</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-300/30 dark:border-amber-400/15">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              10,000 Steps Days
            </div>
            <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
              {insights.daysWith10kSteps} <span className="text-xs font-normal text-gray-500">days</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              Achieved in {Math.round((insights.daysWith10kSteps / insights.daysCount) * 100)}% of tracked days
            </p>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent border border-red-300/30 dark:border-red-400/15">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              Peak Step Day
            </div>
            <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
              {insights.bestStepDay.steps.toLocaleString()}{' '}
              <span className="text-xs font-normal text-gray-500">steps</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              Recorded on {insights.bestStepDay.date || 'N/A'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-300/30 dark:border-emerald-400/15">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Longest Workout
            </div>
            <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
              {insights.longestWorkout?.durationSeconds
                ? `${Math.round(insights.longestWorkout.durationSeconds / 60)} min`
                : '—'}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              {insights.longestWorkout
                ? fitActivityLabel(insights.longestWorkout.activityType)
                : 'No workouts'}
            </p>
          </div>
        </div>
      </div>

      {/* Body & Health Streams */}
      {(insights.weightRecords.length > 0 || insights.heartRateRecords.length > 0) && (
        <div className="p-4 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Weight className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">Body Vitals Trend</h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {insights.weightRecords.length > 0 && (
              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/5">
                <div className="text-xs font-bold text-gray-500">Weight Entries ({insights.weightRecords.length})</div>
                <div className="mt-2 text-2xl font-black">
                  {insights.weightRecords[insights.weightRecords.length - 1].value?.toFixed(1)} kg
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  First recorded: {insights.weightRecords[0].value?.toFixed(1)} kg
                </div>
              </div>
            )}

            {insights.heartRateRecords.length > 0 && (
              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/5">
                <div className="text-xs font-bold text-gray-500">Resting Heart Rate</div>
                <div className="mt-2 text-2xl font-black text-red-500">
                  {insights.heartRateRecords[insights.heartRateRecords.length - 1].value} bpm
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  Cardiovascular efficiency stream
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
