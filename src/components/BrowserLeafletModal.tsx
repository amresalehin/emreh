import React, { useState } from 'react';
import { Lock, Copy, ExternalLink, X, Globe, Key, ShieldCheck, Camera, Sparkles, StickyNote, History, PieChart, Upload } from 'lucide-react';
import { BrowserLeafletModalState, TimelineItem } from '../types';
import { extractUrlMetadata } from '../utils/urlMetadata';

interface BrowserLeafletModalProps {
  isOpen?: boolean;
  modalState?: BrowserLeafletModalState;
  onClose: () => void;
  url?: string;
  title?: string;
  domain?: string;
  timestamp?: string;
  rawData?: TimelineItem[];
  processedData?: TimelineItem[];
  bookmarkNotes?: Record<string, string>;
  onSaveBookmarkNote?: (url: string, note: string) => void;
  sessionSnapshots?: Record<string, string>;
  onSaveSessionSnapshot?: (url: string, snapshot: string) => void;
  onLaunchAuthenticatedSession?: (url: string) => void | Promise<void>;
  onCaptureActiveScreen?: (url: string) => void | Promise<void>;
  onShowDomainProfile?: (domain: string) => void;
  onShowToast?: (msg: string, type?: 'success' | 'amber') => void;
}

export const BrowserLeafletModal: React.FC<BrowserLeafletModalProps> = ({
  isOpen: propIsOpen,
  modalState,
  onClose,
  url: propUrl,
  title: propTitle,
  domain: propDomain,
  timestamp: propTimestamp,
  rawData: propRawData,
  processedData,
  bookmarkNotes = {},
  onSaveBookmarkNote = (_url: string, _note: string) => {},
  sessionSnapshots = {},
  onSaveSessionSnapshot = (_url: string, _snapshot: string) => {},
  onLaunchAuthenticatedSession = (_url: string) => {},
  onCaptureActiveScreen = (_url: string) => {},
  onShowDomainProfile = (_domain: string) => {},
  onShowToast = (_msg: string, _type?: 'success' | 'amber') => {}
}) => {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copyMdFeedback, setCopyMdFeedback] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<'extracting' | 'extracted' | 'failed' | 'insufficient'>('extracting');

  const isOpen = propIsOpen !== undefined ? propIsOpen : (modalState ? modalState.isOpen : false);
  const url = propUrl || (modalState ? modalState.url : '') || '';
  const title = propTitle || (modalState ? modalState.title : '') || '';
  const domain = propDomain || (modalState ? modalState.domain : '') || '';
  const ts = propTimestamp || (modalState ? modalState.ts : '') || '';

  // Reset extraction status when URL changes
  React.useEffect(() => {
    setExtractionStatus('extracting');
  }, [url]);

  if (!isOpen) return null;

  const meta = extractUrlMetadata(url, title);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  const savedNote = bookmarkNotes[url] || '';
  const customSnapshot = sessionSnapshots[url] || '';

  const rawList = processedData || propRawData || [];
  const allBrowser = rawList.filter(d => d.type === 'browser');
  const urlVisits = allBrowser.filter(d => d.url === url).length || 1;
  const domainVisits = allBrowser.filter(d => (d.domain || d.url?.includes(domain))).length || 1;
  const timeDisplay = ts ? new Date(ts).toLocaleString() : 'Recent visit';

  const handleCopyUrl = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
        onShowToast('Link copied to clipboard!');
      });
    }
  };

  const handleCopyMarkdown = () => {
    const md = `[${title || url}](${url})`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md).then(() => {
        setCopyMdFeedback(true);
        setTimeout(() => setCopyMdFeedback(false), 2000);
        onShowToast('Markdown link copied!');
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          onSaveSessionSnapshot(url, evt.target.result as string);
          setExtractionStatus('extracted');
          onShowToast('Session snapshot attached!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div className="bg-white dark:bg-[#121212] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] relative z-10 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
        {/* Header Bar */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/95 dark:bg-[#181818] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
            <img src={faviconUrl} className="w-4 h-4 rounded object-contain shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{domain}</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
              <Globe className="w-3 h-3 text-sky-500" />
              <span>{meta.category || 'Web Page'}</span>
            </span>
            {customSnapshot ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Captured Session</span>
              </span>
            ) : extractionStatus === 'failed' || extractionStatus === 'insufficient' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <Lock className="w-3 h-3 text-amber-500" />
                <span>Auth Fallback</span>
              </span>
            ) : null}
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate flex-1 select-all">
              <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="truncate">{url}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyUrl}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#222] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1.5 border border-gray-200 dark:border-gray-700/80 cursor-pointer shadow-2xs"
              title="Copy URL"
            >
              <Copy className="w-3.5 h-3.5 text-gray-500" />
              <span>{copyFeedback ? 'Copied!' : 'Copy Link'}</span>
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Open</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-gray-50/50 dark:bg-[#0d0d0d] space-y-5">
          {/* Visual Hero / Snapshot - ALWAYS TRY EXTRACTION FIRST */}
          <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 via-[#161616] to-[#0a0a0a] border border-gray-200 dark:border-gray-800 shadow-md group flex flex-col transition-all">
            {customSnapshot ? (
              <div className="w-full relative flex flex-col items-center justify-center bg-[#0d0d0d] min-h-[220px]">
                <img src={customSnapshot} className="w-full h-auto max-h-[75vh] object-contain object-top block" alt={`${title} snapshot`} />
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-10">
                  <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md text-amber-300 text-[10px] font-bold border border-amber-400/30 flex items-center gap-1">
                    <Camera className="w-3 h-3" /> Captured Session Snapshot
                  </span>
                </div>
              </div>
            ) : extractionStatus === 'failed' || extractionStatus === 'insufficient' ? (
              /* Extraction Failed or Insufficient Data: Fallback to Authenticated Browser */
              <div className="w-full min-h-[240px] p-6 text-left relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-neutral-900 to-black">
                <div className="absolute -right-6 -bottom-6 font-black text-6xl text-white/5 select-none pointer-events-none uppercase tracking-tighter truncate max-w-full">
                  {domain}
                </div>
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center p-2.5">
                      <img src={faviconUrl} className="w-7 h-7 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                        {domain}
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      </span>
                      <div className="text-[11px] text-amber-300/90 font-mono">
                        {extractionStatus === 'insufficient' ? 'Extraction Insufficient' : 'Standard Extraction Incomplete'}
                      </div>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/30 text-amber-300 text-[10px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Auth Browser Ready</span>
                  </div>
                </div>

                <div className="z-10 mt-5 space-y-2">
                  <h4 className="text-base font-bold text-white leading-snug drop-shadow-sm">{title}</h4>
                  <p className="text-xs text-gray-300 max-w-xl leading-relaxed">
                    Standard automated extraction could not retrieve complete page contents (e.g. login required, cookie gate, or dynamic client app). Launch with your authenticated browser session to capture.
                  </p>
                </div>

                <div className="z-10 mt-5 flex flex-wrap gap-2.5">
                  <button
                    onClick={() => onLaunchAuthenticatedSession(url)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Launch Authenticated Session
                  </button>
                  <button
                    onClick={() => onCaptureActiveScreen(url)}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-amber-200 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Capture Tab
                  </button>
                  <button
                    onClick={() => setExtractionStatus('extracting')}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
                  >
                    Try Extraction Again
                  </button>
                </div>
              </div>
            ) : (
              /* Try Extraction First: Attempt standard visual render */
              <div className="w-full relative flex flex-col items-center justify-center bg-[#0d0d0d] min-h-[220px]">
                <img
                  src={meta.snapshotUrl}
                  className="w-full h-auto max-h-[75vh] object-contain object-top block"
                  alt={`${title} snapshot`}
                  loading="lazy"
                  onLoad={() => setExtractionStatus('extracted')}
                  onError={() => setExtractionStatus('failed')}
                />
                {extractionStatus === 'extracting' && (
                  <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-xs flex items-center justify-center flex-col gap-2">
                    <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium text-gray-300">Extracting page snapshot...</span>
                  </div>
                )}
              </div>
            )}

            {/* Badges on hero */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/65 backdrop-blur-md text-white text-[11px] font-bold border border-white/10 shadow-sm pointer-events-auto">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>{meta.category}</span>
              </span>
              {extractionStatus === 'extracted' && !customSnapshot && (
                <button
                  onClick={() => setExtractionStatus('insufficient')}
                  className="px-2.5 py-1 rounded-xl bg-black/65 hover:bg-black/80 backdrop-blur-md text-amber-300 text-[10px] font-semibold border border-amber-500/30 shadow-sm pointer-events-auto cursor-pointer flex items-center gap-1"
                  title="If extraction missed content, switch to authenticated session"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Data Incomplete? Auth Browser</span>
                </button>
              )}
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 pointer-events-none">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/65 backdrop-blur-md text-gray-200 text-[10px] font-mono font-semibold border border-white/10 shadow-sm pointer-events-auto">
                <span>~{meta.readMinutes}m read</span>
              </span>
            </div>
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 z-10">
              {meta.palette.map(c => (
                <span key={c} className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Session snapshot & attachment controls */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-sky-500" />
              <span>{customSnapshot ? 'Session Snapshot Attached' : 'Attach Authenticated Session Snapshot'}</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onLaunchAuthenticatedSession(url)}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Launch session in browser and capture"
              >
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Open Authenticated Browser</span>
              </button>
              <button
                onClick={() => onCaptureActiveScreen(url)}
                className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Screen Grab</span>
              </button>
              <label className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-gray-200 dark:border-gray-700 shadow-2xs transition-colors">
                <Upload className="w-3.5 h-3.5 text-sky-500" />
                <span>Upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              {customSnapshot && (
                <button
                  onClick={() => {
                    onSaveSessionSnapshot(url, '');
                    onShowToast('Session snapshot removed');
                  }}
                  className="text-xs text-red-500 hover:underline font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Title & Domain info */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold">
                <img src={faviconUrl} className="w-3.5 h-3.5 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                <span>{domain}</span>
              </span>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{timeDisplay}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-snug tracking-tight">
              {title}
            </h2>
            <div className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all select-all">
              {url}
            </div>
          </div>

          {/* Smart Tags */}
          {meta.smartTags.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Smart Tags & Topics</div>
              <div className="flex flex-wrap gap-1.5">
                {meta.smartTags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 text-[11px] font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Intelligent Synopsis */}
          <div className="p-4 rounded-2xl bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/20 text-xs leading-relaxed space-y-1.5">
            <div className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-500" />
              <span>AI Content Overview</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {meta.smartSynopsis}
            </p>
          </div>

          {/* Actions Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={handleCopyUrl}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-[#1c1c1c] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors flex items-center justify-center gap-1.5 border border-gray-200 dark:border-gray-800 cursor-pointer shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5 text-gray-500" />
              <span>{copyFeedback ? 'Copied Link' : 'Copy Link'}</span>
            </button>
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-[#1c1c1c] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors flex items-center justify-center gap-1.5 border border-gray-200 dark:border-gray-800 cursor-pointer shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5 text-gray-500" />
              <span>{copyMdFeedback ? 'Markdown Copied' : 'Copy Markdown'}</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onShowDomainProfile(domain);
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-[#1c1c1c] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors flex items-center justify-center gap-1.5 border border-gray-200 dark:border-gray-800 cursor-pointer shadow-2xs"
            >
              <PieChart className="w-3.5 h-3.5 text-sky-500" />
              <span>Domain Stats</span>
            </button>
          </div>

          {/* Personal Notes */}
          <div className="bg-gray-50/80 dark:bg-[#161616] p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                <span>My Notes & Reflections</span>
              </label>
              <span className="text-[10px] text-gray-400 font-mono">Auto-saved</span>
            </div>
            <textarea
              value={savedNote}
              onChange={(e) => onSaveBookmarkNote(url, e.target.value)}
              placeholder="Add your personal thoughts, key quotes, or notes for this link..."
              className="w-full h-24 bg-white dark:bg-[#202020] border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs text-gray-800 dark:text-gray-200 outline-none resize-none focus:ring-2 focus:ring-sky-500/30 transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Visit Analytics */}
          <div className="p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#141414] space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5 font-medium">
                <History className="w-3.5 h-3.5 text-sky-500" /> Page History
              </span>
              <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono font-bold">
                {urlVisits} visit{urlVisits !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5 font-medium">
                <PieChart className="w-3.5 h-3.5 text-purple-500" /> Domain Footprint
              </span>
              <span className="font-semibold text-sky-500">
                {domainVisits} total visits on {domain}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
