import React, { useEffect, useMemo, useRef, useState } from 'react';
import firebaseConfig from '../../../firebase-applet-config.json';

import {
  HardDrive,
  Folder,
  FileText,
  Image as ImageIcon,
  Search,
  Upload,
  FolderPlus,
  RefreshCw,
  Grid,
  List as ListIcon,
  ChevronRight,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  X,
  File,
  Star,
  SlidersHorizontal,
  Key,
  FileCode,
  FileSpreadsheet,
  Presentation,
  Sparkles
} from 'lucide-react';

import {
  GDriveDriveConfig,
  GDriveFile,
  GDriveBreadcrumb
} from '../../types/gdrive';

import {
  loadDrivesConfig,
  saveDrivesConfig,
  fetchFilesForFolder,
  fetchGDriveFileContent,
  createGDriveFolder,
  uploadFileToGDrive,
  deleteGDriveItem,
  authenticateWithGoogleDrive
} from '../../utils/googleDriveService';

import { NoteObject } from '../../types/notes';

import {
  persistStoredNotes,
  loadStoredNotes,
  textToBlocks
} from '../../utils/notesStorage';

/* ============================================================================
   TYPES
============================================================================ */

interface GoogleDriveViewProps {
  onNavigateToView?: (view: string) => void;
  onImportNoteCreated?: (note: NoteObject) => void;
}

/* ============================================================================
   GOOGLE COLORS
============================================================================ */

const GOOGLE_COLORS = {
  blue: '#4285F4',
  blueDark: '#3367D6',
  red: '#EA4335',
  yellow: '#FBBC04',
  green: '#34A853'
} as const;

/* ============================================================================
   GOOGLE DRIVE AMBIENT BACKGROUND
============================================================================ */

const GoogleDriveAmbientBackground: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <div className="relative isolate w-full h-full min-h-0 overflow-hidden bg-transparent">
      <div className="relative z-10 w-full h-full min-h-0 bg-transparent">
        {children}
      </div>
    </div>
  );
};

/* ============================================================================
   GOOGLE DRIVE VIEW
============================================================================ */

