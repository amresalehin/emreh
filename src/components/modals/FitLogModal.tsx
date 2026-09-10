import React, { useState } from 'react';
import {
  X,
  Activity,
  Heart,
  Footprints,
  Flame,
  Clock,
  Plus,
  Zap,
  Check
} from 'lucide-react';
import { FitDailyMetric, FitWorkout } from '../../types';

interface FitLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string; // YYYY-MM-DD
  existingMetric?: FitDailyMetric | null;
  onSaveMetric: (updated: FitDailyMetric) => void;
}

export const FitLogModal: React.FC<FitLogModalProps> = ({
  isOpen,
  onClose,
  targetDate,
  existingMetric,
  onSaveMetric
}) => {
  const [steps, setSteps] = useState<number>(existingMetric?.steps || 6500);
  const [heartPoints, setHeartPoints] = useState<number>(existingMetric?.heartPoints || 25);
  const [moveMinutes, setMoveMinutes] = useState<number>(existingMetric?.moveMinutes || 40);
  const [calories, setCalories] = useState<number>(existingMetric?.caloriesTotal || 2050);
  const [distanceKm, setDistanceKm] = useState<number>(existingMetric?.distanceKm || 4.8);
  const [restingHr, setRestingHr] = useState<number>(existingMetric?.restingHeartRate || 62);
  const [sleepHours, setSleepHours] = useState<number>(existingMetric?.sleepHours || 7.5);

  // New Workout Entry
  const [addWorkout, setAddWorkout] = useState(false);
  const [workoutType, setWorkoutType] = useState<FitWorkout['type']>('running');
  const [workoutTitle, setWorkoutTitle] = useState('Morning Run');
  const [workoutDuration, setWorkoutDuration] = useState(30);
  const [workoutCalories, setWorkoutCalories] = useState(250);
  const [workoutDistance, setWorkoutDistance] = useState(4.0);

  if (!isOpen) return null;

  const handleSave = () => {
    const workouts = existingMetric?.workouts ? [...existingMetric.workouts] : [];

    if (addWorkout) {
      workouts.push({
        id: `w_${targetDate}_${Date.now()}`,
        type: workoutType,
        title: workoutTitle.trim() || 'Workout Session',
        startTime: '08:00 AM',
        durationMinutes: workoutDuration,
        calories: workoutCalories,
        distanceKm: workoutDistance,
        avgHeartRateBpm: 140
      });
    }

    const updated: FitDailyMetric = {
      date: targetDate,
      steps: Number(steps) || 0,
      stepsGoal: existingMetric?.stepsGoal || 10000,
      heartPoints: Number(heartPoints) || 0,
      heartPointsGoal: existingMetric?.heartPointsGoal || 40,
      moveMinutes: Number(moveMinutes) || 0,
      caloriesActive: Math.round(Number(steps) * 0.04 + Number(heartPoints) * 6),
      caloriesTotal: Number(calories) || 1600,
      distanceKm: parseFloat(Number(distanceKm).toFixed(2)),
      restingHeartRate: Number(restingHr) || 60,
      currentHeartRate: Number(restingHr) || 60,
      sleepHours: Number(sleepHours) || undefined,
      sleepScore: Math.min(100, Math.round((Number(sleepHours) / 8) * 100)),
      workouts
    };

    onSaveMetric(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Log Fit Activity
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Record daily vitals and workouts for {targetDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                Steps Count
              </label>
              <input
                type="number"
                value={steps}
                onChange={e => {
                  const val = Number(e.target.value);
                  setSteps(val);
                  setDistanceKm(parseFloat((val * 0.00078).toFixed(2)));
                }}
                className="w-full px-3.5 py-2 text-xs bg-gray-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500 rounded-xl text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                Heart Points
              </label>
              <input
                type="number"
                value={heartPoints}
                onChange={e => setHeartPoints(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs bg-gray-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500 rounded-xl text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                Active Move Minutes
              </label>
              <input
                type="number"
                value={moveMinutes}
                onChange={e => setMoveMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs bg-gray-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500 rounded-xl text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                Total Calories Burned (kcal)
              </label>
              <input
                type="number"
                value={calories}
                onChange={e => setCalories(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs bg-gray-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500 rounded-xl text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                Distance Walked / Run (km)
              </label>
              <input
                type="number"
                step="0.1"
                value={distanceKm}
                onChange={e => setDistanceKm(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs bg-gray-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500 rounded-xl text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                Resting Heart Rate (BPM)
              </label>
              <input
                type="number"
                value={restingHr}
                onChange={e => setRestingHr(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs bg-gray-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500 rounded-xl text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              Sleep Duration (Hours)
            </label>
            <input
              type="number"
              step="0.1"
              value={sleepHours}
              onChange={e => setSleepHours(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-xs bg-gray-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500 rounded-xl text-gray-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Optional Workout Toggle */}
          <div className="pt-2 border-t border-gray-100 dark:border-zinc-800">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={addWorkout}
                onChange={e => setAddWorkout(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                Add a workout session to this date
              </span>
            </label>

            {addWorkout && (
              <div className="mt-3 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 space-y-3 animate-fadeIn">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400 mb-1">
                      Activity Type
                    </label>
                    <select
                      value={workoutType}
                      onChange={e => {
                        const t = e.target.value as any;
                        setWorkoutType(t);
                        setWorkoutTitle(t.charAt(0).toUpperCase() + t.slice(1) + ' Session');
                      }}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
                    >
                      <option value="running">Running</option>
                      <option value="cycling">Cycling</option>
                      <option value="walking">Walking</option>
                      <option value="swimming">Swimming</option>
                      <option value="strength">Strength / Gym</option>
                      <option value="yoga">Yoga</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400 mb-1">
                      Workout Title
                    </label>
                    <input
                      type="text"
                      value={workoutTitle}
                      onChange={e => setWorkoutTitle(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400 mb-1">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      value={workoutDuration}
                      onChange={e => setWorkoutDuration(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-zinc-400 mb-1">
                      Distance (km)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={workoutDistance}
                      onChange={e => setWorkoutDistance(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-2 bg-gray-50/50 dark:bg-zinc-900/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition"
          >
            Save Vitals
          </button>
        </div>
      </div>
    </div>
  );
};
