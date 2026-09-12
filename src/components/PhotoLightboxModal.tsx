import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Star,
  Download,
  MapPin,
  Calendar,
  Camera,
  User,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  BookOpen,
  Info,
  HardDrive
} from 'lucide-react';
import { TimelineItem } from '../types';
import { formatTime } from '../utils/dataParser';

interface PhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: TimelineItem | null;
  allPhotos?: TimelineItem[];
  onSelectPhoto?: (photo: TimelineItem) => void;
  onToggleFavorite?: (photoId: string) => void;
  onUpdateDescription?: (photoId: string, desc: string) => void;
  onJumpToJournal?: (date: Date) => void;
  onJumpToMap?: (lat: number, lng: number) => void;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  isOpen,
  onClose,
  photo,
  allPhotos = [],
  onSelectPhoto,
  onToggleFavorite,
  onUpdateDescription,
  onJumpToJournal,
  onJumpToMap
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showInfo, setShowInfo] = useState<boolean>(true);
  const [isEditingDesc, setIsEditingDesc] = useState<boolean>(false);
  const [descText, setDescText] = useState<string>('');

  useEffect(() => {
    if (photo) {
      setDescText(photo.description || photo.title || '');
      setZoomLevel(1);
    }
  }, [photo]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'i' || e.key === 'I') {
        setShowInfo(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, photo, allPhotos]);

  if (!isOpen || !photo) return null;

  const currentIndex = allPhotos.findIndex(p => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allPhotos.length - 1;

  const handlePrev = () => {
    if (hasPrev && onSelectPhoto) {
      onSelectPhoto(allPhotos[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectPhoto) {
      onSelectPhoto(allPhotos[currentIndex + 1]);
    }
  };

  const handleDownload = () => {
    const src = photo.photoUrl || photo.localBlobUrl;
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = photo.title || `photo_${photo.dateObj.getTime()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const dateFormatted = photo.dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const timeFormatted = formatTime(photo.dateObj);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md select-none transition-all duration-300"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between px-4 sm:px-6 z-20"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 text-white min-w-0">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            {/* Google Photos 4-color pinwheel icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 2a5 5 0 0 0-5 5v5h5a5 5 0 0 0 0-10z" />
              <path fill="#FBBC05" d="M22 12a5 5 0 0 0-5-5h-5v5a5 5 0 0 0 10 0z" />
              <path fill="#34A853" d="M12 22a5 5 0 0 0 5-5v-5h-5a5 5 0 0 0 0 10z" />
              <path fill="#4285F4" d="M2 12a5 5 0 0 0 5 5h5v-5a5 5 0 0 0-10 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-white truncate">
              {photo.title || 'Google Photos'}
            </h2>
            <p className="text-xs text-white/60 truncate">
              {dateFormatted} at {timeFormatted}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {photo.lat != null && photo.lng != null && onJumpToMap && (
            <button
              onClick={() => {
                onJumpToMap(photo.lat!, photo.lng!);
                onClose();
              }}
              className="p-2 text-white/80 hover:text-blue-400 hover:bg-white/10 rounded-full transition-colors"
              title="Show on Map Timeline"
            >
              <MapPin className="w-5 h-5" />
            </button>
          )}

          {onJumpToJournal && (
            <button
              onClick={() => {
                onJumpToJournal(photo.dateObj);
                onClose();
              }}
              className="p-2 text-white/80 hover:text-emerald-400 hover:bg-white/10 rounded-full transition-colors"
              title="View in Journal Timeline"
            >
              <BookOpen className="w-5 h-5" />
            </button>
          )}

          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(photo.id)}
              className={`p-2 rounded-full transition-colors ${
                photo.favorite ? 'text-amber-400 hover:bg-amber-400/20' : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
              title={photo.favorite ? 'Favorited' : 'Mark Favorite'}
            >
              <Star className={`w-5 h-5 ${photo.favorite ? 'fill-amber-400' : ''}`} />
            </button>
          )}

          <button
            onClick={() => setZoomLevel(prev => (prev >= 2 ? 1 : prev + 0.5))}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Toggle Zoom"
          >
            {zoomLevel > 1 ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Download original photo"
          >
            <Download className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowInfo(prev => !prev)}
            className={`p-2 rounded-full transition-colors ${
              showInfo ? 'text-blue-400 bg-white/10' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Info Sheet (I)"
          >
            <Info className="w-5 h-5" />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors ml-1"
            title="Close (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Photo Canvas Area */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4 sm:p-8 pt-16 overflow-hidden"
        onClick={e => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Navigation Arrows */}
        {hasPrev && (
          <button
            onClick={e => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all z-20 border border-white/10"
            title="Previous Photo (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {hasNext && (
          <button
            onClick={e => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all z-20 border border-white/10"
            title="Next Photo (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Image Display */}
        <div
          className={`relative max-w-full max-h-full flex items-center justify-center transition-transform duration-200 ${
            showInfo ? 'lg:mr-80' : ''
          }`}
          onClick={e => e.stopPropagation()}
        >
          <img
            src={photo.photoUrl || photo.localBlobUrl}
            alt={photo.title || 'Google Photos'}
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg shadow-2xl transition-all"
            style={{ transform: `scale(${zoomLevel})` }}
          />
        </div>
      </div>

      {/* Slide-out Photo Metadata Inspector */}
      {showInfo && (
        <aside
          className="absolute right-0 top-16 bottom-0 w-full sm:w-80 bg-zinc-900/95 border-l border-white/10 text-white p-5 overflow-y-auto z-30 shadow-2xl flex flex-col gap-6"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Photo Details</h3>
            <button
              onClick={() => setShowInfo(false)}
              className="text-zinc-400 hover:text-white text-xs"
            >
              Hide
            </button>
          </div>

          {/* Caption / Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
              <span>Description</span>
              {onUpdateDescription && !isEditingDesc && (
                <button
                  onClick={() => setIsEditingDesc(true)}
                  className="text-blue-400 hover:underline text-[11px]"
                >
                  Edit
                </button>
              )}
            </label>
            {isEditingDesc ? (
              <div className="space-y-2">
                <textarea
                  value={descText}
                  onChange={e => setDescText(e.target.value)}
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 resize-none h-20"
                  placeholder="Add a description or note..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingDesc(false)}
                    className="px-2 py-1 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (onUpdateDescription) {
                        onUpdateDescription(photo.id, descText);
                      }
                      setIsEditingDesc(false);
                    }}
                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded-md font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-200 leading-relaxed">
                {photo.description || photo.title || 'No description'}
              </p>
            )}
          </div>

          {/* Date & Time */}
          <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Calendar className="w-4 h-4 text-rose-400" />
              <span>Timestamp</span>
            </div>
            <p className="text-sm font-medium text-white">{dateFormatted}</p>
            <p className="text-xs text-zinc-400">{timeFormatted}</p>
          </div>

          {/* Camera Info */}
          <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Camera className="w-4 h-4 text-blue-400" />
              <span>Camera & Optics</span>
            </div>
            <p className="text-sm font-medium text-white">{photo.camera || 'Standard Digital Capture'}</p>
            {photo.formattedFileSize && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <HardDrive className="w-3.5 h-3.5" />
                <span>{photo.formattedFileSize}</span>
                {photo.isMountedDirectly && (
                  <span className="ml-auto px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    Direct Mounted
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Location */}
          {photo.lat != null && photo.lng != null && (
            <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Geo-Coordinates</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">GPS Verified</span>
              </div>
              <p className="text-xs font-mono text-zinc-300">
                {photo.lat.toFixed(5)}, {photo.lng.toFixed(5)}
              </p>
              {photo.address && (
                <p className="text-xs text-zinc-400">{photo.address}</p>
              )}
              {onJumpToMap && (
                <button
                  onClick={() => {
                    onJumpToMap(photo.lat!, photo.lng!);
                    onClose();
                  }}
                  className="w-full mt-2 py-1.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-emerald-500/30"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Open in Map Timeline
                </button>
              )}
            </div>
          )}

          {/* People */}
          {photo.people && photo.people.length > 0 && (
            <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <User className="w-4 h-4 text-purple-400" />
                <span>People Detected</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {photo.people.map((person, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium border border-purple-500/30"
                  >
                    {person}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Album / Folder */}
          {photo.album && (
            <div className="text-xs text-zinc-400 flex items-center justify-between px-1">
              <span>Album / Directory:</span>
              <span className="font-semibold text-zinc-200">{photo.album}</span>
            </div>
          )}
        </aside>
      )}
    </div>
  );
};
