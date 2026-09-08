import React, { useState } from 'react';
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
        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer shadow-2xs hover:scale-102"
        title={`Location correlation: ${loc.placeName} (${loc.method === 'exact_stop' ? 'At location' : loc.method === 'route_segment' ? 'In transit' : `~${loc.timeDeltaMinutes}m delta`})`}
      >
        <MapPin className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-[160px]">{loc.placeName}</span>
        {loc.method === 'route_segment' && <span className="text-[9px] opacity-75">(transit)</span>}
      </button>
    );
  };

  // 1. Browser Item
  if (item.type === 'browser') {
    const domain = item.domain || extractDomain(item.url || '');
    const favicon = item.favicon_url || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
    const url = item.url || '#';
    const meta = extractUrlMetadata(url, item.title);

    return (
      <div
        onClick={() => onSelectBrowser && onSelectBrowser(item)}
        className={`bg-white/85 dark:bg-[#18181b]/80 backdrop-blur-md border ${
          isSelected
            ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-500/10 dark:bg-sky-500/15 shadow-sm'
            : 'border-black/10 dark:border-white/12 hover:border-sky-500/40'
        } rounded-xl p-3 shadow-2xs transition-all space-y-2 cursor-pointer group`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-black/8 dark:border-white/10 pb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-800 dark:text-sky-300">
              <Globe className="w-3 h-3" /> {domain}
            </span>
            {meta.category && (
              <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-200/80 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                {meta.category}
              </span>
            )}
            {renderLocationBadge()}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono font-medium text-gray-700 dark:text-gray-300">{timeStr}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectBrowser && onSelectBrowser(item);
              }}
              className="px-2 py-0.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-800 dark:text-sky-300 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Show Preview on right side"
            >
              <Eye className="w-3 h-3" /> Preview
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowDomainProfile && onShowDomainProfile(domain);
              }}
              className="p-1 text-gray-600 hover:text-sky-600 dark:text-gray-300 dark:hover:text-sky-400 transition-colors cursor-pointer"
              title="Domain Analytics"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 text-gray-600 hover:text-sky-600 dark:text-gray-300 dark:hover:text-sky-400 transition-colors"
              title="Open URL in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <img
            src={favicon}
            className="w-5 h-5 rounded mt-0.5 shrink-0 bg-gray-100 dark:bg-gray-800 object-contain p-0.5"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-gray-950 dark:text-white line-clamp-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" title={item.title}>
              {item.title}
            </h4>
            <div className="text-[11px] text-gray-700 dark:text-gray-300 truncate block group-hover:underline mt-0.5 font-mono font-medium">
              {url}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Spotify Item
  if (item.type === 'spotify') {
    const trackId = item.trackId;
    const shouldShowPlayer = showEmbed || isSelected;

    return (
      <div
        onClick={() => onSelectSpotify && onSelectSpotify(item)}
        className={`bg-white/85 dark:bg-[#18181b]/80 backdrop-blur-md border ${
          isSelected
            ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-sm'
            : 'border-black/10 dark:border-white/12 hover:border-emerald-500/40'
        } rounded-xl p-3 shadow-2xs transition-all space-y-2 cursor-pointer group`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-black/8 dark:border-white/10 pb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
              <Headphones className="w-3 h-3" /> Spotify
            </span>
            {item.album && (
              <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-200/80 dark:bg-gray-800 text-gray-800 dark:text-gray-200 truncate max-w-[150px]">
                {item.album}
              </span>
            )}
            {renderLocationBadge()}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono font-medium text-gray-700 dark:text-gray-300">{timeStr}</span>
            {trackId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmbed(!showEmbed);
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                  shouldShowPlayer
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300'
                }`}
                title={shouldShowPlayer ? 'Close Player' : 'Play Track Preview'}
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                {shouldShowPlayer ? 'Close' : 'Play'}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowTrackProfile && onShowTrackProfile(item.title, item.subtitle);
              }}
              className="p-1 text-gray-600 hover:text-emerald-600 dark:text-gray-300 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              title="Track Profile & Analytics"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex gap-2.5 items-center">
          <SpotifyCoverArt
            title={item.title}
            artist={item.subtitle}
            album={item.album}
            trackId={trackId}
            size="xs"
            className="w-10 h-10 rounded-lg shrink-0 border border-black/10 dark:border-white/10 shadow-2xs"
          />
          <div className="min-w-0 flex-1">
            <h4
              onClick={(e) => {
                e.stopPropagation();
                onSelectSpotify ? onSelectSpotify(item) : onShowTrackProfile?.(item.title, item.subtitle);
              }}
              className="text-xs font-bold text-gray-950 dark:text-white truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              {item.title}
            </h4>
            <p
              onClick={(e) => {
                e.stopPropagation();
                onShowArtistProfile && onShowArtistProfile(item.subtitle);
              }}
              className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 truncate cursor-pointer hover:underline mt-0.5"
            >
              {item.subtitle}
            </p>
          </div>
        </div>
        {trackId && shouldShowPlayer && (
          <div className="rounded-lg overflow-hidden border border-black/10 dark:border-gray-800 bg-black animate-in fade-in duration-200">
            <iframe
              src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator`}
              width="100%"
              height="80"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        )}
      </div>
    );
  }

  // 3. YouTube Item
  if (item.type === 'youtube') {
    const videoId = item.youtube_video_id;
    const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
    return (
      <div
        onClick={() => onSelectYouTube && onSelectYouTube(item)}
        className={`bg-white/85 dark:bg-[#18181b]/80 backdrop-blur-md border ${
          isSelected
            ? 'border-red-500 ring-2 ring-red-500/30 bg-red-500/10 dark:bg-red-500/15 shadow-sm'
            : 'border-black/10 dark:border-white/12 hover:border-red-500/40'
        } rounded-xl p-3 shadow-2xs transition-all space-y-2 cursor-pointer group`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-black/8 dark:border-white/10 pb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/15 text-red-700 dark:text-red-400">
              <Youtube className="w-3 h-3" /> YouTube
            </span>
            {renderLocationBadge()}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono font-medium text-gray-700 dark:text-gray-300">{timeStr}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectYouTube && onSelectYouTube(item);
              }}
              className="px-2 py-0.5 bg-red-500/15 hover:bg-red-500/25 text-red-700 dark:text-red-400 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Inspect Video Analytics"
            >
              <Eye className="w-3 h-3" /> Inspect
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowVideoProfile && onShowVideoProfile(item.title, item.subtitle);
              }}
              className="p-1 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors cursor-pointer"
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
                className="p-1 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors"
                title="Open in YouTube"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2.5 items-start">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              onClick={(e) => {
                e.stopPropagation();
                onSelectYouTube && onSelectYouTube(item);
              }}
              className="w-20 h-13 object-cover rounded-lg bg-black cursor-pointer group-hover:opacity-90 transition-opacity shrink-0 border border-black/10 dark:border-gray-800"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectYouTube && onSelectYouTube(item);
              }}
              className="w-20 h-13 rounded-lg bg-red-500/15 text-red-600 flex items-center justify-center cursor-pointer shrink-0 border border-red-500/20"
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
              className="text-xs font-bold text-gray-950 dark:text-white line-clamp-2 leading-snug cursor-pointer group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors"
              title={item.title}
            >
              {item.title}
            </h4>
            <p
              onClick={(e) => {
                e.stopPropagation();
                onShowChannelProfile && onShowChannelProfile(item.subtitle);
              }}
              className="text-[11px] text-gray-700 dark:text-gray-300 font-medium truncate cursor-pointer hover:underline mt-0.5"
            >
              {item.subtitle}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 4. Maps Item
  if (item.type === 'maps') {
    const gmapsEmbedUrl = buildGoogleMapsEmbedUrl(item);
    const gmapsUrl = buildGoogleMapsUrl(item);
    const isGeneric = isGenericPlaceName(item.title);

    return (
      <div className="bg-white/85 dark:bg-[#18181b]/80 backdrop-blur-md border border-black/10 dark:border-white/12 rounded-xl p-3 shadow-2xs hover:border-blue-500/40 transition-all space-y-2 relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-black/8 dark:border-white/10 pb-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-800 dark:text-blue-300">
            <MapPin className="w-3 h-3" /> Maps
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono font-medium text-gray-700 dark:text-gray-300">{timeStr}</span>
            <button
              onClick={() => onOpenMapModal && onOpenMapModal(item.title, item.subtitle, gmapsEmbedUrl, gmapsUrl)}
              className="px-2 py-0.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-800 dark:text-blue-300 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Preview on Google Maps"
            >
              <MapIcon className="w-3 h-3" /> Preview
            </button>
            <a
              href={gmapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
              title="Open in Google Maps"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-950 dark:text-white truncate hover:text-blue-600">
              {item.title}
            </span>
            {isGeneric && item.lat != null && item.lng != null && onResolveGeo && (
              <button
                onClick={() => onResolveGeo(item.lat!, item.lng!)}
                className="text-[9px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded font-bold cursor-pointer"
              >
                Resolve
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-700 dark:text-gray-300 font-medium truncate mt-0.5">{item.subtitle}</p>
        </div>
      </div>
    );
  }

  // 5. Google Photos Item
  if (item.type === 'photo') {
    const photoSrc = item.thumbnailUrl || item.photoUrl || item.localBlobUrl;

    return (
      <div
        onClick={() => onSelectPhoto && onSelectPhoto(item)}
        className="bg-white/85 dark:bg-[#18181b]/80 backdrop-blur-md border border-black/10 dark:border-white/12 hover:border-rose-500/40 rounded-xl p-3 shadow-2xs hover:shadow-md transition-all space-y-2.5 cursor-pointer group"
      >
        <div className="flex items-center justify-between gap-2 border-b border-black/8 dark:border-white/10 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/20">
              <svg className="w-3 h-3" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 2a5 5 0 0 0-5 5v5h5a5 5 0 0 0 0-10z" />
                <path fill="#FBBC05" d="M22 12a5 5 0 0 0-5-5h-5v5a5 5 0 0 0 10 0z" />
                <path fill="#34A853" d="M12 22a5 5 0 0 0 5-5v-5h-5a5 5 0 0 0 0 10z" />
                <path fill="#4285F4" d="M2 12a5 5 0 0 0 5 5h5v-5a5 5 0 0 0-10 0z" />
              </svg>
              <span>Google Photos</span>
            </span>
            {item.camera && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-200/80 dark:bg-gray-800 px-2 py-0.5 rounded">
                <Camera className="w-2.5 h-2.5" />
                <span className="truncate max-w-[120px]">{item.camera}</span>
              </span>
            )}
            {renderLocationBadge()}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-medium text-gray-700 dark:text-gray-300">{timeStr}</span>
            {item.favorite && (
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            )}
            {item.lat != null && item.lng != null && onOpenMapModal && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const embed = buildGoogleMapsEmbedUrl(item);
                  const ext = buildGoogleMapsUrl(item);
                  onOpenMapModal(item.title, item.subtitle, embed, ext);
                }}
                className="p-1 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                title="View Location on Map"
              >
                <MapPin className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Thumbnail and Details */}
        <div className="flex gap-3 items-start">
          {photoSrc && (
            <div className="relative w-24 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 border border-black/10 dark:border-zinc-800">
              <img
                src={photoSrc}
                alt={item.title || 'Google Photos'}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
              </div>
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <h4 className="text-xs font-bold text-gray-950 dark:text-white line-clamp-2 leading-snug group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              {item.title || 'Photo Memory'}
            </h4>
            {item.description && item.description !== item.title && (
              <p className="text-[11px] text-gray-800 dark:text-gray-200 line-clamp-1 italic font-normal">
                "{item.description}"
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-700 dark:text-gray-300 pt-0.5 font-medium">
              {item.album && (
                <span className="bg-gray-200/80 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200 font-semibold truncate max-w-[140px]">
                  {item.album}
                </span>
              )}
              {item.lat != null && item.lng != null && (
                <span className="flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <MapPin className="w-2.5 h-2.5" />
                  <span>Geo-tagged</span>
                </span>
              )}
              {item.people && item.people.length > 0 && (
                <span className="flex items-center gap-0.5 text-purple-700 dark:text-purple-300 font-semibold">
                  <User className="w-2.5 h-2.5" />
                  <span>{item.people.join(', ')}</span>
                </span>
              )}
              {item.formattedFileSize && (
                <span className="text-gray-600 dark:text-gray-400 font-mono ml-auto">{item.formattedFileSize}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
});

TimelineCard.displayName = 'TimelineCard';
