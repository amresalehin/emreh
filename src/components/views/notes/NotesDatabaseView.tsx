import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Star,
  Trash2,
  ExternalLink,
  Tag,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { NoteObject, ObjectPriority, ObjectStatus, ObjectType } from '../../../types/notes';

interface NotesDatabaseViewProps {
  notes: NoteObject[];
  onSelectNote: (noteId: string) => void;
  onUpdateNote: (updatedNote: NoteObject) => void;
  onDeleteNote: (noteId: string) => void;
  onNewNote: (type?: ObjectType) => void;
}

const STATUS_LIST: ObjectStatus[] = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done', 'Archived'];
const PRIORITY_LIST: ObjectPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

export const NotesDatabaseView: React.FC<NotesDatabaseViewProps> = ({
  notes,
  onSelectNote,
  onUpdateNote,
  onDeleteNote,
  onNewNote
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'title' | 'priority' | 'status'>('updatedAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Filter & Sort
  const filteredNotes = useMemo(() => {
    const q = search.toLowerCase().trim();
    return notes
      .filter((n) => {
        if (typeFilter !== 'all' && n.type !== typeFilter) return false;
        if (statusFilter !== 'all' && n.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;
        if (q) {
          const matchTitle = n.title.toLowerCase().includes(q);
          const matchTags = n.tags.some((t) => t.toLowerCase().includes(q));
          const matchBlocks = n.blocks.some((b) => b.content && b.content.toLowerCase().includes(q));
          return matchTitle || matchTags || matchBlocks;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'updatedAt') {
          cmp = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        } else if (sortBy === 'title') {
          cmp = a.title.localeCompare(b.title);
        } else if (sortBy === 'priority') {
          const order = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
          cmp = (order[b.priority || 'Low'] || 0) - (order[a.priority || 'Low'] || 0);
        } else if (sortBy === 'status') {
          cmp = (a.status || '').localeCompare(b.status || '');
        }
        return sortAsc ? -cmp : cmp;
      });
  }, [notes, search, typeFilter, statusFilter, priorityFilter, sortBy, sortAsc]);

  const getStatusBadge = (status: ObjectStatus = 'To Do') => {
    switch (status) {
      case 'Done':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'In Progress':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'In Review':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'Backlog':
      case 'Archived':
        return 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30';
      default:
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
  };

  const getPriorityBadge = (priority: ObjectPriority = 'Medium') => {
    switch (priority) {
      case 'Urgent':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'High':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'Low':
        return 'bg-gray-500/15 text-gray-500 border-gray-500/20';
      case 'Medium':
      default:
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
    }
  };

  const cycleStatus = (note: NoteObject, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = STATUS_LIST.indexOf(note.status || 'To Do');
    const nextStatus = STATUS_LIST[(currentIdx + 1) % STATUS_LIST.length];
    onUpdateNote({ ...note, status: nextStatus, updatedAt: new Date().toISOString() });
  };

  const cyclePriority = (note: NoteObject, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = PRIORITY_LIST.indexOf(note.priority || 'Medium');
    const nextPriority = PRIORITY_LIST[(currentIdx + 1) % PRIORITY_LIST.length];
    onUpdateNote({ ...note, priority: nextPriority, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden min-h-0">
      {/* Database Filter Bar */}
      <div className="p-3 border-b border-gray-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/40 dark:bg-black/20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#18181b] border border-gray-200/80 dark:border-white/10 text-xs w-full max-w-xs shadow-2xs">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search database properties..."
              className="bg-transparent outline-none w-full text-xs text-gray-900 dark:text-white placeholder:text-gray-400"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#18181b] border border-gray-200/80 dark:border-white/10 text-xs text-gray-700 dark:text-gray-300 outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All Types</option>
            <option value="concept">Concepts</option>
            <option value="project">Projects</option>
            <option value="diary">Diaries</option>
            <option value="task">Tasks</option>
            <option value="meeting">Meetings</option>
            <option value="resource">Resources</option>
            <option value="note">Notes</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#18181b] border border-gray-200/80 dark:border-white/10 text-xs text-gray-700 dark:text-gray-300 outline-none cursor-pointer shadow-2xs hidden sm:block"
          >
            <option value="all">All Statuses</option>
            {STATUS_LIST.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Switcher */}
          <button
            type="button"
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#18181b] border border-gray-200/80 dark:border-white/10 text-xs text-gray-700 dark:text-gray-300 cursor-pointer shadow-2xs hover:bg-gray-50"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sort {sortAsc ? 'Asc' : 'Desc'}</span>
          </button>

          {/* Add New Object Button */}
          <button
            type="button"
            onClick={() => onNewNote()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Object</span>
          </button>
        </div>
      </div>

      {/* Database Table Canvas */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-gray-200/80 dark:border-white/10 text-gray-400 uppercase text-[10px] tracking-wider font-semibold sticky top-0 backdrop-blur-md z-10">
              <th className="p-3 pl-4">Title & Object</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status (Click to toggle)</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Tags</th>
              <th className="p-3 hidden md:table-cell">Blocks</th>
              <th className="p-3 hidden lg:table-cell">Updated</th>
              <th className="p-3 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {filteredNotes.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-gray-400 text-xs">
                  No objects match your filters. Click "New Object" to create one.
                </td>
              </tr>
            ) : (
              filteredNotes.map((note) => (
                <tr
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  className="hover:bg-blue-500/[0.03] dark:hover:bg-white/[0.03] cursor-pointer transition-colors group"
                >
                  {/* Title & Icon */}
                  <td className="p-3 pl-4">
                    <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                      <span className="text-base shrink-0">{note.icon || '📄'}</span>
                      <span className="truncate max-w-xs group-hover:text-blue-500 transition-colors">
                        {note.title}
                      </span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="p-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                      {note.type}
                    </span>
                  </td>

                  {/* Status (Interactive pill) */}
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={(e) => cycleStatus(note, e)}
                      title="Click to cycle status"
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border cursor-pointer transition-all hover:scale-105 active:scale-95 ${getStatusBadge(
                        note.status
                      )}`}
                    >
                      {note.status || 'To Do'}
                    </button>
                  </td>

                  {/* Priority (Interactive pill) */}
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={(e) => cyclePriority(note, e)}
                      title="Click to cycle priority"
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border cursor-pointer transition-all hover:scale-105 active:scale-95 ${getPriorityBadge(
                        note.priority
                      )}`}
                    >
                      {note.priority || 'Medium'}
                    </button>
                  </td>

                  {/* Tags */}
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {note.tags.length > 0 ? (
                        note.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5 px-1.5 py-0.2 rounded"
                          >
                            #{t}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-[10px] italic">No tags</span>
                      )}
                    </div>
                  </td>

                  {/* Blocks count */}
                  <td className="p-3 text-gray-400 font-mono text-[11px] hidden md:table-cell">
                    {note.blocks.length} blocks
                  </td>

                  {/* Updated time */}
                  <td className="p-3 text-gray-400 text-[11px] hidden lg:table-cell">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="p-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNote(note.id);
                        }}
                        title="Open Document"
                        className="p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(note.id);
                        }}
                        title="Delete note"
                        className="p-1 rounded text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
