import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  RefreshCw,
  LogOut,
  AlertCircle,
  ExternalLink,
  SlidersHorizontal,
  KeyRound,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import {
  GPhotosAuthState,
  GPhotosUser,
  DEFAULT_GPHOTOS_CLIENT_ID,
  authenticateWithGooglePhotos,
  saveGPhotosAuth,
  clearGPhotosAuth,
  syncGooglePhotos
} from '../utils/googlePhotosService';
import { TimelineItem } from '../types';

interface GooglePhotosConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  authState: GPhotosAuthState;
  onUpdateAuthState: (state: GPhotosAuthState) => void;
  onPhotosLoaded: (photos: TimelineItem[], folderName: string) => void;
}

export const GooglePhotosPinwheelIcon: React.FC<{ className?: string }> = ({
  className = 'w-6 h-6'
}) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#EA4335" d="M12 2a5 5 0 0 0-5 5v5h5a5 5 0 0 0 0-10z" />
    <path fill="#FBBC05" d="M22 12a5 5 0 0 0-5-5h-5v5a5 5 0 0 0 10 0z" />
    <path fill="#34A853" d="M12 22a5 5 0 0 0 5-5v-5h-5a5 5 0 0 0 0 10z" />
    <path fill="#4285F4" d="M2 12a5 5 0 0 0 5 5h5v-5a5 5 0 0 0-10 0z" />
  </svg>
);

