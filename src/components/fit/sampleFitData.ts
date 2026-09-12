import { GoogleFitDataset, FitWorkout, FitDailyInterval, FitDailySummary, FitMeasurement } from '../../utils/googleFitParser';
import { FitDailyMetric } from '../../types';

// Realistic sample running route around Central Park loop (approx 5.2 km)
function generateRunTrackpoints(baseTime: number): FitWorkout['trackpoints'] {
  const points: [number, number, number, number][] = [
    // [lat, lng, alt, hr]
    [40.771133, -73.974187, 24, 138],
    [40.772500, -73.973000, 25, 142],
    [40.774200, -73.971500, 27, 145],
    [40.776100, -73.969800, 28, 148],
    [40.778300, -73.968000, 30, 151],
    [40.780800, -73.966000, 32, 154],
    [40.783200, -73.964200, 31, 156],
    [40.785800, -73.962500, 30, 157],
    [40.788500, -73.960800, 29, 159],
    [40.791200, -73.959200, 31, 161],
    [40.793800, -73.958500, 34, 163],
    [40.796000, -73.960000, 35, 162],
    [40.796800, -73.962500, 36, 160],
    [40.795500, -73.965500, 33, 158],
    [40.793000, -73.968500, 31, 157],
    [40.790000, -73.971500, 29, 156],
    [40.786500, -73.974500, 28, 155],
    [40.783000, -73.977000, 26, 154],
    [40.779500, -73.979000, 25, 152],
    [40.776000, -73.980500, 25, 150],
    [40.773200, -73.978500, 24, 147],
    [40.771133, -73.974187, 24, 144]
  ];

  return points.map(([lat, lng, altitude, heartRate], index) => {
    const time = new Date(baseTime + index * 60 * 1000).toISOString();
    return {
      time,
      lat,
      lng,
      altitude,
      distance: index * 240,
      heartRate
    };
  });
}

// Realistic sample cycling route along West Side Highway / Hudson Greenway (approx 12.8 km)
function generateCycleTrackpoints(baseTime: number): FitWorkout['trackpoints'] {
  const points: [number, number, number, number][] = [
    [40.712800, -74.013500, 5, 120],
    [40.716500, -74.012500, 6, 124],
    [40.720500, -74.011800, 6, 128],
    [40.725000, -74.011000, 5, 132],
    [40.730000, -74.010500, 5, 135],
    [40.735500, -74.010000, 6, 137],
    [40.741000, -74.009000, 7, 140],
    [40.747000, -74.008000, 6, 142],
    [40.753000, -74.006500, 7, 144],
    [40.759000, -74.004500, 8, 143],
    [40.765000, -74.001500, 7, 141],
    [40.771000, -73.996000, 8, 139],
    [40.776500, -73.991000, 9, 136],
    [40.781500, -73.987000, 10, 134],
    [40.776500, -73.991000, 9, 132],
    [40.771000, -73.996000, 8, 130],
    [40.759000, -74.004500, 8, 128],
    [40.747000, -74.008000, 6, 125],
    [40.730000, -74.010500, 5, 122],
    [40.712800, -74.013500, 5, 118]
  ];

  return points.map(([lat, lng, altitude, heartRate], index) => {
    const time = new Date(baseTime + index * 90 * 1000).toISOString();
    return {
      time,
      lat,
      lng,
      altitude,
      distance: index * 640,
      heartRate
    };
  });
}

// Evening brisk walk route around High Line / Chelsea (approx 3.1 km)
function generateWalkTrackpoints(baseTime: number): FitWorkout['trackpoints'] {
  const points: [number, number, number, number][] = [
    [40.739500, -74.008000, 10, 96],
    [40.742000, -74.007200, 11, 102],
    [40.745000, -74.006000, 11, 105],
    [40.748000, -74.005000, 12, 106],
    [40.751000, -74.003500, 12, 104],
    [40.754000, -74.002000, 13, 103],
    [40.752500, -74.000000, 11, 101],
    [40.749000, -74.001500, 10, 98],
    [40.745500, -74.003000, 10, 97],
    [40.742000, -74.005000, 10, 95],
    [40.739500, -74.008000, 10, 92]
  ];

  return points.map(([lat, lng, altitude, heartRate], index) => {
    const time = new Date(baseTime + index * 120 * 1000).toISOString();
    return {
      time,
      lat,
      lng,
      altitude,
      distance: index * 310,
      heartRate
    };
  });
}

