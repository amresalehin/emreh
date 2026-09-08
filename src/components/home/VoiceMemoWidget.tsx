import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  BookOpen,
  Volume2,
  Play,
  CheckCircle2
} from 'lucide-react';
import { ViewType } from '../../types';

interface VoiceMemoWidgetProps {
  onOpenVoiceMemo?: () => void;
  onNavigateView?: (view: ViewType) => void;
  dailyNotesMap?: Record<string, string>;
  className?: string;
}

export const VoiceMemoWidget: React.FC<VoiceMemoWidgetProps> = ({
  onOpenVoiceMemo,
  onNavigateView,
  dailyNotesMap = {},
  className = ''
}) => {
  const [hasRecentMemos, setHasRecentMemos] = useState(false);
  const [recentMemoCount, setRecentMemoCount] = useState(0);
  const [latestMemoSnippet, setLatestMemoSnippet] = useState<string | null>(null);

  // Scan daily notes for any voice memo mentions (🎙️ Voice Memo or voice-note)
  useEffect(() => {
    let count = 0;
    let snippet: string | null = null;

    for (const [dateKey, rawVal] of Object.entries(dailyNotesMap)) {
      const content = typeof rawVal === 'string' ? rawVal : '';
      if (content.includes('🎙️ Voice Memo') || content.includes('Voice Recording') || content.includes('Voice Note')) {
        count++;
        if (!snippet) {
          // Extract snippet
          const match = content.match(/(?:🎙️ Voice Memo[^\n]*\n|Voice Note[^\n]*\n)([\s\S]{1,120})/);
          if (match && match[1]) {
            snippet = match[1].trim();
          } else {
            snippet = `Recorded memo on ${dateKey}`;
          }
        }
      }
    }

    setRecentMemoCount(count);
    setHasRecentMemos(count > 0);
    setLatestMemoSnippet(snippet);
  }, [dailyNotesMap]);

  return (
    <div
      id="memo-audio-note-widget"
      className={`
        w-full max-w-md p-6 rounded-3xl
        bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl
        border border-black/10 dark:border-white/10
        shadow-lg shadow-black/5 dark:shadow-black/20
        transition-all duration-200 hover:shadow-xl
        flex flex-col justify-between
        ${className}
      `}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-xs">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Memo Audio Note
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-rose-500" />
                  Voice
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Quick voice dictation & audio recording
              </p>
            </div>
          </div>
        </div>

        {/* Animated Waveform Visualizer & Record CTA */}
        <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/15 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-end gap-1 h-5 px-1">
                <span className="w-1 bg-rose-500/60 rounded-full h-2 animate-[pulse_1s_ease-in-out_infinite]" />
                <span className="w-1 bg-rose-500 rounded-full h-4 animate-[pulse_1.2s_ease-in-out_infinite]" />
                <span className="w-1 bg-rose-500/80 rounded-full h-3 animate-[pulse_0.8s_ease-in-out_infinite]" />
                <span className="w-1 bg-rose-500 rounded-full h-5 animate-[pulse_1.1s_ease-in-out_infinite]" />
                <span className="w-1 bg-rose-500/70 rounded-full h-3 animate-[pulse_0.9s_ease-in-out_infinite]" />
                <span className="w-1 bg-rose-500/40 rounded-full h-2 animate-[pulse_1.3s_ease-in-out_infinite]" />
              </div>
              <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                Studio Ready
              </span>
            </div>

            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
              Speech-to-Text Transcribed
            </span>
          </div>

          <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed mb-3">
            Capture thoughts, spoken reminders, or daily diary audio notes with live Web Speech transcriptions.
          </p>

          {/* Primary Action Button */}
          <button aria-label="Action"
            type="button"
            id="home-record-voice-memo-btn"
            onClick={onOpenVoiceMemo}
            className="
              w-full py-3 px-4 rounded-xl
              bg-rose-600 hover:bg-rose-700 active:scale-[0.99]
              text-white font-bold text-xs
              shadow-md shadow-rose-600/25
              flex items-center justify-center gap-2.5
              transition-all duration-150 cursor-pointer
            "
          >
            <Mic className="w-4 h-4 text-white animate-pulse" />
            <span>Record Voice Memo Now</span>
          </button>
        </div>

        {/* Latest Memo or Quick Stats */}
        {hasRecentMemos && latestMemoSnippet ? (
          <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 mb-4">
            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 dark:text-zinc-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-rose-500" />
                Latest Voice Memo
              </span>
              <span>{recentMemoCount} recorded</span>
            </div>
            <p className="text-xs text-gray-700 dark:text-zinc-300 italic line-clamp-2">
              &ldquo;{latestMemoSnippet}&rdquo;
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-[11px] text-gray-500 dark:text-zinc-400 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Memos sync automatically to Daily Journal & Notes</span>
          </div>
        )}
      </div>

      {/* Footer Navigation Links */}
      <div className="pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-2">
        <button aria-label="Action"
          type="button"
          onClick={() => onNavigateView?.('notes')}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-amber-500" />
          <span>Notes Workspace</span>
        </button>

        <button aria-label="Action"
          type="button"
          onClick={() => onNavigateView?.('timeline')}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
          <span>Daily Journal</span>
          <ArrowRight className="w-3 h-3 opacity-60" />
        </button>
      </div>
    </div>
  );
};
