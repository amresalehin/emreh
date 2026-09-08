import React from 'react';
import {
  X,
  ListTree,
  BarChart2,
  Settings,
  Link2,
  Heading1,
  Heading2,
  Heading3,
  Clock,
  FileText,
  Type,
  Maximize,
  Check
} from 'lucide-react';
import { NoteBlock, NoteObject } from '../../../types/notes';
import { BacklinksInspector } from './BacklinksInspector';

export interface DocViewSettings {
  fontFamily: 'sans' | 'serif' | 'mono';
  pageWidth: 'normal' | 'wide' | 'full';
  zoom: number; // 90, 100, 110, 125
}

interface DocumentOutlinePanelProps {
  note: NoteObject;
  allNotes: NoteObject[];
  viewSettings: DocViewSettings;
  onChangeViewSettings: (settings: DocViewSettings) => void;
  onJumpToBlock: (blockId: string) => void;
  onOpenNote: (noteTitle: string) => void;
  onClose: () => void;
}

export const DocumentOutlinePanel: React.FC<DocumentOutlinePanelProps> = ({
  note,
  allNotes,
  viewSettings,
  onChangeViewSettings,
  onJumpToBlock,
  onOpenNote,
  onClose
}) => {
  const [activeTab, setActiveTab] = React.useState<'outline' | 'stats' | 'settings' | 'links'>('outline');

  // Extract all headings for outline
  const headings = note.blocks.filter(
    (b) => (b.type === 'h1' || b.type === 'h2' || b.type === 'h3') && b.content && b.content.trim()
  );

  // Calculate detailed document stats
  const totalWords = note.blocks.reduce((acc, b) => {
    return acc + (b.content ? b.content.trim().split(/\s+/).filter(Boolean).length : 0);
  }, 0);

  const totalCharsWithSpaces = note.blocks.reduce((acc, b) => {
    return acc + (b.content ? b.content.length : 0);
  }, 0);

  const totalCharsNoSpaces = note.blocks.reduce((acc, b) => {
    return acc + (b.content ? b.content.replace(/\s+/g, '').length : 0);
  }, 0);

  const paragraphsCount = note.blocks.filter((b) => b.type === 'paragraph' && b.content.trim()).length;
  const readingTimeMin = Math.max(1, Math.ceil(totalWords / 200));
  const speakingTimeMin = Math.max(1, Math.ceil(totalWords / 130));

  return (
    <div className="h-full flex flex-col bg-[#fbfbfa] dark:bg-[#19191b] border-l border-stone-200/80 dark:border-stone-800 text-stone-800 dark:text-stone-200 text-xs min-h-0 select-none">
      {/* Panel Top Navigation Bar */}
      <div className="p-3 border-b border-stone-200/70 dark:border-stone-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('outline')}
            title="Document Outline"
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'outline'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-white/5'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>Outline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            title="Word Count & Statistics"
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stats'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-white/5'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Stats</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            title="Document Layout & Typography"
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-white/5'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Layout</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('links')}
            title="Linked References"
            className={`px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'links'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-white/5'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Close panel"
          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-white/10 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {/* Document Outline Tab */}
        {activeTab === 'outline' && (
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Document Headings
            </div>

            {headings.length === 0 ? (
              <div className="py-8 text-center text-stone-400 space-y-2">
                <ListTree className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs">No headings added yet.</p>
                <p className="text-[11px] text-stone-400/80">
                  Add Title, Heading 1, 2, or 3 to generate a table of contents.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {headings.map((h) => {
                  const isH1 = h.type === 'h1';
                  const isH2 = h.type === 'h2';
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => onJumpToBlock(h.id)}
                      className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400 text-left transition-colors cursor-pointer group ${
                        isH1 ? 'font-bold' : isH2 ? 'pl-4 font-semibold text-stone-700 dark:text-stone-300' : 'pl-7 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      {isH1 && <Heading1 className="w-3.5 h-3.5 text-stone-400 shrink-0" />}
                      {isH2 && <Heading2 className="w-3 h-3 text-stone-400 shrink-0" />}
                      {!isH1 && !isH2 && <Heading3 className="w-2.5 h-2.5 text-stone-400 shrink-0" />}
                      <span className="truncate">{h.content}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Detailed Stats Tab (Google Docs Word Count) */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Document Statistics
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-stone-100/80 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800">
                <div className="text-[10px] uppercase font-bold text-stone-400 mb-0.5">Words</div>
                <div className="text-xl font-bold text-stone-900 dark:text-stone-100">{totalWords}</div>
              </div>

              <div className="p-3 rounded-xl bg-stone-100/80 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800">
                <div className="text-[10px] uppercase font-bold text-stone-400 mb-0.5">Blocks</div>
                <div className="text-xl font-bold text-stone-900 dark:text-stone-100">{note.blocks.length}</div>
              </div>

              <div className="p-3 rounded-xl bg-stone-100/80 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800">
                <div className="text-[10px] uppercase font-bold text-stone-400 mb-0.5">Characters</div>
                <div className="text-xl font-bold text-stone-900 dark:text-stone-100">{totalCharsWithSpaces}</div>
              </div>

              <div className="p-3 rounded-xl bg-stone-100/80 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800">
                <div className="text-[10px] uppercase font-bold text-stone-400 mb-0.5">Chars (No Space)</div>
                <div className="text-xl font-bold text-stone-900 dark:text-stone-100">{totalCharsNoSpaces}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Reading time
                </span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">~{readingTimeMin} min</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
                  <FileText className="w-3.5 h-3.5 text-amber-500" /> Speaking time
                </span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">~{speakingTimeMin} min</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
                  <Type className="w-3.5 h-3.5 text-amber-500" /> Paragraphs
                </span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{paragraphsCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Layout & Typography Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Typography & Font Family
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-stone-200/60 dark:bg-stone-800/80">
              <button
                type="button"
                onClick={() => onChangeViewSettings({ ...viewSettings, fontFamily: 'sans' })}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  viewSettings.fontFamily === 'sans'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-semibold'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Sans
              </button>
              <button
                type="button"
                onClick={() => onChangeViewSettings({ ...viewSettings, fontFamily: 'serif' })}
                className={`py-1.5 px-2 rounded-lg text-xs font-serif transition-all cursor-pointer ${
                  viewSettings.fontFamily === 'serif'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-semibold'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Serif
              </button>
              <button
                type="button"
                onClick={() => onChangeViewSettings({ ...viewSettings, fontFamily: 'mono' })}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  viewSettings.fontFamily === 'mono'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-semibold'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Mono
              </button>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 pt-2">
              Page Width
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-stone-200/60 dark:bg-stone-800/80">
              <button
                type="button"
                onClick={() => onChangeViewSettings({ ...viewSettings, pageWidth: 'normal' })}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  viewSettings.pageWidth === 'normal'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-semibold'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => onChangeViewSettings({ ...viewSettings, pageWidth: 'wide' })}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  viewSettings.pageWidth === 'wide'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-semibold'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Wide
              </button>
              <button
                type="button"
                onClick={() => onChangeViewSettings({ ...viewSettings, pageWidth: 'full' })}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  viewSettings.pageWidth === 'full'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs font-semibold'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Full
              </button>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 pt-2">
              Text Zoom
            </div>

            <div className="flex items-center gap-1.5">
              {[90, 100, 110, 125].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => onChangeViewSettings({ ...viewSettings, zoom: z })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                    viewSettings.zoom === z
                      ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {z}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Linked References Tab */}
        {activeTab === 'links' && (
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Backlinks & Connected Notes
            </div>
            <BacklinksInspector
              currentNote={note}
              allNotes={allNotes}
              onOpenNote={onOpenNote}
            />
          </div>
        )}
      </div>
    </div>
  );
};
