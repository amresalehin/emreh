import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import {
  Flame,
  Layers,
  ZoomIn,
  ZoomOut,
  Route,
  Navigation,
  Activity,
  Footprints,
  Car,
  Bike,
  Sparkles,
  MapPin,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Compass,
  LayoutGrid,
  Eye,
  EyeOff,
  Maximize2
} from 'lucide-react';
import { TimelineItem } from '../types';
import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsUrl,
  formatTime,
  formatDuration,
  getPlaceCategory,
  extractRoadGeometryBetweenPoints
} from '../utils/dataParser';

// Defensive patch for Leaflet animation frame and DOM unmount race condition
if (typeof window !== 'undefined' && L && L.DomUtil) {
  const originalGetPosition = L.DomUtil.getPosition;
  L.DomUtil.getPosition = function (el: any) {
    if (!el || typeof el !== 'object') {
      return new L.Point(0, 0);
    }
    try {
      return originalGetPosition.call(this, el) || new L.Point(0, 0);
    } catch {
      return (el && el._leaflet_pos) ? el._leaflet_pos : new L.Point(0, 0);
    }
  };

  const originalSetPosition = L.DomUtil.setPosition;
  L.DomUtil.setPosition = function (el: any, point: any) {
    if (!el || typeof el !== 'object') {
      return;
    }
    try {
      originalSetPosition.call(this, el, point);
    } catch {
      if (el) el._leaflet_pos = point;
    }
  };
}

export type MapRenderMode = 'places' | 'pipeline' | 'heatmap' | 'hybrid';
export type MapLayerTheme = 'google_roadmap' | 'google_satellite' | 'google_hybrid' | 'dark';

interface LeafletMapProps {
  items: TimelineItem[];
  containerId: string;
  className?: string;
  onPreviewOpen?: (title: string, subtitle: string, embedUrl: string, externalUrl: string) => void;
  selectedCoord?: [number, number] | null;
  selectedItemId?: string | null;
  onSelectItem?: (item: TimelineItem) => void;
  enablePipelineControls?: boolean;
  showRoutes?: boolean;
  onToggleRoutes?: (show: boolean) => void;
  fitKey?: string | number;
  filterLabel?: string;
  isDark?: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  items,
  containerId,
  className = 'w-full h-full',
  onPreviewOpen,
  selectedCoord,
  selectedItemId,
  onSelectItem,
  enablePipelineControls = true,
  showRoutes: showRoutesProp,
  onToggleRoutes,
  fitKey,
  filterLabel,
  isDark
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const heatLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const pipelineLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const routePolylinesMapRef = useRef<Map<string, L.Polyline>>(new Map());
  const pulseMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Map state controls - Routes enabled by default
  const [internalShowRoutes, setInternalShowRoutes] = useState<boolean>(true);
  const showRoutes = showRoutesProp !== undefined ? showRoutesProp : internalShowRoutes;

  const handleToggleRoutes = () => {
    const next = !showRoutes;
    setInternalShowRoutes(next);
    if (onToggleRoutes) onToggleRoutes(next);
  };

  const [mapMode, setMapMode] = useState<MapRenderMode>('pipeline');
  const [clusterMarkers, setClusterMarkers] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(13);
  const [heatZoomRadius, setHeatZoomRadius] = useState<number>(25); // base heatmap intensity/radius multiplier
  const [heatIntensity, setHeatIntensity] = useState<number>(0.8);
  const [heatBlur, setHeatBlur] = useState<number>(18);
  const [isPlayingPipeline, setIsPlayingPipeline] = useState<boolean>(false);
  const [pipelineProgress, setPipelineProgress] = useState<number>(0);
  const [mapLayerTheme, setMapLayerTheme] = useState<MapLayerTheme>(isDark ? 'dark' : 'google_roadmap');
  const [showControls, setShowControls] = useState<boolean>(true);
  const [dynamicRouteGeometries, setDynamicRouteGeometries] = useState<Record<string, [number, number][]>>({});

  // Sync layer theme with dark/light mode
  useEffect(() => {
    if (isDark !== undefined) {
      setMapLayerTheme(isDark ? 'dark' : 'google_roadmap');
    }
  }, [isDark]);

