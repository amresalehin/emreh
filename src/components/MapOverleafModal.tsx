import React from 'react';
import { Map as MapIcon, ExternalLink, X } from 'lucide-react';
import { MapOverleafModalState } from '../types';
import { LocationMapView } from './maps/LocationMapView';

interface MapOverleafModalProps {
  isOpen?: boolean;
  modalState?: MapOverleafModalState;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  embedUrl?: string;
  externalUrl?: string;
  lat?: number | null;
  lng?: number | null;
}

export const MapOverleafModal: React.FC<MapOverleafModalProps> = ({
  isOpen: propIsOpen,
  modalState,
  onClose,
  title: propTitle,
  subtitle: propSubtitle,
  embedUrl: propEmbedUrl,
  externalUrl: propExternalUrl,
  lat: propLat,
  lng: propLng
}) => {
  const isOpen = propIsOpen !== undefined ? propIsOpen : (modalState ? modalState.isOpen : false);
  if (!isOpen) return null;

  const title = propTitle || (modalState ? modalState.title : '');
  const subtitle = propSubtitle || (modalState ? modalState.subtitle : '');
  const embedUrl = propEmbedUrl || (modalState ? modalState.embedUrl : '');
  const externalUrl = propExternalUrl || (modalState ? modalState.externalUrl : '');
  const lat = propLat ?? modalState?.lat ?? null;
  const lng = propLng ?? modalState?.lng ?? null;
  const origin = modalState?.origin ?? null;
  const destination = modalState?.destination ?? null;

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div className="bg-white dark:bg-[#151515] rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] relative z-10 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/80 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <MapIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">
                {title || 'Google Maps Preview'}
              </h3>
              {subtitle && (
                <p className="text-[10px] text-gray-400 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {externalUrl && externalUrl !== '#' && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 w-full h-full relative bg-gray-950 overflow-hidden">
          <LocationMapView
            lat={lat}
            lng={lng}
            origin={origin}
            destination={destination}
            embedUrl={embedUrl}
            externalUrl={externalUrl}
            title={title}
            subtitle={subtitle}
            className="w-full h-full rounded-none border-0"
            showControls={true}
          />
        </div>
      </div>
    </div>
  );
};
