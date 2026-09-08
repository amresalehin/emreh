import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { FitDailyMetric } from '../../types';
import { parseFitFiles } from '../../utils/fitImporter';

interface FitImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportMetrics: (metrics: Record<string, FitDailyMetric>) => void;
}

export const FitImportModal: React.FC<FitImportModalProps> = ({
  isOpen,
  onClose,
  onImportMetrics
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessCount(null);
    setProgressText('Processing fitness telemetry...');

    try {
      const parsed = await parseFitFiles(files, (percent, msg) => {
        setProgressText(`${msg} (${percent}%)`);
      });

      const datesCount = Object.keys(parsed).length;
      if (datesCount === 0) {
        setErrorMsg('No Google Fit records found in the uploaded file(s). Please verify you are uploading Google Takeout Fit ZIP, Daily activity metrics CSV, TCX, GPX, or Fit JSON.');
      } else {
        setSuccessCount(datesCount);
        onImportMetrics(parsed);
        setTimeout(() => {
          onClose();
          setSuccessCount(null);
        }, 1200);
      }
    } catch (err: any) {
      console.error('Failed to import Fit metrics:', err);
      setErrorMsg(err?.message || 'An error occurred while parsing fitness data.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Import Google Fit Data
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Daily activity metrics, steps, workouts, heart points & sleep
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

        {/* Body */}
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
              <span>Successfully imported fitness data across {successCount} day(s)!</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".zip,.csv,.json,.tcx,.gpx"
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
                ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                : 'border-gray-200 dark:border-zinc-800 hover:border-emerald-500/50 bg-gray-50/50 dark:bg-zinc-800/30'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              {isLoading ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : (
                <Upload className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                {isLoading ? 'Reading telemetry files...' : 'Select or drop Google Fit files'}
              </div>
              <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                Google Takeout ZIP (<span className="font-mono text-emerald-600 dark:text-emerald-400">Fit.zip</span>), <span className="font-mono">Daily activity metrics.csv</span>, <span className="font-mono">.tcx</span> or <span className="font-mono">.json</span> files
              </div>
            </div>

            {isLoading && (
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse mt-2">
                {progressText}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 text-xs text-gray-700 dark:text-zinc-300 space-y-1.5">
            <div className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>How to get your Google Fit archive:</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">
              In <a href="https://takeout.google.com" target="_blank" rel="noreferrer" className="underline text-emerald-600 dark:text-emerald-400 font-semibold">Google Takeout</a>, select <strong>Fit</strong>. Your export will contain <code className="bg-emerald-100 dark:bg-emerald-900/40 px-1 py-0.5 rounded">Daily activity metrics/Daily activity metrics.csv</code> and your recorded workouts in <code className="bg-emerald-100 dark:bg-emerald-900/40 px-1 py-0.5 rounded">Activities/*.tcx</code>. Drop the entire ZIP or any of those files directly here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
