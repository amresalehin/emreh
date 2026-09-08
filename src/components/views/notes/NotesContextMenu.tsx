import React, { useEffect, useRef, useState } from 'react';
import {
  Scissors,
  Copy,
  Clipboard,
  CopyPlus,
  Trash2,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  Code,
  Table as TableIcon,
  Image as ImageIcon,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  ChevronRight,
  Search,
  Printer,
  Sparkles
} from 'lucide-react';
import { BlockType, NoteBlock } from '../../../types/notes';

export interface ContextMenuState {
  x: number;
  y: number;
  blockIndex?: number;
  block?: NoteBlock;
  targetType: 'block' | 'canvas';
  selectedText?: string;
}

interface NotesContextMenuProps {
  menuState: ContextMenuState | null;
  onClose: () => void;
  onCut?: (blockIndex: number) => void;
  onCopy?: (blockIndex: number) => void;
  onPaste?: (insertIndex?: number) => void;
  onDuplicate?: (blockIndex: number) => void;
  onTransformType?: (blockIndex: number, type: BlockType) => void;
  onAlign?: (blockIndex: number, align: 'left' | 'center' | 'right') => void;
  onInsertAbove?: (blockIndex: number, type?: BlockType) => void;
  onInsertBelow?: (blockIndex: number, type?: BlockType) => void;
  onMoveUp?: (blockIndex: number) => void;
  onMoveDown?: (blockIndex: number) => void;
  onDelete?: (blockIndex: number) => void;
  onFormatInline?: (syntax: string) => void;
  onOpenFindReplace?: () => void;
  onPrint?: () => void;
}

