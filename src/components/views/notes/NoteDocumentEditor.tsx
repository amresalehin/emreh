import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Copy,
  Download,
  Trash2,
  Maximize2,
  Minimize2,
  Music,
  Check,
  Calendar,
  Pin,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  Code,
  Table as TableIcon,
  Link2,
  Minus,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileUp,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Printer,
  Search,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Share2,
  ListTree,
  RemoveFormatting,
  Type,
  FileText,
  Mic,
  MicOff,
  CheckCircle2,
  Radio,
  ArrowUpRight
} from 'lucide-react';
import { BlockType, NoteBlock, NoteObject } from '../../../types/notes';
import { BlockItem } from './BlockItem';
import { SlashCommandMenu } from './SlashCommandMenu';
import { BacklinksInspector } from './BacklinksInspector';
import { exportBlocksToMarkdown } from '../../../utils/notesStorage';
import { processUploadedDocument } from '../../../utils/documentProcessor';
import { TimelineItem } from '../../../types';
import { NotesContextMenu, ContextMenuState } from './NotesContextMenu';
import { FindReplaceBar } from './FindReplaceBar';
import { WordCountModal } from './WordCountModal';
import { DocViewSettings } from './DocumentOutlinePanel';
import { useVoiceRecognition } from '../../../utils/speechRecognition';
import { processClipboardPaste, hasMarkdownSyntax, PasteResult } from '../../../utils/pasteHandler';

interface NoteDocumentEditorProps {
  note: NoteObject;
  allNotes: NoteObject[];
  timelineData?: TimelineItem[];
  currentDate?: Date;
  onUpdateNote: (updatedNote: NoteObject) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenNote: (noteId: string) => void;
  onJumpToDate?: (d: Date) => void;
  onNavigateToJournal?: (dateKeyOrDate: string | Date) => void;
  onToggleSidebar?: () => void;
  isRightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
  viewSettings?: DocViewSettings;
  onChangeViewSettings?: (settings: DocViewSettings) => void;
}

