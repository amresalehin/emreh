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
  Check,
  Bookmark,
  Globe,
  Plus,
  Compass,
  ArrowRight,
  Database,
  Brain,
  Boxes,
  CheckSquare,
  Wand2,
  FileText,
  Code,
  BookOpen
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
import {
  parseNetscapeBookmarksHtml,
  parsePocketHtml,
  parsePinboardJson,
  parseLinkdingJson,
  parseMymindExport,
  parseFabricExport,
  parseKarakeepExport,
  parseInstapaperExport,
  parseGodModeCustomImport,
  UniversalBookmarkResult,
  BookmarkServiceName
} from '../utils/bookmarkSyncServices';
import {
  getPinterestConfig,
  savePinterestConfig,
  clearPinterestConfig,
  testPinterestConnection,
  fetchPinterestBoards,
  syncPinterestPins,
  parsePinterestJson,
  parsePinterestCsv,
  fetchPinterestRss,
  parsePinterestUrlBatch,
  PinterestBoard
} from '../utils/pinterestSync';
import { TimelineItem } from '../types';
import { SyncStatusBanner } from './common/SyncStatusBanner';
import { RateLimitDetails, SyncErrorCategory } from '../utils/resilientFetch';

interface BookmarkSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySyncedData: (result: RaindropSyncResult | UniversalBookmarkResult, sourceName: string) => void;
  initialService?: BookmarkServiceName;
}