export const GoogleDriveView: React.FC<GoogleDriveViewProps> = ({
  onNavigateToView,
  onImportNoteCreated
}) => {
  /* ==========================================================================
     DRIVE STATE
  ========================================================================== */

  const [drives, setDrives] = useState<GDriveDriveConfig[]>(
    () => loadDrivesConfig()
  );

  const [activeDriveId, setActiveDriveId] = useState<
    'drive-1' | 'drive-2'
  >('drive-1');

  const activeDrive = useMemo(() => {
    return (
      drives.find(
        drive => drive.id === activeDriveId
      ) || drives[0]
    );
  }, [drives, activeDriveId]);

  /* ==========================================================================
     NAVIGATION
  ========================================================================== */

  const [currentFolderId, setCurrentFolderId] =
    useState<string | null>(null);

  const [breadcrumbs, setBreadcrumbs] =
    useState<GDriveBreadcrumb[]>([
      {
        id: 'root',
        name: 'My Drive'
      }
    ]);

  const [items, setItems] = useState<GDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /* ==========================================================================
     SEARCH / FILTERS
  ========================================================================== */

  const [searchQuery, setSearchQuery] =
    useState('');

  const [categoryFilter, setCategoryFilter] =
    useState<string>('all');

  const [sortBy, setSortBy] = useState<
    'name' | 'modified' | 'size'
  >('name');

  const [sortAsc, setSortAsc] =
    useState(true);

  const [viewMode, setViewMode] =
    useState<'grid' | 'list'>('grid');

  /* ==========================================================================
     PREVIEW
  ========================================================================== */

  const [previewItem, setPreviewItem] =
    useState<GDriveFile | null>(null);

  const [previewContent, setPreviewContent] =
    useState('');

  const [isLoadingPreview, setIsLoadingPreview] =
    useState(false);

  /* ==========================================================================
     CONNECTION
  ========================================================================== */

  const [isConnectModalOpen, setIsConnectModalOpen] =
    useState(false);

  const [customClientId, setCustomClientId] =
    useState('');

  const [manualToken, setManualToken] =
    useState('');

  const [isAuthenticating, setIsAuthenticating] =
    useState(false);

  /* ==========================================================================
     FOLDER
  ========================================================================== */

  const [isNewFolderModalOpen, setIsNewFolderModalOpen] =
    useState(false);

  const [newFolderName, setNewFolderName] =
    useState('');

  /* ==========================================================================
     NOTIFICATIONS
  ========================================================================== */

  const [statusNotification, setStatusNotification] =
    useState<{
      type: 'success' | 'error' | 'info';
      message: string;
    } | null>(null);

  /* ==========================================================================
     FILE INPUT
  ========================================================================== */

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const notificationTimeoutRef =
    useRef<number | null>(null);

  /* ==========================================================================
     NOTIFICATION HELPER
  ========================================================================== */

  const showNotification = (
    type: 'success' | 'error' | 'info',
    message: string
  ) => {
    // Clear any pending dismissal from a previous notification so it can't
    // fire late and prematurely hide a newer one that was just shown.
    if (notificationTimeoutRef.current !== null) {
      window.clearTimeout(notificationTimeoutRef.current);
    }

    setStatusNotification({
      type,
      message
    });

    notificationTimeoutRef.current = window.setTimeout(() => {
      setStatusNotification(null);
      notificationTimeoutRef.current = null;
    }, 3800);
  };

  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current !== null) {
        window.clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  /* ==========================================================================
     LOAD ITEMS
  ========================================================================== */

  const handleDriveAuthExpired = (driveId: string) => {
    setDrives(prev => {
      const target = prev.find(d => d.id === driveId);
      // Only notify/flip once — avoid spamming a notification on every
      // subsequent 401 if the user is already looking at a disconnected drive.
      if (!target || target.status !== 'connected') return prev;

      const updated = prev.map(d =>
        d.id === driveId
          ? { ...d, status: 'disconnected' as const, accessToken: null, tokenExpiry: null }
          : d
      );
      saveDrivesConfig(updated);
      showNotification(
        'error',
        `Your session for ${target.name} has expired. Please reconnect.`
      );
      return updated;
    });
  };

  const loadItems = async (
    driveConfig: GDriveDriveConfig,
    folderId: string | null
  ) => {
    if (!driveConfig) return;

    setIsLoading(true);

    try {
      const files =
        await fetchFilesForFolder(
          driveConfig,
          folderId,
          () => handleDriveAuthExpired(driveConfig.id)
        );

      setItems(files);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown error';

      showNotification(
        'error',
        `Failed to load files: ${message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!activeDrive) return;

    void loadItems(
      activeDrive,
      currentFolderId
    );
  }, [
    activeDrive,
    currentFolderId
  ]);

  /* ==========================================================================
     OPEN FOLDER
  ========================================================================== */

  const handleOpenFolder = (
    folder: GDriveFile
  ) => {
    if (!folder.isFolder) return;

    setCurrentFolderId(
      folder.id
    );

    setBreadcrumbs(prev => [
      ...prev,
      {
        id: folder.id,
        name: folder.name
      }
    ]);
  };

  /* ==========================================================================
     NAVIGATE BREADCRUMB
  ========================================================================== */

  const handleNavigateBreadcrumb =
    (index: number) => {
      const target =
        breadcrumbs[index];

      if (!target) return;

      setBreadcrumbs(
        breadcrumbs.slice(
          0,
          index + 1
        )
      );

      setCurrentFolderId(
        target.id === 'root'
          ? null
          : target.id
      );
    };

  /* ==========================================================================
     FILTER / SORT
  ========================================================================== */

  const filteredAndSortedItems =
    useMemo(() => {
      return [...items]
        .filter(item => {
          if (searchQuery.trim()) {
            const query =
              searchQuery
                .trim()
                .toLowerCase();

            if (
              !item.name
                .toLowerCase()
                .includes(query)
            ) {
              return false;
            }
          }

          if (
            categoryFilter ===
            'all'
          ) {
            return true;
          }

          if (
            categoryFilter ===
            'folder'
          ) {
            return item.isFolder;
          }

          if (
            categoryFilter ===
            'starred'
          ) {
            return Boolean(
              item.starred
            );
          }

          return (
            item.category ===
            categoryFilter
          );
        })
        .sort((a, b) => {
          if (
            a.isFolder &&
            !b.isFolder
          ) {
            return -1;
          }

          if (
            !a.isFolder &&
            b.isFolder
          ) {
            return 1;
          }

          if (
            sortBy ===
            'name'
          ) {
            return sortAsc
              ? a.name.localeCompare(
                  b.name
                )
              : b.name.localeCompare(
                  a.name
                );
          }

          if (
            sortBy ===
            'modified'
          ) {
            const aDate =
              new Date(
                a.modifiedTime
              ).getTime();

            const bDate =
              new Date(
                b.modifiedTime
              ).getTime();

            return sortAsc
              ? aDate - bDate
              : bDate - aDate;
          }

          if (
            sortBy ===
            'size'
          ) {
            const aSize =
              a.size || 0;

            const bSize =
              b.size || 0;

            return sortAsc
              ? aSize - bSize
              : bSize - aSize;
          }

          return 0;
        });
    }, [
      items,
      searchQuery,
      categoryFilter,
      sortBy,
      sortAsc
    ]);

  /* ==========================================================================
     PREVIEW
  ========================================================================== */

  const handlePreviewFile =
    async (
      file: GDriveFile
    ) => {
      if (file.isFolder) return;

      setPreviewItem(file);
      setPreviewContent('');
      setIsLoadingPreview(true);

      try {
        const content =
          await fetchGDriveFileContent(
            activeDrive,
            file
          );

        setPreviewContent(
          content
        );
      } catch {
        setPreviewContent(
          'Failed to generate preview for this item.'
        );
      } finally {
        setIsLoadingPreview(
          false
        );
      }
    };

  /* ==========================================================================
     IMPORT TO NOTES
  ========================================================================== */

  const handleImportToNotes =
    async (
      file: GDriveFile
    ) => {
      try {
        const content =
          await fetchGDriveFileContent(
            activeDrive,
            file
          );

        const now =
          new Date().toISOString();

        const newNote: NoteObject = {
          id: `gdrive-note-${Date.now()}`,
          title: file.name.replace(
            /\.[^/.]+$/,
            ''
          ),
          type: 'note',
          icon: '📁',
          createdAt: now,
          updatedAt: now,
          status: 'To Do',
          priority: 'Medium',
          tags: [
            'google-drive',
            activeDrive.driveLetter
              .replace(':', '')
              .toLowerCase()
          ],
          blocks:
            textToBlocks(
              content
            )
        };

        const existingNotes =
          await loadStoredNotes();

        persistStoredNotes([
          newNote,
          ...existingNotes
        ]);

        onImportNoteCreated?.(
          newNote
        );

        showNotification(
          'success',
          `Imported "${file.name}" to Notes!`
        );

        if (onNavigateToView) {
          window.setTimeout(() => {
            onNavigateToView(
              'notes'
            );
          }, 1200);
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown error';

        showNotification(
          'error',
          `Failed to import to notes: ${message}`
        );
      }
    };

  /* ==========================================================================
     CREATE FOLDER
  ========================================================================== */

  const handleCreateFolder =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      const folderName =
        newFolderName.trim();

      if (!folderName) return;

      try {
        const folder =
          await createGDriveFolder(
            activeDrive,
            currentFolderId,
            folderName
          );

        setItems(prev => [
          folder,
          ...prev
        ]);

        setNewFolderName('');
        setIsNewFolderModalOpen(
          false
        );

        showNotification(
          'success',
          `Folder "${folder.name}" created successfully.`
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown error';

        showNotification(
          'error',
          `Failed to create folder: ${message}`
        );
      }
    };

  /* ==========================================================================
     UPLOAD
  ========================================================================== */

  const handleUploadFile =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      if (!file) return;

      try {
        const uploaded =
          await uploadFileToGDrive(
            activeDrive,
            currentFolderId,
            file
          );

        setItems(prev => [
          uploaded,
          ...prev
        ]);

        showNotification(
          'success',
          `Uploaded "${file.name}" to ${activeDrive.driveLetter} Drive.`
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown error';

        showNotification(
          'error',
          `Upload failed: ${message}`
        );
      } finally {
        event.target.value =
          '';
      }
    };

  /* ==========================================================================
     DELETE
  ========================================================================== */

  const handleDeleteItem =
    async (
      file: GDriveFile
    ) => {
      try {
        await deleteGDriveItem(
          activeDrive.id,
          file.id
        );

        setItems(prev =>
          prev.filter(
            item =>
              item.id !==
              file.id
          )
        );

        if (
          previewItem?.id ===
          file.id
        ) {
          setPreviewItem(null);
        }

        showNotification(
          'info',
          `Removed "${file.name}" from ${activeDrive.driveLetter} Drive.`
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown error';

        showNotification(
          'error',
          `Failed to delete "${file.name}": ${message}`
        );
      }
    };

  /* ==========================================================================
     TOGGLE STAR
  ========================================================================== */

  const handleToggleStar =
    (
      file: GDriveFile
    ) => {
      setItems(prev =>
        prev.map(item =>
          item.id === file.id
            ? {
                ...item,
                starred:
                  !item.starred
              }
            : item
        )
      );
    };

  /* ==========================================================================
     GOOGLE AUTHENTICATION
  ========================================================================== */

  const handleConnectWithGoogle =
    async () => {
      setIsAuthenticating(
        true
      );

      try {
        const clientId =
          customClientId.trim() ||
          firebaseConfig?.oAuthClientId ||
          '557752141960-3dml0i9f7s4lgb51cdc6ub6gh1cqbv2e.apps.googleusercontent.com';

        const authResult =
          await authenticateWithGoogleDrive(
            clientId
          );

        const updatedDrives =
          drives.map(drive => {
            if (
              drive.id !==
              activeDrive.id
            ) {
              return drive;
            }

            return {
              ...drive,
              status:
                'connected' as const,
              accessToken:
                authResult.accessToken,
              tokenExpiry:
                authResult.tokenExpiry ?? null,
              user:
                authResult.user ||
                drive.user,
              lastSynced:
                'Just now'
            };
          });

        setDrives(
          updatedDrives
        );

        saveDrivesConfig(
          updatedDrives
        );

        setIsConnectModalOpen(
          false
        );

        showNotification(
          'success',
          `Successfully authenticated ${activeDrive.name}!`
        );

        const updatedDrive =
          updatedDrives.find(
            drive =>
              drive.id ===
              activeDrive.id
          );

        if (updatedDrive) {
          void loadItems(
            updatedDrive,
            currentFolderId
          );
        }
      } catch (error: unknown) {
        console.warn(
          'Authentication error:',
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : 'Google sign-in popup was cancelled or authentication failed.';

        showNotification(
          'error',
          message
        );
      } finally {
        setIsAuthenticating(
          false
        );
      }
    };

  /* ==========================================================================
     MANUAL TOKEN
  ========================================================================== */

  const handleApplyManualToken =
    () => {
      const token =
        manualToken.trim();

      if (!token) return;

      const updatedDrives =
        drives.map(drive => {
          if (
            drive.id !==
            activeDrive.id
          ) {
            return drive;
          }

          return {
            ...drive,
            status:
              'connected' as const,
            accessToken:
              token,
            lastSynced:
              'Just now'
          };
        });

      setDrives(
        updatedDrives
      );

      saveDrivesConfig(
        updatedDrives
      );

      setManualToken('');

      setIsConnectModalOpen(
        false
      );

      showNotification(
        'success',
        `Token applied to ${activeDrive.name}`
      );

      const updatedDrive =
        updatedDrives.find(
          drive =>
            drive.id ===
            activeDrive.id
        );

      if (updatedDrive) {
        void loadItems(
          updatedDrive,
          currentFolderId
        );
      }
    };

  /* ==========================================================================
     DISCONNECT
  ========================================================================== */

  const handleDisconnectDrive =
    () => {
      const updatedDrives =
        drives.map(drive => {
          if (
            drive.id !==
            activeDrive.id
          ) {
            return drive;
          }

          return {
            ...drive,
            status:
              'disconnected' as const,
            accessToken: null,
            tokenExpiry: null
          };
        });

      setDrives(
        updatedDrives
      );

      saveDrivesConfig(
        updatedDrives
      );

      setItems([]);

      showNotification(
        'info',
        `Unmounted ${activeDrive.driveLetter} Drive.`
      );
    };

  /* ==========================================================================
     ICON RENDERING
  ========================================================================== */

  const renderItemIcon =
    (
      item: GDriveFile
    ) => {
      if (item.isFolder) {
        return (
          <Folder
            className="w-5 h-5 shrink-0"
            style={{
              color:
                GOOGLE_COLORS.yellow,
              fill:
                `${GOOGLE_COLORS.yellow}20`
            }}
          />
        );
      }

      switch (
        item.category
      ) {
        case 'document':
          return (
            <FileText
              className="w-5 h-5 shrink-0"
              style={{
                color:
                  GOOGLE_COLORS.blue
              }}
            />
          );

        case 'spreadsheet':
          return (
            <FileSpreadsheet
              className="w-5 h-5 shrink-0"
              style={{
                color:
                  GOOGLE_COLORS.green
              }}
            />
          );

        case 'presentation':
          return (
            <Presentation
              className="w-5 h-5 shrink-0"
              style={{
                color:
                  GOOGLE_COLORS.yellow
              }}
            />
          );

        case 'pdf':
          return (
            <File
              className="w-5 h-5 shrink-0"
              style={{
                color:
                  GOOGLE_COLORS.red
              }}
            />
          );

        case 'image':
          return (
            <ImageIcon className="w-5 h-5 shrink-0 text-purple-500" />
          );

        case 'code':
          return (
            <FileCode className="w-5 h-5 shrink-0 text-teal-500" />
          );

        default:
          return (
            <File className="w-5 h-5 shrink-0 text-stone-400" />
          );
      }
    };

  const mountedDrivesCount =
    drives.filter(
      drive =>
        drive.status ===
        'connected'
    ).length;

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <GoogleDriveAmbientBackground>
      <div className="flex-1 flex flex-col h-full min-h-0 bg-transparent text-stone-800 dark:text-stone-200 overflow-hidden select-none">

        {/* ====================================================================
            FILE INPUT
        ==================================================================== */}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={
            handleUploadFile
          }
        />

        {/* ====================================================================
            NOTIFICATION
        ==================================================================== */}

        {statusNotification && (
          <div className="absolute top-4 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-200">

            <div className="
              flex
              items-center
              gap-2.5
              px-4
              py-2.5
              rounded-xl
              bg-white/25
              dark:bg-black/40
              backdrop-blur-md
              border
              border-black/5
              dark:border-white/10
              shadow-sm
              text-xs
              font-medium
            ">
              {statusNotification.type ===
                'success' && (
                <CheckCircle2
                  className="w-4 h-4 shrink-0"
                  style={{
                    color:
                      GOOGLE_COLORS.green
                  }}
                />
              )}

              {statusNotification.type ===
                'error' && (
                <AlertCircle
                  className="w-4 h-4 shrink-0"
                  style={{
                    color:
                      GOOGLE_COLORS.red
                  }}
                />
              )}

              {statusNotification.type ===
                'info' && (
                <Clock
                  className="w-4 h-4 shrink-0"
                  style={{
                    color:
                      GOOGLE_COLORS.yellow
                  }}
                />
              )}

              <span>
                {
                  statusNotification.message
                }
              </span>
            </div>
          </div>
        )}

        {/* ====================================================================
            HEADER
        ==================================================================== */}

        <header className="
          px-4 md:px-6 py-3.5
          border-b border-black/5 dark:border-white/10
          bg-transparent
          backdrop-blur-[2px]
          shrink-0
          flex flex-col md:flex-row
          items-stretch md:items-center
          justify-between
          gap-3
        ">

          {/* Heading */}
          <div className="flex items-center gap-3 min-w-0">

            <div className="flex items-center gap-2 min-w-0">

              {/* Google-style Drive mark */}
              <div
                className="w-9 h-9 rounded-xl p-[1.5px] shadow-xs shrink-0"
                style={{
                  background:
                    'conic-gradient(from 220deg, #4285F4 0deg, #4285F4 88deg, #EA4335 146deg, #FBBC04 220deg, #34A853 292deg, #4285F4 360deg)'
                }}
              >
                <div className="w-full h-full rounded-[10px] bg-[#f8f9fa] dark:bg-[#202124] flex items-center justify-center">
                  <HardDrive
                    className="w-4 h-4"
                    style={{
                      color:
                        GOOGLE_COLORS.blue
                    }}
                  />
                </div>
              </div>

              <div className="min-w-0">

                <div className="flex items-center gap-2 flex-wrap">

                  <h1 className="text-sm md:text-base font-bold text-stone-900 dark:text-white tracking-tight leading-tight">
                    Google Drive Network Storage
                  </h1>

                  {mountedDrivesCount >
                    0 && (
                    <span
                      className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor:
                          `${GOOGLE_COLORS.green}0D`,
                        color:
                          GOOGLE_COLORS.green,
                        borderColor:
                          `${GOOGLE_COLORS.green}24`
                      }}
                    >
                      {
                        mountedDrivesCount
                      }{' '}
                      {mountedDrivesCount ===
                      1
                        ? 'Drive'
                        : 'Drives'}{' '}
                      Mounted
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                  Browse, search, edit and import cloud files directly into Notes and Journals.
                </p>
              </div>
            </div>
          </div>

          {/* Drives */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">

            {drives.map(
              drive => {
                const isActive =
                  drive.id ===
                  activeDriveId;

                return (
                  <button aria-label="Action"
                    key={
                      drive.id
                    }
                    type="button"
                    onClick={() => {
                      setActiveDriveId(
                        drive.id
                      );

                      setCurrentFolderId(
                        null
                      );

                      setBreadcrumbs([
                        {
                          id: 'root',
                          name: 'My Drive'
                        }
                      ]);
                    }}
                    className={`
                      relative
                      px-3
                      py-1.5
                      rounded-xl
                      border
                      text-xs
                      font-medium
                      flex
                      items-center
                      gap-2.5
                      transition-all
                      duration-200
                      cursor-pointer
                      shrink-0
                      ${
                        isActive
                          ? 'text-white'
                          : 'bg-transparent hover:bg-white/[0.05] dark:hover:bg-white/[0.05] border-black/5 dark:border-white/10 text-stone-700 dark:text-stone-300'
                      }
                    `}
                    style={
                      isActive
                        ? {
                            background:
                              `linear-gradient(135deg, ${GOOGLE_COLORS.blue}, ${GOOGLE_COLORS.blueDark})`,
                            borderColor:
                              `${GOOGLE_COLORS.blue}77`,
                            boxShadow:
                              `0 4px 14px ${GOOGLE_COLORS.blue}1A`
                          }
                        : undefined
                    }
                  >

                    <div className={`
                      w-5 h-5
                      rounded-md
                      flex
                      items-center
                      justify-center
                      font-bold
                      text-[11px]
                      font-mono
                      ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-black/5 dark:bg-white/10 text-stone-600 dark:text-stone-400'
                      }
                    `}>
                      {
                        drive.driveLetter
                      }
                    </div>

                    <div className="flex flex-col text-left">
                      <span className="leading-tight font-semibold truncate max-w-[140px]">
                        {
                          drive.name
                        }
                      </span>

                      <span
                        className={`text-[10px] leading-tight ${
                          isActive
                            ? 'text-blue-100'
                            : 'text-stone-400'
                        }`}
                      >
                        {drive.status ===
                        'connected'
                          ? `Synced live${
                              drive
                                .storageQuota
                                ?.formattedUsage
                                ? ` • ${drive.storageQuota.formattedUsage}`
                                : ''
                            }`
                          : 'Not connected'}
                      </span>
                    </div>

                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          drive.status ===
                          'connected'
                            ? GOOGLE_COLORS.green
                            : '#9CA3AF'
                      }}
                    />
                  </button>
                );
              }
            )}

            <button
              type="button"
              title="Configure or reconnect Google Drive"
              onClick={() =>
                setIsConnectModalOpen(
                  true
                )
              }
              className="p-2 rounded-xl bg-transparent hover:bg-white/[0.05] dark:hover:bg-white/[0.05] border border-black/5 dark:border-white/10 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ====================================================================
            ACCOUNT RIBBON
        ==================================================================== */}

        <div className="
          px-4 md:px-6 py-2.5
          bg-transparent
          backdrop-blur-[2px]
          border-b border-black/5 dark:border-white/10
          flex flex-wrap items-center justify-between
          gap-3 text-xs
        ">

          <div className="flex items-center gap-3 flex-wrap">

            <div className="flex items-center gap-2">
              <span
                className="font-mono font-bold px-1.5 py-0.5 rounded text-[11px] border"
                style={{
                  color:
                    GOOGLE_COLORS.blue,
                  backgroundColor:
                    `${GOOGLE_COLORS.blue}0D`,
                  borderColor:
                    `${GOOGLE_COLORS.blue}22`
                }}
              >
                {
                  activeDrive.driveLetter
                }
              </span>

              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {
                  activeDrive.name
                }
              </span>
            </div>

            <span className="text-stone-300 dark:text-stone-600">
              •
            </span>

            <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">

              <User className="w-3.5 h-3.5" />

              <span className="truncate max-w-[220px]">
                {activeDrive.status ===
                'connected'
                  ? activeDrive.user
                      ?.emailAddress ||
                    'Connected Account'
                  : 'Not connected'}
              </span>
            </div>

            <span className="text-stone-300 dark:text-stone-600">
              •
            </span>

            <div className="flex items-center gap-2">

              <span className="text-stone-500 dark:text-stone-400">
                {
                  activeDrive
                    .storageQuota
                    ?.formattedUsage ||
                  '0 GB'
                }{' '}
                of{' '}
                {
                  activeDrive
                    .storageQuota
                    ?.formattedLimit ||
                  '15 GB'
                }
              </span>

              <div className="w-20 md:w-28 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">

                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      activeDrive
                        .storageQuota
                        ?.percentUsed ||
                        0
                    )}%`,
                    background:
                      'linear-gradient(90deg, #4285F4 0%, #4285F4 30%, #EA4335 55%, #FBBC04 77%, #34A853 100%)'
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">

            <button aria-label="Action"
              type="button"
              onClick={() =>
                void loadItems(
                  activeDrive,
                  currentFolderId
                )
              }
              className="px-2.5 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-stone-600 dark:text-stone-400 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw
                className={`w-3 h-3 ${
                  isLoading
                    ? 'animate-spin'
                    : ''
                }`}
                style={{
                  color:
                    isLoading
                      ? GOOGLE_COLORS.blue
                      : undefined
                }}
              />
              <span>
                Refresh
              </span>
            </button>

            <button aria-label="Action"
              type="button"
              onClick={() =>
                setIsConnectModalOpen(
                  true
                )
              }
              className="px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              style={{
                backgroundColor:
                  `${GOOGLE_COLORS.blue}0D`,
                color:
                  GOOGLE_COLORS.blue
              }}
            >
              <Key className="w-3 h-3" />
              <span>
                Google Account Setup
              </span>
            </button>
          </div>
        </div>

        {/* ====================================================================
            TOOLBAR
        ==================================================================== */}

        <div className="
          px-4 md:px-6 py-3
          flex flex-col md:flex-row
          items-stretch md:items-center
          justify-between
          gap-3
          border-b border-black/5 dark:border-white/10
          bg-transparent
          backdrop-blur-[2px]
          shrink-0
        ">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs overflow-x-auto scrollbar-none py-1">

            <button aria-label="Action"
              type="button"
              onClick={() =>
                handleNavigateBreadcrumb(
                  0
                )
              }
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-stone-600 dark:text-stone-300 font-semibold cursor-pointer shrink-0"
            >
              <HardDrive
                className="w-3.5 h-3.5"
                style={{
                  color:
                    GOOGLE_COLORS.blue
                }}
              />

              <span>
                {
                  activeDrive.driveLetter
                }
              </span>
            </button>

            {breadcrumbs.map(
              (
                breadcrumb,
                index
              ) => (
                <React.Fragment
                  key={
                    breadcrumb.id
                  }
                >
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />

                  <button aria-label="Action"
                    type="button"
                    onClick={() =>
                      handleNavigateBreadcrumb(
                        index
                      )
                    }
                    className={`px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0 truncate max-w-[140px] ${
                      index ===
                      breadcrumbs.length -
                        1
                        ? 'font-bold text-stone-900 dark:text-white'
                        : 'text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {
                      breadcrumb.name
                    }
                  </button>
                </React.Fragment>
              )
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">

            {/* Search */}
            <div className="relative flex-1 md:w-56">

              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />

              <input
                type="text"
                placeholder="Search files..."
                value={
                  searchQuery
                }
                onChange={
                  event =>
                    setSearchQuery(
                      event.target
                        .value
                    )
                }
                className="
                  w-full
                  pl-8 pr-7 py-1.5
                  text-xs
                  rounded-xl
                  bg-white/[0.04]
                  dark:bg-white/[0.035]
                  backdrop-blur-md
                  border border-black/5
                  dark:border-white/10
                  text-stone-900
                  dark:text-white
                  placeholder:text-stone-400
                  focus:outline-none
                "
                style={{
                  boxShadow:
                    searchQuery
                      ? `0 0 0 1px ${GOOGLE_COLORS.blue}40`
                      : undefined
                }}
              />

              {searchQuery && (
                <button aria-label="Action"
                  type="button"
                  onClick={() =>
                    setSearchQuery(
                      ''
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* New Folder */}
            <button aria-label="Action"
              type="button"
              onClick={() =>
                setIsNewFolderModalOpen(
                  true
                )
              }
              className="
                p-1.5 md:px-2.5 md:py-1.5
                rounded-xl
                bg-transparent
                hover:bg-white/[0.05]
                dark:hover:bg-white/[0.05]
                border border-black/5
                dark:border-white/10
                text-stone-700
                dark:text-stone-300
                text-xs font-medium
                flex items-center gap-1.5
                transition-colors
                cursor-pointer
                shrink-0
              "
              title="Create New Folder"
            >
              <FolderPlus
                className="w-3.5 h-3.5"
                style={{
                  color:
                    GOOGLE_COLORS.yellow
                }}
              />

              <span className="hidden md:inline">
                New Folder
              </span>
            </button>

            {/* Upload */}
            <button aria-label="Action"
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="p-1.5 md:px-3 md:py-1.5 rounded-xl text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              style={{
                backgroundColor:
                  GOOGLE_COLORS.blue,
                boxShadow:
                  `0 4px 14px ${GOOGLE_COLORS.blue}18`
              }}
              title="Upload file to drive"
            >
              <Upload className="w-3.5 h-3.5" />

              <span className="hidden md:inline">
                Upload
              </span>
            </button>

            {/* View mode */}
            <div className="
              flex items-center
              p-0.5
              rounded-xl
              bg-transparent
              border border-black/5
              dark:border-white/10
              shrink-0
            ">

              <button aria-label="Action"
                type="button"
                onClick={() =>
                  setViewMode(
                    'grid'
                  )
                }
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode ===
                  'grid'
                    ? 'bg-white/[0.08] dark:bg-white/[0.08] shadow-none'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
                style={
                  viewMode ===
                  'grid'
                    ? {
                        color:
                          GOOGLE_COLORS.blue
                      }
                    : undefined
                }
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              <button aria-label="Action"
                type="button"
                onClick={() =>
                  setViewMode(
                    'list'
                  )
                }
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode ===
                  'list'
                    ? 'bg-white/[0.08] dark:bg-white/[0.08] shadow-none'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
                style={
                  viewMode ===
                  'list'
                    ? {
                        color:
                          GOOGLE_COLORS.blue
                      }
                    : undefined
                }
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ====================================================================
            CATEGORY PILLS
        ==================================================================== */}

        <div className="
          px-4 md:px-6 py-2
          border-b border-black/5 dark:border-white/10
          flex items-center gap-1.5
          overflow-x-auto scrollbar-none
          shrink-0 text-xs
          bg-transparent
        ">

          {[
            {
              id: 'all',
              label: 'All Files'
            },
            {
              id: 'folder',
              label: 'Folders'
            },
            {
              id: 'document',
              label: 'Docs'
            },
            {
              id: 'spreadsheet',
              label: 'Sheets'
            },
            {
              id: 'presentation',
              label: 'Slides'
            },
            {
              id: 'pdf',
              label: 'PDFs'
            },
            {
              id: 'image',
              label: 'Images'
            },
            {
              id: 'code',
              label: 'Code'
            },
            {
              id: 'starred',
              label: 'Starred'
            }
          ].map(
            category => {
              const selected =
                categoryFilter ===
                category.id;

              const accent =
                category.id ===
                'spreadsheet'
                  ? GOOGLE_COLORS.green
                  : category.id ===
                    'presentation'
                  ? GOOGLE_COLORS.yellow
                  : category.id ===
                    'pdf'
                  ? GOOGLE_COLORS.red
                  : GOOGLE_COLORS.blue;

              return (
                <button aria-label="Action"
                  key={
                    category.id
                  }
                  type="button"
                  onClick={() =>
                    setCategoryFilter(
                      category.id
                    )
                  }
                  className={`
                    px-3
                    py-1
                    rounded-full
                    text-[11px]
                    font-medium
                    transition-all
                    cursor-pointer
                    shrink-0
                    ${
                      selected
                        ? 'shadow-xs'
                        : 'bg-transparent text-stone-600 dark:text-stone-400 hover:bg-white/[0.05] dark:hover:bg-white/[0.05] border border-black/5 dark:border-white/10'
                    }
                  `}
                  style={
                    selected
                      ? {
                          backgroundColor:
                            accent,
                          color:
                            category.id ===
                            'presentation'
                              ? '#202124'
                              : '#ffffff'
                        }
                      : undefined
                  }
                >
                  {
                    category.label
                  }
                </button>
              );
            }
          )}
        </div>

        {/* ====================================================================
            FILE AREA
        ==================================================================== */}

        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">

          {/* Loading */}
          {isLoading && (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-stone-400">

              <RefreshCw
                className="w-7 h-7 animate-spin"
                style={{
                  color:
                    GOOGLE_COLORS.blue
                }}
              />

              <p className="text-xs">
                Reading network drive contents...
              </p>
            </div>
          )}

          {/* Empty */}
          {!isLoading &&
            filteredAndSortedItems.length ===
              0 && (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-stone-400 text-center">

                <Folder
                  className="w-12 h-12 stroke-1"
                  style={{
                    color:
                      `${GOOGLE_COLORS.yellow}88`
                  }}
                />

                <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
                  No files found in this folder
                </p>

                <p className="text-xs text-stone-400 max-w-sm">
                  Upload a document, create a new folder, or switch to another category filter.
                </p>

                <button aria-label="Action"
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="mt-2 px-4 py-2 rounded-xl text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
                  style={{
                    backgroundColor:
                      GOOGLE_COLORS.blue
                  }}
                >
                  Upload a File Now
                </button>
              </div>
            )}

          {/* Grid */}
          {!isLoading &&
            filteredAndSortedItems.length >
              0 &&
            viewMode ===
              'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">

                {filteredAndSortedItems.map(
                  item => (
                    <div
                      key={
                        item.id
                      }
                      onDoubleClick={() =>
                        item.isFolder
                          ? handleOpenFolder(
                              item
                            )
                          : void handlePreviewFile(
                              item
                            )
                      }
                      className="
                        group
                        relative
                        flex
                        flex-col
                        p-3
                        rounded-2xl
                        bg-transparent
                        backdrop-blur-[6px]
                        border
                        border-black/5
                        dark:border-white/10
                        hover:bg-white/[0.04]
                        dark:hover:bg-white/[0.035]
                        hover:border-blue-400/30
                        hover:shadow-sm
                        transition-all
                        duration-200
                        cursor-pointer
                        select-none
                      "
                    >

                      {/* Card controls */}
                      <div className="flex items-center justify-between mb-2">

                        <button aria-label="Action"
                          type="button"
                          onClick={event => {
                            event.stopPropagation();

                            handleToggleStar(
                              item
                            );
                          }}
                          className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              item.starred
                                ? 'fill-[#FBBC04] text-[#FBBC04]'
                                : 'text-stone-300 dark:text-stone-600'
                            }`}
                          />
                        </button>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">

                          {!item.isFolder && (
                            <button aria-label="Action"
                              type="button"
                              onClick={event => {
                                event.stopPropagation();

                                void handleImportToNotes(
                                  item
                                );
                              }}
                              title="Import to Notes"
                              className="p-1 rounded-md text-stone-400 hover:text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button aria-label="Action"
                            type="button"
                            onClick={event => {
                              event.stopPropagation();

                              void handleDeleteItem(
                                item
                              );
                            }}
                            title="Delete"
                            className="p-1 rounded-md text-stone-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2
                              className="w-3.5 h-3.5"
                              style={{
                                color:
                                  undefined
                              }}
                              onMouseEnter={event => {
                                event.currentTarget.style.color =
                                  GOOGLE_COLORS.red;
                              }}
                              onMouseLeave={event => {
                                event.currentTarget.style.color =
                                  '';
                              }}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Preview */}
                      <div
                        onClick={() =>
                          item.isFolder
                            ? handleOpenFolder(
                                item
                              )
                            : void handlePreviewFile(
                                item
                              )
                        }
                        className="w-full h-24 rounded-xl bg-black/[0.025] dark:bg-white/[0.025] border border-black/[0.025] dark:border-white/[0.03] flex items-center justify-center overflow-hidden mb-2"
                      >
                        {item.thumbnailLink ? (
                          <img
                            src={
                              item.thumbnailLink
                            }
                            alt={
                              item.name
                            }
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                            referrerPolicy="no-referrer"
                          />
                        ) : item.isFolder ? (
                          <Folder
                            className="w-10 h-10"
                            style={{
                              color:
                                GOOGLE_COLORS.yellow,
                              fill:
                                `${GOOGLE_COLORS.yellow}20`
                            }}
                          />
                        ) : (
                          <div className="scale-125">
                            {
                              renderItemIcon(
                                item
                              )
                            }
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex flex-col min-w-0">

                        <span
                          className="text-xs font-bold text-stone-900 dark:text-white truncate group-hover:text-blue-500 transition-colors"
                          title={
                            item.name
                          }
                        >
                          {
                            item.name
                          }
                        </span>

                        <div className="flex items-center justify-between text-[10px] text-stone-400 mt-0.5 font-mono">

                          <span>
                            {item.isFolder
                              ? 'Folder'
                              : item.formattedSize ||
                                'Document'}
                          </span>

                          <span>
                            {new Date(
                              item.modifiedTime
                            ).toLocaleDateString(
                              [],
                              {
                                month:
                                  'short',
                                day:
                                  'numeric'
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

          {/* List */}
          {!isLoading &&
            filteredAndSortedItems.length >
              0 &&
            viewMode ===
              'list' && (
              <div className="
                bg-transparent
                backdrop-blur-[6px]
                rounded-2xl
                border border-black/5
                dark:border-white/10
                overflow-hidden
                shadow-none
              ">

                <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-black/5 dark:border-white/10 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">

                  <span className="col-span-6 md:col-span-5">
                    Name
                  </span>

                  <span className="col-span-2 hidden md:block">
                    Owner
                  </span>

                  <span className="col-span-3 md:col-span-3">
                    Last Modified
                  </span>

                  <span className="col-span-2 md:col-span-1 text-right">
                    Size
                  </span>

                  <span className="col-span-1 text-right">
                    Actions
                  </span>
                </div>

                <div className="divide-y divide-black/[0.035] dark:divide-white/[0.05]">

                  {filteredAndSortedItems.map(
                    item => (
                      <div
                        key={
                          item.id
                        }
                        onClick={() =>
                          item.isFolder
                            ? handleOpenFolder(
                                item
                              )
                            : void handlePreviewFile(
                                item
                              )
                        }
                        className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center hover:bg-black/[0.02] dark:hover:bg-white/[0.025] transition-colors cursor-pointer group text-xs"
                      >

                        <div className="col-span-6 md:col-span-5 flex items-center gap-2.5 min-w-0">

                          <button aria-label="Action"
                            type="button"
                            onClick={event => {
                              event.stopPropagation();

                              handleToggleStar(
                                item
                              );
                            }}
                            className="cursor-pointer"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                item.starred
                                  ? 'fill-[#FBBC04] text-[#FBBC04]'
                                  : 'text-stone-300 dark:text-stone-600'
                              }`}
                            />
                          </button>

                          {
                            renderItemIcon(
                              item
                            )
                          }

                          <span className="font-semibold text-stone-900 dark:text-stone-100 truncate group-hover:text-blue-500 transition-colors">
                            {
                              item.name
                            }
                          </span>
                        </div>

                        <div className="col-span-2 hidden md:block text-stone-500 dark:text-stone-400 truncate">
                          {
                            item.ownerName ||
                            'Me'
                          }
                        </div>

                        <div className="col-span-3 md:col-span-3 text-stone-500 dark:text-stone-400 truncate">
                          {new Date(
                            item.modifiedTime
                          ).toLocaleString(
                            [],
                            {
                              month:
                                'short',
                              day:
                                'numeric',
                              hour:
                                '2-digit',
                              minute:
                                '2-digit'
                            }
                          )}
                        </div>

                        <div className="col-span-2 md:col-span-1 text-right text-stone-400 font-mono text-[11px]">
                          {item.isFolder
                            ? '--'
                            : item.formattedSize ||
                              '48 KB'}
                        </div>

                        <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">

                          {!item.isFolder && (
                            <button aria-label="Action"
                              type="button"
                              onClick={event => {
                                event.stopPropagation();

                                void handleImportToNotes(
                                  item
                                );
                              }}
                              title="Import to Notes"
                              className="p-1 rounded-md hover:bg-amber-500/10 text-stone-500 hover:text-amber-700 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button aria-label="Action"
                            type="button"
                            onClick={event => {
                              event.stopPropagation();

                              void handleDeleteItem(
                                item
                              );
                            }}
                            title="Delete"
                            className="p-1 rounded-md hover:bg-red-500/10 text-stone-500 cursor-pointer"
                          >
                            <Trash2
                              className="w-3.5 h-3.5"
                              onMouseEnter={event => {
                                event.currentTarget.style.color =
                                  GOOGLE_COLORS.red;
                              }}
                              onMouseLeave={event => {
                                event.currentTarget.style.color =
                                  '';
                              }}
                            />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
        </div>

        {/* ====================================================================
            PREVIEW MODAL
        ==================================================================== */}

        {previewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-150">

            <div className="w-full max-w-2xl bg-white/95 dark:bg-[#242528]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 flex flex-col max-h-[85vh] overflow-hidden">

              <div className="px-5 py-3.5 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-3">

                <div className="flex items-center gap-2.5 min-w-0">

                  {
                    renderItemIcon(
                      previewItem
                    )
                  }

                  <div className="truncate">

                    <h3 className="text-sm font-bold text-stone-900 dark:text-white truncate">
                      {
                        previewItem.name
                      }
                    </h3>

                    <span className="text-[11px] text-stone-400">
                      {
                        previewItem.formattedSize ||
                        'Cloud File'
                      }{' '}
                      • Last modified{' '}
                      {new Date(
                        previewItem.modifiedTime
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">

                  <button aria-label="Action"
                    type="button"
                    onClick={() =>
                      void handleImportToNotes(
                        previewItem
                      )
                    }
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    style={{
                      color:
                        '#8A6500',
                      backgroundColor:
                        `${GOOGLE_COLORS.yellow}18`
                    }}
                  >
                    <FileText className="w-3.5 h-3.5" />

                    <span>
                      Import to Notes
                    </span>
                  </button>

                  <button aria-label="Action"
                    type="button"
                    onClick={() =>
                      setPreviewItem(
                        null
                      )
                    }
                    className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-5 overflow-y-auto min-h-0 bg-black/[0.018] dark:bg-white/[0.012]">

                {isLoadingPreview ? (
                  <div className="h-48 flex items-center justify-center text-stone-400 gap-2">

                    <RefreshCw
                      className="w-5 h-5 animate-spin"
                      style={{
                        color:
                          GOOGLE_COLORS.blue
                      }}
                    />

                    <span>
                      Fetching file preview...
                    </span>
                  </div>
                ) : previewItem.thumbnailLink ? (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <img
                      src={
                        previewItem.thumbnailLink
                      }
                      alt={
                        previewItem.name
                      }
                      className="max-h-96 rounded-xl object-contain shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap text-stone-800 dark:text-stone-200 font-sans text-sm leading-relaxed">
                    {
                      previewContent
                    }
                  </pre>
                )}
              </div>

              <div className="px-5 py-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-xs bg-white/65 dark:bg-[#242528]/65">

                <span className="text-stone-400 font-medium">
                  Mounted on{' '}
                  {
                    activeDrive.driveLetter
                  }{' '}
                  Drive (
                  {
                    activeDrive.name
                  }
                  )
                </span>

                <button aria-label="Action"
                  type="button"
                  onClick={() =>
                    setPreviewItem(
                      null
                    )
                  }
                  className="px-4 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-stone-700 dark:text-stone-300 font-medium hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            NEW FOLDER MODAL
        ==================================================================== */}

        {isNewFolderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-150">

            <form
              onSubmit={
                handleCreateFolder
              }
              className="w-full max-w-sm bg-white/95 dark:bg-[#242528]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-4"
            >

              <div className="flex items-center justify-between">

                <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                  Create New Folder in{' '}
                  {
                    activeDrive.driveLetter
                  }
                </h3>

                <button aria-label="Action"
                  type="button"
                  onClick={() =>
                    setIsNewFolderModalOpen(
                      false
                    )
                  }
                  className="text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                autoFocus
                placeholder="Folder Name (e.g., Projects 2026)"
                value={
                  newFolderName
                }
                onChange={event =>
                  setNewFolderName(
                    event.target
                      .value
                  )
                }
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-black/[0.025] dark:bg-white/[0.025] border border-black/5 dark:border-white/10 text-stone-900 dark:text-white focus:outline-none"
                style={{
                  boxShadow:
                    newFolderName
                      ? `0 0 0 1px ${GOOGLE_COLORS.blue}35`
                      : undefined
                }}
              />

              <div className="flex items-center justify-end gap-2">

                <button aria-label="Action"
                  type="button"
                  onClick={() =>
                    setIsNewFolderModalOpen(
                      false
                    )
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-stone-600 dark:text-stone-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>

                <button aria-label="Action"
                  type="submit"
                  disabled={
                    !newFolderName.trim()
                  }
                  className="px-4 py-1.5 rounded-xl text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  style={{
                    backgroundColor:
                      GOOGLE_COLORS.blue
                  }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ====================================================================
            CONNECTION MODAL
        ==================================================================== */}

        {isConnectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-150">

            <div className="w-full max-w-lg bg-white/95 dark:bg-[#242528]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">

              {/* Heading */}
              <div className="flex items-start justify-between">

                <div className="flex items-center gap-3">

                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background:
                        `linear-gradient(135deg, ${GOOGLE_COLORS.blue}0F, ${GOOGLE_COLORS.red}08, ${GOOGLE_COLORS.yellow}0C, ${GOOGLE_COLORS.green}0C)`,
                      border:
                        `1px solid ${GOOGLE_COLORS.blue}20`
                    }}
                  >
                    <HardDrive
                      className="w-5 h-5"
                      style={{
                        color:
                          GOOGLE_COLORS.blue
                      }}
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-stone-900 dark:text-white">
                      Connect{' '}
                      {
                        activeDrive.driveLetter
                      }{' '}
                      Network Drive
                    </h3>

                    <p className="text-xs text-stone-400">
                      Configure Google Drive account mounting for{' '}
                      {
                        activeDrive.name
                      }
                    </p>
                  </div>
                </div>

                <button aria-label="Action"
                  type="button"
                  onClick={() =>
                    setIsConnectModalOpen(
                      false
                    )
                  }
                  className="text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Information */}
              <div
                className="p-3.5 rounded-xl text-xs flex items-start gap-2.5"
                style={{
                  background:
                    `linear-gradient(135deg, ${GOOGLE_COLORS.blue}0A, ${GOOGLE_COLORS.green}0A)`,
                  border:
                    `1px solid ${GOOGLE_COLORS.blue}18`
                }}
              >
                <Sparkles
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{
                    color:
                      GOOGLE_COLORS.blue
                  }}
                />

                <div className="leading-relaxed text-stone-700 dark:text-stone-300">
                  <strong className="font-semibold text-stone-900 dark:text-white">
                    Yes, any user can connect!
                  </strong>{' '}
                  All Google Drive authentication happens directly in the visitor&apos;s browser using Google Identity Services.
                </div>
              </div>

              {/* Google Sign In */}
              <div className="flex flex-col gap-2 p-4 rounded-xl border border-black/5 dark:border-white/10 bg-black/[0.018] dark:bg-white/[0.018]">

                <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  Option A: Sign in with your Google Account
                </span>

                <p className="text-[11px] text-stone-500 leading-normal">
                  Opens the standard Google Sign-In consent dialog to securely mount your Drive in this tab.
                </p>

                <button aria-label="Action"
                  type="button"
                  onClick={() =>
                    void handleConnectWithGoogle()
                  }
                  disabled={
                    isAuthenticating
                  }
                  className="mt-1 w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                  style={{
                    background:
                      `linear-gradient(90deg, ${GOOGLE_COLORS.blue}, ${GOOGLE_COLORS.blueDark})`,
                    boxShadow:
                      `0 4px 14px ${GOOGLE_COLORS.blue}18`
                  }}
                >
                  {isAuthenticating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />

                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />

                      <path
                        fill="#FBBC04"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />

                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}

                  <span>
                    Sign In with Google
                  </span>
                </button>
              </div>

              {/* Token */}
              <div className="flex flex-col gap-2 p-4 rounded-xl border border-black/5 dark:border-white/10 bg-black/[0.018] dark:bg-white/[0.018]">

                <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  Option B: Custom Access Token or OAuth Client
                </span>

                <div className="flex flex-col gap-2 mt-1">

                  <input
                    type="text"
                    placeholder="Paste OAuth Access Token (ya29...)"
                    value={
                      manualToken
                    }
                    onChange={event =>
                      setManualToken(
                        event.target
                          .value
                      )
                    }
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#303134] border border-black/5 dark:border-white/10 text-stone-900 dark:text-white focus:outline-none"
                  />

                  <button aria-label="Action"
                    type="button"
                    onClick={
                      handleApplyManualToken
                    }
                    disabled={
                      !manualToken.trim()
                    }
                    className="py-1.5 px-3 rounded-xl text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                    style={{
                      backgroundColor:
                        GOOGLE_COLORS.blue
                    }}
                  >
                    Apply Token to{' '}
                    {
                      activeDrive.driveLetter
                    }
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between">

                <button aria-label="Action"
                  type="button"
                  onClick={
                    handleDisconnectDrive
                  }
                  className="text-xs font-medium cursor-pointer"
                  style={{
                    color:
                      GOOGLE_COLORS.red
                  }}
                >
                  Unmount this Drive
                </button>

                <button aria-label="Action"
                  type="button"
                  onClick={() =>
                    setIsConnectModalOpen(
                      false
                    )
                  }
                  className="px-4 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-stone-700 dark:text-stone-300 text-xs font-medium cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GoogleDriveAmbientBackground>
  );
};

export default GoogleDriveView;