import React, { useRef, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RotateCcw
} from 'lucide-react';

export interface RichDateNavButtonProps {
  currentDate: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onJumpToDate?: (date: Date) => void;
  onOpenCalendar?: () => void;
  accentColor?: 'emerald' | 'indigo' | 'blue' | 'stone' | 'orange';
  className?: string;
}

export const RichDateNavButton: React.FC<RichDateNavButtonProps> = ({
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onJumpToDate,
  onOpenCalendar,
  accentColor = 'emerald',
  className = ''
}) => {
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Safe date object
  const validDate = useMemo(() => {
    return currentDate && !isNaN(currentDate.getTime()) ? currentDate : new Date();
  }, [currentDate]);

  // Format YYYY-MM-DD for native input
  const dateStr = useMemo(() => {
    const y = validDate.getFullYear();
    const m = String(validDate.getMonth() + 1).padStart(2, '0');
    const d = String(validDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [validDate]);

  // Today check
  const isToday = useMemo(() => {
    const now = new Date();
    return (
      now.getFullYear() === validDate.getFullYear() &&
      now.getMonth() === validDate.getMonth() &&
      now.getDate() === validDate.getDate()
    );
  }, [validDate]);

  // Relative diff in days
  const relativeLabel = useMemo(() => {
    const now = new Date();
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const targetZero = new Date(validDate.getFullYear(), validDate.getMonth(), validDate.getDate()).getTime();
    const diffDays = Math.round((todayZero - targetZero) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays === -1) return 'Tomorrow';
    if (diffDays > 1) return `${diffDays}d ago`;
    return `in ${Math.abs(diffDays)}d`;
  }, [validDate]);

  const formattedDate = useMemo(() => {
    return validDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: validDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }, [validDate]);

  // Color mappings
  const theme = useMemo(() => {
    switch (accentColor) {
      case 'indigo':
        return {
          pillHover: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100',
          iconColor: 'text-indigo-600 dark:text-indigo-400',
          badgeBg: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300',
          btnSoft: 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/25'
        };
      case 'blue':
        return {
          pillHover: 'hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-900 dark:text-blue-100',
          iconColor: 'text-blue-600 dark:text-blue-400',
          badgeBg: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300',
          btnSoft: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/25'
        };
      case 'stone':
        return {
          pillHover: 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-900 dark:text-stone-100',
          iconColor: 'text-stone-600 dark:text-stone-400',
          badgeBg: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300',
          btnSoft: 'bg-stone-500/10 hover:bg-stone-500/20 text-stone-700 dark:text-stone-300 border-stone-500/25'
        };
      case 'orange':
        return {
          pillHover: 'hover:bg-orange-50 dark:hover:bg-orange-950/40 text-orange-900 dark:text-orange-100',
          iconColor: 'text-orange-600 dark:text-orange-400',
          badgeBg: 'bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300',
          btnSoft: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/25'
        };
      case 'emerald':
      default:
        return {
          pillHover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300',
          btnSoft: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
        };
    }
  }, [accentColor]);

  // Jump to specific date from native picker
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [y, m, d] = val.split('-').map(Number);
    if (y && m && d) {
      const selected = new Date(y, m - 1, d);
      if (onJumpToDate) {
        onJumpToDate(selected);
      }
    }
  };

  const handlePillClick = () => {
    if (dateInputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          dateInputRef.current.showPicker();
          return;
        } catch (e) {
          // fallback to click
        }
      }
      dateInputRef.current.focus();
      dateInputRef.current.click();
    }
  };

  const handleJumpToday = () => {
    if (onSetToday) {
      onSetToday();
    } else if (onJumpToDate) {
      onJumpToDate(new Date());
    }
  };

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      {/* Stepper + 1-Click Date Picker Pill */}
      <div className="flex items-center bg-gray-100/90 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-black/5 dark:border-white/10 shadow-2xs">
        {/* Previous Day */}
        <button
          type="button"
          onClick={onPrevDate}
          title="Previous Day"
          className="p-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 1-Click Date Button with Native Calendar Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={handlePillClick}
            title="Click to pick any date directly"
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold
              transition-all duration-150 cursor-pointer select-none
              text-gray-800 dark:text-zinc-200 hover:bg-white/90 dark:hover:bg-zinc-700/90
              ${theme.pillHover}
            `}
          >
            <CalendarIcon className={`w-3.5 h-3.5 shrink-0 ${theme.iconColor}`} />
            <span className="tracking-tight">{formattedDate}</span>
            
            {/* Relative Diff Badge */}
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${theme.badgeBg}`}>
              {relativeLabel}
            </span>
          </button>

          {/* Hidden native date input that opens immediately on 1 click */}
          <input
            ref={dateInputRef}
            type="date"
            value={dateStr}
            onChange={handleDateChange}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-none"
            tabIndex={-1}
            aria-label="Pick date"
          />
        </div>

        {/* Next Day */}
        <button
          type="button"
          onClick={onNextDate}
          title="Next Day"
          className="p-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 1-Click "Today" Jump when navigated away */}
      {!isToday && (
        <button
          type="button"
          onClick={handleJumpToday}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs border ${theme.btnSoft}`}
          title="Jump directly to Today"
        >
          <RotateCcw className="w-3 h-3 opacity-70" />
          <span>Today</span>
        </button>
      )}

      {/* Optional Full Calendar Heatmap Modal trigger */}
      {onOpenCalendar && (
        <button
          type="button"
          onClick={onOpenCalendar}
          className="p-1.5 rounded-xl bg-gray-100/90 dark:bg-zinc-800/80 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 border border-black/5 dark:border-white/10 transition cursor-pointer shadow-2xs"
          title="Open activity calendar view"
        >
          <CalendarIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
