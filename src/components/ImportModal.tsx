import React, { useState, useRef } from 'react';
import {
  Upload,
  FileArchive,
  CheckCircle2,
  Loader2,
  X,
  Headphones,
  Youtube,
  MapPin,
  Globe,
  StickyNote,
  BookOpen,
  Info,
  FolderOpen,
  Bookmark,
  HeartPulse,
  Clock
} from 'lucide-react';

export type ImportModalMode = 'all' | 'journal' | 'spotify' | 'youtube' | 'maps' | 'browser' | 'notes' | 'photos' | 'raindrop' | 'bookmarks' | 'fit' | 'screentime';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFiles: (files: File[]) => Promise<void>;
  mode?: ImportModalMode;
  onImportNotes?: (files: File[]) => Promise<void>;
  onMountPhotosFolder?: () => void;
  onOpenRaindropSync?: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportFiles,
  mode = 'all',
  onImportNotes,
  onMountPhotosFolder,
  onOpenRaindropSync
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const modeConfig = (() => {
    switch (mode) {
      case 'spotify':
        return {
          title: 'Spotify Listening History Importer',
          subtitle: 'Upload your Spotify extended streaming history files or Takeout package',
          icon: <Headphones className="w-5 h-5 text-emerald-500" />,
          accentBgSoft: 'bg-emerald-500/10',
          accentText: 'text-emerald-500',
          accentBorder: 'hover:border-emerald-500/50',
          accentDrag: 'border-emerald-500 bg-emerald-500/10',
          accentButton: 'bg-emerald-500 hover:bg-emerald-600',
          accept: '.json,.zip',
          badgeFormats: ['Streaming_History_Audio_*.json', 'endsong_*.json', 'Spotify_Data.zip'],
          instructions: [
            'Go to spotify.com/account/privacy and scroll to "Download your data".',
            'Request "Extended streaming history" or standard account history.',
            'Drop the resulting ZIP archive or individual JSON files directly into the box above.'
          ]
        };
      case 'youtube':
        return {
          title: 'YouTube Watch History Importer',
          subtitle: 'Upload watch-history.json or watch-history.html from Google Takeout',
          icon: <Youtube className="w-5 h-5 text-red-500" />,
          accentBgSoft: 'bg-red-500/10',
          accentText: 'text-red-500',
          accentBorder: 'hover:border-red-500/50',
          accentDrag: 'border-red-500 bg-red-500/10',
          accentButton: 'bg-red-500 hover:bg-red-600',
          accept: '.json,.html,.htm,.zip',
          badgeFormats: ['watch-history.json', 'watch-history.html', 'Takeout.zip'],
          instructions: [
            'Visit takeout.google.com and deselect all services.',
            'Select only "YouTube and YouTube Music", then choose "history" in JSON or HTML format.',
            'Download and upload watch-history.json or the Takeout ZIP here.'
          ]
        };
      case 'maps':
        return {
          title: 'Google Maps & Location Importer',
          subtitle: 'Upload Semantic Location History JSON, Records.json, or GeoJSON',
          icon: <MapPin className="w-5 h-5 text-blue-500" />,
          accentBgSoft: 'bg-blue-500/10',
          accentText: 'text-blue-500',
          accentBorder: 'hover:border-blue-500/50',
          accentDrag: 'border-blue-500 bg-blue-500/10',
          accentButton: 'bg-blue-500 hover:bg-blue-600',
          accept: '.json,.geojson,.zip',
          badgeFormats: ['Semantic Location History (*.json)', 'Records.json', 'Timeline Edits.json', 'GeoJSON'],
          instructions: [
            'Visit takeout.google.com and choose "Location History (Timeline)".',
            'Download the archive containing monthly Semantic Location JSONs or Records.json.',
            'Upload the folder files or the entire Takeout ZIP here.'
          ]
        };
      case 'browser':
        return {
          title: 'Web Browsing Activity Importer',
          subtitle: 'Upload Chrome/Brave/Edge history JSON, CSV, or HTML bookmarks',
          icon: <Globe className="w-5 h-5 text-cyan-500" />,
          accentBgSoft: 'bg-cyan-500/10',
          accentText: 'text-cyan-500',
          accentBorder: 'hover:border-cyan-500/50',
          accentDrag: 'border-cyan-500 bg-cyan-500/10',
          accentButton: 'bg-cyan-500 hover:bg-cyan-600',
          accept: '.json,.html,.htm,.csv,.zip',
          badgeFormats: ['Chrome_History.json', 'bookmarks.html', 'history.csv'],
          instructions: [
            'Export browser history using Google Takeout (Chrome) or a history export browser extension.',
            'Upload the resulting history JSON or HTML export file.',
            'Web pages will be automatically indexed with domain favicons and timestamps.'
          ]
        };
      case 'bookmarks':
        return {
          title: 'Bookmarks & Web Links Importer',
          subtitle: 'Upload HTML bookmark export (Netscape format), JSON, or CSV from any browser or service',
          icon: <Bookmark className="w-5 h-5 text-blue-500" />,
          accentBgSoft: 'bg-blue-500/10',
          accentText: 'text-blue-500',
          accentBorder: 'hover:border-blue-500/50',
          accentDrag: 'border-blue-500 bg-blue-500/10',
          accentButton: 'bg-blue-500 hover:bg-blue-600',
          accept: '.html,.htm,.json,.csv,.zip',
          badgeFormats: ['bookmarks.html', 'favorites.html', 'bookmarks.json', 'export.csv'],
          instructions: [
            'Export bookmarks from any browser (Chrome, Safari, Firefox, Edge, Brave, Arc) as HTML.',
            'Or export CSV/JSON from Raindrop, Pocket, Pinboard, Linkding, or other bookmarking tools.',
            'Drop your file here to instantly import all bookmarks, folders, and tags into your private collection.'
          ]
        };
      case 'raindrop':
        return {
          title: 'Raindrop.io Bookmarks & Sync',
          subtitle: 'Sync bookmarks directly via API (one-time setup) or upload Raindrop backups',
          icon: (
            <svg className="w-5 h-5 fill-[#0089FF]" viewBox="0 0 24 24">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          ),
          accentBgSoft: 'bg-[#0089FF]/10',
          accentText: 'text-[#0089FF]',
          accentBorder: 'hover:border-[#0089FF]/50',
          accentDrag: 'border-[#0089FF] bg-[#0089FF]/10',
          accentButton: 'bg-[#0089FF] hover:bg-[#0070e0]',
          accept: '.csv,.json,.html,.htm',
          badgeFormats: ['raindrop_bookmarks.csv', 'raindrop.html', 'Direct API Sync'],
          instructions: [
            'Connect via Raindrop API Test Token for continuous one-click & auto sync.',
            'Or export bookmarks from Raindrop.io (Settings > Backups > Export CSV or HTML).',
            'Collections, tags, notes, excerpts, and covers are automatically indexed.'
          ]
        };
      case 'notes':
        return {
          title: 'Diary & Personal Notes Importer',
          subtitle: 'Upload Markdown files (.md), text files (.txt), or JSON diary exports',
          icon: <StickyNote className="w-5 h-5 text-amber-500" />,
          accentBgSoft: 'bg-amber-500/10',
          accentText: 'text-amber-500',
          accentBorder: 'hover:border-amber-500/50',
          accentDrag: 'border-amber-500 bg-amber-500/10',
          accentButton: 'bg-amber-500 hover:bg-amber-600',
          accept: '.md,.txt,.json',
          badgeFormats: ['diary.md', 'notes.txt', 'daily_logs.json'],
          instructions: [
            'Ensure files contain date headers (e.g. "# 2025-05-15" or formatted ISO dates).',
            'Upload your personal journal files to integrate them into your diary archive.',
            'Entries are saved and editable directly in the Notes view.'
          ]
        };
      case 'fit':
        return {
          title: 'Google Fit Takeout Importer',
          subtitle: 'Import the Google Fit folder directly or the ZIP Google provided — no repackaging required',
          icon: <HeartPulse className="w-5 h-5 text-orange-500" />,
          accentBgSoft: 'bg-orange-500/10',
          accentText: 'text-orange-500',
          accentBorder: 'hover:border-orange-500/50',
          accentDrag: 'border-orange-500 bg-orange-500/10',
          accentButton: 'bg-orange-500 hover:bg-orange-600',
          accept: '.zip,.json,.csv,.tcx',
          badgeFormats: ['Fit folder', 'Fit.zip', 'All Data/*.json', 'All Sessions/*.json', '*.tcx', '*.csv'],
          instructions: [
            'Go to Google Takeout and export Google Fit.',
            'You can drop the Fit folder directly, select the Fit folder from your device, or upload the ZIP exactly as Google provided it.',
            'Emreh discovers Fit/All Data, Fit/All Sessions, Fit/Activities and Fit/Daily activity metrics automatically.'
          ]
        };
      case 'screentime':
        return {
          title: 'Screentime Importer',
          subtitle: 'Import StayFree, ActionDash, RescueTime CSVs, or device screen time JSON logs',
          icon: <Clock className="w-5 h-5 text-indigo-500" />,
          accentBgSoft: 'bg-indigo-500/10',
          accentText: 'text-indigo-500',
          accentBorder: 'hover:border-indigo-500/50',
          accentDrag: 'border-indigo-500 bg-indigo-500/10',
          accentButton: 'bg-indigo-500 hover:bg-indigo-600',
          accept: '.csv,.json',
          badgeFormats: ['StayFree (*.csv)', 'ActionDash (*.csv)', 'RescueTime (*.csv)', 'screentime.json'],
          instructions: [
            'Export your screen time from StayFree, ActionDash, RescueTime, or your device tracker.',
            'You can upload the CSV or JSON file directly.',
            'Emreh parses application usage, screen duration, and category distribution automatically.'
          ]
        };
      case 'photos':
        return {
          title: 'Google Photos & Takeout Importer',
          subtitle: 'Mount Takeout photo folders, photos with sidecar JSON metadata, or image archives',
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 2a5 5 0 0 0-5 5v5h5a5 5 0 0 0 0-10z" />
              <path fill="#FBBC05" d="M22 12a5 5 0 0 0-5-5h-5v5a5 5 0 0 0 10 0z" />
              <path fill="#34A853" d="M12 22a5 5 0 0 0 5-5v-5h-5a5 5 0 0 0 0 10z" />
              <path fill="#4285F4" d="M2 12a5 5 0 0 0 5 5h5v-5a5 5 0 0 0-10 0z" />
            </svg>
          ),
          accentBgSoft: 'bg-rose-500/10',
          accentText: 'text-rose-500',
          accentBorder: 'hover:border-rose-500/50',
          accentDrag: 'border-rose-500 bg-rose-500/10',
          accentButton: 'bg-rose-500 hover:bg-rose-600',
          accept: 'image/*,.json,.zip',
          badgeFormats: ['IMG_*.jpg', '*.json (Takeout Metadata)', 'Google_Photos.zip', 'PNG, WEBP, HEIC'],
          instructions: [
            'Visit takeout.google.com and export Google Photos (by year, album, or entire library).',
            'Drop the Google Photos folder, image files, or sidecar JSON files into this window.',
            'Direct mounting keeps original image quality and pairs camera EXIF & GPS metadata.'
          ]
        };
      case 'journal':
      default:
        return {
          title: 'Journal & Composite Data Importer',
          subtitle: 'Import Google Takeout, Photos, Spotify, YouTube, Maps, Browser, or Diary files in one batch',
          icon: <BookOpen className="w-5 h-5 text-emerald-500" />,
          accentBgSoft: 'bg-emerald-500/10',
          accentText: 'text-emerald-500',
          accentBorder: 'hover:border-emerald-500/50',
          accentDrag: 'border-emerald-500 bg-emerald-500/10',
          accentButton: 'bg-emerald-500 hover:bg-emerald-600',
          accept: '.json,.geojson,.html,.htm,.zip,.md,.txt,image/*',
          badgeFormats: ['Spotify (.json)', 'YouTube (.json/.html)', 'Maps (.json/.geojson)', 'Photos (.jpg/.json)', 'Browser (.json)'],
          instructions: [
            'Drop any Google Takeout ZIP archive or individual streaming JSON/HTML files.',
            'The parser will automatically detect data types and index them chronologically.',
            'Everything is parsed and stored privately in your browser without uploading to external servers.'
          ]
        };
    }
  })();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const readDroppedDirectories = async (items: DataTransferItemList): Promise<File[]> => {
    type Entry = FileSystemEntry & { isFile: boolean; isDirectory: boolean };
    type FileEntry = Entry & { file: (successCb: (file: File) => void, errorCb?: (err: any) => void) => void };
    type DirectoryReader = { readEntries: (successCb: (entries: Entry[]) => void, errorCb?: (err: any) => void) => void };
    type DirectoryEntry = Entry & { createReader: () => DirectoryReader };

    const files: File[] = [];
    const queue: Array<{ entry: Entry; prefix: string }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry?.() as Entry | null;
      if (entry) {
        queue.push({ entry, prefix: '' });
      } else {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    // Iterative FIFO queue traversal to eliminate recursion stack overflow
    while (queue.length > 0) {
      const current = queue.shift()!;
      const { entry, prefix } = current;

      if (entry.isFile) {
        try {
          const fileEntry = entry as FileEntry;
          const file = await new Promise<File>((resolve, reject) => {
            fileEntry.file(resolve, reject);
          });
          try {
            Object.defineProperty(file, 'webkitRelativePath', {
              value: `${prefix}${file.name}`,
              configurable: true
            });
          } catch {}
          files.push(file);
        } catch (err) {
          console.warn(`Failed reading file entry ${prefix}${entry.name}:`, err);
        }
      } else if (entry.isDirectory) {
        try {
          const reader = (entry as DirectoryEntry).createReader();
          const nextPrefix = `${prefix}${entry.name}/`;

          while (true) {
            const batch = await new Promise<Entry[]>((resolve, reject) => {
              reader.readEntries(resolve, reject);
            });
            if (!batch || batch.length === 0) break;
            for (let b = 0; b < batch.length; b++) {
              queue.push({ entry: batch[b], prefix: nextPrefix });
            }
          }
        } catch (err) {
          console.warn(`Failed reading directory ${prefix}${entry.name}:`, err);
        }
      }
    }

    return files;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped: File[] = mode === 'fit' && e.dataTransfer.items?.length
      ? await readDroppedDirectories(e.dataTransfer.items)
      : Array.from(e.dataTransfer.files || []);
    if (dropped.length > 0) await processFiles(dropped);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = async (files: File[]) => {
    setIsLoading(true);
    setProgress(20);
    setStatusMessage(`Reading ${files.length} file(s)...`);
    try {
      setProgress(50);
      if (mode === 'notes' && onImportNotes) {
        await onImportNotes(files);
      } else {
        await onImportFiles(files);
      }
      setProgress(100);
      setStatusMessage('Import complete!');
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
        onClose();
      }, 700);
    } catch (err) {
      console.error(err);
      setStatusMessage('Error reading files');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={!isLoading ? onClose : undefined} />
      <div className="bg-white dark:bg-[#151515] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto relative z-10 flex flex-col border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-10 h-10 rounded-2xl ${modeConfig.accentBgSoft} flex items-center justify-center shrink-0`}>
              {modeConfig.icon}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                {modeConfig.title}
              </h3>
              <p className="text-xs text-gray-400 truncate">
                {modeConfig.subtitle}
              </p>
            </div>
          </div>
          {!isLoading && (
            <button aria-label="Action"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
            isDragging
              ? modeConfig.accentDrag + ' scale-[1.01]'
              : `border-gray-200 dark:border-gray-800 ${modeConfig.accentBorder} bg-gray-50/50 dark:bg-[#121212]`
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={modeConfig.accept}
            onChange={handleFileInput}
            className="hidden"
          />
          {mode === 'fit' && (
            <input
              ref={folderInputRef}
              type="file"
              multiple
              // @ts-ignore
              webkitdirectory=""
              directory=""
              onChange={handleFileInput}
              className="hidden"
            />
          )}
          {isLoading ? (
            <div className="space-y-3 py-4 flex flex-col items-center">
              <Loader2 className={`w-10 h-10 ${modeConfig.accentText} animate-spin`} />
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">{statusMessage}</div>
              <div className="w-48 bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-200 bg-current ${modeConfig.accentText}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className={`w-12 h-12 rounded-2xl ${modeConfig.accentBgSoft} flex items-center justify-center shadow-inner`}>
                <FileArchive className={`w-6 h-6 ${modeConfig.accentText}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  Drop {mode === 'all' || mode === 'journal' ? 'history' : mode} files here
                </p>
                <p className="text-xs text-gray-400 mt-0.5">or click to browse from your device</p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                {modeConfig.badgeFormats.map(fmt => (
                  <span
                    key={fmt}
                    className={`px-2 py-0.5 rounded-md ${modeConfig.accentBgSoft} ${modeConfig.accentText} text-[10px] font-bold font-mono`}
                  >
                    {fmt}
                  </span>
                ))}
              </div>
              {mode === 'fit' && (
                <button aria-label="Action"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-orange-300/70 dark:border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 text-orange-600 dark:text-orange-300 text-[11px] font-bold transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Select Fit Folder</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Raindrop Sync Banner */}
        {onOpenRaindropSync && (mode === 'all' || mode === 'browser' || mode === 'raindrop') && (
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#0089FF] text-white flex items-center justify-center shrink-0 shadow-xs">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  Raindrop.io Bookmarks & Sync
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  One-time token setup for continuous sync or direct backup imports
                </div>
              </div>
            </div>
            <button aria-label="Action"
              type="button"
              onClick={() => {
                onClose();
                onOpenRaindropSync();
              }}
              className="px-3 py-1.5 bg-[#0089FF] hover:bg-[#0070e0] active:scale-[0.98] text-white rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs"
            >
              Open Sync Setup
            </button>
          </div>
        )}

        {/* Step by step Instructions */}
        <div className="bg-gray-50 dark:bg-[#121212] p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 space-y-1.5">
          <div className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            <span>How to export & import:</span>
          </div>
          <div className="space-y-1 pl-1">
            {modeConfig.instructions.map((step, idx) => (
              <div key={idx} className="flex items-start gap-1.5 leading-relaxed">
                <span className="font-bold text-gray-400 shrink-0">{idx + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
