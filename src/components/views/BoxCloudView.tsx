import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Cloud, Folder, FileText, Image as ImageIcon, Music, Video, Archive, Database,
  Search, Upload, FolderPlus, RefreshCw, Grid, List as ListIcon, ChevronRight,
  Trash2, CheckCircle2, AlertCircle, HardDrive, Shield, X, File, Eye,
  ArrowUpDown, Sparkles, Link2, Plus, Key
} from 'lucide-react';
import {
  BoxItem, BoxConfig, BoxBreadcrumb, BoxServerConfig,
  getBoxConfig, saveBoxConfig, clearBoxConfig, getCustomBoxItems,
  saveCustomBoxItems, getStoredItemsForFolder,
  formatBoxFileSize, getBoxItemCategory, getBoxAuthorizeUrl, exchangeBoxCode,
  fetchBoxCurrentUser, fetchBoxFolderItems, createBoxFolder, uploadBoxFile,
  deleteBoxItem, fetchBoxServerConfig
} from '../../utils/boxApi';
import { TimelineItem, ItemType } from '../../types';

interface BoxCloudViewProps {
  onImportTimelineItems?: (items: TimelineItem[], sourceName: string) => void;
  onNavigateToView?: (view: string) => void;
}

const BOX_OAUTH_STATE_KEY = 'emreh_box_oauth_state_v1';

function getBoxRedirectUri(): string {
  return new URL('box-oauth-callback.html', document.baseURI).toString();
}

