import React, { useState, useMemo } from 'react';
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  StickyNote,
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
  Image as ImageIcon
} from 'lucide-react';
import { TimelineItem } from '../types';
import { extractDomain, extractUrlMetadata, getPreviewImageUrl } from '../utils/urlMetadata';
import { formatTime } from '../utils/dataParser';

interface BrowserMymindCardProps {
  item: TimelineItem;
  isSelected?: boolean;
  onSelect: (item: TimelineItem) => void;
  onShowDomainProfile: (domain: string) => void;
  onTagClick?: (tag: string) => void;
  userNote?: string;
  userTags?: string[];
  customSnapshot?: string;
  showTimestamp?: boolean;
  showDomainBadge?: boolean;
  showFavicon?: boolean;
  showSnapshotBadge?: boolean;
  onOpenDirectly?: (url: string) => void;
}

export const BrowserMymindCard: React.FC<BrowserMymindCardProps> = React.memo(({
  item,
  isSelected = false,
  onSelect,
  onShowDomainProfile,
  onTagClick,
  userNote,
  userTags = [],
  customSnapshot,
  showTimestamp = true,
  showDomainBadge = true,
  showFavicon = true,
  showSnapshotBadge = true
}) => {
  const [copied, setCopied] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  const url = item.url || '';
  const domain = item.domain || extractDomain(url);
  const favicon =
    item.favicon_url ||
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  const meta = useMemo(() => extractUrlMetadata(url, item.title), [url, item.title]);
  const previewImage = useMemo(
    () => customSnapshot || getPreviewImageUrl(url, item.title),
    [customSnapshot, url, item.title]
  );

  const timeStr = item.dateObj ? formatTime(item.dateObj) : '';
  const dateStr = item.dateObj
    ? item.dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  // Pick category icon
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

  // Determine category-based accent styles
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

  const allTags = useMemo(() => {
    const combined = [...(userTags || [])];
    meta.smartTags.forEach((t) => {
      const clean = t.replace(/^#/, '');
      if (!combined.includes(clean)) {
        combined.push(clean);
      }
    });
    return combined.slice(0, 4);
  }, [userTags, meta.smartTags]);

  return (
    <div
      onClick={() => onSelect(item)}
      className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden text-left bg-white dark:bg-[#151518] ${
        isSelected
          ? `ring-2 ${categoryAccent.activeRing} shadow-md`
          : `border-black/10 dark:border-white/12 shadow-xs hover:shadow-md ${categoryAccent.border} hover:-translate-y-0.5`
      }`}
    >
      {/* Top Visual Preview Area (mymind-style image / live card preview) */}
      <div className="relative w-full h-40 sm:h-44 bg-gray-100 dark:bg-gray-900 overflow-hidden border-b border-black/8 dark:border-white/10">
        {/* Placeholder / Skeleton Shimmer while loading */}
        {!previewLoaded && !previewError && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 animate-pulse flex items-center justify-center">
            <Globe className="w-6 h-6 text-gray-400 dark:text-gray-600" />
          </div>
        )}

        {/* Preview Image (Snapshot or Live Screenshot Thumbnail) */}
        {previewImage && !previewError ? (
          <img
            src={previewImage}
            alt={item.title || domain}
            loading="lazy"
            decoding="async"
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
          /* Generative High-Craft Fallback Banner when image cannot be fetched */
          <div className={`w-full h-full p-4 bg-gradient-to-br ${categoryAccent.bg} flex flex-col justify-between`}>
            <div className="flex items-center gap-1.5 opacity-80">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="ml-1 text-[10px] font-mono text-gray-700 dark:text-gray-300 font-bold truncate max-w-[140px]">
                {domain}
              </span>
            </div>
            <div className="my-auto py-1">
              <div className="flex items-center gap-2">
                <CategoryIconComponent className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <span className="text-xs font-bold text-gray-950 dark:text-white line-clamp-2">
                  {item.title || domain}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Subtle Vignette Overlay for Top Badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Top Header Pill Bar (Favicon & Domain + Category Badge) */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 min-w-0 max-w-[70%]">
            <div className="p-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 shadow-xs flex items-center justify-center shrink-0">
              {showFavicon && !faviconError ? (
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
            {showDomainBadge && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowDomainProfile(domain);
                }}
                className="px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-white text-[10px] font-bold border border-white/20 hover:border-white/40 truncate transition-colors"
                title={`Filter by ${domain}`}
              >
                {domain}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {customSnapshot && showSnapshotBadge ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/90 backdrop-blur-md text-gray-950 text-[9px] font-bold border border-amber-300/40 flex items-center gap-1 shadow-xs">
                <Camera className="w-2.5 h-2.5" /> Snapshot
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
            className="text-xs font-bold text-gray-950 dark:text-white leading-snug line-clamp-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors"
            title={item.title}
          >
            {item.title || domain}
          </h3>

          {/* Smart Synopsis / Excerpt (mymind note / excerpt quote) */}
          {meta.smartSynopsis && (
            <p className="text-[11px] text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed font-normal">
              {meta.smartSynopsis}
            </p>
          )}

          {/* User Sticky Note (if attached) */}
          {userNote && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-950 dark:text-amber-100 text-[11px] leading-relaxed space-y-0.5 shadow-2xs">
              <div className="flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider text-amber-800 dark:text-amber-300">
                <StickyNote className="w-2.5 h-2.5" /> Note
              </div>
              <p className="line-clamp-2 italic font-medium">{userNote}</p>
            </div>
          )}
        </div>

        {/* Card Footer: Tags, Date/Time, & Quick Actions */}
        <div className="pt-2 border-t border-black/8 dark:border-white/10 space-y-2">
          {/* Smart & User Tags */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <span
                  key={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onTagClick) onTagClick(tag);
                  }}
                  className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-[9px] font-semibold transition-colors cursor-pointer border border-black/5 dark:border-white/5"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Bottom Bar: Timestamps, Palette Dots, and Actions */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            {/* Timestamp & Date */}
            <div className="flex items-center gap-1 text-[10px] font-mono text-gray-700 dark:text-gray-300 font-medium">
              {showTimestamp && (
                <>
                  {dateStr && <span>{dateStr}</span>}
                  {dateStr && timeStr && <span>•</span>}
                  {timeStr && <span>{timeStr}</span>}
                </>
              )}
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
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
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
});

BrowserMymindCard.displayName = 'BrowserMymindCard';
