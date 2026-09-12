import React, { useRef, useState } from 'react';
import {
  FolderArchive,
  UploadCloud,
  Download,
  Play,
  RotateCw,
  Info,
  ChevronDown,
  Sparkles,
  Gamepad2,
  Music,
  FileText,
  Boxes
} from 'lucide-react';
import { ZipProject, SampleApp } from '../types';
import { SAMPLE_APPS } from '../data/sampleApps';
import { formatFileSize } from '../utils/mime';

interface NavbarProps {
  project: ZipProject | null;
  onUploadZip: (file: File) => void;
  onSelectSample: (sample: SampleApp) => void;
  onExportZip: () => void;
  onOpenStats: () => void;
  onReloadApp: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  project,
  onUploadZip,
  onSelectSample,
  onExportZip,
  onOpenStats,
  onReloadApp,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [samplesOpen, setSamplesOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadZip(file);
      e.target.value = '';
    }
  };

  const getSampleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Gamepad2': return <Gamepad2 className="w-4 h-4 text-cyan-400" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4 text-amber-400" />;
      case 'Music': return <Music className="w-4 h-4 text-emerald-400" />;
      case 'FileText': return <FileText className="w-4 h-4 text-sky-400" />;
      default: return <Boxes className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <header className="h-14 bg-slate-900/95 border-b border-slate-800/80 px-4 flex items-center justify-between backdrop-blur-md z-30 select-none">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Brand & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
          <FolderArchive className="w-5 h-5 text-cyan-400 animate-pulse" />
          <span className="font-bold text-sm tracking-wide">ZipApp<span className="text-slate-300 font-semibold">Runner</span></span>
        </div>

        {project && (
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800 text-xs">
            <span className="font-medium text-slate-300 max-w-[200px] truncate" title={project.name}>
              {project.name}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[11px] font-mono">
              {project.fileCount} files ({formatFileSize(project.totalSize)})
            </span>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* Sample Apps Dropdown */}
        <div className="relative">
          <button
            id="btn-sample-apps-dropdown"
            onClick={() => setSamplesOpen(!samplesOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-medium text-slate-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Sample Apps</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${samplesOpen ? 'rotate-180' : ''}`} />
          </button>

          {samplesOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSamplesOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Pre-bundled Web Projects
                </div>
                {SAMPLE_APPS.map((sample) => (
                  <button
                    key={sample.id}
                    id={`sample-${sample.id}`}
                    onClick={() => {
                      onSelectSample(sample);
                      setSamplesOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-800/80 flex items-start gap-3 transition-colors group"
                  >
                    <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-slate-700 border border-slate-700/50 mt-0.5">
                      {getSampleIcon(sample.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                          {sample.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {sample.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {sample.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Upload ZIP Button */}
        <button
          id="btn-upload-zip-navbar"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload ZIP</span>
        </button>

        {project && (
          <>
            {/* Reload Button */}
            <button
              id="btn-reload-navbar"
              onClick={onReloadApp}
              title="Reload in-memory app"
              className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Export ZIP Button */}
            <button
              id="btn-export-zip-navbar"
              onClick={onExportZip}
              title="Export project files as ZIP"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export ZIP</span>
            </button>

            {/* Project Info Button */}
            <button
              id="btn-project-stats"
              onClick={onOpenStats}
              title="Project metadata and breakdown"
              className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </header>
  );
};
