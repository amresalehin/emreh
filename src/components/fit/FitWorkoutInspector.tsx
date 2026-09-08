import React from 'react';
import {
  Activity,
  Calendar,
  Clock,
  Compass,
  Flame,
  HeartPulse,
  MapPin,
  Navigation,
  Route,
  Timer,
  TrendingUp,
  X,
  Zap
} from 'lucide-react';
import { FitWorkout, fitActivityLabel } from '../../utils/googleFitParser';

interface FitWorkoutInspectorProps {
  workout: FitWorkout;
  onClose: () => void;
  onFocusMap?: () => void;
}

export const FitWorkoutInspector: React.FC<FitWorkoutInspectorProps> = ({
  workout,
  onClose,
  onFocusMap
}) => {
  const durationSec = workout.durationSeconds || 0;
  const durationMin = durationSec / 60;
  const distanceKm = (workout.distanceMeters || 0) / 1000;

  // Pace: min / km
  const paceSec = distanceKm > 0.05 ? durationSec / distanceKm : 0;
  const paceMinPart = Math.floor(paceSec / 60);
  const paceSecPart = Math.round(paceSec % 60);
  const paceStr = paceSec > 0 ? `${paceMinPart}:${String(paceSecPart).padStart(2, '0')} /km` : '—';

  // Speed: km / h
  const speedKmh = durationSec > 0 ? distanceKm / (durationSec / 3600) : 0;

  // Trackpoints and heart rates
  const validTrackpoints = (workout.trackpoints || []).filter(
    p => p.lat != null && p.lng != null && !isNaN(p.lat) && !isNaN(p.lng)
  );
  const hrPoints = (workout.trackpoints || [])
    .map(p => p.heartRate)
    .filter((hr): hr is number => hr != null && hr > 0);
  const avgHr = hrPoints.length > 0 ? Math.round(hrPoints.reduce((a, b) => a + b, 0) / hrPoints.length) : null;
  const maxHr = hrPoints.length > 0 ? Math.max(...hrPoints) : null;

  // Altitudes
  const altPoints = (workout.trackpoints || [])
    .map(p => p.altitude)
    .filter((a): a is number => a != null && !isNaN(a));
  const minAlt = altPoints.length > 0 ? Math.round(Math.min(...altPoints)) : null;
  const maxAlt = altPoints.length > 0 ? Math.round(Math.max(...altPoints)) : null;
  const altGain = minAlt != null && maxAlt != null ? Math.max(0, maxAlt - minAlt) : null;

  const activityName = fitActivityLabel(workout.activityType);
  const workoutDate = new Date(workout.startTime);

  return (
    <div
      id="fit-workout-inspector"
      className="h-full w-full flex flex-col bg-white dark:bg-[#12141a] border-l border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden box-border"
    >
      {/* Header */}
      <div className="p-4 border-b border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between shrink-0 bg-stone-50/50 dark:bg-stone-900/50">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Workout Summary</span>
          </div>
          <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 mt-0.5 truncate" title={activityName}>
            {activityName}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {workoutDate.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </span>
            <span>·</span>
            <Clock className="w-3 h-3 shrink-0" />
            <span>
              {workoutDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
        <button
          id="btn-close-fit-inspector"
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors shrink-0 cursor-pointer"
          title="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3.5 min-w-0">
        {/* Map Focus CTA */}
        {validTrackpoints.length > 0 && onFocusMap && (
          <button
            id="btn-focus-fit-route"
            onClick={onFocusMap}
            className="w-full py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">Zoom Map to Route ({validTrackpoints.length} GPS Points)</span>
          </button>
        )}

        {/* Primary Metric Grid - 2x2 with strict box containment */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Duration */}
          <div className="p-3 rounded-xl bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800/80 flex flex-col justify-between min-w-0 overflow-hidden">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider truncate">Duration</span>
              <Timer className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            </div>
            <div className="text-base font-bold text-stone-900 dark:text-stone-100 truncate tracking-tight">
              {durationMin >= 60
                ? `${Math.floor(durationMin / 60)}h ${Math.round(durationMin % 60)}m`
                : `${Math.round(durationMin)} min`}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5 font-mono truncate">{durationSec}s total</div>
          </div>

          {/* Distance */}
          <div className="p-3 rounded-xl bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800/80 flex flex-col justify-between min-w-0 overflow-hidden">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider truncate">Distance</span>
              <Route className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            </div>
            <div className="text-base font-bold text-stone-900 dark:text-stone-100 truncate tracking-tight">
              {distanceKm > 0 ? `${distanceKm.toFixed(2)} km` : '—'}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5 font-mono truncate">
              {distanceKm > 0 ? `${(distanceKm * 0.621371).toFixed(2)} mi` : 'No distance'}
            </div>
          </div>

          {/* Active Burn */}
          <div className="p-3 rounded-xl bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800/80 flex flex-col justify-between min-w-0 overflow-hidden">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider truncate">Calories</span>
              <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" />
            </div>
            <div className="text-base font-bold text-stone-900 dark:text-stone-100 truncate tracking-tight">
              {workout.calories ? `${workout.calories} kcal` : '—'}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5 truncate">Active energy</div>
          </div>

          {/* Avg Pace */}
          <div className="p-3 rounded-xl bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800/80 flex flex-col justify-between min-w-0 overflow-hidden">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider truncate">Avg Pace</span>
              <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            </div>
            <div className="text-base font-bold text-stone-900 dark:text-stone-100 truncate tracking-tight font-mono">
              {paceStr}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5 font-mono truncate">
              {speedKmh > 0 ? `${speedKmh.toFixed(1)} km/h` : '—'}
            </div>
          </div>
        </div>

        {/* Heart Rate Section */}
        {(avgHr != null || maxHr != null) && (
          <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
              <HeartPulse className="w-4 h-4 shrink-0" />
              <span className="truncate">Heart Rate Biometrics</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-white/60 dark:bg-black/20 border border-rose-500/10 min-w-0">
                <span className="text-stone-400 block text-[10px] uppercase font-bold truncate">Average HR</span>
                <span className="text-base font-black text-stone-900 dark:text-stone-100 font-mono truncate block">
                  {avgHr ? `${avgHr} bpm` : '—'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white/60 dark:bg-black/20 border border-rose-500/10 min-w-0">
                <span className="text-stone-400 block text-[10px] uppercase font-bold truncate">Peak HR</span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono truncate block">
                  {maxHr ? `${maxHr} bpm` : '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* GPS Track & Elevation Info */}
        <div className="p-3 rounded-xl bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800/80 space-y-2.5 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200 truncate">
              <Navigation className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className="truncate">GPS Route & Elevation</span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 ${
                validTrackpoints.length > 0
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-500'
              }`}
            >
              {validTrackpoints.length > 0 ? `${validTrackpoints.length} pts` : 'No GPS'}
            </span>
          </div>

          {minAlt != null && maxAlt != null && (
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-stone-200/60 dark:border-stone-800/60 text-center">
              <div className="p-1.5 rounded-lg bg-white/60 dark:bg-black/20">
                <span className="text-[10px] text-stone-400 block uppercase">Min Alt</span>
                <span className="font-mono text-xs font-bold text-stone-800 dark:text-stone-200">{minAlt}m</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white/60 dark:bg-black/20">
                <span className="text-[10px] text-stone-400 block uppercase">Max Alt</span>
                <span className="font-mono text-xs font-bold text-stone-800 dark:text-stone-200">{maxAlt}m</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white/60 dark:bg-black/20">
                <span className="text-[10px] text-stone-400 block uppercase">Elevation Gain</span>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">+{altGain}m</span>
              </div>
            </div>
          )}
        </div>

        {/* Laps Breakdown */}
        {workout.laps && workout.laps.length > 0 && (
          <div className="space-y-2 min-w-0">
            <div className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
              <span className="truncate">Laps ({workout.laps.length})</span>
              <span className="text-[10px] text-stone-400 font-mono">Interval splits</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto overscroll-contain pr-1">
              {workout.laps.map((lap, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-stone-100/60 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between text-xs min-w-0"
                >
                  <span className="font-bold text-orange-600 dark:text-orange-400 text-[11px] shrink-0">
                    Lap {idx + 1}
                  </span>
                  <div className="flex items-center gap-2.5 font-mono text-stone-600 dark:text-stone-400 text-[11px] truncate">
                    {lap.durationSeconds && (
                      <span className="truncate">{Math.round(lap.durationSeconds)}s</span>
                    )}
                    {lap.distanceMeters && (
                      <span className="truncate">{(lap.distanceMeters / 1000).toFixed(2)} km</span>
                    )}
                    {lap.calories && (
                      <span className="truncate">{lap.calories} kcal</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source Provenance */}
        <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800/60 text-stone-400 space-y-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Source File</div>
          <div className="truncate font-mono text-[10px] bg-stone-100 dark:bg-stone-900/80 px-2 py-1.5 rounded-lg border border-stone-200/50 dark:border-stone-800/50" title={workout.provenance.file}>
            {workout.provenance.file}
          </div>
          {workout.provenance.source && (
            <div className="text-[10px] text-stone-500 truncate">
              Source: {workout.provenance.source}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