function formatDocumentHeaderDate(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })} at ${d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })}`;
}

export const NoteDocumentEditor: React.FC<NoteDocumentEditorProps> = ({
  note,
  allNotes,
  timelineData = [],
  currentDate = new Date(),
  onUpdateNote,
  onDeleteNote,
  onOpenNote,
  onJumpToDate,
  onNavigateToJournal,
  isRightPanelOpen = false,
  onToggleRightPanel,
  viewSettings = { fontFamily: 'sans', pageWidth: 'normal', zoom: 100 }
}) => {
  const [isZenMode, setIsZenMode] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [sharedToast, setSharedToast] = useState(false);
  const [pasteToast, setPasteToast] = useState<{ badge: string; description: string } | null>(null);
  const [focusedBlockIndex, setFocusedBlockIndex] = useState<number | null>(null);
  const [showBacklinks, setShowBacklinks] = useState(false);

  // Google Docs Features: Context Menu, Find/Replace, Word Count modal, Styles dropdown
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [isWordCountModalOpen, setIsWordCountModalOpen] = useState(false);
  const [isStylesMenuOpen, setIsStylesMenuOpen] = useState(false);

  // Note and onUpdateNote refs for stable memoized callbacks
  const noteRef = useRef(note);
  noteRef.current = note;
  const onUpdateNoteRef = useRef(onUpdateNote);
  onUpdateNoteRef.current = onUpdateNote;

  // Undo & Redo History Stack with debounced snapshotting (avoids JSON.stringify on every keystroke)
  const [history, setHistory] = useState<NoteBlock[][]>([note.blocks]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isUndoingRedoingRef = useRef(false);
  const lastHistorySnapshotRef = useRef<NoteBlock[]>(note.blocks);

  useEffect(() => {
    if (isUndoingRedoingRef.current) {
      isUndoingRedoingRef.current = false;
      return;
    }
    if (lastHistorySnapshotRef.current === note.blocks) {
      return;
    }

    const timer = setTimeout(() => {
      setHistory((prev) => {
        const currentSlice = prev.slice(0, historyIndex + 1);
        const lastHead = currentSlice[currentSlice.length - 1];
        if (
          lastHead &&
          lastHead.length === note.blocks.length &&
          lastHead.every((b, i) => b.id === note.blocks[i]?.id && b.content === note.blocks[i]?.content && b.type === note.blocks[i]?.type)
        ) {
          return prev;
        }
        lastHistorySnapshotRef.current = note.blocks;
        const next = [...currentSlice, note.blocks];
        if (next.length > 50) next.shift();
        setHistoryIndex(next.length - 1);
        return next;
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [note.blocks, historyIndex]);

  // Slash Command Menu state
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashAnchorRect, setSlashAnchorRect] = useState<DOMRect | null>(null);
  const [slashInsertIndex, setSlashInsertIndex] = useState<number>(0);

  // Drag & drop state for block reordering
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);

  // File upload drag-and-drop state
  const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);
  const [isProcessingDocs, setIsProcessingDocs] = useState(false);

  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const imageUploadInputRef = useRef<HTMLInputElement>(null);
  const editorCanvasRef = useRef<HTMLDivElement>(null);

  // Calculate live word count
  const wordCount = note.blocks.reduce((acc, b) => {
    return acc + (b.content ? b.content.trim().split(/\s+/).filter(Boolean).length : 0);
  }, 0);

  // Undo & Redo handlers
  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetSnapshot = history[historyIndex - 1];
      isUndoingRedoingRef.current = true;
      setHistoryIndex(historyIndex - 1);
      onUpdateNote({
        ...note,
        blocks: targetSnapshot,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetSnapshot = history[historyIndex + 1];
      isUndoingRedoingRef.current = true;
      setHistoryIndex(historyIndex + 1);
      onUpdateNote({
        ...note,
        blocks: targetSnapshot,
        updatedAt: new Date().toISOString()
      });
    }
  };

  // Keyboard Shortcuts (Google Docs Standard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if inside input unless shortcut
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (isCmdOrCtrl && e.key.toLowerCase() === 'y') ||
        (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFindReplaceOpen(true);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.print();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleApplyInlineFormat('bold');
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        handleApplyInlineFormat('italic');
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        handleApplyInlineFormat('underline');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, note]);

  // Context Menu Trigger
  const handleOpenContextMenu = (
    e: React.MouseEvent,
    targetType: 'block' | 'canvas',
    blockIndex?: number,
    block?: NoteBlock
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if user has selected text
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : '';

    setContextMenuState({
      x: e.clientX,
      y: e.clientY,
      targetType,
      blockIndex,
      block,
      selectedText
    });
  };

  // Drag and Drop Block Reordering
  const handleDragStart = (idx: number, e: React.DragEvent) => {
    setDraggedBlockIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx.toString());
  };

  const handleDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedBlockIndex === null || draggedBlockIndex === idx) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const pos = e.clientY < midpoint ? 'above' : 'below';

    setDropTargetIndex(idx);
    setDropPosition(pos);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (dropTargetIndex === idx) {
      setDropTargetIndex(null);
      setDropPosition(null);
    }
  };

  const handleDropOnBlock = (targetIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedBlockIndex === null || draggedBlockIndex === targetIdx) {
      setDraggedBlockIndex(null);
      setDropTargetIndex(null);
      setDropPosition(null);
      return;
    }

    const nextBlocks = [...note.blocks];
    const [movedBlock] = nextBlocks.splice(draggedBlockIndex, 1);

    let insertionIndex = targetIdx;
    if (draggedBlockIndex < targetIdx) {
      insertionIndex = dropPosition === 'above' ? targetIdx - 1 : targetIdx;
    } else {
      insertionIndex = dropPosition === 'above' ? targetIdx : targetIdx + 1;
    }

    insertionIndex = Math.max(0, Math.min(nextBlocks.length, insertionIndex));
    nextBlocks.splice(insertionIndex, 0, movedBlock);

    onUpdateNote({
      ...note,
      blocks: nextBlocks,
      updatedAt: new Date().toISOString()
    });

    setFocusedBlockIndex(insertionIndex);
    setDraggedBlockIndex(null);
    setDropTargetIndex(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedBlockIndex(null);
    setDropTargetIndex(null);
    setDropPosition(null);
  };

  // File Upload Handlers (Images & Documents)
  const handleUploadImageFiles = (files: FileList | File[], insertAtIdx?: number) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const targetIdx =
      insertAtIdx !== undefined
        ? insertAtIdx
        : focusedBlockIndex !== null && focusedBlockIndex >= 0 && focusedBlockIndex < note.blocks.length
        ? focusedBlockIndex
        : note.blocks.length - 1;

    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;

        const newImageBlock: NoteBlock = {
          id: `blk-img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'image',
          content: file.name.replace(/\.[^/.]+$/, ''),
          imageData: {
            url: dataUrl,
            name: file.name,
            size: file.size,
            caption: '',
            width: 'medium',
            align: 'center'
          }
        };

        const nextBlocks = [...note.blocks];
        nextBlocks.splice(targetIdx + 1, 0, newImageBlock);

        onUpdateNote({
          ...note,
          blocks: nextBlocks,
          updatedAt: new Date().toISOString()
        });
        setFocusedBlockIndex(targetIdx + 1);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUploadDocumentFiles = async (files: FileList | File[], insertAtIdx?: number) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setIsProcessingDocs(true);
    try {
      const newBlocks: NoteBlock[] = [];
      for (const file of fileList) {
        const attachment = await processUploadedDocument(file);
        newBlocks.push({
          id: `blk-doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'document',
          content: file.name,
          documentData: attachment
        });
      }

      const targetIdx =
        insertAtIdx !== undefined
          ? insertAtIdx
          : focusedBlockIndex !== null && focusedBlockIndex >= 0 && focusedBlockIndex < note.blocks.length
          ? focusedBlockIndex
          : note.blocks.length - 1;

      const nextBlocks = [...note.blocks];
      nextBlocks.splice(targetIdx + 1, 0, ...newBlocks);

      onUpdateNote({
        ...note,
        blocks: nextBlocks,
        updatedAt: new Date().toISOString()
      });
      setFocusedBlockIndex(targetIdx + newBlocks.length);
    } catch (err) {
      console.error('Document upload failed:', err);
      alert('Failed to process document.');
    } finally {
      setIsProcessingDocs(false);
      setIsGlobalDragOver(false);
    }
  };

  const handleDropAnyFiles = (files: FileList | File[], insertAtIdx?: number) => {
    const imageFiles: File[] = [];
    const docFiles: File[] = [];

    Array.from(files).forEach((f) => {
      if (f.type.startsWith('image/')) {
        imageFiles.push(f);
      } else {
        docFiles.push(f);
      }
    });

    if (imageFiles.length > 0) {
      handleUploadImageFiles(imageFiles, insertAtIdx);
    }
    if (docFiles.length > 0) {
      handleUploadDocumentFiles(docFiles, insertAtIdx);
    }
  };

  const handleBlockPaste = async (e: React.ClipboardEvent, targetIdx?: number, targetBlock?: NoteBlock) => {
    if (!e.clipboardData) return;

    // 1. Check for image files first
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      handleUploadImageFiles(imageFiles, targetIdx);
      setPasteToast({
        badge: 'Image',
        description: `Imported ${imageFiles.length} pasted image${imageFiles.length > 1 ? 's' : ''}`
      });
      setTimeout(() => setPasteToast(null), 3000);
      return;
    }

    // 2. Synchronous check: prevent browser's native textarea paste immediately
    // if the clipboard contains Markdown, multi-line text, spreadsheets, or rich HTML tags.
    // This prevents the raw string from being injected into the active textarea before our block splitter runs.
    const plainText = e.clipboardData.getData('text/plain') || '';
    const htmlText = e.clipboardData.getData('text/html') || '';
    const hasRich = /<(h[1-6]|table|ul|ol|blockquote|pre|img|hr|p\s+class)/i.test(htmlText);
    const hasMd = hasMarkdownSyntax(plainText);
    const isMultiLine = plainText.includes('\n');
    const isSpreadsheet = (plainText.includes('\t') || plainText.includes(',')) && plainText.split('\n').length >= 2;

    const shouldIntercept = hasMd || isMultiLine || isSpreadsheet || hasRich;

    if (shouldIntercept) {
      e.preventDefault();
      e.stopPropagation();
    }

    // 3. Process clipboard data for Markdown, Rich Text/HTML, Spreadsheet, Code, JSON, URLs, etc.
    const result = await processClipboardPaste(e.clipboardData);
    if (!result || result.blocks.length === 0) return;

    // Allow native browser paste only if it is a single-line plain text with no special markdown/HTML,
    // AND the user is directly typing inside a textarea/input
    const isTargetInput = (e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT';
    if (
      isTargetInput &&
      !shouldIntercept &&
      result.detectedType === 'plain' &&
      result.blocks.length === 1 &&
      !result.blocks[0].content.includes('\n')
    ) {
      return; // allow native textarea paste
    }

    e.preventDefault();
    e.stopPropagation();

    const currentNote = noteRef.current;
    const insertIdx = targetIdx !== undefined 
      ? targetIdx 
      : (focusedBlockIndex !== null ? focusedBlockIndex : currentNote.blocks.length - 1);
    const currBlock = currentNote.blocks[insertIdx];

    let nextBlocks: NoteBlock[];
    // If the target block is empty and we have new blocks, replace it
    if (currBlock && (!currBlock.content || !currBlock.content.trim()) && result.blocks.length > 0) {
      nextBlocks = [
        ...currentNote.blocks.slice(0, insertIdx),
        ...result.blocks,
        ...currentNote.blocks.slice(insertIdx + 1)
      ];
    } else {
      nextBlocks = [
        ...currentNote.blocks.slice(0, insertIdx + 1),
        ...result.blocks,
        ...currentNote.blocks.slice(insertIdx + 1)
      ];
    }

    onUpdateNoteRef.current({
      ...currentNote,
      blocks: nextBlocks,
      updatedAt: new Date().toISOString()
    });

    setFocusedBlockIndex(insertIdx + result.blocks.length);
    setPasteToast({ badge: result.badge, description: result.description });
    setTimeout(() => setPasteToast(null), 3500);
  };

  const handleEditorPaste = (e: React.ClipboardEvent) => {
    handleBlockPaste(e);
  };

  // Block Updates & Operations - memoized for 60fps virtualization
  const handleUpdateBlock = useCallback((idx: number, updatedBlock: NoteBlock) => {
    const currentNote = noteRef.current;
    const nextBlocks = [...currentNote.blocks];
    nextBlocks[idx] = updatedBlock;
    onUpdateNoteRef.current({
      ...currentNote,
      blocks: nextBlocks,
      updatedAt: new Date().toISOString()
    });
  }, []);

  const handleDeleteBlock = useCallback((idx: number) => {
    const currentNote = noteRef.current;
    if (currentNote.blocks.length <= 1) {
      onUpdateNoteRef.current({
        ...currentNote,
        blocks: [{ id: `blk-${Date.now()}`, type: 'paragraph', content: '' }],
        updatedAt: new Date().toISOString()
      });
      return;
    }
    const nextBlocks = currentNote.blocks.filter((_, i) => i !== idx);
    onUpdateNoteRef.current({
      ...currentNote,
      blocks: nextBlocks,
      updatedAt: new Date().toISOString()
    });
    setFocusedBlockIndex(Math.max(0, idx - 1));
  }, []);

  const handleDuplicateBlock = useCallback((idx: number) => {
    const currentNote = noteRef.current;
    const blockToDup = currentNote.blocks[idx];
    if (!blockToDup) return;
    const clone: NoteBlock = {
      ...blockToDup,
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    };
    const nextBlocks = [...currentNote.blocks];
    nextBlocks.splice(idx + 1, 0, clone);
    onUpdateNoteRef.current({
      ...currentNote,
      blocks: nextBlocks,
      updatedAt: new Date().toISOString()
    });
    setFocusedBlockIndex(idx + 1);
  }, []);

  const handleInsertBlockBelow = useCallback((idx: number, type: BlockType = 'paragraph') => {
    const currentNote = noteRef.current;
    const newBlock: NoteBlock = {
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      content: ''
    };
    const nextBlocks = [...currentNote.blocks];
    nextBlocks.splice(idx + 1, 0, newBlock);
    onUpdateNoteRef.current({
      ...currentNote,
      blocks: nextBlocks,
      updatedAt: new Date().toISOString()
    });
    setFocusedBlockIndex(idx + 1);
  }, []);

  const handleInsertBlockAbove = useCallback((idx: number, type: BlockType = 'paragraph') => {
    const currentNote = noteRef.current;
    const newBlock: NoteBlock = {
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      content: ''
    };
    const nextBlocks = [...currentNote.blocks];
    nextBlocks.splice(idx, 0, newBlock);
    onUpdateNoteRef.current({
      ...currentNote,
      blocks: nextBlocks,
      updatedAt: new Date().toISOString()
    });
    setFocusedBlockIndex(idx);
  }, []);

  const handleMoveBlock = useCallback((fromIdx: number, toIdx: number) => {
    const currentNote = noteRef.current;
    if (toIdx < 0 || toIdx >= currentNote.blocks.length) return;
    const nextBlocks = [...currentNote.blocks];
    const [moved] = nextBlocks.splice(fromIdx, 1);
    nextBlocks.splice(toIdx, 0, moved);
    onUpdateNoteRef.current({
      ...currentNote,
      blocks: nextBlocks,
      updatedAt: new Date().toISOString()
    });
    setFocusedBlockIndex(toIdx);
  }, []);

  const handleAlignBlock = (idx: number, align: 'left' | 'center' | 'right') => {
    const targetIdx = idx >= 0 && idx < note.blocks.length ? idx : focusedBlockIndex ?? 0;
    const currentBlock = note.blocks[targetIdx];
    if (!currentBlock) return;
    handleUpdateBlock(targetIdx, { ...currentBlock, align });
  };

  // Auto-Save Status State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'just-saved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date>(() => new Date());

  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      setSaveStatus('saved');
      setLastSavedTime(new Date());
    }, 400);
    return () => clearTimeout(timer);
  }, [note.title, note.blocks, note.updatedAt]);

  const handleForceSave = () => {
    setSaveStatus('just-saved');
    onUpdateNote({
      ...note,
      updatedAt: new Date().toISOString()
    });
    setLastSavedTime(new Date());
    setTimeout(() => {
      setSaveStatus('saved');
    }, 1400);
  };

  // Voice-to-Text Dictation State & Hook
  const [voiceInterimText, setVoiceInterimText] = useState('');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const handleVoiceResult = useCallback(
    (text: string, isFinal: boolean) => {
      if (!text) return;
      if (isFinal) {
        const current = noteRef.current;
        const targetIdx =
          focusedBlockIndex !== null && focusedBlockIndex >= 0 && focusedBlockIndex < current.blocks.length
            ? focusedBlockIndex
            : current.blocks.length - 1;

        const targetBlock = current.blocks[targetIdx];
        if (targetBlock) {
          const spacer = targetBlock.content && !targetBlock.content.endsWith(' ') ? ' ' : '';
          const updatedContent = `${targetBlock.content}${spacer}${text}`;
          handleUpdateBlock(targetIdx, { ...targetBlock, content: updatedContent });
        }
        setVoiceInterimText('');
      } else {
        setVoiceInterimText(text);
      }
    },
    [focusedBlockIndex, handleUpdateBlock]
  );

  const voiceRecognition = useVoiceRecognition({
    continuous: true,
    interimResults: true,
    onResult: handleVoiceResult,
    onError: (err) => {
      setVoiceNotice(err);
      setTimeout(() => setVoiceNotice(null), 4000);
    }
  });

  const toggleVoiceDictation = () => {
    if (voiceRecognition.isListening) {
      voiceRecognition.stopListening();
      setVoiceInterimText('');
    } else {
      setVoiceNotice(null);
      voiceRecognition.startListening();
    }
  };

  // Inline Formatting Helper (Bold, Italic, Underline, Strikethrough, Highlight, Code)
  const handleApplyInlineFormat = (
    format: 'bold' | 'italic' | 'underline' | 'strike' | 'highlight' | 'code' | 'clear'
  ) => {
    const targetIdx =
      focusedBlockIndex !== null && focusedBlockIndex >= 0 && focusedBlockIndex < note.blocks.length
        ? focusedBlockIndex
        : note.blocks.length - 1;

    const currentBlock = note.blocks[targetIdx];
    if (!currentBlock) return;

    if (format === 'clear') {
      const stripped = currentBlock.content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/<u>(.*?)<\/u>/g, '$1')
        .replace(/==(.*?)==/g, '$1')
        .replace(/`(.*?)`/g, '$1');
      handleUpdateBlock(targetIdx, { ...currentBlock, content: stripped });
      return;
    }

    let tagStart = '**';
    let tagEnd = '**';
    let placeholder = 'bold text';

    if (format === 'italic') {
      tagStart = '*';
      tagEnd = '*';
      placeholder = 'italic text';
    } else if (format === 'underline') {
      tagStart = '<u>';
      tagEnd = '</u>';
      placeholder = 'underlined text';
    } else if (format === 'strike') {
      tagStart = '~~';
      tagEnd = '~~';
      placeholder = 'strikethrough text';
    } else if (format === 'highlight') {
      tagStart = '==';
      tagEnd = '==';
      placeholder = 'highlighted text';
    } else if (format === 'code') {
      tagStart = '`';
      tagEnd = '`';
      placeholder = 'code';
    }

    const activeEl = document.activeElement as HTMLTextAreaElement | null;
    const isTargetActive = activeEl && activeEl.tagName === 'TEXTAREA';

    if (
      isTargetActive &&
      activeEl.selectionStart !== undefined &&
      activeEl.selectionEnd !== undefined &&
      activeEl.selectionStart !== activeEl.selectionEnd
    ) {
      const start = activeEl.selectionStart;
      const end = activeEl.selectionEnd;
      const content = activeEl.value;
      const selected = content.slice(start, end);
      const newContent = content.slice(0, start) + tagStart + selected + tagEnd + content.slice(end);
      handleUpdateBlock(targetIdx, { ...currentBlock, content: newContent });
    } else {
      const addition = currentBlock.content ? ` ${tagStart}${placeholder}${tagEnd}` : `${tagStart}${placeholder}${tagEnd}`;
      handleUpdateBlock(targetIdx, { ...currentBlock, content: currentBlock.content + addition });
    }
  };

  // Quick Block Type Switcher
  const handleQuickFormat = (type: BlockType) => {
    const targetIdx =
      focusedBlockIndex !== null && focusedBlockIndex >= 0 && focusedBlockIndex < note.blocks.length
        ? focusedBlockIndex
        : note.blocks.length - 1;

    const currentBlock = note.blocks[targetIdx];
    if (currentBlock) {
      if (currentBlock.type === type) {
        handleUpdateBlock(targetIdx, { ...currentBlock, type: 'paragraph', checked: false });
      } else {
        handleUpdateBlock(targetIdx, { ...currentBlock, type, checked: false });
      }
    } else {
      handleInsertBlockBelow(note.blocks.length - 1, type);
    }
    setIsStylesMenuOpen(false);
  };

  // Insert Table Block
  const handleInsertTable = (insertAtIdx?: number) => {
    const targetIdx =
      insertAtIdx !== undefined
        ? insertAtIdx
        : focusedBlockIndex !== null && focusedBlockIndex >= 0 && focusedBlockIndex < note.blocks.length
        ? focusedBlockIndex
        : note.blocks.length - 1;

    const newTableBlock: NoteBlock = {
      id: `blk-tbl-${Date.now()}`,
      type: 'table',
      content: 'Table',
      tableData: [
        ['Item', 'Description', 'Status'],
        ['Task 1', 'Sample row text', 'In Progress'],
        ['Task 2', 'Another detailed item', 'Complete']
      ]
    };
    const nextBlocks = [...note.blocks];
    nextBlocks.splice(targetIdx + 1, 0, newTableBlock);
    onUpdateNote({
      ...note,
      blocks: nextBlocks,
      updatedAt: new Date().toISOString()
    });
    setFocusedBlockIndex(targetIdx + 1);
  };

  // Insert Wikilink [[...]] helper
  const handleInsertWikilink = () => {
    const targetIdx =
      focusedBlockIndex !== null && focusedBlockIndex >= 0 && focusedBlockIndex < note.blocks.length
        ? focusedBlockIndex
        : note.blocks.length - 1;

    const currentBlock = note.blocks[targetIdx];
    if (currentBlock) {
      const addition = currentBlock.content ? ' [[Page]]' : '[[Page]]';
      handleUpdateBlock(targetIdx, { ...currentBlock, content: currentBlock.content + addition });
    } else {
      handleInsertBlockBelow(note.blocks.length - 1, 'paragraph');
    }
  };

  // Insert Timeline Highlights
  const handleInsertTimelineHighlights = () => {
    const todayStr = note.dateKey || currentDate.toISOString().slice(0, 10);
    const itemsForDay = timelineData.filter((item) => item.ts && item.ts.startsWith(todayStr));

    if (itemsForDay.length === 0) {
      alert(`No timeline history records logged for date ${todayStr}. Import or stream some media first!`);
      return;
    }

    const newBlocks: NoteBlock[] = [
      {
        id: `blk-tl-hdr-${Date.now()}`,
        type: 'h2',
        content: `🎧 Timeline Highlights for ${todayStr}`
      }
    ];

    itemsForDay.slice(0, 5).forEach((item, idx) => {
      newBlocks.push({
        id: `blk-tl-${Date.now()}-${idx}`,
        type: 'timeline_embed',
        content: item.title,
        timelineRef: {
          type:
            item.type === 'spotify'
              ? 'spotify'
              : item.type === 'youtube'
              ? 'youtube'
              : item.type === 'maps'
              ? 'maps'
              : 'browser',
          id: item.id,
          title: item.title,
          subtitle:
            item.subtitle ||
            (item.dateObj
              ? item.dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : undefined)
        }
      });
    });

    onUpdateNote({
      ...note,
      blocks: [...note.blocks, ...newBlocks],
      updatedAt: new Date().toISOString()
    });
  };

  // Find and Replace Handlers
  const handleReplaceBlock = (blockIndex: number, newContent: string) => {
    const target = note.blocks[blockIndex];
    if (!target) return;
    handleUpdateBlock(blockIndex, { ...target, content: newContent });
  };

  const handleReplaceAll = (searchTerm: string, replaceTerm: string, matchCase: boolean) => {
    const regex = new RegExp(
      searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      matchCase ? 'g' : 'gi'
    );
    const updated = note.blocks.map((b) => ({
      ...b,
      content: b.content ? b.content.replace(regex, replaceTerm) : b.content
    }));
    onUpdateNote({
      ...note,
      blocks: updated,
      updatedAt: new Date().toISOString()
    });
  };

  // Markdown Export & Download & Share
  const handleCopyMarkdown = () => {
    const md = exportBlocksToMarkdown(note);
    navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = exportBlocksToMarkdown(note);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(note.title || 'Untitled').replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShareDoc = () => {
    const content = `# ${note.title}\n\n${exportBlocksToMarkdown(note)}`;
    navigator.clipboard.writeText(content);
    setSharedToast(true);
    setTimeout(() => setSharedToast(false), 2200);
  };

  // Context Menu Actions Handlers
  const handleCutFromContext = (blockIdx: number) => {
    const blk = note.blocks[blockIdx];
    if (blk) {
      navigator.clipboard.writeText(blk.content);
      handleDeleteBlock(blockIdx);
    }
  };

  const handleCopyFromContext = (blockIdx: number) => {
    const blk = note.blocks[blockIdx];
    if (blk) {
      navigator.clipboard.writeText(blk.content);
    }
  };

  const handlePasteFromContext = async (insertIdx?: number) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const target = insertIdx !== undefined ? insertIdx : (focusedBlockIndex ?? note.blocks.length - 1);
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        const res = await processClipboardPaste(dt);
        const currentNote = noteRef.current;
        if (res && res.blocks.length > 0) {
          const nextBlocks = [
            ...currentNote.blocks.slice(0, target + 1),
            ...res.blocks,
            ...currentNote.blocks.slice(target + 1)
          ];
          onUpdateNoteRef.current({
            ...currentNote,
            blocks: nextBlocks,
            updatedAt: new Date().toISOString()
          });
          setFocusedBlockIndex(target + res.blocks.length);
          setPasteToast({ badge: res.badge, description: res.description });
          setTimeout(() => setPasteToast(null), 3000);
        } else {
          const newBlock: NoteBlock = {
            id: `blk-${Date.now()}`,
            type: 'paragraph',
            content: text
          };
          onUpdateNoteRef.current({
            ...currentNote,
            blocks: [
              ...currentNote.blocks.slice(0, target + 1),
              newBlock,
              ...currentNote.blocks.slice(target + 1)
            ],
            updatedAt: new Date().toISOString()
          });
          setFocusedBlockIndex(target + 1);
        }
      }
    } catch {
      setPasteToast({ badge: 'Notice', description: 'Press Ctrl+V (or ⌘V) to paste directly into the document' });
      setTimeout(() => setPasteToast(null), 3500);
    }
  };

  const isPinned = note.isPinned || note.favorite;
  const headerDateFormatted = formatDocumentHeaderDate(note.updatedAt || note.createdAt);

  // Active block format styling label
  const activeBlock =
    focusedBlockIndex !== null && note.blocks[focusedBlockIndex]
      ? note.blocks[focusedBlockIndex]
      : note.blocks[0];

  const getStyleLabel = (type?: BlockType) => {
    switch (type) {
      case 'h1':
        return 'Title (H1)';
      case 'h2':
        return 'Heading 1 (H2)';
      case 'h3':
        return 'Heading 2 (H3)';
      case 'todo':
        return 'Checklist';
      case 'bullet':
        return 'Bulleted list';
      case 'numbered':
        return 'Numbered list';
      case 'quote':
        return 'Quote';
      case 'code':
        return 'Code block';
      case 'table':
        return 'Table';
      default:
        return 'Normal text';
    }
  };

  // Dynamic document container layout
  const fontFamilyClass =
    viewSettings.fontFamily === 'serif'
      ? 'font-serif'
      : viewSettings.fontFamily === 'mono'
      ? 'font-mono'
      : 'font-sans';

  const pageWidthClass =
    viewSettings.pageWidth === 'wide'
      ? 'max-w-5xl'
      : viewSettings.pageWidth === 'full'
      ? 'max-w-full px-6'
      : 'max-w-3xl';

  return (
    <div
      className={`flex-1 flex flex-col h-full bg-[#fdfcf9] dark:bg-[#151517] overflow-hidden min-h-0 relative select-text ${fontFamilyClass} ${
        isZenMode ? 'fixed inset-0 z-50 bg-[#fdfcf9] dark:bg-[#151517]' : ''
      }`}
    >
      {/* Print CSS Injection: hides all surrounding toolbars during window.print() */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-note-canvas, #printable-note-canvas * { visibility: visible !important; }
          #printable-note-canvas {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 24px !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Google Docs Primary Top Bar */}
      <div className="h-12 px-4 border-b border-stone-200/70 dark:border-stone-800/80 flex items-center justify-between gap-3 bg-[#fdfcf9]/90 dark:bg-[#151517]/90 backdrop-blur-md shrink-0">
        {/* Left: Document Metadata & Clickable Word Count Dialog */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setIsWordCountModalOpen(true)}
            title="Word count & detailed statistics"
            className="px-2 py-1 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
          </button>

          {(note.dateKey || note.type === 'diary' || /^\d{4}-\d{2}-\d{2}$/.test(note.title)) && (
            <button
              type="button"
              onClick={() => {
                const dKey = note.dateKey || (note.title.match(/\d{4}-\d{2}-\d{2}/)?.[0]) || '';
                if (dKey && onNavigateToJournal) {
                  onNavigateToJournal(dKey);
                }
              }}
              title="Open this day in Journal view"
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 flex items-center gap-1.5 transition-all cursor-pointer group"
            >
              <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
              <span>Journal • {note.dateKey || (note.title.match(/\d{4}-\d{2}-\d{2}/)?.[0])}</span>
              <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        {/* Center: Auto-Save Status Indicator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleForceSave}
            title="Click to force save note immediately"
            className="group flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100/80 dark:bg-stone-800/80 hover:bg-stone-200/80 dark:hover:bg-stone-700/80 transition-all text-[11px] font-medium text-stone-600 dark:text-stone-300 cursor-pointer select-none border border-stone-200/60 dark:border-stone-700/60"
          >
            {saveStatus === 'saving' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span className="text-amber-600 dark:text-amber-400 font-semibold">Saving changes...</span>
              </>
            ) : saveStatus === 'just-saved' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Saved to storage!</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-stone-500 dark:text-stone-400">
                  Saved {lastSavedTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </>
            )}
          </button>

          {/* Voice-to-Text Quick Dictation Toggle */}
          <button
            type="button"
            onClick={toggleVoiceDictation}
            title={voiceRecognition.isListening ? 'Stop Voice Dictation' : 'Start Voice-to-Text Dictation'}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
              voiceRecognition.isListening
                ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/25 animate-pulse'
                : 'bg-stone-100/80 dark:bg-stone-800/80 hover:bg-stone-200/80 dark:hover:bg-stone-700/80 text-stone-600 dark:text-stone-300 border-stone-200/60 dark:border-stone-700/60'
            }`}
          >
            {voiceRecognition.isListening ? (
              <>
                <Mic className="w-3.5 h-3.5 animate-bounce" />
                <span className="font-semibold">Dictating...</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-stone-500" />
                <span>Voice Dictate</span>
              </>
            )}
          </button>
        </div>

        {/* Right Action Icons (Functional Buttons) */}
        <div className="flex items-center gap-1">
          {/* Share Document with Toast */}
          <div className="relative">
            <button
              type="button"
              onClick={handleShareDoc}
              title="Share / Copy Document Content"
              className="p-1.5 rounded-xl hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {sharedToast && (
              <div className="absolute right-0 top-10 z-50 bg-stone-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap animate-in fade-in">
                Copied document to clipboard!
              </div>
            )}
          </div>

          {/* Pin note toggle */}
          <button
            type="button"
            onClick={() =>
              onUpdateNote({
                ...note,
                isPinned: !isPinned,
                favorite: !isPinned,
                updatedAt: new Date().toISOString()
              })
            }
            title={isPinned ? 'Unpin note' : 'Pin note'}
            className={`p-1.5 rounded-xl cursor-pointer transition-colors ${
              isPinned
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`}
          >
            <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-500/40' : ''}`} />
          </button>

          {/* Toggle Outline & Document Tools Side Panel */}
          {onToggleRightPanel && (
            <button
              type="button"
              onClick={onToggleRightPanel}
              title={isRightPanelOpen ? 'Hide Outline & Document Tools' : 'Show Outline & Document Tools'}
              className={`p-1.5 rounded-xl cursor-pointer transition-colors ${
                isRightPanelOpen
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
              }`}
            >
              <ListTree className="w-4 h-4" />
            </button>
          )}

          {/* Embed Timeline Highlights */}
          {timelineData && timelineData.length > 0 && (
            <button
              type="button"
              onClick={handleInsertTimelineHighlights}
              title="Embed today's Spotify / YouTube timeline highlights"
              className="p-1.5 rounded-xl hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer transition-colors"
            >
              <Music className="w-4 h-4" />
            </button>
          )}

          {/* Copy Markdown */}
          <button
            type="button"
            onClick={handleCopyMarkdown}
            title="Copy as Markdown"
            className="p-1.5 rounded-xl hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer transition-colors"
          >
            {copiedMd ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Download Markdown */}
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            title="Download .md file"
            className="p-1.5 rounded-xl hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Zen Focus Mode */}
          <button
            type="button"
            onClick={() => setIsZenMode(!isZenMode)}
            title={isZenMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
            className="p-1.5 rounded-xl hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer transition-colors"
          >
            {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Delete Note */}
          <button
            type="button"
            onClick={() => {
              onDeleteNote(note.id);
            }}
            title="Delete note"
            className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-stone-400 hover:text-rose-600 cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Google Docs Formatting Toolbar Ribbon */}
      <div className="px-3 py-1.5 border-b border-stone-200/50 dark:border-stone-800/50 bg-[#faf8f5]/80 dark:bg-[#18181a]/80 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none shrink-0 text-stone-600 dark:text-stone-400">
        <div className="flex items-center gap-1 shrink-0">
          {/* Undo & Redo (Google Docs standard) */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo (⌘Z)"
            className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (⌘Y)"
            className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          {/* Print Button (window.print) */}
          <button
            type="button"
            onClick={() => window.print()}
            title="Print Document (⌘P)"
            className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {/* Find & Replace Button */}
          <button
            type="button"
            onClick={() => setIsFindReplaceOpen(!isFindReplaceOpen)}
            title="Find & Replace (⌘F)"
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              isFindReplaceOpen
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold'
                : 'hover:bg-stone-200/60 dark:hover:bg-white/10'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Voice-to-Text Dictation Ribbon Button */}
          <button
            type="button"
            onClick={toggleVoiceDictation}
            title={voiceRecognition.isListening ? 'Stop Voice Dictation' : 'Start Voice-to-Text Dictation'}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              voiceRecognition.isListening
                ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30 animate-pulse'
                : 'hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-3.5 bg-stone-300 dark:bg-stone-700 mx-0.5" />

          {/* Google Docs Styles Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsStylesMenuOpen(!isStylesMenuOpen)}
              title="Styles (Heading / Paragraph)"
              className="px-2.5 py-1 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors text-stone-800 dark:text-stone-200 min-w-28 justify-between"
            >
              <span className="truncate">{getStyleLabel(activeBlock?.type)}</span>
              <ChevronDown className="w-3 h-3 text-stone-400 shrink-0" />
            </button>

            {isStylesMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-44 rounded-xl bg-white/95 dark:bg-[#1e1e20]/95 backdrop-blur-xl border border-stone-200/80 dark:border-stone-800 shadow-2xl py-1 text-xs text-stone-800 dark:text-stone-200 z-50">
                <button
                  type="button"
                  onClick={() => handleQuickFormat('paragraph')}
                  className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer"
                >
                  Normal text
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFormat('h1')}
                  className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer font-bold text-sm"
                >
                  Title (H1)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFormat('h2')}
                  className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer font-semibold"
                >
                  Heading 1 (H2)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFormat('h3')}
                  className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer font-medium"
                >
                  Heading 2 (H3)
                </button>
                <div className="h-px bg-stone-200/80 dark:bg-stone-800 my-1" />
                <button
                  type="button"
                  onClick={() => handleQuickFormat('todo')}
                  className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-amber-500" /> Checklist
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFormat('bullet')}
                  className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
                >
                  <List className="w-3.5 h-3.5" /> Bullet list
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFormat('numbered')}
                  className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
                >
                  <ListOrdered className="w-3.5 h-3.5" /> Numbered list
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFormat('quote')}
                  className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Quote className="w-3.5 h-3.5" /> Quote
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFormat('code')}
                  className="w-full text-left px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Code className="w-3.5 h-3.5" /> Code block
                </button>
              </div>
            )}
          </div>

          <span className="w-px h-3.5 bg-stone-300 dark:bg-stone-700 mx-0.5" />

          {/* Inline Text Formatting Buttons (Bold, Italic, Underline, Strikethrough, Highlight, Code, Clear) */}
          <button
            type="button"
            onClick={() => handleApplyInlineFormat('bold')}
            title="Bold (⌘B)"
            className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 font-bold text-xs cursor-pointer transition-colors"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleApplyInlineFormat('italic')}
            title="Italic (⌘I)"
            className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 italic text-xs cursor-pointer transition-colors"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleApplyInlineFormat('underline')}
            title="Underline (⌘U)"
            className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 underline text-xs cursor-pointer transition-colors"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleApplyInlineFormat('strike')}
            title="Strikethrough"
            className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 line-through text-xs cursor-pointer transition-colors"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleApplyInlineFormat('highlight')}
            title="Highlight Text"
            className="p-1.5 rounded-lg hover:bg-amber-500/15 text-amber-600 dark:text-amber-400 cursor-pointer transition-colors"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleApplyInlineFormat('code')}
            title="Inline Code Snippet"
            className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 font-mono text-xs cursor-pointer transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleApplyInlineFormat('clear')}
            title="Clear Formatting"
            className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 cursor-pointer transition-colors"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-3.5 bg-stone-300 dark:bg-stone-700 mx-0.5" />

          {/* Text Alignment (Left, Center, Right) */}
          <button
            type="button"
            onClick={() => handleAlignBlock(focusedBlockIndex ?? 0, 'left')}
            title="Align Left"
            className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleAlignBlock(focusedBlockIndex ?? 0, 'center')}
            title="Align Center"
            className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleAlignBlock(focusedBlockIndex ?? 0, 'right')}
            title="Align Right"
            className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-3.5 bg-stone-300 dark:bg-stone-700 mx-0.5" />

          {/* Quick Block Inserts */}
          <button
            type="button"
            onClick={() => handleInsertTable()}
            title="Insert Table"
            className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleQuickFormat('divider')}
            title="Insert Page Divider"
            className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleInsertWikilink}
            title="Insert [[Link]]"
            className="px-2 py-1 rounded-lg hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors font-semibold text-xs"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">[[ Link ]]</span>
          </button>

          <button
            type="button"
            onClick={() => imageUploadInputRef.current?.click()}
            title="Insert Image"
            className="px-2 py-1 rounded-lg hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors font-medium text-xs text-stone-600 dark:text-stone-300"
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline text-[11px]">Image</span>
          </button>

          <button
            type="button"
            onClick={() => fileUploadInputRef.current?.click()}
            title="Attach Document (PDF, DOCX Omni Viewer)"
            className="px-2 py-1 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors font-medium text-xs text-stone-600 dark:text-stone-300"
          >
            <FileUp className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline text-[11px]">PDF / DOCX</span>
          </button>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={imageUploadInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleUploadImageFiles(e.target.files)}
        />

        <input
          ref={fileUploadInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt,.md"
          className="hidden"
          onChange={(e) => handleUploadDocumentFiles(e.target.files)}
        />

        <div className="flex items-center gap-2 text-[11px] text-stone-400 dark:text-stone-500 shrink-0">
          <span
            id="virtualization-status-badge"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            title="Content-visibility virtualization active for peak 60 FPS performance"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            60 FPS Virtualized ({note.blocks.length} {note.blocks.length === 1 ? 'block' : 'blocks'})
          </span>
          <span className="hidden xl:inline">
            Right-click for options · Type <span className="font-mono bg-stone-200/60 dark:bg-stone-800 px-1 py-0.2 rounded text-[10px]">/</span> for commands
          </span>
        </div>
      </div>

      {/* Floating Find & Replace Bar */}
      <FindReplaceBar
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
        blocks={note.blocks}
        onReplaceBlock={handleReplaceBlock}
        onReplaceAll={handleReplaceAll}
        onHighlightMatch={(bIdx) => {
          setFocusedBlockIndex(bIdx);
          const targetEl = document.getElementById(`doc-block-${note.blocks[bIdx]?.id}`);
          if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />

      {/* Word Count Modal */}
      <WordCountModal
        isOpen={isWordCountModalOpen}
        onClose={() => setIsWordCountModalOpen(false)}
        blocks={note.blocks}
        title={note.title}
      />

      {/* Main Document Body Scrollable Canvas */}
      <div
        ref={editorCanvasRef}
        id="printable-note-canvas"
        onContextMenu={(e) => handleOpenContextMenu(e, 'canvas')}
        onPaste={handleEditorPaste}
        onDragOver={(e) => {
          e.preventDefault();
          if (e.dataTransfer.types.includes('Files')) {
            setIsGlobalDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsGlobalDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsGlobalDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleDropAnyFiles(e.dataTransfer.files);
          }
        }}
        style={{ zoom: `${(viewSettings.zoom || 100) / 100}` }}
        className="flex-1 overflow-y-auto min-h-0 relative"
      >
        {/* Drag & Drop Visual Dropzone Overlay */}
        {isGlobalDragOver && (
          <div className="absolute inset-4 z-40 bg-amber-500/10 dark:bg-amber-500/15 backdrop-blur-xs border-2 border-dashed border-amber-500 rounded-2xl flex flex-col items-center justify-center p-6 pointer-events-none animate-in fade-in duration-150">
            <div className="p-3.5 rounded-full bg-amber-500 text-white mb-2.5 shadow-md">
              <FileUp className="w-7 h-7" />
            </div>
            <div className="text-sm font-bold text-amber-950 dark:text-amber-100">
              Drop images, PDFs, or Word documents to embed
            </div>
            <div className="text-xs text-amber-800 dark:text-amber-300 mt-1">
              Supports photos (PNG, JPG, SVG, WebP) & rich docs (.pdf, .docx) with interactive reader
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessingDocs && (
          <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-3">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Processing document for Omni Viewer...</span>
          </div>
        )}

        {/* Note Page Container */}
        <div className={`${pageWidthClass} mx-auto px-6 sm:px-12 py-8 min-h-full flex flex-col justify-between`}>
          <div>
            {/* Header Date Stamp */}
            <div className="text-center text-xs font-medium text-stone-400 dark:text-stone-500 mb-5 select-none">
              {headerDateFormatted}
            </div>

            {/* Note Title Field */}
            <div className="mb-5">
              <input
                type="text"
                value={note.title}
                onChange={(e) => onUpdateNote({ ...note, title: e.target.value })}
                placeholder="Title"
                className="w-full bg-transparent outline-none font-bold text-3xl sm:text-4xl text-stone-900 dark:text-stone-100 tracking-tight leading-tight placeholder:text-stone-300 dark:placeholder:text-stone-700"
              />
            </div>

            {/* Document Blocks List with Drag-and-Drop Reordering, Virtualization & Context Menu */}
            <div className="space-y-1.5 pb-10" id="document-blocks-virtual-container">
              {note.blocks.map((block, idx) => (
                <div
                  key={block.id}
                  id={`block-wrapper-${block.id}`}
                  style={{
                    contentVisibility: 'auto',
                    containIntrinsicSize: 'auto 48px'
                  }}
                  onClick={() => setFocusedBlockIndex(idx)}
                >
                  <BlockItem
                    block={block}
                    index={idx}
                    isFocused={focusedBlockIndex === idx}
                    isDragging={draggedBlockIndex === idx}
                    isDragTarget={dropTargetIndex === idx}
                    dropPosition={dropTargetIndex === idx ? dropPosition : null}
                    onDragStart={(e) => handleDragStart(idx, e)}
                    onDragOver={(e) => handleDragOver(idx, e)}
                    onDragLeave={(e) => handleDragLeave(idx, e)}
                    onDrop={(e) => handleDropOnBlock(idx, e)}
                    onDragEnd={handleDragEnd}
                    onUpdate={(updated) => handleUpdateBlock(idx, updated)}
                    onDelete={() => handleDeleteBlock(idx)}
                    onDuplicate={() => handleDuplicateBlock(idx)}
                    onInsertBelow={(type) => handleInsertBlockBelow(idx, type)}
                    onMoveUp={idx > 0 ? () => handleMoveBlock(idx, idx - 1) : undefined}
                    onMoveDown={
                      idx < note.blocks.length - 1
                        ? () => handleMoveBlock(idx, idx + 1)
                        : undefined
                    }
                    onOpenSlashMenu={(rect) => {
                      setSlashInsertIndex(idx);
                      setSlashAnchorRect(rect);
                      setSlashMenuOpen(true);
                    }}
                    onLinkClick={onOpenNote}
                    onContextMenu={(e, i, blk) => handleOpenContextMenu(e, 'block', i, blk)}
                    onPaste={(e, i, blk) => handleBlockPaste(e, i, blk)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Linked References Section */}
          <div className="mt-12 pt-6 border-t border-stone-200/60 dark:border-stone-800/80">
            <button
              type="button"
              onClick={() => setShowBacklinks(!showBacklinks)}
              className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 mb-3 cursor-pointer select-none"
            >
              <Link2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Linked References & Mentions</span>
              {showBacklinks ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showBacklinks && (
              <BacklinksInspector
                currentNote={note}
                allNotes={allNotes}
                onOpenNote={onOpenNote}
              />
            )}
          </div>
        </div>
      </div>

      {/* Right Click Google Docs Context Menu */}
      <NotesContextMenu
        menuState={contextMenuState}
        onClose={() => setContextMenuState(null)}
        onCut={handleCutFromContext}
        onCopy={handleCopyFromContext}
        onPaste={handlePasteFromContext}
        onDuplicate={handleDuplicateBlock}
        onTransformType={(idx, type) => handleQuickFormat(type)}
        onAlign={handleAlignBlock}
        onInsertAbove={handleInsertBlockAbove}
        onInsertBelow={(idx, type) => {
          if (type === 'table') handleInsertTable(idx);
          else handleInsertBlockBelow(idx, type);
        }}
        onMoveUp={(idx) => handleMoveBlock(idx, idx - 1)}
        onMoveDown={(idx) => handleMoveBlock(idx, idx + 1)}
        onDelete={handleDeleteBlock}
        onOpenFindReplace={() => setIsFindReplaceOpen(true)}
        onPrint={() => window.print()}
      />

      {/* Slash Command Floating Menu */}
      <SlashCommandMenu
        isOpen={slashMenuOpen}
        anchorRect={slashAnchorRect}
        onSelect={(type) => {
          const targetBlock = note.blocks[slashInsertIndex];
          if (targetBlock) {
            const cleanContent = targetBlock.content.replace(/\s*\/$/, '');
            if (type === 'document') {
              handleUpdateBlock(slashInsertIndex, {
                ...targetBlock,
                type: 'document',
                content: cleanContent
              });
              setTimeout(() => fileUploadInputRef.current?.click(), 100);
            } else if (type === 'image') {
              handleUpdateBlock(slashInsertIndex, {
                ...targetBlock,
                type: 'image',
                content: cleanContent
              });
              setTimeout(() => imageUploadInputRef.current?.click(), 100);
            } else if (type === 'table') {
              handleInsertTable(slashInsertIndex);
            } else {
              handleUpdateBlock(slashInsertIndex, {
                ...targetBlock,
                type,
                content: cleanContent
              });
            }
          }
          setSlashMenuOpen(false);
        }}
        onClose={() => setSlashMenuOpen(false)}
      />

      {/* Floating Voice Dictation HUD */}
      {voiceRecognition.isListening && (
        <div className="fixed bottom-6 right-8 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-stone-900/95 dark:bg-[#1a1a1e]/95 text-white backdrop-blur-xl border border-stone-700/80 rounded-2xl shadow-2xl p-4 max-w-sm flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                </span>
                <span className="text-xs font-bold tracking-wide">Live Voice Dictation</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-1 bg-rose-500 rounded-full animate-pulse" />
                <span className="h-5 w-1 bg-rose-400 rounded-full animate-pulse delay-75" />
                <span className="h-2.5 w-1 bg-rose-500 rounded-full animate-pulse delay-150" />
                <span className="h-4 w-1 bg-rose-400 rounded-full animate-pulse delay-200" />
              </div>
            </div>

            <p className="text-[11px] text-stone-300 leading-relaxed italic bg-black/30 p-2 rounded-xl min-h-9 border border-white/5">
              {voiceInterimText ? `"${voiceInterimText}"` : 'Listening for your voice... speak now to transcribe into the note.'}
            </p>

            <div className="flex items-center justify-between pt-1 text-[11px]">
              <span className="text-stone-400">Inserting at cursor block</span>
              <button
                type="button"
                onClick={toggleVoiceDictation}
                className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-xs cursor-pointer"
              >
                Stop Dictation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Warning Notice Toast */}
      {voiceNotice && (
        <div className="fixed bottom-6 right-8 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 rounded-xl text-xs font-medium shadow-xl backdrop-blur-md flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{voiceNotice}</span>
          </div>
        </div>
      )}

      {/* Smart Paste Detection Floating Toast */}
      {pasteToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-none">
          <div className="bg-stone-900/95 dark:bg-stone-800/95 text-white px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md border border-stone-700/80 flex items-center gap-2.5 text-xs">
            <span className="px-2 py-0.5 rounded-md bg-amber-500/25 text-amber-300 font-semibold text-[10px] tracking-wide uppercase">
              {pasteToast.badge}
            </span>
            <span className="font-medium text-stone-200">{pasteToast.description}</span>
          </div>
        </div>
      )}
    </div>
  );
};
