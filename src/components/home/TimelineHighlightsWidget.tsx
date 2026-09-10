import React, { useMemo } from 'react';
import {
  Sparkles,
  Headphones,
  Video,
  Globe,
  Camera,
  ArrowUpRight,
  Calendar,
  Layers
} from 'lucide-react';
import { TimelineItem, ViewType } from '../../types';
import { formatTime } from '../../utils/dataParser';

interface TimelineHighlightsWidgetProps {
  timelineData?: TimelineItem[];
  currentDate?: Date;
  onNavigateView?: (view: ViewType) => void;
  onJumpToDate?: (date: Date) => void;
}

export const TimelineHighlightsWidget: React.FC<TimelineHighlightsWidgetProps> = ({
  timelineData = [],
  currentDate = new Date(),
  onNavigateView,
  onJumpToDate
}) => {
  const dateKey = currentDate.toISOString().slice(0, 10);

  // Group items by type for today or overall
  const todayItems = useMemo(() => {
    return timelineData.filter(i => i.ts?.startsWith(dateKey));
  }, [timelineData, dateKey]);

  const itemsToAnalyze = todayItems.length > 0 ? todayItems : timelineData.slice(0, 50);

  const breakdown = useMemo(() => {
    let spotify = 0;
    let youtube = 0;
    let browser = 0;
    let photo = 0;
    let maps = 0;

    itemsToAnalyze.forEach(i => {
      if (i.type === 'spotify') spotify++;
      else if (i.type === 'youtube') youtube++;
      else if (i.type === 'browser') browser++;
      else if (i.type === 'photo') photo++;
      else if (i.type === 'maps') maps++;
    });

    return { spotify, youtube, browser, photo, maps, total: itemsToAnalyze.length };
  }, [itemsToAnalyze]);

  const recentMoments = itemsToAnalyze.slice(0, 3);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-black/8 dark:border-white/10 shadow-2xs hover:border-purple-500/30 transition-all flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-800 dark:text-purple-300">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-white">
                Life Stream Highlights
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                {todayItems.length > 0 ? `Today (${todayItems.length} moments)` : 'Recent Activity Stream'}
              </p>
            </div>
          </div>

          {onNavigateView && (
            <button
              onClick={() => onNavigateView('timeline')}
              className="px-2 py-1 rounded-lg text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Journal</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Counter Pills */}
        <div className="grid grid-cols-4 gap-1.5 mb-3 text-center">
          <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/15">
            <Headphones className="w-3 h-3 mx-auto mb-0.5" />
            <div className="text-xs font-bold">{breakdown.spotify}</div>
            <div className="text-[8px] opacity-75">Music</div>
          </div>
          <div className="p-1.5 rounded-xl bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/15">
            <Video className="w-3 h-3 mx-auto mb-0.5" />
            <div className="text-xs font-bold">{breakdown.youtube}</div>
            <div className="text-[8px] opacity-75">Videos</div>
          </div>
          <div className="p-1.5 rounded-xl bg-sky-500/10 text-sky-800 dark:text-sky-300 border border-sky-500/15">
            <Globe className="w-3 h-3 mx-auto mb-0.5" />
            <div className="text-xs font-bold">{breakdown.browser}</div>
            <div className="text-[8px] opacity-75">Web</div>
          </div>
          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/15">
            <Camera className="w-3 h-3 mx-auto mb-0.5" />
            <div className="text-xs font-bold">{breakdown.photo}</div>
            <div className="text-[8px] opacity-75">Photos</div>
          </div>
        </div>

        {/* Recent Moments */}
        {recentMoments.length > 0 ? (
          <div className="space-y-1.5">
            {recentMoments.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {item.type === 'spotify' && <Headphones className="w-3 h-3 text-emerald-500 shrink-0" />}
                  {item.type === 'youtube' && <Video className="w-3 h-3 text-rose-500 shrink-0" />}
                  {item.type === 'browser' && <Globe className="w-3 h-3 text-sky-500 shrink-0" />}
                  {item.type === 'photo' && <Camera className="w-3 h-3 text-amber-500 shrink-0" />}
                  {item.type === 'maps' && <Calendar className="w-3 h-3 text-blue-500 shrink-0" />}

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                {item.dateObj && (
                  <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 shrink-0">
                    {formatTime(item.dateObj)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center rounded-xl bg-black/[0.02] dark:bg-white/[0.02] text-xs text-gray-500 dark:text-gray-400">
            No stream activity logged yet.
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5">
        <button
          onClick={() => onNavigateView && onNavigateView('timeline')}
          className="w-full py-1.5 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-800 dark:text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Calendar className="w-3 h-3" /> View Daily Journal
        </button>
      </div>
    </div>
  );
};
