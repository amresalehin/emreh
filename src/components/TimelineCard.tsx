import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Headphones, Youtube, MapPin, Globe, BarChart2, ExternalLink, Eye, Play, Map as MapIcon, Camera, Star, User } from 'lucide-react';
import { TimelineItem } from '../types';
import { buildGoogleMapsEmbedUrl, buildGoogleMapsUrl, formatTime, isGenericPlaceName } from '../utils/dataParser';
import { extractDomain, extractUrlMetadata } from '../utils/urlMetadata';
import { SpotifyCoverArt } from './SpotifyCoverArt';

interface TimelineCardProps {
  item: TimelineItem;
  isSelected?: boolean;
  onSelectBrowser?: (item: TimelineItem) => void;
  onSelectYouTube?: (item: TimelineItem) => void;
  onSelectSpotify?: (item: TimelineItem) => void;
  onSelectPhoto?: (item: TimelineItem) => void;
  onShowTrackProfile?: (track: string, artist?: string) => void;
  onShowArtistProfile?: (artist: string) => void;
  onShowVideoProfile?: (title: string, channel?: string) => void;
  onShowChannelProfile?: (channel: string) => void;
  onShowDomainProfile?: (domain: string) => void;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
  onResolveGeo?: (lat: number, lng: number) => void;
}

