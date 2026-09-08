import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  CloudDownload,
  FolderOpen,
  Tag,
  StickyNote,
  Loader2,
  FileSpreadsheet,
  Upload,
  Sparkles,
  HelpCircle,
  Trash2,
  Check
} from 'lucide-react';
import {
  getRaindropConfig,
  saveRaindropConfig,
  clearRaindropConfig,
  testRaindropConnection,
  fetchRaindropCollections,
  syncRaindropBookmarks,
  parseRaindropCsv,
  parseRaindropJson,
  parseRaindropHtml,
  RaindropCollection,
  RaindropSyncResult
} from '../utils/raindropSync';
import { TimelineItem } from '../types';
import { SyncStatusBanner } from './common/SyncStatusBanner';
import { RateLimitDetails, SyncErrorCategory } from '../utils/resilientFetch';

interface RaindropSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySyncedData: (result: RaindropSyncResult, sourceName: string) => void;
}

export const RaindropSyncModal: React.FC<RaindropSyncModalProps> = ({
  isOpen,
  onClose,
  onApplySyncedData
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'file'>('sync');
  
  // API Sync State
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number>(0);
  const [collections, setCollections] = useState<RaindropCollection[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastSyncCount, setLastSyncCount] = useState<number>(0);

  // Status & Progress
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ percent: 0, message: '' });
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
    category?: SyncErrorCategory;
    statusCode?: number;
    rateLimit?: RateLimitDetails;
    isProxied?: boolean;
    retryAction?: () => void;
  } | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  // File Import State
  const [isFileParsing, setIsFileParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileSyncResult, setFileSyncResult] = useState<RaindropSyncResult | null>(null);
  const [importedFileName, setImportedFileName] = useState('');

  // Hydrate config on open
  useEffect(() => {
    if (isOpen) {
      const cfg = getRaindropConfig();
      setApiToken(cfg.apiToken);
      setAutoSync(cfg.autoSync);
      setSelectedCollectionId(cfg.selectedCollectionId || 0);
      setUserName(cfg.userName || '');
      setUserEmail(cfg.userEmail || '');
      setLastSyncTime(cfg.lastSyncTime);
      setLastSyncCount(cfg.lastSyncCount);
      setStatusMessage(null);
      setSyncProgress({ percent: 0, message: '' });

      if (cfg.apiToken) {
        // Refresh collections list in the background
        fetchRaindropCollections(cfg.apiToken).then(colls => {
          if (colls.length > 0) {
            setCollections(colls);
          }
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!apiToken.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a Raindrop.io test token.' });
      return;
    }
    setIsTesting(true);
    setStatusMessage({ type: 'info', text: 'Verifying token with Raindrop.io API...' });

    try {
      const res = await testRaindropConnection(apiToken);
      if (res.ok) {
        const uName = res.user?.name || 'Raindrop User';
        const uEmail = res.user?.email || '';
        setUserName(uName);
        setUserEmail(uEmail);
        saveRaindropConfig({
          apiToken: apiToken.trim(),
          userName: uName,
          userEmail: uEmail
        });

        const colls = await fetchRaindropCollections(apiToken);
        setCollections(colls);

        setStatusMessage({
          type: 'success',
          text: `Connected successfully as ${uName}${uEmail ? ` (${uEmail})` : ''}!`,
          isProxied: res.isProxied
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to authenticate token. Check token in Raindrop settings.',
          category: res.category,
          statusCode: res.statusCode,
          rateLimit: res.rateLimit,
          isProxied: res.isProxied,
          retryAction: handleTestConnection
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error communicating with Raindrop.io',
        category: err?.category || 'network',
        statusCode: err?.status,
        rateLimit: err?.rateLimit,
        isProxied: err?.isProxied,
        retryAction: handleTestConnection
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleStartSync = async () => {
    if (!apiToken.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter and verify your Raindrop.io token first.' });
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ percent: 10, message: 'Initiating synchronization...' });
    setStatusMessage(null);

    // Save current config preferences
    saveRaindropConfig({
      apiToken: apiToken.trim(),
      autoSync,
      selectedCollectionId
    });

    try {
      const result = await syncRaindropBookmarks({
        token: apiToken.trim(),
        collectionId: selectedCollectionId,
        onProgress: (message, percent) => {
          setSyncProgress({ percent, message });
        }
      });

      setLastSyncTime(new Date().toISOString());
      setLastSyncCount(result.count);

      const targetCol = collections.find(c => c._id === selectedCollectionId);
      const colName = targetCol ? targetCol.title : 'All Bookmarks';

      onApplySyncedData(result, `Raindrop Sync (${colName})`);

      setStatusMessage({
        type: 'success',
        text: `Successfully synced ${result.count} bookmarks, ${Object.keys(result.tags).length} tagged links, and ${Object.keys(result.notes).length} notes!`,
        rateLimit: result.rateLimit,
        isProxied: result.isProxied
      });
    } catch (err: any) {
      console.error('Raindrop sync error:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Synchronization failed. Please check your network and token.',
        category: err?.category || (err?.status === 401 ? 'auth' : err?.status === 429 ? 'rate_limit' : 'unknown'),
        statusCode: err?.status,
        rateLimit: err?.rateLimit,
        isProxied: err?.isProxied,
        retryAction: handleStartSync
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    if (confirm('Disconnect Raindrop.io sync and clear your saved test token?')) {
      clearRaindropConfig();
      setApiToken('');
      setUserName('');
      setUserEmail('');
      setCollections([]);
      setLastSyncTime(null);
      setLastSyncCount(0);
      setStatusMessage({ type: 'info', text: 'Raindrop.io token disconnected.' });
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processRaindropFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processRaindropFile(e.target.files[0]);
    }
  };

  const processRaindropFile = async (file: File) => {
    setIsFileParsing(true);
    setImportedFileName(file.name);
    setStatusMessage(null);

    try {
      const nameLower = file.name.toLowerCase();
      let result: RaindropSyncResult;

      if (nameLower.endsWith('.csv')) {
        const text = await file.text();
        result = parseRaindropCsv(text);
      } else if (nameLower.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        result = parseRaindropJson(parsed);
      } else if (nameLower.endsWith('.html') || nameLower.endsWith('.htm')) {
        const text = await file.text();
        result = parseRaindropHtml(text);
      } else {
        throw new Error('Unsupported format. Please upload a Raindrop .csv, .json, or .html export file.');
      }

      setFileSyncResult(result);
      if (result.count === 0) {
        setStatusMessage({
          type: 'info',
          text: 'File was parsed, but no bookmark links were found.'
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Found ${result.count} bookmarks with ${Object.keys(result.tags).length} tags and ${Object.keys(result.notes).length} notes.`
        });
      }
    } catch (err: any) {
      console.error('Failed to parse Raindrop file', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to read Raindrop export file.'
      });
      setFileSyncResult(null);
    } finally {
      setIsFileParsing(false);
    }
  };

  const handleConfirmFileImport = () => {
    if (!fileFileSyncReady) return;
    onApplySyncedData(fileSyncResult!, `Raindrop File (${importedFileName})`);
    onClose();
  };

  const fileFileSyncReady = fileSyncResult && fileSyncResult.count > 0;
  const isConnected = Boolean(apiToken && userName);

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-md transition-opacity"
        onClick={!isSyncing ? onClose : undefined}
      />

      <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-2xl w-full max-w-xl max-h-[92dvh] overflow-hidden relative z-10 flex flex-col border border-gray-200 dark:border-white/10">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50/60 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0089FF] to-[#0052CC] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Raindrop.io Bookmarks
                </h3>
                {isConnected ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    One-Time Setup
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sync collections, tags, notes, and cover snapshots into your browser view
              </p>
            </div>
          </div>

          {!isSyncing && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 pb-2 flex gap-2 border-b border-gray-100 dark:border-white/5 bg-gray-50/40 dark:bg-[#121212]">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'sync'
                ? 'bg-[#0089FF] text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>API Sync (One-Time Setup)</span>
          </button>

          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'file'
                ? 'bg-[#0089FF] text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Backup File (.csv / .html / .json)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(92dvh-180px)] space-y-4">
          {/* Global Granular Sync Status Banner */}
          {statusMessage && (
            <SyncStatusBanner
              type={statusMessage.type}
              category={statusMessage.category}
              statusCode={statusMessage.statusCode}
              message={statusMessage.text}
              rateLimit={statusMessage.rateLimit}
              isProxied={statusMessage.isProxied}
              onRetry={statusMessage.retryAction}
              isRetrying={isTesting || isSyncing}
              onDismiss={() => setStatusMessage(null)}
              className="mb-2"
            />
          )}

          {activeTab === 'sync' ? (
            /* TAB 1: API SYNC */
            <div className="space-y-4">
              {/* Token Input Card */}
              <div className="bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-2xl border border-gray-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <span>Raindrop.io Test Token</span>
                    <span className="text-[10px] text-gray-400 font-normal">(Personal Access Token)</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="text-[11px] font-semibold text-[#0089FF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>How to get a token?</span>
                  </button>
                </div>

                {/* Instructions Collapsible */}
                {showInstructions && (
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 text-xs text-gray-700 dark:text-gray-300 space-y-2 animate-in fade-in duration-150">
                    <div className="font-bold text-[#0089FF] flex items-center justify-between">
                      <span>3 Simple Steps (Free & Never Expires):</span>
                      <a
                        href="https://app.raindrop.io/settings/integrations"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#0089FF] hover:underline"
                      >
                        Open Settings <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                      <li>
                        Go to Raindrop <strong>Settings &gt; Integrations</strong> at{' '}
                        <a
                          href="https://app.raindrop.io/settings/integrations"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#0089FF] underline"
                        >
                          app.raindrop.io/settings/integrations
                        </a>
                      </li>
                      <li>
                        Scroll down to <strong>"For Developers"</strong> and click <strong>"Create new app"</strong>
                      </li>
                      <li>
                        Name it anything (e.g. <em>Emreh</em>), save, then click <strong>"Create test token"</strong>
                      </li>
                      <li>Copy the generated token string and paste it into the field below.</li>
                    </ol>
                  </div>
                )}

                <div className="relative flex items-center">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={apiToken}
                    onChange={e => setApiToken(e.target.value)}
                    placeholder="Paste your Raindrop.io test token here..."
                    className="w-full pl-3 pr-24 py-2.5 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-mono text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0089FF] transition-all"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                      title={showToken ? 'Hide token' : 'Show token'}
                    >
                      {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      disabled={isTesting || !apiToken.trim()}
                      onClick={handleTestConnection}
                      className="px-2 py-1 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Verify'}
                    </button>
                  </div>
                </div>

                {isConnected && (
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Logged in as <strong className="text-gray-800 dark:text-white">{userName}</strong>
                      {userEmail && <span> ({userEmail})</span>}
                    </div>
                    <button
                      onClick={handleDisconnect}
                      className="text-[10px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Sync Options & Configuration */}
              <div className="bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-2xl border border-gray-200/80 dark:border-white/10 space-y-3">
                <div className="font-bold text-xs text-gray-800 dark:text-gray-200">
                  Sync Configuration
                </div>

                {/* Collection Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                    Collection to Synchronize
                  </label>
                  <select
                    value={selectedCollectionId}
                    onChange={e => setSelectedCollectionId(Number(e.target.value))}
                    disabled={isSyncing}
                    className="w-full px-3 py-2 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value={0}>All Bookmarks (Entire Library)</option>
                    <option value={-1}>Unsorted Collection Only</option>
                    {collections
                      .filter(c => c._id > 0)
                      .map(c => (
                        <option key={c._id} value={c._id}>
                          {c.title} ({c.count} items)
                        </option>
                      ))}
                  </select>
                </div>

                {/* Auto Sync Toggle */}
                <label className="flex items-center justify-between p-2.5 bg-white dark:bg-[#121212] rounded-xl border border-gray-200/60 dark:border-white/5 cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Auto-sync on application startup
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Keeps your personal archive freshly synchronized with Raindrop.io
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={e => {
                      setAutoSync(e.target.checked);
                      saveRaindropConfig({ autoSync: e.target.checked });
                    }}
                    className="w-4 h-4 rounded text-[#0089FF] focus:ring-[#0089FF] cursor-pointer"
                  />
                </label>
              </div>

              {/* Sync Progress Display */}
              {isSyncing && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/50 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0089FF]">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{syncProgress.message}</span>
                    </div>
                    <span>{syncProgress.percent}%</span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-900/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#0089FF] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${syncProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Sync Status / Info Card */}
              {lastSyncTime && (
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>
                      Last synchronized: {new Date(lastSyncTime).toLocaleString()} ({lastSyncCount} bookmarks)
                    </span>
                  </div>
                </div>
              )}

              {/* Primary Sync Action Button */}
              <button
                type="button"
                onClick={handleStartSync}
                disabled={isSyncing || !apiToken.trim()}
                className="w-full py-3 bg-[#0089FF] hover:bg-[#0076de] active:scale-[0.99] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Synchronizing Raindrop Bookmarks...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Sync Bookmarks Now</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* TAB 2: FILE IMPORT */
            <div className="space-y-4">
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => {
                  const input = document.getElementById('raindrop-file-input');
                  input?.click();
                }}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                  isDragging
                    ? 'border-[#0089FF] bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]'
                    : 'border-gray-200 dark:border-white/10 hover:border-[#0089FF]/60 bg-gray-50/50 dark:bg-[#1a1a1a]'
                }`}
              >
                <input
                  id="raindrop-file-input"
                  type="file"
                  accept=".csv,.json,.html,.htm"
                  onChange={handleFileInput}
                  className="hidden"
                />

                {isFileParsing ? (
                  <div className="py-4 flex flex-col items-center space-y-2">
                    <Loader2 className="w-8 h-8 text-[#0089FF] animate-spin" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Reading Raindrop export file...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#0089FF] flex items-center justify-center shadow-inner">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        Drop your Raindrop backup file here
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Supports <strong>.csv</strong>, <strong>.json</strong>, and <strong>.html</strong> exports
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[#0089FF] text-[10px] font-bold font-mono">
                        raindrop_bookmarks.csv
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[#0089FF] text-[10px] font-bold font-mono">
                        raindrop.html
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[#0089FF] text-[10px] font-bold font-mono">
                        bookmarks.json
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* How to export card */}
              <div className="p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl border border-gray-200/70 dark:border-white/5 text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
                <div className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <CloudDownload className="w-3.5 h-3.5 text-[#0089FF]" />
                  <span>How to export from Raindrop:</span>
                </div>
                <div className="text-[11px] leading-relaxed pl-1">
                  In Raindrop.io, click <strong>Settings &gt; Backups</strong>, then click <strong>"Export CSV"</strong> or <strong>"Export HTML"</strong>. Download the file and upload it above.
                </div>
              </div>

              {/* Parsed Result Preview */}
              {fileSyncResult && (
                <div className="p-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 dark:text-white">
                      File Preview: {importedFileName}
                    </span>
                    <span className="text-[11px] font-bold text-[#0089FF]">
                      {fileSyncResult.count} bookmarks ready
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-white dark:bg-[#121212] rounded-xl border border-gray-200/60 dark:border-white/5">
                      <div className="text-base font-bold text-gray-900 dark:text-white">
                        {fileSyncResult.count}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">
                        Bookmarks
                      </div>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-[#121212] rounded-xl border border-gray-200/60 dark:border-white/5">
                      <div className="text-base font-bold text-indigo-500">
                        {Object.keys(fileSyncResult.tags).length}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">
                        Tags Included
                      </div>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-[#121212] rounded-xl border border-gray-200/60 dark:border-white/5">
                      <div className="text-base font-bold text-emerald-500">
                        {Object.keys(fileSyncResult.notes).length}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">
                        Notes / Excerpts
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmFileImport}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Import {fileSyncResult.count} Bookmarks Into Timeline</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
