import React, { useState } from 'react';
import {
  X,
  Download,
  FileJson,
  FileSpreadsheet,
  Globe,
  MapPin,
  Route,
  Check,
  Layers,
  Sparkles
} from 'lucide-react';
import { TimelineItem } from '../../types';
import {
  exportTimelineToGeoJSON,
  exportTimelineToKML,
  exportTimelineToCSV,
  downloadFile
} from '../../utils/dataParser';

interface MapDataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  timelineData: TimelineItem[];
  currentDate?: Date;
}

export const MapDataExportModal: React.FC<MapDataExportModalProps> = ({
  isOpen,
  onClose,
  timelineData,
  currentDate
}) => {
  const [exportScope, setExportScope] = useState<'all' | 'places_only' | 'routes_only' | 'current_day'>('all');
  const [includeResolvedMetadata, setIncludeResolvedMetadata] = useState(true);
  const [format, setFormat] = useState<'geojson' | 'kml' | 'csv' | 'json'>('geojson');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter items based on chosen scope
  const dateStr = currentDate ? currentDate.toISOString().slice(0, 10) : '';

  const filteredItems = timelineData.filter(item => {
    if (item.type !== 'maps') return false;
    if (exportScope === 'current_day' && dateStr) {
      return item.ts.slice(0, 10) === dateStr;
    }
    if (exportScope === 'places_only') {
      return !item.isRoute;
    }
    if (exportScope === 'routes_only') {
      return !!item.isRoute;
    }
    return true;
  });

  const handleDownload = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const scopeLabel = exportScope === 'current_day' ? `day_${dateStr}` : exportScope;

    if (format === 'geojson') {
      const geojsonStr = exportTimelineToGeoJSON(filteredItems, includeResolvedMetadata);
      downloadFile(geojsonStr, `timeline_map_data_${scopeLabel}_${timestamp}.geojson`, 'application/geo+json');
    } else if (format === 'kml') {
      const kmlStr = exportTimelineToKML(filteredItems);
      downloadFile(kmlStr, `timeline_map_data_${scopeLabel}_${timestamp}.kml`, 'application/vnd.google-earth.kml+xml');
    } else if (format === 'csv') {
      const csvStr = exportTimelineToCSV(filteredItems);
      downloadFile(csvStr, `timeline_map_data_${scopeLabel}_${timestamp}.csv`, 'text/csv');
    } else if (format === 'json') {
      const jsonStr = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          scope: exportScope,
          count: filteredItems.length,
          items: filteredItems
        },
        null,
        2
      );
      downloadFile(jsonStr, `timeline_map_data_${scopeLabel}_${timestamp}.json`, 'application/json');
    }

    setDownloadSuccess(format.toUpperCase());
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#181818] border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Export Resolved Map Data</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Export GPS routes, extracted road paths, and resolved places
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Format Selection */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2 uppercase tracking-wider">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  id: 'geojson',
                  name: 'GeoJSON (.geojson)',
                  desc: 'Standard GIS vector format with features & tracks',
                  icon: Globe
                },
                {
                  id: 'kml',
                  name: 'Google Earth KML (.kml)',
                  desc: 'Placemarks and paths for Google Earth & Maps',
                  icon: Layers
                },
                {
                  id: 'csv',
                  name: 'Spreadsheet CSV (.csv)',
                  desc: 'Tabular latitude, longitude, and place details',
                  icon: FileSpreadsheet
                },
                {
                  id: 'json',
                  name: 'Full JSON (.json)',
                  desc: 'Raw structured objects including path coordinates',
                  icon: FileJson
                }
              ].map(f => {
                const Icon = f.icon;
                const isSelected = format === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-[#1A73E8] text-[#1A73E8] shadow-xs'
                        : 'bg-gray-50/50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 hover:border-blue-400 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-bold">{f.name}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{f.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scope Selection */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2 uppercase tracking-wider">
              Export Scope ({filteredItems.length} items)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'all', label: 'All Map History', icon: MapPin },
                { id: 'places_only', label: 'Visited Places Only', icon: MapPin },
                { id: 'routes_only', label: 'Extracted Routes & Trips', icon: Route },
                { id: 'current_day', label: 'Selected Day Only', icon: Sparkles }
              ].map(s => {
                const Icon = s.icon;
                const isSelected = exportScope === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setExportScope(s.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-emerald-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeResolvedMetadata}
                onChange={e => setIncludeResolvedMetadata(e.target.checked)}
                className="rounded accent-[#1A73E8]"
              />
              <span>Include resolved address, category, and venue names</span>
            </label>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 pl-5">
              Includes extracted road polylines, reverse-geocoded venues, and coordinates.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={filteredItems.length === 0}
            className="px-5 py-2.5 bg-[#1A73E8] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Downloaded {downloadSuccess}!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
