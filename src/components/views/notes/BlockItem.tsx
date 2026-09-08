import React, { useState, useEffect, useRef } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  Check,
  List,
  ListOrdered,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Quote,
  Code,
  Table as TableIcon,
  Divide,
  Sparkles,
  Music,
  Video,
  MapPin,
  Globe,
  Trash2,
  Copy,
  Plus,
  GripVertical,
  Layers,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Calendar
} from 'lucide-react';
import { BlockType, CalloutVariant, NoteBlock } from '../../../types/notes';
import { DocumentBlock } from './DocumentBlock';
import { ImageBlock } from './ImageBlock';

interface BlockItemProps {
  block: NoteBlock;
  index: number;
  isFocused: boolean;
  isDragging?: boolean;
  isDragTarget?: boolean;
  dropPosition?: 'above' | 'below' | null;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onUpdate: (updatedBlock: NoteBlock) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onInsertBelow: (type?: BlockType) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onOpenSlashMenu: (anchorRect: DOMRect) => void;
  onLinkClick?: (noteTitle: string) => void;
  onContextMenu?: (e: React.MouseEvent, index: number, block: NoteBlock) => void;
  onPaste?: (e: React.ClipboardEvent, index: number, block: NoteBlock) => void;
}

const BlockItemInner: React.FC<BlockItemProps> = ({
  block,
  index,
  isFocused,
  isDragging,
  isDragTarget,
  dropPosition,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onUpdate,
  onDelete,
  onDuplicate,
  onInsertBelow,
  onMoveUp,
  onMoveDown,
  onOpenSlashMenu,
  onLinkClick,
  onContextMenu,
  onPaste
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealAnswer, setRevealAnswer] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit content seamlessly
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(26, textareaRef.current.scrollHeight)}px`;
    }
  }, [block.content]);

  // Focus when requested
  useEffect(() => {
    if (isFocused && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isFocused]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;

    // Detect Markdown prefixes typed or entered in block
    if (block.type === 'paragraph' || block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
      if (val.startsWith('# ') && block.type !== 'h1') {
        onUpdate({ ...block, type: 'h1', content: val.slice(2) });
        return;
      }
      if (val.startsWith('## ') && block.type !== 'h2') {
        onUpdate({ ...block, type: 'h2', content: val.slice(3) });
        return;
      }
      if (val.startsWith('### ') && block.type !== 'h3') {
        onUpdate({ ...block, type: 'h3', content: val.slice(4) });
        return;
      }
      if (/^#{4,6}\s+/.test(val) && block.type !== 'h3') {
        onUpdate({ ...block, type: 'h3', content: val.replace(/^#{4,6}\s+/, '') });
        return;
      }
      if ((val.startsWith('- [ ] ') || val.startsWith('[] ') || val.startsWith('[ ] ')) && block.type !== 'todo') {
        onUpdate({ ...block, type: 'todo', checked: false, content: val.replace(/^([-*+]\s+)?\[\s*\]\s*/, '') });
        return;
      }
      if ((val.startsWith('- [x] ') || val.startsWith('[x] ') || val.startsWith('- [X] ')) && block.type !== 'todo') {
        onUpdate({ ...block, type: 'todo', checked: true, content: val.replace(/^([-*+]\s+)?\[[xX]\]\s*/, '') });
        return;
      }
      if ((val.startsWith('- ') || val.startsWith('* ') || val.startsWith('+ ')) && block.type !== 'bullet') {
        onUpdate({ ...block, type: 'bullet', content: val.slice(2) });
        return;
      }
      if (/^\d+[\.\)]\s+/.test(val) && block.type !== 'numbered') {
        onUpdate({ ...block, type: 'numbered', content: val.replace(/^\d+[\.\)]\s+/, '') });
        return;
      }
      if (val.startsWith('> ') && block.type !== 'quote') {
        onUpdate({ ...block, type: 'quote', content: val.slice(2) });
        return;
      }
      if ((val === '---' || val === '***') && block.type !== 'divider') {
        onUpdate({ ...block, type: 'divider', content: '' });
        return;
      }
      if (val.startsWith('```') && block.type !== 'code') {
        onUpdate({ ...block, type: 'code', content: val.slice(3).trim(), language: 'typescript' });
        return;
      }
    }

    onUpdate({ ...block, content: val });

    // Detect if user typed `/` on a new line or standalone to trigger slash menu
    if (val === '/' || val.endsWith(' /')) {
      const rect = textareaRef.current?.getBoundingClientRect();
      if (rect) {
        onOpenSlashMenu(rect);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // If inside code block, allow normal enter
      if (block.type === 'code' || block.type === 'table') return;
      e.preventDefault();
      // If current todo or bullet is completely empty, turn it into paragraph
      if ((block.type === 'todo' || block.type === 'bullet' || block.type === 'numbered') && !block.content.trim()) {
        onUpdate({ ...block, type: 'paragraph', checked: false });
        return;
      }
      onInsertBelow(block.type === 'todo' ? 'todo' : block.type === 'bullet' ? 'bullet' : block.type === 'numbered' ? 'numbered' : 'paragraph');
    } else if (e.key === 'Backspace' && block.content === '') {
      e.preventDefault();
      if (block.type !== 'paragraph') {
        onUpdate({ ...block, type: 'paragraph', checked: false });
      } else {
        onDelete();
      }
    }
  };

  // Render text with clickable [[Links]] and #tags
  const renderFormattedPreview = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\[\[.*?\]\]|#[a-zA-Z0-9_\-]+)/g);

    return (
      <span className="pointer-events-auto">
        {parts.map((part, i) => {
          if (part.startsWith('[[') && part.endsWith(']]')) {
            const title = part.slice(2, -2).trim();
            const isJournalLink =
              /^\d{4}-\d{2}-\d{2}$/.test(title) ||
              title.toLowerCase().startsWith('journal:') ||
              title.toLowerCase().startsWith('journal •');

            return (
              <button aria-label="Action"
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLinkClick?.(title);
                }}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-semibold cursor-pointer transition-colors text-[0.92em] ${
                  isJournalLink
                    ? 'bg-blue-500/15 dark:bg-blue-500/25 text-blue-800 dark:text-blue-300 hover:bg-blue-500/30 hover:underline'
                    : 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-800 dark:text-amber-300 hover:bg-amber-500/30 hover:underline'
                }`}
                title={isJournalLink ? `Jump to Journal for ${title}` : `Open "${title}"`}
              >
                {isJournalLink && <Calendar className="w-3 h-3 text-blue-500 shrink-0 inline-block" />}
                <span>[[{title}]]</span>
              </button>
            );
          } else if (part.startsWith('#')) {
            return (
              <span
                key={i}
                className="inline-block px-1.5 py-0.2 mx-0.5 rounded-md bg-stone-200/60 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-medium text-[0.88em]"
              >
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  // Table helpers
  const handleTableCellChange = (rIdx: number, cIdx: number, val: string) => {
    const data = block.tableData ? block.tableData.map(row => [...row]) : [['Col 1', 'Col 2'], ['Row 1', 'Row 2']];
    if (data[rIdx]) {
      data[rIdx][cIdx] = val;
      onUpdate({ ...block, tableData: data });
    }
  };

  const handleAddTableRow = () => {
    const data = block.tableData ? block.tableData.map(row => [...row]) : [['Col 1', 'Col 2']];
    const colsCount = data[0]?.length || 2;
    data.push(new Array(colsCount).fill(''));
    onUpdate({ ...block, tableData: data });
  };

  const handleAddTableCol = () => {
    const data = block.tableData ? block.tableData.map(row => [...row]) : [['Col 1', 'Col 2']];
    data.forEach((row, i) => {
      row.push(i === 0 ? `Header ${row.length + 1}` : '');
    });
    onUpdate({ ...block, tableData: data });
  };

  // Callout styles
  const getCalloutStyles = (v: CalloutVariant = 'info') => {
    switch (v) {
      case 'tip':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200';
      case 'warning':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200';
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200';
      case 'quote':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-200';
      case 'info':
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200';
    }
  };

  const alignClass =
    block.align === 'center'
      ? 'text-center'
      : block.align === 'right'
      ? 'text-right'
      : block.align === 'justify'
      ? 'text-justify'
      : 'text-left';

  return (
    <div
      id={`doc-block-${block.id}`}
      data-block-id={block.id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowTypeMenu(false);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e, index, block);
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPaste={(e) => onPaste?.(e, index, block)}
      className={`group relative flex items-start gap-2 py-1 px-2 -mx-2 rounded-lg transition-all ${
        isDragging
          ? 'opacity-30 scale-[0.99] bg-amber-500/10'
          : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
      }`}
    >
      {/* Insertion Line Indicator Above */}
      {isDragTarget && dropPosition === 'above' && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-amber-500 z-30 pointer-events-none rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]">
          <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
        </div>
      )}

      {/* Insertion Line Indicator Below */}
      {isDragTarget && dropPosition === 'below' && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-amber-500 z-30 pointer-events-none rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]">
          <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
        </div>
      )}

      {/* Block Controls Left Gutter (SiYuan / Notion style hover handle) */}
      <div
        className={`shrink-0 flex items-center gap-0.5 mt-1 transition-opacity select-none ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button aria-label="Action"
          type="button"
          onClick={() => onInsertBelow()}
          title="Add block below (or type /)"
          className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <div className="relative">
          <button aria-label="Action"
            type="button"
            draggable={true}
            onDragStart={(e) => {
              e.stopPropagation();
              onDragStart?.(e);
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              onDragEnd?.(e);
            }}
            onClick={() => setShowTypeMenu(!showTypeMenu)}
            title="Drag to reorder · Click for options"
            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-grab active:cursor-grabbing transition-colors"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>

          {showTypeMenu && (
            <div className="absolute left-0 top-full mt-1 z-50 w-44 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-1 text-xs space-y-0.5 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Turn Into
              </div>
              <button aria-label="Action"
                type="button"
                onClick={() => {
                  onUpdate({ ...block, type: 'paragraph' });
                  setShowTypeMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left cursor-pointer"
              >
                <span className="font-serif">P</span> Text
              </button>
              <button aria-label="Action"
                type="button"
                onClick={() => {
                  onUpdate({ ...block, type: 'h1' });
                  setShowTypeMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left cursor-pointer"
              >
                <Heading1 className="w-3.5 h-3.5" /> Heading 1
              </button>
              <button aria-label="Action"
                type="button"
                onClick={() => {
                  onUpdate({ ...block, type: 'h2' });
                  setShowTypeMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left cursor-pointer"
              >
                <Heading2 className="w-3.5 h-3.5" /> Heading 2
              </button>
              <button aria-label="Action"
                type="button"
                onClick={() => {
                  onUpdate({ ...block, type: 'todo', checked: false });
                  setShowTypeMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" /> To-do List
              </button>
              <button aria-label="Action"
                type="button"
                onClick={() => {
                  onUpdate({ ...block, type: 'callout', calloutType: 'tip' });
                  setShowTypeMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" /> Callout
              </button>
              <button aria-label="Action"
                type="button"
                onClick={() => {
                  onUpdate({ ...block, type: 'flashcard', flashcardAnswer: '' });
                  setShowTypeMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Flashcard (SRS)
              </button>
              <button aria-label="Action"
                type="button"
                onClick={() => {
                  onUpdate({ ...block, type: 'image' });
                  setShowTypeMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Image
              </button>

              <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

              {onDuplicate && (
                <button aria-label="Action"
                  type="button"
                  onClick={() => {
                    onDuplicate();
                    setShowTypeMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate Block
                </button>
              )}

              {onMoveUp && (
                <button aria-label="Action"
                  type="button"
                  onClick={() => {
                    onMoveUp();
                    setShowTypeMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" /> Move Up
                </button>
              )}
              {onMoveDown && (
                <button aria-label="Action"
                  type="button"
                  onClick={() => {
                    onMoveDown();
                    setShowTypeMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" /> Move Down
                </button>
              )}

              <button aria-label="Action"
                type="button"
                onClick={() => {
                  onDelete();
                  setShowTypeMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Block
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Block Content Renderer */}
      <div className="flex-1 min-w-0">
        {/* H1 */}
        {block.type === 'h1' && (
          <textarea
            ref={textareaRef}
            rows={1}
            value={block.content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onPaste={(e) => onPaste?.(e, index, block)}
            placeholder="Heading 1..."
            className={`w-full bg-transparent resize-none outline-none font-bold text-2xl text-gray-900 dark:text-white tracking-tight leading-snug placeholder:text-gray-300 dark:placeholder:text-gray-600 ${alignClass}`}
          />
        )}

        {/* H2 */}
        {block.type === 'h2' && (
          <textarea
            ref={textareaRef}
            rows={1}
            value={block.content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onPaste={(e) => onPaste?.(e, index, block)}
            placeholder="Heading 2..."
            className={`w-full bg-transparent resize-none outline-none font-semibold text-xl text-gray-800 dark:text-gray-100 tracking-tight leading-snug placeholder:text-gray-300 dark:placeholder:text-gray-600 mt-2 ${alignClass}`}
          />
        )}

        {/* H3 */}
        {block.type === 'h3' && (
          <textarea
            ref={textareaRef}
            rows={1}
            value={block.content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onPaste={(e) => onPaste?.(e, index, block)}
            placeholder="Heading 3..."
            className={`w-full bg-transparent resize-none outline-none font-semibold text-lg text-gray-800 dark:text-gray-200 tracking-tight leading-snug placeholder:text-gray-300 dark:placeholder:text-gray-600 mt-1 ${alignClass}`}
          />
        )}

        {/* To-Do Block with Checkbox */}
        {block.type === 'todo' && (
          <div className="flex items-start gap-2.5">
            <button aria-label="Action"
              type="button"
              onClick={() => onUpdate({ ...block, checked: !block.checked })}
              className={`mt-0.5 w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                block.checked
                  ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                  : 'border-stone-400/80 dark:border-stone-500 hover:border-amber-500 bg-transparent'
              }`}
            >
              {block.checked && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
            <div className="flex-1 relative min-w-0">
              <textarea
                ref={textareaRef}
                rows={1}
                value={block.content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                onPaste={(e) => onPaste?.(e, index, block)}
                placeholder="To-do task..."
                className={`w-full bg-transparent resize-none outline-none text-sm leading-relaxed placeholder:text-stone-400 dark:placeholder:text-stone-600 transition-colors ${
                  block.checked
                    ? 'line-through text-stone-400 dark:text-stone-500'
                    : 'text-stone-900 dark:text-stone-100'
                }`}
              />
              {block.content.includes('[[') && (
                <div className="text-xs text-stone-500 mt-0.5">
                  {renderFormattedPreview(block.content)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bullet List */}
        {block.type === 'bullet' && (
          <div className="flex items-start gap-2">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                rows={1}
                value={block.content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                onPaste={(e) => onPaste?.(e, index, block)}
                placeholder="List item..."
                className="w-full bg-transparent resize-none outline-none text-sm text-gray-800 dark:text-gray-200 leading-relaxed placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
              {block.content.includes('[[') && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {renderFormattedPreview(block.content)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Numbered List */}
        {block.type === 'numbered' && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-mono text-gray-400 mt-1 select-none w-5 text-right shrink-0">
              {index + 1}.
            </span>
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                rows={1}
                value={block.content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                onPaste={(e) => onPaste?.(e, index, block)}
                placeholder="Numbered item..."
                className="w-full bg-transparent resize-none outline-none text-sm text-gray-800 dark:text-gray-200 leading-relaxed placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
              {block.content.includes('[[') && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {renderFormattedPreview(block.content)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toggle List (SiYuan / Notion outliner collapsible) */}
        {block.type === 'toggle' && (
          <div className="space-y-1">
            <div className="flex items-start gap-1.5">
              <button aria-label="Action"
                type="button"
                onClick={() => onUpdate({ ...block, collapsed: !block.collapsed })}
                className="p-0.5 mt-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 cursor-pointer"
              >
                {block.collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              <textarea
                ref={textareaRef}
                rows={1}
                value={block.content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                placeholder="Toggle header..."
                className="flex-1 bg-transparent resize-none outline-none text-sm font-medium text-gray-900 dark:text-white leading-relaxed placeholder:text-gray-400"
              />
            </div>
            {!block.collapsed && (
              <div className="pl-6 border-l-2 border-gray-200 dark:border-gray-800 text-xs text-gray-500 py-1">
                <textarea
                  rows={2}
                  placeholder="Toggle inner details..."
                  className="w-full bg-transparent resize-none outline-none text-xs text-gray-700 dark:text-gray-300 leading-relaxed"
                />
              </div>
            )}
          </div>
        )}

        {/* Callout */}
        {block.type === 'callout' && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${getCalloutStyles(
              block.calloutType
            )}`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 opacity-90" />
            <div className="flex-1 min-w-0 space-y-1">
              <textarea
                ref={textareaRef}
                rows={1}
                value={block.content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                placeholder="Callout thought, tip or highlight..."
                className="w-full bg-transparent resize-none outline-none text-xs sm:text-sm font-medium leading-relaxed"
              />
              {block.content.includes('[[') && (
                <div className="text-xs opacity-90">
                  {renderFormattedPreview(block.content)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quote */}
        {block.type === 'quote' && (
          <div className="pl-3.5 border-l-3 border-amber-500/80 italic text-gray-700 dark:text-gray-300">
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onPaste={(e) => onPaste?.(e, index, block)}
              placeholder="Enter quote..."
              className={`w-full bg-transparent resize-none outline-none text-sm font-serif leading-relaxed ${alignClass}`}
            />
          </div>
        )}

        {/* Code Snippet */}
        {block.type === 'code' && (
          <div className="rounded-xl bg-[#1e1e24] dark:bg-black/60 border border-white/10 p-3 font-mono text-xs text-emerald-300 relative group/code">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] text-gray-400">
              <input
                type="text"
                value={block.language || 'typescript'}
                onChange={(e) => onUpdate({ ...block, language: e.target.value })}
                className="bg-transparent uppercase tracking-wider outline-none w-28 text-gray-400 hover:text-white"
                placeholder="LANG"
              />
              <button aria-label="Action"
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(block.content);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <textarea
              ref={textareaRef}
              rows={3}
              value={block.content}
              onChange={handleContentChange}
              onPaste={(e) => onPaste?.(e, index, block)}
              placeholder="// Write or paste code snippet..."
              className="w-full bg-transparent resize-none outline-none text-xs font-mono text-emerald-300 leading-relaxed"
            />
          </div>
        )}

        {/* Table (Interactive Anytype/SiYuan Matrix) */}
        {block.type === 'table' && (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 my-2">
            <table className="w-full text-left text-xs border-collapse">
              <tbody>
                {(block.tableData || [['Header 1', 'Header 2'], ['Row 1', 'Row 2']]).map(
                  (row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={
                        rIdx === 0
                          ? 'bg-gray-100/70 dark:bg-gray-800/60 font-semibold border-b border-gray-200 dark:border-gray-800'
                          : 'border-b border-gray-100 dark:border-gray-800/40 hover:bg-gray-50/50 dark:hover:bg-white/[0.02]'
                      }
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2 border-r border-gray-100 dark:border-gray-800/40 last:border-r-0">
                          <input
                            type="text"
                            value={cell}
                            onChange={(e) => handleTableCellChange(rIdx, cIdx, e.target.value)}
                            className="w-full bg-transparent outline-none text-xs text-gray-800 dark:text-gray-200"
                          />
                        </td>
                      ))}
                    </tr>
                  )
                )}
              </tbody>
            </table>
            <div className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-500">
              <button aria-label="Action"
                type="button"
                onClick={handleAddTableRow}
                className="px-2 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer font-medium"
              >
                + Add Row
              </button>
              <button aria-label="Action"
                type="button"
                onClick={handleAddTableCol}
                className="px-2 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer font-medium"
              >
                + Add Column
              </button>
            </div>
          </div>
        )}

        {/* Divider */}
        {block.type === 'divider' && (
          <div className="py-2">
            <hr className="border-t border-gray-200 dark:border-gray-800" />
          </div>
        )}

        {/* Flashcard (SiYuan Spaced Repetition Block) */}
        {block.type === 'flashcard' && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Spaced Repetition Card
              </span>
              <button aria-label="Action"
                type="button"
                onClick={() => setRevealAnswer(!revealAnswer)}
                className="text-amber-700 dark:text-amber-300 underline cursor-pointer"
              >
                {revealAnswer ? 'Hide Answer' : 'Flip / Reveal'}
              </button>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 font-semibold mb-0.5">Prompt / Question</div>
              <textarea
                ref={textareaRef}
                rows={1}
                value={block.content}
                onChange={handleContentChange}
                placeholder="Front of card: Question or concept to remember..."
                className="w-full bg-transparent resize-none outline-none text-xs sm:text-sm font-semibold text-gray-900 dark:text-white"
              />
            </div>
            {(revealAnswer || isHovered) && (
              <div className="pt-2 border-t border-amber-500/20">
                <div className="text-[10px] text-gray-400 font-semibold mb-0.5">Answer</div>
                <textarea
                  rows={2}
                  value={block.flashcardAnswer || ''}
                  onChange={(e) => onUpdate({ ...block, flashcardAnswer: e.target.value })}
                  placeholder="Back of card: Key explanation, formula, or definition..."
                  className="w-full bg-transparent resize-none outline-none text-xs text-gray-700 dark:text-gray-300 leading-relaxed"
                />
              </div>
            )}
          </div>
        )}

        {/* Timeline Embed (Native beast integration with Spotify, YouTube, Maps) */}
        {block.type === 'timeline_embed' && (
          <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              {block.timelineRef?.type === 'spotify' && <Music className="w-4 h-4 text-emerald-500" />}
              {block.timelineRef?.type === 'youtube' && <Video className="w-4 h-4 text-red-500" />}
              {block.timelineRef?.type === 'maps' && <MapPin className="w-4 h-4 text-amber-500" />}
              {block.timelineRef?.type === 'browser' && <Globe className="w-4 h-4 text-blue-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Linked {block.timelineRef?.type || 'Timeline Record'}
              </div>
              <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                {block.timelineRef?.title || block.content}
              </div>
              {block.timelineRef?.subtitle && (
                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {block.timelineRef.subtitle}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Document (PDF / DOCX Omni Viewer) */}
        {block.type === 'document' && (
          <DocumentBlock
            block={block}
            isFocused={isFocused}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        )}

        {/* Image Attachment Block */}
        {block.type === 'image' && (
          <ImageBlock
            block={block}
            isFocused={isFocused}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        )}

        {/* Standard Paragraph */}
        {block.type === 'paragraph' && (
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onPaste={(e) => onPaste?.(e, index, block)}
              placeholder="Type note, '/' for formatting, '[[ ' to link..."
              className={`w-full bg-transparent resize-none outline-none text-[15px] text-stone-900 dark:text-stone-100 leading-relaxed placeholder:text-stone-300 dark:placeholder:text-stone-700 ${alignClass}`}
            />
            {block.content.includes('[[') && (
              <div className="text-xs text-stone-500 mt-0.5">
                {renderFormattedPreview(block.content)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const BlockItem = React.memo(BlockItemInner, (prev, next) => {
  if (prev.block !== next.block) {
    if (
      prev.block.id !== next.block.id ||
      prev.block.type !== next.block.type ||
      prev.block.content !== next.block.content ||
      prev.block.checked !== next.block.checked ||
      prev.block.calloutVariant !== next.block.calloutVariant ||
      prev.block.calloutType !== next.block.calloutType ||
      prev.block.align !== next.block.align ||
      prev.block.language !== next.block.language ||
      prev.block.flashcardAnswer !== next.block.flashcardAnswer ||
      prev.block.imageData !== next.block.imageData ||
      prev.block.documentData !== next.block.documentData ||
      prev.block.tableData !== next.block.tableData ||
      prev.block.timelineRef !== next.block.timelineRef ||
      prev.block.children !== next.block.children
    ) {
      return false;
    }
  }
  if (prev.index !== next.index) return false;
  if (prev.isFocused !== next.isFocused) return false;
  if (prev.isDragging !== next.isDragging) return false;
  if (prev.isDragTarget !== next.isDragTarget) return false;
  if (prev.dropPosition !== next.dropPosition) return false;

  return true;
});
