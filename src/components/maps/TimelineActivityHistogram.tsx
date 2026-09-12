import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TimelineActivityHistogramProps {
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  dateIndexMap?: Map<string, any[]>;
  allMapsItems?: any[];
}

export const TimelineActivityHistogram: React.FC<TimelineActivityHistogramProps> = ({
  currentDate,
  onSelectDate,
  dateIndexMap,
  allMapsItems = []
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDayNum = currentDate.getDate();

  // Compute activity count or distance per day in this month
  const dailyCounts = React.useMemo(() => {
    const counts: number[] = new Array(daysInMonth + 1).fill(0);
    const mStr = String(month + 1).padStart(2, '0');

    if (dateIndexMap) {
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = String(d).padStart(2, '0');
        const key = `${year}-${mStr}-${dStr}`;
        const items = dateIndexMap.get(key) || [];
        const mapItems = items.filter(i => i.type === 'maps');
        counts[d] = mapItems.length;
      }
    } else if (allMapsItems.length > 0) {
      allMapsItems.forEach(item => {
        if (!item.ts) return;
        const d = item.dateObj || new Date(item.ts);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const day = d.getDate();
          if (day >= 1 && day <= daysInMonth) {
            counts[day] = (counts[day] || 0) + 1;
          }
        }
      });
    }

    return counts;
  }, [year, month, daysInMonth, dateIndexMap, allMapsItems]);

  const maxCount = Math.max(...dailyCounts.slice(1), 1);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    onSelectDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(year, month + 1, 1);
    onSelectDate(next);
  };

  return (
    <div className="bg-white/60 dark:bg-[#1e1e1e]/60 backdrop-blur-xl supports-[backdrop-filter]:bg-white/50 dark:supports-[backdrop-filter]:bg-[#1e1e1e]/50 border-b border-gray-200/60 dark:border-white/10 px-4 py-2.5 select-none transition-all">
      {/* Month Title & Month Navigators */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-stone-300 transition-colors cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 tracking-tight">
            {monthName}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-stone-300 transition-colors cursor-pointer"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="text-[10px] text-gray-400 font-medium">
          Activity bar chart
        </div>
      </div>

      {/* 28-31 Day Bars Chart */}
      <div className="flex items-end justify-between gap-1 h-9 pt-1 px-1">
        {Array.from({ length: daysInMonth }, (_, idx) => {
          const dayNum = idx + 1;
          const count = dailyCounts[dayNum] || 0;
          const isSelected = dayNum === currentDayNum;
          const isToday =
            new Date().getFullYear() === year &&
            new Date().getMonth() === month &&
            new Date().getDate() === dayNum;

          // Height between 15% and 100%
          const heightPercent = count > 0 ? Math.max(25, Math.round((count / maxCount) * 100)) : 12;

          return (
            <button
              key={dayNum}
              onClick={() => onSelectDate(new Date(year, month, dayNum))}
              className="flex-1 flex flex-col items-center justify-end h-full group relative focus:outline-none cursor-pointer"
              title={`${monthName.split(' ')[0]} ${dayNum}: ${count} places/activities`}
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                <div className="bg-gray-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                  {dayNum} {monthName.split(' ')[0]}: {count} visits
                </div>
              </div>

              {/* Bar */}
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full max-w-[8px] rounded-t-sm transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#1A73E8] ring-1 ring-[#1A73E8] shadow-sm'
                    : count > 0
                    ? 'bg-blue-300 dark:bg-blue-600/60 hover:bg-blue-400 dark:hover:bg-blue-500'
                    : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
                }`}
              />

              {/* Day Label below or Dot indicator */}
              <span
                className={`text-[8px] mt-0.5 leading-none transition-colors ${
                  isSelected
                    ? 'font-extrabold text-[#1A73E8]'
                    : isToday
                    ? 'font-bold text-gray-800 dark:text-gray-200 underline'
                    : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                }`}
              >
                {dayNum % 5 === 1 || dayNum === daysInMonth || isSelected ? dayNum : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
