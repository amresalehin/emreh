import React, { useState, useMemo } from 'react';
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
  Folder,
  Clock,
  Trash2,
  Camera,
  Cpu,
  Code2,
  PenTool,
  Shield,
  Video,
  Headphones,
  ShoppingBag,
  MessageCircle,
  FileText,
  BookOpen,
  StickyNote,
  Sparkles,
  Plus
} from 'lucide-react';
import { TimelineItem } from '../../../types';
import { extractDomain, extractUrlMetadata, getPreviewImageUrl } from '../../../utils/urlMetadata';
import { formatTime } from '../../../utils/dataParser';

interface BookmarkInspectorPanelProps {
  item: TimelineItem;
  notes?: string;
  tags?: string[];
  snapshot?: string;
  onClose: () => void;
  onSaveNote: (url: string, note: string) => void;
  onAddTag: (url: string, tag: string) => void;
  onRemoveTag: (url: string, tag: string) => void;
  onCopyUrl: (url: string) => void;
  copiedUrl: string | null;
  onDeleteItem?: (id: string) => void;
}

export const BookmarkInspectorPanel: React.FC<BookmarkInspectorPanelProps> = ({
  item,
  notes = '',
  tags = [],
  snapshot,
  onClose,
  onSaveNote,
  onAddTag,
  onRemoveTag,
  onCopyUrl,
  copiedUrl,
  onDeleteItem
}) => {
  const [previewTab, setPreviewTab] = useState<'preview' | 'frame' | 'raw'>('preview');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeError, setIframeError] = useState(false);
  const [noteText, setNoteText] = useState(notes);
  const [newTagText, setNewTagText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Sync noteText if item changes
  React.useEffect(() => {
    setNoteText(notes);
  }, [notes, item.id]);

  const url = item.url || '';
  const domain = item.domain || extractDomain(url);
  const meta = useMemo(() => extractUrlMetadata(url, item.title), [url, item.title]);

  const previewImage = useMemo(() => {
    return snapshot || item.cover || getPreviewImageUrl(url, item.title);
  }, [snapshot, item.cover, url, item.title]);

  const favicon =
    item.favicon_url ||
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

  const dateStr = item.dateObj
    ? item.dateObj.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  const timeStr = item.dateObj ? formatTime(item.dateObj) : '';

  const handleCopy = () => {
    if (url) {
      onCopyUrl(url);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1800);
    }
  };

  const handleNoteBlur = () => {
    if (url && noteText !== notes) {
      onSaveNote(url, noteText);
    }
  };

  const handleAddTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagText.trim() || !url) return;
    onAddTag(url, newTagText.trim().toLowerCase());
    setNewTagText('');
  };

  // URL Breakdown
  const parsedUrl = useMemo(() => {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  }, [url]);

  const pathSegments = useMemo(() => {
    if (!parsedUrl) return [];
    return parsedUrl.pathname.split('/').filter(Boolean);
  }, [parsedUrl]);

  const queryParams = useMemo(() => {
    if (!parsedUrl) return [];
    const params: { key: string; value: string }[] = [];
    parsedUrl.searchParams.forEach((value, key) => {
      params.push({ key, value });
    });
    return params;
  }, [parsedUrl]);

  // Category Icon
  const CategoryIconComponent = useMemo(() => {
    switch (meta.category) {
      case 'AI & Intelligence':
        return Cpu;
      case 'Code & Repository':
        return Code2;
      case 'Design & Creative':
        return PenTool;
      case 'Article & Reading':
        return BookOpen;
      case 'Finance & Banking':
        return Shield;
      case 'Video & Media':
        return Video;
      case 'Audio & Music':
        return Headphones;
      case 'Product & Store':
        return ShoppingBag;
      case 'Social & Community':
        return MessageCircle;
      case 'Docs & Reference':
        return FileText;
      default:
        return Globe;
    }
  }, [meta.category]);

  const isCopied = copiedUrl === url || copyFeedback;

  return (
    <div
      id="bookmark-inspector-panel"
      className="w-full sm:w-96 lg:w-[420px] shrink-0 border-l border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#151518] flex flex-col h-full overflow-hidden z-20 shadow-xl animate-in slide-in-from-right-4 duration-200"
    >
      {/* Header Bar */}
      <div className="p-4 border-b border-gray-200/80 dark:border-white/10 space-y-3 bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <img
              src={favicon}
              alt=""
              className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 p-1.5 border border-gray-200 dark:border-gray-700 shrink-0 object-contain shadow-2xs"
              onError={e => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-sky-500 truncate max-w-[140px]">
                  {domain}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                  <CategoryIconComponent className="w-2.5 h-2.5" />
                  <span>{meta.category.split(' ')[0]}</span>
                </span>
                {meta.isSecure && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                    <Lock className="w-2.5 h-2.5" /> HTTPS
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                {item.title}
              </h3>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#202024] hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1 border border-gray-200 dark:border-gray-700 cursor-pointer shadow-2xs"
              title="Copy Link URL"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
            </button>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-sky-500 hover:bg-sky-600 text-white py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
              title="Open link in new tab"
            >
              <span>Open</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview Tabs Switcher */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-white/5 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setPreviewTab('preview')}
              className={`px-3 py-1 font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                previewTab === 'preview'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('frame')}
              className={`px-3 py-1 font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                previewTab === 'frame'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 text-emerald-500" />
              <span>Live Frame</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('raw')}
              className={`px-3 py-1 font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                previewTab === 'raw'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
              <span>Metadata</span>
            </button>
          </div>

          {previewTab === 'frame' && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewportMode === 'desktop'
                    ? 'bg-white dark:bg-gray-800 text-sky-500 shadow-2xs'
                    : 'text-gray-400'
                }`}
                title="Desktop"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('tablet')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewportMode === 'tablet'
                    ? 'bg-white dark:bg-gray-800 text-sky-500 shadow-2xs'
                    : 'text-gray-400'
                }`}
                title="Tablet"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewportMode === 'mobile'
                    ? 'bg-white dark:bg-gray-800 text-sky-500 shadow-2xs'
                    : 'text-gray-400'
                }`}
                title="Mobile"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIframeKey(k => k + 1);
                  setIframeError(false);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                title="Reload"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* TAB 1: VISUAL PREVIEW */}
        {previewTab === 'preview' && (
          <div className="space-y-4">
            <div className="relative w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-[#1c1c20] border border-gray-200 dark:border-white/10 shadow-xs group flex flex-col">
              {previewImage ? (
                <div className="w-full relative flex flex-col items-center justify-center bg-black/5 dark:bg-black/40 min-h-[180px]">
                  <img
                    src={previewImage}
                    className="w-full h-auto max-h-[260px] object-cover block"
                    alt={item.title}
                    onError={e => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-44 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-sky-500/10 via-purple-500/5 to-transparent">
                  <Globe className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                    {domain}
                  </span>
                </div>
              )}

              {/* Read time pill */}
              {meta.readMinutes ? (
                <div className="absolute bottom-2.5 right-2.5">
                  <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-gray-200 text-[10px] font-mono border border-white/10 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-sky-400" />
                    ~{meta.readMinutes} min read
                  </span>
                </div>
              ) : null}
            </div>

            {/* Smart Synopsis */}
            {meta.smartSynopsis && (
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Smart Synopsis</span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  {meta.smartSynopsis}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE FRAME */}
        {previewTab === 'frame' && (
          <div className="space-y-2">
            <div
              className={`mx-auto rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-black transition-all shadow-md ${
                viewportMode === 'mobile'
                  ? 'w-[320px] h-[480px]'
                  : viewportMode === 'tablet'
                  ? 'w-full max-w-[360px] h-[480px]'
                  : 'w-full h-[400px]'
              }`}
            >
              {!iframeError ? (
                <iframe
                  key={iframeKey}
                  src={url}
                  title={item.title}
                  className="w-full h-full border-none"
                  sandbox="allow-same-origin allow-scripts"
                  onError={() => setIframeError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <Globe className="w-8 h-8 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    Live embed preview blocked by the website's security policy.
                  </p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-sky-500 text-white rounded-xl text-xs font-bold"
                  >
                    Open in New Tab
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: URL METADATA & PARAMS */}
        {previewTab === 'raw' && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/10 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Technical Details
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-400">Protocol:</span>{' '}
                  <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                    {parsedUrl?.protocol || 'https:'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Domain:</span>{' '}
                  <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                    {domain}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Category:</span>{' '}
                  <span className="font-bold text-sky-600 dark:text-sky-400">
                    {meta.category}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Reading Time:</span>{' '}
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    ~{meta.readMinutes} mins
                  </span>
                </div>
              </div>
            </div>

            {pathSegments.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/10 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Path Segments
                </div>
                <div className="flex flex-wrap gap-1">
                  {pathSegments.map((seg, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-gray-200 dark:bg-white/10 font-mono text-[10px] text-gray-800 dark:text-gray-200"
                    >
                      /{seg}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {queryParams.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/10 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Query Parameters ({queryParams.length})
                </div>
                <div className="space-y-1">
                  {queryParams.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between font-mono text-[10px] p-1.5 rounded-lg bg-gray-100 dark:bg-white/5"
                    >
                      <span className="text-sky-600 dark:text-sky-400 font-bold">{p.key}:</span>
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                        {p.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Integrated Notes & Excerpts Editor */}
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-amber-500" />
              <span>Personal Notes & Excerpts</span>
            </label>
            <span className="text-[10px] text-gray-400">Auto-saves</span>
          </div>
          <textarea
            rows={3}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onBlur={handleNoteBlur}
            placeholder="Add your reflections, key takeaways, or quotes..."
            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-amber-500 transition-colors leading-relaxed"
          />
        </div>

        {/* Tags Section */}
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/5">
          <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-purple-500" />
            <span>Tags</span>
          </label>

          {/* Tag Pills */}
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-medium border border-purple-200 dark:border-purple-800/40"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => onRemoveTag(url, t)}
                  className="hover:text-rose-500 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Smart Suggested Tags */}
            {meta.smartTags
              .filter(st => !tags.includes(st.replace(/^#/, '')))
              .slice(0, 3)
              .map(st => {
                const clean = st.replace(/^#/, '');
                return (
                  <button
                    key={clean}
                    type="button"
                    onClick={() => onAddTag(url, clean)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-500 hover:text-purple-600 text-[11px] font-medium transition-colors cursor-pointer border border-dashed border-gray-300 dark:border-white/10"
                    title="Click to add smart tag"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>#{clean}</span>
                  </button>
                );
              })}
          </div>

          {/* Add Tag Form */}
          <form onSubmit={handleAddTagSubmit} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newTagText}
              onChange={e => setNewTagText(e.target.value)}
              placeholder="Add tag..."
              className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!newTagText.trim()}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Add
            </button>
          </form>
        </div>

        {/* Attributes Footer: Folder, Platform, Date */}
        <div className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-2 text-[11px] text-gray-500">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-gray-400">
              <Folder className="w-3 h-3 text-amber-500" /> Folder
            </span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {item.category || 'Unsorted'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Saved Date</span>
            <span className="font-mono text-gray-700 dark:text-gray-300">
              {dateStr} {timeStr}
            </span>
          </div>

          {/* Palette Swatches */}
          {meta.palette.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-gray-400">Color Palette</span>
              <div className="flex items-center gap-1">
                {meta.palette.map((c, i) => (
                  <span
                    key={i}
                    className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10 shadow-2xs"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Delete Bookmark Action */}
          {onDeleteItem && (
            <div className="pt-3">
              <button
                type="button"
                onClick={() => {
                  onDeleteItem(item.id);
                  onClose();
                }}
                className="w-full py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Bookmark</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
