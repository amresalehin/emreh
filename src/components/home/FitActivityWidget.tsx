import React, { useState, useEffect, useMemo } from 'react';
import {
  HeartPulse,
  Flame,
  Footprints,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Zap,
  Target
} from 'lucide-react';
import { ViewType, FitDailyMetric } from '../../types';
import { loadStoredFitMetrics } from '../../utils/fitStorage';
import { getDateKey } from '../../utils/dataParser';

interface FitActivityWidgetProps {
  currentDate?: Date;
  onNavigateView?: (view: ViewType) => void;
  onImportClick?: () => void;
}

export const FitActivityWidget: React.FC<FitActivityWidgetProps> = ({
  currentDate = new Date(),
  onNavigateView,
  onImportClick
}) => {
  const [metricsMap, setMetricsMap] = useState<Record<string, FitDailyMetric>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Local calendar date formatted as YYYY-MM-DD to avoid UTC off-by-one errors
  const dateKey = useMemo(() => {
    return getDateKey(currentDate);
  }, [currentDate]);

  useEffect(() => {
    async function loadData() {
      try {
        const saved = await loadStoredFitMetrics();
        setMetricsMap(saved);
      } catch (err) {
        console.warn('Failed to load fit metrics for widget:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    const handleUpdate = async () => {
      const refreshed = await loadStoredFitMetrics();
      setMetricsMap(refreshed);
    };

    window.addEventListener('emreh_fit_updated', handleUpdate);
    window.addEventListener('emreh_canonical_fit_updated', handleUpdate);
    return () => {
      window.removeEventListener('emreh_fit_updated', handleUpdate);
      window.removeEventListener('emreh_canonical_fit_updated', handleUpdate);
    };
  }, []);

  // Today's metric or latest available metric
  const todayMetric: FitDailyMetric | null = metricsMap[dateKey] || (() => {
    const keys = Object.keys(metricsMap).sort();
    return keys.length > 0 ? metricsMap[keys[keys.length - 1]] : null;
  })();

  const steps = todayMetric?.steps || 0;
  const stepGoal = 10000;
  const stepPercent = Math.min(100, Math.round((steps / stepGoal) * 100));
  const calories = todayMetric?.caloriesActive || todayMetric?.caloriesTotal || 0;
  const distanceKm = todayMetric?.distanceKm ? todayMetric.distanceKm.toFixed(1) : '0';
  const heartPoints = todayMetric?.heartPoints || 0;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-black/8 dark:border-white/10 shadow-2xs hover:border-emerald-500/30 transition-all flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-white">
                Google Fit Activity
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                {todayMetric?.date === dateKey ? 'Today’s Movement' : todayMetric ? `Latest: ${todayMetric.date}` : 'Daily Fitness'}
              </p>
            </div>
          </div>

          {onNavigateView && (
            <button
              onClick={() => onNavigateView('fit')}
              className="px-2 py-1 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Fit Hub</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Steps Goal Progress */}
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-gray-100">
                <Footprints className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{steps.toLocaleString()} Steps</span>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {todayMetric?.stepsDetail?.sourceLabel || (todayMetric?.stepsSource === 'interval' ? 'Derived aggregate' : 'Google daily aggregate')}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                {stepPercent}% of {stepGoal.toLocaleString()}
              </span>
              {todayMetric?.stepsDetail?.alternatives && todayMetric.stepsDetail.alternatives.length > 0 && (
                <div className="text-[9px] font-mono text-amber-600 dark:text-amber-400" title={`Alternative stream: ${todayMetric.stepsDetail.alternatives.map(a => `${a.value.toLocaleString()} (${a.source})`).join(', ')}`}>
                  Alt: {todayMetric.stepsDetail.alternatives[0].value.toLocaleString()} ({todayMetric.stepsDetail.alternatives[0].source})
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
              style={{ width: `${stepPercent}%` }}
            />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-center text-amber-600 dark:text-amber-400 mb-0.5">
              <Flame className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-bold text-gray-950 dark:text-white">{calories}</div>
            <div className="text-[9px] text-gray-500 dark:text-gray-400">kcal</div>
          </div>

          <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 mb-0.5">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-bold text-gray-950 dark:text-white">{distanceKm}</div>
            <div className="text-[9px] text-gray-500 dark:text-gray-400">km</div>
          </div>

          <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-center text-rose-600 dark:text-rose-400 mb-0.5">
              <HeartPulse className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-bold text-gray-950 dark:text-white">{heartPoints}</div>
            <div className="text-[9px] text-gray-500 dark:text-gray-400">Heart Pts</div>
          </div>
        </div>
      </div>

      {/* Footer link */}
      {!todayMetric && onImportClick && (
        <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5">
          <button
            onClick={onImportClick}
            className="w-full py-1.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Zap className="w-3 h-3" /> Import Google Fit Takeout
          </button>
        </div>
      )}
    </div>
  );
};