export const GooglePhotosConnectModal: React.FC<GooglePhotosConnectModalProps> = ({
  isOpen,
  onClose,
  authState,
  onUpdateAuthState,
  onPhotosLoaded
}) => {
  const [clientId, setClientId] = useState(authState.clientId || DEFAULT_GPHOTOS_CLIENT_ID);
  const [manualToken, setManualToken] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [syncCountTarget, setSyncCountTarget] = useState<number>(100);

  if (!isOpen) return null;

  // Handle Google OAuth Sign-in
  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const activeClientId = clientId.trim() || DEFAULT_GPHOTOS_CLIENT_ID;
      const { accessToken, user } = await authenticateWithGooglePhotos(activeClientId);

      const newState: GPhotosAuthState = {
        isConnected: true,
        accessToken,
        user: user || null,
        clientId: activeClientId,
        lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        totalPhotosCount: authState.totalPhotosCount || 0
      };

      onUpdateAuthState(newState);
      saveGPhotosAuth(newState);
      setSuccessMessage(`Connected as ${user?.displayName || user?.emailAddress || 'Google User'}!`);

      // Immediately sync photos
      await handleSyncPhotos(accessToken, syncCountTarget, newState);
    } catch (err: any) {
      console.error('Google Photos OAuth error:', err);
      setErrorMessage(
        err.message || 'Authentication was cancelled or failed. Please verify popup permissions.'
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Manual Access Token
  const handleApplyManualToken = async () => {
    if (!manualToken.trim()) {
      setErrorMessage('Please enter an OAuth Access Token.');
      return;
    }
    setErrorMessage(null);

    try {
      let user: GPhotosUser | undefined;
      try {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${manualToken.trim()}` }
        });
        if (userRes.ok) {
          const u = await userRes.json();
          user = {
            displayName: u.name || 'Google Photos User',
            emailAddress: u.email || '',
            photoLink: u.picture
          };
        }
      } catch {}

      const newState: GPhotosAuthState = {
        isConnected: true,
        accessToken: manualToken.trim(),
        user: user || null,
        clientId: clientId.trim() || DEFAULT_GPHOTOS_CLIENT_ID,
        lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        totalPhotosCount: authState.totalPhotosCount || 0
      };

      onUpdateAuthState(newState);
      saveGPhotosAuth(newState);
      setManualToken('');
      setSuccessMessage('Manual access token applied successfully!');
      await handleSyncPhotos(manualToken.trim(), syncCountTarget, newState);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to apply manual token.');
    }
  };

  // Synchronize photos
  const handleSyncPhotos = async (
    token: string,
    targetCount: number,
    stateToUpdate?: GPhotosAuthState
  ) => {
    setIsSyncing(true);
    setErrorMessage(null);

    try {
      const photos = await syncGooglePhotos(token, targetCount, (count, msg) => {
        setSyncStatusText(msg);
      });

      if (photos.length > 0) {
        onPhotosLoaded(photos, 'Google Photos Library');

        const updatedState: GPhotosAuthState = {
          ...(stateToUpdate || authState),
          isConnected: true,
          totalPhotosCount: photos.length,
          lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        onUpdateAuthState(updatedState);
        saveGPhotosAuth(updatedState);

        setSuccessMessage(`Successfully synced ${photos.length} photos from Google Photos!`);
      } else {
        setErrorMessage(
          'No photos found in your Google Photos library, or permission was not granted to read photos.'
        );
      }
    } catch (err: any) {
      console.error('Failed to sync Google Photos:', err);
      const message = err?.message || 'Could not fetch photos from Google Photos API.';
      setErrorMessage(message);

      // If the access token itself is dead (expired/revoked), don't leave the
      // "Connected" badge showing elsewhere in the app while every future
      // sync silently fails — reflect reality so the user knows to reconnect.
      if (typeof message === 'string' && message.toLowerCase().includes('session expired')) {
        const expiredState: GPhotosAuthState = {
          ...(stateToUpdate || authState),
          isConnected: false,
          accessToken: null
        };
        onUpdateAuthState(expiredState);
        saveGPhotosAuth(expiredState);
      }
    } finally {
      setIsSyncing(false);
      setSyncStatusText('');
    }
  };

  // Sign out / Disconnect
  const handleDisconnect = () => {
    clearGPhotosAuth();
    const emptyState: GPhotosAuthState = {
      isConnected: false,
      accessToken: null,
      user: null,
      clientId: DEFAULT_GPHOTOS_CLIENT_ID,
      totalPhotosCount: 0
    };
    onUpdateAuthState(emptyState);
    setSuccessMessage('Disconnected from Google Photos.');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181b] border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center shadow-xs">
              <GooglePhotosPinwheelIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Google Photos
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                  Client-Side OAuth
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Connect your real Google Photos library directly in your browser
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto min-h-0 text-sm">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* Sync Progress Indicator */}
          {isSyncing && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Synchronizing Google Photos...
                </span>
                <span>{syncStatusText}</span>
              </div>
              <div className="w-full bg-blue-500/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* Authentication State Card */}
          {authState.isConnected && authState.accessToken ? (
            <div className="p-4 rounded-xl bg-stone-100/70 dark:bg-white/[0.04] border border-stone-200/80 dark:border-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {authState.user?.photoLink ? (
                    <img
                      src={authState.user.photoLink}
                      alt={authState.user.displayName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-base">
                      {authState.user?.displayName?.[0] || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-stone-900 dark:text-white">
                        {authState.user?.displayName || 'Google Account'}
                      </h4>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Connected
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {authState.user?.emailAddress || 'Ready to synchronize library'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              </div>

              {/* Sync Actions */}
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span>Batch Sync Size:</span>
                  <div className="flex items-center gap-1">
                    {[50, 100, 250].map(count => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSyncCountTarget(count)}
                        className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                          syncCountTarget === count
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-stone-200/60 dark:bg-white/10 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-white/15'
                        }`}
                      >
                        {count} Photos
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() =>
                    handleSyncPhotos(authState.accessToken!, syncCountTarget)
                  }
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync {syncCountTarget} Photos from Google Photos</span>
                </button>
              </div>
            </div>
          ) : (
            /* Disconnected / Ready to Sign in */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-white/[0.02] border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1 leading-relaxed">
                    <p className="font-semibold text-stone-900 dark:text-stone-100">
                      Private & Client-Side Only
                    </p>
                    <p>
                      Your Google Photos access token stays strictly in your browser. Photos are
                      loaded directly from Google's high-speed CDN into your personal timeline
                      canvas with zero intermediaries.
                    </p>
                  </div>
                </div>

                {/* Primary Google Sign-In Button */}
                <button
                  type="button"
                  disabled={isAuthenticating || isSyncing}
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 px-4 rounded-xl bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-100 font-semibold text-xs flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isAuthenticating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Opening Google Sign-In Popup...</span>
                    </>
                  ) : (
                    <>
                      <GooglePhotosPinwheelIcon className="w-4 h-4" />
                      <span>Sign in with Google Photos</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Advanced Credentials Toggle */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 py-1 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Custom Client ID / Manual Access Token</span>
              </div>
              <span className="text-[10px] font-mono">{isAdvancedOpen ? 'Hide' : 'Configure'}</span>
            </button>

            {isAdvancedOpen && (
              <div className="mt-3 p-4 rounded-xl bg-stone-50 dark:bg-white/[0.02] border border-stone-200 dark:border-stone-800 space-y-4 animate-in fade-in duration-150">
                {/* Custom Client ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center justify-between">
                    <span>Google OAuth Client ID</span>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-500 hover:underline flex items-center gap-0.5"
                    >
                      Cloud Console <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    placeholder="Enter your Google OAuth Web Client ID..."
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100 font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-stone-400 leading-relaxed">
                    Default client ID is pre-filled. You can configure your own OAuth 2.0 Web Client ID
                    with origin <code>{window.location.origin}</code> and the{' '}
                    <code>photoslibrary.readonly</code> scope.
                  </p>
                </div>

                {/* Direct Manual Access Token */}
                <div className="space-y-1.5 pt-2 border-t border-stone-200 dark:border-stone-800">
                  <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center justify-between">
                    <span>Direct Access Token (Bearer)</span>
                    <span className="text-[10px] text-stone-400 font-mono">OAuth Playground / CLI</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={manualToken}
                      onChange={e => setManualToken(e.target.value)}
                      placeholder="ya29.a0AfH6S..."
                      className="flex-1 px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100 font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyManualToken}
                      className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 dark:bg-stone-700 dark:hover:bg-stone-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Zero demo data • Clean direct sync</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
