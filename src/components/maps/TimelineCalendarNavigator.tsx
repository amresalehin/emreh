import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  Compass,
  CalendarDays,
  Columns,
  X
} from 'lucide-react';
import { TimelineItem } from '../../types';

interface TimelineCalendarNavigatorProps {
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  dateIndexMap?: Map<string, TimelineItem[]>;
  allMapsItems?: TimelineItem[];
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  defaultExpanded?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const TimelineCalendarNavigator: React.FC<TimelineCalendarNavigatorProps> = ({
  currentDate,
  onSelectDate,
  dateIndexMap,
  allMapsItems = [],
  onPrevDate,
  onNextDate,
  onSetToday,
  defaultExpanded = false,
  isExpanded: controlledExpanded,
  onToggleExpand
}) => {
  // Collapsed by default: controlled or uncontrolled internal state
  const [internalExpanded, setInternalExpanded] = useState<boolean>(defaultExpanded);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(prev => !prev);
    }
  };

  // Navigation view mode: 'month' (7x5 calendar grid) vs 'week' (compact 7-day strip)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Viewing month & year (allows browsing months without immediately changing selected date)
  const [viewingMonthDate, setViewingMonthDate] = useState<Date>(() => new Date(currentDate));

  // Sync viewing month if currentDate changes significantly (e.g. outside current viewing month)
  React.useEffect(() => {
    if (
      currentDate.getFullYear() !== viewingMonthDate.getFullYear() ||
      currentDate.getMonth() !== viewingMonthDate.getMonth()
    ) {
      setViewingMonthDate(new Date(currentDate));
    }
  }, [currentDate]);

  const year = viewingMonthDate.getFullYear();
  const month = viewingMonthDate.getMonth(); // 0-indexed

  const today = useMemo(() => new Date(), []);
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const selectedY = currentDate.getFullYear();
  const selectedM = currentDate.getMonth();
  const selectedD = currentDate.getDate();

  // Helper for date string key 'YYYY-MM-DD'
  const formatDateKey = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const selectedDateKey = formatDateKey(selectedY, selectedM, selectedD);
  const todayDateKey = formatDateKey(todayY, todayM, todayD);

  // Month information
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Map of dateKey -> maps item count
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();

    if (dateIndexMap) {
      dateIndexMap.forEach((items, key) => {
        const count = items.filter(i => i.type === 'maps').length;
        if (count > 0) map.set(key, count);
      });
    } else if (allMapsItems.length > 0) {
      allMapsItems.forEach(item => {
        if (!item.ts) return;
        const d = item.dateObj || new Date(item.ts);
        if (isNaN(d.getTime())) return;
        const k = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
        map.set(k, (map.get(k) || 0) + 1);
      });
    }

    return map;
  }, [dateIndexMap, allMapsItems]);

  // Activity count for selected date
  const selectedDateActivityCount = activityMap.get(selectedDateKey) || 0;

  // Statistics for current viewing month
  const monthStats = useMemo(() => {
    let activeDays = 0;
    let totalPlaces = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const k = formatDateKey(year, month, d);
      const count = activityMap.get(k) || 0;
      if (count > 0) {
        activeDays++;
        totalPlaces += count;
      }
    }
    return { activeDays, totalPlaces };
  }, [activityMap, year, month, daysInMonth]);

  const monthName = viewingMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const formattedSelectedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handlePrevMonth = () => {
    setViewingMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewingMonthDate(new Date(year, month + 1, 1));
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setViewingMonthDate(new Date(now));
    if (onSetToday) {
      onSetToday();
    } else {
      onSelectDate(now);
    }
  };

  // Weekdays (Sunday to Saturday)
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Calendar cells for Month Grid
  const monthGridDays = useMemo(() => {
    const cells: Array<{
      date: Date;
      dayNum: number;
      isCurrentMonth: boolean;
      dateKey: string;
      activityCount: number;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    // Leading days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const d = new Date(prevY, prevM, dNum);
      const k = formatDateKey(prevY, prevM, dNum);
      cells.push({
        date: d,
        dayNum: dNum,
        isCurrentMonth: false,
        dateKey: k,
        activityCount: activityMap.get(k) || 0,
        isSelected: k === selectedDateKey,
        isToday: k === todayDateKey
      });
    }

    // Days in current month
    for (let dNum = 1; dNum <= daysInMonth; dNum++) {
      const d = new Date(year, month, dNum);
      const k = formatDateKey(year, month, dNum);
      cells.push({
        date: d,
        dayNum: dNum,
        isCurrentMonth: true,
        dateKey: k,
        activityCount: activityMap.get(k) || 0,
        isSelected: k === selectedDateKey,
        isToday: k === todayDateKey
      });
    }

    // Trailing days to fill 35 or 42 grid slots
    const totalSlots = cells.length > 35 ? 42 : 35;
    const remaining = totalSlots - cells.length;
    for (let dNum = 1; dNum <= remaining; dNum++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      const d = new Date(nextY, nextM, dNum);
      const k = formatDateKey(nextY, nextM, dNum);
      cells.push({
        date: d,
        dayNum: dNum,
        isCurrentMonth: false,
        dateKey: k,
        activityCount: activityMap.get(k) || 0,
        isSelected: k === selectedDateKey,
        isToday: k === todayDateKey
      });
    }

    return cells;
  }, [firstDayOfWeek, daysInMonth, daysInPrevMonth, year, month, activityMap, selectedDateKey, todayDateKey]);

  // Calendar cells for Week Strip: 7 days centered or spanning the current selected date's week
  const weekStripDays = useMemo(() => {
    const currDayOfWeek = currentDate.getDay(); // 0 = Sun
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currDayOfWeek);

    const week: Array<{
      date: Date;
      dayNum: number;
      dayName: string;
      dateKey: string;
      activityCount: number;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const k = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
      week.push({
        date: d,
        dayNum: d.getDate(),
        dayName: weekdays[i],
        dateKey: k,
        activityCount: activityMap.get(k) || 0,
        isSelected: k === selectedDateKey,
        isToday: k === todayDateKey
      });
    }
    return week;
  }, [currentDate, selectedDateKey, todayDateKey, activityMap]);

  const nativePickerRef = React.useRef<HTMLInputElement>(null);
  const isToday = todayDateKey === selectedDateKey;

  const handleNativePickerOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nativePickerRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          nativePickerRef.current.showPicker();
          return;
        } catch {
          // fallback
        }
      }
      nativePickerRef.current.focus();
      nativePickerRef.current.click();
    }
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [y, m, d] = val.split('-').map(Number);
    if (y && m && d) {
      onSelectDate(new Date(y, m - 1, d));
    }
  };

  return (
    <div
      id="timeline-calendar-navigator"
      className="bg-transparent border-b border-black/8 dark:border-white/10 px-3.5 py-2 transition-all"
    >
      {/* 1. Primary Date Bar: Always visible with clickable Map Navigator button & day stepper */}
      <div className="flex items-center justify-between gap-1.5">
        {/* Previous Day Stepper Button */}
        <button
          id="map-nav-prev-day-btn"
          type="button"
          onClick={onPrevDate}
          className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium backdrop-blur-md"
          title="Previous Day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* CLICKABLE MAP NAVIGATOR BUTTON:
            When collapsed: Only shows the date, on click opens the navigator.
            When expanded: Shows navigator open state and collapse toggle. */}
        <button
          id="map-navigator-date-toggle-btn"
          type="button"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse calendar navigator" : "Open calendar navigator"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleToggleExpand();
          }}
          className={`flex-1 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer group shadow-2xs text-left active:scale-[0.99] backdrop-blur-xl ${
            isExpanded
              ? 'bg-blue-500/18 dark:bg-blue-500/25 border-blue-500/35 dark:border-blue-400/40 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white/60 dark:bg-white/8 hover:bg-white/85 dark:hover:bg-white/15 border-black/10 dark:border-white/12 hover:border-blue-400/50 dark:hover:border-blue-500/50 text-gray-950 dark:text-white'
          }`}
          title={isExpanded ? "Click to collapse calendar navigator" : "Click to open calendar navigator"}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1 rounded-md transition-colors ${isExpanded ? 'bg-blue-500 text-white' : 'bg-blue-100/80 dark:bg-blue-950/70 text-[#1A73E8]'}`}>
              <CalendarIcon className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-xs truncate">
              {formattedSelectedDate}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isExpanded && selectedDateActivityCount > 0 && (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded-md">
                {selectedDateActivityCount} {selectedDateActivityCount === 1 ? 'place' : 'places'}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 transition-transform" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#1A73E8] transition-transform group-hover:translate-y-0.5" />
            )}
          </div>
        </button>

        {/* 1-Click Direct Native Date Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={handleNativePickerOpen}
            className="p-1.5 rounded-lg bg-white/60 dark:bg-white/8 hover:bg-white/85 dark:hover:bg-white/15 border border-black/10 dark:border-white/12 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
            title="1-Click Jump to Date"
          >
            <CalendarDays className="w-4 h-4 text-blue-500" />
          </button>
          <input
            ref={nativePickerRef}
            type="date"
            value={selectedDateKey}
            onChange={handleNativeDateChange}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-none"
            tabIndex={-1}
            aria-label="Direct date selection"
          />
        </div>

        {/* 1-Click Today Button if not on today */}
        {!isToday && onSetToday && (
          <button
            type="button"
            onClick={onSetToday}
            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
            title="Jump directly to Today"
          >
            Today
          </button>
        )}

        {/* Next Day Stepper Button */}
        <button
          id="map-nav-next-day-btn"
          type="button"
          onClick={onNextDate}
          className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium backdrop-blur-md"
          title="Next Day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Expanded Calendar Drawer: Revealed only when isExpanded is true */}
      {isExpanded && (
        <div className="mt-2.5 pt-2.5 border-t border-gray-200/60 dark:border-white/10 transition-all">
          {/* Header Controls: Month Navigator, Mode Switcher, and Today Button */}
          <div className="flex items-center justify-between gap-2 mb-2">
            {/* Month Title & Month Stepper Controls */}
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-lg p-0.5 border border-gray-200/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-md transition-colors cursor-pointer shadow-2xs"
                  title="Previous month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-md transition-colors cursor-pointer shadow-2xs"
                  title="Next month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                {monthName}
              </span>

              {monthStats.activeDays > 0 && (
                <span className="hidden sm:inline-block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 px-1.5 py-0.5 rounded-md">
                  {monthStats.activeDays}d active
                </span>
              )}
            </div>

            {/* Right Controls: Today Button, View Mode (Month/Week), Collapse */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleJumpToToday}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 border ${
                  selectedDateKey === todayDateKey
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/50'
                    : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200/60 dark:border-white/10'
                }`}
                title="Jump to Today"
              >
                <Compass className="w-3 h-3 text-blue-500" />
                <span>Today</span>
              </button>

              {/* Toggle View Mode between Month Grid and Week Strip */}
              <div className="flex bg-gray-100 dark:bg-white/5 p-0.5 rounded-lg border border-gray-200/60 dark:border-white/10 text-[10px]">
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`px-1.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                    viewMode === 'month'
                      ? 'bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-2xs'
                      : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                  title="Month Grid"
                >
                  <CalendarDays className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('week')}
                  className={`px-1.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                    viewMode === 'week'
                      ? 'bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-2xs'
                      : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                  title="Week Strip"
                >
                  <Columns className="w-3 h-3" />
                </button>
              </div>

              {/* Quick Close Button */}
              <button
                type="button"
                onClick={handleToggleExpand}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md transition-colors cursor-pointer ml-0.5"
                title="Collapse calendar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday Labels Header (S, M, T, W, T, F, S) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekdays.map((w, idx) => (
              <div
                key={idx}
                className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider py-0.5"
              >
                {w}
              </div>
            ))}
          </div>

          {/* Mode 1: Month Calendar Grid */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 gap-1">
              {monthGridDays.map((cell) => {
                const hasActivity = cell.activityCount > 0;
                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => onSelectDate(cell.date)}
                    className={`relative h-7 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer group ${
                      cell.isSelected
                        ? 'bg-[#1A73E8] text-white shadow-xs font-bold scale-[1.03] z-10'
                        : cell.isToday
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold border border-blue-300 dark:border-blue-700/60'
                        : cell.isCurrentMonth
                        ? hasActivity
                          ? 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 font-bold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                        : 'text-gray-300 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                    title={`${cell.date.toLocaleDateString()}${hasActivity ? ` • ${cell.activityCount} place${cell.activityCount > 1 ? 's' : ''}` : ''}`}
                  >
                    <span>{cell.dayNum}</span>

                    {/* Place Activity Indicator Dot */}
                    {hasActivity && (
                      <span
                        className={`absolute bottom-0.5 w-1 h-1 rounded-full transition-transform group-hover:scale-125 ${
                          cell.isSelected
                            ? 'bg-white'
                            : 'bg-[#1A73E8] dark:bg-blue-400'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Mode 2: Week Strip View */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-7 gap-1">
              {weekStripDays.map((cell) => {
                const hasActivity = cell.activityCount > 0;
                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => onSelectDate(cell.date)}
                    className={`relative py-1.5 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer group ${
                      cell.isSelected
                        ? 'bg-[#1A73E8] text-white shadow-xs font-bold scale-[1.03] z-10'
                        : cell.isToday
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold border border-blue-300 dark:border-blue-700/60'
                        : hasActivity
                        ? 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 font-bold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                    title={`${cell.date.toLocaleDateString()}${hasActivity ? ` • ${cell.activityCount} places` : ''}`}
                  >
                    <span className="text-[10px] opacity-70 mb-0.5">{cell.dayName}</span>
                    <span className="text-xs font-bold">{cell.dayNum}</span>

                    {hasActivity && (
                      <span
                        className={`mt-0.5 w-1 h-1 rounded-full transition-transform group-hover:scale-125 ${
                          cell.isSelected
                            ? 'bg-white'
                            : 'bg-[#1A73E8] dark:bg-blue-400'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
