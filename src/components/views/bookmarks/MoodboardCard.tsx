import React, { useState, useMemo } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Edit3,
  Trash2,
  Tag,
  Clock,
  Folder,
  Globe,
  Camera,
  Layers,
  ArrowRightLeft,
  Move,
  GripVertical
} from 'lucide-react';
import { TimelineItem } from '../../../types';
import { extractDomain, extractUrlMetadata, getPreviewImageUrl } from '../../../utils/urlMetadata';
import { formatTime } from '../../../utils/dataParser';
import { MoodboardDisplayConfig, DEFAULT_MOODBOARD_CONFIG } from './RaindropViewMenu';
import { openFaviconFor } from '../../../utils/faviconModalHelper';

export interface MoodboardCardProps {
  item: TimelineItem;
  notes?: string;
  tags?: string[];
  snapshot?: string;
  config?: MoodboardDisplayConfig;
  isSelected?: boolean;
  onSelect?: (item: TimelineItem) => void;
  onCopyLink: (url: string) => void;
  onOpenEdit: (item: TimelineItem) => void;
  onSelectTag?: (tag: string) => void;
  onDeleteItem?: (id: string) => void;
  onMoveToColumn?: (item: TimelineItem, targetColumnId: string) => void;
  availableColumns?: { id: string; label: string }[];
  currentColumnId?: string;
  isDraggable?: boolean;
  copiedUrl?: string | null;
}

