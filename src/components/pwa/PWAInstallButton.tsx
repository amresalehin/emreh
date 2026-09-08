import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'subtle' | 'badge';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = ''
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [installedFeedback, setInstalledFeedback] = useState(false);

  // If already installed, hide or show small badge
  if (isInstalled) {
    if (variant === 'badge') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <Check className="w-3 h-3" /> PWA Installed
        </span>
      );
    }
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstalledFeedback(true);
        setTimeout(() => setInstalledFeedback(false), 3000);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'compact' && (
        <button
          type="button"
          onClick={handleAction}
          title="Install Emreh on Android or Web"
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all cursor-pointer shadow-xs active:scale-95 ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      )}

      {variant === 'subtle' && (
        <button
          type="button"
          onClick={handleAction}
          title="Install Emreh"
          className={`flex items-center gap-1 text-[11px] font-medium text-amber-500 hover:text-amber-400 transition-colors cursor-pointer ${className}`}
        >
          <Download className="w-3 h-3" />
          <span>Install</span>
        </button>
      )}

      {variant === 'full' && (
        <button aria-label="Action"
          type="button"
          onClick={handleAction}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-md active:scale-98 cursor-pointer ${className}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Install Emreh App (Android / Web)</span>
        </button>
      )}

      {/* Guide Modal for iOS Safari / Chrome instructions */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#18181b] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-5 relative text-left">
            <button aria-label="Action"
              onClick={() => setShowGuide(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Install Emreh</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Add to Home Screen as a native app</p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
                <p className="text-gray-500">To install Emreh on iOS Safari:</p>
                <div className="flex items-start gap-2 bg-gray-50 dark:bg-white/5 p-2.5 rounded-lg border border-black/5 dark:border-white/5">
                  <span className="font-bold text-amber-500">1.</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    Tap the <Share className="w-3.5 h-3.5 text-blue-500 inline" /> <strong>Share</strong> button in Safari's toolbar.
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-gray-50 dark:bg-white/5 p-2.5 rounded-lg border border-black/5 dark:border-white/5">
                  <span className="font-bold text-amber-500">2.</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    Scroll down and tap <PlusSquare className="w-3.5 h-3.5 text-amber-500 inline" /> <strong>Add to Home Screen</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-gray-50 dark:bg-white/5 p-2.5 rounded-lg border border-black/5 dark:border-white/5">
                  <span className="font-bold text-amber-500">3.</span>
                  <span>Tap <strong>Add</strong> in the top-right corner to finish.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
                <p className="text-gray-500">To install Emreh on Android or Desktop:</p>
                <div className="flex items-start gap-2 bg-gray-50 dark:bg-white/5 p-2.5 rounded-lg border border-black/5 dark:border-white/5">
                  <span className="font-bold text-amber-500">1.</span>
                  <span>Open the browser menu (<strong>⋮</strong> in Chrome/Edge).</span>
                </div>
                <div className="flex items-start gap-2 bg-gray-50 dark:bg-white/5 p-2.5 rounded-lg border border-black/5 dark:border-white/5">
                  <span className="font-bold text-amber-500">2.</span>
                  <span>Select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-start gap-2 bg-gray-50 dark:bg-white/5 p-2.5 rounded-lg border border-black/5 dark:border-white/5">
                  <span className="font-bold text-amber-500">3.</span>
                  <span>Confirm installation to launch Emreh as an offline-ready standalone application!</span>
                </div>
              </div>
            )}

            <button aria-label="Action"
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full py-2 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-900 dark:text-white transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
