import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ExternalLink, Navigation, ZoomIn, ZoomOut, MapPin } from 'lucide-react';
import { extractCoordsFromMapUrls } from '../../utils/dataParser';

export interface LocationMapViewProps {
  lat?: number | null;
  lng?: number | null;
  origin?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  embedUrl?: string;
  externalUrl?: string;
  title?: string;
  subtitle?: string;
  category?: string;
  className?: string;
  isDark?: boolean;
  showControls?: boolean;
}

export const LocationMapView: React.FC<LocationMapViewProps> = ({
  lat: propLat,
  lng: propLng,
  origin: propOrigin,
  destination: propDestination,
  embedUrl,
  externalUrl,
  title = 'Location',
  subtitle,
  category,
  className = 'w-full h-full min-h-[220px]',
  isDark = false,
  showControls = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Derive coordinates from props or parse from URLs
  const parsed = extractCoordsFromMapUrls(embedUrl, externalUrl);
  const finalOrigin = propOrigin || parsed.origin || null;
  const finalDestination = propDestination || parsed.destination || null;
  const hasRoute = !!(finalOrigin && finalDestination);

  const finalLat = propLat != null && Number.isFinite(propLat)
    ? propLat
    : parsed.lat != null && Number.isFinite(parsed.lat)
      ? parsed.lat
      : finalOrigin ? finalOrigin.lat : null;

  const finalLng = propLng != null && Number.isFinite(propLng)
    ? propLng
    : parsed.lng != null && Number.isFinite(parsed.lng)
      ? parsed.lng
      : finalOrigin ? finalOrigin.lng : null;

  const hasCoords = (finalLat != null && finalLng != null && Number.isFinite(finalLat) && Number.isFinite(finalLng)) || hasRoute;

  // Layer theme: google_roadmap, google_satellite, or dark
  const [mapTheme, setMapTheme] = useState<'roadmap' | 'satellite' | 'dark'>(isDark ? 'dark' : 'roadmap');

  // Direct Google Maps URL for external opening
  const googleMapsUrl = externalUrl && externalUrl !== '#'
    ? externalUrl
    : hasRoute && finalOrigin && finalDestination
      ? `https://www.google.com/maps/dir/?api=1&origin=${finalOrigin.lat},${finalOrigin.lng}&destination=${finalDestination.lat},${finalDestination.lng}`
      : hasCoords && finalLat != null && finalLng != null
        ? `https://www.google.com/maps/search/?api=1&query=${finalLat},${finalLng}`
        : title
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}`
          : 'https://www.google.com/maps';

  // Initialize and update map
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasCoords) return;

    if (mapRef.current) {
      try {
        mapRef.current.stop();
        mapRef.current.remove();
      } catch (_) {}
      mapRef.current = null;
    }

    container.innerHTML = '';

    const center: [number, number] = finalLat != null && finalLng != null
      ? [finalLat, finalLng]
      : finalOrigin
        ? [finalOrigin.lat, finalOrigin.lng]
        : [37.7749, -122.4194];

    const map = L.map(container, {
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: true
    }).setView(center, hasRoute ? 12 : 15);
    mapRef.current = map;

    // Apply Google Maps tile layer
    let tileUrl = 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    let attribution = '&copy; Google Maps';
    let tileClassName = '';

    if (mapTheme === 'satellite') {
      tileUrl = 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
      attribution = '&copy; Google Maps Satellite';
    } else if (mapTheme === 'dark') {
      tileUrl = 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      attribution = '&copy; Google Maps';
      tileClassName = 'google-map-dark-tiles';
    }

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution,
      className: tileClassName
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Popup helper
    const popupContent = document.createElement('div');
    popupContent.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    popupContent.style.padding = '4px';
    popupContent.innerHTML = `
      <div style="font-size: 12px; font-weight: 700; color: #111;">${title}</div>
      ${subtitle ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">${subtitle}</div>` : ''}
      ${finalLat != null && finalLng != null ? `<div style="font-size: 10px; color: #888; font-family: monospace; margin-top: 4px;">${finalLat.toFixed(5)}, ${finalLng.toFixed(5)}</div>` : ''}
    `;

    // Render Markers / Route
    if (hasRoute && finalOrigin && finalDestination) {
      const startIcon = L.divIcon({
        className: '',
        html: `<div style="width: 26px; height: 26px; border-radius: 9999px; background: #10b981; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px;">A</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const endIcon = L.divIcon({
        className: '',
        html: `<div style="width: 26px; height: 26px; border-radius: 9999px; background: #ef4444; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px;">B</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      L.marker([finalOrigin.lat, finalOrigin.lng], { icon: startIcon }).addTo(map).bindPopup('Origin');
      L.marker([finalDestination.lat, finalDestination.lng], { icon: endIcon }).addTo(map).bindPopup('Destination');

      // Polyline route casing & inner line
      const routeCoords: [number, number][] = [
        [finalOrigin.lat, finalOrigin.lng],
        [finalDestination.lat, finalDestination.lng]
      ];
      L.polyline(routeCoords, { color: '#93c5fd', weight: 8, opacity: 0.8 }).addTo(map);
      L.polyline(routeCoords, { color: '#2563eb', weight: 5, opacity: 1 }).addTo(map);

      const bounds = L.latLngBounds(routeCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (finalLat != null && finalLng != null) {
      // Standard Google Maps Red Teardrop Pin
      const pinIcon = L.divIcon({
        className: '',
        html: `
          <div style="position: relative; width: 32px; height: 40px; transform: translate(-50%, -100%); cursor: pointer;">
            <svg viewBox="0 0 24 36" width="32" height="40" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="#EA4335" />
              <circle cx="12" cy="12" r="5" fill="#FFFFFF" />
            </svg>
          </div>
        `,
        iconSize: [0, 0],
        popupAnchor: [0, -36]
      });

      const marker = L.marker([finalLat, finalLng], { icon: pinIcon }).addTo(map);
      marker.bindPopup(popupContent);
      // Open popup by default
      setTimeout(() => {
        try {
          marker.openPopup();
        } catch (_) {}
      }, 250);
    }

    // Resize handling to prevent blank tiles
    const handleInvalidate = () => {
      if (mapRef.current) {
        try {
          mapRef.current.invalidateSize({ animate: false });
        } catch (_) {}
      }
    };

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      ro = new ResizeObserver(handleInvalidate);
      ro.observe(container);
    }

    const timer = setTimeout(handleInvalidate, 200);

    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
      if (mapRef.current) {
        try {
          mapRef.current.stop();
          mapRef.current.remove();
        } catch (_) {}
        mapRef.current = null;
      }
    };
  }, [finalLat, finalLng, hasRoute, finalOrigin, finalDestination, mapTheme, hasCoords]);

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (!mapRef.current) return;
    if (hasRoute && finalOrigin && finalDestination) {
      mapRef.current.fitBounds(
        L.latLngBounds([
          [finalOrigin.lat, finalOrigin.lng],
          [finalDestination.lat, finalDestination.lng]
        ]),
        { padding: [50, 50], animate: true }
      );
    } else if (finalLat != null && finalLng != null) {
      mapRef.current.flyTo([finalLat, finalLng], 16, { duration: 0.6 });
    }
  };

  if (!hasCoords) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
          <MapPin className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h4>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{subtitle}</p>}
        <p className="text-[11px] text-gray-400 mt-2">Coordinates not directly attached to this item</p>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
        >
          <span>Search on Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 ${className} isolate`}>
      {/* Map DOM Element */}
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: '100%' }} />

      {/* Top Bar Overlay: Map Style Switcher & Open in Google Maps */}
      {showControls && (
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 pointer-events-auto">
          {/* Layer Style Switcher */}
          <div className="flex items-center gap-0.5 p-1 bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md rounded-xl border border-gray-200/90 dark:border-gray-800 shadow-md text-[11px] font-semibold">
            <button
              onClick={() => setMapTheme('roadmap')}
              className={`px-2 py-0.5 rounded-lg cursor-pointer transition-all ${
                mapTheme === 'roadmap'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Google Maps Roadmap"
            >
              Map
            </button>
            <button
              onClick={() => setMapTheme('satellite')}
              className={`px-2 py-0.5 rounded-lg cursor-pointer transition-all ${
                mapTheme === 'satellite'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Satellite View"
            >
              Satellite
            </button>
            <button
              onClick={() => setMapTheme('dark')}
              className={`px-2 py-0.5 rounded-lg cursor-pointer transition-all ${
                mapTheme === 'dark'
                  ? 'bg-gray-800 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Dark Mode"
            >
              Dark
            </button>
          </div>

          {/* External Google Maps Button */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md transition-all cursor-pointer"
            title="Open in Google Maps (external tab)"
          >
            <span className="hidden sm:inline">Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Bottom Controls: Zoom and Recenter */}
      {showControls && (
        <div className="absolute bottom-3 right-3 z-20 flex flex-col items-center gap-1.5 pointer-events-auto">
          <button
            onClick={handleRecenter}
            className="p-2 bg-white/95 dark:bg-[#181818]/95 hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400 backdrop-blur-md rounded-full border border-gray-200/90 dark:border-gray-800 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Recenter location"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
          <div className="flex flex-col bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md rounded-xl border border-gray-200/90 dark:border-gray-800 shadow-md divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
