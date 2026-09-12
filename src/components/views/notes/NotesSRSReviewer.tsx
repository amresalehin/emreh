import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Flame,
  Award,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Clock
} from 'lucide-react';
import { NoteBlock, NoteObject } from '../../../types/notes';

interface FlashcardItem {
  noteId: string;
  noteTitle: string;
  block: NoteBlock;
}

interface NotesSRSReviewerProps {
  notes: NoteObject[];
  onUpdateBlock: (noteId: string, updatedBlock: NoteBlock) => void;
  onOpenNote: (noteId: string) => void;
}

export const NotesSRSReviewer: React.FC<NotesSRSReviewerProps> = ({
  notes,
  onUpdateBlock,
  onOpenNote
}) => {
  // Extract all flashcard blocks from notes
  const allCards: FlashcardItem[] = useMemo(() => {
    const cards: FlashcardItem[] = [];
    notes.forEach((note) => {
      note.blocks.forEach((block) => {
        if (block.type === 'flashcard' && block.content) {
          cards.push({
            noteId: note.id,
            noteTitle: note.title,
            block
          });
        }
      });
    });
    return cards;
  }, [notes]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [cardsReviewedCount, setCardsReviewedCount] = useState(0);

  const currentCard = allCards[currentIndex];

  const handleGrade = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentCard) return;

    // Compute updated SRS metadata
    const prevData = currentCard.block.srsData || {
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReview: new Date().toISOString(),
      state: 'new'
    };

    let newInterval = prevData.interval;
    let newRepetitions = prevData.repetitions + 1;
    let newEase = prevData.easeFactor;

    if (rating === 'again') {
      newInterval = 1;
      newRepetitions = 0;
      newEase = Math.max(1.3, newEase - 0.2);
    } else if (rating === 'hard') {
      newInterval = Math.max(1, Math.round(newInterval * 1.2));
      newEase = Math.max(1.3, newEase - 0.15);
    } else if (rating === 'good') {
      newInterval = Math.round(newInterval * newEase);
    } else if (rating === 'easy') {
      newInterval = Math.round(newInterval * newEase * 1.4);
      newEase += 0.15;
    }

    const nextDate = new Date(Date.now() + newInterval * 86400000).toISOString();

    onUpdateBlock(currentCard.noteId, {
      ...currentCard.block,
      srsData: {
        interval: newInterval,
        easeFactor: newEase,
        repetitions: newRepetitions,
        nextReview: nextDate,
        state: 'review'
      }
    });

    setCardsReviewedCount((c) => c + 1);
    setIsFlipped(false);

    if (currentIndex + 1 < allCards.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
  };

  if (allCards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/40 dark:bg-black/20 backdrop-blur-xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
          No Flashcards Created Yet
        </h3>
        <p className="text-xs text-gray-500 max-w-sm mb-4 leading-relaxed">
          In SiYuan and Anytype, you can turn any thought into a spaced repetition card. Type <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">/flashcard</code> in any note to generate active recall questions!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full min-h-0">
      {/* Session Progress Header */}
      <div className="w-full flex items-center justify-between text-xs text-gray-500 mb-4 px-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-gray-900 dark:text-white">
            Spaced Repetition Deck
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span>
            Card {Math.min(currentIndex + 1, allCards.length)} of {allCards.length}
          </span>
          <span className="flex items-center gap-1 text-amber-500 font-bold">
            <Flame className="w-3.5 h-3.5" /> {cardsReviewedCount} Reviewed
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
          style={{
            width: `${((currentIndex + (sessionCompleted ? 1 : 0)) / allCards.length) * 100}%`
          }}
        />
      </div>

      {sessionCompleted ? (
        /* Completion View */
        <div className="w-full p-8 rounded-3xl bg-white/80 dark:bg-[#18181b]/80 border border-gray-200/80 dark:border-white/10 shadow-xl text-center space-y-4 animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Daily Flashcards Complete!
          </h2>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            You successfully reviewed {cardsReviewedCount} spaced repetition cards today. Regular active recall builds durable long-term knowledge synthesis.
          </p>
          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRestart}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-sm transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Review Again
            </button>
          </div>
        </div>
      ) : (
        /* Active Flashcard Box */
        <div className="w-full space-y-4">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full min-h-[260px] p-8 rounded-3xl bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 shadow-xl flex flex-col justify-between cursor-pointer hover:border-amber-500/50 transition-all select-none group"
          >
            {/* Top Source Tag */}
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                <span>Source: {currentCard.noteTitle}</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500">
                {isFlipped ? 'Answer' : 'Question (Click to flip)'}
              </span>
            </div>

            {/* Prompt Question / Answer */}
            <div className="py-6 text-center">
              {!isFlipped ? (
                <div className="space-y-3">
                  <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-relaxed">
                    {currentCard.block.content}
                  </div>
                  <div className="text-xs text-gray-400 group-hover:text-amber-500 transition-colors">
                    Click card or spacebar to reveal answer
                  </div>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in zoom-in-95">
                  <div className="text-xs font-semibold text-gray-400">
                    Question: {currentCard.block.content}
                  </div>
                  <div className="text-base sm:text-lg font-medium text-emerald-600 dark:text-emerald-400 leading-relaxed">
                    {currentCard.block.flashcardAnswer || 'No answer entered for this card.'}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-3 border-t border-gray-100 dark:border-white/5">
              <span>Interval: {currentCard.block.srsData?.interval || 1}d</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenNote(currentCard.noteId);
                }}
                className="hover:text-blue-500 underline cursor-pointer"
              >
                Jump to Note
              </button>
            </div>
          </div>

          {/* Spaced Repetition Grading Buttons */}
          {isFlipped && (
            <div className="grid grid-cols-4 gap-2 pt-2 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => handleGrade('again')}
                className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-all active:scale-95"
              >
                <span>Again</span>
                <span className="text-[9px] font-normal opacity-75">&lt; 1 day</span>
              </button>
              <button
                type="button"
                onClick={() => handleGrade('hard')}
                className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-all active:scale-95"
              >
                <span>Hard</span>
                <span className="text-[9px] font-normal opacity-75">1 day</span>
              </button>
              <button
                type="button"
                onClick={() => handleGrade('good')}
                className="py-2.5 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-all active:scale-95"
              >
                <span>Good</span>
                <span className="text-[9px] font-normal opacity-75">3 days</span>
              </button>
              <button
                type="button"
                onClick={() => handleGrade('easy')}
                className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-all active:scale-95"
              >
                <span>Easy</span>
                <span className="text-[9px] font-normal opacity-75">7 days</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
