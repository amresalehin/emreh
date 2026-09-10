import React, { useState, useMemo } from 'react';
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  StickyNote,
  Camera,
  Tag
} from 'lucide-react';
import { TimelineItem } from '../../../types';
import { extractDomain, getPreviewImageUrl } from '../../../utils/urlMetadata';
import { formatTime } from '../../../utils/dataParser';
import { BrowserDisplayOptions, BrowserLayoutMode } from './BrowserViewMenu';
import { openFaviconFor } from '../../../utils/faviconModalHelper';

interface BrowserCardProps {
  item: TimelineItem;
  isSelected: boolean;
  layoutMode: BrowserLayoutMode;
  viewScope: 'day' | 'all';
  displayOptions: BrowserDisplayOptions;
  visitCount: number;
  userNote?: string;
  userTags?: string[];
  customSnapshot?: string;
  onSelect: (item: TimelineItem) => void;
  onShowDomainProfile: (domain: string) => void;
  onTagClick?: (tag: string) => void;
  onFaviconClick?: (item: TimelineItem) => void;
}

export const BrowserCard: React.FC<BrowserCardProps> = React.memo(({
  item,
  isSelected,
  layoutMode,
  viewScope,
  displayOptions,
  visitCount,
  userNote,
  userTags = [],
  customSnapshot,
  onSelect,
  onShowDomainProfile,
  onTagClick,
  onFaviconClick
}) => {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

  const url = item.url || '';
  const domain = item.domain || extractDomain(url);
  const favicon =
    item.favicon_url ||
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

  const timeStr = item.dateObj ? formatTime(item.dateObj) : '';
  const dateStr = item.dateObj
    ? item.dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';

  const previewImage = useMemo(() => {
    return customSnapshot || getPreviewImageUrl(url, item.title);
  }, [customSnapshot, url, item.title]);

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleCardClick = () => {
    onSelect(item);
  };

  const handleFaviconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFaviconClick) {
      onFaviconClick(item);
    } else {
      openFaviconFor({
        title: item.title,
        domain,
        url,
        description: item.description || userNote || `Favicon preview and metadata for ${domain}. Click 'Visit Site' to open this page in a new tab.`,
        category: item.platform || 'Browser History'
      });
    }
  };

  // Compact Layout Mode
  if (layoutMode === 'compact') {
    return (
      <div
        onClick={handleCardClick}
        className={`group flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
          isSelected
            ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-500/10 dark:bg-sky-500/20 shadow-sm'
            : 'bg-white/60 dark:bg-black/35 backdrop-blur-md border-black/5 dark:border-white/10 hover:border-sky-500/40 hover:shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {displayOptions.showFavicon && (
            <img
              src={favicon}
              alt=""
              onClick={handleFaviconClick}
              className="w-4 h-4 rounded shrink-0 bg-white dark:bg-black object-contain border border-black/5 dark:border-white/5 cursor-pointer hover:scale-125 transition-transform"
              title="Click to enlarge favicon & view description"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          )}
          <div className="min-w-0 flex-1">
            <h4
              className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-sky-500 transition-colors"
              title={item.title}
            >
              {item.title}
            </h4>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
              {displayOptions.showDomainBadge && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowDomainProfile(domain);
                  }}
                  className="text-sky-600 dark:text-sky-400 font-semibold hover:underline cursor-pointer truncate max-w-[120px]"
                >
                  {domain}
                </span>
              )}
              {displayOptions.showTimestamp && (
                <span>
                  {timeStr} {viewScope === 'all' && dateStr && `• ${dateStr}`}
                </span>
              )}
              {userNote && (
                <span className="text-amber-500 flex items-center gap-0.5">
                  <StickyNote className="w-2.5 h-2.5" /> Note
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {displayOptions.showVisitCountBadge && visitCount > 1 && (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono">
              {visitCount}x
            </span>
          )}

          {displayOptions.showActionButtons && url && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleCopyUrl}
                className="p-1 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                title="Copy URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Cards / Moodboard Layout Mode
  if (layoutMode === 'cards' || layoutMode === 'moodboard') {
    return (
      <div
        onClick={handleCardClick}
        className={`group flex flex-col justify-between bg-white/60 dark:bg-black/35 backdrop-blur-md rounded-2xl overflow-hidden cursor-pointer transition-all border ${
          isSelected
            ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-500/10 dark:bg-sky-500/20 shadow-sm'
            : 'border-black/5 dark:border-white/10 hover:border-sky-500/40 hover:shadow-xs'
        } p-3 space-y-2`}
      >
        {/* Snapshot / Preview Hero Banner */}
        {displayOptions.showSnapshotBadge && (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900/80 shrink-0 border border-black/5 dark:border-white/10 flex items-center justify-center">
            {previewImage && !imageError ? (
              <img
                src={previewImage}
                alt=""
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3 bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent">
                {displayOptions.showFavicon && (
                  <img
                    src={favicon}
                    alt=""
                    onClick={handleFaviconClick}
                    className="w-7 h-7 rounded-lg object-contain bg-white dark:bg-black/60 p-1 shadow-2xs cursor-pointer hover:scale-125 transition-transform"
                    title="Click to enlarge favicon & view description"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate max-w-[90%]">
                  {domain}
                </span>
              </div>
            )}

            {/* Overlaid Badges */}
            <div className="absolute top-2 right-2 flex items-center gap-1">
              {displayOptions.showVisitCountBadge && visitCount > 1 && (
                <span className="px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[9px] font-bold text-white font-mono border border-white/10 shadow-xs">
                  {visitCount}x
                </span>
              )}
              {customSnapshot && (
                <span className="p-1 rounded-md bg-emerald-600 text-white shadow-xs" title="Captured Snapshot">
                  <Camera className="w-2.5 h-2.5" />
                </span>
              )}
              {userNote && (
                <span className="p-1 rounded-md bg-amber-500 text-white shadow-xs" title="Has Note">
                  <StickyNote className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
          </div>
        )}

        {/* Card Body */}
        <div className="flex-1 flex flex-col justify-between space-y-2">
          <div>
            <h4
              className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-sky-500 transition-colors"
              title={item.title}
            >
              {item.title}
            </h4>

            {displayOptions.showDomainBadge && (
              <p
                onClick={(e) => {
                  e.stopPropagation();
                  onShowDomainProfile(domain);
                }}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 truncate mt-1 hover:underline cursor-pointer flex items-center gap-1.5"
              >
                {displayOptions.showFavicon && (
                  <img
                    src={favicon}
                    alt=""
                    onClick={handleFaviconClick}
                    className="w-3.5 h-3.5 rounded object-contain shrink-0 cursor-pointer hover:scale-125 transition-transform"
                    title="Click to enlarge favicon & view description"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
                <span className="truncate">{domain}</span>
              </p>
            )}
          </div>

          {/* Tags */}
          {userTags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              {userTags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagClick?.(tag);
                  }}
                  className="text-[9px] px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium hover:bg-sky-500/20 cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
              {userTags.length > 2 && (
                <span className="text-[9px] text-gray-400 font-mono">+{userTags.length - 2}</span>
              )}
            </div>
          )}

          {/* Bottom Row */}
          <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-gray-800/80 text-[10px] text-gray-400 font-mono">
            {displayOptions.showTimestamp ? (
              <span>
                {timeStr} {viewScope === 'all' && dateStr && `• ${dateStr}`}
              </span>
            ) : <span />}

            {displayOptions.showActionButtons && url && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyUrl}
                  className="p-1 rounded text-gray-400 hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                  title="Copy URL"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded text-gray-400 hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                  title="Open Link"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Feed Layout Mode (Default Detailed Card)
  return (
    <div
      onClick={handleCardClick}
      className={`group bg-white/60 dark:bg-black/35 backdrop-blur-md rounded-2xl cursor-pointer transition-all border ${
        isSelected
          ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-500/10 dark:bg-sky-500/20 shadow-sm'
          : 'border-black/5 dark:border-white/10 hover:border-sky-500/40 hover:shadow-xs'
      } p-3 sm:p-3.5 space-y-2.5`}
    >
      {/* Card Header Row */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Favicon & Domain */}
          {displayOptions.showDomainBadge && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onShowDomainProfile(domain);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:text-sky-500 dark:hover:text-sky-400 cursor-pointer"
            >
              {displayOptions.showFavicon && (
                <img
                  src={favicon}
                  alt=""
                  onClick={handleFaviconClick}
                  className="w-4 h-4 rounded object-contain bg-white dark:bg-black shrink-0 cursor-pointer hover:scale-125 transition-transform"
                  title="Click to enlarge favicon & view description"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              <span className="truncate max-w-[150px]">{domain}</span>
            </span>
          )}

          {/* Global Visit Count Badge */}
          {displayOptions.showVisitCountBadge && visitCount > 1 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono">
              {visitCount} visits
            </span>
          )}

          {/* Snapshot Badge */}
          {displayOptions.showSnapshotBadge && customSnapshot && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Camera className="w-2.5 h-2.5" /> Snapshot
            </span>
          )}

          {/* Note Indicator */}
          {userNote && (
            <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <StickyNote className="w-2.5 h-2.5" /> Note
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {displayOptions.showTimestamp && (
            <span className="text-[10px] font-mono text-gray-400">
              {timeStr} {viewScope === 'all' && dateStr && `• ${dateStr}`}
            </span>
          )}

          {displayOptions.showActionButtons && url && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleCopyUrl}
                className="p-1 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                title="Copy URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Card Content Row */}
      <div className="flex gap-3 items-start">
        {displayOptions.showSnapshotBadge && (
          <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden relative shrink-0 border border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 shadow-inner group-hover:scale-102 transition-transform flex items-center justify-center">
            {previewImage && !imageError ? (
              <img
                src={previewImage}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-2 text-center text-gray-400">
                <Globe className="w-5 h-5 opacity-40 text-sky-500" />
              </div>
            )}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <h4
            className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-sky-500 transition-colors"
            title={item.title}
          >
            {item.title}
          </h4>

          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate" title={url}>
            {url}
          </p>

          {/* Tags */}
          {userTags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              {userTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagClick?.(tag);
                  }}
                  className="text-[9px] px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 cursor-pointer font-medium"
                >
                  #{tag}
                </span>
              ))}
              {userTags.length > 3 && (
                <span className="text-[9px] text-gray-400 font-mono">+{userTags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
