import React, { useState } from 'react';
import {
  HardDrive,
  Cloud,
  FolderArchive,
  UploadCloud,
  Download,
  FileCheck,
  Sparkles,
  Database
} from 'lucide-react';
import { GoogleDriveView } from './GoogleDriveView';
import { BoxCloudView } from './BoxCloudView';
import { TimelineItem, ImportedFileRecord, ViewType } from '../../types';

export type DrivesSubTab = 'gdrive' | 'box' | 'local';

interface DrivesLensViewProps {
  initialTab?: DrivesSubTab;
  onImportTimelineItems: (newItems: any[], sourceName: string) => void;
  onNavigateToView: (view: ViewType) => void;
  importedFiles: ImportedFileRecord[];
  onTriggerBackupModal?: () => void;
  onOpenImportedFiles?: () => void;
  timelineItemCount?: number;
}

export const DrivesLensView: React.FC<DrivesLensViewProps> = ({
  initialTab = 'gdrive',
  onImportTimelineItems,
  onNavigateToView,
  importedFiles = [],
  onTriggerBackupModal,
  onOpenImportedFiles,
  timelineItemCount = 0
}) => {
  const [activeTab, setActiveTab] = useState<DrivesSubTab>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const tabs: { id: DrivesSubTab; label: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'gdrive',
      label: 'Google Drive',
      icon: <HardDrive className="w-3.5 h-3.5" />,
      color: 'text-sky-500'
    },
    {
      id: 'box',
      label: 'Box Cloud',
      icon: <Cloud className="w-3.5 h-3.5" />,
      color: 'text-blue-500'
    },
    {
      id: 'local',
      label: 'Local Vault & Backups',
      icon: <Database className="w-3.5 h-3.5" />,
      color: 'text-amber-500'
    }
  ];

  return (
    <div className="h-full w-full flex flex-col min-h-0 bg-[#fdfcf9] dark:bg-[#0e0d0c] overflow-hidden">
      {/* Editorial Drives Header Selector */}
      <div className="shrink-0 px-4 sm:px-6 py-2.5 border-b border-black/[0.05] dark:border-white/[0.06] bg-white/70 dark:bg-[#121110]/70 backdrop-blur-md flex items-center justify-between gap-3 overflow-x-auto no-scrollbar z-20">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-100 dark:bg-stone-900/70 border border-stone-200/60 dark:border-stone-800/80 shrink-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-sans transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-white/40 dark:hover:bg-stone-800/40'
                }`}
              >
                <span className={isActive ? tab.color : 'text-stone-400'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500 font-serif italic">
          <span>Encrypted Cloud & Local Storage Vault</span>
        </div>
      </div>

      {/* Main Drives Content */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {activeTab === 'gdrive' && (
          <GoogleDriveView onNavigateToView={onNavigateToView} />
        )}

        {activeTab === 'box' && (
          <BoxCloudView
            onImportTimelineItems={onImportTimelineItems}
            onNavigateToView={onNavigateToView}
          />
        )}

        {activeTab === 'local' && (
          <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <span className="text-xs uppercase tracking-widest font-sans font-medium text-[#d4a373]">
                  Personal Data Vault
                </span>
                <h1 className="text-2xl sm:text-3xl font-serif font-medium text-stone-900 dark:text-stone-100 tracking-tight mt-1">
                  Local Storage & Data Portability
                </h1>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-serif italic mt-1">
                  Everything in Emreh stays 100% under your control. Export full JSON snapshots or inspect mounted files anytime.
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#161513] border border-stone-200/60 dark:border-stone-800/80 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-sans text-stone-500 dark:text-stone-400">Total Life Records</span>
                    <Sparkles className="w-4 h-4 text-[#d4a373]" />
                  </div>
                  <p className="text-2xl font-sans font-bold text-stone-900 dark:text-stone-100">
                    {timelineItemCount.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-stone-400 font-sans">Stored safely in local indexed IndexedDB storage</p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#161513] border border-stone-200/60 dark:border-stone-800/80 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-sans text-stone-500 dark:text-stone-400">Imported Data Sources</span>
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-sans font-bold text-stone-900 dark:text-stone-100">
                    {importedFiles.length} files
                  </p>
                  <p className="text-[11px] text-stone-400 font-sans">Google Takeout, Fit, Spotify, Bookmarks</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                {onTriggerBackupModal && (
                  <button
                    onClick={onTriggerBackupModal}
                    className="px-4 py-2.5 rounded-xl bg-[#d4a373] hover:bg-[#e0a96d] text-stone-950 font-sans text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Full Backup (.json)</span>
                  </button>
                )}

                {onOpenImportedFiles && (
                  <button
                    onClick={onOpenImportedFiles}
                    className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-sans text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <FolderArchive className="w-4 h-4" />
                    <span>View Imported Files History</span>
                  </button>
                )}
              </div>

              {/* Recent Imports List */}
              {importedFiles.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h3 className="text-sm font-sans font-semibold text-stone-800 dark:text-stone-200">
                    Imported Archive History
                  </h3>
                  <div className="divide-y divide-stone-200/50 dark:divide-stone-800/50 rounded-2xl bg-white dark:bg-[#161513] border border-stone-200/60 dark:border-stone-800/80 overflow-hidden">
                    {importedFiles.map((f) => (
                      <div key={f.id} className="p-3.5 flex items-center justify-between gap-3 text-xs font-sans">
                        <div>
                          <p className="font-semibold text-stone-800 dark:text-stone-200">{f.fileName}</p>
                          <p className="text-stone-400 text-[11px]">{f.fileType} • {f.fileSize}</p>
                        </div>
                        <span className="text-stone-400 text-[11px]">{f.importDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
