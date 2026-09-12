import React, { useState } from 'react';
import {
  Search,
  Plus,
  Pin,
  Trash2,
  X,
  FileText,
  Tag as TagIcon,
  Calendar,
  ArrowUpRight
} from 'lucide-react';
import { NoteObject, NotesSubView, ObjectType } from '../../../types/notes';

interface NotesSidebarProps {
  width?: number;
  notes: NoteObject[];
  activeNoteId?: string;
  activeSubView?: NotesSubView;
  onSelectSubView?: (view: NotesSubView) => void;
  onSelectNote: (noteId: string) => void;
  onNewNote: (type?: ObjectType) => void;
  onOpenTemplates?: () => void;
  selectedTagFilter?: string | null;
  onSelectTagFilter?: (tag: string | null) => void;
  onTogglePin?: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onNavigateToJournal?: (dateKey: string) => void;
}

function formatAppleNotesDate(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function getNotePreviewSnippet(note: NoteObject): string {
  for (const block of note.blocks) {
    if (block.content && block.content.trim()) {
      return block.content
        .replace(/\[\[(.*?)\]\]/g, '$1')
        .replace(/#([a-zA-Z0-9_-]+)/g, '$1')
        .replace(/^#+\s+/, '')
        .trim();
    }
  }
  return 'No additional text';
}

export const NotesSidebar: React.FC<NotesSidebarProps> = ({
  width,
  notes,
  activeNoteId,
  onSelectNote,
  onNewNote,
  selectedTagFilter,
  onSelectTagFilter,
  onTogglePin,
  onDeleteNote,
  onNavigateToJournal
}) => {
  const [search, setSearch] = useState('');

  // Filter notes
  const q = search.toLowerCase().trim();
  const filteredNotes = notes.filter((n) => {
    if (selectedTagFilter && !n.tags.includes(selectedTagFilter)) return false;
    if (q) {
      return (
        n.title.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)) ||
        n.blocks.some((b) => b.content && b.content.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned || n.favorite);
  const unpinnedNotes = filteredNotes.filter((n) => !n.isPinned && !n.favorite);

  // All unique tags
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).filter(Boolean);

  const renderNoteCard = (note: NoteObject) => {
    const isActive = note.id === activeNoteId;
    const dateFormatted = formatAppleNotesDate(note.updatedAt || note.createdAt);
    const snippet = getNotePreviewSnippet(note);
    const isPinned = note.isPinned || note.favorite;

    return (
      <div
        key={note.id}
        onClick={() => onSelectNote(note.id)}
        className={`group relative p-3.5 rounded-2xl cursor-pointer transition-all duration-200 select-none backdrop-blur-md border ${
          isActive
            ? 'bg-amber-500/15 dark:bg-amber-500/20 text-stone-900 dark:text-stone-100 border-amber-500/70 ring-2 ring-amber-500/25 dark:border-amber-400 shadow-md'
            : 'bg-white/60 dark:bg-black/35 text-stone-800 dark:text-stone-200 border-black/8 dark:border-white/10 hover:border-black/15 dark:hover:border-white/15 hover:shadow-md shadow-xs'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h4
            className={`text-[13.5px] font-semibold tracking-tight truncate flex-1 ${
              isActive ? 'text-stone-950 dark:text-white font-bold' : 'text-stone-900 dark:text-stone-100'
            }`}
          >
            {note.title || 'New Note'}
          </h4>
          <div className="flex items-center gap-1 shrink-0">
            {isPinned && (
              <Pin className="w-3 h-3 text-amber-500 fill-amber-500/30 shrink-0" />
            )}
            {/* Quick hover actions */}
            <div className="flex items-center gap-0.5 ml-1 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity">
              {(note.type === 'diary' || note.dateKey || /^\d{4}-\d{2}-\d{2}$/.test(note.title)) && onNavigateToJournal && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const dKey = note.dateKey || (note.title.match(/\d{4}-\d{2}-\d{2}/)?.[0]) || '';
                    if (dKey) onNavigateToJournal(dKey);
                  }}
                  title="Open this day in Journal"
                  className="p-1 rounded-md text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
              )}
              {onTogglePin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(note.id);
                  }}
                  title={isPinned ? 'Unpin note' : 'Pin note'}
                  className="p-1 rounded-md text-stone-400 hover:text-amber-600 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              )}
              {onDeleteNote && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNote(note.id);
                  }}
                  title="Delete note"
                  className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Second row: timestamp + preview snippet */}
        <div className="mt-1.5 flex items-baseline gap-2 text-[12px] leading-snug">
          {dateFormatted && (
            <span
              className={`shrink-0 font-medium ${
                isActive
                  ? 'text-amber-800 dark:text-amber-300 font-semibold'
                  : 'text-stone-400 dark:text-stone-500'
              }`}
            >
              {dateFormatted}
            </span>
          )}
          <span
            className={`truncate ${
              isActive
                ? 'text-stone-800 dark:text-stone-200'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            {snippet}
          </span>
        </div>

        {/* Tags badges if any */}
        {note.tags && note.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-stone-600 dark:text-stone-400 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{ width: width ? `${width}px` : undefined }}
      className={`${width ? '' : 'w-72 sm:w-80'} border-r border-amber-500/20 flex flex-col h-full bg-white/40 dark:bg-black/25 backdrop-blur-md shrink-0 min-h-0 text-xs select-none`}
    >
      {/* Top Header: Notes Count & New Note Action */}
      <div className="p-3.5 pb-2 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Notes
          </h2>
          <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10">
            {filteredNotes.length}
          </span>
        </div>

        {/* Apple Notes style New Note Action */}
        <button
          type="button"
          onClick={() => onNewNote()}
          title="Create New Note (Enter)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Note</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-3.5 py-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/70 dark:bg-black/40 backdrop-blur-md border border-black/8 dark:border-white/10 text-stone-800 dark:text-stone-200 focus-within:ring-2 focus-within:ring-amber-500/40 transition-all shadow-2xs">
          <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="bg-transparent outline-none w-full text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tag Filter Pills (if tags exist) */}
      {allTags.length > 0 && (
        <div className="px-3.5 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 text-[11px]">
          <button
            type="button"
            onClick={() => onSelectTagFilter?.(null)}
            className={`px-2 py-0.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedTagFilter === null
                ? 'bg-amber-500 text-white font-semibold shadow-2xs'
                : 'text-stone-500 hover:bg-stone-200/60 dark:hover:bg-white/10'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() =>
                onSelectTagFilter?.(selectedTagFilter === tag ? null : tag)
              }
              className={`px-2 py-0.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedTagFilter === tag
                  ? 'bg-amber-500 text-white font-semibold shadow-2xs'
                  : 'text-stone-500 hover:bg-stone-200/60 dark:hover:bg-white/10'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable Notes List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 min-h-0">
        {/* Pinned Section */}
        {pinnedNotes.length > 0 && (
          <div className="space-y-2">
            <div className="px-1 pt-1 text-[11px] font-bold tracking-wider uppercase text-stone-400 dark:text-stone-500 flex items-center gap-1.5">
              <Pin className="w-3 h-3 text-amber-500 fill-amber-500/20" />
              <span>Pinned</span>
            </div>
            <div className="space-y-2.5">
              {pinnedNotes.map(renderNoteCard)}
            </div>
          </div>
        )}

        {/* Regular Notes Section */}
        <div className="space-y-2">
          {pinnedNotes.length > 0 && (
            <div className="px-1 pt-2 text-[11px] font-bold tracking-wider uppercase text-stone-400 dark:text-stone-500">
              Notes
            </div>
          )}

          {unpinnedNotes.length === 0 && pinnedNotes.length === 0 ? (
            <div className="px-3 py-8 text-center text-stone-400 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No notes found.</p>
              <button
                type="button"
                onClick={() => onNewNote()}
                className="mt-2 text-amber-600 dark:text-amber-400 font-semibold hover:underline"
              >
                Create a note
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {unpinnedNotes.map(renderNoteCard)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