export const MoodboardCard: React.FC<MoodboardCardProps> = ({
  item,
  notes,
  tags = [],
  snapshot,
  config = DEFAULT_MOODBOARD_CONFIG,
  isSelected = false,
  onSelect,
  onCopyLink,
  onOpenEdit,
  onSelectTag,
  onDeleteItem,
  onMoveToColumn,
  availableColumns = [],
  currentColumnId,
  isDraggable = true,
  copiedUrl
}) => {
  const [localCopied, setLocalCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const url = item.url || '';
  const domain = item.domain || extractDomain(url);
  const isCopied = (copiedUrl === url) || localCopied;

  // Rich metadata
  const meta = useMemo(() => extractUrlMetadata(url, item.title), [url, item.title]);

  // Preview image: snapshot -> item.cover -> URL screenshot
  const previewImage = useMemo(() => {
    return snapshot || item.cover || item.image_url || getPreviewImageUrl(url, item.title);
  }, [snapshot, item.cover, item.image_url, url, item.title]);

  // Combined tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    tags.forEach(t => set.add(t));
    meta.smartTags.forEach(t => set.add(t.replace(/^#/, '')));
    return Array.from(set);
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

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.setData('application/json', JSON.stringify({ itemId: item.id, fromCol: currentColumnId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const favicon =
    item.favicon_url ||
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

  // Aspect ratio description
  const aspectDesc = useMemo(() => {
    if (!naturalDimensions) return null;
    const { width, height } = naturalDimensions;
    const ratio = width / height;
    if (ratio > 1.4) return 'Wide';
    if (ratio < 0.8) return 'Tall';
    return 'Square';
  }, [naturalDimensions]);

  return (
    <div
      id={`moodboard-card-${item.id}`}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMoveMenu(false);
      }}
      onClick={() => onSelect?.(item)}
      className={`group relative bg-white dark:bg-[#18181b] rounded-2xl border transition-all duration-200 select-none overflow-hidden cursor-pointer ${
        isSelected
          ? 'ring-2 ring-[#0089FF] border-[#0089FF] shadow-lg scale-[1.01]'
          : 'border-gray-200/80 dark:border-white/10 shadow-2xs hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-500/40 hover:-translate-y-0.5'
      }`}
    >
      {/* 1. UNCROPPED, UNSTRETCHED IMAGE CONTAINER */}
      {/* The image is rendered with its natural aspect ratio: w-full h-auto object-contain.
          It is NOT cropped with object-cover or forced fixed height. The image dimensions decide the board card size! */}
      {config.showCover && previewImage && !imgError && (
        <div className="relative w-full bg-neutral-100 dark:bg-[#121214] overflow-hidden flex items-center justify-center">
          <img
            src={previewImage}
            alt={item.title || domain}
            loading="lazy"
            onLoad={(e) => {
              setImgLoaded(true);
              setNaturalDimensions({
                width: e.currentTarget.naturalWidth,
                height: e.currentTarget.naturalHeight
              });
            }}
            onError={() => {
              setImgError(true);
              setImgLoaded(true);
            }}
            className={`w-full h-auto object-contain block transition-opacity duration-300 ${
              imgLoaded ? 'opacity-100' : 'opacity-0 min-h-[140px]'
            }`}
          />

          {/* Shimmer placeholder while image loads */}
          {!imgLoaded && (
            <div className="absolute inset-0 min-h-[140px] bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 dark:from-neutral-800 dark:via-neutral-850 dark:to-neutral-800 animate-pulse flex items-center justify-center">
              <Globe className="w-5 h-5 text-gray-400" />
            </div>
          )}

          {/* Subtle Aspect Ratio Badge: shows that image is uncropped and dictates board size */}
          {naturalDimensions && (
            <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[9px] font-mono tracking-wide shadow-xs">
                {naturalDimensions.width}×{naturalDimensions.height} · {aspectDesc}
              </span>
            </div>
          )}

          {/* Top-Right Quick Action Overlay */}
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-black/70 backdrop-blur-md hover:bg-black/90 text-white shadow-xs transition-transform active:scale-90"
              title="Copy URL"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-[#0089FF] hover:bg-[#0070e0] text-white shadow-xs transition-transform active:scale-90"
              title="Open Link in New Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Drag Handle Icon on hover */}
          {isDraggable && (
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-80 transition-opacity p-1 rounded-md bg-black/60 text-white/80 pointer-events-none">
              <GripVertical className="w-3 h-3" />
            </div>
          )}
        </div>
      )}

      {/* Fallback Graphic Header when Cover is enabled but image failed */}
      {config.showCover && (!previewImage || imgError) && (
        <div className="w-full py-6 px-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/30 border-b border-gray-100 dark:border-white/5 flex flex-col justify-between items-start relative">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[11px] font-mono font-bold text-gray-700 dark:text-gray-300">
              {domain}
            </span>
          </div>
          {isDraggable && (
            <div className="absolute top-2 right-2 text-gray-400">
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      )}

      {/* 2. CARD BODY & METADATA CONTENT (configured by Show in Moodboard toggles) */}
      <div className="p-3.5 space-y-2.5">
        {/* Title */}
        {config.showTitle && (
          <h3 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {item.title || domain}
          </h3>
        )}

        {/* Note */}
        {config.showNote && (notes || item.description) && (
          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-2 text-[11px] text-amber-950 dark:text-amber-200 font-medium">
            <p className="line-clamp-3 italic">
              "{notes || item.description}"
            </p>
          </div>
        )}

        {/* Description / Synopsis */}
        {config.showDescription && (item.subtitle || meta.smartSynopsis) && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {item.subtitle || meta.smartSynopsis}
          </p>
        )}

        {/* Highlights */}
        {config.showHighlights && (
          <div className="bg-yellow-500/10 border-l-2 border-yellow-500 pl-2 py-1 text-[10px] text-yellow-800 dark:text-yellow-300 italic line-clamp-2">
            Key insight: {item.title}
          </div>
        )}

        {/* Tags */}
        {config.showTags && allTags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            {allTags.slice(0, 3).map((t, idx) => (
              <button aria-label="Action"
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTag?.(t);
                }}
                className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 text-[10px] font-semibold text-gray-600 dark:text-gray-400 transition-colors"
              >
                #{t}
              </button>
            ))}
            {allTags.length > 3 && (
              <span className="text-[10px] text-gray-400 font-medium">
                +{allTags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Bookmark Info (Domain, Favicon, Collection, Date) */}
        {config.showBookmarkInfo && (
          <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-2 text-[10px] text-gray-400">
            <div className="flex items-center gap-1.5 min-w-0">
              <img
                src={favicon}
                alt={domain}
                onClick={(e) => {
                  e.stopPropagation();
                  openFaviconFor({
                    title: item.title,
                    domain,
                    url: item.url,
                    description: item.description || notes || `Favicon and domain asset for ${domain}. Click 'Visit Site' to open this link.`,
                    category: item.category || 'Bookmark'
                  });
                }}
                className="w-3.5 h-3.5 rounded-sm object-contain shrink-0 cursor-pointer hover:scale-125 transition-transform"
                title="Click to enlarge favicon & view description"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="truncate font-medium text-gray-600 dark:text-gray-400">
                {domain}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {item.category && item.category !== 'Unsorted' && (
                <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold truncate max-w-[90px]">
                  {item.category}
                </span>
              )}
              {dateStr && (
                <span className="text-gray-400">{dateStr}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. CARD BOTTOM ACTION BAR (Move column, Edit, Delete) */}
      <div className="px-3.5 pb-3 flex items-center justify-between pt-1 border-t border-gray-50 dark:border-white/[0.03]">
        {/* Quick Move Column Dropdown Button */}
        {availableColumns.length > 1 && onMoveToColumn && (
          <div className="relative">
            <button aria-label="Action"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMoveMenu(prev => !prev);
              }}
              className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Move to column"
            >
              <ArrowRightLeft className="w-3 h-3 text-indigo-500" />
              <span>Move</span>
            </button>

            {/* Move Column Popover */}
            {showMoveMenu && (
              <div
                className="absolute bottom-full left-0 mb-1 w-44 rounded-xl bg-[#202124] border border-neutral-700 shadow-xl p-1 z-30 space-y-0.5 animate-in fade-in slide-in-from-bottom-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider">
                  Move to column
                </div>
                {availableColumns.map(col => (
                  <button aria-label="Action"
                    key={col.id}
                    type="button"
                    onClick={() => {
                      onMoveToColumn(item, col.id);
                      setShowMoveMenu(false);
                    }}
                    className={`w-full px-2 py-1 rounded-lg text-left text-xs transition-colors flex items-center justify-between ${
                      col.id === currentColumnId
                        ? 'bg-[#0089FF] text-white font-bold'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{col.label}</span>
                    {col.id === currentColumnId && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Right Action Icons: Edit & Delete */}
        <div className="flex items-center gap-1 ml-auto">
          <button aria-label="Action"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenEdit(item);
            }}
            className="p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Edit note & tags"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {onDeleteItem && (
            <button aria-label="Action"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteItem(item.id);
              }}
              className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Delete bookmark"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
