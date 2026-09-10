import React, { useState, useMemo, useEffect } from 'react';
import {
  Globe,
  Lock,
  ExternalLink,
  Copy,
  Check,
  X,
  Layers,
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  SlidersHorizontal,
  Tag,
  Clock,
  Camera,
  ShieldCheck,
  Trash2,
  StickyNote,
  Sparkles,
  Plus,
  Maximize2,
  PieChart,
  History,
  Key,
  Upload,
  Cpu,
  Code2,
  PenTool,
  Shield,
  Video,
  Headphones,
  ShoppingBag,
  MessageCircle,
  FileText,
  BookOpen
} from 'lucide-react';
import { TimelineItem } from '../../../types';
import { extractDomain, extractUrlMetadata, getPreviewImageUrl } from '../../../utils/urlMetadata';
import { formatTime } from '../../../utils/dataParser';

interface BrowserInspectorPanelProps {
  item: TimelineItem;
  allBrowserItems?: TimelineItem[];
  notes?: string;
  tags?: string[];
  snapshot?: string;
  onClose: () => void;
  onSaveNote: (url: string, note: string) => void;
  onAddTag: (url: string, tag: string) => void;
  onRemoveTag: (url: string, tag: string) => void;
  onShowDomainProfile?: (domain: string) => void;
  onLaunchAuthenticatedSession?: (url: string) => void | Promise<void>;
  onCaptureActiveScreen?: (url: string) => void | Promise<void>;
  onSaveSessionSnapshot?: (url: string, snapshot: string) => void;
  onOpenDetailModal?: (item: TimelineItem) => void;
  onDeleteItem?: (id: string) => void;
}

