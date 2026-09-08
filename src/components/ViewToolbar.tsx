import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarRange,
  Search,
  X,
  Upload,
  RotateCcw,
  Settings
} from 'lucide-react';
import { DateRange } from '../types';

export interface ViewToolbarProps {
  // Page Identity / Optional badge
  title?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;

  // Calendar & Date Navigation (Head Calendar)
  currentDate?: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onJumpToDate?: (date: Date) => void;
  onOpenCalendar?: () => void;
  showDateNavigation?: boolean;

  // Date Range Support
  dateRange?: DateRange | null;
  onClearDateRange?: () => void;
  onOpenDateRangePicker?: () => void;

  // In-Page Search
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  searchResultsCount?: number;
  showSearch?: boolean;

  // Importer
  onImportClick?: () => void;
  showImport?: boolean;
  importLabel?: string;

  // Active filters indicator
  hasActiveFilters?: boolean;

  // Inline action slots for minimalist layout
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;

  // Extra Actions / Custom Filter Controls Slot (rendered inside Filter Menu)
  children?: React.ReactNode;
  className?: string;
}

export const ViewToolbar: React.FC<ViewToolbarProps> = ({
  badge,
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onJumpToDate,
  onOpenCalendar,
  showDateNavigation = true,
  dateRange,
  onClearDateRange,
  onOpenDateRangePicker,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  searchResultsCount,
  showSearch = true,
  onImportClick,
  showImport = true,
  importLabel = 'Import',
  hasActiveFilters = false,
  leftActions,
  rightActions,
  children,
  className = ''
}) => {
  const [isGearOpen, setIsGearOpen] = useState(false);
  const gearRef = useRef<HTMLDivElement>(null);

  // Close gear popover on outside click or Escape key
  useEffect(() => {
    if (!isGearOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) {
        setIsGearOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsGearOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGearOpen]);

  const formattedDate = currentDate && !isNaN(currentDate.getTime())
    ? currentDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  const dateInputRef = useRef<HTMLInputElement>(null);

  const dateStr = currentDate && !isNaN(currentDate.getTime())
    ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
    : '';

  const isToday = currentDate && !isNaN(currentDate.getTime())
    ? new Date().toDateString() === currentDate.toDateString()
    : true;

  const handleDateClick = () => {
    if (onOpenCalendar) {
      onOpenCalendar();
      return;
    }
    if (onOpenDateRangePicker) {
      onOpenDateRangePicker();
      return;
    }
    if (onJumpToDate && dateInputRef.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          dateInputRef.current.showPicker();
          return;
        }
      } catch (_) {
        // Cross-origin iframe or browser permission exception
      }
      try {
        dateInputRef.current.focus();
        dateInputRef.current.click();
      } catch (_) {}
    }
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [y, m, d] = val.split('-').map(Number);
    if (y && m && d && onJumpToDate) {
      onJumpToDate(new Date(y, m - 1, d));
    }
  };

  // Range formatted text
  const formatRangeText = () => {
    if (!dateRange) return '';
    const { startDate, endDate } = dateRange;
    if (startDate === endDate) return startDate;
    return `${startDate} → ${endDate}`;
  };

  const calculateRangeDays = () => {
    if (!dateRange) return 0;
    const s = new Date(dateRange.startDate + 'T00:00:00').getTime();
    const e = new Date(dateRange.endDate + 'T00:00:00').getTime();
    if (isNaN(s) || isNaN(e)) return 1;
    return Math.round(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div
      id="view-header-toolbar"
      className={`py-2.5 px-3 sm:px-5 border-b border-black/8 dark:border-white/10 bg-white/55 dark:bg-[#121214]/60 backdrop-blur-xl supports-[backdrop-filter]:bg-white/50 dark:supports-[backdrop-filter]:bg-[#121214]/55 shadow-2xs sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2.5 shrink-0 transition-all ${className}`}
    >
      {/* Left: Count Badge & Inline Controls */}
      <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
        {badge && (
          <div className="shrink-0 font-medium">
            {badge}
          </div>
        )}
        {leftActions && (
          <div className="flex items-center gap-2 flex-wrap">
            {leftActions}
          </div>
        )}
      </div>

      {/* Right: Head Calendar, Search, Small Import Button, and Filters */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap ml-auto">
        {/* Head Calendar: Date Navigation Pill */}
        {showDateNavigation && (
          <>
            {dateRange ? (
              <div
                onClick={() => {
                  if (onOpenDateRangePicker) onOpenDateRangePicker();
                  else if (onOpenCalendar) onOpenCalendar();
                }}
                className="flex items-center gap-1.5 bg-blue-500/15 dark:bg-blue-500/25 hover:bg-blue-500/25 dark:hover:bg-blue-500/35 px-2.5 py-1 rounded-lg border border-blue-500/35 dark:border-blue-400/40 text-blue-900 dark:text-blue-100 text-xs font-mono font-bold shadow-2xs backdrop-blur-md cursor-pointer transition-colors"
                title="Click to adjust date range"
              >
                <CalendarRange className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline font-semibold">{formatRangeText()}</span>
                <span className="sm:hidden">{calculateRangeDays()}d</span>
                <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-blue-600 dark:bg-blue-500 text-white font-sans font-bold shadow-2xs">
                  {calculateRangeDays()}d
                </span>
                {onClearDateRange && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearDateRange();
                    }}
                    className="p-0.5 hover:bg-blue-500/20 text-blue-800 dark:text-blue-200 rounded cursor-pointer ml-0.5 transition-colors"
                    title="Reset date range"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              currentDate && onPrevDate && onNextDate && (
                <div className="flex items-center gap-1">
                  <div className="flex items-center bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/15 backdrop-blur-xl p-0.5 rounded-lg border border-black/10 dark:border-white/15 shadow-2xs text-xs transition-colors">
                    <button
                      type="button"
                      onClick={onPrevDate}
                      className="p-1 hover:bg-black/10 dark:hover:bg-white/15 rounded text-gray-800 dark:text-gray-100 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                      title="Previous Day"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <div className="relative flex items-center">
                      <button
                        type="button"
                        onClick={handleDateClick}
                        className="flex items-center gap-1.5 px-2.5 py-0.5 font-mono text-xs font-bold text-gray-950 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer whitespace-nowrap"
                        title="Click to open calendar navigator"
                      >
                        <CalendarIcon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>{formattedDate}</span>
                      </button>
                      {onJumpToDate && !onOpenCalendar && (
                        <input
                          ref={dateInputRef}
                          type="date"
                          value={dateStr}
                          onChange={handleNativeDateChange}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          tabIndex={-1}
                          aria-label="Pick date"
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={onNextDate}
                      className="p-1 hover:bg-black/10 dark:hover:bg-white/15 rounded text-gray-800 dark:text-gray-100 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                      title="Next Day"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!isToday && onSetToday && (
                    <button
                      type="button"
                      onClick={onSetToday}
                      className="px-2 py-1 text-[11px] font-bold rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                      title="Jump directly to Today"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Today</span>
                    </button>
                  )}
                </div>
              )
            )}
          </>
        )}

        {/* In-Page Search Bar */}
        {showSearch && onSearchChange && (
          <div className="relative flex items-center group">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-300 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 pointer-events-none transition-colors" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-28 sm:w-40 md:w-56 pl-7 pr-6 py-1 bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/15 focus:bg-white dark:focus:bg-[#1a1a1e] backdrop-blur-xl border border-black/12 dark:border-white/18 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg text-xs font-medium text-gray-950 dark:text-white outline-none transition-all placeholder:text-gray-500 dark:placeholder:text-gray-400 shadow-2xs"
            />
            {searchQuery ? (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white rounded-full cursor-pointer transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : searchResultsCount !== undefined && searchResultsCount > 0 ? (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-gray-700 dark:text-gray-300 pointer-events-none hidden sm:inline">
                {searchResultsCount}
              </span>
            ) : null}
          </div>
        )}

        {/* Small Import Button (Directly Accessible) */}
        {showImport && onImportClick && (
          <button
            onClick={onImportClick}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/10 hover:bg-white/95 dark:hover:bg-white/20 backdrop-blur-xl text-gray-950 dark:text-white transition-all cursor-pointer shadow-2xs shrink-0 active:scale-97"
            title={importLabel || 'Import Data'}
          >
            <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="hidden sm:inline font-semibold">{importLabel || 'Import'}</span>
          </button>
        )}

        {/* Optional Right Action Controls */}
        {rightActions}

        {/* View-Specific Filters Dropdown Popover */}
        {children && (
          <div className="relative" ref={gearRef}>
            <button
              onClick={() => setIsGearOpen(!isGearOpen)}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-semibold border transition-all cursor-pointer shadow-2xs backdrop-blur-xl ${
                isGearOpen || hasActiveFilters
                  ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-600 dark:border-blue-500 shadow-xs'
                  : 'bg-white/70 dark:bg-white/10 border-black/10 dark:border-white/15 text-gray-950 dark:text-white hover:bg-white/95 dark:hover:bg-white/20'
              }`}
              title="Filter & View Options"
              aria-label="Filter Options"
            >
              <Settings className={`w-3.5 h-3.5 transition-transform duration-300 ${isGearOpen ? 'rotate-90' : ''}`} />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-300 dark:bg-white" />
              )}
            </button>

            {isGearOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-2xl border border-black/10 dark:border-white/15 rounded-xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 space-y-3 max-h-[82vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-black/8 dark:border-white/10 pb-2">
                  <span className="text-xs font-bold text-gray-950 dark:text-white">
                    Filter Options
                  </span>
                  <button
                    onClick={() => setIsGearOpen(false)}
                    className="p-1 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white rounded-lg cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {children}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