export const BookmarkSyncModal: React.FC<BookmarkSyncModalProps> = ({
  isOpen,
  onClose,
  onApplySyncedData,
  initialService = 'raindrop'
}) => {
  const [activeService, setActiveService] = useState<BookmarkServiceName>(initialService);

  // Raindrop API Sync State
  const [raindropSubTab, setRaindropSubTab] = useState<'api' | 'file'>('api');
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number>(0);
  const [collections, setCollections] = useState<RaindropCollection[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastSyncCount, setLastSyncCount] = useState<number>(0);

  // Pinterest State
  const [pinterestSubTab, setPinterestSubTab] = useState<'api' | 'file' | 'rss' | 'links'>('api');
  const [pinterestToken, setPinterestToken] = useState('');
  const [showPinterestToken, setShowPinterestToken] = useState(false);
  const [pinterestAutoSync, setPinterestAutoSync] = useState(false);
  const [selectedPinterestBoardId, setSelectedPinterestBoardId] = useState<string>('all');
  const [pinterestBoards, setPinterestBoards] = useState<PinterestBoard[]>([]);
  const [pinterestUsername, setPinterestUsername] = useState<string>('');
  const [pinterestProfileImage, setPinterestProfileImage] = useState<string>('');
  const [pinterestLastSyncTime, setPinterestLastSyncTime] = useState<string | null>(null);
  const [pinterestLastSyncCount, setPinterestLastSyncCount] = useState<number>(0);
  const [isTestingPinterest, setIsTestingPinterest] = useState(false);
  const [isSyncingPinterest, setIsSyncingPinterest] = useState(false);
  const [pinterestTestStatus, setPinterestTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pinterestPublicUrl, setPinterestPublicUrl] = useState('');
  const [isFetchingRss, setIsFetchingRss] = useState(false);
  const [pinterestLinksText, setPinterestLinksText] = useState('');
  const [pinterestLinksBoard, setPinterestLinksBoard] = useState('Pinterest');

  // Status & loading states
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'error' | 'warning' | 'success' | 'info';
    message: string;
    category?: SyncErrorCategory;
    statusCode?: number;
    rateLimit?: RateLimitDetails;
    isProxied?: boolean;
    retryAction?: () => void;
  } | null>(null);

  // File Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<{
    count: number;
    sourceName: string;
    items: TimelineItem[];
    sampleTitles: string[];
    result: RaindropSyncResult | UniversalBookmarkResult;
  } | null>(null);

  // Manual Add State
  const [manualUrl, setManualUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualCollection, setManualCollection] = useState('Reading List');
  const [manualTags, setManualTags] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  // God Mode Custom Import State
  const [customPlatformName, setCustomPlatformName] = useState('Custom Archive');
  const [customFolderName, setCustomFolderName] = useState('Imported Links');
  const [customTags, setCustomTags] = useState('');
  const [godModeText, setGodModeText] = useState('');
  const [godModeDetectedFormat, setGodModeDetectedFormat] = useState<string | null>(null);
  const [customImportMode, setCustomImportMode] = useState<'upload' | 'paste'>('upload');

  const handleScanGodModeText = () => {
    if (!godModeText.trim()) return;
    try {
      setIsParsingFile(true);
      setErrorMessage(null);
      const tagList = customTags.split(',').map(t => t.trim()).filter(Boolean);
      const result = parseGodModeCustomImport(godModeText, {
        defaultPlatform: customPlatformName.trim() || 'Custom Archive',
        defaultFolder: customFolderName.trim() || 'Imported Links',
        fallbackTags: tagList
      });

      if (result.items.length === 0) {
        throw new Error('No valid bookmark URLs were detected in the text. Ensure links start with http:// or https:// or use standard Markdown, JSON, or CSV format.');
      }

      setGodModeDetectedFormat(result.detectedFormat || 'Multi-Format Ingestion');
      setParsedPreview({
        count: result.items.length,
        sourceName: `${customPlatformName.trim() || 'Custom'} (${result.detectedFormat || 'God Mode'})`,
        items: result.items,
        sampleTitles: result.items.slice(0, 5).map(it => it.title),
        result
      });
      setSuccessMessage(`Detected ${result.detectedFormat}: successfully extracted ${result.items.length} bookmarks!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse text.');
    } finally {
      setIsParsingFile(false);
    }
  };

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      const cfg = getRaindropConfig();
      if (cfg.apiToken) {
        setApiToken(cfg.apiToken);
        setAutoSync(cfg.autoSync);
        setSelectedCollectionId(cfg.selectedCollectionId || 0);
        setUserName(cfg.userName || '');
        setUserEmail(cfg.userEmail || '');
        setLastSyncTime(cfg.lastSyncTime || null);
        setLastSyncCount(cfg.lastSyncCount || 0);
        
        // Fetch fresh collection list in background
        fetchRaindropCollections(cfg.apiToken)
          .then(cols => setCollections(cols))
          .catch(() => {});
      }

      const pCfg = getPinterestConfig();
      if (pCfg.apiToken) {
        setPinterestToken(pCfg.apiToken);
        setPinterestAutoSync(pCfg.autoSync);
        setSelectedPinterestBoardId(pCfg.selectedBoardId || 'all');
        setPinterestUsername(pCfg.username || '');
        setPinterestProfileImage(pCfg.profileImage || '');
        setPinterestLastSyncTime(pCfg.lastSyncTime || null);
        setPinterestLastSyncCount(pCfg.lastSyncCount || 0);

        fetchPinterestBoards(pCfg.apiToken)
          .then(bds => setPinterestBoards(bds))
          .catch(() => {});
      }
      if (pCfg.publicBoardUrl) {
        setPinterestPublicUrl(pCfg.publicBoardUrl);
      }
      setErrorMessage(null);
      setSuccessMessage(null);
      setSyncFeedback(null);
      setParsedPreview(null);
      if (initialService) {
        setActiveService(initialService);
      }
    }
  }, [isOpen, initialService]);

  if (!isOpen) return null;

  // Handle Test Connection
  const handleTestConnection = async () => {
    if (!apiToken.trim()) {
      setSyncFeedback({
        type: 'error',
        message: 'Please enter your Raindrop.io API Test Token'
      });
      return;
    }
    setIsTesting(true);
    setSyncFeedback(null);
    setTestStatus('idle');

    try {
      const testRes = await testRaindropConnection(apiToken.trim());
      if (!testRes.ok) {
        setTestStatus('error');
        setSyncFeedback({
          type: 'error',
          message: testRes.error || 'Connection failed. Please verify your token.',
          category: testRes.category,
          statusCode: testRes.statusCode,
          rateLimit: testRes.rateLimit,
          isProxied: testRes.isProxied,
          retryAction: handleTestConnection
        });
        return;
      }
      const user = testRes.user || { id: 0, name: 'Raindrop User', email: '' };
      setUserName(user.name);
      setUserEmail(user.email);
      setTestStatus('success');
      setSyncFeedback({
        type: 'success',
        message: `Connected as ${user.name} (${user.email || 'authenticated'})`,
        isProxied: testRes.isProxied
      });

      // Load collections
      const cols = await fetchRaindropCollections(apiToken.trim());
      setCollections(cols);

      // Save credentials locally
      saveRaindropConfig({
        apiToken: apiToken.trim(),
        autoSync,
        selectedCollectionId,
        userName: user.name,
        userEmail: user.email
      });
    } catch (err: any) {
      setTestStatus('error');
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Connection failed. Please verify your token.',
        category: err.category || 'network',
        statusCode: err.status,
        rateLimit: err.rateLimit,
        isProxied: err.isProxied,
        retryAction: handleTestConnection
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Handle Live API Sync
  const handleSyncNow = async () => {
    if (!apiToken.trim()) {
      setSyncFeedback({
        type: 'error',
        message: 'Please enter and test your API token first.'
      });
      return;
    }
    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const result = await syncRaindropBookmarks({
        token: apiToken.trim(),
        collectionId: selectedCollectionId
      });

      const colName = selectedCollectionId === 0
        ? 'All Bookmarks'
        : collections.find(c => c._id === selectedCollectionId)?.title || `Collection #${selectedCollectionId}`;

      saveRaindropConfig({
        apiToken: apiToken.trim(),
        autoSync,
        selectedCollectionId,
        collectionName: colName,
        userName,
        userEmail,
        lastSyncTime: new Date().toISOString(),
        lastSyncCount: result.count
      });

      setLastSyncTime(new Date().toISOString());
      setLastSyncCount(result.count);

      onApplySyncedData(result, `Raindrop.io (${colName})`);
      setSyncFeedback({
        type: 'success',
        message: `Successfully synced ${result.count} bookmarks from Raindrop.io!`,
        rateLimit: result.rateLimit,
        isProxied: result.isProxied
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Sync failed. Please verify your network and token permissions.',
        category: err.category || (err.status === 401 ? 'auth' : err.status === 429 ? 'rate_limit' : 'unknown'),
        statusCode: err.status,
        rateLimit: err.rateLimit,
        isProxied: err.isProxied,
        retryAction: handleSyncNow
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Disconnect Raindrop API
  const handleDisconnect = () => {
    clearRaindropConfig();
    setApiToken('');
    setUserName('');
    setUserEmail('');
    setCollections([]);
    setSelectedCollectionId(0);
    setLastSyncTime(null);
    setLastSyncCount(0);
    setTestStatus('idle');
    setSyncFeedback({
      type: 'info',
      message: 'Disconnected Raindrop.io integration'
    });
  };

  // Handle Pinterest Test Connection
  const handleTestPinterest = async () => {
    if (!pinterestToken.trim()) {
      setSyncFeedback({
        type: 'error',
        message: 'Please enter your Pinterest API Access Token'
      });
      return;
    }
    setIsTestingPinterest(true);
    setSyncFeedback(null);
    setPinterestTestStatus('idle');

    try {
      const res = await testPinterestConnection(pinterestToken.trim());
      if (!res.ok || !res.user) {
        setPinterestTestStatus('error');
        setSyncFeedback({
          type: 'error',
          message: res.error || 'Failed to authenticate with Pinterest API. Check token.',
          category: res.category,
          statusCode: res.statusCode,
          rateLimit: res.rateLimit,
          isProxied: res.isProxied,
          retryAction: handleTestPinterest
        });
        return;
      }
      const user = res.user;
      setPinterestUsername(user.username || 'Pinterest User');
      setPinterestProfileImage(user.profile_image || '');
      setPinterestTestStatus('success');

      // Fetch boards
      const bds = await fetchPinterestBoards(pinterestToken.trim());
      setPinterestBoards(bds);

      savePinterestConfig({
        apiToken: pinterestToken.trim(),
        username: user.username,
        profileImage: user.profile_image,
        autoSync: pinterestAutoSync,
        selectedBoardId: selectedPinterestBoardId
      });

      setSyncFeedback({
        type: 'success',
        message: `Connected to Pinterest as @${user.username}! Loaded ${bds.length} boards.`,
        rateLimit: res.rateLimit,
        isProxied: res.isProxied
      });
    } catch (err: any) {
      setPinterestTestStatus('error');
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Failed to authenticate with Pinterest API. Check token.',
        category: err.category || 'network',
        statusCode: err.status,
        rateLimit: err.rateLimit,
        isProxied: err.isProxied,
        retryAction: handleTestPinterest
      });
    } finally {
      setIsTestingPinterest(false);
    }
  };

  // Handle Pinterest Live Sync
  const handleSyncPinterest = async () => {
    if (!pinterestToken.trim()) {
      setSyncFeedback({
        type: 'error',
        message: 'Pinterest API Token is required'
      });
      return;
    }
    setIsSyncingPinterest(true);
    setSyncFeedback(null);

    try {
      const targetBoard = pinterestBoards.find(b => b.id === selectedPinterestBoardId);
      const boardLabel = selectedPinterestBoardId === 'all'
        ? 'All Boards'
        : (targetBoard?.name || 'Selected Board');

      const result = await syncPinterestPins({
        token: pinterestToken.trim(),
        boardId: selectedPinterestBoardId === 'all' ? undefined : selectedPinterestBoardId
      });

      if (result.items.length === 0) {
        setSyncFeedback({
          type: 'warning',
          message: 'No pins were found in the selected Pinterest board.'
        });
        return;
      }

      savePinterestConfig({
        apiToken: pinterestToken.trim(),
        username: pinterestUsername,
        profileImage: pinterestProfileImage,
        autoSync: pinterestAutoSync,
        selectedBoardId: selectedPinterestBoardId,
        boardName: boardLabel,
        lastSyncTime: new Date().toISOString(),
        lastSyncCount: result.items.length
      });

      setPinterestLastSyncTime(new Date().toISOString());
      setPinterestLastSyncCount(result.items.length);

      onApplySyncedData(result, `Pinterest (${boardLabel})`);
      setSyncFeedback({
        type: 'success',
        message: `Successfully synced ${result.items.length} pins from Pinterest!`,
        rateLimit: result.rateLimit,
        isProxied: result.isProxied
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Failed to sync Pinterest pins. Please check token permissions.',
        category: err.category || (err.status === 401 ? 'auth' : err.status === 429 ? 'rate_limit' : 'unknown'),
        statusCode: err.status,
        rateLimit: err.rateLimit,
        isProxied: err.isProxied,
        retryAction: handleSyncPinterest
      });
    } finally {
      setIsSyncingPinterest(false);
    }
  };

  // Disconnect Pinterest
  const handleDisconnectPinterest = () => {
    clearPinterestConfig();
    setPinterestToken('');
    setPinterestUsername('');
    setPinterestProfileImage('');
    setPinterestBoards([]);
    setSelectedPinterestBoardId('all');
    setPinterestLastSyncTime(null);
    setPinterestLastSyncCount(0);
    setPinterestTestStatus('idle');
    setSyncFeedback({
      type: 'info',
      message: 'Disconnected Pinterest integration'
    });
  };

  // Handle Fetch Public Board RSS
  const handleFetchPinterestRss = async () => {
    if (!pinterestPublicUrl.trim()) {
      setSyncFeedback({
        type: 'error',
        message: 'Please enter a Pinterest public board URL or username/board'
      });
      return;
    }
    setIsFetchingRss(true);
    setSyncFeedback(null);

    try {
      const result = await fetchPinterestRss(pinterestPublicUrl.trim());
      if (result.items.length === 0) {
        throw new Error('No pins found at that URL. Please verify the board is public.');
      }

      savePinterestConfig({
        publicBoardUrl: pinterestPublicUrl.trim()
      });

      setParsedPreview({
        count: result.items.length,
        sourceName: `Pinterest Board (${result.collections[0] || 'Public Pins'})`,
        items: result.items,
        sampleTitles: result.items.slice(0, 5).map(it => it.title),
        result
      });
      setSyncFeedback({
        type: 'success',
        message: `Found ${result.items.length} public pins with full images!`,
        isProxied: true
      });
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Failed to fetch public board pins.',
        category: 'network',
        retryAction: handleFetchPinterestRss
      });
    } finally {
      setIsFetchingRss(false);
    }
  };

  // Handle Batch URL parse
  const handleParsePinterestLinks = () => {
    if (!pinterestLinksText.trim()) {
      setErrorMessage('Please paste at least one Pinterest pin URL');
      return;
    }
    setErrorMessage(null);
    const result = parsePinterestUrlBatch(pinterestLinksText, pinterestLinksBoard);
    if (result.items.length === 0) {
      setErrorMessage('No valid Pinterest URLs detected.');
      return;
    }

    setParsedPreview({
      count: result.items.length,
      sourceName: `Pinterest URLs (${pinterestLinksBoard})`,
      items: result.items,
      sampleTitles: result.items.slice(0, 5).map(it => it.title),
      result
    });
    setSuccessMessage(`Parsed ${result.items.length} pin URLs!`);
  };

  // Handle Files (Drop / Upload)
  const processUploadedFile = async (file: File) => {
    setIsParsingFile(true);
    setErrorMessage(null);
    setParsedPreview(null);

    try {
      const text = await file.text();
      const lowerName = file.name.toLowerCase();

      let result: RaindropSyncResult | UniversalBookmarkResult;
      let serviceLabel = 'Bookmarks Import';

      if (activeService === 'raindrop') {
        if (lowerName.endsWith('.csv')) {
          result = parseRaindropCsv(text);
          serviceLabel = `Raindrop CSV (${file.name})`;
        } else if (lowerName.endsWith('.json')) {
          result = parseRaindropJson(text);
          serviceLabel = `Raindrop JSON (${file.name})`;
        } else {
          result = parseRaindropHtml(text);
          serviceLabel = `Raindrop HTML (${file.name})`;
        }
      } else if (activeService === 'pinterest') {
        if (lowerName.endsWith('.csv')) {
          result = parsePinterestCsv(text);
          serviceLabel = `Pinterest CSV (${file.name})`;
        } else if (lowerName.endsWith('.json')) {
          result = parsePinterestJson(text);
          serviceLabel = `Pinterest JSON (${file.name})`;
        } else {
          result = parseNetscapeBookmarksHtml(text, 'Pinterest');
          serviceLabel = `Pinterest Export (${file.name})`;
        }
      } else if (activeService === 'pocket') {
        result = parsePocketHtml(text);
        serviceLabel = `Pocket Export (${file.name})`;
      } else if (activeService === 'pinboard') {
        result = parsePinboardJson(text);
        serviceLabel = `Pinboard JSON (${file.name})`;
      } else if (activeService === 'linkding') {
        result = parseLinkdingJson(text);
        serviceLabel = `Linkding Bookmarks (${file.name})`;
      } else if (activeService === 'mymind') {
        result = parseMymindExport(text);
        serviceLabel = `mymind Export (${file.name})`;
      } else if (activeService === 'fabric') {
        result = parseFabricExport(text);
        serviceLabel = `Fabric.so Export (${file.name})`;
      } else if (activeService === 'karakeep') {
        result = parseKarakeepExport(text);
        serviceLabel = `KaraKeep Export (${file.name})`;
      } else if (activeService === 'instapaper') {
        result = parseInstapaperExport(text);
        serviceLabel = `Instapaper Export (${file.name})`;
      } else if (activeService === 'custom') {
        const tagList = customTags.split(',').map(t => t.trim()).filter(Boolean);
        const godResult = parseGodModeCustomImport(text, {
          defaultPlatform: customPlatformName.trim() || 'Custom Archive',
          defaultFolder: customFolderName.trim() || 'Imported Links',
          fallbackTags: tagList
        });
        result = godResult;
        serviceLabel = `${customPlatformName.trim() || 'Custom'} [${godResult.detectedFormat || 'File'}] (${file.name})`;
      } else {
        // Browser Bookmarks (Chrome, Firefox, Safari, Edge Netscape HTML)
        result = parseNetscapeBookmarksHtml(text, 'Browser Bookmarks');
        serviceLabel = `Browser Bookmarks (${file.name})`;
      }

      if (result.items.length === 0) {
        throw new Error('No valid bookmark URLs were detected in this file. Please ensure it is an exported bookmarks file.');
      }

      setParsedPreview({
        count: result.items.length,
        sourceName: serviceLabel,
        items: result.items,
        sampleTitles: result.items.slice(0, 5).map(it => it.title),
        result
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse file. Please verify file format.');
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleApplyPreview = () => {
    if (!parsedPreview) return;
    onApplySyncedData(parsedPreview.result, parsedPreview.sourceName);
    setSuccessMessage(`Imported ${parsedPreview.count} bookmarks into your library!`);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  // Handle Manual Add Bookmark
  const handleSaveManualBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;

    let cleanUrl = manualUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    let domain = 'web';
    try {
      domain = new URL(cleanUrl).hostname.replace(/^www\./, '');
    } catch {}

    const now = new Date();
    const title = manualTitle.trim() || domain;
    const tagList = manualTags.split(',').map(t => t.trim()).filter(Boolean);
    const folder = manualCollection.trim() || 'Unsorted';

    const newItem: TimelineItem = {
      id: `manual_bm_${now.getTime()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'browser',
      ts: now.toISOString(),
      dateObj: now,
      title,
      subtitle: manualNotes.trim() || folder,
      url: cleanUrl,
      domain,
      favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      transition: 'BOOKMARK',
      platform: 'Saved Bookmark',
      category: folder
    };

    const res: UniversalBookmarkResult = {
      items: [newItem],
      notes: manualNotes.trim() ? { [cleanUrl]: manualNotes.trim() } : {},
      tags: tagList.length > 0 ? { [cleanUrl]: tagList } : {},
      snapshots: {},
      count: 1,
      service: 'Manual',
      collections: [folder]
    };

    onApplySyncedData(res, `New Bookmark (${domain})`);
    setManualUrl('');
    setManualTitle('');
    setManualTags('');
    setManualNotes('');
    setSuccessMessage(`Added "${title}" to bookmarks!`);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div
      id="bookmark-sync-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#151518] w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Bookmark className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Sync Bookmarking Apps & Services
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Connect Raindrop.io, import browser bookmarks, Pocket, Pinboard & more
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Service Selector Tabs */}
        <div className="flex items-center gap-1.5 px-5 pt-3.5 pb-2 overflow-x-auto border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-black/20 no-scrollbar">
          {/* Raindrop Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveService('raindrop');
              setErrorMessage(null);
              setParsedPreview(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeService === 'raindrop'
                ? 'bg-[#0089FF] text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
            <span>Raindrop.io</span>
            {userName && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
          </button>

          {/* Pinterest Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveService('pinterest');
              setErrorMessage(null);
              setParsedPreview(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeService === 'pinterest'
                ? 'bg-[#E60023] text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.373-.057.24-.19.291-.439.175-1.644-.766-2.671-3.168-2.671-5.102 0-4.155 3.018-7.971 8.709-7.971 4.572 0 8.125 3.259 8.125 7.614 0 4.544-2.864 8.2-6.839 8.2-1.336 0-2.592-.695-3.021-1.513l-.824 3.143c-.298 1.144-1.104 2.578-1.644 3.454C9.539 23.834 10.749 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
            </svg>
            <span>Pinterest</span>
            {pinterestUsername && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
          </button>

          {/* Browser Bookmarks Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveService('browser');
              setErrorMessage(null);
              setParsedPreview(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeService === 'browser'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Chrome / Safari / Firefox</span>
          </button>

          {/* Pocket Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveService('pocket');
              setErrorMessage(null);
              setParsedPreview(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeService === 'pocket'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5l-4-4 1.41-1.41L11 13.67l6.59-6.59L19 8.5l-8 8z"/>
            </svg>
            <span>Pocket</span>
          </button>

          {/* Pinboard Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveService('pinboard');
              setErrorMessage(null);
              setParsedPreview(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeService === 'pinboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Pinboard</span>
          </button>

          {/* Linkding Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveService('linkding');
              setErrorMessage(null);
              setParsedPreview(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeService === 'linkding'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Linkding</span>
          </button>

          {/* mymind Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveService('mymind');
              setErrorMessage(null);
              setParsedPreview(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeService === 'mymind'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>mymind</span>
          </button>

          {/* Fabric.so Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveService('fabric');
              setErrorMessage(null);
              setParsedPreview(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeService === 'fabric'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Fabric.so</span>
          </button>

          {/* KaraKeep Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveService('karakeep');
              setErrorMessage(null);
              setParsedPreview(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeService === 'karakeep'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>KaraKeep</span>
          </button>

          {/* Instapaper Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveService('instapaper');
              setErrorMessage(null);
              setParsedPreview(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeService === 'instapaper'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Instapaper</span>
          </button>

          {/* Custom God Mode Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveService('custom');
              setErrorMessage(null);
              setParsedPreview(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeService === 'custom'
                ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/30'
                : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Custom / God Mode</span>
            <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-500 rounded text-[9px] font-black">
              ALL
            </span>
          </button>

          {/* Manual Add Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveService('manual');
              setErrorMessage(null);
              setParsedPreview(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeService === 'manual'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Single</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Granular Sync Status Banner */}
          {syncFeedback && (
            <SyncStatusBanner
              type={syncFeedback.type}
              category={syncFeedback.category}
              statusCode={syncFeedback.statusCode}
              message={syncFeedback.message}
              rateLimit={syncFeedback.rateLimit}
              isProxied={syncFeedback.isProxied}
              onRetry={syncFeedback.retryAction}
              isRetrying={isTesting || isSyncing || isTestingPinterest || isSyncingPinterest || isFetchingRss}
              onDismiss={() => setSyncFeedback(null)}
              className="mb-2"
            />
          )}

          {/* Legacy Notifications fallback */}
          {!syncFeedback && errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!syncFeedback && successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* SERVICE: RAINDROP.IO */}
          {activeService === 'raindrop' && (
            <div className="space-y-4">
              {/* Raindrop Subtabs (API Sync vs File Backup) */}
              <div className="flex items-center justify-between gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setRaindropSubTab('api')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    raindropSubTab === 'api'
                      ? 'bg-white dark:bg-neutral-800 text-[#0089FF] shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Continuous API Sync</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRaindropSubTab('file')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    raindropSubTab === 'file'
                      ? 'bg-white dark:bg-neutral-800 text-[#0089FF] shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Backup (CSV / HTML / JSON)</span>
                </button>
              </div>

              {raindropSubTab === 'api' ? (
                <div className="space-y-4">
                  {/* Token Input Card */}
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#0089FF]" />
                        Raindrop API Test Token
                      </label>
                      <a
                        href="https://app.raindrop.io/settings/integrations"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#0089FF] hover:underline flex items-center gap-1 font-medium"
                      >
                        Create token in Raindrop <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={apiToken}
                        onChange={e => setApiToken(e.target.value)}
                        placeholder="Paste your Raindrop Test Token here..."
                        className="w-full px-3.5 py-2.5 pr-20 bg-white dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#0089FF] focus:ring-2 focus:ring-[#0089FF]/20 font-mono transition-all"
                      />
                      <div className="absolute right-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg cursor-pointer"
                        >
                          {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleTestConnection}
                          disabled={isTesting || !apiToken.trim()}
                          className="px-3 py-1.5 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/15 disabled:opacity-50 text-gray-800 dark:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>{userName ? 'Re-verify' : 'Verify Token'}</span>
                        </button>

                        {userName && (
                          <button
                            type="button"
                            onClick={handleDisconnect}
                            className="px-2.5 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Disconnect</span>
                          </button>
                        )}
                      </div>

                      {userName && (
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Connected as {userName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sync Settings (If Token verified) */}
                  {userName && (
                    <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 space-y-3">
                      <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5 text-[#0089FF]" />
                        Select Collection to Sync
                      </h4>

                      <select
                        value={selectedCollectionId}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10);
                          setSelectedCollectionId(val);
                          saveRaindropConfig({ selectedCollectionId: val });
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-800 dark:text-gray-200 outline-none cursor-pointer"
                      >
                        <option value={0}>📚 All Bookmarks (Entire Library)</option>
                        <option value={-1}>📥 Unsorted</option>
                        <option value={-99}>🗑 Trash</option>
                        {collections.map(c => (
                          <option key={c.id} value={c.id}>
                            📁 {c.title} ({c.count} bookmarks)
                          </option>
                        ))}
                      </select>

                      {/* Auto Sync Toggle */}
                      <label className="flex items-center gap-2.5 pt-1 text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoSync}
                          onChange={e => {
                            setAutoSync(e.target.checked);
                            saveRaindropConfig({ autoSync: e.target.checked });
                          }}
                          className="w-4 h-4 rounded text-[#0089FF] focus:ring-[#0089FF] cursor-pointer"
                        />
                        <span>Auto-sync latest bookmarks whenever the app opens</span>
                      </label>

                      {/* Live Sync Action Button */}
                      <div className="pt-2 flex items-center justify-between border-t border-blue-200/60 dark:border-blue-900/40">
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {lastSyncTime ? (
                            <span>Last synced {new Date(lastSyncTime).toLocaleDateString()} ({lastSyncCount} bookmarks)</span>
                          ) : (
                            <span>Ready to fetch your bookmarks</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleSyncNow}
                          disabled={isSyncing}
                          className="px-4 py-2 bg-[#0089FF] hover:bg-[#0070e0] active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          <span>{isSyncing ? 'Syncing...' : 'Sync Raindrop Bookmarks'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick token guide */}
                  {!userName && (
                    <div className="bg-gray-50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-200 dark:border-white/5 text-[11px] text-gray-500 space-y-1">
                      <div className="font-bold text-gray-700 dark:text-gray-300">How to get your free token in 30 seconds:</div>
                      <ol className="list-decimal pl-4 space-y-0.5">
                        <li>Log in to <a href="https://app.raindrop.io" target="_blank" rel="noreferrer" className="text-[#0089FF] underline">Raindrop.io</a></li>
                        <li>Go to Settings &gt; Integrations &gt; For Developers</li>
                        <li>Click "Create new app", name it anything (e.g. "Emreh")</li>
                        <li>Click "Create test token" and paste it above</li>
                      </ol>
                    </div>
                  )}
                </div>
              ) : (
                /* Raindrop Backup File Ingest */
                <DropzoneArea
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                  isParsingFile={isParsingFile}
                  onFileDrop={processUploadedFile}
                  title="Drop your Raindrop backup file here"
                  subtitle="Supports CSV, HTML, or JSON from Raindrop Settings > Backups"
                  formats=".csv, .html, .json"
                />
              )}
            </div>
          )}

          {/* SERVICE: PINTEREST */}
          {activeService === 'pinterest' && (
            <div className="space-y-4">
              {/* Pinterest Subtabs */}
              <div className="flex items-center justify-between gap-1.5 p-1 bg-gray-100 dark:bg-white/5 rounded-xl text-xs font-semibold overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setPinterestSubTab('api')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    pinterestSubTab === 'api'
                      ? 'bg-white dark:bg-neutral-800 text-[#E60023] shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>API Connect</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPinterestSubTab('file')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    pinterestSubTab === 'file'
                      ? 'bg-white dark:bg-neutral-800 text-[#E60023] shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Data Archive</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPinterestSubTab('rss')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    pinterestSubTab === 'rss'
                      ? 'bg-white dark:bg-neutral-800 text-[#E60023] shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public Board / RSS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPinterestSubTab('links')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    pinterestSubTab === 'links'
                      ? 'bg-white dark:bg-neutral-800 text-[#E60023] shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Paste Links</span>
                </button>
              </div>

              {/* 1. API CONNECT SUBTAB */}
              {pinterestSubTab === 'api' && (
                <div className="space-y-4">
                  {/* Token Input Card */}
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#E60023]" />
                        Pinterest API v5 Access Token
                      </label>
                      <a
                        href="https://developers.pinterest.com/apps/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#E60023] hover:underline flex items-center gap-1 font-medium"
                      >
                        Pinterest Developer Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type={showPinterestToken ? 'text' : 'password'}
                        value={pinterestToken}
                        onChange={e => setPinterestToken(e.target.value)}
                        placeholder="Paste your Pinterest API token here..."
                        className="w-full px-3.5 py-2.5 pr-20 bg-white dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#E60023] focus:ring-2 focus:ring-[#E60023]/20 font-mono transition-all"
                      />
                      <div className="absolute right-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowPinterestToken(!showPinterestToken)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                        >
                          {showPinterestToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={handleTestPinterest}
                          disabled={isTestingPinterest || !pinterestToken.trim()}
                          className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-[#E60023] border border-rose-200 dark:border-rose-900/50 rounded-lg text-xs font-bold disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
                        >
                          {isTestingPinterest ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          <span>{isTestingPinterest ? 'Testing...' : 'Test'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Connected Account & Boards Pane */}
                  {pinterestUsername && (
                    <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {pinterestProfileImage ? (
                            <img
                              src={pinterestProfileImage}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-rose-300 dark:border-rose-800"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#E60023] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                              P
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                              <span>@{pinterestUsername}</span>
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                                Connected
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              {pinterestBoards.length > 0 ? `${pinterestBoards.length} boards available` : 'Ready to sync pins'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleDisconnectPinterest}
                          className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Disconnect</span>
                        </button>
                      </div>

                      {/* Board Selection */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                          <span>Target Board</span>
                          <span className="text-[10px] text-gray-400 font-normal">Choose all or a specific board</span>
                        </label>
                        <select
                          value={selectedPinterestBoardId}
                          onChange={e => {
                            setSelectedPinterestBoardId(e.target.value);
                            savePinterestConfig({ selectedBoardId: e.target.value });
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-800 dark:text-gray-200 outline-none cursor-pointer"
                        >
                          <option value="all">📌 All Boards (Entire Pinterest Profile)</option>
                          {pinterestBoards.map(b => (
                            <option key={b.id} value={b.id}>
                              📁 {b.name} ({b.pin_count} pins)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Auto Sync Toggle */}
                      <label className="flex items-center gap-2.5 pt-1 text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pinterestAutoSync}
                          onChange={e => {
                            setPinterestAutoSync(e.target.checked);
                            savePinterestConfig({ autoSync: e.target.checked });
                          }}
                          className="w-4 h-4 rounded text-[#E60023] focus:ring-[#E60023] cursor-pointer"
                        />
                        <span>Auto-sync Pinterest pins whenever application opens</span>
                      </label>

                      {/* Live Sync Action Button */}
                      <div className="pt-2 flex items-center justify-between border-t border-rose-200/60 dark:border-rose-900/40">
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {pinterestLastSyncTime ? (
                            <span>Last synced {new Date(pinterestLastSyncTime).toLocaleDateString()} ({pinterestLastSyncCount} pins)</span>
                          ) : (
                            <span>Ready to fetch your pins</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleSyncPinterest}
                          disabled={isSyncingPinterest}
                          className="px-4 py-2 bg-[#E60023] hover:bg-[#cc001f] active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          {isSyncingPinterest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          <span>{isSyncingPinterest ? 'Syncing...' : 'Sync Pinterest Pins'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Token Setup Guide */}
                  {!pinterestUsername && (
                    <div className="bg-gray-50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-200 dark:border-white/5 text-[11px] text-gray-500 space-y-1.5">
                      <div className="font-bold text-gray-700 dark:text-gray-300">How to get a Pinterest Token:</div>
                      <ol className="list-decimal pl-4 space-y-1">
                        <li>Visit <a href="https://developers.pinterest.com/apps/" target="_blank" rel="noreferrer" className="text-[#E60023] underline">developers.pinterest.com/apps</a></li>
                        <li>Click "Create app" (e.g. name it "Bookmarks Archive") or open an existing app</li>
                        <li>Go to <strong>Access Tokens</strong> or trial token generator</li>
                        <li>Select <strong>boards:read</strong> and <strong>pins:read</strong> permissions and generate</li>
                        <li>Paste your token into the field above and click <strong>Test</strong></li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* 2. DATA ARCHIVE (FILE UPLOAD) SUBTAB */}
              {pinterestSubTab === 'file' && (
                <div className="space-y-3">
                  <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200/60 dark:border-rose-900/30 text-xs text-rose-900 dark:text-rose-200">
                    <p className="font-bold mb-0.5">How to export from Pinterest:</p>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400">
                      In Pinterest, open <strong>Settings &gt; Account management &gt; Download your data</strong>. Upload your resulting <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">pins.json</code>, <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">pins.csv</code>, or zip archive below.
                    </p>
                  </div>

                  <DropzoneArea
                    isDragging={isDragging}
                    setIsDragging={setIsDragging}
                    isParsingFile={isParsingFile}
                    onFileDrop={processUploadedFile}
                    title="Drop Pinterest pins.json or pins.csv here"
                    subtitle="Automatically extracts pin links, artwork thumbnails, board names, and notes"
                    formats=".json, .csv, .zip, .html"
                  />
                </div>
              )}

              {/* 3. PUBLIC BOARD / RSS FEED SUBTAB */}
              {pinterestSubTab === 'rss' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/10 space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Public Board URL or Username
                      </label>
                      <p className="text-[11px] text-gray-400">
                        No login required. Works for any public board or user feed.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pinterestPublicUrl}
                        onChange={e => setPinterestPublicUrl(e.target.value)}
                        placeholder="https://www.pinterest.com/username/board-name/ or username/board"
                        className="flex-1 px-3.5 py-2.5 bg-white dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#E60023] focus:ring-2 focus:ring-[#E60023]/20 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleFetchPinterestRss}
                        disabled={isFetchingRss || !pinterestPublicUrl.trim()}
                        className="px-4 py-2.5 bg-[#E60023] hover:bg-[#cc001f] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer shrink-0"
                      >
                        {isFetchingRss ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                        <span>{isFetchingRss ? 'Fetching...' : 'Fetch Pins'}</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#E60023] shrink-0" />
                      <span>Extracts full-resolution pin artwork, titles, descriptions, and source link destinations.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. PASTE PIN LINKS SUBTAB */}
              {pinterestSubTab === 'links' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Paste Pinterest URLs
                      </label>
                      <input
                        type="text"
                        value={pinterestLinksBoard}
                        onChange={e => setPinterestLinksBoard(e.target.value)}
                        placeholder="Board Name (e.g. Design Ideas)"
                        className="px-2.5 py-1 bg-white dark:bg-black/30 rounded-lg border border-gray-200 dark:border-white/10 text-[11px] text-gray-800 dark:text-gray-200 outline-none w-44"
                      />
                    </div>

                    <textarea
                      value={pinterestLinksText}
                      onChange={e => setPinterestLinksText(e.target.value)}
                      rows={5}
                      placeholder={`https://www.pinterest.com/pin/123456789/\nhttps://pin.it/7xK9mP2\nhttps://www.pinterest.com/pin/987654321/`}
                      className="w-full px-3 py-2 bg-white dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#E60023] font-mono leading-relaxed"
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleParsePinterestLinks}
                        disabled={!pinterestLinksText.trim()}
                        className="px-4 py-2 bg-[#E60023] hover:bg-[#cc001f] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Parse Pin Links</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SERVICE: CHROME / FIREFOX / SAFARI / EDGE / ARC */}
          {activeService === 'browser' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Import HTML Bookmarks from Any Browser
                </div>
                <p className="text-[11px] opacity-90">
                  Export your bookmarks as HTML from Chrome, Safari, Firefox, Edge, Brave, or Arc. All folders, tags, and timestamps will be preserved.
                </p>
              </div>

              <DropzoneArea
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                isParsingFile={isParsingFile}
                onFileDrop={processUploadedFile}
                title="Drop your bookmarks.html file here"
                subtitle="In Chrome: Bookmarks Manager > 3 dots > Export Bookmarks"
                formats=".html, .htm"
              />

              <div className="bg-gray-50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-200 dark:border-white/5 text-[11px] text-gray-500 space-y-1">
                <div className="font-bold text-gray-700 dark:text-gray-300">How to export from browser:</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li><strong>Chrome / Brave / Edge:</strong> Press <kbd className="px-1 bg-gray-200 dark:bg-neutral-800 rounded font-mono">Ctrl+Shift+O</kbd> (or Cmd+Option+B) &gt; click "⋮" in top-right &gt; "Export bookmarks".</li>
                  <li><strong>Safari:</strong> File &gt; Export &gt; Bookmarks...</li>
                  <li><strong>Firefox:</strong> Bookmarks &gt; Manage Bookmarks &gt; Import and Backup &gt; Export Bookmarks to HTML...</li>
                </ul>
              </div>
            </div>
          )}

          {/* SERVICE: POCKET */}
          {activeService === 'pocket' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  Sync & Ingest Pocket (GetPocket) Export
                </div>
                <p className="text-[11px] opacity-90">
                  Export your saved articles, reading list, and tags from Pocket.
                </p>
              </div>

              <DropzoneArea
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                isParsingFile={isParsingFile}
                onFileDrop={processUploadedFile}
                title="Drop ril_export.html or Pocket export here"
                subtitle="Download from getpocket.com/export"
                formats=".html, .htm, .csv"
              />

              <div className="bg-gray-50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-200 dark:border-white/5 text-[11px] text-gray-500 space-y-1">
                <div className="font-bold text-gray-700 dark:text-gray-300">How to export from Pocket:</div>
                <p>
                  Visit <a href="https://getpocket.com/export" target="_blank" rel="noreferrer" className="text-rose-600 dark:text-rose-400 underline">getpocket.com/export</a> and click "Export an HTML file". Then drop the file above.
                </p>
              </div>
            </div>
          )}

          {/* SERVICE: PINBOARD */}
          {activeService === 'pinboard' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Pinboard Bookmarks Backup
                </div>
                <p className="text-[11px] opacity-90">
                  Import your Pinboard pins, tags, and extended notes directly from a JSON backup.
                </p>
              </div>

              <DropzoneArea
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                isParsingFile={isParsingFile}
                onFileDrop={processUploadedFile}
                title="Drop your pinboard_backup.json here"
                subtitle="Download from pinboard.in/settings/backup"
                formats=".json, .xml, .html"
              />

              <div className="bg-gray-50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-200 dark:border-white/5 text-[11px] text-gray-500 space-y-1">
                <div className="font-bold text-gray-700 dark:text-gray-300">How to export from Pinboard:</div>
                <p>
                  Visit <a href="https://pinboard.in/settings/backup" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline">pinboard.in/settings/backup</a> and select JSON format.
                </p>
              </div>
            </div>
          )}

          {/* SERVICE: LINKDING */}
          {activeService === 'linkding' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Linkding Self-Hosted Bookmarks
                </div>
                <p className="text-[11px] opacity-90">
                  Import bookmarks from your Linkding instance via JSON export.
                </p>
              </div>

              <DropzoneArea
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                isParsingFile={isParsingFile}
                onFileDrop={processUploadedFile}
                title="Drop Linkding export JSON here"
                subtitle="Exported from Linkding Settings > Export"
                formats=".json"
              />
            </div>
          )}

          {/* SERVICE: MYMIND */}
          {activeService === 'mymind' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gray-900/10 dark:bg-white/10 border border-gray-900/20 dark:border-white/20 text-xs text-gray-900 dark:text-white space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  mymind Remember Engine Import
                </div>
                <p className="text-[11px] opacity-80">
                  Import your cards, articles, color palettes, visual notes, and web clippings from mymind.
                </p>
              </div>

              <DropzoneArea
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                isParsingFile={isParsingFile}
                onFileDrop={processUploadedFile}
                title="Drop your mymind export file here"
                subtitle="Supports mymind JSON, CSV, or HTML archive"
                formats=".json, .csv, .html, .htm"
              />

              <div className="bg-gray-50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-200 dark:border-white/5 text-[11px] text-gray-500 space-y-1">
                <div className="font-bold text-gray-700 dark:text-gray-300">How to export from mymind:</div>
                <p>
                  In the mymind web or mobile app, go to Settings &rarr; Account &rarr; Data Export &rarr; Request Export. Drop the downloaded JSON or CSV file here.
                </p>
              </div>
            </div>
          )}

          {/* SERVICE: FABRIC.SO */}
          {activeService === 'fabric' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Fabric.so Workspace Ingestion
                </div>
                <p className="text-[11px] opacity-90">
                  Import your Fabric.so digital workspace bookmarks, highlights, and AI summaries.
                </p>
              </div>

              <DropzoneArea
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                isParsingFile={isParsingFile}
                onFileDrop={processUploadedFile}
                title="Drop Fabric.so export file here"
                subtitle="Accepts JSON, CSV, or Netscape HTML format"
                formats=".json, .csv, .html, .htm"
              />

              <div className="bg-gray-50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-200 dark:border-white/5 text-[11px] text-gray-500 space-y-1">
                <div className="font-bold text-gray-700 dark:text-gray-300">Fabric.so export support:</div>
                <p>
                  Export your Fabric bookmarks from Workspace Settings or browser extension. All titles, URLs, tags, and summary excerpts will be cleanly categorized.
                </p>
              </div>
            </div>
          )}

          {/* SERVICE: KARAKEEP */}
          {activeService === 'karakeep' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-900 dark:text-sky-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  KaraKeep Bookmarks & Lists
                </div>
                <p className="text-[11px] opacity-90">
                  Ingest your organized lists, tags, and highlighted web clippings from KaraKeep.
                </p>
              </div>

              <DropzoneArea
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                isParsingFile={isParsingFile}
                onFileDrop={processUploadedFile}
                title="Drop KaraKeep export file here"
                subtitle="Supports KaraKeep JSON, CSV, and HTML formats"
                formats=".json, .csv, .html, .htm"
              />
            </div>
          )}

          {/* SERVICE: INSTAPAPER */}
          {activeService === 'instapaper' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-xs text-slate-900 dark:text-slate-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  Instapaper Reading List & Archive
                </div>
                <p className="text-[11px] opacity-90">
                  Import saved articles, reading history, Starred items, and custom folders.
                </p>
              </div>

              <DropzoneArea
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                isParsingFile={isParsingFile}
                onFileDrop={processUploadedFile}
                title="Drop instapaper-export.csv or HTML here"
                subtitle="Download from instapaper.com/user"
                formats=".csv, .html, .htm, .json"
              />

              <div className="bg-gray-50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-200 dark:border-white/5 text-[11px] text-gray-500 space-y-1">
                <div className="font-bold text-gray-700 dark:text-gray-300">How to export from Instapaper:</div>
                <p>
                  Visit <a href="https://www.instapaper.com/user" target="_blank" rel="noreferrer" className="text-slate-600 dark:text-slate-400 underline">instapaper.com/user</a> &rarr; scroll to "Export" &rarr; click "Download .CSV file". Drop the file above.
                </p>
              </div>
            </div>
          )}

          {/* SERVICE: GOD MODE CUSTOM MULTI-FORMAT */}
          {activeService === 'custom' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-pink-500/10 border border-purple-500/25 text-xs text-purple-950 dark:text-purple-200 space-y-1.5">
                <div className="font-bold flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Wand2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>God Mode Universal Ingestion Engine</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-600 text-white tracking-wider">
                    Any Format
                  </span>
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  Imports from ANY service or structure: Netscape HTML, OPML/XML, deep-walked JSON trees, CSV/TSV spreadsheets, Markdown links <code className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded">[Title](url)</code>, or raw link lists.
                </p>
              </div>

              {/* Ingestion Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Platform / Source Label
                  </label>
                  <input
                    type="text"
                    value={customPlatformName}
                    onChange={e => setCustomPlatformName(e.target.value)}
                    placeholder="e.g. My Archive, Notion, Craft"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black/40 rounded-lg border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Target Collection / Folder
                  </label>
                  <input
                    type="text"
                    value={customFolderName}
                    onChange={e => setCustomFolderName(e.target.value)}
                    placeholder="e.g. Imported Links, Research"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black/40 rounded-lg border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Extra Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={customTags}
                    onChange={e => setCustomTags(e.target.value)}
                    placeholder="e.g. imported, archive, 2025"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black/40 rounded-lg border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Mode Toggle: File Upload vs Text / Markdown Paste */}
              <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/5 pb-2">
                <button
                  type="button"
                  onClick={() => setCustomImportMode('upload')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    customImportMode === 'upload'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  📁 Drop Any File
                </button>
                <button
                  type="button"
                  onClick={() => setCustomImportMode('paste')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    customImportMode === 'paste'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  📝 Direct Paste / God Mode Textarea
                </button>
              </div>

              {customImportMode === 'upload' ? (
                <DropzoneArea
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                  isParsingFile={isParsingFile}
                  onFileDrop={processUploadedFile}
                  title="Drop ANY bookmarks file here (.json, .html, .csv, .opml, .xml, .md, .txt)"
                  subtitle="Universal parser detects format automatically"
                  formats="*"
                />
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <textarea
                      rows={7}
                      value={godModeText}
                      onChange={e => {
                        setGodModeText(e.target.value);
                        setGodModeDetectedFormat(null);
                      }}
                      placeholder="Paste anything here:&#10;• Markdown: [AI Studio Docs](https://ai.google.dev)&#10;• Raw URLs: https://github.com/google/ai&#10;• Pipe format: https://news.ycombinator.com | Hacker News | tech, news&#10;• JSON objects, arrays, OPML XML, or Netscape HTML"
                      className="w-full p-3 font-mono text-xs bg-white dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white outline-none focus:border-purple-500 leading-relaxed resize-y"
                    />
                    {godModeDetectedFormat && (
                      <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                        {godModeDetectedFormat}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleScanGodModeText}
                    disabled={!godModeText.trim() || isParsingFile}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                  >
                    {isParsingFile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    <span>Parse with God Mode Multi-Format Engine</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SERVICE: MANUAL ADD */}
          {activeService === 'manual' && (
            <form onSubmit={handleSaveManualBookmark} className="space-y-3">
              <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200">
                Quickly add any bookmark with a custom folder, tags, and notes.
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">URL *</label>
                <input
                  type="text"
                  required
                  value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Title (Optional)</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={e => setManualTitle(e.target.value)}
                    placeholder="Page or article title"
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Collection / Folder</label>
                  <input
                    type="text"
                    value={manualCollection}
                    onChange={e => setManualCollection(e.target.value)}
                    placeholder="e.g. Reading List, Tech, Tools"
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={manualTags}
                  onChange={e => setManualTags(e.target.value)}
                  placeholder="e.g. ai, design, reference"
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Notes / Excerpt</label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  placeholder="Why this was saved, quotes, or personal summary..."
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!manualUrl.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Bookmark</span>
                </button>
              </div>
            </form>
          )}

          {/* Parsed File Preview Card */}
          {parsedPreview && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Found {parsedPreview.count} bookmarks in {parsedPreview.sourceName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleApplyPreview}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Import All ({parsedPreview.count})</span>
                </button>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Sample items:</div>
                <div className="space-y-1">
                  {parsedPreview.sampleTitles.map((title, idx) => (
                    <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 truncate bg-white/60 dark:bg-black/30 px-2.5 py-1 rounded-lg">
                      • {title}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            Bookmarks are saved locally in your browser's IndexedDB.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/15 text-gray-800 dark:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Reusable Dropzone Component
interface DropzoneAreaProps {
  isDragging: boolean;
  setIsDragging: (d: boolean) => void;
  isParsingFile: boolean;
  onFileDrop: (file: File) => void;
  title: string;
  subtitle: string;
  formats: string;
}

const DropzoneArea: React.FC<DropzoneAreaProps> = ({
  isDragging,
  setIsDragging,
  isParsingFile,
  onFileDrop,
  title,
  subtitle,
  formats
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={e => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={e => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          onFileDrop(e.dataTransfer.files[0]);
        }
      }}
      onClick={() => fileInputRef.current?.click()}
      className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
        isDragging
          ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 scale-[1.01]'
          : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50/50 dark:bg-white/[0.01]'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={formats}
        className="hidden"
        onChange={e => {
          if (e.target.files && e.target.files[0]) {
            onFileDrop(e.target.files[0]);
          }
        }}
      />

      {isParsingFile ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Parsing bookmarks file...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{title}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
          </div>
          <span className="px-2.5 py-1 bg-gray-100 dark:bg-white/5 rounded-lg text-[10px] font-mono text-gray-500">
            {formats}
          </span>
        </div>
      )}
    </div>
  );
};
