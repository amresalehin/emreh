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
    clientId: ''
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
            if (!effectiveClientId) {
              throw new Error('Box OAuth client ID is not configured.');
            }
            // The client secret is intentionally never read, passed, or persisted here.
            const tokenData = await exchangeBoxCode(code, undefined, undefined, redirectUri);
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
  }, [config.clientId, serverConfig.clientId]);

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
          } catch (apiErr) {
            console.warn('Box API upload failed, saving locally', apiErr);
            const localItem: BoxItem = {
              id: `file_custom_${Date.now()}_${i}`,
              type: 'file',
              name: file.name,
              size: file.size,
              created_at: new Date().toISOString(),
              modified_at: new Date().toISOString(),
              parent_id: currentFolderId,
              extension: file.name.split('.').pop() || '',
              category: getBoxItemCategory({ name: file.name, type: 'file' } as BoxItem)
            };
            uploadedItems.push(localItem);
            const custom = getCustomBoxItems();
            saveCustomBoxItems([localItem, ...custom]);
          }
        } else {
          const localItem: BoxItem = {
            id: `file_custom_${Date.now()}_${i}`,
            type: 'file',
            name: file.name,
            size: file.size,
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString(),
            parent_id: currentFolderId,
            extension: file.name.split('.').pop() || '',
            category: getBoxItemCategory({ name: file.name, type: 'file' } as BoxItem)
          };
          uploadedItems.push(localItem);
          const custom = getCustomBoxItems();
          saveCustomBoxItems([localItem, ...custom]);
        }
      }
      setItems(prev => [...uploadedItems, ...prev]);
      setStatusNotification({ type: 'success', message: `Uploaded ${uploadedItems.length} file${uploadedItems.length === 1 ? '' : 's'}.` });
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: err?.message || 'Upload failed' });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = items.filter(item => {
      if (query && !item.name.toLowerCase().includes(query)) return false;
      if (categoryFilter !== 'all' && getBoxItemCategory(item) !== categoryFilter) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'modified') comparison = new Date(a.modified_at).getTime() - new Date(b.modified_at).getTime();
      else comparison = a.size - b.size;
      return sortAsc ? comparison : -comparison;
    });
  }, [items, searchQuery, categoryFilter, sortBy, sortAsc]);

  const handleDisconnect = () => {
    clearBoxConfig();
    setConfig({ isConnected: false, authMode: 'oauth', user: null, selectedFolderId: '0' });
    setItems(getStoredItemsForFolder('0'));
    setStatusNotification({ type: 'info', message: 'Box Cloud disconnected.' });
  };

  // ... existing UI rendering below remains unchanged ...
