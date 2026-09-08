import React, { useState } from 'react';
import { Plus, MoreHorizontal, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { NoteObject, ObjectPriority, ObjectStatus, ObjectType } from '../../../types/notes';

interface NotesKanbanViewProps {
  notes: NoteObject[];
  onSelectNote: (noteId: string) => void;
  onUpdateNote: (updatedNote: NoteObject) => void;
  onNewNote: (type?: ObjectType, initialStatus?: ObjectStatus) => void;
}

const COLUMNS: { status: ObjectStatus; label: string; color: string }[] = [
  { status: 'Backlog', label: 'Backlog', color: 'border-gray-400' },
  { status: 'To Do', label: 'To Do', color: 'border-amber-400' },
  { status: 'In Progress', label: 'In Progress', color: 'border-blue-400' },
  { status: 'In Review', label: 'In Review', color: 'border-purple-400' },
  { status: 'Done', label: 'Done', color: 'border-emerald-400' }
];

export const NotesKanbanView: React.FC<NotesKanbanViewProps> = ({
  notes,
  onSelectNote,
  onUpdateNote,
  onNewNote
}) => {
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedNoteId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: ObjectStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedNoteId;
    if (!id) return;

    const note = notes.find((n) => n.id === id);
    if (note && note.status !== targetStatus) {
      onUpdateNote({ ...note, status: targetStatus, updatedAt: new Date().toISOString() });
    }
    setDraggedNoteId(null);
  };

  const getPriorityBadge = (priority: ObjectPriority = 'Medium') => {
    switch (priority) {
      case 'Urgent':
        return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'High':
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Low':
        return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
      case 'Medium':
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="flex-1 flex overflow-x-auto p-4 gap-4 bg-transparent min-h-0">
      {COLUMNS.map((col) => {
        const colNotes = notes.filter((n) => (n.status || 'To Do') === col.status);

        return (
          <div
            key={col.status}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.status)}
            className="w-72 sm:w-80 shrink-0 flex flex-col bg-white/40 dark:bg-black/20 backdrop-blur-xl rounded-2xl border border-gray-200/80 dark:border-white/10 p-3 shadow-sm min-h-0"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5 mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full border-2 ${col.color}`} />
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                  {col.label}
                </h4>
                <span className="text-[10px] font-mono text-gray-400 bg-black/5 dark:bg-white/5 px-1.5 py-0.2 rounded-full">
                  {colNotes.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNewNote(undefined, col.status)}
                title="Add task in this column"
                className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Column Card List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 min-h-0 pr-1">
              {colNotes.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                  Drop cards here
                </div>
              ) : (
                colNotes.map((note) => (
                  <div
                    key={note.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, note.id)}
                    onClick={() => onSelectNote(note.id)}
                    className="p-3 bg-white dark:bg-[#18181b] rounded-xl border border-gray-200/80 dark:border-white/10 shadow-2xs hover:shadow-md hover:border-blue-500/40 transition-all cursor-grab active:cursor-grabbing group space-y-2 select-none"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm shrink-0">{note.icon || '📄'}</span>
                        <h5 className="font-semibold text-xs text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                          {note.title}
                        </h5>
                      </div>
                      {note.priority && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${getPriorityBadge(
                            note.priority
                          )}`}
                        >
                          {note.priority}
                        </span>
                      )}
                    </div>

                    {/* First content preview line */}
                    {note.blocks[0] && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {note.blocks[0].content}
                      </p>
                    )}

                    {/* Card Footer: Tags & Status Quick-Advance */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-50 dark:border-white/5 text-[10px]">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {note.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="bg-black/5 dark:bg-white/5 text-gray-500 px-1 py-0.2 rounded"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                      <span className="text-gray-400 font-mono">
                        {note.blocks.length} blocks
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Add at Bottom */}
            <button
              type="button"
              onClick={() => onNewNote(undefined, col.status)}
              className="mt-2 w-full py-1.5 flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Note</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
