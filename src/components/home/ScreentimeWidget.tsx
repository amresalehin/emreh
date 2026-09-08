import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Smartphone,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { ViewType, ScreentimeDayData } from '../../types';
import { loadStoredScreentimeData } from '../../utils/screentimeStorage';
import { formatMinutes } from '../../utils/screentimeCalculator';

interface ScreentimeWidgetProps {
  currentDate?: Date;
  onNavigateView?: (view: ViewType) => void;
}

export const ScreentimeWidget: React.FC<ScreentimeWidgetProps> = ({
  currentDate = new Date(),
  onNavigateView
}) => {
  const [storedData, setStoredData] = useState<Record<string, ScreentimeDayData>>({});

  const dateKey = currentDate.toISOString().slice(0, 10);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      const saved = await loadStoredScreentimeData();
      if (mounted) setStoredData(saved);
    }
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('emreh_screentime_updated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('emreh_screentime_updated', handleUpdate);
    };
  }, []);

  const todayData: ScreentimeDayData | null = useMemo(() => {
    if (storedData[dateKey]) return storedData[dateKey];
    const keys = Object.keys(storedData).sort();
    return keys.length > 0 ? storedData[keys[keys.length - 1]] : null;
  }, [storedData, dateKey]);

  const topApps = (todayData?.apps || []).slice(0, 3);
  const totalMinutes = todayData?.totalMinutes || 0;

  return (
    <div
      onClick={() => onNavigateView?.('screentime')}
      className="p-5 rounded-3xl bg-white/60 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-white/10 shadow-sm backdrop-blur-xl hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                Screentime
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Digital focus & pickups
              </p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {todayData && totalMinutes > 0 ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {formatMinutes(totalMinutes)}
              </span>
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-sky-500" />
                {todayData.pickupsCount} pickups
              </span>
            </div>

            {/* Category breakdown line */}
            <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden flex">
              {Object.entries(todayData.categories).map(([cat, mins]) => {
                if (mins <= 0) return null;
                const pct = (mins / totalMinutes) * 100;
                let bg = 'bg-zinc-400';
                if (cat === 'development') bg = 'bg-sky-500';
                if (cat === 'productivity') bg = 'bg-emerald-500';
                if (cat === 'social') bg = 'bg-violet-500';
                if (cat === 'entertainment') bg = 'bg-rose-500';
                if (cat === 'reading') bg = 'bg-amber-500';
                return (
                  <div key={cat} style={{ width: `${pct}%` }} className={`h-full ${bg}`} />
                );
              })}
            </div>

            {/* Top apps */}
            <div className="space-y-1.5 pt-1">
              {topApps.map(app => (
                <div key={app.id} className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                    {app.name}
                  </span>
                  <span className="font-mono text-gray-400">
                    {formatMinutes(app.durationMinutes)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center space-y-2">
            <p className="text-xs text-gray-400">No screentime recorded for today</p>
            <span className="inline-block text-[11px] font-semibold text-indigo-500 group-hover:underline">
              Open Screentime Hub →
            </span>
          </div>
        )}
      </div>

      <div className="pt-3 mt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[10px] text-gray-400 font-medium">
        <span>Daily Tracker</span>
        <span className="text-indigo-500 font-semibold group-hover:translate-x-0.5 transition-transform">
          View Details
        </span>
      </div>
    </div>
  );
};
