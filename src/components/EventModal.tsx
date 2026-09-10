import React, { useState } from 'react';
import { CalendarPlus, X } from 'lucide-react';
import { CalendarEvent } from '../types';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  dateKey?: string;
  onSaveEvent: (event: CalendarEvent) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  dateKey: propDateKey,
  onSaveEvent
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [start, setStart] = useState('12:00');
  const [end, setEnd] = useState('13:00');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const dateKey = propDateKey || (selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const newEvent: CalendarEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      date: dateKey,
      category,
      start,
      end,
      description: description.trim(),
      source: 'Manual Entry'
    };
    onSaveEvent(newEvent);
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="bg-white dark:bg-[#141414] rounded-3xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto relative z-10 flex flex-col border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-emerald-500" />
            Add Event ({dateKey})
          </h3>
          <button onClick={onClose} className="w-7 h-7 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category / Tag</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-gray-200 outline-none"
            >
              <option value="General">General / Note</option>
              <option value="Concert">Concert / Music</option>
              <option value="Travel">Travel / Place</option>
              <option value="Workout">Workout / Activity</option>
              <option value="Study">Study / Work</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Event Title</label>
            <input
              type="text"
              placeholder="e.g. Attended Coldplay concert, Gym session, Product Demo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Start Time</label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">End Time</label>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Location / Details</label>
            <textarea
              placeholder="Location address, notes, memories..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-20 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer"
            >
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
