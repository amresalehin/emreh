import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  Code2,
  FileCode,
  Image as ImageIcon,
  Music,
  Check,
  AlertCircle
} from 'lucide-react';
import { VirtualFile } from '../types';
import { formatFileSize } from '../utils/mime';

interface CodeEditorProps {
  file: VirtualFile | null;
  onSaveContent: (path: string, newContent: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  file,
  onSaveContent,
}) => {
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (file && file.content !== undefined) {
      setContent(file.content);
      setIsDirty(false);
    }
  }, [file?.path, file?.content]);

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950 text-slate-500">
        <Code2 className="w-10 h-10 mb-3 opacity-30 text-cyan-400" />
        <p className="text-sm font-medium">Select a file from the explorer to view or edit code</p>
        <p className="text-xs text-slate-600 mt-1">Live changes apply instantly to the sandbox</p>
      </div>
    );
  }

  const handleSave = () => {
    if (!file) return;
    onSaveContent(file.path, content);
    setIsDirty(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleRevert = () => {
    if (file && file.content !== undefined) {
      setContent(file.content);
      setIsDirty(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Save shortcut: Ctrl+S or Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
      return;
    }

    // Tab key support in textarea
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      setIsDirty(true);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // If it's a binary image file
  if (file.mimeType.startsWith('image/') && file.blobUrl) {
    return (
      <div className="flex-1 flex flex-col bg-slate-950">
        <div className="h-10 border-b border-slate-800 px-4 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-purple-400" />
            <span className="font-mono text-slate-200">{file.path}</span>
          </div>
          <span className="font-mono">{formatFileSize(file.size)}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col items-center">
            <img
              src={file.blobUrl}
              alt={file.name}
              className="max-w-md max-h-96 object-contain rounded"
            />
            <span className="text-xs text-slate-400 mt-3 font-mono">{file.mimeType}</span>
          </div>
        </div>
      </div>
    );
  }

  // If it's an audio file
  if (file.mimeType.startsWith('audio/') && file.blobUrl) {
    return (
      <div className="flex-1 flex flex-col bg-slate-950">
        <div className="h-10 border-b border-slate-800 px-4 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-pink-400" />
            <span className="font-mono text-slate-200">{file.path}</span>
          </div>
          <span className="font-mono">{formatFileSize(file.size)}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full">
            <Music className="w-12 h-12 text-pink-400 animate-pulse" />
            <span className="text-sm font-semibold text-slate-200">{file.name}</span>
            <audio controls src={file.blobUrl} className="w-full mt-2" />
          </div>
        </div>
      </div>
    );
  }

  const lineNumbers = content.split('\n').map((_, i) => i + 1);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
      {/* Editor Top Bar */}
      <div className="h-10 border-b border-slate-800 px-4 flex items-center justify-between text-xs bg-slate-900/60">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-mono font-medium text-slate-200 truncate">{file.path}</span>
          {isDirty && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-semibold">
              Unsaved
            </span>
          )}
          {savedSuccess && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" /> Reloaded
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={handleRevert}
              title="Revert changes"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Revert</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!isDirty}
            title="Save & Hot Reload Sandbox (Ctrl+S)"
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
              isDirty
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Apply & Reload</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Line numbers gutter */}
        <div className="w-12 bg-slate-900/90 py-3 text-right pr-3 select-none text-[12px] font-mono text-slate-600 border-r border-slate-800/80 overflow-hidden">
          {lineNumbers.map((num) => (
            <div key={num} className="leading-6">{num}</div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setIsDirty(true);
          }}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="flex-1 bg-transparent text-slate-100 font-mono text-[13px] leading-6 p-3 outline-none resize-none overflow-auto whitespace-pre selection:bg-cyan-500/30 selection:text-white"
        />
      </div>

      {/* Footer info */}
      <div className="h-6 bg-slate-900/90 border-t border-slate-800/80 px-3 flex items-center justify-between text-[11px] text-slate-500 font-mono select-none">
        <div className="flex items-center gap-4">
          <span>{lineNumbers.length} lines</span>
          <span>{content.length} characters</span>
          <span>{file.mimeType}</span>
        </div>
        <span>UTF-8</span>
      </div>
    </div>
  );
};
