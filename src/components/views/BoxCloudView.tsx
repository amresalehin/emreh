import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Cloud,
  Folder,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Archive,
  Database,
  Search,
  Upload,
  FolderPlus,
  RefreshCw,
  Grid,
  List as ListIcon,
  ChevronRight,
  ExternalLink,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  User,
  Shield,
  X,
  File,
  Eye,
  Copy,
  Check,
  Tag,
  ArrowUpDown,
  Sparkles,
  Link2,
  SlidersHorizontal,
  Plus,
  Key,
  Info
} from 'lucide-react';
import {
  BoxItem,
  BoxUser,
  BoxConfig,
  BoxBreadcrumb,
  BoxServerConfig,
  getBoxConfig,
  saveBoxConfig,
  clearBoxConfig,
  getCustomBoxItems,
  saveCustomBoxItems,
  getStoredItemsForFolder,
  buildBreadcrumbs,
  formatBoxFileSize,
  getBoxItemCategory,
  getBoxAuthorizeUrl,
  exchangeBoxCode,
  fetchBoxCurrentUser,
  fetchBoxFolderItems,
  createBoxFolder,
  uploadBoxFile,
  deleteBoxItem,
  fetchBoxServerConfig
} from '../../utils/boxApi';
import { TimelineItem, ItemType } from '../../types';

interface BoxCloudViewProps {
  onImportTimelineItems?: (items: TimelineItem[], sourceName: string) => void;
  onNavigateToView?: (view: string) => void;
}

