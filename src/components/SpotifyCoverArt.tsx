import React, { useState, useEffect } from 'react';
import { Disc, Music, Headphones } from 'lucide-react';
import { fetchCoverArt, getCachedCoverArt } from '../utils/coverArtService';

// Gradient palette for fallback
const ART_GRADIENTS = [
  'from-emerald-900 via-teal-950 to-black',
  'from-green-900 via-emerald-950 to-black',
  'from-teal-900 via-cyan-950 to-black',
  'from-indigo-950 via-emerald-950 to-black',
  'from-emerald-800 via-stone-900 to-black',
  'from-cyan-900 via-emerald-950 to-black',
  'from-slate-900 via-emerald-950 to-black'
];

export function getTrackGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < (title || '').length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % ART_GRADIENTS.length;
  return ART_GRADIENTS[idx];
}

interface SpotifyCoverArtProps {
  title: string;
  artist?: string;
  album?: string;
  trackId?: string | null;
  className?: string;
  imgClassName?: string;
  fallbackGradient?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero';
  showVinylEffect?: boolean;
  fitMode?: 'cover' | 'contain';
}

export const SpotifyCoverArt: React.FC<SpotifyCoverArtProps> = ({
  title,
  artist,
  album,
  trackId,
  className = '',
  imgClassName = '',
  fallbackGradient,
  size = 'md',
  showVinylEffect = true,
  fitMode = 'cover'
}) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(() => getCachedCoverArt(title, artist, trackId));
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const cached = getCachedCoverArt(title, artist, trackId);

    // Reset visual state for the new track immediately so we never show the
    // previous track's cover art (or a stale "loaded" flash) while the new
    // one is being resolved.
    setImgLoaded(false);
    setImgError(false);
    setCoverUrl(cached || null);

    if (cached) {
      return;
    }

    fetchCoverArt(title, artist, trackId).then(url => {
      if (isMounted && url) {
        setCoverUrl(url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [title, artist, trackId]);

  const gradient = fallbackGradient || getTrackGradient(title);

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} ${className}`}>
      {/* Real Album Cover Image */}
      {coverUrl && !imgError && (
        <img
          src={coverUrl}
          alt={`${title} - ${artist || album || 'Cover'}`}
          className={`w-full h-full ${fitMode === 'contain' ? 'object-contain' : 'object-cover'} object-center transition-opacity duration-300 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      )}

      {/* Fallback Graphic (Shown when loading or no image available) */}
      {(!coverUrl || imgError || !imgLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {showVinylEffect && (
            <>
              <div className="absolute right-[-20px] top-[-20px] w-32 h-32 rounded-full border border-white/5 opacity-40" />
              <div className="absolute right-[-10px] top-[-10px] w-24 h-24 rounded-full border border-white/10 opacity-30" />
            </>
          )}
          <Disc className={`text-emerald-400/70 ${size === 'xs' ? 'w-3.5 h-3.5' : size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : size === 'hero' ? 'w-14 h-14' : 'w-7 h-7'}`} />
        </div>
      )}
    </div>
  );
};
