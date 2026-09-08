import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Copy, Check, Globe, Sparkles, Info } from 'lucide-react';

export interface FaviconModalData {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  imageUrl: string;
  description?: string;
  linkUrl?: string;
  category?: string;
}

interface FaviconModalProps {
  data: FaviconModalData | null;
  onClose: () => void;
}

export const FaviconModal: React.FC<FaviconModalProps> = ({ data, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
    setCopied(false);
  }, [data?.imageUrl]);

  useEffect(() => {
    if (!data?.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data?.isOpen, onClose]);

  if (!data || !data.isOpen) return null;

  const handleCopyLink = () => {
    if (data.linkUrl) {
      navigator.clipboard.writeText(data.linkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      id="favicon-enlarged-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="favicon-enlarged-modal-card"
        className="w-full max-w-md bg-white/95 dark:bg-[#18181c]/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-stone-200/80 dark:border-stone-800/80 p-6 flex flex-col gap-5 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Info className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider font-mono">
              Favicon Details
            </span>
          </div>
          <button
            id="favicon-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enlarged Favicon Picture Section */}
        <div className="flex flex-col items-center justify-center py-4 bg-gradient-to-b from-stone-50 to-stone-100/50 dark:from-[#131316] dark:to-[#0f0f12] rounded-2xl border border-stone-200/60 dark:border-stone-800/60 relative overflow-hidden group">
          <div className="absolute inset-0 bg-radial from-blue-500/10 to-transparent opacity-50 pointer-events-none" />

          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl p-3 bg-white dark:bg-[#1c1c22] shadow-xl border border-stone-200 dark:border-stone-700 flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
            {!imageError ? (
              <img
                src={data.imageUrl}
                alt={data.title}
                className="w-full h-full object-contain drop-shadow-md rounded-xl"
                onError={() => setImageError(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                <Globe className="w-12 h-12 stroke-[1.5]" />
                <span className="text-[10px] mt-1 font-mono">Icon</span>
              </div>
            )}
          </div>

          {data.category && (
            <span className="mt-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300/60 dark:border-stone-700">
              {data.category}
            </span>
          )}
        </div>

        {/* Text Details & Description */}
        <div className="space-y-2 text-left">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 leading-snug">
                {data.title}
              </h3>
              {data.subtitle && (
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                  {data.subtitle}
                </p>
              )}
            </div>
          </div>

          {data.description ? (
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#141418] border border-stone-200/80 dark:border-stone-800/80 text-xs text-stone-700 dark:text-stone-300 leading-relaxed max-h-40 overflow-y-auto">
              {data.description}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-stone-50/60 dark:bg-[#141418]/60 border border-stone-200/60 dark:border-stone-800/60 text-xs text-stone-500 dark:text-stone-400 italic">
              No additional description provided.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-1">
            {data.linkUrl && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy Link URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {data.linkUrl && (
              <a
                href={data.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-colors cursor-pointer"
              >
                <span>Visit Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button aria-label="Action"
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-stone-200/70 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