export const TimelineCard: React.FC<TimelineCardProps> = React.memo(({
  item,
  isSelected = false,
  onSelectBrowser,
  onSelectYouTube,
  onSelectSpotify,
  onSelectPhoto,
  onShowTrackProfile,
  onShowArtistProfile,
  onShowVideoProfile,
  onShowChannelProfile,
  onShowDomainProfile,
  onOpenMapModal,
  onResolveGeo
}) => {
  const [showEmbed, setShowEmbed] = useState(false);
  const timeStr = item.dateObj ? formatTime(item.dateObj) : '';

  // Render location badge for geo-correlated timeline items
  const renderLocationBadge = () => {
    const loc = item.correlatedLocation;
    if (!loc) return null;
    return (
      <button
        aria-label="Correlated Location"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onOpenMapModal) {
            const embed = buildGoogleMapsEmbedUrl({ lat: loc.lat, lng: loc.lng, title: loc.placeName, subtitle: loc.address } as any);
            const ext = buildGoogleMapsUrl({ lat: loc.lat, lng: loc.lng, title: loc.placeName, subtitle: loc.address } as any);
            onOpenMapModal(loc.placeName, loc.address || '', embed, ext);
          } else if (onResolveGeo) {
            onResolveGeo(loc.lat, loc.lng);
          }
        }}
        className="inline-flex items-center gap-1 font-sans text-xs tracking-wide uppercase px-2 py-0.5 rounded-full bg-[#d4a373]/10 hover:bg-[#d4a373]/20 text-[#d4a373] ring-1 ring-[#d4a373]/25 transition-all cursor-pointer shadow-2xs hover:scale-102"
        title={`Location correlation: ${loc.placeName} (${loc.method === 'exact_stop' ? 'At location' : loc.method === 'route_segment' ? 'In transit' : `~${loc.timeDeltaMinutes}m delta`})`}
      >
        <MapPin className="w-2.5 h-2.5 text-[#d4a373] shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-[160px]">{loc.placeName}</span>
        {loc.method === 'route_segment' && <span className="text-[9px] opacity-75">(transit)</span>}
      </button>
    );
  };

  const baseCardClasses = `relative rounded-2xl bg-[#171614]/70 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.35)] ring-1 ${
    isSelected
      ? 'ring-[#d4a373] bg-[#171614]/90 shadow-[0_6px_28px_rgba(212,163,115,0.15)]'
      : 'ring-white/[0.05] hover:ring-white/[0.12]'
  } backdrop-blur-md transition-all duration-300 space-y-3 cursor-pointer group`;

  // 1. Browser Item
  if (item.type === 'browser') {
    const domain = item.domain || extractDomain(item.url || '');
    const favicon = item.favicon_url || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
    const url = item.url || '#';
    const meta = extractUrlMetadata(url, item.title);

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        onClick={() => onSelectBrowser && onSelectBrowser(item)}
        className={baseCardClasses}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-sans text-xs tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-white/[0.04] text-neutral-300 ring-1 ring-white/[0.06]">
              <Globe className="w-3 h-3 text-[#d4a373]" /> {domain}
            </span>
            {meta.category && (
              <span className="inline-flex items-center font-sans text-xs tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/[0.02] text-neutral-400">
                {meta.category}
              </span>
            )}
            {renderLocationBadge()}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs tracking-wide uppercase text-neutral-400">{timeStr}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                aria-label="Action"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBrowser && onSelectBrowser(item);
                }}
                className="px-2 py-0.5 bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 rounded-md font-sans text-xs tracking-wide transition-colors flex items-center gap-1 cursor-pointer"
                title="Show Preview on right side"
              >
                <Eye className="w-3 h-3 text-[#d4a373]" /> Preview
              </button>
              <button
                aria-label="Action"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowDomainProfile && onShowDomainProfile(domain);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                title="Domain Analytics"
              >
                <BarChart2 className="w-3.5 h-3.5" />
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
                title="Open URL in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <img
            alt="Favicon"
            src={favicon}
            className="w-5 h-5 rounded mt-0.5 shrink-0 bg-white/[0.03] object-contain p-0.5 ring-1 ring-white/[0.05]"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-serif font-medium text-sm sm:text-base text-neutral-100 line-clamp-1 group-hover:text-[#d4a373] transition-colors" title={item.title}>
              {item.title}
            </h4>
            <div className="text-xs text-neutral-400 truncate block group-hover:underline mt-0.5 font-sans font-normal tracking-wide">
              {url}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // 2. Spotify Item
  if (item.type === 'spotify') {
    const trackId = item.trackId;
    const shouldShowPlayer = showEmbed || isSelected;

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        onClick={() => onSelectSpotify && onSelectSpotify(item)}
        className={baseCardClasses}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 font-sans text-xs tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-[#d4a373]/10 text-[#d4a373] ring-1 ring-[#d4a373]/20">
              <Headphones className="w-3 h-3" /> Spotify
            </span>
            {item.album && (
              <span className="inline-flex items-center font-sans text-xs tracking-wide text-neutral-400 px-2 py-0.5 rounded-full bg-white/[0.02] truncate max-w-[150px]">
                {item.album}
              </span>
            )}
            {renderLocationBadge()}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs tracking-wide uppercase text-neutral-400">{timeStr}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {trackId && (
                <button
                  aria-label="Play Track Preview"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmbed(!showEmbed);
                  }}
                  className={`px-2.5 py-0.5 rounded-md font-sans text-xs tracking-wide transition-colors flex items-center gap-1 cursor-pointer ${
                    shouldShowPlayer
                      ? 'bg-[#d4a373] text-neutral-950 font-medium'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200'
                  }`}
                  title={shouldShowPlayer ? 'Close Player' : 'Play Track Preview'}
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  {shouldShowPlayer ? 'Close' : 'Play'}
                </button>
              )}
              <button
                aria-label="Track Profile"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowTrackProfile && onShowTrackProfile(item.title, item.subtitle);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                title="Track Profile & Analytics"
              >
                <BarChart2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <SpotifyCoverArt
            title={item.title}
            artist={item.subtitle}
            album={item.album}
            trackId={trackId}
            size="xs"
            className="w-11 h-11 rounded-xl shrink-0 ring-1 ring-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
          />
          <div className="min-w-0 flex-1">
            <h4
              onClick={(e) => {
                e.stopPropagation();
                onSelectSpotify ? onSelectSpotify(item) : onShowTrackProfile?.(item.title, item.subtitle);
              }}
              className="font-serif font-medium text-sm sm:text-base text-neutral-100 truncate cursor-pointer hover:text-[#d4a373] transition-colors"
            >
              {item.title}
            </h4>
            <p
              onClick={(e) => {
                e.stopPropagation();
                onShowArtistProfile && onShowArtistProfile(item.subtitle);
              }}
              className="font-sans text-xs font-medium text-[#d4a373] truncate cursor-pointer hover:underline mt-0.5"
            >
              {item.subtitle}
            </p>
          </div>
        </div>

        {trackId && shouldShowPlayer && (
          <div className="rounded-xl overflow-hidden ring-1 ring-white/[0.08] bg-black animate-in fade-in duration-200 mt-2">
            <iframe
              title="Spotify Embed"
              src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator`}
              width="100%"
              height="80"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        )}
      </motion.div>
    );
  }

  // 3. YouTube Item
  if (item.type === 'youtube') {
    const videoId = item.youtube_video_id;
    const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        onClick={() => onSelectYouTube && onSelectYouTube(item)}
        className={baseCardClasses}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 font-sans text-xs tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20">
              <Youtube className="w-3 h-3" /> YouTube
            </span>
            {renderLocationBadge()}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs tracking-wide uppercase text-neutral-400">{timeStr}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                aria-label="Inspect Video"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectYouTube && onSelectYouTube(item);
                }}
                className="px-2 py-0.5 bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 rounded-md font-sans text-xs tracking-wide transition-colors flex items-center gap-1 cursor-pointer"
                title="Inspect Video Analytics"
              >
                <Eye className="w-3 h-3 text-[#d4a373]" /> Inspect
              </button>
              <button
                aria-label="Video Profile"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowVideoProfile && onShowVideoProfile(item.title, item.subtitle);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                title="Video Analytics Modal"
              >
                <BarChart2 className="w-3.5 h-3.5" />
              </button>
              {item.titleUrl && (
                <a
                  href={item.titleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
                  title="Open in YouTube"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-start">
          {thumbUrl ? (
            <img
              alt="Video Thumbnail"
              src={thumbUrl}
              onClick={(e) => {
                e.stopPropagation();
                onSelectYouTube && onSelectYouTube(item);
              }}
              className="w-20 h-13 object-cover rounded-xl bg-black cursor-pointer group-hover:opacity-90 transition-opacity shrink-0 ring-1 ring-white/[0.08]"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectYouTube && onSelectYouTube(item);
              }}
              className="w-20 h-13 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center cursor-pointer shrink-0 ring-1 ring-rose-500/20"
            >
              <Youtube className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4
              onClick={(e) => {
                e.stopPropagation();
                onSelectYouTube && onSelectYouTube(item);
              }}
              className="font-serif font-medium text-sm sm:text-base text-neutral-100 line-clamp-2 leading-snug cursor-pointer group-hover:text-[#d4a373] transition-colors"
              title={item.title}
            >
              {item.title}
            </h4>
            <p
              onClick={(e) => {
                e.stopPropagation();
                onShowChannelProfile && onShowChannelProfile(item.subtitle);
              }}
              className="font-sans text-xs text-neutral-400 font-medium truncate cursor-pointer hover:underline mt-0.5"
            >
              {item.subtitle}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // 4. Maps Item
  if (item.type === 'maps') {
    const gmapsEmbedUrl = buildGoogleMapsEmbedUrl(item);
    const gmapsUrl = buildGoogleMapsUrl(item);
    const isGeneric = isGenericPlaceName(item.title);

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        className={baseCardClasses}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
          <span className="inline-flex items-center gap-1 font-sans text-xs tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-[#d4a373]/10 text-[#d4a373] ring-1 ring-[#d4a373]/20">
            <MapPin className="w-3 h-3" /> Maps
          </span>
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs tracking-wide uppercase text-neutral-400">{timeStr}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                aria-label="Preview Maps"
                onClick={() => onOpenMapModal && onOpenMapModal(item.title, item.subtitle, gmapsEmbedUrl, gmapsUrl)}
                className="px-2 py-0.5 bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 rounded-md font-sans text-xs tracking-wide transition-colors flex items-center gap-1 cursor-pointer"
                title="Preview on Google Maps"
              >
                <MapIcon className="w-3 h-3 text-[#d4a373]" /> Preview
              </button>
              <a
                href={gmapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
                title="Open in Google Maps"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-medium text-sm sm:text-base text-neutral-100 truncate group-hover:text-[#d4a373] transition-colors">
              {item.title}
            </span>
            {isGeneric && item.lat != null && item.lng != null && onResolveGeo && (
              <button
                aria-label="Resolve"
                onClick={() => onResolveGeo(item.lat!, item.lng!)}
                className="font-sans text-[10px] tracking-wider uppercase bg-[#d4a373]/20 hover:bg-[#d4a373]/30 text-[#d4a373] px-2 py-0.5 rounded-full font-semibold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Resolve
              </button>
            )}
          </div>
          <p className="font-sans text-xs text-neutral-400 font-normal truncate mt-0.5">{item.subtitle}</p>
        </div>
      </motion.div>
    );
  }

  // 5. Google Photos Item
  if (item.type === 'photo') {
    const photoSrc = item.thumbnailUrl || item.photoUrl || item.localBlobUrl;

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        onClick={() => onSelectPhoto && onSelectPhoto(item)}
        className={baseCardClasses}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 font-sans text-xs tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20">
              <Camera className="w-3 h-3 text-[#d4a373]" />
              <span>Google Photos</span>
            </span>
            {item.camera && (
              <span className="hidden sm:inline-flex items-center gap-1 font-sans text-xs tracking-wide uppercase text-neutral-400 bg-white/[0.02] px-2 py-0.5 rounded-full">
                <span className="truncate max-w-[120px]">{item.camera}</span>
              </span>
            )}
            {renderLocationBadge()}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs tracking-wide uppercase text-neutral-400">{timeStr}</span>
            {item.favorite && (
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {item.lat != null && item.lng != null && onOpenMapModal && (
                <button
                  aria-label="View Location on Map"
                  onClick={(e) => {
                    e.stopPropagation();
                    const embed = buildGoogleMapsEmbedUrl(item);
                    const ext = buildGoogleMapsUrl(item);
                    onOpenMapModal(item.title, item.subtitle, embed, ext);
                  }}
                  className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
                  title="View Location on Map"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#d4a373]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Thumbnail and Details */}
        <div className="flex gap-3 items-start">
          {photoSrc && (
            <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-neutral-900 shrink-0 ring-1 ring-white/[0.08]">
              <img
                src={photoSrc}
                alt={item.title || 'Google Photos'}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
              </div>
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <h4 className="font-serif font-medium text-sm sm:text-base text-neutral-100 line-clamp-2 leading-snug group-hover:text-[#d4a373] transition-colors">
              {item.title || 'Photo Memory'}
            </h4>
            {item.description && item.description !== item.title && (
              <p className="font-serif italic text-xs sm:text-sm text-neutral-300 line-clamp-2 leading-relaxed">
                "{item.description}"
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap font-sans text-xs tracking-wide uppercase text-neutral-400 pt-1">
              {item.album && (
                <span className="bg-white/[0.04] px-2 py-0.5 rounded-full text-neutral-300 truncate max-w-[140px]">
                  {item.album}
                </span>
              )}
              {item.lat != null && item.lng != null && (
                <span className="flex items-center gap-1 text-[#d4a373]">
                  <MapPin className="w-2.5 h-2.5" />
                  <span>Geo-tagged</span>
                </span>
              )}
              {item.people && item.people.length > 0 && (
                <span className="flex items-center gap-1 text-neutral-300">
                  <User className="w-2.5 h-2.5" />
                  <span>{item.people.join(', ')}</span>
                </span>
              )}
              {item.formattedFileSize && (
                <span className="text-neutral-500 font-mono ml-auto">{item.formattedFileSize}</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
});

TimelineCard.displayName = 'TimelineCard';
