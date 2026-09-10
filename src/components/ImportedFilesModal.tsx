import React from 'react';
import { FolderArchive, X, Trash2 } from 'lucide-react';
import { ImportedFileRecord } from '../types';

interface ImportedFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  importedFiles?: ImportedFileRecord[];
  files?: ImportedFileRecord[];
  onDeleteFile?: (id: string) => void;
  onClearAllData?: () => void;
  onClearHistory?: () => void;
}

export const ImportedFilesModal: React.FC<ImportedFilesModalProps> = ({
  isOpen,
  onClose,
  importedFiles,
  files: propFiles,
  onDeleteFile,
  onClearAllData,
  onClearHistory
}) => {
  if (!isOpen) return null;

  const fileList = importedFiles || propFiles || [];
  const handleClear = onClearAllData || onClearHistory || (() => {});

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="bg-white dark:bg-[#141414] rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] relative z-10 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-emerald-500" />
            Imported Files History
          </h3>
          <button onClick={onClose} className="w-7 h-7 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {fileList.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">No files imported yet.</div>
          ) : (
            <>
              <div className="space-y-2">
                {fileList.map((file, idx) => {
                  const breakdown: string[] = [];
                  if (file.spotifyCount) breakdown.push(`${file.spotifyCount} Spotify`);
                  if (file.ytCount) breakdown.push(`${file.ytCount} YouTube`);
                  if (file.mapsCount) breakdown.push(`${file.mapsCount} Maps`);
                  if (file.browserCount) breakdown.push(`${file.browserCount} Browser`);
                  const breakdownStr = breakdown.length > 0 ? ` • ${breakdown.join(', ')}` : '';
                  const itemKey = file.id || `${file.name || file.filename || file.fileName || 'file'}_${file.importDate || ''}_${idx}`;

                  return (
                    <div key={itemKey} className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{file.name || file.filename || file.fileName || 'Imported File'}</h4>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {file.size || file.fileSize || 'Unknown size'} • {file.importDate ? new Date(file.importDate).toLocaleString() : 'Imported'}
                            {breakdownStr}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                            {(file.count || file.recordCount || 0).toLocaleString()} items
                          </span>
                          {onDeleteFile && (
                            <button
                              onClick={() => onDeleteFile(file.id || itemKey)}
                              className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                              title="Remove File Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleClear}
                className="w-full mt-3 py-2 bg-red-500/10 text-red-500 rounded-xl text-xs font-semibold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset & Clear Timeline Data</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
