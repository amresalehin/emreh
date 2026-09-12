import React from 'react';
import { X, FileText } from 'lucide-react';
import { NoteBlock } from '../../../types/notes';

interface WordCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: NoteBlock[];
  title?: string;
}

export const WordCountModal: React.FC<WordCountModalProps> = ({
  isOpen,
  onClose,
  blocks,
  title = 'Untitled Note'
}) => {
  if (!isOpen) return null;

  const totalWords = blocks.reduce((acc, b) => {
    return acc + (b.content ? b.content.trim().split(/\s+/).filter(Boolean).length : 0);
  }, 0);

  const totalCharsWithSpaces = blocks.reduce((acc, b) => {
    return acc + (b.content ? b.content.length : 0);
  }, 0);

  const totalCharsNoSpaces = blocks.reduce((acc, b) => {
    return acc + (b.content ? b.content.replace(/\s+/g, '').length : 0);
  }, 0);

  const paragraphsCount = blocks.filter((b) => b.type === 'paragraph' && b.content.trim()).length;
  const estimatedPages = Math.max(1, Math.ceil(totalWords / 450));
  const readingTimeMin = Math.max(1, Math.ceil(totalWords / 200));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1e1e20] border border-stone-200 dark:border-stone-800 shadow-2xl p-5 space-y-4 text-stone-800 dark:text-stone-200 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Word count
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800/60">
            <span className="text-stone-500 dark:text-stone-400">Pages (approx.)</span>
            <span className="font-semibold text-stone-900 dark:text-stone-100">{estimatedPages}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800/60">
            <span className="text-stone-500 dark:text-stone-400">Words</span>
            <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">{totalWords}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800/60">
            <span className="text-stone-500 dark:text-stone-400">Characters</span>
            <span className="font-semibold text-stone-900 dark:text-stone-100">{totalCharsWithSpaces}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800/60">
            <span className="text-stone-500 dark:text-stone-400">Characters excluding spaces</span>
            <span className="font-semibold text-stone-900 dark:text-stone-100">{totalCharsNoSpaces}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800/60">
            <span className="text-stone-500 dark:text-stone-400">Paragraphs</span>
            <span className="font-semibold text-stone-900 dark:text-stone-100">{paragraphsCount}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-stone-500 dark:text-stone-400">Estimated reading time</span>
            <span className="font-semibold text-stone-900 dark:text-stone-100">~{readingTimeMin} min</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
