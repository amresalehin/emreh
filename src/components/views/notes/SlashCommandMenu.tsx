import React, { useState, useEffect, useRef } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  ChevronRight,
  AlertCircle,
  Quote,
  Code,
  Table as TableIcon,
  Divide,
  Sparkles,
  Music,
  Calendar,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { BlockType } from '../../../types/notes';

interface SlashCommandItem {
  type: BlockType;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'Basic' | 'Structure' | 'Advanced' | 'Power';
}

interface SlashCommandMenuProps {
  isOpen: boolean;
  anchorRect: DOMRect | null;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

const COMMANDS: SlashCommandItem[] = [
  {
    type: 'paragraph',
    label: 'Text',
    description: 'Plain text paragraph with formatting and links',
    icon: <FileText className="w-4 h-4 text-blue-500" />,
    category: 'Basic'
  },
  {
    type: 'h1',
    label: 'Heading 1',
    description: 'Large section headline',
    icon: <Heading1 className="w-4 h-4 text-indigo-500" />,
    category: 'Basic'
  },
  {
    type: 'h2',
    label: 'Heading 2',
    description: 'Medium section subtitle',
    icon: <Heading2 className="w-4 h-4 text-indigo-400" />,
    category: 'Basic'
  },
  {
    type: 'h3',
    label: 'Heading 3',
    description: 'Small subsection header',
    icon: <Heading3 className="w-4 h-4 text-indigo-300" />,
    category: 'Basic'
  },
  {
    type: 'todo',
    label: 'To-do List',
    description: 'Interactive task with checkbox',
    icon: <CheckSquare className="w-4 h-4 text-emerald-500" />,
    category: 'Structure'
  },
  {
    type: 'bullet',
    label: 'Bulleted List',
    description: 'Simple bulleted list point',
    icon: <List className="w-4 h-4 text-amber-500" />,
    category: 'Structure'
  },
  {
    type: 'numbered',
    label: 'Numbered List',
    description: 'Ordered sequence list item',
    icon: <ListOrdered className="w-4 h-4 text-amber-600" />,
    category: 'Structure'
  },
  {
    type: 'toggle',
    label: 'Toggle List',
    description: 'Collapsible outliner block to hide details',
    icon: <ChevronRight className="w-4 h-4 text-purple-500" />,
    category: 'Structure'
  },
  {
    type: 'callout',
    label: 'Callout Box',
    description: 'Highlighted note, tip, or warning',
    icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
    category: 'Advanced'
  },
  {
    type: 'quote',
    label: 'Blockquote',
    description: 'Capture a meaningful quote or source',
    icon: <Quote className="w-4 h-4 text-stone-500" />,
    category: 'Advanced'
  },
  {
    type: 'code',
    label: 'Code Snippet',
    description: 'Syntax highlighted code container',
    icon: <Code className="w-4 h-4 text-emerald-400" />,
    category: 'Advanced'
  },
  {
    type: 'table',
    label: 'Interactive Table',
    description: 'Relational data grid with rows and columns',
    icon: <TableIcon className="w-4 h-4 text-blue-400" />,
    category: 'Advanced'
  },
  {
    type: 'divider',
    label: 'Divider',
    description: 'Visual horizontal separator',
    icon: <Divide className="w-4 h-4 text-gray-400" />,
    category: 'Structure'
  },
  {
    type: 'flashcard',
    label: 'Spaced Repetition Flashcard',
    description: 'SiYuan SRS question/answer recall block',
    icon: <Sparkles className="w-4 h-4 text-amber-400" />,
    category: 'Power'
  },
  {
    type: 'document',
    label: 'Document (PDF / DOCX)',
    description: 'Embed PDF or Word doc with Omni Viewer',
    icon: <FileText className="w-4 h-4 text-rose-500" />,
    category: 'Power'
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Upload file or embed image link with captions',
    icon: <ImageIcon className="w-4 h-4 text-blue-500" />,
    category: 'Basic'
  }
];

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  isOpen,
  anchorRect,
  onSelect,
  onClose
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = COMMANDS.filter(
    (c) =>
      c.label.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].type);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Compute position relative to viewport or anchor
  let top = anchorRect ? anchorRect.bottom + 8 : 100;
  let left = anchorRect ? anchorRect.left : 100;

  // Guard against overflowing offscreen
  if (typeof window !== 'undefined') {
    if (top + 340 > window.innerHeight) {
      top = Math.max(20, (anchorRect ? anchorRect.top : 200) - 340);
    }
    if (left + 280 > window.innerWidth) {
      left = window.innerWidth - 300;
    }
  }

  return (
    <div
      ref={menuRef}
      style={{ top: `${top}px`, left: `${left}px` }}
      className="fixed z-[100] w-72 max-h-80 bg-white/95 dark:bg-[#1c1c20]/95 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col text-xs animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-2 py-1.5 border-b border-gray-100 dark:border-white/5 mb-1 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Insert Block
        </span>
        <span className="text-[10px] text-gray-400 font-mono">ESC to close</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0 pr-1">
        {filteredCommands.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-400">No matching blocks</div>
        ) : (
          filteredCommands.map((cmd, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={cmd.type + cmd.label}
                type="button"
                onClick={() => onSelect(cmd.type)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 font-medium'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-white/5'
                }`}
              >
                <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 shrink-0">
                  {cmd.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                    {cmd.label}
                  </div>
                  <div className="text-[11px] text-stone-400 truncate">
                    {cmd.description}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
