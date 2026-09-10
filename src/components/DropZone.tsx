import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileArchive,
  Sparkles,
  Gamepad2,
  Music,
  FileText,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight,
  Code2
} from 'lucide-react';
import { SampleApp } from '../types';
import { SAMPLE_APPS } from '../data/sampleApps';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  onSelectSample: (sample: SampleApp) => void;
  isLoading: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelect,
  onSelectSample,
  isLoading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.zip') || file.type.includes('zip'))) {
      onFileSelect(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = '';
    }
  };

  const getSampleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Gamepad2': return <Gamepad2 className="w-5 h-5 text-cyan-400" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'Music': return <Music className="w-5 h-5 text-emerald-400" />;
      case 'FileText': return <FileText className="w-5 h-5 text-sky-400" />;
      default: return <Code2 className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-5xl mx-auto w-full overflow-y-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Main Drag & Drop Box */}
      <div
        id="dropzone-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full rounded-2xl border-2 border-dashed p-8 md:p-12 text-center transition-all duration-200 cursor-pointer relative overflow-hidden group ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01] shadow-2xl shadow-cyan-500/10'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900/80 shadow-xl'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="flex flex-col items-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5 text-cyan-400 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/10">
            <UploadCloud className="w-8 h-8 animate-bounce" />
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight mb-2">
            Upload & Run Any Web App
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Drag & drop a <span className="text-cyan-400 font-semibold">.zip</span> archive here, or click to browse.
            Everything unpacks in client-side memory with zero server lag.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <span className="px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/60 text-slate-300 text-xs font-mono">
              HTML5 Games
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/60 text-slate-300 text-xs font-mono">
              Vite / React dist
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/60 text-slate-300 text-xs font-mono">
              Static Websites
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/60 text-slate-300 text-xs font-mono">
              Canvas / WebAudio
            </span>
          </div>

          <button
            id="btn-browse-zip"
            disabled={isLoading}
            className="px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all active:scale-95 flex items-center gap-2"
          >
            <FileArchive className="w-4 h-4" />
            <span>Select ZIP File</span>
          </button>
        </div>
      </div>

      {/* Instant 1-Click Starter Apps */}
      <div className="w-full mt-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Or Try a Curated Sample App
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">1-Click Launch</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SAMPLE_APPS.map((sample) => (
            <div
              key={sample.id}
              id={`card-sample-${sample.id}`}
              onClick={() => onSelectSample(sample)}
              className="group p-4 rounded-xl bg-slate-900/70 hover:bg-slate-850 border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-0.5"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-slate-800 border border-slate-700/60 group-hover:border-cyan-500/40 transition-colors">
                    {getSampleIcon(sample.icon)}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                    {sample.tag}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-400 transition-colors mb-1">
                  {sample.title}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {sample.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 group-hover:text-cyan-400 transition-colors">
                <span className="font-mono text-[11px] text-slate-500">{sample.fileCount} virtual files</span>
                <div className="flex items-center gap-1 font-semibold text-[11px]">
                  <span>Launch</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Highlights Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-10 pt-8 border-t border-slate-800/80">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">100% In-Browser & Private</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Files are processed entirely within browser memory. No code or assets leave your device.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mt-0.5">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Virtual Asset Interceptor</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Relative CSS, JS, images, audio, and fetch/XHR endpoints resolve smoothly via virtual Blob URLs.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 mt-0.5">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Live Code Editing & Console</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Inspect file tree, tweak HTML/JS/CSS live in the code editor, and debug console logs in real time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
