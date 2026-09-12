import React, { useMemo, useState } from 'react';
import { X, HeartPulse, Footprints, Flame, Route as RouteIcon, Moon, Weight as WeightIcon, TrendingUp, MapPin as MapIcon, Clock } from 'lucide-react';
import { TimelineItem, FitnessDailyMetric, FitnessWeightEntry } from '../types';

interface HealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyMetrics: FitnessDailyMetric[];
  weightEntries: FitnessWeightEntry[];
  activities: TimelineItem[];
  onJumpToDate?: (d: Date) => void;
}

type Tab = 'overview' | 'activities' | 'weight';

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Minimal, dependency-free bar chart used for the daily trend views. */
const MiniBarChart: React.FC<{ values: number[]; labels: string[]; color: string; unit?: string }> = ({ values, labels, color, unit }) => {
  const max = Math.max(1, ...values);
  const width = 640;
  const height = 140;
  const barGap = 3;
  const barWidth = values.length > 0 ? Math.max(2, width / values.length - barGap) : 0;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (values.length === 0) {
    return <div className="h-[140px] flex items-center justify-center text-xs text-gray-400">No daily data yet</div>;
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[140px]" preserveAspectRatio="none">
        {values.map((v, i) => {
          const h = Math.max(1, (v / max) * (height - 4));
          const x = i * (barWidth + barGap);
          return (
            <rect
              key={i}
              x={x}
              y={height - h}
              width={barWidth}
              height={h}
              rx={1.5}
              className={color}
              opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.35}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          );
        })}
      </svg>
      {hoverIdx !== null && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-[10px] font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-2 py-1 rounded-md whitespace-nowrap pointer-events-none">
          {labels[hoverIdx]}: {Math.round(values[hoverIdx]).toLocaleString()}{unit ? ` ${unit}` : ''}
        </div>
      )}
    </div>
  );
};

/** Minimal, dependency-free line chart used for the weight trend. */
const MiniLineChart: React.FC<{ points: { x: number; y: number }[]; labels: string[]; color: string }> = ({ points, labels, color }) => {
  const width = 640;
  const height = 140;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (points.length < 2) {
    return <div className="h-[140px] flex items-center justify-center text-xs text-gray-400">Not enough weight entries for a trend yet</div>;
  }

  const ys = points.map(p => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  const stepX = width / (points.length - 1);

  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: height - 8 - ((p.y - minY) / range) * (height - 16)
  }));
  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[140px]" preserveAspectRatio="none">
        <path d={pathD} fill="none" className={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={hoverIdx === i ? 4 : 2.5}
            className={color}
            fill="currentColor"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        ))}
      </svg>
      {hoverIdx !== null && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-[10px] font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-2 py-1 rounded-md whitespace-nowrap pointer-events-none">
          {labels[hoverIdx]}: {points[hoverIdx].y.toFixed(1)} kg
        </div>
      )}
    </div>
  );
};