  // Background road geometry extractor for trips lacking intermediate GPS breadcrumbs
  useEffect(() => {
    const routeItemsToFetch = items.filter(
      item => item.isRoute && (!item.pathPoints || item.pathPoints.length < 2) && item.origin && item.destination
    );

    if (routeItemsToFetch.length === 0) return;

    let isMounted = true;
    routeItemsToFetch.forEach(async item => {
      if (!item.id || dynamicRouteGeometries[item.id]) return;
      const o = item.origin;
      const d = item.destination;
      if (o && d && Number.isFinite(Number(o.lat)) && Number.isFinite(Number(o.lng)) && Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lng))) {
        const mode = item.activityType || item.travelMode || 'driving';
        const roadPath = await extractRoadGeometryBetweenPoints(Number(o.lat), Number(o.lng), Number(d.lat), Number(d.lng), mode);
        if (roadPath && roadPath.length >= 2 && isMounted) {
          setDynamicRouteGeometries(prev => ({
            ...prev,
            [item.id]: roadPath.map(p => [p.lat, p.lng] as [number, number])
          }));
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [items]);

  const getMapItemCoord = (item: TimelineItem, which: 'start' | 'end' = 'start'): [number, number] | null => {
    if (!item) return null;
    if (item.isRoute) {
      const p = which === 'end' ? item.destination : item.origin;
      if (p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))) {
        return [Number(p.lat), Number(p.lng)];
      }
    }
    if (Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng))) {
      return [Number(item.lat), Number(item.lng)];
    }
    return null;
  };

  // Pipeline route extraction & segment computation
  const { allPoints, segments, routeWaypoints, pipelineStats } = useMemo(() => {
    const pts: [number, number][] = [];
    const segs: {
      coords: [number, number][];
      item: TimelineItem | null;
      mode: string;
      speedCategory: 'walking' | 'biking' | 'driving' | 'transit' | 'still';
      distanceKm: number;
    }[] = [];
    const waypoints: { coord: [number, number]; item: TimelineItem; index: number }[] = [];
    let totalDist = 0;

    const calcDistance = (a: [number, number], b: [number, number]): number => {
      const R = 6371; // km
      const dLat = ((b[0] - a[0]) * Math.PI) / 180;
      const dLng = ((b[1] - a[1]) * Math.PI) / 180;
      const lat1 = (a[0] * Math.PI) / 180;
      const lat2 = (b[0] * Math.PI) / 180;
      const h =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
      return R * c;
    };

    let waypointCounter = 1;
    items.forEach(item => {
      const rawMode = (item.activityType || item.travelMode || '').toLowerCase();
      let speedCat: 'walking' | 'biking' | 'driving' | 'transit' | 'still' = 'driving';
      if (rawMode.includes('walk') || rawMode.includes('foot') || rawMode.includes('run')) speedCat = 'walking';
      else if (rawMode.includes('bike') || rawMode.includes('cycling')) speedCat = 'biking';
      else if (rawMode.includes('transit') || rawMode.includes('bus') || rawMode.includes('subway') || rawMode.includes('train')) speedCat = 'transit';
      else if (rawMode.includes('still') || rawMode.includes('stationary')) speedCat = 'still';

      // 1. True Route Activities (driving, walking, biking, transit trips with path or endpoints)
      if (item.isRoute) {
        let coords: [number, number][] = [];

        // If intermediate GPS track points exist, use the full street path
        if (item.pathPoints && item.pathPoints.length >= 2) {
          coords = item.pathPoints
            .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
            .map(p => [p.lat, p.lng] as [number, number]);
        } else if (item.id && dynamicRouteGeometries[item.id] && dynamicRouteGeometries[item.id].length >= 2) {
          coords = dynamicRouteGeometries[item.id];
        } else if (item.origin && item.destination) {
          const a = getMapItemCoord(item, 'start');
          const b = getMapItemCoord(item, 'end');
          if (a && b) {
            coords = [a, b];
          }
        }

        if (coords.length >= 2) {
          pts.push(...coords);
          let segDist = 0;
          for (let i = 0; i < coords.length - 1; i++) {
            segDist += calcDistance(coords[i], coords[i + 1]);
          }
          totalDist += segDist;
          segs.push({
            coords,
            item,
            mode: rawMode || 'Trip',
            speedCategory: speedCat,
            distanceKm: item.distanceKm ? Number(item.distanceKm) : segDist
          });
          // Do not push route start to waypoints (routes are rendered exclusively by polyline layer)
        }
      } else {
        // 2. Standalone Visited Locations / Place Visits
        // (Rendered as discrete map markers — NEVER connected with synthetic straight lines)
        const p = getMapItemCoord(item);
        if (p) {
          pts.push(p);
          waypoints.push({ coord: p, item, index: waypointCounter++ });
        }
      }
    });

    return {
      allPoints: pts,
      segments: segs,
      routeWaypoints: waypoints,
      pipelineStats: {
        totalPoints: pts.length,
        totalSegments: segs.length,
        totalDistanceKm: totalDist
      }
    };
  }, [items, dynamicRouteGeometries]);

  // Waypoints for place visits only
  const activeWaypoints = useMemo(() => {
    return routeWaypoints;
  }, [routeWaypoints]);

  // Generate heatmap intensity buffer points
  const heatPoints = useMemo(() => {
    // Collect points with weight based on dwell duration or stop density
    const points: { lat: number; lng: number; weight: number }[] = [];
    const seenMap = new Map<string, number>();

    items.forEach(item => {
      const coord = getMapItemCoord(item, 'start');
      if (coord) {
        const key = `${coord[0].toFixed(4)},${coord[1].toFixed(4)}`;
        let weight = 1.0;
        if (item.ms_played) {
          weight += Math.min(item.ms_played / 3600000, 3.0); // up to +3 for hours spent
        }
        const existing = seenMap.get(key) || 0;
        seenMap.set(key, existing + weight);
        points.push({ lat: coord[0], lng: coord[1], weight });
      }
    });

    return points;
  }, [items]);

  // Main Leaflet map initialisation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clean up existing map instance
    if (mapRef.current) {
      try {
        mapRef.current.stop();
        mapRef.current.remove();
      } catch (err) {
        console.warn('Map cleanup error:', err);
      }
      mapRef.current = null;
    }

    container.innerHTML = '';

    const initialCenter: [number, number] = allPoints.length > 0 ? allPoints[0] : [37.7749, -122.4194];
    const initialZoom = allPoints.length > 0 ? 13 : 12;

    try {
      const map = L.map(container, {
        zoomControl: false, // We supply integrated custom zoom controls
        scrollWheelZoom: true,
        fadeAnimation: false
      }).setView(initialCenter, initialZoom);
      mapRef.current = map;

      // Initialize layer groups for independent toggles
      heatLayerGroupRef.current = L.layerGroup().addTo(map);
      pipelineLayerGroupRef.current = L.layerGroup().addTo(map);

      map.on('zoomend', () => {
        const z = map.getZoom();
        setCurrentZoom(z);
      });

      if (allPoints.length > 0) {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40], animate: false });
      }
    } catch (e) {
      console.error('Leaflet map creation failed:', e);
    }

    let resizeObserver: ResizeObserver | null = null;
    const handleInvalidate = () => {
      if (mapRef.current) {
        try {
          mapRef.current.invalidateSize({ animate: false });
        } catch (_) {}
      }
    };

    if (typeof ResizeObserver !== 'undefined' && container) {
      resizeObserver = new ResizeObserver(() => {
        handleInvalidate();
      });
      resizeObserver.observe(container);
    }

    // Handle screen zooming, window resizing, and visualViewport changes
    window.addEventListener('resize', handleInvalidate, { passive: true });
    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleInvalidate, { passive: true });
    }

    const timer = setTimeout(() => {
      handleInvalidate();
    }, 150);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleInvalidate);
      if (typeof window !== 'undefined' && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleInvalidate);
      }
      if (resizeObserver) resizeObserver.disconnect();
      if (mapRef.current) {
        try {
          mapRef.current.stop();
          mapRef.current.remove();
        } catch (err) {
          console.warn('Map unmount error:', err);
        }
        mapRef.current = null;
      }
    };
  }, []);

  // Update tile layer dynamically without destroying the map or overlaying routes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (tileLayerRef.current) {
      try {
        map.removeLayer(tileLayerRef.current);
      } catch (_) {}
      tileLayerRef.current = null;
    }

    let tileUrl = 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    let attribution = '&copy; Google Maps';
    let tileClassName = '';

    if (mapLayerTheme === 'google_satellite') {
      tileUrl = 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
      attribution = '&copy; Google Maps Satellite';
    } else if (mapLayerTheme === 'google_hybrid') {
      tileUrl = 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      attribution = '&copy; Google Maps Hybrid';
    } else if (mapLayerTheme === 'dark') {
      tileUrl = 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      attribution = '&copy; Google Maps';
      tileClassName = 'google-map-dark-tiles';
    }

    const layer = L.tileLayer(tileUrl, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution,
      className: tileClassName
    });
    layer.addTo(map);
    // Send tile layer to back so polylines and markers remain on top
    try {
      layer.bringToBack();
    } catch (_) {}
    tileLayerRef.current = layer;
  }, [mapLayerTheme]);

  // Re-draw Route Pipeline Layer
  useEffect(() => {
    if (!mapRef.current || !pipelineLayerGroupRef.current) return;
    const group = pipelineLayerGroupRef.current;
    group.clearLayers();
    routePolylinesMapRef.current.clear();

    if (!showRoutes || mapMode === 'heatmap') return;

    segments.forEach((seg, idx) => {
      const isSelected = !!(seg.item && selectedItemId === seg.item.id);
      let strokeColor = '#3b82f6'; // blue
      let glowColor = '#60a5fa';
      let weight = isSelected ? 8 : 5.5;
      let dashArray: string | undefined = undefined;

      if (seg.speedCategory === 'walking') {
        strokeColor = '#10b981'; // emerald
        glowColor = '#34d399';
        weight = isSelected ? 7 : 4.5;
        dashArray = '4, 6';
      } else if (seg.speedCategory === 'biking') {
        strokeColor = '#f59e0b'; // amber
        glowColor = '#fbbf24';
        weight = isSelected ? 7.5 : 5;
      } else if (seg.speedCategory === 'driving') {
        strokeColor = '#2563eb'; // royal blue
        glowColor = '#93c5fd';
        weight = isSelected ? 8.5 : 6;
      } else if (seg.speedCategory === 'transit') {
        strokeColor = '#8b5cf6'; // purple
        glowColor = '#c4b5fd';
        weight = isSelected ? 7.5 : 5;
        dashArray = '6, 6';
      }

      // 1. Pipeline Glow/Casing Underlay
      const casing = L.polyline(seg.coords, {
        color: isSelected ? '#3b82f6' : glowColor,
        weight: weight + (isSelected ? 8 : 4),
        opacity: isSelected ? 0.75 : 0.35,
        lineCap: 'round',
        lineJoin: 'round'
      });
      group.addLayer(casing);

      // 2. Core High-Contrast Flow Pipe
      const poly = L.polyline(seg.coords, {
        color: strokeColor,
        weight: weight,
        opacity: isSelected ? 1 : 0.92,
        dashArray,
        lineCap: 'round',
        lineJoin: 'round'
      });

      // 3. Start Point Badge (A / Origin) and End Point Badge (B / Destination)
      if (seg.coords.length >= 2) {
        const startCoord = seg.coords[0];
        const endCoord = seg.coords[seg.coords.length - 1];

        const startIcon = L.divIcon({
          className: '',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer group">
              <div class="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-md transition-transform group-hover:scale-125">
                A
              </div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const endIcon = L.divIcon({
          className: '',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer group">
              <div class="w-5 h-5 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-md transition-transform group-hover:scale-125">
                B
              </div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const startMarker = L.marker(startCoord, { icon: startIcon, zIndexOffset: 50 });
        const endMarker = L.marker(endCoord, { icon: endIcon, zIndexOffset: 50 });

        if (seg.item) {
          startMarker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (onSelectItem && seg.item) onSelectItem(seg.item);
          });
          endMarker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (onSelectItem && seg.item) onSelectItem(seg.item);
          });
        }

        group.addLayer(startMarker);
        group.addLayer(endMarker);
      }

      const title = seg.item?.title || `Pipeline Leg #${idx + 1}`;
      const subtitle = seg.item?.subtitle || `${seg.mode} (${seg.distanceKm.toFixed(2)} km)`;
      const embedUrl = seg.item ? buildGoogleMapsEmbedUrl(seg.item) : '';
      const extUrl = seg.item ? buildGoogleMapsUrl(seg.item) : '';

      const popupDiv = document.createElement('div');
      popupDiv.style.fontFamily = 'sans-serif';
      popupDiv.style.minWidth = '170px';
      popupDiv.style.padding = '4px';
      popupDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; background: ${strokeColor}20; color: ${strokeColor}; padding: 2px 6px; border-radius: 6px;">
            ${seg.speedCategory}
          </span>
          <span style="font-size: 10px; color: #666; font-family: monospace;">${seg.distanceKm.toFixed(1)} km</span>
        </div>
        <div style="font-size: 12px; font-weight: 700; color: #111;">${title}</div>
        ${subtitle ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">${subtitle}</div>` : ''}
      `;

      if (onPreviewOpen && seg.item) {
        const btn = document.createElement('button');
        btn.textContent = 'Preview Google Maps';
        btn.style.cssText =
          'margin-top: 8px; width: 100%; background: #2563eb; color: white; border: none; border-radius: 8px; padding: 5px 8px; font-size: 10px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;';
        btn.onclick = e => {
          e.stopPropagation();
          onPreviewOpen(title, subtitle, embedUrl, extUrl);
        };
        popupDiv.appendChild(btn);
      }

      if (seg.item) {
        poly.on('click', () => {
          if (onSelectItem && seg.item) {
            onSelectItem(seg.item);
          }
        });
        routePolylinesMapRef.current.set(seg.item.id, poly);
      }

      poly.bindPopup(popupDiv);
      group.addLayer(poly);

      if (isSelected) {
        try {
          poly.bringToFront();
        } catch (_) {}
      }
    });
  }, [segments, mapMode, showRoutes, selectedItemId, onPreviewOpen, onSelectItem]);

  // Re-draw Markers Layer (Clustered or Standard)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove previous markers/cluster group if present
    if (markersLayerGroupRef.current) {
      try {
        map.removeLayer(markersLayerGroupRef.current);
      } catch (_) {}
      markersLayerGroupRef.current = null;
    }
    markersMapRef.current.clear();

    if (mapMode === 'heatmap') return; // clean map in heatmap view

    let group: any;
    if (clusterMarkers) {
      group = (L as any).markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 45,
        chunkedLoading: true,
        animate: true,
        animateAddingMarkers: false,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          const childMarkers = cluster.getAllChildMarkers();
          const hasSelected =
            selectedItemId && childMarkers.some((m: any) => m.options?.itemId === selectedItemId);

          let sizeClass = 'cluster-small';
          let iconSize = 32;
          if (count >= 50) {
            sizeClass = 'cluster-large';
            iconSize = 44;
          } else if (count >= 10) {
            sizeClass = 'cluster-medium';
            iconSize = 38;
          }

          return L.divIcon({
            html: `<div class="custom-marker-cluster-inner"><span>${count}</span></div>`,
            className: `custom-marker-cluster ${sizeClass} ${hasSelected ? 'custom-marker-cluster-active' : ''}`,
            iconSize: L.point(iconSize, iconSize),
            iconAnchor: L.point(iconSize / 2, iconSize / 2)
          });
        }
      });
    } else {
      group = L.layerGroup();
    }

    activeWaypoints.forEach(({ coord, item, index }) => {
      const isRoute = !!item.isRoute;
      const isSelected = selectedItemId === item.id;
      const category = getPlaceCategory(item);
      const iconHtml = isRoute ? '•' : `${index}`;

      // Google Maps Category Pin Color
      let pinBg = '#1A73E8';
      if (!isRoute) {
        if (category.id === 'food') pinBg = '#EA8600';
        else if (category.id === 'shopping') pinBg = '#0288D1';
        else if (category.id === 'lodging') pinBg = '#795548';
        else if (category.id === 'outdoors') pinBg = '#2E7D32';
        else if (category.id === 'culture') pinBg = '#0097A7';
        else if (category.id === 'home') pinBg = '#1A73E8';
        else if (category.id === 'work') pinBg = '#5C6BC0';
        else if (category.id === 'health') pinBg = '#D81B60';
        else pinBg = '#EA4335';
      }

      const customIcon = L.divIcon({
        className: '',
        html: `<div class="leaflet-custom-pin ${isSelected ? 'leaflet-custom-pin-active' : ''}" style="width: 26px; height: 26px; cursor: pointer; background: ${isSelected ? '#1A73E8' : '#ffffff'}; border-color: ${pinBg}; color: ${isSelected ? '#ffffff' : pinBg};">${iconHtml}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -14]
      });

      const timeStr = item.dateObj ? formatTime(item.dateObj) : '';
      const title = item.title || 'Location';
      const subtitle = item.subtitle || '';
      const embedUrl = buildGoogleMapsEmbedUrl(item);
      const extUrl = buildGoogleMapsUrl(item);

      const popupDiv = document.createElement('div');
      popupDiv.style.fontFamily = 'sans-serif';
      popupDiv.style.minWidth = '180px';
      popupDiv.style.padding = '6px';
      popupDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
          <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: ${pinBg}; background: ${pinBg}15; padding: 2px 6px; border-radius: 9999px;">${category.label}</span>
          ${timeStr ? `<span style="font-size: 10px; color: #666; margin-left: auto;">${timeStr}</span>` : ''}
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #111; line-height: 1.2;">${title}</div>
        ${subtitle ? `<div style="font-size: 11px; color: #666; margin-top: 3px; line-height: 1.3;">${subtitle}</div>` : ''}
      `;

      if (onPreviewOpen) {
        const btn = document.createElement('button');
        btn.textContent = 'Open in Google Maps';
        btn.style.cssText =
          'margin-top: 8px; width: 100%; background: #1A73E8; color: white; border: none; border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;';
        btn.onclick = e => {
          e.stopPropagation();
          onPreviewOpen(title, subtitle, embedUrl, extUrl);
        };
        popupDiv.appendChild(btn);
      }

      const marker = L.marker(coord, {
        icon: customIcon,
        itemId: item.id
      } as any).bindPopup(popupDiv);

      marker.on('click', () => {
        if (onSelectItem) {
          onSelectItem(item);
        }
      });
      group.addLayer(marker);
      if (item.id) {
        markersMapRef.current.set(item.id, marker);
      }
    });

    group.addTo(map);
    markersLayerGroupRef.current = group;

    return () => {
      if (mapRef.current && group) {
        try {
          mapRef.current.removeLayer(group);
        } catch (_) {}
      }
    };
  }, [activeWaypoints, mapMode, onPreviewOpen, selectedItemId, onSelectItem, clusterMarkers]);

  // Re-draw Heat Map Layer with Dynamic Zoom-Level Scaling
  useEffect(() => {
    if (!mapRef.current || !heatLayerGroupRef.current) return;
    const group = heatLayerGroupRef.current;
    group.clearLayers();

    if (mapMode === 'pipeline' || mapMode === 'places') return;

    // Dynamic Zoom Level Scale Calculation:
    // Scale radii exponentially with zoom level so clusters don't blow out at high zooms or disappear at low zooms
    const zoomScale = Math.pow(1.15, currentZoom - 12);
    const effectiveRadius = Math.max(12, Math.min(120, heatZoomRadius * zoomScale));
    const effectiveBlur = Math.max(8, Math.min(90, heatBlur * zoomScale));

    heatPoints.forEach(pt => {
      const radiusPx = effectiveRadius * (1 + (pt.weight - 1) * 0.25);
      const intensity = Math.min(1.0, heatIntensity * (0.5 + pt.weight * 0.3));

      // 1. Core Heat Epicenter (Intense red/amber)
      const centerCircle = L.circleMarker([pt.lat, pt.lng], {
        radius: Math.max(6, radiusPx * 0.3),
        color: 'transparent',
        fillColor: '#ef4444', // red-500
        fillOpacity: intensity * 0.75,
        interactive: false
      });
      group.addLayer(centerCircle);

      // 2. Mid Heat Ring (Warm orange/yellow)
      const midCircle = L.circleMarker([pt.lat, pt.lng], {
        radius: Math.max(12, radiusPx * 0.65),
        color: 'transparent',
        fillColor: '#f59e0b', // amber-500
        fillOpacity: intensity * 0.45,
        interactive: false
      });
      group.addLayer(midCircle);

      // 3. Outer Radial Dispersion Glow (Cyan/Azure halo)
      const outerCircle = L.circleMarker([pt.lat, pt.lng], {
        radius: Math.max(20, radiusPx),
        color: 'transparent',
        fillColor: '#06b6d4', // cyan-500
        fillOpacity: intensity * 0.2,
        interactive: false
      });
      group.addLayer(outerCircle);
    });
  }, [heatPoints, mapMode, currentZoom, heatZoomRadius, heatIntensity, heatBlur]);

  // Pipeline Animation Player
  useEffect(() => {
    let animFrame: number;
    if (isPlayingPipeline && allPoints.length > 1 && mapRef.current) {
      const startTime = performance.now();
      const durationMs = Math.max(4000, allPoints.length * 800); // responsive duration

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, (elapsed % durationMs) / durationMs);
        setPipelineProgress(progress);

        // Compute current interpolated point along the pipeline
        const totalIdx = (allPoints.length - 1) * progress;
        const baseIdx = Math.floor(totalIdx);
        const subFrac = totalIdx - baseIdx;
        const p1 = allPoints[baseIdx];
        const p2 = allPoints[Math.min(allPoints.length - 1, baseIdx + 1)];

        if (p1 && p2) {
          const curLat = p1[0] + (p2[0] - p1[0]) * subFrac;
          const curLng = p1[1] + (p2[1] - p1[1]) * subFrac;

          if (!pulseMarkerRef.current && mapRef.current) {
            const beaconIcon = L.divIcon({
              className: '',
              html: `
                <div class="relative flex items-center justify-center">
                  <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-cyan-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-white shadow-lg"></span>
                </div>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });
            pulseMarkerRef.current = L.marker([curLat, curLng], { icon: beaconIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
          } else if (pulseMarkerRef.current) {
            pulseMarkerRef.current.setLatLng([curLat, curLng]);
          }
        }

        animFrame = requestAnimationFrame(step);
      };

      animFrame = requestAnimationFrame(step);
    } else {
      if (pulseMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(pulseMarkerRef.current);
        pulseMarkerRef.current = null;
      }
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (pulseMarkerRef.current && mapRef.current) {
        try {
          mapRef.current.removeLayer(pulseMarkerRef.current);
        } catch (_) {}
        pulseMarkerRef.current = null;
      }
    };
  }, [isPlayingPipeline, allPoints]);

  // Selected coordinate and item focus & zoom
  useEffect(() => {
    if (!mapRef.current || !containerRef.current || !document.body.contains(containerRef.current)) return;
    const map = mapRef.current;

    let targetCoord: [number, number] | null = selectedCoord || null;
    let selectedItem: TimelineItem | undefined = undefined;

    if (selectedItemId) {
      selectedItem = items.find(i => i.id === selectedItemId);
      if (selectedItem) {
        if (selectedItem.isRoute) {
          let routeBoundsPts: [number, number][] = [];
          if (selectedItem.pathPoints && selectedItem.pathPoints.length >= 2) {
            routeBoundsPts = selectedItem.pathPoints
              .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
              .map(p => [Number(p.lat), Number(p.lng)] as [number, number]);
          } else if (selectedItem.origin && selectedItem.destination) {
            const oLat = Number(selectedItem.origin.lat);
            const oLng = Number(selectedItem.origin.lng);
            const dLat = Number(selectedItem.destination.lat);
            const dLng = Number(selectedItem.destination.lng);
            if (Number.isFinite(oLat) && Number.isFinite(oLng) && Number.isFinite(dLat) && Number.isFinite(dLng)) {
              routeBoundsPts = [
                [oLat, oLng],
                [dLat, dLng]
              ];
            }
          }

          if (routeBoundsPts.length >= 2) {
            try {
              map.fitBounds(L.latLngBounds(routeBoundsPts), {
                padding: [70, 70],
                maxZoom: 16,
                animate: true
              });

              if (routePolylinesMapRef.current.has(selectedItemId)) {
                const poly = routePolylinesMapRef.current.get(selectedItemId);
                if (poly) {
                  poly.bringToFront();
                  setTimeout(() => {
                    try {
                      poly.openPopup();
                    } catch (_) {}
                  }, 300);
                }
              }
              return;
            } catch (e) {
              console.warn('fitBounds error:', e);
            }
          }
        }
        if (!targetCoord) {
          if (selectedItem.lat != null && selectedItem.lng != null) {
            targetCoord = [Number(selectedItem.lat), Number(selectedItem.lng)];
          } else if (selectedItem.origin?.lat != null && selectedItem.origin?.lng != null) {
            targetCoord = [Number(selectedItem.origin.lat), Number(selectedItem.origin.lng)];
          } else if (selectedItem.destination?.lat != null && selectedItem.destination?.lng != null) {
            targetCoord = [Number(selectedItem.destination.lat), Number(selectedItem.destination.lng)];
          }
        }
      }
    }

    if (targetCoord && Number.isFinite(targetCoord[0]) && Number.isFinite(targetCoord[1])) {
      try {
        const targetZoom = Math.max(map.getZoom(), 16);

        if (selectedItemId && markersMapRef.current.has(selectedItemId)) {
          const marker = markersMapRef.current.get(selectedItemId);
          if (marker) {
            if (
              clusterMarkers &&
              markersLayerGroupRef.current &&
              typeof markersLayerGroupRef.current.zoomToShowLayer === 'function'
            ) {
              markersLayerGroupRef.current.zoomToShowLayer(marker, () => {
                setTimeout(() => {
                  try {
                    marker.openPopup();
                  } catch (_) {}
                }, 200);
              });
            } else {
              map.flyTo(targetCoord, targetZoom, {
                duration: 0.8,
                easeLinearity: 0.25
              });
              setTimeout(() => {
                try {
                  marker.openPopup();
                } catch (_) {}
              }, 350);
            }
            return;
          }
        }

        map.flyTo(targetCoord, targetZoom, {
          duration: 0.8,
          easeLinearity: 0.25
        });
      } catch (e) {
        try {
          map.setView(targetCoord, 16);
        } catch (_) {}
      }
    }
  }, [selectedCoord, selectedItemId, items, clusterMarkers]);

  // Auto-fit bounds whenever the filtered items or active filter (day, month, category, city, trip) changes
  useEffect(() => {
    if (!mapRef.current || !containerRef.current || !document.body.contains(containerRef.current)) return;
    const map = mapRef.current;

    // If a specific individual item is clicked/selected, let the item focus effect handle it
    if (selectedItemId) return;

    if (allPoints.length > 0) {
      try {
        const bounds = L.latLngBounds(allPoints);
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [60, 60],
            maxZoom: 15,
            animate: true
          });
        }
      } catch (e) {
        console.warn('Auto fitBounds on filter change error:', e);
      }
    }
  }, [allPoints, fitKey, selectedItemId]);

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const handleFitBounds = () => {
    if (mapRef.current && allPoints.length > 0) {
      mapRef.current.fitBounds(L.latLngBounds(allPoints), { padding: [60, 60], animate: true });
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden isolate">
      {/* Map DOM target */}
      <div id={containerId} ref={containerRef} className={className} />

      {/* Top-Left: Active Filter / Scope Pill */}
      {filterLabel && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 max-w-[80%] pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-md text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[240px] sm:max-w-[360px]">
              {filterLabel}
            </span>
          </div>
        </div>
      )}

      {/* Top-Right: Clean Map Style Switcher */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 p-1 bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md rounded-xl border border-gray-200/90 dark:border-gray-800 shadow-md text-[11px] font-semibold">
        <button
          onClick={() => setMapLayerTheme('google_roadmap')}
          className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
            mapLayerTheme === 'google_roadmap'
              ? 'bg-[#1A73E8] text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
          title="Google Maps Roadmap Style"
        >
          Map
        </button>
        <button
          onClick={() => setMapLayerTheme('google_satellite')}
          className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
            mapLayerTheme === 'google_satellite'
              ? 'bg-[#1A73E8] text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
          title="Satellite Imagery"
        >
          Satellite
        </button>
        <button
          onClick={() => setMapLayerTheme('dark')}
          className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
            mapLayerTheme === 'dark'
              ? 'bg-gray-800 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
          title="Dark Theme"
        >
          Dark
        </button>
      </div>

      {/* Bottom-Right: Clean Google Maps-Style Control Stack */}
      <div className="absolute bottom-5 right-4 z-20 flex flex-col gap-2 items-center pointer-events-auto">
        {/* Recenter / Fit View Button */}
        <button
          onClick={handleFitBounds}
          className="p-2.5 bg-white/95 dark:bg-[#181818]/95 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 backdrop-blur-md rounded-full border border-gray-200/90 dark:border-gray-800 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Fit view to all locations"
        >
          <Navigation className="w-4 h-4 text-[#1A73E8]" />
        </button>

        {/* Zoom In / Out Stack */}
        <div className="flex flex-col bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-md divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