export const BrowserInspectorPanel: React.FC<BrowserInspectorPanelProps> = ({
  item,
  allBrowserItems = [],
  notes = '',
  tags = [],
  snapshot,
  onClose,
  onSaveNote,
  onAddTag,
  onRemoveTag,
  onShowDomainProfile = (_domain: string) => {},
  onLaunchAuthenticatedSession = (_url: string) => {},
  onCaptureActiveScreen = (_url: string) => {},
  onSaveSessionSnapshot = (_url: string, _snapshot: string) => {},
  onOpenDetailModal,
  onDeleteItem
}) => {
  const [previewTab, setPreviewTab] = useState<'snapshot' | 'frame' | 'raw'>('snapshot');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copyMdFeedback, setCopyMdFeedback] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [extractionStatus, setExtractionStatus] = useState<'extracting' | 'extracted' | 'failed' | 'insufficient'>('extracting');

  const url = item.url || '';
  const domain = item.domain || (url ? extractDomain(url) : '');
  const meta = useMemo(() => (url ? extractUrlMetadata(url, item.title) : null), [url, item.title]);
  const favicon =
    item.favicon_url ||
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

  // Reset extraction state when inspecting a new URL
  useEffect(() => {
    setExtractionStatus('extracting');
  }, [url]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleCopyUrl = () => {
    if (url && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1800);
      showToast('Link copied to clipboard');
    }
  };

  const handleCopyMarkdown = () => {
    if (url && navigator.clipboard && navigator.clipboard.writeText) {
      const md = `[${item.title || domain || 'Link'}](${url})`;
      navigator.clipboard.writeText(md);
      setCopyMdFeedback(true);
      setTimeout(() => setCopyMdFeedback(false), 1800);
      showToast('Markdown link copied');
    }
  };

  // Stats across dataset
  const urlVisits = useMemo(() => {
    if (!url) return 1;
    return allBrowserItems.filter(d => d.url === url).length || 1;
  }, [allBrowserItems, url]);

  const domainVisits = useMemo(() => {
    if (!domain) return 1;
    return allBrowserItems.filter(d => (d.domain || d.url?.includes(domain))).length || 1;
  }, [allBrowserItems, domain]);

  // URL parsed query parameters
  const parsedQueryParams = useMemo(() => {
    if (!url) return [];
    try {
      let clean = url.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'https://' + clean;
      }
      const u = new URL(clean);
      const params: { key: string; value: string }[] = [];
      u.searchParams.forEach((value, key) => {
        params.push({ key, value });
      });
      return params;
    } catch {
      return [];
    }
  }, [url]);

  const handleAddTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && url) {
      onAddTag(url, clean);
      setTagInput('');
      showToast(`Added #${clean}`);
    }
  };

  const handleSnapshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && url) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          onSaveSessionSnapshot(url, evt.target.result as string);
          showToast('Custom snapshot saved');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const dateStr = item.dateObj
    ? item.dateObj.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  const timeStr = item.dateObj ? formatTime(item.dateObj) : '';
  const previewImage = snapshot || item.cover || getPreviewImageUrl(url, item.title);

  return (
    <div
      id="browser-inspector-panel"
      className="w-full sm:w-96 lg:w-[440px] xl:w-[480px] shrink-0 border-l border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#151518] flex flex-col h-full overflow-hidden z-20 shadow-xl animate-in slide-in-from-right-4 duration-200"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full bg-black/90 dark:bg-white/95 text-white dark:text-black text-xs font-semibold shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="p-4 border-b border-gray-200/80 dark:border-white/10 bg-gray-50/90 dark:bg-[#18181b]/90 backdrop-blur-md shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <img
              src={favicon}
              className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 p-1.5 border border-gray-200 dark:border-gray-700 shrink-0 object-contain shadow-2xs"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              alt={domain}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span
                  onClick={() => onShowDomainProfile(domain)}
                  className="text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-sky-500 hover:underline cursor-pointer"
                >
                  {domain}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                  <Globe className="w-3 h-3 text-sky-500" />
                  <span>{meta?.category || 'Web Link'}</span>
                </span>
                {snapshot ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>Captured Session</span>
                  </span>
                ) : null}
                {meta?.isSecure && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                    <Lock className="w-2.5 h-2.5" /> HTTPS
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                {item.title || domain || 'Web Page'}
              </h3>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {onDeleteItem && (
              <button
                onClick={() => {
                  onDeleteItem(item.id);
                  onClose();
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                title="Delete item"
                aria-label="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {onOpenDetailModal && (
              <button
                onClick={() => onOpenDetailModal(item)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-gray-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Expand to Full Modal"
                aria-label="Expand to Full Modal"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Panel"
              aria-label="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick action bar */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200/60 dark:border-white/5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyUrl}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-[#202020] hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 cursor-pointer shadow-2xs"
              title="Copy Link URL"
            >
              {copyFeedback ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
              <span>{copyFeedback ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleCopyMarkdown}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-[#202020] hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 cursor-pointer shadow-2xs"
              title="Copy Markdown Link"
            >
              {copyMdFeedback ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
              <span>MD</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-sky-500 hover:bg-sky-600 text-white py-1 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Open link in new tab"
              >
                <span>Open</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Preview Mode Switcher */}
        <div className="flex items-center justify-between gap-1.5 bg-gray-200/70 dark:bg-[#202023] p-1 rounded-xl text-xs">
          <button
            onClick={() => setPreviewTab('snapshot')}
            className={`flex-1 py-1 font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              previewTab === 'snapshot'
                ? 'bg-white dark:bg-[#151518] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>Preview</span>
          </button>
          <button
            onClick={() => setPreviewTab('frame')}
            className={`flex-1 py-1 font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              previewTab === 'frame'
                ? 'bg-white dark:bg-[#151518] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-emerald-500" />
            <span>Live Frame</span>
          </button>
          <button
            onClick={() => setPreviewTab('raw')}
            className={`flex-1 py-1 font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              previewTab === 'raw'
                ? 'bg-white dark:bg-[#151518] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
            <span>Params</span>
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        {/* Tab 1: Visual Snapshot / Hero */}
        {previewTab === 'snapshot' && (
          <div className="space-y-3">
            <div className="relative w-full rounded-2xl overflow-hidden bg-gray-950 border border-gray-200 dark:border-white/10 shadow-md group flex flex-col">
              {previewImage ? (
                <div className="w-full relative flex flex-col items-center justify-center bg-[#0d0d0d] min-h-[190px]">
                  <img
                    src={previewImage}
                    className="w-full h-auto max-h-[300px] object-contain object-top block"
                    alt={`${item.title} snapshot`}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {snapshot && (
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 z-10">
                      <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-emerald-300 text-[10px] font-bold border border-emerald-400/30 flex items-center gap-1">
                        <Camera className="w-2.5 h-2.5" /> Captured Session
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full min-h-[180px] p-6 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-neutral-900 to-black relative">
                  <div className="flex items-center gap-3 z-10">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-2">
                      <img src={favicon} className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white tracking-wide block">{domain}</span>
                      <span className="text-[10px] text-gray-400 font-mono truncate block max-w-[200px]">{url}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-1.5 z-10 mt-6">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>Web link archived</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick snapshot capture buttons */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium text-[11px] flex items-center gap-1">
                <Camera className="w-3 h-3 text-sky-500" /> Capture Snapshot:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onCaptureActiveScreen(url)}
                  className="px-2 py-1 rounded-lg font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-[11px] hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer shadow-2xs"
                  title="Screen capture active window"
                >
                  Screen
                </button>
                <button
                  onClick={() => onLaunchAuthenticatedSession(url)}
                  className="px-2 py-1 rounded-lg font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] hover:bg-emerald-500/20 cursor-pointer"
                  title="Launch & Capture Tab"
                >
                  Tab Auth
                </button>
                <label className="px-2 py-1 rounded-lg font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-[11px] hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer shadow-2xs flex items-center gap-1">
                  <Upload className="w-2.5 h-2.5" />
                  <span>Upload</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleSnapshotUpload} />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Live Responsive IFrame */}
        {previewTab === 'frame' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-xl text-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewportMode('desktop')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewportMode === 'desktop' ? 'bg-white dark:bg-gray-800 text-sky-500 shadow-xs' : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Desktop viewport"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewportMode('tablet')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewportMode === 'tablet' ? 'bg-white dark:bg-gray-800 text-sky-500 shadow-xs' : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Tablet viewport"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewportMode('mobile')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewportMode === 'mobile' ? 'bg-white dark:bg-gray-800 text-sky-500 shadow-xs' : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Mobile viewport"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => setIframeKey(k => k + 1)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50"
                title="Reload Frame"
              >
                <RefreshCw className="w-3 h-3 text-gray-400" /> Reload
              </button>
            </div>

            <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-black h-[320px] flex items-center justify-center shadow-inner">
              <iframe
                key={iframeKey}
                src={url}
                title={item.title}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                className="w-full h-full border-none"
              />
            </div>
            <p className="text-[10px] text-gray-400 text-center">
              Note: Cross-origin sites with strict X-Frame-Options headers will deny in-page embedding. Use the Open button above for standard browsing.
            </p>
          </div>
        )}

        {/* Tab 3: URL Parameters Breakdown */}
        {previewTab === 'raw' && (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-white/[0.03] rounded-2xl border border-gray-200/80 dark:border-white/10 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Full Raw Destination URL</span>
              <p className="text-xs font-mono break-all text-gray-700 dark:text-gray-300 select-all p-2 bg-white dark:bg-black/30 rounded-xl border border-gray-200/60 dark:border-white/5">
                {url}
              </p>
            </div>

            {parsedQueryParams.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Extracted URL Parameters ({parsedQueryParams.length})</span>
                <div className="divide-y divide-gray-100 dark:divide-white/5 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden text-xs">
                  {parsedQueryParams.map((p, idx) => (
                    <div key={idx} className="p-2.5 flex items-start justify-between gap-2">
                      <span className="font-mono font-bold text-sky-600 dark:text-sky-400 shrink-0 select-all">{p.key}:</span>
                      <span className="font-mono text-gray-600 dark:text-gray-400 break-all select-all text-right">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic text-center py-4">No query parameters found in URL.</p>
            )}
          </div>
        )}

        {/* AI Synopsis / Overview */}
        {meta?.summary && (
          <div className="p-3.5 rounded-2xl bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/20 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span>Smart Synopsis</span>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              {meta.summary}
            </p>
          </div>
        )}

        {/* Security & Page Protocol Details */}
        <div className="p-3.5 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] space-y-2 text-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5 font-medium">
              <History className="w-3.5 h-3.5 text-sky-500" /> Visits
            </span>
            <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono font-bold">
              {urlVisits} visit{urlVisits !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5 font-medium">
              <PieChart className="w-3.5 h-3.5 text-purple-500" /> Domain Footprint
            </span>
            <span
              onClick={() => onShowDomainProfile(domain)}
              className="font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              {domainVisits} total visits on {domain}
            </span>
          </div>

          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Timestamp
            </span>
            <span className="font-mono text-[11px] text-gray-700 dark:text-gray-300">
              {timeStr} • {dateStr}
            </span>
          </div>
        </div>

        {/* Tags Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <Tag className="w-3 h-3 text-emerald-500" /> Custom Tags ({tags.length})
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tags.map((t, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group"
              >
                <span>#{t}</span>
                <button
                  onClick={() => onRemoveTag(url, t)}
                  className="hover:text-red-500 opacity-60 hover:opacity-100 transition-opacity"
                  title="Remove tag"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <form onSubmit={handleAddTagSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag (e.g. design, api, research)..."
              className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-black/30 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Notes & Annotations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <StickyNote className="w-3 h-3 text-amber-500" /> Personal Notes & Annotations
            </span>
            <span className="text-[10px] text-gray-400 font-mono">Auto-saved</span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => onSaveNote(url, e.target.value)}
            placeholder="Add your takeaways, code snippets, or research notes for this page..."
            className="w-full h-28 p-3 bg-white dark:bg-black/30 border border-gray-200/80 dark:border-white/10 rounded-xl text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 resize-none shadow-2xs placeholder:text-gray-400"
          />
        </div>
      </div>
    </div>
  );
};