const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: string; tint: string }> = ({ icon, label, value, tint }) => (
  <div className="bg-white/70 dark:bg-white/[0.04] border border-black/8 dark:border-white/10 rounded-2xl p-3 flex flex-col gap-1.5">
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tint}`}>{icon}</div>
    <div className="text-lg font-bold text-gray-950 dark:text-white leading-none">{value}</div>
    <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{label}</div>
  </div>
);

export const HealthModal: React.FC<HealthModalProps> = ({
  isOpen,
  onClose,
  dailyMetrics,
  weightEntries,
  activities,
  onJumpToDate
}) => {
  const [tab, setTab] = useState<Tab>('overview');

  const recentDays = useMemo(() => dailyMetrics.slice(-30), [dailyMetrics]);
  const hasAnyData = dailyMetrics.length > 0 || weightEntries.length > 0 || activities.length > 0;

  const avgSteps = useMemo(() => average(recentDays.map(d => d.steps || 0).filter(v => v > 0)), [recentDays]);
  const avgCalories = useMemo(() => average(recentDays.map(d => d.caloriesKcal || 0).filter(v => v > 0)), [recentDays]);
  const totalDistanceKm = useMemo(() => recentDays.reduce((sum, d) => sum + (d.distanceM || 0), 0) / 1000, [recentDays]);
  const avgHeartPoints = useMemo(() => average(recentDays.map(d => d.heartPoints || 0).filter(v => v > 0)), [recentDays]);
  const avgSleepMinutes = useMemo(() => average(recentDays.map(d => d.sleepMinutes || 0).filter(v => v > 0)), [recentDays]);
  const latestWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1] : null;

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => (b.ts > a.ts ? 1 : -1)),
    [activities]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="bg-white dark:bg-[#141414] rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] relative z-10 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-500" />
            Health & Fitness
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Google Fit</span>
          </h3>
          <button onClick={onClose} className="w-7 h-7 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!hasAnyData ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center">
            <HeartPulse className="w-8 h-8 text-rose-300 dark:text-rose-800" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Google Fit data yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
              Export "Fit" from Google Takeout and import the .zip (or the "Fit" folder) using the
              regular import flow. Daily activity metrics, workouts, and weight will show up here
              automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="px-4 pt-3 flex items-center gap-1 shrink-0 border-b border-gray-100 dark:border-gray-800">
              {(['overview', 'activities', 'weight'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg capitalize transition-colors cursor-pointer ${
                    tab === t
                      ? 'text-rose-600 dark:text-rose-400 border-b-2 border-rose-500'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {tab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <KpiCard icon={<Footprints className="w-3.5 h-3.5 text-emerald-600" />} label="Avg. daily steps" value={avgSteps > 0 ? Math.round(avgSteps).toLocaleString() : '—'} tint="bg-emerald-500/15" />
                    <KpiCard icon={<Flame className="w-3.5 h-3.5 text-orange-600" />} label="Avg. daily calories" value={avgCalories > 0 ? `${Math.round(avgCalories)} kcal` : '—'} tint="bg-orange-500/15" />
                    <KpiCard icon={<RouteIcon className="w-3.5 h-3.5 text-sky-600" />} label="Distance (30d)" value={totalDistanceKm > 0 ? `${totalDistanceKm.toFixed(1)} km` : '—'} tint="bg-sky-500/15" />
                    <KpiCard icon={<TrendingUp className="w-3.5 h-3.5 text-violet-600" />} label="Avg. heart points" value={avgHeartPoints > 0 ? Math.round(avgHeartPoints).toString() : '—'} tint="bg-violet-500/15" />
                    <KpiCard icon={<Moon className="w-3.5 h-3.5 text-indigo-600" />} label="Avg. sleep" value={avgSleepMinutes > 0 ? `${(avgSleepMinutes / 60).toFixed(1)} h` : '—'} tint="bg-indigo-500/15" />
                    <KpiCard icon={<WeightIcon className="w-3.5 h-3.5 text-rose-600" />} label="Latest weight" value={latestWeight ? `${latestWeight.weightKg.toFixed(1)} kg` : '—'} tint="bg-rose-500/15" />
                  </div>

                  <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 rounded-2xl p-3">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                      <Footprints className="w-3.5 h-3.5" /> Steps — last {recentDays.length} days
                    </div>
                    <MiniBarChart
                      values={recentDays.map(d => d.steps || 0)}
                      labels={recentDays.map(d => formatDayLabel(d.date))}
                      color="fill-emerald-500"
                      unit="steps"
                    />
                  </div>

                  <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 rounded-2xl p-3">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" /> Calories — last {recentDays.length} days
                    </div>
                    <MiniBarChart
                      values={recentDays.map(d => d.caloriesKcal || 0)}
                      labels={recentDays.map(d => formatDayLabel(d.date))}
                      color="fill-orange-500"
                      unit="kcal"
                    />
                  </div>
                </>
              )}

              {tab === 'activities' && (
                <div className="space-y-2">
                  {sortedActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      No recorded workouts found. Google Fit workouts live in the "Activities" folder of your Takeout export (.tcx files).
                    </div>
                  ) : (
                    sortedActivities.map(a => {
                      const durMin = a.ms_played ? Math.round(a.ms_played / 60000) : 0;
                      const dateStr = a.dateObj instanceof Date && !isNaN(a.dateObj.getTime())
                        ? a.dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : '';
                      return (
                        <button
                          key={a.id}
                          onClick={() => a.dateObj && onJumpToDate && onJumpToDate(a.dateObj)}
                          className="w-full text-left bg-gray-50 dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-gray-900 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <HeartPulse className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{a.title}</span>
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{dateStr}</div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                            {a.distanceKm && (
                              <span className="inline-flex items-center gap-1"><RouteIcon className="w-3 h-3" />{a.distanceKm} km</span>
                            )}
                            {durMin > 0 && (
                              <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{durMin} min</span>
                            )}
                            {a.caloriesKcal && (
                              <span className="inline-flex items-center gap-1"><Flame className="w-3 h-3" />{a.caloriesKcal} kcal</span>
                            )}
                            {a.isRoute && <MapIcon className="w-3.5 h-3.5 text-sky-500" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {tab === 'weight' && (
                <>
                  <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 rounded-2xl p-3">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                      <WeightIcon className="w-3.5 h-3.5" /> Weight trend
                    </div>
                    <MiniLineChart
                      points={weightEntries.map((w, i) => ({ x: i, y: w.weightKg }))}
                      labels={weightEntries.map(w => new Date(w.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}
                      color="text-rose-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    {[...weightEntries].reverse().slice(0, 20).map(w => (
                      <div key={w.id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2">
                        <span className="text-gray-500 dark:text-gray-400">{new Date(w.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="font-bold text-gray-900 dark:text-white">{w.weightKg.toFixed(1)} kg</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
