import React, { useState, useMemo } from 'react';
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  Edit3,
  Bookmark,
  Folder,
  Tag,
  Clock,
  Trash2,
  Camera,
  Cpu,
  PenTool,
  Shield,
  Video,
  Headphones,
  ShoppingBag,
  MessageCircle,
  FileText,
  Code2,
  BookOpen,
  StickyNote,
  Layers,
  Sparkles
} from 'lucide-react';
import { TimelineItem } from '../../../types';
import { extractDomain, extractUrlMetadata, getPreviewImageUrl } from '../../../utils/urlMetadata';
import { formatTime } from '../../../utils/dataParser';
import { MoodboardCard } from './MoodboardCard';

export interface BookmarkCardProps {
  item: TimelineItem;
  notes?: string;
  tags?: string[];
  snapshot?: string;
  layoutMode?: 'grid' | 'cards' | 'list' | 'compact' | 'feed' | 'table' | 'pinterest' | 'moodboard' | 'kanban' | 'headlines';
  isSelected?: boolean;
  onSelect?: (item: TimelineItem) => void;
  onCopyLink: (url: string) => void;
  onOpenEdit: (item: TimelineItem) => void;
  onSelectTag?: (tag: string) => void;
  onDeleteItem?: (id: string) => void;
  copiedUrl?: string | null;
  brandAccentColor?: string;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  item,
  notes,
  tags = [],
  snapshot,
  layoutMode = 'grid',
  isSelected = false,
  onSelect,
  onCopyLink,
  onOpenEdit,
  onSelectTag,
  onDeleteItem,
  copiedUrl,
  brandAccentColor
}) => {
  const [localCopied, setLocalCopied] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  const url = item.url || '';
  const domain = item.domain || extractDomain(url);
  const isCopied = (copiedUrl === url) || localCopied;

  // Extract rich metadata using BrowserView's URL metadata logic
  const meta = useMemo(() => extractUrlMetadata(url, item.title), [url, item.title]);

  // Derive preview image using snapshot, item cover, or generative web screenshot
  const previewImage = useMemo(() => {
    return snapshot || item.cover || getPreviewImageUrl(url, item.title);
  }, [snapshot, item.cover, url, item.title]);

  // Combine user tags with extracted smart tags
  const allTags = useMemo(() => {
    const combined = [...(tags || [])];
    meta.smartTags.forEach(t => {
      const clean = t.replace(/^#/, '');
      if (!combined.includes(clean)) {
        combined.push(clean);
      }
    });
    return combined.slice(0, 4);
  }, [tags, meta.smartTags]);

  const timeStr = item.dateObj ? formatTime(item.dateObj) : '';
  const dateStr = item.dateObj
    ? item.dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) {
      onCopyLink(url);
      setLocalCopied(true);
      setTimeout(() => setLocalCopied(false), 1800);
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(item);
    }
  };

  // Platform styling & identification
  const platform = item.platform || 'Bookmark';
  const platformLower = platform.toLowerCase();
  const isRaindrop = platformLower.includes('raindrop');
  const isPinterest = platformLower.includes('pinterest') || (platformLower.includes('pin') && !platformLower.includes('pinboard'));
  const isPocket = platformLower.includes('pocket');
  const isPinboard = platformLower.includes('pinboard');
  const isLinkding = platformLower.includes('linkding');

  // Category Icon Component
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

  // Category Accent styling
  const categoryAccent = useMemo(() => {
    switch (meta.category) {
      case 'AI & Intelligence':
        return {
          bg: 'from-emerald-500/15 via-teal-500/10 to-transparent',
          border: 'hover:border-emerald-500/40',
          activeRing: 'ring-emerald-500/30 border-emerald-500/80',
          badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
        };
      case 'Code & Repository':
        return {
          bg: 'from-indigo-500/15 via-blue-500/10 to-transparent',
          border: 'hover:border-indigo-500/40',
          activeRing: 'ring-indigo-500/30 border-indigo-500/80',
          badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
        };
      case 'Design & Creative':
        return {
          bg: 'from-purple-500/15 via-pink-500/10 to-transparent',
          border: 'hover:border-purple-500/40',
          activeRing: 'ring-purple-500/30 border-purple-500/80',
          badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
        };
      case 'Article & Reading':
        return {
          bg: 'from-amber-500/15 via-orange-500/10 to-transparent',
          border: 'hover:border-amber-500/40',
          activeRing: 'ring-amber-500/30 border-amber-500/80',
          badgeBg: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
        };
      case 'Video & Media':
        return {
          bg: 'from-red-500/15 via-rose-500/10 to-transparent',
          border: 'hover:border-red-500/40',
          activeRing: 'ring-red-500/30 border-red-500/80',
          badgeBg: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30'
        };
      case 'Audio & Music':
        return {
          bg: 'from-emerald-500/15 via-green-500/10 to-transparent',
          border: 'hover:border-emerald-500/40',
          activeRing: 'ring-emerald-500/30 border-emerald-500/80',
          badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
        };
      case 'Product & Store':
        return {
          bg: 'from-rose-500/15 via-pink-500/10 to-transparent',
          border: 'hover:border-rose-500/40',
          activeRing: 'ring-rose-500/30 border-rose-500/80',
          badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
        };
      default:
        return {
          bg: 'from-sky-500/15 via-blue-500/10 to-transparent',
          border: 'hover:border-sky-500/40',
          activeRing: 'ring-sky-500/30 border-sky-500/80',
          badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
        };
    }
  }, [meta.category]);

  const favicon =
    item.favicon_url ||
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

  // --- 0. MOODBOARD & KANBAN VARIANT (Uncropped, unstretched image decides card height) ---
  if (layoutMode === 'moodboard' || layoutMode === 'kanban') {
    return (
      <MoodboardCard
        item={item}
        notes={notes}
        tags={tags}
        snapshot={snapshot}
        isSelected={isSelected}
        onSelect={onSelect}
        onCopyLink={onCopyLink}
        onOpenEdit={onOpenEdit}
        onSelectTag={onSelectTag}
        onDeleteItem={onDeleteItem}
        copiedUrl={copiedUrl}
        isDraggable={layoutMode === 'kanban'}
      />
    );
  }

  // --- 0.5 HEADLINES VARIANT (Clean typographical list from Raindrop) ---
  if (layoutMode === 'headlines') {
    return (
      <div
        id={`bookmark-headline-${item.id}`}
        onClick={handleCardClick}
        className={`group flex items-center justify-between py-2.5 px-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
          isSelected
            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-400 dark:border-blue-700'
            : 'bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/[0.03] border-gray-200/80 dark:border-white/5'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img
            src={favicon}
            alt={domain}
            className="w-4 h-4 rounded-xs shrink-0 object-contain"
            onError={() => setFaviconError(true)}
          />
          <span className="text-xs font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
            {item.title || domain}
          </span>
          {notes && (
            <span className="hidden md:inline-block px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] italic truncate max-w-[200px]">
              "{notes}"
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400 ml-3">
          <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 hidden sm:inline">
            {domain}
          </span>
          {dateStr && (
            <span className="text-[10px] text-gray-400 hidden lg:inline">
              {dateStr}
            </span>
          )}
          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-white/10"
              title="Copy URL"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 text-gray-400 hover:text-blue-500 rounded-md hover:bg-gray-100 dark:hover:bg-white/10"
              title="Open URL"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // --- 1. PINTEREST VISUAL PIN CARD VARIANT ---
  if (layoutMode === 'pinterest') {
    return (
      <div
        id={`bookmark-pin-${item.id}`}
        onClick={handleCardClick}
        className={`group bg-white dark:bg-[#18181b] rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer ${
          isSelected
            ? 'ring-2 ring-rose-500/40 border-rose-500/80 shadow-md'
            : 'border-gray-200/80 dark:border-white/10 shadow-xs hover:shadow-xl hover:-translate-y-0.5'
        }`}
      >
        <div className="relative overflow-hidden bg-rose-50/30 dark:bg-rose-950/10">
          {previewImage && !previewError ? (
            <div className="aspect-[4/3] w-full overflow-hidden relative">
              <img
                src={previewImage}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                onError={() => setPreviewError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1.5 bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <span>Open Pin</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="h-32 w-full bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/20 dark:to-neutral-900 flex items-center justify-center p-4">
              <span className="text-3xl font-black text-rose-300 dark:text-rose-800 tracking-wider">
                PIN
              </span>
            </div>
          )}

          {/* Board / Category Pill */}
          {item.category && (
            <div className="absolute top-2.5 left-2.5">
              <span className="px-2.5 py-1 bg-white/90 dark:bg-black/80 backdrop-blur-md text-[10px] font-bold text-gray-800 dark:text-gray-200 rounded-lg shadow-2xs flex items-center gap-1">
                <Folder className="w-2.5 h-2.5 text-rose-500" />
                <span>{item.category}</span>
              </span>
            </div>
          )}
        </div>

        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-[#E60023] transition-colors">
              {item.title}
            </h4>

            {notes ? (
              <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 bg-gray-50 dark:bg-white/[0.02] p-2 rounded-xl">
                {notes}
              </p>
            ) : meta.smartSynopsis ? (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                {meta.smartSynopsis}
              </p>
            ) : null}

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {allTags.slice(0, 4).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectTag) onSelectTag(t);
                    }}
                    className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 rounded-md text-[10px] font-semibold cursor-pointer"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-400">
            <span className="text-[10px] font-medium text-gray-400 truncate max-w-[120px]">
              {domain}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Copy link"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEdit(item);
                }}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Edit pin details"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. FEED LAYOUT ROW (Matching BrowserView Timeline Flow) ---
  if (layoutMode === 'feed') {
    return (
      <div
        id={`bookmark-feed-${item.id}`}
        onClick={handleCardClick}
        className={`pt-2 p-3.5 rounded-2xl cursor-pointer transition-all border ${
          isSelected
            ? 'bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/40 shadow-xs'
            : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-900/40'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center gap-1">
              <Globe className="w-3 h-3" /> {domain}
            </span>
            {snapshot && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Camera className="w-2.5 h-2.5" /> Captured
              </span>
            )}
            {platform && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {platform}
              </span>
            )}
            {meta.readMinutes ? (
              <span className="text-[9px] font-mono text-gray-400">
                ~{meta.readMinutes} min read
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
            {dateStr && <span>{dateStr}</span>}
            {timeStr && <span>• {timeStr}</span>}
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          {!faviconError ? (
            <img
              src={favicon}
              alt=""
              className="w-4 h-4 rounded mt-0.5 shrink-0 bg-gray-100 dark:bg-gray-800 object-contain"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <Globe className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          )}

          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate hover:text-sky-500 transition-colors">
              {item.title}
            </h4>
            <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">
              {item.url}
            </p>
            {notes ? (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 line-clamp-1 mt-1 bg-amber-500/10 px-2 py-0.5 rounded-md">
                {notes}
              </p>
            ) : meta.smartSynopsis ? (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                {meta.smartSynopsis}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Copy URL"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenEdit(item);
              }}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Edit Bookmark"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg cursor-pointer transition-colors"
              title="Open URL in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. COMPACT LIST ROW ---
  if (layoutMode === 'list' || layoutMode === 'compact') {
    return (
      <div
        id={`bookmark-row-${item.id}`}
        onClick={handleCardClick}
        className={`p-3 sm:px-4 sm:py-3 cursor-pointer transition-colors group flex items-center justify-between gap-3 ${
          isSelected
            ? 'bg-sky-500/10 dark:bg-sky-500/15'
            : 'hover:bg-gray-50/80 dark:hover:bg-white/[0.02]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {!faviconError ? (
            <img
              src={favicon}
              alt=""
              className="w-4 h-4 rounded shrink-0 object-contain"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <Globe className="w-4 h-4 text-gray-400 shrink-0" />
          )}

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-sky-500 truncate">
                {item.title}
              </span>
              <span className="text-[10px] text-gray-400 font-mono hidden sm:inline truncate">
                ({domain})
              </span>
            </div>

            {notes ? (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {notes}
              </p>
            ) : meta.smartSynopsis ? (
              <p className="text-[11px] text-gray-400 truncate">
                {meta.smartSynopsis}
              </p>
            ) : null}

            <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-wrap">
              {item.category && item.category !== 'Unsorted' && (
                <span className="flex items-center gap-1">
                  <Folder className="w-2.5 h-2.5 text-amber-500" />
                  <span>{item.category}</span>
                </span>
              )}
              {meta.readMinutes ? (
                <span className="flex items-center gap-1 text-rose-500 font-medium">
                  <Clock className="w-2.5 h-2.5" />
                  <span>~{meta.readMinutes} min read</span>
                </span>
              ) : null}
              {allTags.length > 0 && (
                <div className="flex items-center gap-1">
                  {allTags.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectTag) onSelectTag(t);
                      }}
                      className="text-purple-600 dark:text-purple-400 hover:underline font-medium cursor-pointer"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-gray-400 hidden md:inline">
            {dateStr}
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Copy URL"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenEdit(item);
            }}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Edit details"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg cursor-pointer transition-colors"
            title="Open in new window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  // --- 4. TABLE ROW ---
  if (layoutMode === 'table') {
    return (
      <tr
        id={`bookmark-table-${item.id}`}
        onClick={handleCardClick}
        className={`cursor-pointer transition-colors ${
          isSelected
            ? 'bg-sky-500/10 dark:bg-sky-500/20 font-medium'
            : 'hover:bg-gray-50/50 dark:hover:bg-white/[0.01]'
        }`}
      >
        <td className="py-3 px-4 max-w-xs">
          <div className="flex items-center gap-2">
            {!faviconError ? (
              <img
                src={favicon}
                alt=""
                className="w-3.5 h-3.5 rounded shrink-0 object-contain"
                onError={() => setFaviconError(true)}
              />
            ) : (
              <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            )}
            <span className="font-bold text-gray-900 dark:text-white hover:text-sky-500 truncate block">
              {item.title}
            </span>
          </div>
        </td>
        <td className="py-3 px-4 text-gray-500 text-[11px]">{domain}</td>
        <td className="py-3 px-4">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              isRaindrop
                ? 'bg-blue-50 text-[#0089FF] dark:bg-blue-950/40'
                : isPinterest
                ? 'bg-rose-50 text-[#E60023] dark:bg-rose-950/40'
                : isPocket
                ? 'bg-red-50 text-rose-600 dark:bg-red-950/40'
                : isPinboard
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40'
                : isLinkding
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300'
            }`}
          >
            {platform}
          </span>
        </td>
        <td className="py-3 px-4 text-gray-500 text-[11px]">{item.category || 'Unsorted'}</td>
        <td className="py-3 px-4">
          <div className="flex flex-wrap gap-1">
            {allTags.slice(0, 3).map(t => (
              <span key={t} className="text-purple-600 dark:text-purple-400 text-[10px] font-medium">
                #{t}
              </span>
            ))}
          </div>
        </td>
        <td className="py-3 px-4 text-gray-400 whitespace-nowrap text-[11px]">
          {dateStr}
        </td>
        <td className="py-3 px-4 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenEdit(item);
              }}
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 text-sky-500 hover:text-sky-700 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </td>
      </tr>
    );
  }

  // --- 5. VISUAL MYMIND-STYLE CARDS GRID (Matches BrowserView Card Design in Screenshot) ---
  return (
    <div
      id={`bookmark-card-${item.id}`}
      onClick={handleCardClick}
      className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden text-left bg-white dark:bg-[#121212] ${
        isSelected
          ? `ring-2 ${categoryAccent.activeRing} shadow-md`
          : `border-gray-200/90 dark:border-gray-800 shadow-xs hover:shadow-md ${categoryAccent.border} hover:-translate-y-0.5`
      }`}
    >
      {/* Top Visual Preview Area (live card preview / snapshot thumbnail) */}
      <div className="relative w-full h-40 sm:h-44 bg-gray-100 dark:bg-gray-900 overflow-hidden border-b border-gray-100 dark:border-gray-800/90">
        {/* Shimmer pulse while loading */}
        {!previewLoaded && !previewError && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 animate-pulse flex items-center justify-center">
            <Globe className="w-6 h-6 text-gray-300 dark:text-gray-700" />
          </div>
        )}

        {/* High-quality Preview Image */}
        {previewImage && !previewError ? (
          <img
            src={previewImage}
            alt={item.title || domain}
            loading="lazy"
            onLoad={() => setPreviewLoaded(true)}
            onError={() => {
              setPreviewError(true);
              setPreviewLoaded(true);
            }}
            className={`w-full h-full object-cover object-top transition-all duration-500 group-hover:scale-105 ${
              previewLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (
          /* High-Craft Fallback Graphic Banner when screenshot cannot be fetched */
          <div className={`w-full h-full p-4 bg-gradient-to-br ${categoryAccent.bg} flex flex-col justify-between`}>
            <div className="flex items-center gap-1.5 opacity-60">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="ml-1 text-[10px] font-mono text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
                {domain}
              </span>
            </div>
            <div className="my-auto py-1">
              <div className="flex items-center gap-2">
                <CategoryIconComponent className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-2">
                  {item.title || domain}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Subtle Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Top Header Pill Bar (Favicon & Domain + Category / Platform Badge) */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 min-w-0 max-w-[70%]">
            <div className="p-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 shadow-xs flex items-center justify-center shrink-0">
              {!faviconError ? (
                <img
                  src={favicon}
                  alt={domain}
                  className="w-3.5 h-3.5 rounded object-contain"
                  onError={() => setFaviconError(true)}
                />
              ) : (
                <Globe className="w-3.5 h-3.5 text-white/80" />
              )}
            </div>
            <span
              className="px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-white text-[10px] font-bold border border-white/20 truncate"
              title={domain}
            >
              {domain}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {snapshot ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/90 backdrop-blur-md text-gray-950 text-[9px] font-bold border border-amber-300/40 flex items-center gap-1 shadow-xs">
                <Camera className="w-2.5 h-2.5" /> Snapshot
              </span>
            ) : isRaindrop ? (
              <span className="px-2 py-0.5 rounded-full bg-[#0089FF]/80 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                Raindrop
              </span>
            ) : isPinterest ? (
              <span className="px-2 py-0.5 rounded-full bg-[#E60023]/80 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                Pin
              </span>
            ) : isPocket ? (
              <span className="px-2 py-0.5 rounded-full bg-[#ef4444]/80 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                Pocket
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-white text-[10px] font-bold border border-white/20 flex items-center gap-1">
                <CategoryIconComponent className="w-2.5 h-2.5" />
                <span className="hidden xs:inline">{meta.category.split(' ')[0]}</span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom Preview Overlay Info: Estimated Read Time */}
        {meta.readMinutes ? (
          <div className="absolute bottom-2 right-2.5 z-10">
            <span className="px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-gray-300 text-[9px] font-mono border border-white/10">
              ~{meta.readMinutes} min read
            </span>
          </div>
        ) : null}
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {/* Title */}
          <h3
            className="text-xs font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors"
            title={item.title}
          >
            {item.title || domain}
          </h3>

          {/* Smart Synopsis / Excerpt */}
          {meta.smartSynopsis && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed font-normal">
              {meta.smartSynopsis}
            </p>
          )}

          {/* User Sticky Note (if attached) */}
          {notes && (
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed space-y-0.5 shadow-2xs">
              <div className="flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                <StickyNote className="w-2.5 h-2.5" /> Note
              </div>
              <p className="line-clamp-2 italic">{notes}</p>
            </div>
          )}

          {/* Folder / Category Pill if present */}
          {item.category && item.category !== 'Unsorted' && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <Folder className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="truncate">{item.category}</span>
            </div>
          )}
        </div>

        {/* Card Footer: Tags, Date/Time, & Quick Actions */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 space-y-2">
          {/* Smart & User Tags */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <span
                  key={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectTag) onSelectTag(tag);
                  }}
                  className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-[9px] font-medium transition-colors cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Bottom Bar: Timestamps, Palette Dots, and Actions */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            {/* Timestamp & Date */}
            <div className="flex items-center gap-1 text-[10px] font-mono text-gray-400 dark:text-gray-500">
              {dateStr && <span>{dateStr}</span>}
              {dateStr && timeStr && <span>•</span>}
              {timeStr && <span>{timeStr}</span>}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-0.5">
              {/* Palette dots */}
              <div className="hidden sm:flex items-center gap-0.5 mr-1 opacity-60 group-hover:opacity-100 transition-opacity">
                {meta.palette.slice(0, 3).map((c, idx) => (
                  <span
                    key={idx}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Copy URL button */}
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                title="Copy Link URL"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Edit Details button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEdit(item);
                }}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                title="Edit notes & tags"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              {/* Open external link button */}
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-sky-500 transition-colors cursor-pointer"
                  title="Open URL in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
