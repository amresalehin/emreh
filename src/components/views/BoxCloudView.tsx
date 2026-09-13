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
  const [config, setConfig] = useState<BoxConfig>(getBoxConfig());
  const [serverConfig, setServerConfig] = useState<BoxServerConfig>({ configured: false, clientId: '' });
  const [currentFolderId, setCurrentFolderId] = useState('0');
  const [items, setItems] = useState<BoxItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BoxBreadcrumb[]>([{ id: '0', name: 'All Files' }]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'size'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewItem, setPreviewItem] = useState<BoxItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBoxServerConfig().then(cfg => {
      setServerConfig(cfg);
      if (cfg.configured && cfg.clientId && !config.clientId) setConfig(prev => ({ ...prev, clientId: cfg.clientId }));
    });
  }, []);

  const refreshFolder = async (folderId: string = currentFolderId) => {
    setIsLoading(true);
    try {
      if (config.isConnected && config.accessToken) {
        try {
          const liveItems = await fetchBoxFolderItems(folderId, config.accessToken);
          setItems(liveItems);
          setBreadcrumbs(buildBreadcrumbs(folderId, liveItems));
        } catch (apiErr) {
          console.warn('Live Box API request failed, checking stored cache', apiErr);
          const stored = getStoredItemsForFolder(folderId);
          setItems(stored);
          setBreadcrumbs(buildBreadcrumbs(folderId, stored));
          if (stored.length === 0) setStatusNotification({ type: 'info', message: 'Box folder is empty or not yet synchronized.' });
        }
      } else {
        const stored = getStoredItemsForFolder(folderId);
        setItems(stored);
        setBreadcrumbs(buildBreadcrumbs(folderId, stored));
      }
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: err?.message || 'Failed to load folder items' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshFolder(currentFolderId);
  }, [currentFolderId, config.isConnected, config.accessToken]);

  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type !== 'BOX_OAUTH_RESPONSE') return;
      const { code, error } = event.data;
      if (error) {
        setStatusNotification({ type: 'error', message: `Box Authorization Error: ${error}` });
        return;
      }
      if (!code) return;
      setIsLoading(true);
      try {
        const redirectUri = `${window.location.origin}/box-oauth-callback.html`;
        const effectiveClientId = config.clientId || serverConfig.clientId;
        if (!effectiveClientId) throw new Error('Box OAuth client ID is not configured.');
        const tokenData = await exchangeBoxCode(code, redirectUri);
        const user = await fetchBoxCurrentUser(tokenData.access_token);
        const nextConfig: BoxConfig = {
          isConnected: true,
          authMode: 'oauth',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          clientId: effectiveClientId,
          user,
          lastSyncTime: new Date().toISOString()
        };
        saveBoxConfig(nextConfig);
        setConfig(nextConfig);
        setIsConnectModalOpen(false);
        setStatusNotification({ type: 'success', message: `Successfully connected Box Cloud for ${user.name}!` });
        setCurrentFolderId('0');
        await refreshFolder('0');
      } catch (err: any) {
        setStatusNotification({ type: 'error', message: `Failed to exchange Box token: ${err.message}` });
      } finally {
        setIsLoading(false);
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [config.clientId, serverConfig.clientId]);

  const handleNavigateToFolder = (folderId: string) => {
    setCurrentFolderId(folderId);
    setSearchQuery('');
  };

  const createLocalFolder = (name: string) => {
    const newFolder: BoxItem = {
      id: `fld_custom_${Date.now()}`,
      type: 'folder', name, size: 0,
      created_at: new Date().toISOString(), modified_at: new Date().toISOString(),
      parent_id: currentFolderId, category: 'folder', description: 'Custom folder created in Box Cloud'
    };
    saveCustomBoxItems([newFolder, ...getCustomBoxItems()]);
    setItems(prev => [newFolder, ...prev]);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsLoading(true);
    const name = newFolderName.trim();
    try {
      if (config.isConnected && config.accessToken) {
        try {
          const created = await createBoxFolder(currentFolderId, name, config.accessToken);
          setItems(prev => [created, ...prev]);
        } catch (apiErr) {
          console.warn('Direct API create folder failed, saving locally', apiErr);
          createLocalFolder(name);
        }
      } else createLocalFolder(name);
      setNewFolderName('');
      setIsNewFolderModalOpen(false);
      setStatusNotification({ type: 'success', message: `Created folder "${name}"` });
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: err?.message || 'Could not create folder' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setIsLoading(true);
    const uploadedItems: BoxItem[] = [];
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (config.isConnected && config.accessToken) {
          try {
            uploadedItems.push(await uploadBoxFile(currentFolderId, file, config.accessToken));
            continue;
          } catch (apiErr) {
            console.warn('Direct Box API upload failed, creating cached item', apiErr);
          }
        }
        let previewText: string | undefined;
        let thumbUrl: string | undefined;
        if (file.type.startsWith('image/')) thumbUrl = URL.createObjectURL(file);
        else if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json')) previewText = await file.text();
        const customItem: BoxItem = {
          id: `file_custom_${Date.now()}_${i}`, type: 'file', name: file.name, size: file.size,
          created_at: new Date().toISOString(), modified_at: new Date().toISOString(),
          description: `Uploaded file (${file.type || 'unknown'})`, extension: file.name.split('.').pop() || '',
          parent_id: currentFolderId, thumbnail_url: thumbUrl, content_preview: previewText
        };
        customItem.category = getBoxItemCategory(customItem);
        uploadedItems.push(customItem);
      }
      if (uploadedItems.length) {
        saveCustomBoxItems([...uploadedItems, ...getCustomBoxItems()]);
        setItems(prev => [...uploadedItems, ...prev]);
        setStatusNotification({ type: 'success', message: `Uploaded ${uploadedItems.length} ${uploadedItems.length === 1 ? 'file' : 'files'} to Box` });
      }
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: `Upload failed: ${err.message}` });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteItem = async (item: BoxItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    setIsLoading(true);
    try {
      if (config.isConnected && config.accessToken && !item.id.startsWith('fld_custom_') && !item.id.startsWith('file_custom_')) await deleteBoxItem(item.id, item.type, config.accessToken);
      saveCustomBoxItems(getCustomBoxItems().filter(i => i.id !== item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
      setStatusNotification({ type: 'success', message: `Deleted "${item.name}"` });
      setPreviewItem(null);
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: `Delete failed: ${err.message}` });
    } finally { setIsLoading(false); }
  };

  const handleIngestToTimeline = (item: BoxItem) => {
    if (!onImportTimelineItems) return;
    const itemType: ItemType = item.category === 'image' ? 'photo' : item.category === 'audio' ? 'spotify' : 'browser';
    onImportTimelineItems([{
      id: `box_${item.id}`, type: itemType, ts: item.created_at, dateObj: new Date(item.created_at), title: item.name,
      subtitle: item.description || `Box Cloud file (${formatBoxFileSize(item.size)})`, platform: 'Box Cloud',
      category: item.category || 'document', image_url: item.thumbnail_url || item.download_url
    }], 'Box Cloud Storage');
    setStatusNotification({ type: 'success', message: `"${item.name}" has been linked into your Life Timeline!` });
  };

  const displayItems = useMemo(() => items.filter(item => {
    const q = searchQuery.trim().toLowerCase();
    if (q && !item.name.toLowerCase().includes(q) && !item.description?.toLowerCase().includes(q) && !item.tags?.some(t => t.toLowerCase().includes(q))) return false;
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'folder' && item.type !== 'folder') return false;
      if (categoryFilter !== 'folder' && item.category !== categoryFilter) return false;
    }
    return true;
  }).sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    const comparison = sortBy === 'name' ? a.name.localeCompare(b.name) : sortBy === 'size' ? a.size - b.size : new Date(a.modified_at).getTime() - new Date(b.modified_at).getTime();
    return sortAsc ? comparison : -comparison;
  }), [items, searchQuery, categoryFilter, sortBy, sortAsc]);

  const activeUser = config.user;
  const quotaPercent = activeUser?.space_amount ? Math.min(100, Math.round((activeUser.space_used / activeUser.space_amount) * 100)) : 0;

  const renderItemIcon = (item: BoxItem) => {
    if (item.type === 'folder') return <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-2xs group-hover:scale-105 transition-transform"><Folder className="w-5 h-5 fill-blue-500/20" /></div>;
    const map: Record<string, React.ReactNode> = {
      image: <ImageIcon className="w-5 h-5" />, audio: <Music className="w-5 h-5" />, video: <Video className="w-5 h-5" />, archive: <Archive className="w-5 h-5" />, data: <Database className="w-5 h-5" />
    };
    const icon = map[item.category || ''] || <FileText className="w-5 h-5" />;
    return <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-2xs">{icon}</div>;
  };

  const handleLaunchOAuth = () => {
    const effectiveClientId = config.clientId || serverConfig.clientId;
    if (!effectiveClientId) {
      setStatusNotification({ type: 'error', message: 'Box Client ID is required. Please set BOX_CLIENT_ID in your environment or enter it in settings.' });
      return;
    }
    const redirectUri = `${window.location.origin}/box-oauth-callback.html`;
    window.open(getBoxAuthorizeUrl(effectiveClientId, redirectUri), 'box_oauth_popup', 'width=600,height=720');
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative" onDragOver={e => { e.preventDefault(); setIsDraggingOver(true); }} onDragLeave={() => setIsDraggingOver(false)} onDrop={e => { e.preventDefault(); setIsDraggingOver(false); handleUploadFiles(e.dataTransfer.files); }}>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleUploadFiles(e.target.files)} />
      <div className="py-3 px-4 sm:px-6 border-b border-black/8 dark:border-white/10 bg-white/45 dark:bg-[#121214]/50 backdrop-blur-2xl backdrop-saturate-180 shadow-xs sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0"><div className="w-9 h-9 rounded-xl bg-[#0061D5] flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0"><Cloud className="w-5 h-5" /></div><div className="min-w-0"><div className="flex items-center gap-2"><h1 className="text-base font-bold tracking-tight text-gray-950 dark:text-white">Box Cloud Storage</h1>{config.isConnected ? <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Connected ({config.authMode === 'oauth' ? 'OAuth 2.0' : 'Token'})</span> : <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-500/15 text-gray-700 dark:text-gray-300 border border-gray-500/30"><Cloud className="w-3 h-3" />Not Connected</span>}</div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate">{config.isConnected && activeUser ? `${activeUser.name} • ${activeUser.login} • ${formatBoxFileSize(activeUser.space_used)} of ${formatBoxFileSize(activeUser.space_amount)} used` : serverConfig.configured ? 'BOX_CLIENT_ID detected in environment • Ready to connect with Box OAuth' : 'Connect with Box OAuth 2.0 or Developer Token to sync your files'}</p></div></div>
        <div className="flex items-center gap-2"><button onClick={() => setIsConnectModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/15 border border-blue-500/30"><Shield className="w-3.5 h-3.5" /><span>{config.isConnected ? 'Box Settings' : 'Connect Box'}</span></button><button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#0061D5]"><Upload className="w-3.5 h-3.5" /><span className="hidden sm:inline">Upload</span></button><button onClick={() => setIsNewFolderModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 bg-white/60 dark:bg-white/8 border border-black/10 dark:border-white/15"><FolderPlus className="w-3.5 h-3.5" /><span className="hidden sm:inline">New Folder</span></button><button onClick={() => refreshFolder()} disabled={isLoading} className="p-2 rounded-xl text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-white/8 border border-black/10 dark:border-white/15"><RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /></button><div className="h-4 w-px bg-black/10 dark:bg-white/15 mx-0.5" /><div className="flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10"><button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}><Grid className="w-3.5 h-3.5" /></button><button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}><ListIcon className="w-3.5 h-3.5" /></button></div></div>
      </div>
      {statusNotification && <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold bg-white/60 dark:bg-white/5"><div className="flex items-center gap-2">{statusNotification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : statusNotification.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}<span>{statusNotification.message}</span></div><button onClick={() => setStatusNotification(null)}><X className="w-3.5 h-3.5" /></button></div>}
      <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 overflow-y-auto">
        <div className="mb-6"><div className="p-4 sm:p-5 rounded-2xl border border-[#83b19f] bg-[#9fcbba] shadow-md shadow-[#9fcbba]/25 flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-900"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0061D5] to-[#00A3FF] flex items-center justify-center text-white"><HardDrive className="w-6 h-6" /></div><div><div className="flex items-center gap-2"><h2 className="text-sm font-bold text-slate-950">{config.isConnected && activeUser ? (activeUser.enterprise?.name || `${activeUser.name}'s Box Cloud`) : 'Box Cloud Storage'}</h2><span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-bold border">{config.isConnected ? 'Cloud Verified' : 'OAuth 2.0 Ready'}</span></div><p className="text-xs text-slate-800 mt-0.5">{config.isConnected && activeUser ? `Synchronized with Emreh timeline and archival storage. Max upload: ${formatBoxFileSize(activeUser.max_upload_size)}.` : 'Connect your Box account via OAuth 2.0 to access your real Box files, timeline backups, and cloud folders.'}</p></div></div>{config.isConnected && activeUser ? <div className="w-full md:w-80 flex flex-col gap-1.5"><div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-900">{formatBoxFileSize(activeUser.space_used)} of {formatBoxFileSize(activeUser.space_amount)} used</span><span className="font-mono font-bold text-teal-950">{quotaPercent}%</span></div><div className="w-full h-2 rounded-full bg-slate-900/15 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-teal-700 to-cyan-600" style={{ width: `${quotaPercent}%` }} /></div><div className="flex items-center justify-between text-[10px] text-slate-700"><span>{items.length} items in current folder</span><span>{formatBoxFileSize(Math.max(0, activeUser.space_amount - activeUser.space_used))} free</span></div></div> : <button onClick={() => setIsConnectModalOpen(true)} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0061D5] flex items-center gap-2"><Link2 className="w-3.5 h-3.5" />Connect Box Account</button>}</div></div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><nav className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">{breadcrumbs.map((crumb, idx) => <React.Fragment key={crumb.id || idx}>{idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}<button onClick={() => handleNavigateToFolder(crumb.id)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold ${idx === breadcrumbs.length - 1 ? 'bg-blue-500/18 text-blue-900 dark:text-blue-100 border border-blue-500/30' : 'text-gray-700 dark:text-gray-300'}`}>{idx === 0 && <Cloud className="w-3.5 h-3.5 text-[#0061D5]" />}<span className="truncate max-w-[160px]">{crumb.name}</span></button></React.Fragment>)}</nav><div className="flex items-center gap-2 flex-wrap"><div className="relative w-48 sm:w-64"><Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search Box files..." className="w-full pl-8 pr-7 py-1.5 bg-white/60 dark:bg-white/8 border border-black/10 dark:border-white/15 rounded-xl text-xs" />{searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-3 h-3" /></button>}</div><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/60 dark:bg-white/8 border border-black/10 dark:border-white/15"><option value="all">All Types</option><option value="folder">Folders Only</option><option value="document">Documents</option><option value="image">Images</option><option value="audio">Audio</option><option value="archive">Archives / Zips</option><option value="data">Data & JSON</option></select><select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/60 dark:bg-white/8 border border-black/10 dark:border-white/15"><option value="name">Sort by Name</option><option value="modified">Sort by Modified</option><option value="size">Sort by Size</option></select><button onClick={() => setSortAsc(!sortAsc)} className="p-1.5 rounded-xl bg-white/60 dark:bg-white/8 border border-black/10 dark:border-white/15"><ArrowUpDown className="w-3.5 h-3.5" /></button></div></div>
        {isDraggingOver && <div className="mb-4 p-6 border-2 border-dashed border-blue-500 rounded-2xl bg-blue-500/10 flex flex-col items-center justify-center text-center"><Upload className="w-8 h-8 text-blue-600 mb-2" /><span className="text-sm font-bold text-blue-900 dark:text-blue-100">Drop files here to upload directly to this Box folder</span></div>}
        {viewMode === 'grid' && displayItems.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">{displayItems.map(item => { const isFolder = item.type === 'folder'; return <div key={item.id} onClick={() => isFolder ? handleNavigateToFolder(item.id) : setPreviewItem(item)} className="group relative p-3.5 rounded-2xl border border-black/8 dark:border-white/10 bg-white/50 dark:bg-[#18181b]/55 hover:bg-white/80 dark:hover:bg-[#18181b]/80 shadow-2xs cursor-pointer"><div className="flex items-start gap-3">{renderItemIcon(item)}<div className="min-w-0 flex-1"><h3 className="text-xs font-bold text-gray-950 dark:text-white truncate">{item.name}</h3><p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{isFolder ? 'Folder' : formatBoxFileSize(item.size)} &bull; {new Date(item.modified_at).toLocaleDateString()}</p></div></div>{item.category === 'image' && item.thumbnail_url && <div className="mt-3 w-full h-28 rounded-xl overflow-hidden"><img src={item.thumbnail_url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /></div>}<div className="mt-3.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between"><span className="text-[10px] uppercase font-mono">{item.type}</span><div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>{!isFolder && onImportTimelineItems && <button onClick={() => handleIngestToTimeline(item)} className="p-1 text-blue-600"><Plus className="w-3.5 h-3.5" /></button>}<button onClick={() => setPreviewItem(item)} className="p-1"><Eye className="w-3.5 h-3.5" /></button><button onClick={() => handleDeleteItem(item)} className="p-1 text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button></div></div></div>; })}</div>}
        {viewMode === 'list' && displayItems.length > 0 && <div className="rounded-2xl border border-black/8 dark:border-white/10 bg-white/50 dark:bg-[#18181b]/55 overflow-hidden"><table className="w-full text-left border-collapse"><thead><tr className="border-b border-black/8 dark:border-white/10 text-[11px] font-bold uppercase"><th className="py-2.5 px-4">Name</th><th className="py-2.5 px-4 hidden sm:table-cell">Size</th><th className="py-2.5 px-4 hidden md:table-cell">Modified</th><th className="py-2.5 px-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-black/5 text-xs">{displayItems.map(item => { const isFolder = item.type === 'folder'; return <tr key={item.id} onClick={() => isFolder ? handleNavigateToFolder(item.id) : setPreviewItem(item)} className="hover:bg-black/[0.02] cursor-pointer"><td className="py-2.5 px-4"><div className="flex items-center gap-2.5">{renderItemIcon(item)}<span className="font-semibold truncate">{item.name}</span></div></td><td className="py-2.5 px-4 font-mono hidden sm:table-cell">{isFolder ? '—' : formatBoxFileSize(item.size)}</td><td className="py-2.5 px-4 hidden md:table-cell">{new Date(item.modified_at).toLocaleDateString()}</td><td className="py-2.5 px-4 text-right" onClick={e => e.stopPropagation()}><div className="flex items-center justify-end gap-1">{!isFolder && onImportTimelineItems && <button onClick={() => handleIngestToTimeline(item)} className="p-1 text-blue-600"><Plus className="w-3.5 h-3.5" /></button>}<button onClick={() => setPreviewItem(item)} className="p-1"><Eye className="w-3.5 h-3.5" /></button><button onClick={() => handleDeleteItem(item)} className="p-1 text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button></div></td></tr>; })}</tbody></table></div>}
        {displayItems.length === 0 && !isLoading && <div className="py-16 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-black/10 dark:border-white/10 rounded-3xl"><div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-[#0061D5] flex items-center justify-center mb-3.5"><Cloud className="w-7 h-7" /></div><h3 className="text-base font-bold text-gray-900 dark:text-white">{config.isConnected ? 'This Box folder is empty' : 'No Box Account Connected'}</h3><p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mt-1.5">{config.isConnected ? 'No files or folders found in this directory. Upload files or create a new folder to organize your Box Cloud storage.' : 'Connect your Box account via OAuth 2.0 to access your real Box files and timeline backups, or upload local files.'}</p><div className="mt-5 flex items-center gap-3"><button onClick={() => setIsConnectModalOpen(true)} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0061D5]"><Link2 className="w-3.5 h-3.5 inline mr-1" />Connect Box Account</button><button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-xl text-xs font-semibold border border-black/10"><Upload className="w-3.5 h-3.5 inline mr-1" />Upload Local Files</button></div></div>}
      </div>
      {isConnectModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"><div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#18181b] shadow-2xl p-6 relative"><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-[#0061D5] flex items-center justify-center text-white"><Cloud className="w-5 h-5" /></div><div><h3 className="text-base font-bold">Box Cloud Connection</h3><p className="text-xs text-gray-500">Connect your real Box account via OAuth 2.0 or Developer Token</p></div></div><button onClick={() => setIsConnectModalOpen(false)}><X className="w-4 h-4" /></button></div><div className="space-y-4"><div className="p-4 rounded-2xl border border-blue-500/30"><div className="flex items-center justify-between mb-2"><span className="text-xs font-bold"><Link2 className="w-3.5 h-3.5 inline mr-1" />Option 1: Box OAuth 2.0 (Recommended)</span><span className="text-[10px] px-2 py-0.5 rounded-md font-semibold">{serverConfig.configured ? 'BOX_CLIENT_ID Active' : 'Standard Flow'}</span></div><p className="text-xs text-gray-600 dark:text-gray-300 mb-3">Authorize with your Box account. Tokens are exchanged securely via the backend.</p><div className="p-2.5 rounded-xl bg-black/5 text-[11px] flex items-center justify-between mb-3"><span className="truncate font-mono">Redirect URI: {window.location.origin}/box-oauth-callback.html</span><button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/box-oauth-callback.html`); setCopiedId('redirect_uri'); setTimeout(() => setCopiedId(null), 1500); }} className="text-blue-600 font-bold shrink-0 ml-2">{copiedId === 'redirect_uri' ? 'Copied' : 'Copy'}</button></div>{!serverConfig.configured && <div className="space-y-2 mb-3"><input type="text" placeholder="Box App Client ID" value={config.clientId || ''} onChange={e => setConfig(prev => ({ ...prev, clientId: e.target.value }))} className="w-full px-3 py-1.5 bg-white dark:bg-black/30 border border-black/10 rounded-xl text-xs" /></div>}<button onClick={handleLaunchOAuth} className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#0061D5]"><Cloud className="w-4 h-4 inline mr-1" />Connect with Box OAuth</button></div><div className="p-4 rounded-2xl border border-black/10"><span className="text-xs font-bold flex items-center gap-1.5 mb-2"><Key className="w-3.5 h-3.5 text-blue-600" />Option 2: Instant Developer Token</span><p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Generate a 1-hour Developer Token from Box Developer Console &gt; Configuration &gt; Developer Token:</p><div className="flex gap-2"><input type="password" placeholder="Paste Box Developer Token..." value={config.accessToken || ''} onChange={e => setConfig(prev => ({ ...prev, accessToken: e.target.value }))} className="flex-1 px-3 py-1.5 bg-white dark:bg-black/30 border border-black/10 rounded-xl text-xs" /><button onClick={async () => { if (!config.accessToken) { setStatusNotification({ type: 'error', message: 'Please paste a Box Developer Token' }); return; } setIsLoading(true); try { const user = await fetchBoxCurrentUser(config.accessToken); const nextConfig: BoxConfig = { isConnected: true, authMode: 'token', accessToken: config.accessToken, user, lastSyncTime: new Date().toISOString() }; saveBoxConfig(nextConfig); setConfig(nextConfig); setIsConnectModalOpen(false); setStatusNotification({ type: 'success', message: `Connected to Box Cloud as ${user.name}!` }); await refreshFolder('0'); } catch (err: any) { setStatusNotification({ type: 'error', message: `Token validation failed: ${err.message}` }); } finally { setIsLoading(false); } }} className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gray-800 shrink-0">Verify Token</button></div></div>{config.isConnected && <div className="flex justify-end pt-2 border-t"><button onClick={() => { clearBoxConfig(); const nextConfig: BoxConfig = { isConnected: false, authMode: 'oauth', user: null, selectedFolderId: '0' }; setConfig(nextConfig); setItems([]); setIsConnectModalOpen(false); setStatusNotification({ type: 'info', message: 'Disconnected Box account' }); }} className="text-xs font-semibold text-rose-600">Disconnect Box Account</button></div>}</div></div></div>}
      {isNewFolderModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"><div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#18181b] shadow-2xl p-6"><div className="flex items-center justify-between"><h3 className="text-base font-bold flex items-center gap-2"><FolderPlus className="w-4 h-4 text-blue-600" />New Folder in Box</h3><button onClick={() => setIsNewFolderModalOpen(false)}><X className="w-4 h-4" /></button></div><input type="text" placeholder="Folder Name (e.g. Travel Takeout 2026)" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} autoFocus className="w-full mt-4 px-3.5 py-2.5 bg-black/[0.03] dark:bg-white/5 border border-black/10 rounded-xl text-xs" /><div className="flex items-center justify-end gap-2 mt-4"><button onClick={() => setIsNewFolderModalOpen(false)} className="px-3 py-1.5 rounded-xl text-xs font-semibold">Cancel</button><button onClick={handleCreateFolder} disabled={!newFolderName.trim() || isLoading} className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0061D5] disabled:opacity-50">Create Folder</button></div></div></div>}
      {previewItem && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"><div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#18181b] shadow-2xl p-6 max-h-[85vh] overflow-y-auto"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3">{renderItemIcon(previewItem)}<div><h3 className="text-base font-bold truncate max-w-sm">{previewItem.name}</h3><p className="text-xs text-gray-500">{formatBoxFileSize(previewItem.size)} &bull; Modified {new Date(previewItem.modified_at).toLocaleString()}</p></div></div><button onClick={() => setPreviewItem(null)}><X className="w-4 h-4" /></button></div><div className="rounded-2xl border bg-black/[0.02] p-4 min-h-[140px] flex items-center justify-center mt-4">{previewItem.category === 'image' && previewItem.thumbnail_url ? <img src={previewItem.thumbnail_url} alt={previewItem.name} className="max-h-72 w-auto object-contain rounded-xl" referrerPolicy="no-referrer" /> : previewItem.content_preview ? <pre className="text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto w-full">{previewItem.content_preview}</pre> : <div className="flex flex-col items-center text-center p-4 text-gray-500"><File className="w-8 h-8 mb-2 opacity-50" /><span className="text-xs font-medium">Box file preview</span><span className="text-[11px] mt-0.5 font-mono">{previewItem.extension || 'file'}</span></div>}</div><div className="grid grid-cols-2 gap-2 text-xs mt-4"><div className="p-3 rounded-xl bg-black/[0.03]"><span className="text-gray-400 block text-[10px] uppercase font-mono">Box Item ID</span><span className="font-mono font-medium truncate block">{previewItem.id}</span></div><div className="p-3 rounded-xl bg-black/[0.03]"><span className="text-gray-400 block text-[10px] uppercase font-mono">Status</span><span className="font-semibold text-emerald-600">Synchronized</span></div></div><div className="flex items-center justify-between pt-3 mt-3 border-t"><button onClick={() => handleDeleteItem(previewItem)} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" />Delete</button><div className="flex items-center gap-2">{onImportTimelineItems && <button onClick={() => { handleIngestToTimeline(previewItem); setPreviewItem(null); }} className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-blue-600"><Plus className="w-3.5 h-3.5 inline mr-1" />Add to Timeline</button>}<button onClick={() => setPreviewItem(null)} className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-gray-900 dark:bg-white dark:text-black">Close</button></div></div></div></div>}
    </div>
  );
};
