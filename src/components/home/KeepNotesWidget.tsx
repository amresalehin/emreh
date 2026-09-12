import React, { useState } from 'react';
import {
  StickyNote,
  Plus,
  Check,
  ArrowUpRight,
  Sparkles,
  Edit3,
  Bookmark
} from 'lucide-react';
import { ViewType } from '../../types';

interface KeepNotesWidgetProps {
  currentDate?: Date;
  dailyNotesMap?: Record<string, string>;
  onSaveDailyNote?: (text: string) => void;
  onNavigateView?: (view: ViewType) => void;
  onOpenNote?: (title: string) => void;
  onOpenKeepImport?: () => void;
}

export const KeepNotesWidget: React.FC<KeepNotesWidgetProps> = ({
  currentDate = new Date(),
  dailyNotesMap = {},
  onSaveDailyNote,
  onNavigateView,
  onOpenNote,
  onOpenKeepImport
}) => {
  const dateKey = currentDate.toISOString().slice(0, 10);
  const existingNote = dailyNotesMap[dateKey] || '';

  const [quickThought, setQuickThought] = useState('');
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  const handleAddThought = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickThought.trim() || !onSaveDailyNote) return;

    const updatedText = existingNote
      ? `${existingNote}\n• ${quickThought.trim()}`
      : `• ${quickThought.trim()}`;

    onSaveDailyNote(updatedText);
    setQuickThought('');
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  // Recent notes from dailyNotesMap
  const recentNotesList = Object.entries(dailyNotesMap)
    .filter(([_, text]) => typeof text === 'string' && text.trim().length > 0)
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .slice(0, 3);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-black/8 dark:border-white/10 shadow-2xs hover:border-amber-500/30 transition-all flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-white">
                Keep & Daily Reflections
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                {dateKey} Quick Capture
              </p>
            </div>
          </div>

          {onNavigateView && (
            <button
              onClick={() => onNavigateView('notes')}
              className="px-2 py-1 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Notes Canvas</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Quick Thought Form */}
        <form onSubmit={handleAddThought} className="mb-3 space-y-1.5">
          <div className="relative">
            <input
              type="text"
              value={quickThought}
              onChange={e => setQuickThought(e.target.value)}
              placeholder="Capture a quick thought or task..."
              className="w-full pl-3 pr-8 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs text-gray-950 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-medium"
            />
            <button
              type="submit"
              disabled={!quickThought.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-30 text-white transition-colors cursor-pointer"
              title="Add to daily notes"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {isSavedRecently && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> Added to daily notes
            </div>
          )}
        </form>

        {/* Existing Today's Note Preview */}
        {existingNote ? (
          <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 mb-3">
            <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Edit3 className="w-3 h-3" /> Today's Log
            </div>
            <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-3 whitespace-pre-line leading-relaxed font-medium">
              {existingNote}
            </p>
          </div>
        ) : null}

        {/* Recent Reflections List */}
        {recentNotesList.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Recent Logs
            </div>
            {recentNotesList.map(([dKey, text]) => (
              <div
                key={dKey}
                onClick={() => onNavigateView && onNavigateView('notes')}
                className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 dark:text-gray-400 mb-0.5">
                  <span className="font-bold text-amber-700 dark:text-amber-400">{dKey}</span>
                  <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1 font-normal">
                  {text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {onOpenKeepImport && (
        <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5">
          <button
            onClick={onOpenKeepImport}
            className="w-full py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3" /> Import Google Keep Notes
          </button>
        </div>
      )}
    </div>
  );
};
