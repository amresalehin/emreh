import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Download,
  Upload,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  ListTree,
  Trash2
} from 'lucide-react';
import { DateRange, TimelineItem } from '../../types';
import { ViewToolbar } from '../ViewToolbar';
import {
  NoteObject,
  ObjectType
} from '../../types/notes';
import {
  loadStoredNotes,
  persistStoredNotes,
  textToBlocks,
  blocksToPlainText
} from '../../utils/notesStorage';
import { NoteDocumentEditor } from './notes/NoteDocumentEditor';
import { NotesSidebar } from './notes/NotesSidebar';
import { PaneResizer } from './notes/PaneResizer';
import { DocumentOutlinePanel, DocViewSettings } from './notes/DocumentOutlinePanel';

interface NotesViewProps {
  currentDate: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onOpenCalendar?: () => void;
  onImportClick?: () => void;
  dateRange?: DateRange | null;
  onClearDateRange?: () => void;
  onOpenDateRangePicker?: () => void;
  dailyNotesMap: Record<string, string>;
  onSaveDailyNote: (dateKey: string, text: string) => void;
  onJumpToDate: (date: Date) => void;
  bookmarkNotes: Record<string, string>;
  timelineData?: TimelineItem[];
  pendingTargetNote?: { noteIdOrTitle?: string; dateKey?: string } | null;
  onNavigateToJournal?: (dateKeyOrDate: string | Date) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onOpenCalendar,
  onImportClick,
  dateRange,
  onClearDateRange,
  onOpenDateRangePicker,
  dailyNotesMap,
  onSaveDailyNote,
  onJumpToDate,
  timelineData = [],
  pendingTargetNote,
  onNavigateToJournal
}) => {
  const [notes, setNotes] = useState<NoteObject[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-switch note when navigation from Journal or external link occurs
  useEffect(() => {
    if (!pendingTargetNote) return;

    if (pendingTargetNote.dateKey) {
      const dKey = pendingTargetNote.dateKey;
      const diaryId = `diary-${dKey}`;
      const existing = notes.find((n) => n.id === diaryId || n.dateKey === dKey);
      if (existing) {
        setActiveNoteId(existing.id);
      } else {
        const text = dailyNotesMap[dKey] || '';
        const created: NoteObject = {
          id: diaryId,
          title: `Journal • ${dKey}`,
          type: 'diary',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'To Do',
          priority: 'Medium',
          dateKey: dKey,
          tags: ['daily', 'journal'],
          blocks: textToBlocks(text)
        };
        setNotes((prev) => {
          const next = [created, ...prev];
          persistStoredNotes(next);
          return next;
        });
        setActiveNoteId(diaryId);
      }
      return;
    }

    if (pendingTargetNote.noteIdOrTitle) {
      handleOpenNote(pendingTargetNote.noteIdOrTitle);
    }
  }, [pendingTargetNote, notes, dailyNotesMap]);

  // Drag to Resize State for Left Sidebar and Right Outline/Inspector Panel
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('notes_sidebar_width');
      return saved ? parseInt(saved, 10) : 310;
    } catch {
      return 310;
    }
  });
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('notes_right_panel_width');
      return saved ? parseInt(saved, 10) : 300;
    } catch {
      return 300;
    }
  });
  const [isDraggingRightPanel, setIsDraggingRightPanel] = useState(false);

  // Document View Settings (Font, Page Width, Zoom)
  const [viewSettings, setViewSettings] = useState<DocViewSettings>({
    fontFamily: 'sans',
    pageWidth: 'normal',
    zoom: 100
  });

  const getDateKey = useCallback((d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const currentKey = getDateKey(currentDate);

  // Mouse drag handler for resizing panes
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSidebar) {
        // Prevent unwanted text selection during resize drag
        e.preventDefault();
        const newWidth = Math.min(550, Math.max(200, e.clientX));
        setSidebarWidth(newWidth);
        localStorage.setItem('notes_sidebar_width', newWidth.toString());
      } else if (isDraggingRightPanel) {
        e.preventDefault();
        const newWidth = Math.min(500, Math.max(220, window.innerWidth - e.clientX));
        setRightPanelWidth(newWidth);
        localStorage.setItem('notes_right_panel_width', newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      if (isDraggingSidebar) setIsDraggingSidebar(false);
      if (isDraggingRightPanel) setIsDraggingRightPanel(false);
    };

    if (isDraggingSidebar || isDraggingRightPanel) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDraggingSidebar, isDraggingRightPanel]);

  // Load notes from storage and merge with dailyNotesMap
  useEffect(() => {
    async function initNotes() {
      const stored = await loadStoredNotes();
      const notesMap = new Map<string, NoteObject>();
      stored.forEach((n) => notesMap.set(n.id, n));

      // Synchronize existing dailyNotesMap into NoteObjects
      Object.entries(dailyNotesMap).forEach(([dateKey, rawText]) => {
        const text = String(rawText || '');
        if (!text.trim()) return;
        const diaryId = `diary-${dateKey}`;
        if (!notesMap.has(diaryId)) {
          notesMap.set(diaryId, {
            id: diaryId,
            title: `Journal • ${dateKey}`,
            type: 'diary',
            icon: '☀️',
            dateKey,
            createdAt: `${dateKey}T00:00:00.000Z`,
            updatedAt: new Date().toISOString(),
            status: 'Done',
            priority: 'Medium',
            tags: ['daily'],
            blocks: textToBlocks(text)
          });
        }
      });

      const initialList = Array.from(notesMap.values());
      setNotes(initialList);
      if (initialList.length > 0 && !notesMap.has(activeNoteId)) {
        setActiveNoteId(initialList[0].id);
      }
    }
    initNotes();
  }, []);

  // Update notes helper
  const handleUpdateNote = (updatedNote: NoteObject) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === updatedNote.id ? updatedNote : n));
      persistStoredNotes(next);
      return next;
    });

    // If it is a diary note, sync with dailyNotesMap
    if (updatedNote.type === 'diary' && updatedNote.dateKey) {
      const plainText = blocksToPlainText(updatedNote.blocks);
      onSaveDailyNote(updatedNote.dateKey, plainText);
    }
  };

  // Safe delete confirmation modal state (immune to iframe window.confirm() blocking)
  const [notePendingDelete, setNotePendingDelete] = useState<NoteObject | null>(null);

  const confirmDeleteNote = (noteId: string) => {
    const target = notes.find((n) => n.id === noteId);
    if (target) {
      setNotePendingDelete(target);
    } else {
      executeDeleteNote(noteId);
    }
  };

  const executeDeleteNote = (noteId: string) => {
    setNotes((prev) => {
      const target = prev.find((n) => n.id === noteId);
      if (target?.type === 'diary' && target.dateKey) {
        onSaveDailyNote(target.dateKey, '');
      }
      const next = prev.filter((n) => n.id !== noteId);
      persistStoredNotes(next);
      if (activeNoteId === noteId) {
        setActiveNoteId(next[0]?.id || '');
      }
      return next;
    });
  };

  const handleCreateNewNote = (type: ObjectType = 'note') => {
    const newId = `note-${Date.now()}`;
    const newNote: NoteObject = {
      id: newId,
      title: type === 'diary' ? `Journal • ${currentKey}` : 'Untitled Note',
      type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'To Do',
      priority: 'Medium',
      dateKey: type === 'diary' ? currentKey : undefined,
      tags: type === 'diary' ? ['daily'] : [],
      blocks: [
        {
          id: `blk-${Date.now()}-1`,
          type: 'paragraph',
          content: ''
        }
      ]
    };

    setNotes((prev) => {
      const next = [newNote, ...prev];
      persistStoredNotes(next);
      return next;
    });
    setActiveNoteId(newId);
  };

  // Open / jump to note handler (handles link clicks [[Title]], [[YYYY-MM-DD]], [[journal:YYYY-MM-DD]], or note IDs)
  const handleOpenNote = (targetIdOrNew: string) => {
    if (!targetIdOrNew) return;

    if (targetIdOrNew.startsWith('new-')) {
      const newTitle = targetIdOrNew.replace('new-', '').trim();
      const newId = `note-${Date.now()}`;
      const created: NoteObject = {
        id: newId,
        title: newTitle,
        type: 'concept',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'To Do',
        priority: 'Medium',
        tags: [],
        blocks: [
          {
            id: `blk-${Date.now()}-1`,
            type: 'paragraph',
            content: `Connected note for [[${newTitle}]].`
          }
        ]
      };
      setNotes((prev) => {
        const next = [created, ...prev];
        persistStoredNotes(next);
        return next;
      });
      setActiveNoteId(newId);
      return;
    }

    const clean = targetIdOrNew.trim();

    // Check if target is a journal link or dateKey (e.g. 2026-08-12, journal:2026-08-12, Journal • 2026-08-12)
    let dateKey = '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      dateKey = clean;
    } else if (clean.toLowerCase().startsWith('journal:')) {
      dateKey = clean.slice(8).trim();
    } else if (clean.toLowerCase().startsWith('journal •')) {
      dateKey = clean.slice(9).trim();
    }

    if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      const diaryId = `diary-${dateKey}`;
      const existing = notes.find((n) => n.id === diaryId || n.dateKey === dateKey);
      if (existing) {
        setActiveNoteId(existing.id);
        return;
      }
      // Create diary note for date
      const text = dailyNotesMap[dateKey] || '';
      const created: NoteObject = {
        id: diaryId,
        title: `Journal • ${dateKey}`,
        type: 'diary',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'To Do',
        priority: 'Medium',
        dateKey,
        tags: ['daily', 'journal'],
        blocks: textToBlocks(text)
      };
      setNotes((prev) => {
        const next = [created, ...prev];
        persistStoredNotes(next);
        return next;
      });
      setActiveNoteId(diaryId);
      return;
    }

    // Match by ID
    const byId = notes.find((n) => n.id === clean);
    if (byId) {
      setActiveNoteId(byId.id);
      return;
    }

    // Match by Title (case-insensitive)
    const byTitle = notes.find((n) => n.title.toLowerCase() === clean.toLowerCase());
    if (byTitle) {
      setActiveNoteId(byTitle.id);
      return;
    }

    // If note does not exist yet, auto-create it with this title
    const newId = `note-${Date.now()}`;
    const created: NoteObject = {
      id: newId,
      title: clean,
      type: 'concept',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'To Do',
      priority: 'Medium',
      tags: [],
      blocks: [
        {
          id: `blk-${Date.now()}-1`,
          type: 'paragraph',
          content: `Connected note for [[${clean}]].`
        }
      ]
    };
    setNotes((prev) => {
      const next = [created, ...prev];
      persistStoredNotes(next);
      return next;
    });
    setActiveNoteId(newId);
  };

  // Jump to block from outline panel
  const handleJumpToBlock = (blockId: string) => {
    const targetEl = document.getElementById(`doc-block-${blockId}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.classList.add('ring-2', 'ring-amber-500/80', 'rounded-xl', 'transition-all');
      setTimeout(() => {
        targetEl.classList.remove('ring-2', 'ring-amber-500/80', 'rounded-xl', 'transition-all');
      }, 1800);
    }
  };

  // Active note object
  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === activeNoteId) || notes[0];
  }, [notes, activeNoteId]);

  // JSON Export / Backup
  const handleExportWorkspaceJson = () => {
    const jsonStr = JSON.stringify(notes, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_vault_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSON Import
  const handleImportWorkspaceJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          setNotes((prev) => {
            const next = [...data, ...prev];
            persistStoredNotes(next);
            return next;
          });
        }
      } catch {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden min-h-0">
      {/* Top Universal ViewToolbar */}
      <ViewToolbar
        badge={
          <span className="font-sans text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </span>
        }
        currentDate={currentDate}
        onPrevDate={onPrevDate}
        onNextDate={onNextDate}
        onSetToday={onSetToday}
        onOpenCalendar={onOpenCalendar}
        dateRange={dateRange}
        onClearDateRange={onClearDateRange}
        onOpenDateRangePicker={onOpenDateRangePicker}
        onImportClick={onImportClick}
        importLabel="Import"
        leftActions={
          <div className="flex items-center gap-1.5">
            <button aria-label="Action"
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? 'Hide Notes Sidebar' : 'Show Notes Sidebar'}
              className="p-1.5 rounded-lg bg-stone-200/60 dark:bg-white/10 hover:bg-stone-300/60 dark:hover:bg-white/15 text-stone-700 dark:text-stone-300 cursor-pointer transition-colors"
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          </div>
        }
        rightActions={
          <div className="flex items-center gap-1.5">
            {/* Quick New Note Button */}
            <button aria-label="Action"
              type="button"
              onClick={() => handleCreateNewNote()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-semibold cursor-pointer shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Note</span>
            </button>

            {/* Toggle Outline & Stats Panel */}
            <button aria-label="Action"
              type="button"
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              title={isRightPanelOpen ? 'Hide Document Outline' : 'Show Document Outline & Tools'}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isRightPanelOpen
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <ListTree className="w-4 h-4" />
            </button>

            {/* Export JSON backup */}
            <button
              type="button"
              onClick={handleExportWorkspaceJson}
              title="Export all notes (JSON backup)"
              className="p-1.5 rounded-xl hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Import JSON input */}
            <label
              title="Import notes JSON backup"
              className="p-1.5 rounded-xl hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept=".json"
                onChange={handleImportWorkspaceJson}
                className="hidden"
              />
            </label>
          </div>
        }
      />

      {/* Main Workspace Stage with Resizable Panes */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative select-none">
        {/* Left Notes List Sidebar */}
        {isSidebarOpen && (
          <>
            <NotesSidebar
              width={sidebarWidth}
              notes={notes}
              activeNoteId={activeNoteId}
              onSelectNote={setActiveNoteId}
              onNewNote={handleCreateNewNote}
              onDeleteNote={confirmDeleteNote}
              onNavigateToJournal={onNavigateToJournal}
              onTogglePin={(id) => {
                const target = notes.find((n) => n.id === id);
                if (target) {
                  handleUpdateNote({
                    ...target,
                    isPinned: !target.isPinned,
                    favorite: !target.isPinned,
                    updatedAt: new Date().toISOString()
                  });
                }
              }}
            />

            {/* Draggable Resizer Separator between Sidebar & Editor */}
            <PaneResizer
              side="left"
              title="Drag to resize notes sidebar"
              isDragging={isDraggingSidebar}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingSidebar(true);
              }}
            />
          </>
        )}

        {/* Center Google Docs Document Canvas */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden select-text">
          {activeNote ? (
            <NoteDocumentEditor
              key={activeNote.id}
              note={activeNote}
              allNotes={notes}
              timelineData={timelineData}
              currentDate={currentDate}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={confirmDeleteNote}
              onOpenNote={handleOpenNote}
              onJumpToDate={onJumpToDate}
              onNavigateToJournal={onNavigateToJournal}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              isRightPanelOpen={isRightPanelOpen}
              onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
              viewSettings={viewSettings}
              onChangeViewSettings={setViewSettings}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400">
              <FileText className="w-12 h-12 mb-3 opacity-30 text-stone-400" />
              <p className="text-sm font-medium mb-4 text-stone-500 dark:text-stone-400">
                No note selected
              </p>
              <button aria-label="Action"
                type="button"
                onClick={() => handleCreateNewNote()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Create New Note
              </button>
            </div>
          )}
        </div>

        {/* Right Google Docs Outline & Settings Panel */}
        {isRightPanelOpen && activeNote && (
          <>
            {/* Draggable Resizer Separator between Editor & Right Panel */}
            <PaneResizer
              side="right"
              title="Drag to resize document outline panel"
              isDragging={isDraggingRightPanel}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingRightPanel(true);
              }}
            />

            <DocumentOutlinePanel
              width={rightPanelWidth}
              blocks={activeNote.blocks}
              viewSettings={viewSettings}
              onChangeViewSettings={setViewSettings}
              onJumpToBlock={handleJumpToBlock}
              onClose={() => setIsRightPanelOpen(false)}
            />
          </>
        )}
      </div>

      {/* Safe In-App Delete Note Confirmation Modal (Immune to iframe window.confirm() blocking) */}
      {notePendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setNotePendingDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1c1c1e] p-5 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Delete Note?</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-stone-800 dark:text-stone-200 truncate inline-block max-w-full align-bottom">"{notePendingDelete.title || 'Untitled Note'}"</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button aria-label="Action"
                type="button"
                onClick={() => setNotePendingDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button aria-label="Action"
                type="button"
                onClick={() => {
                  executeDeleteNote(notePendingDelete.id);
                  setNotePendingDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