export const NotesContextMenu: React.FC<NotesContextMenuProps> = ({
  menuState,
  onClose,
  onCut,
  onCopy,
  onPaste,
  onDuplicate,
  onTransformType,
  onAlign,
  onInsertAbove,
  onInsertBelow,
  onMoveUp,
  onMoveDown,
  onDelete,
  onFormatInline,
  onOpenFindReplace,
  onPrint
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<'turnInto' | 'align' | 'insert' | 'style' | null>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!menuState) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [menuState, onClose]);

  if (!menuState) return null;

  // Clamp menu coordinates so it doesn't overflow viewport boundaries
  const menuWidth = 240;
  const menuHeight = 380;
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  const posX = Math.min(menuState.x, windowWidth - menuWidth - 12);
  const posY = Math.min(menuState.y, windowHeight - menuHeight - 12);

  const isBlock = menuState.targetType === 'block' && menuState.blockIndex !== undefined;
  const blockIdx = menuState.blockIndex ?? 0;

  return (
    <div
      ref={menuRef}
      style={{ left: Math.max(12, posX), top: Math.max(12, posY) }}
      className="fixed z-50 w-60 rounded-xl bg-white/95 dark:bg-[#1e1e20]/95 backdrop-blur-xl border border-stone-200/80 dark:border-stone-800 shadow-2xl py-1 text-xs text-stone-800 dark:text-stone-200 animate-in fade-in zoom-in-95 duration-100 select-none ring-1 ring-black/5"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Block-specific actions */}
      {isBlock ? (
        <>
          {/* Cut / Copy / Paste / Duplicate */}
          <div className="px-1 py-0.5 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onCut?.(blockIdx);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 transition-colors group cursor-pointer text-left"
            >
              <span className="flex items-center gap-2 font-medium">
                <Scissors className="w-3.5 h-3.5 text-stone-500 group-hover:text-white" /> Cut
              </span>
              <span className="text-[10px] text-stone-400 group-hover:text-amber-100">⌘X</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onCopy?.(blockIdx);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 transition-colors group cursor-pointer text-left"
            >
              <span className="flex items-center gap-2 font-medium">
                <Copy className="w-3.5 h-3.5 text-stone-500 group-hover:text-white" /> Copy
              </span>
              <span className="text-[10px] text-stone-400 group-hover:text-amber-100">⌘C</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onPaste?.(blockIdx);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 transition-colors group cursor-pointer text-left"
            >
              <span className="flex items-center gap-2 font-medium">
                <Clipboard className="w-3.5 h-3.5 text-stone-500 group-hover:text-white" /> Paste Below
              </span>
              <span className="text-[10px] text-stone-400 group-hover:text-amber-100">⌘V</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDuplicate?.(blockIdx);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 transition-colors group cursor-pointer text-left"
            >
              <span className="flex items-center gap-2 font-medium">
                <CopyPlus className="w-3.5 h-3.5 text-stone-500 group-hover:text-white" /> Duplicate
              </span>
              <span className="text-[10px] text-stone-400 group-hover:text-amber-100">⌘D</span>
            </button>
          </div>

          <div className="h-px bg-stone-200/80 dark:bg-stone-800 my-1" />

          {/* Turn into menu item */}
          <div
            className="relative px-1"
            onMouseEnter={() => setActiveSubmenu('turnInto')}
            onMouseLeave={() => setActiveSubmenu(null)}
          >
            <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 transition-colors group cursor-pointer text-left">
              <span className="flex items-center gap-2 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 group-hover:text-white" /> Turn into...
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-white" />
            </div>

            {/* Submenu for types */}
            {activeSubmenu === 'turnInto' && (
              <div className="absolute left-full -top-1 ml-1 w-48 rounded-xl bg-white/95 dark:bg-[#1e1e20]/95 backdrop-blur-xl border border-stone-200/80 dark:border-stone-800 shadow-2xl py-1 text-xs text-stone-800 dark:text-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    onTransformType?.(blockIdx, 'paragraph');
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
                >
                  Normal text
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTransformType?.(blockIdx, 'h1');
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <Heading1 className="w-3.5 h-3.5" /> Title (H1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTransformType?.(blockIdx, 'h2');
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <Heading2 className="w-3.5 h-3.5" /> Heading (H2)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTransformType?.(blockIdx, 'h3');
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <Heading3 className="w-3.5 h-3.5" /> Subheading (H3)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTransformType?.(blockIdx, 'todo');
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-amber-500" /> Checklist
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTransformType?.(blockIdx, 'bullet');
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <List className="w-3.5 h-3.5" /> Bullet list
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTransformType?.(blockIdx, 'numbered');
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <ListOrdered className="w-3.5 h-3.5" /> Numbered list
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTransformType?.(blockIdx, 'quote');
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <Quote className="w-3.5 h-3.5" /> Quote
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTransformType?.(blockIdx, 'code');
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <Code className="w-3.5 h-3.5" /> Code block
                </button>
              </div>
            )}
          </div>

          {/* Text Alignment Submenu */}
          <div
            className="relative px-1"
            onMouseEnter={() => setActiveSubmenu('align')}
            onMouseLeave={() => setActiveSubmenu(null)}
          >
            <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 transition-colors group cursor-pointer text-left">
              <span className="flex items-center gap-2 font-medium">
                <AlignLeft className="w-3.5 h-3.5 text-stone-500 group-hover:text-white" /> Alignment
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-white" />
            </div>

            {activeSubmenu === 'align' && (
              <div className="absolute left-full -top-1 ml-1 w-36 rounded-xl bg-white/95 dark:bg-[#1e1e20]/95 backdrop-blur-xl border border-stone-200/80 dark:border-stone-800 shadow-2xl py-1 text-xs text-stone-800 dark:text-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    onAlign?.(blockIdx, 'left');
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <AlignLeft className="w-3.5 h-3.5" /> Left
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAlign?.(blockIdx, 'center');
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <AlignCenter className="w-3.5 h-3.5" /> Center
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAlign?.(blockIdx, 'right');
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <AlignRight className="w-3.5 h-3.5" /> Right
                </button>
              </div>
            )}
          </div>

          <div className="h-px bg-stone-200/80 dark:bg-stone-800 my-1" />

          {/* Quick Insert Actions */}
          <div className="px-1 py-0.5 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onInsertAbove?.(blockIdx, 'paragraph');
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5 text-stone-400" /> Insert line above
            </button>

            <button
              type="button"
              onClick={() => {
                onInsertBelow?.(blockIdx, 'paragraph');
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5 text-stone-400" /> Insert line below
            </button>

            <button
              type="button"
              onClick={() => {
                onInsertBelow?.(blockIdx, 'divider');
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5 text-stone-400" /> Insert divider
            </button>

            <button
              type="button"
              onClick={() => {
                onInsertBelow?.(blockIdx, 'table');
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left cursor-pointer"
            >
              <TableIcon className="w-3.5 h-3.5 text-stone-400" /> Insert table
            </button>
          </div>

          <div className="h-px bg-stone-200/80 dark:bg-stone-800 my-1" />

          {/* Delete action */}
          <div className="px-1 py-0.5">
            <button
              type="button"
              onClick={() => {
                onDelete?.(blockIdx);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 transition-colors group cursor-pointer text-left text-rose-600 dark:text-rose-400 font-medium"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 group-hover:text-white" /> Delete block
              </span>
              <span className="text-[10px] text-rose-300 group-hover:text-rose-100">Del</span>
            </button>
          </div>
        </>
      ) : (
        /* Canvas empty area right-click menu */
        <div className="px-1 py-0.5 space-y-0.5">
          <button
            type="button"
            onClick={() => {
              onInsertBelow?.(-1, 'paragraph');
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left font-medium"
          >
            Insert new paragraph
          </button>

          <button
            type="button"
            onClick={() => {
              onInsertBelow?.(-1, 'h2');
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
          >
            <Heading2 className="w-3.5 h-3.5" /> Insert heading
          </button>

          <button
            type="button"
            onClick={() => {
              onInsertBelow?.(-1, 'image');
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
          >
            <ImageIcon className="w-3.5 h-3.5" /> Insert image
          </button>

          <button
            type="button"
            onClick={() => {
              onInsertBelow?.(-1, 'table');
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
          >
            <TableIcon className="w-3.5 h-3.5" /> Insert table
          </button>

          <button
            type="button"
            onClick={() => {
              onInsertBelow?.(-1, 'divider');
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500 hover:text-white transition-colors cursor-pointer text-left"
          >
            <Minus className="w-3.5 h-3.5" /> Insert page divider
          </button>

          <div className="h-px bg-stone-200/80 dark:bg-stone-800 my-1" />

          <button
            type="button"
            onClick={() => {
              onOpenFindReplace?.();
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer text-left"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-stone-400" /> Find & Replace
            </span>
            <span className="text-[10px] text-stone-400">⌘F</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onPrint?.();
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer text-left"
          >
            <span className="flex items-center gap-2">
              <Printer className="w-3.5 h-3.5 text-stone-400" /> Print Document
            </span>
            <span className="text-[10px] text-stone-400">⌘P</span>
          </button>
        </div>
      )}
    </div>
  );
};
