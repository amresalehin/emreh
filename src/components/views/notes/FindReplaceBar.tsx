import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Replace,
  CaseSensitive
} from 'lucide-react';
import { NoteBlock } from '../../../types/notes';

interface FindReplaceBarProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: NoteBlock[];
  onReplaceBlock: (blockIndex: number, newContent: string) => void;
  onReplaceAll: (searchTerm: string, replaceTerm: string, matchCase: boolean) => void;
  onHighlightMatch?: (blockIndex: number) => void;
}

export const FindReplaceBar: React.FC<FindReplaceBarProps> = ({
  isOpen,
  onClose,
  blocks,
  onReplaceBlock,
  onReplaceAll,
  onHighlightMatch
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Find all matches across blocks
  const matches = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    const results: { blockIndex: number; blockId: string }[] = [];

    blocks.forEach((b, bIdx) => {
      const content = b.content || '';
      const text = matchCase ? content : content.toLowerCase();
      const query = matchCase ? searchTerm : searchTerm.toLowerCase();

      if (text.includes(query)) {
        // Can have multiple matches per block, but for block navigation count matches
        let pos = text.indexOf(query);
        while (pos !== -1) {
          results.push({ blockIndex: bIdx, blockId: b.id });
          pos = text.indexOf(query, pos + query.length);
        }
      }
    });

    return results;
  }, [blocks, searchTerm, matchCase]);

  // Keep match index within bounds
  useEffect(() => {
    if (currentMatchIndex >= matches.length) {
      setCurrentMatchIndex(matches.length > 0 ? 0 : 0);
    }
  }, [matches.length, currentMatchIndex]);

  // Highlight active match
  useEffect(() => {
    if (matches.length > 0 && matches[currentMatchIndex]) {
      onHighlightMatch?.(matches[currentMatchIndex].blockIndex);
    }
  }, [currentMatchIndex, matches, onHighlightMatch]);

  const handleNext = () => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  };

  const handleReplaceSingle = () => {
    if (matches.length === 0 || !matches[currentMatchIndex]) return;
    const match = matches[currentMatchIndex];
    const targetBlock = blocks[match.blockIndex];
    if (!targetBlock) return;

    const content = targetBlock.content || '';
    const regex = new RegExp(
      searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      matchCase ? '' : 'i'
    );
    const newContent = content.replace(regex, replaceTerm);
    onReplaceBlock(match.blockIndex, newContent);
  };

  const handleReplaceAllClick = () => {
    if (!searchTerm.trim()) return;
    onReplaceAll(searchTerm, replaceTerm, matchCase);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-14 right-8 z-40 w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-[#1f1f22]/95 backdrop-blur-xl border border-stone-200/80 dark:border-stone-800 shadow-2xl p-3 text-xs text-stone-800 dark:text-stone-200 space-y-2.5 animate-in slide-in-from-top-2 duration-150 ring-1 ring-black/5">
      {/* Search Input Row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200/60 dark:border-stone-700/60">
          <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentMatchIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.shiftKey) handlePrev();
                else handleNext();
              }
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Find in note..."
            className="w-full bg-transparent outline-none text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
          />
          <button
            type="button"
            onClick={() => setMatchCase(!matchCase)}
            title="Match Case"
            className={`p-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
              matchCase
                ? 'bg-amber-500 text-white'
                : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`}
          >
            <CaseSensitive className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[11px] font-medium text-stone-400 shrink-0 w-16 text-center">
          {matches.length > 0 ? `${currentMatchIndex + 1} of ${matches.length}` : '0 results'}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={matches.length === 0}
            title="Previous match (Shift+Enter)"
            className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 cursor-pointer"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={matches.length === 0}
            title="Next match (Enter)"
            className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Replace Row */}
      <div className="flex items-center gap-2 pt-0.5">
        <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200/60 dark:border-stone-700/60">
          <Replace className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <input
            type="text"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleReplaceSingle();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Replace with..."
            className="w-full bg-transparent outline-none text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
          />
        </div>

        <button
          type="button"
          onClick={handleReplaceSingle}
          disabled={matches.length === 0}
          className="px-2.5 py-1.5 rounded-xl bg-stone-200/80 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 disabled:opacity-40 font-medium text-xs cursor-pointer transition-colors"
        >
          Replace
        </button>

        <button
          type="button"
          onClick={handleReplaceAllClick}
          disabled={matches.length === 0}
          className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-medium text-xs cursor-pointer transition-colors"
        >
          All
        </button>
      </div>
    </div>
  );
};
