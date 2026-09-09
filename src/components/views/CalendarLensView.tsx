import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Image as ImageIcon,
  BookOpen,
  Headphones,
  MapPin,
  Calendar as CalendarIcon,
  Flame,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { TimelineItem, CalendarEvent, DateRange } from '../../types';

interface CalendarLensViewProps {
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  dateIndexMap: Map<string, TimelineItem[]>;
  photosList?: TimelineItem[];
  dailyNotesMap?: Record<string, string>;
  calendarEvents?: CalendarEvent[];
  timelineData?: TimelineItem[];
  onNavigateToCanvas?: (date: Date) => void;
  onNavigateToNotes?: (date: Date) => void;
}

export const CalendarLensView: React.FC<CalendarLensViewProps> = ({
  currentDate,
  onSelectDate,
  dateIndexMap,
  photosList = [],
  dailyNotesMap = {},
  calendarEvents = [],
  timelineData = [],
  onNavigateToCanvas,
  onNavigateToNotes
}) => {
  const [activeDate, setActiveDate] = useState<Date>(new Date(currentDate));
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();
  const monthName = activeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setActiveDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setActiveDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setActiveDate(now);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setSelectedDayKey(`${y}-${m}-${d}`);
    onSelectDate(now);
  };

  // Helper to build date key string
  const toDateKey = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  // Index photos by dateKey
  const photoByDateMap = useMemo(() => {
    const map = new Map<string, string>();
    // Look in photosList first
    for (const item of photosList) {
      const url = item.thumbnailUrl || item.photoUrl || item.localBlobUrl || item.mediaUrl;
      if (!url) continue;
      const d = item.dateObj;
      if (d && !isNaN(d.getTime())) {
        const key = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
        if (!map.has(key)) map.set(key, url);
      }
    }
    // Also scan timelineData items with photos
    for (const item of timelineData) {
      if (item.type === 'photo' || item.thumbnailUrl || item.photoUrl) {
        const url = item.thumbnailUrl || item.photoUrl || item.localBlobUrl || item.mediaUrl;
        if (!url) continue;
        const d = item.dateObj;
        if (d && !isNaN(d.getTime())) {
          const key = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
          if (!map.has(key)) map.set(key, url);
        }
      }
    }
    return map;
  }, [photosList, timelineData]);

  // Calculate habit streak for current month
  const streakStats = useMemo(() => {
    let totalDaysWithMemories = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const key = toDateKey(year, month, day);
      const items = dateIndexMap.get(key) || [];
      const hasNote = Boolean(dailyNotesMap[key]);
      if (items.length > 0 || hasNote || photoByDateMap.has(key)) {
        totalDaysWithMemories++;
      }
    }
    return {
      activeDays: totalDaysWithMemories,
      totalDays: daysInMonth,
      percentage: Math.round((totalDaysWithMemories / daysInMonth) * 100)
    };
  }, [year, month, daysInMonth, dateIndexMap, dailyNotesMap, photoByDateMap]);

  // Selected Day summary
  const selectedDayData = useMemo(() => {
    const items = dateIndexMap.get(selectedDayKey) || [];
    const note = dailyNotesMap[selectedDayKey] || '';
    const photo = photoByDateMap.get(selectedDayKey);
    const [y, m, d] = selectedDayKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    return {
      dateObj,
      items,
      note,
      photo,
      hasContent: items.length > 0 || Boolean(note) || Boolean(photo)
    };
  }, [selectedDayKey, dateIndexMap, dailyNotesMap, photoByDateMap]);

  const handleDayClick = (day: number) => {
    const key = toDateKey(year, month, day);
    setSelectedDayKey(key);
    const d = new Date(year, month, day);
    onSelectDate(d);
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#fdfcf9] dark:bg-[#0e0d0c] overflow-y-auto select-none">
      {/* Header bar */}
      <div className="shrink-0 px-4 sm:px-8 py-5 border-b border-black/[0.05] dark:border-white/[0.06] bg-white/60 dark:bg-[#141312]/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest font-sans font-medium text-[#d4a373]">
                Living Memory Calendar
              </span>
              <span className="text-neutral-400">•</span>
              <span className="flex items-center gap-1 text-xs font-sans text-neutral-500 dark:text-neutral-400">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                <span>{streakStats.activeDays} days recorded ({streakStats.percentage}%)</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium text-stone-900 dark:text-stone-100 tracking-tight">
              {monthName}
            </h1>
          </div>

          {/* Month Stepper & Today */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoToday}
              className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-sans font-medium transition-colors shadow-2xs cursor-pointer active:scale-95"
            >
              Today
            </button>
            <div className="flex items-center rounded-xl bg-stone-100 dark:bg-stone-800/80 p-0.5 border border-stone-200/60 dark:border-stone-700/60">
              <button
                onClick={handlePrevMonth}
                aria-label="Previous Month"
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                aria-label="Next Month"
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="text-[11px] font-sans font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Photo-Mosaic Calendar Grid (Inspiration Image 2) */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 auto-rows-fr">
          {/* Empty prefix cells */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-square rounded-2xl bg-black/[0.01] dark:bg-white/[0.01] border border-transparent"
            />
          ))}

          {/* Month Day Cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateKey = toDateKey(year, month, dayNum);
            const isSelected = dateKey === selectedDayKey;
            const dayPhoto = photoByDateMap.get(dateKey);
            const items = dateIndexMap.get(dateKey) || [];
            const hasNote = Boolean(dailyNotesMap[dateKey]);
            const hasActivity = items.length > 0 || hasNote;

            const isToday =
              new Date().getFullYear() === year &&
              new Date().getMonth() === month &&
              new Date().getDate() === dayNum;

            return (
              <div
                key={dateKey}
                onClick={() => handleDayClick(dayNum)}
                className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 transform active:scale-95 shadow-2xs ${
                  isSelected
                    ? 'ring-3 ring-[#d4a373] shadow-md scale-[1.02] z-10'
                    : 'hover:scale-[1.02] hover:shadow-md'
                } ${
                  dayPhoto
                    ? 'bg-stone-900'
                    : hasActivity
                    ? 'bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20'
                    : 'bg-white dark:bg-[#161514] border border-black/[0.04] dark:border-white/[0.05] hover:border-black/10 dark:hover:border-white/10'
                }`}
              >
                {/* Photo Thumbnail Background (Inspiration Image 2) */}
                {dayPhoto ? (
                  <>
                    <img
                      src={dayPhoto}
                      alt={`Day ${dayNum}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Subtle dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                  </>
                ) : null}

                {/* Day Number Badge */}
                <div
                  className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-lg text-xs font-sans font-bold leading-none ${
                    dayPhoto
                      ? 'text-white bg-black/40 backdrop-blur-xs drop-shadow-sm'
                      : isToday
                      ? 'bg-[#d4a373] text-stone-950 shadow-xs'
                      : hasActivity
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {dayNum}
                </div>

                {/* Micro Activity Badges */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                  {dayPhoto && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                  )}
                  {hasNote && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-xs" />
                  )}
                  {items.some(it => it.type === 'spotify' || it.type === 'music') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Day Preview Banner (Day One style) */}
        {selectedDayData && (
          <div className="mt-8 rounded-3xl p-6 bg-white dark:bg-[#171614] border border-stone-200/60 dark:border-stone-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-all animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-sans tracking-wide text-[#d4a373] font-semibold">
                  Selected Day
                </span>
                <span className="text-stone-400">•</span>
                <span className="text-xs font-sans text-stone-500 dark:text-stone-400">
                  {selectedDayData.items.length} records captured
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-medium text-stone-900 dark:text-stone-100">
                {selectedDayData.dateObj.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h2>
              {selectedDayData.note && (
                <p className="text-sm font-serif italic text-stone-600 dark:text-stone-300 line-clamp-2 max-w-2xl mt-1">
                  "{selectedDayData.note}"
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {onNavigateToCanvas && (
                <button
                  onClick={() => onNavigateToCanvas(selectedDayData.dateObj)}
                  className="px-4 py-2.5 rounded-2xl bg-[#d4a373] hover:bg-[#e0a96d] text-neutral-950 font-sans text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Open in Canvas</span>
                </button>
              )}
              {onNavigateToNotes && (
                <button
                  onClick={() => onNavigateToNotes(selectedDayData.dateObj)}
                  className="px-4 py-2.5 rounded-2xl bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-sans text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <span>Open in Notes</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
