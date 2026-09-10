import React, { useMemo } from 'react';
import { Link2, ArrowUpRight, Plus, Hash, FileText } from 'lucide-react';
import { NoteObject } from '../../../types/notes';
import { extractNoteLinks } from '../../../utils/notesStorage';

interface BacklinksInspectorProps {
  currentNote: NoteObject;
  allNotes: NoteObject[];
  onOpenNote: (noteId: string) => void;
  onLinkMention?: (targetNoteId: string, mentionText: string) => void;
}

export const BacklinksInspector: React.FC<BacklinksInspectorProps> = ({
  currentNote,
  allNotes,
  onOpenNote,
  onLinkMention
}) => {
  // Linked references: Notes containing `[[currentNote.title]]`
  const linkedReferences = useMemo(() => {
    const targetTitle = currentNote.title.trim().toLowerCase();
    if (!targetTitle) return [];

    return allNotes.filter((n) => {
      if (n.id === currentNote.id) return false;
      const links = extractNoteLinks(n.blocks);
      return links.some((l) => l.trim().toLowerCase() === targetTitle);
    });
  }, [currentNote, allNotes]);

  // Unlinked references: Notes that mention `currentNote.title` in their text but not as `[[Title]]`
  const unlinkedReferences = useMemo(() => {
    const targetTitle = currentNote.title.trim();
    if (!targetTitle || targetTitle.length < 3) return [];
    const targetLower = targetTitle.toLowerCase();

    return allNotes
      .filter((n) => {
        if (n.id === currentNote.id) return false;
        // Check if already linked
        const links = extractNoteLinks(n.blocks);
        if (links.some((l) => l.trim().toLowerCase() === targetLower)) return false;

        // Check text content
        return n.blocks.some(
          (b) => b.content && b.content.toLowerCase().includes(targetLower)
        );
      })
      .map((n) => {
        // Find snippet
        const matchingBlock = n.blocks.find(
          (b) => b.content && b.content.toLowerCase().includes(targetLower)
        );
        return {
          note: n,
          snippet: matchingBlock?.content || ''
        };
      });
  }, [currentNote, allNotes]);

  // Outgoing links from this note
  const outgoingLinks = useMemo(() => {
    const links = extractNoteLinks(currentNote.blocks);
    return links
      .map((title) => {
        const found = allNotes.find(
          (n) => n.title.trim().toLowerCase() === title.trim().toLowerCase()
        );
        return { title, foundNote: found };
      })
      .filter((item, index, self) => self.findIndex((i) => i.title === item.title) === index);
  }, [currentNote, allNotes]);

  const totalBacklinks = linkedReferences.length + unlinkedReferences.length;

  return (
    <div className="border-t border-gray-200/80 dark:border-white/10 mt-12 pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            Backlinks & Connections ({totalBacklinks})
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Linked References */}
        <div className="p-3.5 rounded-2xl bg-stone-100/60 dark:bg-stone-900/40 border border-stone-200/70 dark:border-stone-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
            <span>Linked References ({linkedReferences.length})</span>
            <span className="text-[10px] text-stone-400">Explicit [[Links]]</span>
          </div>

          {linkedReferences.length === 0 ? (
            <div className="text-xs text-stone-400 py-3 text-center">
              No notes explicitly link to this page yet.
            </div>
          ) : (
            <div className="space-y-2">
              {linkedReferences.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onOpenNote(note.id)}
                  className="p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-stone-200/70 dark:border-stone-800 hover:border-amber-500/40 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-900 dark:text-stone-100">
                    <span className="truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {note.title}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-500 transition-colors shrink-0" />
                  </div>
                  {note.blocks[0] && (
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-1">
                      {note.blocks[0].content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unlinked References */}
        <div className="p-3.5 rounded-2xl bg-stone-100/60 dark:bg-stone-900/40 border border-stone-200/70 dark:border-stone-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
            <span>Unlinked Mentions ({unlinkedReferences.length})</span>
            <span className="text-[10px] text-stone-400">Mentioned in text</span>
          </div>

          {unlinkedReferences.length === 0 ? (
            <div className="text-xs text-stone-400 py-3 text-center">
              No unlinked mentions found in other notes.
            </div>
          ) : (
            <div className="space-y-2">
              {unlinkedReferences.map(({ note, snippet }) => (
                <div
                  key={note.id}
                  className="p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-stone-200/70 dark:border-stone-800 space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => onOpenNote(note.id)}
                      className="text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer truncate"
                    >
                      {note.title}
                    </button>
                    {onLinkMention && (
                      <button
                        type="button"
                        onClick={() => onLinkMention(note.id, currentNote.title)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-semibold hover:bg-amber-500/20 cursor-pointer"
                        title="Wrap in [[Link]]"
                      >
                        <Plus className="w-3 h-3" /> Link
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 italic">
                    "{snippet}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Outgoing Links */}
      {outgoingLinks.length > 0 && (
        <div className="p-3 rounded-xl bg-stone-100/60 dark:bg-stone-900/40 border border-stone-200/60 dark:border-stone-800/80">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
            Outgoing Links ({outgoingLinks.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {outgoingLinks.map(({ title, foundNote }) => (
              <button
                key={title}
                type="button"
                onClick={() => {
                  if (foundNote) onOpenNote(foundNote.id);
                }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  foundNote
                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25'
                    : 'bg-stone-200/60 dark:bg-white/5 text-stone-500 dark:text-stone-400 border border-dashed border-stone-300 dark:border-stone-700'
                }`}
              >
                <span>[[{title}]]</span>
                {!foundNote && <span className="text-[9px] opacity-70">(Create)</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