export function createSampleGoogleFitDataset(): GoogleFitDataset {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Generate date strings for previous 30 days
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    days.push(d.toISOString().slice(0, 10));
  }

  const workouts: FitWorkout[] = [
    {
      id: 'fit_workout_run_today',
      title: 'Running Workout',
      activityType: 'Running',
      startTime: new Date(`${todayStr}T07:15:00`).toISOString(),
      endTime: new Date(`${todayStr}T07:42:00`).toISOString(),
      durationSeconds: 1620, // 27 min
      distanceMeters: 5120, // 5.12 km
      calories: 420,
      laps: [
        {
          startTime: new Date(`${todayStr}T07:15:00`).toISOString(),
          durationSeconds: 315,
          distanceMeters: 1000,
          calories: 82,
          intensity: 'Active',
          trackpoints: []
        },
        {
          startTime: new Date(`${todayStr}T07:20:15`).toISOString(),
          durationSeconds: 320,
          distanceMeters: 1000,
          calories: 84,
          intensity: 'Active',
          trackpoints: []
        },
        {
          startTime: new Date(`${todayStr}T07:25:35`).toISOString(),
          durationSeconds: 312,
          distanceMeters: 1000,
          calories: 81,
          intensity: 'Active',
          trackpoints: []
        },
        {
          startTime: new Date(`${todayStr}T07:30:47`).toISOString(),
          durationSeconds: 318,
          distanceMeters: 1000,
          calories: 83,
          intensity: 'Active',
          trackpoints: []
        },
        {
          startTime: new Date(`${todayStr}T07:36:05`).toISOString(),
          durationSeconds: 355,
          distanceMeters: 1120,
          calories: 90,
          intensity: 'Active',
          trackpoints: []
        }
      ],
      trackpoints: generateRunTrackpoints(new Date(`${todayStr}T07:15:00`).getTime()),
      provenance: {
        file: 'Takeout/Fit/Activities/2026-09-06-07-15-00-Running.tcx',
        dataset: 'activities',
        source: 'Pixel Watch 2 / Google Fit'
      }
    },
    {
      id: 'fit_workout_cycle_yesterday',
      title: 'Cycling Workout',
      activityType: 'Biking',
      startTime: new Date(`${days[5]}T17:40:00`).toISOString(),
      endTime: new Date(`${days[5]}T18:25:00`).toISOString(),
      durationSeconds: 2700, // 45 min
      distanceMeters: 12800, // 12.8 km
      calories: 510,
      laps: [
        {
          startTime: new Date(`${days[5]}T17:40:00`).toISOString(),
          durationSeconds: 900,
          distanceMeters: 4200,
          calories: 165,
          trackpoints: []
        },
        {
          startTime: new Date(`${days[5]}T17:55:00`).toISOString(),
          durationSeconds: 920,
          distanceMeters: 4400,
          calories: 175,
          trackpoints: []
        },
        {
          startTime: new Date(`${days[5]}T18:10:20`).toISOString(),
          durationSeconds: 880,
          distanceMeters: 4200,
          calories: 170,
          trackpoints: []
        }
      ],
      trackpoints: generateCycleTrackpoints(new Date(`${days[5]}T17:40:00`).getTime()),
      provenance: {
        file: 'Takeout/Fit/Activities/2026-09-05-17-40-00-Biking.tcx',
        dataset: 'activities',
        source: 'Garmin / Health Connect Sync'
      }
    },
    {
      id: 'fit_workout_walk_2days',
      title: 'Walking Workout',
      activityType: 'Walking',
      startTime: new Date(`${days[4]}T19:10:00`).toISOString(),
      endTime: new Date(`${days[4]}T19:42:00`).toISOString(),
      durationSeconds: 1920, // 32 min
      distanceMeters: 3100, // 3.1 km
      calories: 185,
      laps: [
        {
          startTime: new Date(`${days[4]}T19:10:00`).toISOString(),
          durationSeconds: 1920,
          distanceMeters: 3100,
          calories: 185,
          trackpoints: []
        }
      ],
      trackpoints: generateWalkTrackpoints(new Date(`${days[4]}T19:10:00`).getTime()),
      provenance: {
        file: 'Takeout/Fit/Activities/2026-09-04-19-10-00-Walking.tcx',
        dataset: 'activities',
        source: 'Google Fit Sensor Fusion'
      }
    },
    {
      id: 'fit_workout_gym_3days',
      title: 'Gym Workout',
      activityType: 'Strength training',
      startTime: new Date(`${days[3]}T08:00:00`).toISOString(),
      endTime: new Date(`${days[3]}T08:50:00`).toISOString(),
      durationSeconds: 3000, // 50 min
      distanceMeters: 0,
      calories: 340,
      laps: [],
      trackpoints: [],
      provenance: {
        file: 'Takeout/Fit/All Sessions/2026-09-03-08-00-00-Strength-Training.json',
        dataset: 'sessions',
        source: 'Fitbit App'
      }
    }
  ];

  // Daily Summaries across 30 days with realistic activity patterns
  const dailySummaries: FitDailySummary[] = days.map((dateStr, idx) => {
    // Realistic rhythm: weekdays vs weekend long walks/runs
    const dayOfWeek = new Date(dateStr).getDay(); // 0: Sun, 6: Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Seeded variation
    const baseSteps = isWeekend ? 13500 : 9200;
    const stepVar = ((idx * 7919) % 3600) - 1500;
    const steps = Math.max(5400, Math.round(baseSteps + stepVar));

    const heartPoints = Math.max(16, Math.round((steps / 10000) * 35 + ((idx * 31) % 18)));
    const moveMinutes = Math.max(38, Math.round((steps / 1000) * 7.5 + ((idx * 17) % 15)));
    const distanceM = Math.round(steps * 0.76);
    const calories = Math.round(1800 + (steps * 0.045) + (heartPoints * 8));

    return {
      date: dateStr,
      values: {
        'Step count': steps,
        'Distance (m)': distanceM,
        'Calories (kcal)': calories,
        'Move Minutes count': moveMinutes,
        'Heart Minutes': heartPoints,
        'Heart Points': heartPoints
      }
    };
  });

  // Daily Intervals across the 24 hours of today
  const dailyIntervals: FitDailyInterval[] = [];
  const hours = [
    { hour: 7, steps: 4800, dist: 5120, cal: 420 },
    { hour: 8, steps: 850, dist: 650, cal: 65 },
    { hour: 9, steps: 320, dist: 240, cal: 30 },
    { hour: 10, steps: 410, dist: 310, cal: 35 },
    { hour: 11, steps: 680, dist: 510, cal: 45 },
    { hour: 12, steps: 1420, dist: 1080, cal: 95 },
    { hour: 13, steps: 820, dist: 620, cal: 55 },
    { hour: 14, steps: 290, dist: 210, cal: 25 },
    { hour: 15, steps: 510, dist: 380, cal: 40 },
    { hour: 16, steps: 640, dist: 490, cal: 45 },
    { hour: 17, steps: 1250, dist: 940, cal: 85 },
    { hour: 18, steps: 980, dist: 740, cal: 70 },
    { hour: 19, steps: 820, dist: 620, cal: 60 }
  ];

  hours.forEach(({ hour, steps, dist, cal }, idx) => {
    const startHourStr = String(hour).padStart(2, '0');
    const endHourStr = String(hour + 1).padStart(2, '0');
    dailyIntervals.push({
      id: `fit_interval_${todayStr}_${idx}`,
      date: todayStr,
      startTime: `${todayStr}T${startHourStr}:00:00.000Z`,
      endTime: `${todayStr}T${endHourStr}:00:00.000Z`,
      values: {
        'Step count': steps,
        'Distance (m)': dist,
        'Calories (kcal)': cal,
        'Move Minutes count': Math.min(60, Math.round(steps / 100)),
        'Heart Minutes': hour === 7 ? 27 : 0
      },
      provenance: {
        file: `Takeout/Fit/Daily activity metrics/${todayStr}.csv`,
        dataset: 'daily_metrics',
        source: 'Google Fit Sensor Stream'
      }
    });
  });

  // Body weight measurements
  const measurements: FitMeasurement[] = [
    {
      id: 'm_wt_1',
      metric: 'weight',
      rawMetric: 'com.google.weight',
      value: 71.4,
      unit: 'kg',
      startTime: new Date(`${days[0]}T07:00:00`).toISOString(),
      provenance: {
        file: 'Takeout/Fit/All Data/derived_com.google.weight.json',
        dataset: 'all_data',
        source: 'Withings Smart Scale'
      }
    },
    {
      id: 'm_wt_2',
      metric: 'weight',
      rawMetric: 'com.google.weight',
      value: 71.2,
      unit: 'kg',
      startTime: new Date(`${days[2]}T07:00:00`).toISOString(),
      provenance: {
        file: 'Takeout/Fit/All Data/derived_com.google.weight.json',
        dataset: 'all_data',
        source: 'Withings Smart Scale'
      }
    },
    {
      id: 'm_wt_3',
      metric: 'weight',
      rawMetric: 'com.google.weight',
      value: 70.8,
      unit: 'kg',
      startTime: new Date(`${todayStr}T07:00:00`).toISOString(),
      provenance: {
        file: 'Takeout/Fit/All Data/derived_com.google.weight.json',
        dataset: 'all_data',
        source: 'Withings Smart Scale'
      }
    },
    {
      id: 'm_hr_rest',
      metric: 'heart_rate',
      rawMetric: 'com.google.heart_rate.bpm',
      value: 59,
      unit: 'bpm',
      startTime: new Date(`${todayStr}T06:30:00`).toISOString(),
      provenance: {
        file: 'Takeout/Fit/All Data/raw_com.google.heart_rate.bpm.json',
        dataset: 'all_data',
        source: 'Pixel Watch 2'
      }
    }
  ];

  return {
    importedAt: new Date().toISOString(),
    archiveName: 'Google Fit Takeout (Curated Demo)',
    filesScanned: 184,
    filesRecognized: 184,
    unrecognizedFiles: [],
    parseErrors: [],
    measurements,
    sessions: [],
    workouts,
    dailyIntervals,
    dailySummaries,
    metricCounts: {
      'Step count': 84200,
      'Distance': 55800,
      'Calories': 17770,
      'Heart Minutes': 287,
      'Weight': 3,
      'Heart Rate': 420
    },
    sourceCounts: {
      'Pixel Watch 2 / Google Fit': 120,
      'Garmin Connect': 38,
      'Withings Scale': 3,
      'Google Fit Sensor Fusion': 23
    },
    dateRange: {
      start: `${days[0]}T00:00:00.000Z`,
      end: `${todayStr}T23:59:59.999Z`
    }
  };
}

