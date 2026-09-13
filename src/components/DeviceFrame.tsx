import React, { useState, useRef, useEffect } from 'react';
import {
  Monitor,
  Laptop,
  Tablet,
  Smartphone,
  RotateCw,
  Maximize2,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { DeviceConfig } from '../types';

interface DeviceFrameProps {
  bundledHtml: string;
  entryPoint: string;
  availableHtmlFiles: string[];
  onSelectEntryPoint: (path: string) => void;
  onReload: () => void;
  projectName: string;
}

const DEVICE_PRESETS: DeviceConfig[] = [
  { id: 'responsive', name: 'Responsive (100%)', width: '100%', height: '100%', icon: 'Monitor' },
  { id: 'laptop', name: 'Laptop (1366 × 768)', width: 1366, height: 768, icon: 'Laptop' },
  { id: 'tablet', name: 'Tablet (768 × 1024)', width: 768, height: 1024, icon: 'Tablet' },
  { id: 'mobile_iphone', name: 'iPhone (375 × 667)', width: 375, height: 667, icon: 'Smartphone' },
  { id: 'mobile_android', name: 'Android (412 × 915)', width: 412, height: 915, icon: 'Smartphone' },
];

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  bundledHtml,
  entryPoint,
  availableHtmlFiles,
  onSelectEntryPoint,
  onReload,
  projectName,
}) => {
  const [currentDevice, setCurrentDevice] = useState<string>('responsive');
  const [isLandscape, setIsLandscape] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isAutoFit, setIsAutoFit] = useState(true);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [isHtmlDropdownOpen, setIsHtmlDropdownOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const selectedPreset = DEVICE_PRESETS.find(p => p.id === currentDevice) || DEVICE_PRESETS[0];

  const handleSelectDevice = (id: string) => {
    setCurrentDevice(id);
    setIsAutoFit(true);
  };

  const handlePopOut = () => {
    // Never execute the uploaded ZIP as an unsandboxed same-origin document.
    // Use a data URL so the new top-level document gets an opaque origin and
    // cannot access Emreh's localStorage/cookies/DOM even though scripts run.
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(bundledHtml)}`;
    window.open(dataUrl, '_blank', 'noopener,noreferrer');
  };

  const handleFullscreen = () => {
    iframeRef.current?.requestFullscreen?.();
  };

  let frameWidth: number | string = selectedPreset.width;
  let frameHeight: number | string = selectedPreset.height;

  if (typeof frameWidth === 'number' && typeof frameHeight === 'number' && isLandscape) {
    const temp = frameWidth;
    frameWidth = frameHeight;
    frameHeight = temp;
  }

  const fitScale = React.useMemo(() => {
    if (typeof frameWidth !== 'number' || typeof frameHeight !== 'number') return 1;
    if (containerDimensions.width === 0 || containerDimensions.height === 0) return 1;
    const paddingX = 32;
    const paddingY = 32;
    const scaleX = (containerDimensions.width - paddingX) / frameWidth;
    const scaleY = (containerDimensions.height - paddingY) / frameHeight;
    const best = Math.min(1, scaleX, scaleY);
    return Math.max(0.25, Math.round(best * 100) / 100);
  }, [frameWidth, frameHeight, containerDimensions]);

  const effectiveScale = isAutoFit && currentDevice !== 'responsive' ? fitScale : zoomScale;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      <div className="h-11 bg-slate-900/90 border-b border-slate-800/80 px-3 flex items-center justify-between gap-2 select-none z-10">
        <div className="flex items-center gap-1.5 flex-1 max-w-md bg-slate-950/80 border border-slate-800 rounded-md px-2.5 py-1 text-xs">
          <button onClick={onReload} title="Reload sandbox" className="text-slate-400 hover:text-white p-0.5 rounded transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <span className="text-cyan-500 font-mono text-[11px]">zip://</span>
          <div className="relative flex-1">
            <button onClick={() => setIsHtmlDropdownOpen(!isHtmlDropdownOpen)} className="w-full text-left font-mono text-slate-200 hover:text-cyan-400 flex items-center justify-between transition-colors truncate">
              <span className="truncate">{entryPoint}</span>
              {availableHtmlFiles.length > 1 && <ChevronDown className="w-3 h-3 text-slate-400 ml-1 shrink-0" />}
            </button>
            {isHtmlDropdownOpen && availableHtmlFiles.length > 1 && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsHtmlDropdownOpen(false)} />
                <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-40">
                  <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">Switch HTML Page</div>
                  {availableHtmlFiles.map(path => (
                    <button key={path} onClick={() => { onSelectEntryPoint(path); setIsHtmlDropdownOpen(false); }} className={`w-full text-left px-2.5 py-1.5 text-xs font-mono transition-colors ${path === entryPoint ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}>
                      {path}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          {DEVICE_PRESETS.map(preset => {
            const isSelected = currentDevice === preset.id;
            return (
              <button key={preset.id} onClick={() => handleSelectDevice(preset.id)} title={preset.name} className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-all cursor-pointer ${isSelected ? 'bg-cyan-500/20 text-cyan-400 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'}`}>
                {preset.id === 'responsive' && <Monitor className="w-3.5 h-3.5" />}
                {preset.id === 'laptop' && <Laptop className="w-3.5 h-3.5" />}
                {preset.id === 'tablet' && <Tablet className="w-3.5 h-3.5" />}
                {(preset.id === 'mobile_iphone' || preset.id === 'mobile_android') && <Smartphone className="w-3.5 h-3.5" />}
                <span className="hidden xl:inline text-[11px]">{preset.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          {currentDevice !== 'responsive' && (
            <>
              <button onClick={() => setIsLandscape(!isLandscape)} title="Rotate Device (Portrait/Landscape)" className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer">
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsAutoFit(!isAutoFit)} title={isAutoFit ? 'Switch to Manual 100% Zoom' : 'Auto-Fit to Window'} className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${isAutoFit ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white'}`}>
                <span>Auto-Fit</span>
                <span className="text-[10px] opacity-80">{Math.round(effectiveScale * 100)}%</span>
              </button>
            </>
          )}
          <div className="flex items-center gap-1 text-slate-400 text-xs px-1">
            <button onClick={() => { setIsAutoFit(false); setZoomScale(Math.max(0.4, effectiveScale - 0.15)); }} disabled={effectiveScale <= 0.4} className="p-1 hover:text-white disabled:opacity-30 cursor-pointer" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] w-9 text-center">{Math.round(effectiveScale * 100)}%</span>
            <button onClick={() => { setIsAutoFit(false); setZoomScale(Math.min(1.75, effectiveScale + 0.15)); }} disabled={effectiveScale >= 1.75} className="p-1 hover:text-white disabled:opacity-30 cursor-pointer" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={handleFullscreen} title="Fullscreen Sandbox" className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handlePopOut} title="Open isolated copy in new window / tab" className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 bg-slate-950 flex items-center justify-center p-2 sm:p-4 overflow-auto relative">
        <div style={{ width: typeof frameWidth === 'number' ? `${frameWidth}px` : '100%', height: typeof frameHeight === 'number' ? `${frameHeight}px` : '100%', transform: `scale(${effectiveScale})`, transformOrigin: 'center center', transition: 'width 0.2s ease, height 0.2s ease, transform 0.15s ease' }} className={`relative bg-black transition-shadow duration-300 flex flex-col overflow-hidden ${currentDevice === 'responsive' ? 'w-full h-full rounded-none' : 'rounded-2xl border-4 border-slate-800 shadow-2xl shadow-black/80 max-h-full max-w-full'}`}>
          {(currentDevice === 'mobile_iphone' || currentDevice === 'mobile_android') && <div className="h-4 bg-slate-900 flex items-center justify-center shrink-0 border-b border-slate-800/40 select-none"><div className="w-16 h-2.5 bg-slate-950 rounded-full" /></div>}

          {/* Keep the runner opaque-origin sandboxed. The uploaded ZIP can
              execute scripts, but cannot share Emreh's storage or DOM origin. */}
          <iframe
            ref={iframeRef}
            srcDoc={bundledHtml}
            title={`${projectName} - Live Sandbox`}
            sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-pointer-lock allow-orientation-lock"
            allow=""
            referrerPolicy="no-referrer"
            className="w-full flex-1 border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
};
