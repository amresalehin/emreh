# Google Fit (Google Takeout) Import

This project can import fitness data exported from **Google Takeout → Fit**. Drop the Takeout
`.zip` (or just the `Fit` folder) into the same import flow used for Maps/Spotify/YouTube/Browser
history — no separate button required.

## What Takeout exports

```
Takeout/Fit/
  Daily activity metrics/YYYY-MM-DD.csv   # one row/day: steps, distance, calories, heart points,
                                           # heart minutes, move minutes, avg/max speed, weight
  Activities/*.tcx                        # one file per recorded workout (Garmin TCX format):
                                           # GPS track, heart rate, calories, laps
  All Data/*.json                         # raw per-source datapoint dumps, one file per data
                                           # type per day (steps, calories, distance, weight,
                                           # sleep segments, heart rate, activity segments, ...)
```

Column names/units in the daily CSV and the exact set of "All Data" files vary by account,
locale, and export date, so the parser matches headers/data-type names by substring rather than
assuming a fixed schema, and treats every file independently and defensively (a malformed file is
skipped, not fatal).

## What gets imported

| Source | Produces |
|---|---|
| `Daily activity metrics/*.csv` | `FitnessDailyMetric` per day (steps, distance, calories, heart points/minutes, move minutes, avg/max speed, weight, sleep) — authoritative when present |
| `Activities/*.tcx` | One `TimelineItem` (`type: 'fitness'`) per workout, with GPS route, avg/max heart rate, calories, elevation gain — flows into the normal unified timeline/journal |
| `All Data/*.json` | Fallback: fills in steps/calories/distance/heart-minutes only for days the daily CSV didn't cover, plus weight entries and sleep-segment minutes |

Daily aggregates and weight entries are **not** timeline items (there's no single point in time
they belong to) — they're stored separately and surfaced in the **Health & Fitness** dashboard
(open via the new button in the sidebar). Individual workouts *are* timeline items, so they also
show up in the Journal day view and on the map like any other activity.

## Where the code lives

- `src/utils/googleFitParser.ts` — all parsing logic (CSV, TCX, All-Data JSON), pure functions, no
  React/DOM dependencies beyond `DOMParser` for TCX.
- `src/utils/dataParser.ts` — hooks the parser into the existing `parseUploadedFiles` pipeline
  (both loose-file drops and zip contents).
- `src/types.ts` — `FitnessDailyMetric`, `FitnessWeightEntry`, the `'fitness'` `ItemType`, and the
  new fitness-specific fields on `TimelineItem`.
- `src/components/HealthModal.tsx` — the dashboard (Overview/Activities/Weight tabs).
- `src/components/Sidebar.tsx`, `src/App.tsx` — wiring to open the dashboard and persist state to
  IndexedDB (`mylife_fitness_daily`, `mylife_fitness_weight`).
- `src/components/TimelineCard.tsx`, `src/components/JournalDayCard.tsx` — rendering of individual
  workouts inside the normal timeline.

## Known scope boundaries

`GlobalSearchPalette`, `CalendarModal`, `SettingsModal`, and `ImportModal` still enumerate item
types as explicit string unions and haven't been extended with `'fitness'`. This is safe (no
crashes — those are additive `if/else` chains, not exhaustive switches) but means fitness workouts
currently aren't searchable via the global command palette or clearable as a distinct dataset from
Settings. Extending those four files to recognize `'fitness'` is a natural, low-risk follow-up.
