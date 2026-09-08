import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Archive,
  Loader2,
  Sparkles,
  ClipboardPaste,
  FileCode
} from 'lucide-react';
import { KeepNote } from '../../types';
import { NoteObject } from '../../types/notes';
import { parseKeepFiles, parseKeepJsonObject, keepNoteToNoteObject } from '../../utils/keepImporter';

interface KeepImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportNotes?: (notes: KeepNote[]) => void;
  onImportAsNoteObjects?: (notes: NoteObject[]) => void;
}

export const KeepImportModal: React.FC<KeepImportModalProps> = ({
  isOpen,
  onClose,
  onImportNotes,
  onImportAsNoteObjects
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // Paste text state
  const [pasteContent, setPasteContent] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessCount(null);
    setProgressText('Analyzing files...');

    try {
      const parsedNotes = await parseKeepFiles(files, (percent, msg) => {
        setProgressText(`${msg} (${percent}%)`);
      });

      if (parsedNotes.length === 0) {
        setErrorMsg('No valid Google Keep notes found in the selected file(s). Ensure you are uploading Keep JSON, HTML, TXT, or Takeout ZIP files.');
      } else {
        setSuccessCount(parsedNotes.length);
        if (onImportAsNoteObjects) {
          const converted = parsedNotes.map(keepNoteToNoteObject);
          onImportAsNoteObjects(converted);
        }
        if (onImportNotes) {
          onImportNotes(parsedNotes);
        }
        setTimeout(() => {
          onClose();
          setSuccessCount(null);
        }, 1200);
      }
    } catch (err: any) {
      console.error('Failed to import Keep notes:', err);
      setErrorMsg(err?.message || 'An error occurred while parsing the notes.');
    } finally {
      setIsLoading(false);
      setProgressText('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handlePasteImport = () => {
    const text = pasteContent.trim();
    if (!text) return;

    try {
      // Check if user pasted JSON
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          const parsed = JSON.parse(text);
          const notes: KeepNote[] = [];
          if (Array.isArray(parsed)) {
            parsed.forEach(item => {
              const n = parseKeepJsonObject(item);
              if (n) notes.push(n);
            });
          } else {
            const n = parseKeepJsonObject(parsed);
            if (n) notes.push(n);
          }
          if (notes.length > 0) {
            onImportNotes(notes);
            setSuccessCount(notes.length);
            setTimeout(() => {
              onClose();
              setSuccessCount(null);
              setPasteContent('');
            }, 1000);
            return;
          }
        } catch {
          // Fall back to plain text
        }
      }

      // Plain text import
      const isList = text.includes('\n- ') || text.includes('\n* ') || text.includes('\n1. ');
      const checklistItems = isList
        ? text
            .split('\n')
            .filter(l => l.trim().length > 0)
            .map((line, idx) => ({
              id: `paste_item_${idx}`,
              text: line.replace(/^[\-\*\d\.\s\[\]]+/, '').trim(),
              completed: line.includes('[x]') || line.includes('☑')
            }))
        : [];

      const newNote: KeepNote = {
        id: `keep_${Date.now()}`,
        title: pasteTitle.trim() || 'Pasted Note',
        content: isList ? '' : text,
        color: 'default',
        labels: ['Imported'],
        isPinned: false,
        isArchived: false,
        isTrashed: false,
        isChecklist: checklistItems.length > 0,
        checklistItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (onImportAsNoteObjects) {
        onImportAsNoteObjects([keepNoteToNoteObject(newNote)]);
      }
      if (onImportNotes) {
        onImportNotes([newNote]);
      }
      setSuccessCount(1);
      setTimeout(() => {
        onClose();
        setSuccessCount(null);
        setPasteContent('');
        setPasteTitle('');
      }, 1000);
    } catch (err: any) {
      setErrorMsg('Failed to process pasted content.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-sm">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Import Google Keep Notes
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Import your Takeout archives, JSON files, or formatted notes
              </p>
            </div>
          </div>
          <button aria-label="Action"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-4 pb-2 flex gap-2 border-b border-gray-100 dark:border-zinc-800/80 bg-gray-50/50 dark:bg-zinc-900/40">
          <button aria-label="Action"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'upload'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 hover:bg-gray-200/60 dark:hover:bg-zinc-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Files & Archives (.zip, .json, .html)</span>
          </button>
          <button aria-label="Action"
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'paste'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 hover:bg-gray-200/60 dark:hover:bg-zinc-800'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Paste Text or JSON</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Successfully imported {successCount} note(s)!</span>
            </div>
          )}

          {activeTab === 'upload' ? (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".zip,.json,.html,.htm,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !isLoading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
                    : 'border-gray-200 dark:border-zinc-800 hover:border-amber-500/50 bg-gray-50/50 dark:bg-zinc-800/30'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                  {isLoading ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <Upload className="w-7 h-7" />
                  )}
                </div>

                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {isLoading ? 'Processing Keep files...' : 'Click to select or drop files here'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                    Google Takeout ZIP (<span className="font-mono text-amber-600 dark:text-amber-400">Keep.zip</span>), individual <span className="font-mono">.json</span>, <span className="font-mono">.html</span>, or <span className="font-mono">.txt</span> files
                  </div>
                </div>

                {isLoading && (
                  <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 animate-pulse mt-2">
                    {progressText}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 text-xs text-gray-700 dark:text-zinc-300 space-y-1.5">
                <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>How to export from Google Keep:</span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">
                  Go to <a href="https://takeout.google.com" target="_blank" rel="noreferrer" className="underline text-amber-600 dark:text-amber-400 font-semibold">Google Takeout</a>, select <strong>Google Keep</strong>, download the archive, and drop the resulting <code className="bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">.zip</code> or extracted files directly here. All colors, checklists, pins, and labels are preserved.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Note Title (Optional)
                </label>
                <input
                  type="text"
                  value={pasteTitle}
                  onChange={e => setPasteTitle(e.target.value)}
                  placeholder="e.g. My Important Checklist"
                  className="w-full px-3.5 py-2 text-xs bg-gray-100 dark:bg-zinc-800 border border-transparent focus:border-amber-500 rounded-xl text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                  Content (Plain text, Markdown list, or raw Keep JSON)
                </label>
                <textarea
                  rows={8}
                  value={pasteContent}
                  onChange={e => setPasteContent(e.target.value)}
                  placeholder="Paste your note content, bulleted list, or JSON note export here..."
                  className="w-full p-3.5 text-xs font-mono bg-gray-100 dark:bg-zinc-800 border border-transparent focus:border-amber-500 rounded-xl text-gray-900 dark:text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button aria-label="Action"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button aria-label="Action"
                  onClick={handlePasteImport}
                  disabled={!pasteContent.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white shadow-md shadow-amber-500/20 transition"
                >
                  Import Pasted Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