function createOAuthState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export const BoxCloudView: React.FC<BoxCloudViewProps> = ({ onImportTimelineItems }) => {
  const [config, setConfig] = useState<BoxConfig>(getBoxConfig());
  const [serverConfig, setServerConfig] = useState<BoxServerConfig>({ configured: false, clientId: '' });
  const [currentFolderId, setCurrentFolderId] = useState<string>('0');
  const [items, setItems] = useState<BoxItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BoxBreadcrumb[]>([{ id: '0', name: 'All Files' }]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
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
  const oauthPopupRef = useRef<Window | null>(null);

  useEffect(() => {
    fetchBoxServerConfig().then(cfg => {
      setServerConfig(cfg);
      if (cfg.configured && cfg.clientId && !config.clientId) {
        setConfig(prev => ({ ...prev, clientId: cfg.clientId }));
      }
    });
  }, []);

  const refreshFolder = async (folderId: string = currentFolderId) => {
    setIsLoading(true);
    try {
      if (config.isConnected && config.accessToken) {
        try {
          const liveItems = await fetchBoxFolderItems(folderId, config.accessToken);
          setItems(liveItems);
        } catch (apiErr) {
          console.warn('Live Box API request failed, checking stored cache', apiErr);
          const stored = getStoredItemsForFolder(folderId);
          setItems(stored);
          if (stored.length === 0) setStatusNotification({ type: 'info', message: 'Box folder is empty or not yet synchronized.' });
        }
      } else {
        setItems(getStoredItemsForFolder(folderId));
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
      if (event.origin !== window.location.origin) return;
      if (oauthPopupRef.current && event.source !== oauthPopupRef.current) return;

      const expectedState = (() => {
        try {
          return sessionStorage.getItem(BOX_OAUTH_STATE_KEY);
        } catch {
          return null;
        }
      })();
      if (!expectedState || event.data.state !== expectedState) {
        setStatusNotification({ type: 'error', message: 'Rejected Box OAuth response: invalid or expired authorization state.' });
        return;
      }

      try {
        sessionStorage.removeItem(BOX_OAUTH_STATE_KEY);
      } catch {}
      oauthPopupRef.current = null;

      const { code, error } = event.data;
      if (error) {
        setStatusNotification({ type: 'error', message: `Box Authorization Error: ${error}` });
        return;
      }
      if (!code) return;
      setIsLoading(true);
      try {
        const redirectUri = getBoxRedirectUri();
        const effectiveClientId = config.clientId || serverConfig.clientId;
        if (!effectiveClientId) throw new Error('Box OAuth client ID is not configured.');
        const tokenData = await exchangeBoxCode(code, redirectUri);
        if (!tokenData.access_token) throw new Error('Box did not return an access token.');
        const user = await fetchBoxCurrentUser(tokenData.access_token);
        const nextConfig: BoxConfig = {
          isConnected: true,
          authMode: 'oauth',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
          clientId: effectiveClientId,
          user,
          lastSyncTime: new Date().toISOString()
        };
        saveBoxConfig(nextConfig);
        setConfig(nextConfig);
        setIsConnectModalOpen(false);
        setStatusNotification({ type: 'success', message: `Successfully connected Box Cloud for ${user.name}!` });
        setCurrentFolderId('0');
        setBreadcrumbs([{ id: '0', name: 'All Files' }]);
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
    if (folderId === '0') {
      setBreadcrumbs([{ id: '0', name: 'All Files' }]);
      setCurrentFolderId('0');
      setSearchQuery('');
      return;
    }

    const folder = items.find(item => item.id === folderId && item.type === 'folder');
    if (folder) {
      setBreadcrumbs(prev => {
        const existingIndex = prev.findIndex(crumb => crumb.id === folderId);
        if (existingIndex >= 0) return prev.slice(0, existingIndex + 1);
        return [...prev, { id: folder.id, name: folder.name }];
      });
    }
    setCurrentFolderId(folderId);
    setSearchQuery('');
  };

  const createLocalFolder = (name: string) => {
    const now = new Date().toISOString();
    const newFolder: BoxItem = {
      id: `fld_custom_${Date.now()}`,
      type: 'folder',
      name,
      size: 0,
      created_at: now,
      modified_at: now,
      parent_id: currentFolderId,
      category: 'folder',
      description: 'Custom folder created locally in Emreh'
    };
    saveCustomBoxItems([newFolder, ...getCustomBoxItems()]);
    setItems(prev => [newFolder, ...prev]);
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setIsLoading(true);
    try {
      if (config.isConnected && config.accessToken) {
        try {
          const created = await createBoxFolder(currentFolderId, name, config.accessToken);
          setItems(prev => [created, ...prev]);
          setStatusNotification({ type: 'success', message: `Created Box folder "${name}"` });
        } catch (apiErr) {
          console.warn('Box API folder creation failed; saving locally instead', apiErr);
          createLocalFolder(name);
          setStatusNotification({ type: 'info', message: `Box folder creation failed; saved "${name}" locally in Emreh instead.` });
        }
      } else {
        createLocalFolder(name);
        setStatusNotification({ type: 'success', message: `Created local folder "${name}"` });
      }
      setNewFolderName('');
      setIsNewFolderModalOpen(false);
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: err?.message || 'Could not create folder' });
    } finally {
      setIsLoading(false);
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setIsLoading(true);
    const uploadedItems: BoxItem[] = [];
    const localFallbackCount = { value: 0 };
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (config.isConnected && config.accessToken) {
          try {
            uploadedItems.push(await uploadBoxFile(currentFolderId, file, config.accessToken));
            continue;
          } catch (apiErr) {
            console.warn('Box API upload failed, creating local fallback item', apiErr);
            localFallbackCount.value += 1;
          }
        }
        let previewText: string | undefined;
        let thumbUrl: string | undefined;
        if (file.type.startsWith('image/')) {
          try {
            thumbUrl = await readFileAsDataUrl(file);
          } catch (thumbErr) {
            console.warn('Failed to persist image thumbnail', thumbErr);
          }
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
          description: `Stored locally in Emreh (${file.type || 'unknown'})`,
          extension: file.name.split('.').pop() || '',
          parent_id: currentFolderId,
          thumbnail_url: thumbUrl,
          content_preview: previewText
        };
        customItem.category = getBoxItemCategory(customItem);
        uploadedItems.push(customItem);
      }
      if (uploadedItems.length) {
        const localItems = uploadedItems.filter(item => item.id.startsWith('file_custom_'));
        if (localItems.length) saveCustomBoxItems([...localItems, ...getCustomBoxItems()]);
        setItems(prev => [...uploadedItems, ...prev]);
        if (localFallbackCount.value > 0) {
          setStatusNotification({ type: 'info', message: `${uploadedItems.length} file(s) processed; ${localFallbackCount.value} saved locally because Box upload failed.` });
        } else {
          setStatusNotification({ type: 'success', message: `Uploaded ${uploadedItems.length} ${uploadedItems.length === 1 ? 'file' : 'files'} to Box` });
        }
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
      if (config.isConnected && config.accessToken && !item.id.startsWith('fld_custom_') && !item.id.startsWith('file_custom_')) {
        await deleteBoxItem(item.id, item.type, config.accessToken);
      }
      saveCustomBoxItems(getCustomBoxItems().filter(i => i.id !== item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
      setStatusNotification({ type: 'success', message: `Deleted "${item.name}"` });
      setPreviewItem(null);
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: `Delete failed: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

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
    if (item.type === 'folder') return <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center border border-blue-500/20"><Folder className="w-5 h-5" /></div>;
    const iconMap: Record<string, React.ReactNode> = {
      image: <ImageIcon className="w-5 h-5" />, audio: <Music className="w-5 h-5" />, video: <Video className="w-5 h-5" />,
      archive: <Archive className="w-5 h-5" />, data: <Database className="w-5 h-5" />
    };
    return <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center border border-blue-500/20">{iconMap[item.category || ''] || <FileText className="w-5 h-5" />}</div>;
  };

  const handleLaunchOAuth = () => {
    const clientId = config.clientId || serverConfig.clientId;
    if (!clientId) {
      setStatusNotification({ type: 'error', message: 'Box Client ID is required. Please set BOX_CLIENT_ID in your environment or enter it in settings.' });
      return;
    }
    const state = createOAuthState();
    try {
      sessionStorage.setItem(BOX_OAUTH_STATE_KEY, state);
    } catch {
      setStatusNotification({ type: 'error', message: 'Unable to start Box OAuth securely because session storage is unavailable.' });
      return;
    }
    const redirectUri = getBoxRedirectUri();
    const popup = window.open(getBoxAuthorizeUrl(clientId, redirectUri, state), 'box_oauth_popup', 'width=600,height=720');
    if (!popup) {
      sessionStorage.removeItem(BOX_OAUTH_STATE_KEY);
      setStatusNotification({ type: 'error', message: 'Box OAuth popup was blocked. Allow popups for Emreh and try again.' });
      return;
    }
    oauthPopupRef.current = popup;
  };

  const redirectUri = getBoxRedirectUri();

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative"
      onDragOver={e => { e.preventDefault(); setIsDraggingOver(true); }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={e => { e.preventDefault(); setIsDraggingOver(false); void handleUploadFiles(e.dataTransfer.files); }}>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => { void handleUploadFiles(e.target.files); }} />
      <div className="py-3 px-4 sm:px-6 border-b border-black/8 dark:border-white/10 bg-white/45 dark:bg-[#121214]/50 sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0"><div className="w-9 h-9 rounded-xl bg-[#0061D5] flex items-center justify-center text-white"><Cloud className="w-5 h-5" /></div><div><h1 className="text-base font-bold text-gray-950 dark:text-white">Box Cloud Storage</h1><p className="text-xs text-gray-600 dark:text-gray-400 truncate">{config.isConnected && activeUser ? `${activeUser.name} • ${activeUser.login}` : serverConfig.configured ? 'BOX_CLIENT_ID detected in environment • Ready to connect with Box OAuth' : 'Connect with Box OAuth 2.0 or Developer Token to sync your files'}</p></div></div>
        <div className="flex items-center gap-2"><button onClick={() => setIsConnectModalOpen(true)} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/15"><Shield className="w-3.5 h-3.5 inline mr-1" />{config.isConnected ? 'Box Settings' : 'Connect Box'}</button><button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#0061D5]"><Upload className="w-3.5 h-3.5 inline mr-1" />Upload</button><button onClick={() => setIsNewFolderModalOpen(true)} className="px-3 py-1.5 rounded-xl text-xs font-semibold"><FolderPlus className="w-3.5 h-3.5 inline mr-1" />New Folder</button><button onClick={() => refreshFolder()} disabled={isLoading} className="p-2 rounded-xl"><RefreshCw className={isLoading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} /></button><button onClick={() => setViewMode('grid')} className="p-2 rounded-xl"><Grid className="w-3.5 h-3.5" /></button><button onClick={() => setViewMode('list')} className="p-2 rounded-xl"><ListIcon className="w-3.5 h-3.5" /></button></div>
      </div>
      {statusNotification && <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl border text-xs flex items-center justify-between"><span>{statusNotification.message}</span><button onClick={() => setStatusNotification(null)}><X className="w-3.5 h-3.5" /></button></div>}
      <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 overflow-y-auto">
        <div className="mb-6 p-4 sm:p-5 rounded-2xl border bg-[#9fcbba] flex flex-col md:flex-row md:items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0061D5] to-[#00A3FF] flex items-center justify-center text-white"><HardDrive className="w-6 h-6" /></div><div><h2 className="text-sm font-bold">{config.isConnected && activeUser ? (activeUser.enterprise?.name || `${activeUser.name}'s Box Cloud`) : 'Box Cloud Storage'}</h2><p className="text-xs mt-0.5">{config.isConnected && activeUser ? `Synchronized with Emreh timeline and archival storage. Max upload: ${formatBoxFileSize(activeUser.max_upload_size)}.` : 'Connect your Box account via OAuth 2.0 to access your real Box files, timeline backups, and cloud folders.'}</p></div></div>{config.isConnected && activeUser ? <div className="w-full md:w-80"><div className="flex justify-between text-xs"><span>{formatBoxFileSize(activeUser.space_used)} of {formatBoxFileSize(activeUser.space_amount)} used</span><span>{quotaPercent}%</span></div><div className="w-full h-2 mt-1 rounded-full bg-slate-900/15"><div className="h-full rounded-full bg-teal-700" style={{ width: `${quotaPercent}%` }} /></div></div> : <button onClick={() => setIsConnectModalOpen(true)} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0061D5]"><Link2 className="w-3.5 h-3.5 inline mr-1" />Connect Box Account</button>}</div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><nav className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">{breadcrumbs.map((crumb, idx) => <React.Fragment key={crumb.id || idx}>{idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}<button onClick={() => handleNavigateToFolder(crumb.id)} className="px-2.5 py-1 rounded-lg font-semibold">{crumb.name}</button></React.Fragment>)}</nav><div className="flex items-center gap-2 flex-wrap"><div className="relative w-48 sm:w-64"><Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search Box files..." className="w-full pl-8 pr-7 py-1.5 border rounded-xl text-xs" /></div><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-2.5 py-1.5 rounded-xl text-xs border"><option value="all">All Types</option><option value="folder">Folders Only</option><option value="document">Documents</option><option value="image">Images</option><option value="audio">Audio</option><option value="archive">Archives / Zips</option><option value="data">Data & JSON</option></select><select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="px-2.5 py-1.5 rounded-xl text-xs border"><option value="name">Sort by Name</option><option value="modified">Sort by Modified</option><option value="size">Sort by Size</option></select><button onClick={() => setSortAsc(v => !v)} className="p-1.5 rounded-xl border"><ArrowUpDown className="w-3.5 h-3.5" /></button></div></div>
        {isDraggingOver && <div className="mb-4 p-6 border-2 border-dashed border-blue-500 rounded-2xl text-center"><Upload className="w-8 h-8 mx-auto mb-2" /><span className="text-sm font-bold">Drop files here to upload directly to this Box folder</span></div>}
        {viewMode === 'grid' && displayItems.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">{displayItems.map(item => <div key={item.id} onClick={() => item.type === 'folder' ? handleNavigateToFolder(item.id) : setPreviewItem(item)} className="group p-3.5 rounded-2xl border bg-white/50 cursor-pointer"><div className="flex items-start gap-3">{renderItemIcon(item)}<div className="min-w-0 flex-1"><h3 className="text-xs font-bold truncate">{item.name}</h3><p className="text-[11px] text-gray-500 truncate">{item.type === 'folder' ? 'Folder' : formatBoxFileSize(item.size)} • {new Date(item.modified_at).toLocaleDateString()}</p></div></div>{item.category === 'image' && item.thumbnail_url && <img src={item.thumbnail_url} alt={item.name} className="mt-3 w-full h-28 object-cover rounded-xl" />}</div>)}</div>}
        {viewMode === 'list' && displayItems.length > 0 && <div className="rounded-2xl border overflow-hidden"><table className="w-full text-left text-xs"><thead><tr className="border-b"><th className="py-2.5 px-4">Name</th><th className="py-2.5 px-4">Size</th><th className="py-2.5 px-4">Modified</th><th className="py-2.5 px-4 text-right">Actions</th></tr></thead><tbody>{displayItems.map(item => <tr key={item.id} className="border-b"><td className="py-2.5 px-4"><div className="flex items-center gap-2.5">{renderItemIcon(item)}<span className="font-semibold truncate">{item.name}</span></div></td><td className="py-2.5 px-4">{item.type === 'folder' ? '—' : formatBoxFileSize(item.size)}</td><td className="py-2.5 px-4">{new Date(item.modified_at).toLocaleDateString()}</td><td className="py-2.5 px-4 text-right"><button onClick={() => setPreviewItem(item)} className="mr-2"><Eye className="w-3.5 h-3.5" /></button><button onClick={() => handleDeleteItem(item)}><Trash2 className="w-3.5 h-3.5 text-rose-600" /></button></td></tr>)}</tbody></table></div>}
        {displayItems.length === 0 && !isLoading && <div className="py-16 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-3xl"><Cloud className="w-10 h-10 mb-3" /><h3 className="text-base font-bold">{config.isConnected ? 'This Box folder is empty' : 'No Box Account Connected'}</h3><p className="text-xs text-gray-500 max-w-md mt-1.5">{config.isConnected ? 'No files or folders found in this directory.' : 'Connect your Box account via OAuth 2.0 to access your real Box files and timeline backups, or upload local files.'}</p><div className="mt-5 flex items-center gap-3"><button onClick={() => setIsConnectModalOpen(true)} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0061D5]"><Link2 className="w-3.5 h-3.5 inline mr-1" />Connect Box Account</button><button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-xl text-xs font-semibold border"><Upload className="w-3.5 h-3.5 inline mr-1" />Upload Local Files</button></div></div>}
      </div>
      {isConnectModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"><div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#18181b] shadow-2xl p-6"><div className="flex items-center justify-between"><div><h3 className="text-base font-bold">Box Cloud Connection</h3><p className="text-xs text-gray-500">Connect your real Box account via OAuth 2.0 or Box Developer Token</p></div><button onClick={() => setIsConnectModalOpen(false)}><X className="w-4 h-4" /></button></div><div className="space-y-4 mt-4"><div className="p-4 rounded-2xl border border-blue-500/30"><div className="flex items-center justify-between mb-2"><span className="text-xs font-bold">Option 1: Box OAuth 2.0</span><span className="text-[10px]">{serverConfig.configured ? 'BOX_CLIENT_ID Active' : 'Standard Flow'}</span></div><p className="text-xs text-gray-600 dark:text-gray-300 mb-3">Authorize with your Box account. Tokens are exchanged securely via the backend.</p><div className="p-2.5 rounded-xl bg-black/5 text-[11px] flex items-center justify-between mb-3"><span className="truncate font-mono">Redirect URI: {redirectUri}</span><button onClick={() => { navigator.clipboard.writeText(redirectUri); setCopiedId('redirect_uri'); setTimeout(() => setCopiedId(null), 1500); }} className="text-blue-600 font-bold ml-2">{copiedId === 'redirect_uri' ? 'Copied' : 'Copy'}</button></div>{!serverConfig.configured && <input type="text" placeholder="Box App Client ID" value={config.clientId || ''} onChange={e => setConfig(prev => ({ ...prev, clientId: e.target.value }))} className="w-full px-3 py-1.5 mb-3 border rounded-xl text-xs" />}<button onClick={handleLaunchOAuth} className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#0061D5]">Connect with Box OAuth</button></div><div className="p-4 rounded-2xl border"><span className="text-xs font-bold flex items-center gap-1.5 mb-2"><Key className="w-3.5 h-3.5 text-blue-600" />Option 2: Instant Developer Token</span><p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Generate a 1-hour Developer Token from Box Developer Console &gt; Configuration &gt; Developer Token:</p><div className="flex gap-2"><input type="password" placeholder="Paste Box Developer Token..." value={config.accessToken || ''} onChange={e => setConfig(prev => ({ ...prev, accessToken: e.target.value }))} className="flex-1 px-3 py-1.5 border rounded-xl text-xs" /><button onClick={async () => { if (!config.accessToken) { setStatusNotification({ type: 'error', message: 'Please paste a Box Developer Token' }); return; } setIsLoading(true); try { const user = await fetchBoxCurrentUser(config.accessToken); const nextConfig: BoxConfig = { isConnected: true, authMode: 'token', accessToken: config.accessToken, user, lastSyncTime: new Date().toISOString() }; saveBoxConfig(nextConfig); setConfig(nextConfig); setIsConnectModalOpen(false); setStatusNotification({ type: 'success', message: `Connected to Box Cloud as ${user.name}!` }); await refreshFolder('0'); } catch (err: any) { setStatusNotification({ type: 'error', message: `Token validation failed: ${err.message}` }); } finally { setIsLoading(false); } }} className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gray-800">Verify Token</button></div></div>{config.isConnected && <div className="flex justify-end pt-2 border-t"><button onClick={() => { clearBoxConfig(); try { sessionStorage.removeItem(BOX_OAUTH_STATE_KEY); } catch {} oauthPopupRef.current = null; const nextConfig: BoxConfig = { isConnected: false, authMode: 'oauth', user: null }; setConfig(nextConfig); setItems([]); setBreadcrumbs([{ id: '0', name: 'All Files' }]); setIsConnectModalOpen(false); }} className="text-xs font-semibold text-rose-600">Disconnect Box Account</button></div>}</div></div></div>}
      {isNewFolderModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"><div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#18181b] shadow-2xl p-6"><div className="flex items-center justify-between"><h3 className="text-base font-bold">New Folder in Box</h3><button onClick={() => setIsNewFolderModalOpen(false)}><X className="w-4 h-4" /></button></div><input type="text" placeholder="Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && void handleCreateFolder()} className="w-full mt-4 px-3.5 py-2.5 border rounded-xl text-xs" /><div className="flex justify-end gap-2 mt-4"><button onClick={() => setIsNewFolderModalOpen(false)} className="px-3 py-1.5 rounded-xl text-xs">Cancel</button><button onClick={() => void handleCreateFolder()} disabled={!newFolderName.trim() || isLoading} className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0061D5] disabled:opacity-50">Create Folder</button></div></div></div>}
      {previewItem && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"><div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#18181b] shadow-2xl p-6"><div className="flex items-start justify-between"><div className="flex items-center gap-3">{renderItemIcon(previewItem)}<div><h3 className="text-base font-bold truncate">{previewItem.name}</h3><p className="text-xs text-gray-500">{formatBoxFileSize(previewItem.size)} • Modified {new Date(previewItem.modified_at).toLocaleString()}</p></div></div><button onClick={() => setPreviewItem(null)}><X className="w-4 h-4" /></button></div>{previewItem.category === 'image' && previewItem.thumbnail_url ? <img src={previewItem.thumbnail_url} alt={previewItem.name} className="max-h-72 w-auto object-contain rounded-xl mx-auto mt-4" /> : previewItem.content_preview ? <pre className="mt-4 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">{previewItem.content_preview}</pre> : <div className="mt-4 p-8 text-center text-gray-500">Box file preview</div>}<div className="flex justify-end gap-2 mt-4 pt-3 border-t"><button onClick={() => void handleDeleteItem(previewItem)} className="px-3 py-1.5 rounded-xl text-xs text-rose-600">Delete</button>{onImportTimelineItems && <button onClick={() => { handleIngestToTimeline(previewItem); setPreviewItem(null); }} className="px-3.5 py-1.5 rounded-xl text-xs text-blue-600">Add to Timeline</button>}<button onClick={() => setPreviewItem(null)} className="px-4 py-1.5 rounded-xl text-xs text-white bg-gray-900">Close</button></div></div></div>}
    </div>
  );
};