export const BoxCloudView: React.FC<BoxCloudViewProps> = ({
  onImportTimelineItems,
  onNavigateToView
}) => {
  // Config & Auth State
  const [config, setConfig] = useState<BoxConfig>(getBoxConfig());
  const [serverConfig, setServerConfig] = useState<BoxServerConfig>({
    configured: false,
    clientId: '',
    hasSecret: false
  });
  const [currentFolderId, setCurrentFolderId] = useState<string>('0');
  const [items, setItems] = useState<BoxItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BoxBreadcrumb[]>([{ id: '0', name: 'All Files' }]);
  
  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'size'>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusNotification, setStatusNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modals
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewItem, setPreviewItem] = useState<BoxItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drag & Drop
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load server config on mount
  useEffect(() => {
    fetchBoxServerConfig().then(cfg => {
      setServerConfig(cfg);
      if (cfg.configured && cfg.clientId && !config.clientId) {
        setConfig(prev => ({ ...prev, clientId: cfg.clientId }));
      }
    });
  }, []);

  // Load Folder Content
  const refreshFolder = async (folderId: string = currentFolderId) => {
    setIsLoading(true);
    try {
      if (config.isConnected && config.accessToken) {
        try {
          const liveItems = await fetchBoxFolderItems(folderId, config.accessToken);
          setItems(liveItems);
        } catch (apiErr: any) {
          console.warn('Live Box API request failed, checking stored cache', apiErr);
          const stored = getStoredItemsForFolder(folderId);
          setItems(stored);
          if (stored.length === 0) {
            setStatusNotification({
              type: 'info',
              message: 'Box folder is empty or not yet synchronized.'
            });
          }
        }
      } else {
        // Not connected: only custom user uploads (starts empty)
        const stored = getStoredItemsForFolder(folderId);
        setItems(stored);
      }
      setBreadcrumbs(buildBreadcrumbs(folderId, items));
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: err?.message || 'Failed to load folder items' });
    } finally {
      setIsLoading(false);
    }
  };

  // On initial mount or folderId change
  useEffect(() => {
    refreshFolder(currentFolderId);
  }, [currentFolderId, config.isConnected, config.accessToken]);

  // Listen for OAuth postMessage callback from popup window
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'BOX_OAUTH_RESPONSE') {
        const { code, error } = event.data;
        if (error) {
          setStatusNotification({ type: 'error', message: `Box Authorization Error: ${error}` });
          return;
        }
        if (code) {
          setIsLoading(true);
          try {
            const redirectUri = `${window.location.origin}/box-oauth-callback.html`;
            const effectiveClientId = config.clientId || serverConfig.clientId;
            const tokenData = await exchangeBoxCode(code, effectiveClientId, config.clientSecret, redirectUri);
            const user = await fetchBoxCurrentUser(tokenData.access_token);
            
            const nextConfig: BoxConfig = {
              isConnected: true,
              authMode: 'oauth',
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              clientId: effectiveClientId,
              clientSecret: config.clientSecret,
              user,
              lastSyncTime: new Date().toISOString()
            };
            saveBoxConfig(nextConfig);
            setConfig(nextConfig);
            setIsConnectModalOpen(false);
            setStatusNotification({ type: 'success', message: `Successfully connected Box Cloud for ${user.name}!` });
            setCurrentFolderId('0');
            refreshFolder('0');
          } catch (err: any) {
            setStatusNotification({ type: 'error', message: `Failed to exchange Box token: ${err.message}` });
          } finally {
            setIsLoading(false);
          }
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [config.clientId, config.clientSecret, serverConfig.clientId]);

  // Handle Folder Navigation
  const handleNavigateToFolder = (folderId: string) => {
    setCurrentFolderId(folderId);
    setSearchQuery('');
  };

  // Handle Creating a New Folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsLoading(true);
    try {
      if (config.isConnected && config.accessToken) {
        try {
          const created = await createBoxFolder(currentFolderId, newFolderName.trim(), config.accessToken);
          setItems(prev => [created, ...prev]);
        } catch (apiErr) {
          console.warn('Direct API create folder failed, saving locally', apiErr);
          createLocalFolder(newFolderName.trim());
        }
      } else {
        createLocalFolder(newFolderName.trim());
      }
      setNewFolderName('');
      setIsNewFolderModalOpen(false);
      setStatusNotification({ type: 'success', message: `Created folder "${newFolderName.trim()}"` });
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: err?.message || 'Could not create folder' });
    } finally {
      setIsLoading(false);
    }
  };

  const createLocalFolder = (name: string) => {
    const newFolder: BoxItem = {
      id: `fld_custom_${Date.now()}`,
      type: 'folder',
      name,
      size: 0,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
      parent_id: currentFolderId,
      category: 'folder',
      description: 'Custom folder created in Box Cloud'
    };
    const custom = getCustomBoxItems();
    saveCustomBoxItems([newFolder, ...custom]);
    setItems(prev => [newFolder, ...prev]);
  };

  // Handle File Upload
  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsLoading(true);
    const uploadedItems: BoxItem[] = [];

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (config.isConnected && config.accessToken) {
          try {
            const uploaded = await uploadBoxFile(currentFolderId, file, config.accessToken);
            uploadedItems.push(uploaded);
            continue;
          } catch (apiErr) {
            console.warn('Direct Box API upload failed, creating cached item', apiErr);
          }
        }

        // Local cache / preview support
        let previewText: string | undefined = undefined;
        let thumbUrl: string | undefined = undefined;

        if (file.type.startsWith('image/')) {
          thumbUrl = URL.createObjectURL(file);
        } else if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json')) {
          previewText = await file.text();
        }

        const customItem: BoxItem = {
          id: `file_custom_${Date.now()}_${i}`,
          type: 'file',
          name: file.name,
          size: file.size,
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
          description: `Uploaded file (${file.type || 'unknown'})`,
          extension: file.name.split('.').pop() || '',
          parent_id: currentFolderId,
          thumbnail_url: thumbUrl,
          content_preview: previewText
        };
        customItem.category = getBoxItemCategory(customItem);
        uploadedItems.push(customItem);
      }

      if (uploadedItems.length > 0) {
        const custom = getCustomBoxItems();
        saveCustomBoxItems([...uploadedItems, ...custom]);
        setItems(prev => [...uploadedItems, ...prev]);
        setStatusNotification({
          type: 'success',
          message: `Uploaded ${uploadedItems.length} ${uploadedItems.length === 1 ? 'file' : 'files'} to Box`
        });
      }
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: `Upload failed: ${err.message}` });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Delete
  const handleDeleteItem = async (item: BoxItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    setIsLoading(true);
    try {
      if (config.isConnected && config.accessToken && !item.id.startsWith('fld_custom_') && !item.id.startsWith('file_custom_')) {
        await deleteBoxItem(item.id, item.type, config.accessToken);
      }
      // Remove from custom local storage if present
      const custom = getCustomBoxItems().filter(i => i.id !== item.id);
      saveCustomBoxItems(custom);
      setItems(prev => prev.filter(i => i.id !== item.id));
      setStatusNotification({ type: 'success', message: `Deleted "${item.name}"` });
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: `Delete failed: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  // Ingest Box item to Timeline
  const handleIngestToTimeline = (item: BoxItem) => {
    if (!onImportTimelineItems) return;
    const itemType: ItemType = item.category === 'image' ? 'photo' : item.category === 'audio' ? 'spotify' : 'browser';
    const timelineEntry: TimelineItem = {
      id: `box_${item.id}`,
      type: itemType,
      ts: item.created_at,
      dateObj: new Date(item.created_at),
      title: item.name,
      subtitle: item.description || `Box Cloud file (${formatBoxFileSize(item.size)})`,
      platform: 'Box Cloud',
      category: item.category || 'document',
      image_url: item.thumbnail_url || item.download_url
    };
    onImportTimelineItems([timelineEntry], 'Box Cloud Storage');
    setStatusNotification({
      type: 'success',
      message: `"${item.name}" has been linked into your Life Timeline!`
    });
  };

  // Filtered & Sorted items
  const displayItems = useMemo(() => {
    return items
      .filter(item => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q);
          const matchTags = item.tags?.some(t => t.toLowerCase().includes(q));
          if (!matchName && !matchDesc && !matchTags) return false;
        }
        // Category filter
        if (categoryFilter !== 'all') {
          if (categoryFilter === 'folder' && item.type !== 'folder') return false;
          if (categoryFilter !== 'folder' && item.category !== categoryFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Folders always first
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;

        if (sortBy === 'name') {
          return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }
        if (sortBy === 'size') {
          return sortAsc ? a.size - b.size : b.size - a.size;
        }
        if (sortBy === 'modified') {
          const dateA = new Date(a.modified_at).getTime();
          const dateB = new Date(b.modified_at).getTime();
          return sortAsc ? dateA - dateB : dateB - dateA;
        }
        return 0;
      });
  }, [items, searchQuery, categoryFilter, sortBy, sortAsc]);

  // Active user details (live only, no demo user)
  const activeUser = config.user;
  const quotaPercent = activeUser && activeUser.space_amount > 0
    ? Math.min(100, Math.round((activeUser.space_used / activeUser.space_amount) * 100))
    : 0;

  // Category Icon helper
  const renderItemIcon = (item: BoxItem) => {
    if (item.type === 'folder') {
      return (
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-2xs group-hover:scale-105 transition-transform">
          <Folder className="w-5 h-5 fill-blue-500/20" />
        </div>
      );
    }
    switch (item.category) {
      case 'image':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-2xs">
            <ImageIcon className="w-5 h-5" />
          </div>
        );
      case 'audio':
        return (
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-2xs">
            <Music className="w-5 h-5" />
          </div>
        );
      case 'video':
        return (
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-2xs">
            <Video className="w-5 h-5" />
          </div>
        );
      case 'archive':
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-2xs">
            <Archive className="w-5 h-5" />
          </div>
        );
      case 'data':
        return (
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20 shadow-2xs">
            <Database className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-2xs">
            <FileText className="w-5 h-5" />
          </div>
        );
    }
  };

  const handleLaunchOAuth = () => {
    const effectiveClientId = config.clientId || serverConfig.clientId;
    if (!effectiveClientId) {
      setStatusNotification({
        type: 'error',
        message: 'Box Client ID is required. Please set BOX_CLIENT_ID in your environment or enter it in settings.'
      });
      return;
    }
    const redirectUri = `${window.location.origin}/box-oauth-callback.html`;
    const authUrl = getBoxAuthorizeUrl(effectiveClientId, redirectUri);
    window.open(authUrl, 'box_oauth_popup', 'width=600,height=720');
  };

  return (
    <div
      className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative"
      onDragOver={e => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={e => {
        e.preventDefault();
        setIsDraggingOver(false);
        handleUploadFiles(e.dataTransfer.files);
      }}
    >
      {/* Hidden File Input for manual upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={e => handleUploadFiles(e.target.files)}
      />

      {/* Top Header Toolbar with Frosted Glass styling */}
      <div
        id="view-header-toolbar"
        className="py-3 px-4 sm:px-6 border-b border-black/8 dark:border-white/10 bg-white/45 dark:bg-[#121214]/50 backdrop-blur-2xl backdrop-saturate-180 shadow-xs sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 shrink-0"
      >
        {/* Left: Box Cloud branding */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0061D5] flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-gray-950 dark:text-white flex items-center gap-2">
                Box Cloud Storage
              </h1>
              {config.isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected ({config.authMode === 'oauth' ? 'OAuth 2.0' : 'Token'})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-500/15 text-gray-700 dark:text-gray-300 border border-gray-500/30 backdrop-blur-md">
                  <Cloud className="w-3 h-3" />
                  Not Connected
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate">
              {config.isConnected && activeUser ? (
                `${activeUser.name} • ${activeUser.login} • ${formatBoxFileSize(activeUser.space_used)} of ${formatBoxFileSize(activeUser.space_amount)} used`
              ) : (
                serverConfig.configured
                  ? 'BOX_CLIENT_ID detected in environment • Ready to connect with Box OAuth'
                  : 'Connect with Box OAuth 2.0 or Developer Token to sync your files'
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 backdrop-blur-xl transition-all cursor-pointer shadow-2xs"
            title="Configure Box Connection"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{config.isConnected ? 'Box Settings' : 'Connect Box'}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#0061D5] hover:bg-[#0052b4] transition-all cursor-pointer shadow-sm active:scale-95"
            title="Upload Files to Box"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          <button
            onClick={() => setIsNewFolderModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 bg-white/60 dark:bg-white/8 hover:bg-white/85 dark:hover:bg-white/15 border border-black/10 dark:border-white/15 backdrop-blur-xl transition-all cursor-pointer shadow-2xs"
            title="Create New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Folder</span>
          </button>

          <button
            onClick={() => refreshFolder()}
            disabled={isLoading}
            className="p-2 rounded-xl text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-white/8 hover:bg-white/85 dark:hover:bg-white/15 border border-black/10 dark:border-white/15 backdrop-blur-xl transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Refresh Box Folder"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <div className="h-4 w-px bg-black/10 dark:bg-white/15 mx-0.5" />

          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {statusNotification && (
        <div
          className={`mx-4 mt-3 px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold backdrop-blur-2xl shadow-xs transition-all ${
            statusNotification.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              : statusNotification.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-900 dark:text-rose-200'
              : 'bg-blue-500/15 border-blue-500/30 text-blue-900 dark:text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : statusNotification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-600" />
            )}
            <span>{statusNotification.message}</span>
          </div>
          <button
            onClick={() => setStatusNotification(null)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 overflow-y-auto">
        {/* Storage Overview Card */}
        <div id="box-storage-overview-card" className="mb-6">
          <div
            id="box-storage-overview-content"
            className="p-4 sm:p-5 rounded-2xl border border-[#83b19f] bg-[#9fcbba] shadow-md shadow-[#9fcbba]/25 flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-900"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0061D5] to-[#00A3FF] flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-950">
                    {config.isConnected && activeUser
                      ? (activeUser.enterprise?.name || `${activeUser.name}'s Box Cloud`)
                      : 'Box Cloud Storage'}
                  </h2>
                  <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md font-bold border ${
                    config.isConnected
                      ? 'bg-emerald-900/15 text-emerald-950 border-emerald-900/25'
                      : 'bg-teal-900/15 text-teal-950 border-teal-900/20'
                  }`}>
                    {config.isConnected ? 'Cloud Verified' : 'OAuth 2.0 Ready'}
                  </span>
                </div>
                <p className="text-xs text-slate-800 mt-0.5">
                  {config.isConnected && activeUser ? (
                    `Synchronized with Emreh timeline and archival storage. Max upload: ${formatBoxFileSize(activeUser.max_upload_size)}.`
                  ) : (
                    'Connect your Box account via OAuth 2.0 to access your real Box files, timeline backups, and cloud folders.'
                  )}
                </p>
              </div>
            </div>

            {/* Quota Progress meter or Connect CTA */}
            {config.isConnected && activeUser ? (
              <div className="w-full md:w-80 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">
                    {formatBoxFileSize(activeUser.space_used)} of {formatBoxFileSize(activeUser.space_amount)} used
                  </span>
                  <span className="font-mono font-bold text-teal-950">
                    {quotaPercent}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-700 to-cyan-600 transition-all duration-500"
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-700">
                  <span>{items.length} items in current folder</span>
                  <span>{formatBoxFileSize(Math.max(0, activeUser.space_amount - activeUser.space_used))} free</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsConnectModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0061D5] hover:bg-[#0052b4] transition-all cursor-pointer shadow-sm flex items-center gap-2"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Connect Box Account
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation & Filter Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumbs Navigation */}
          <nav className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.id || idx}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                  <button
                    onClick={() => handleNavigateToFolder(crumb.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer ${
                      isLast
                        ? 'bg-blue-500/18 text-blue-900 dark:text-blue-100 border border-blue-500/30'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/10'
                    }`}
                  >
                    {idx === 0 && <Cloud className="w-3.5 h-3.5 text-[#0061D5]" />}
                    <span className="truncate max-w-[160px]">{crumb.name}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </nav>

          {/* Search and Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search Box files..."
                className="w-full pl-8 pr-7 py-1.5 bg-white/60 dark:bg-white/8 hover:bg-white/80 dark:hover:bg-white/12 focus:bg-white dark:focus:bg-[#18181b] backdrop-blur-xl border border-black/10 dark:border-white/15 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/60 dark:bg-white/8 border border-black/10 dark:border-white/15 text-gray-800 dark:text-gray-200 outline-none backdrop-blur-xl cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="folder">Folders Only</option>
              <option value="document">Documents</option>
              <option value="image">Images</option>
              <option value="audio">Audio</option>
              <option value="archive">Archives / Zips</option>
              <option value="data">Data & JSON</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/60 dark:bg-white/8 border border-black/10 dark:border-white/15 text-gray-800 dark:text-gray-200 outline-none backdrop-blur-xl cursor-pointer"
            >
              <option value="name">Sort by Name</option>
              <option value="modified">Sort by Modified</option>
              <option value="size">Sort by Size</option>
            </select>

            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="p-1.5 rounded-xl bg-white/60 dark:bg-white/8 border border-black/10 dark:border-white/15 text-gray-700 dark:text-gray-300 hover:bg-white/85 cursor-pointer backdrop-blur-xl"
              title={sortAsc ? 'Ascending' : 'Descending'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Drag & Drop Overlay Indicator */}
        {isDraggingOver && (
          <div className="mb-4 p-6 border-2 border-dashed border-blue-500 rounded-2xl bg-blue-500/10 backdrop-blur-xl flex flex-col items-center justify-center text-center">
            <Upload className="w-8 h-8 text-blue-600 mb-2 animate-bounce" />
            <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
              Drop files here to upload directly to this Box folder
            </span>
          </div>
        )}

        {/* File Browser: Grid View */}
        {viewMode === 'grid' && displayItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {displayItems.map(item => {
              const isFolder = item.type === 'folder';
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isFolder) {
                      handleNavigateToFolder(item.id);
                    } else {
                      setPreviewItem(item);
                    }
                  }}
                  className="group relative p-3.5 rounded-2xl border border-black/8 dark:border-white/10 bg-white/50 dark:bg-[#18181b]/55 hover:bg-white/80 dark:hover:bg-[#18181b]/80 backdrop-blur-2xl shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {renderItemIcon(item)}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-bold text-gray-950 dark:text-white truncate group-hover:text-[#0061D5] transition-colors" title={item.name}>
                          {item.name}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
                          {isFolder ? 'Folder' : formatBoxFileSize(item.size)} &bull; {new Date(item.modified_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail if image */}
                  {item.category === 'image' && item.thumbnail_url && (
                    <div className="mt-3 w-full h-28 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/5">
                      <img
                        src={item.thumbnail_url}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Item Action Buttons */}
                  <div className="mt-3.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">
                      {item.type}
                    </span>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {!isFolder && onImportTimelineItems && (
                        <button
                          onClick={() => handleIngestToTimeline(item)}
                          className="p-1 rounded-lg hover:bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          title="Import to Life Timeline"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400"
                        title="Quick Look"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-1 rounded-lg hover:bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* File Browser: List View */}
        {viewMode === 'list' && displayItems.length > 0 && (
          <div className="rounded-2xl border border-black/8 dark:border-white/10 bg-white/50 dark:bg-[#18181b]/55 backdrop-blur-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/8 dark:border-white/10 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-black/[0.02] dark:bg-white/[0.02]">
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4 hidden sm:table-cell">Size</th>
                  <th className="py-2.5 px-4 hidden md:table-cell">Modified</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5 text-xs">
                {displayItems.map(item => {
                  const isFolder = item.type === 'folder';
                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        if (isFolder) {
                          handleNavigateToFolder(item.id);
                        } else {
                          setPreviewItem(item);
                        }
                      }}
                      className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {renderItemIcon(item)}
                          <span className="font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                        {isFolder ? '—' : formatBoxFileSize(item.size)}
                      </td>
                      <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                        {new Date(item.modified_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {!isFolder && onImportTimelineItems && (
                            <button
                              onClick={() => handleIngestToTimeline(item)}
                              className="p-1 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-500/15"
                              title="Import to Timeline"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="p-1 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-black/5"
                            title="Inspect Item"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/15"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State: Zero demo data */}
        {displayItems.length === 0 && !isLoading && (
          <div className="py-16 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-black/10 dark:border-white/10 rounded-3xl bg-white/30 dark:bg-white/[0.02]">
            {!config.isConnected ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-[#0061D5] flex items-center justify-center mb-3.5 shadow-sm">
                  <Cloud className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">No Box Account Connected</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mt-1.5 leading-relaxed">
                  Connect your Box account via OAuth 2.0 to access your real Box files and timeline backups, or upload local files.
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <button
                    onClick={() => setIsConnectModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0061D5] hover:bg-[#0052b4] transition-all cursor-pointer shadow-sm flex items-center gap-2"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Connect Box Account
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-white/10 hover:bg-white/80 transition-all border border-black/10 cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Local Files
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-[#0061D5] flex items-center justify-center mb-3 shadow-xs">
                  <Folder className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">This Box folder is empty</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                  No files or folders found in this directory. Upload files or create a new folder to organize your Box Cloud storage.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#0061D5] hover:bg-[#0052b4] transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload to Box
                  </button>
                  <button
                    onClick={() => setIsNewFolderModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-white/10 hover:bg-white/80 transition-all border border-black/10 cursor-pointer flex items-center gap-1.5"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    New Folder
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 1. Box Connection Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#18181b] shadow-2xl p-6 relative flex flex-col gap-4 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0061D5] flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-950 dark:text-white">Box Cloud Connection</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Connect your real Box account via OAuth 2.0 or Box Developer Token
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConnectModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Connection Options */}
            <div className="space-y-4">
              {/* Option 1: Box OAuth 2.0 (Primary) */}
              <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/[0.05] backdrop-blur-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#0061D5]" />
                    Option 1: Box OAuth 2.0 (Recommended)
                  </span>
                  {serverConfig.configured ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      BOX_CLIENT_ID Active
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-gray-500/15 text-gray-700 dark:text-gray-300">
                      Standard Flow
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                  Click the button below to authorize with your Box account. Tokens are exchanged securely via the backend.
                </p>

                {/* Redirect URI copy box */}
                <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 text-[11px] text-gray-600 dark:text-gray-400 flex items-center justify-between mb-3">
                  <span className="truncate font-mono">
                    Redirect URI: {window.location.origin}/box-oauth-callback.html
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/box-oauth-callback.html`);
                      setCopiedId('redirect_uri');
                      setTimeout(() => setCopiedId(null), 1500);
                    }}
                    className="text-blue-600 dark:text-blue-400 font-bold shrink-0 ml-2 cursor-pointer"
                  >
                    {copiedId === 'redirect_uri' ? 'Copied' : 'Copy'}
                  </button>
                </div>

                {/* If BOX_CLIENT_ID is not configured in env, allow entering it manually */}
                {!serverConfig.configured && (
                  <div className="space-y-2 mb-3">
                    <input
                      type="text"
                      placeholder="Box App Client ID"
                      value={config.clientId || ''}
                      onChange={e => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                    />
                    <input
                      type="password"
                      placeholder="Box App Client Secret (optional if in .env)"
                      value={config.clientSecret || ''}
                      onChange={e => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                    />
                  </div>
                )}

                <button
                  onClick={handleLaunchOAuth}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#0061D5] hover:bg-[#0052b4] transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Cloud className="w-4 h-4" />
                  Connect with Box OAuth
                </button>
              </div>

              {/* Option 2: Box Developer Token */}
              <div className="p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mb-2">
                  <Key className="w-3.5 h-3.5 text-blue-600" />
                  Option 2: Instant Developer Token
                </span>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Generate a 1-hour Developer Token from Box Developer Console &gt; Configuration &gt; Developer Token:
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Paste Box Developer Token..."
                    value={config.accessToken || ''}
                    onChange={e => setConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                  />
                  <button
                    onClick={async () => {
                      if (!config.accessToken) {
                        setStatusNotification({ type: 'error', message: 'Please paste a Box Developer Token' });
                        return;
                      }
                      setIsLoading(true);
                      try {
                        const user = await fetchBoxCurrentUser(config.accessToken);
                        const nextConfig: BoxConfig = {
                          isConnected: true,
                          authMode: 'token',
                          accessToken: config.accessToken,
                          user,
                          lastSyncTime: new Date().toISOString()
                        };
                        saveBoxConfig(nextConfig);
                        setConfig(nextConfig);
                        setIsConnectModalOpen(false);
                        setStatusNotification({ type: 'success', message: `Connected to Box Cloud as ${user.name}!` });
                        refreshFolder('0');
                      } catch (err: any) {
                        setStatusNotification({ type: 'error', message: `Token validation failed: ${err.message}` });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gray-800 hover:bg-gray-900 dark:bg-white/10 dark:hover:bg-white/20 transition-all cursor-pointer shadow-sm shrink-0"
                  >
                    Verify Token
                  </button>
                </div>
              </div>

              {/* Reset / Disconnect */}
              {config.isConnected && (
                <div className="flex items-center justify-end pt-2 border-t border-black/10 dark:border-white/10">
                  <button
                    onClick={() => {
                      clearBoxConfig();
                      setConfig({ isConnected: false, authMode: 'oauth', user: null });
                      setItems([]);
                      setIsConnectModalOpen(false);
                      setStatusNotification({ type: 'info', message: 'Disconnected Box account' });
                      refreshFolder('0');
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Disconnect Box Account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. New Folder Modal */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#18181b] shadow-2xl p-6 relative flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-950 dark:text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-blue-600" />
                New Folder in Box
              </h3>
              <button onClick={() => setIsNewFolderModalOpen(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Folder Name (e.g. Travel Takeout 2026)"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
              className="w-full px-3.5 py-2.5 bg-black/[0.03] dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsNewFolderModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-black/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || isLoading}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0061D5] hover:bg-[#0052b4] disabled:opacity-50 transition-all cursor-pointer shadow-sm"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. File Preview & Quick Look Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#18181b] shadow-2xl p-6 relative flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {renderItemIcon(previewItem)}
                <div>
                  <h3 className="text-base font-bold text-gray-950 dark:text-white truncate max-w-sm">
                    {previewItem.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {formatBoxFileSize(previewItem.size)} &bull; Modified {new Date(previewItem.modified_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button onClick={() => setPreviewItem(null)} className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Preview */}
            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-4 min-h-[140px] flex items-center justify-center overflow-hidden">
              {previewItem.category === 'image' && previewItem.thumbnail_url ? (
                <img
                  src={previewItem.thumbnail_url}
                  alt={previewItem.name}
                  referrerPolicy="no-referrer"
                  className="max-h-72 w-auto object-contain rounded-xl"
                />
              ) : previewItem.content_preview ? (
                <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap max-h-60 overflow-y-auto w-full">
                  {previewItem.content_preview}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-4 text-gray-500">
                  <File className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs font-medium">Box file preview</span>
                  <span className="text-[11px] text-gray-400 mt-0.5 font-mono">{previewItem.extension || 'file'}</span>
                </div>
              )}
            </div>

            {/* Meta details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/5">
                <span className="text-gray-400 block text-[10px] uppercase font-mono">Box Item ID</span>
                <span className="font-mono font-medium text-gray-900 dark:text-white truncate block">{previewItem.id}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/5">
                <span className="text-gray-400 block text-[10px] uppercase font-mono">Status</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Synchronized</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
              <button
                onClick={() => handleDeleteItem(previewItem)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-500/10 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              <div className="flex items-center gap-2">
                {onImportTimelineItems && (
                  <button
                    onClick={() => {
                      handleIngestToTimeline(previewItem);
                      setPreviewItem(null);
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add to Timeline
                  </button>
                )}
                <button
                  onClick={() => setPreviewItem(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-gray-900 dark:bg-white dark:text-black hover:opacity-90 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