/**
 * Generates 30 full days of sample FitDailyMetric records for IndexedDB persistence
 */
export function createSampleFitDailyMetrics(anchorDate: Date = new Date()): Record<string, FitDailyMetric> {
  const result: Record<string, FitDailyMetric> = {};

  for (let i = 29; i >= 0; i--) {
    const d = new Date(anchorDate.getTime() - i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const baseSteps = isWeekend ? 13400 : 9300;
    const stepVar = ((i * 7919) % 3600) - 1500;
    const steps = Math.max(5600, Math.round(baseSteps + stepVar));

    const heartPoints = Math.max(16, Math.round((steps / 10000) * 35 + ((i * 31) % 18)));
    const moveMinutes = Math.max(40, Math.round((steps / 1000) * 7.5 + ((i * 17) % 15)));
    const distanceKm = Number((steps * 0.00076).toFixed(2));
    const caloriesActive = Math.round(steps * 0.045 + heartPoints * 8);
    const caloriesTotal = Math.round(1800 + caloriesActive);

    const sleepHours = Number((6.8 + ((i * 13) % 17) / 10).toFixed(1));
    const sleepScore = Math.min(95, Math.max(68, Math.round(75 + ((i * 29) % 22))));

    result[dateStr] = {
      date: dateStr,
      steps,
      stepsGoal: 10000,
      heartPoints,
      heartPointsGoal: 40,
      moveMinutes,
      caloriesActive,
      caloriesTotal,
      distanceKm,
      restingHeartRate: Math.round(56 + ((i * 7) % 8)),
      sleepHours,
      sleepScore,
      stepsSource: 'measured',
      heartPointsSource: 'measured',
      caloriesActiveSource: 'derived',
      distanceKmSource: 'derived',
      moveMinutesSource: 'derived'
    };
  }

  return result;
}

