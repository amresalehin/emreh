import React from 'react';
import { X, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { DEFAULT_NOTE_TEMPLATES } from '../../../utils/notesStorage';
import { NoteTemplate } from '../../../types/notes';

interface NotesTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: NoteTemplate) => void;
  onCreateBlank: () => void;
}

export const NotesTemplatesModal: React.FC<NotesTemplatesModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
  onCreateBlank
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-[#18181b] rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Choose a Knowledge Template
              </h3>
              <p className="text-[11px] text-gray-400">
                Pre-configured Anytype sets and SiYuan block architectures
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 min-h-0 flex-1">
          {/* Blank Option */}
          <div
            onClick={() => {
              onCreateBlank();
              onClose();
            }}
            className="p-3.5 rounded-2xl border border-dashed border-gray-300 dark:border-white/15 hover:border-blue-500 hover:bg-blue-500/[0.03] transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-lg">
                📄
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors">
                  Blank Canvas Document
                </h4>
                <p className="text-[11px] text-gray-400">
                  Start with a fresh empty block editor and slash commands
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>

          {DEFAULT_NOTE_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => {
                onApplyTemplate(tpl);
                onClose();
              }}
              className="p-3.5 rounded-2xl border border-gray-200/80 dark:border-white/10 hover:border-amber-500 hover:bg-amber-500/[0.03] transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-lg shrink-0">
                  {tpl.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-amber-500 transition-colors truncate">
                      {tpl.title}
                    </h4>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 text-gray-500">
                      {tpl.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                    {tpl.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {tpl.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] text-gray-400 bg-black/5 dark:bg-white/5 px-1.5 py-0.2 rounded"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
