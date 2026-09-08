import React from 'react';
import {
  X,
  FolderArchive,
  FileCode,
  HardDrive,
  CheckCircle,
  FileText,
  Clock,
  Layers
} from 'lucide-react';
import { ZipProject } from '../types';
import { formatFileSize } from '../utils/mime';

interface ProjectStatsModalProps {
  project: ZipProject;
  onClose: () => void;
}

export const ProjectStatsModal: React.FC<ProjectStatsModalProps> = ({ project, onClose }) => {
  let htmlCount = 0;
  let cssCount = 0;
  let jsCount = 0;
  let imgCount = 0;
  let audioCount = 0;
  let otherCount = 0;

  for (const [, file] of project.files.entries()) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'html' || ext === 'htm') htmlCount++;
    else if (ext === 'css') cssCount++;
    else if (['js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx'].includes(ext)) jsCount++;
    else if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'ico'].includes(ext)) imgCount++;
    else if (['mp3', 'wav', 'ogg'].includes(ext)) audioCount++;
    else otherCount++;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400">
            <FolderArchive className="w-5 h-5" />
            <h3 className="font-bold text-slate-100 text-sm">ZIP Project Metadata</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Project Name</span>
            <div className="text-base font-bold text-slate-100 mt-0.5">{project.name}</div>
          </div>

          {/* Grid Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Total Size
              </span>
              <div className="text-sm font-bold text-slate-200 mt-1 font-mono">
                {formatFileSize(project.totalSize)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-purple-400" /> Total Files
              </span>
              <div className="text-sm font-bold text-slate-200 mt-1 font-mono">
                {project.fileCount}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Ingested
              </span>
              <div className="text-xs font-medium text-slate-200 mt-1 truncate">
                {project.loadedAt.toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Entry Point */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 font-semibold">Current Main Entry Point</span>
              <div className="text-xs font-mono font-bold text-cyan-400 mt-0.5">{project.entryPoint}</div>
            </div>
            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          {/* File Composition */}
          <div>
            <span className="text-xs text-slate-400 font-semibold mb-2 block">Asset Composition</span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800 flex justify-between">
                <span className="text-orange-400 font-mono">HTML</span>
                <span className="font-bold text-slate-300">{htmlCount}</span>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800 flex justify-between">
                <span className="text-blue-400 font-mono">CSS</span>
                <span className="font-bold text-slate-300">{cssCount}</span>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800 flex justify-between">
                <span className="text-yellow-400 font-mono">JS/TS</span>
                <span className="font-bold text-slate-300">{jsCount}</span>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800 flex justify-between">
                <span className="text-purple-400 font-mono">Images</span>
                <span className="font-bold text-slate-300">{imgCount}</span>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800 flex justify-between">
                <span className="text-pink-400 font-mono">Audio</span>
                <span className="font-bold text-slate-300">{audioCount}</span>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800 flex justify-between">
                <span className="text-slate-400 font-mono">Other</span>
                <span className="font-bold text-slate-300">{otherCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
