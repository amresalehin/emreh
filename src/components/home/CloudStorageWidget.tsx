import React from 'react';
import {
  HardDrive,
  Cloud,
  CheckCircle2,
  ArrowUpRight,
  Database,
  RefreshCw,
  FolderArchive,
  Lock
} from 'lucide-react';
import { ViewType } from '../../types';

interface CloudStorageWidgetProps {
  timelineItemCount?: number;
  importedFilesCount?: number;
  onNavigateView?: (view: ViewType) => void;
  onTriggerBackupModal?: () => void;
  onOpenImportedFiles?: () => void;
}

export const CloudStorageWidget: React.FC<CloudStorageWidgetProps> = ({
  timelineItemCount = 0,
  importedFilesCount = 0,
  onNavigateView,
  onTriggerBackupModal,
  onOpenImportedFiles
}) => {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-black/8 dark:border-white/10 shadow-2xs hover:border-blue-500/30 transition-all flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-800 dark:text-blue-300">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-white">
                Cloud & Data Vault
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                Encrypted Client-Side Storage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/15">
              <Lock className="w-2.5 h-2.5" /> Local Private
            </span>
          </div>
        </div>

        {/* Storage Stats Box */}
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 mb-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Timeline Records:</span>
            <span className="font-mono font-bold text-gray-950 dark:text-white">
              {timelineItemCount.toLocaleString()} items
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Imported Archives:</span>
            <span className="font-mono font-bold text-gray-950 dark:text-white">
              {importedFilesCount} files
            </span>
          </div>
        </div>

        {/* Integration Links */}
        <div className="grid grid-cols-2 gap-2">
          {onNavigateView && (
            <>
              <button aria-label="Action"
                onClick={() => onNavigateView('gdrive')}
                className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 hover:border-blue-500/30 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <HardDrive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <ArrowUpRight className="w-3 h-3 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </div>
                <div className="text-xs font-bold text-gray-950 dark:text-white">Google Drive</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">Sync & Files</div>
              </button>

              <button aria-label="Action"
                onClick={() => onNavigateView('box')}
                className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 hover:border-sky-500/30 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <Cloud className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <ArrowUpRight className="w-3 h-3 text-gray-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
                </div>
                <div className="text-xs font-bold text-gray-950 dark:text-white">Box Cloud</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">Cloud Storage</div>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center gap-2">
        {onTriggerBackupModal && (
          <button aria-label="Action"
            onClick={onTriggerBackupModal}
            className="flex-1 py-1.5 px-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-800 dark:text-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <FolderArchive className="w-3 h-3" /> Backup Vault
          </button>
        )}
        {onOpenImportedFiles && (
          <button aria-label="Action"
            onClick={onOpenImportedFiles}
            className="py-1.5 px-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] text-gray-700 dark:text-gray-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Files Log
          </button>
        )}
      </div>
    </div>
  );
};
