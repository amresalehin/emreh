import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  Image as ImageIcon,
  Music,
  Video,
  File,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  Trash2,
  Download,
  Play
} from 'lucide-react';
import { FileTreeNode, VirtualFile } from '../types';
import { formatFileSize } from '../utils/mime';

interface FileTreeProps {
  treeNodes: FileTreeNode[];
  selectedFilePath: string | null;
  entryPoint: string;
  onSelectFile: (path: string) => void;
  onSetEntryPoint: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onAddFile: (path: string, content: string) => void;
  onDownloadFile: (path: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  treeNodes,
  selectedFilePath,
  entryPoint,
  onSelectFile,
  onSetEntryPoint,
  onDeleteFile,
  onAddFile,
  onDownloadFile,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root', 'js', 'css', 'data', 'src', 'assets']));
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getFileIcon = (fileName: string, mimeType?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'html' || ext === 'htm') {
      return <FileCode className="w-4 h-4 text-orange-400 shrink-0" />;
    }
    if (ext === 'css') {
      return <FileCode className="w-4 h-4 text-blue-400 shrink-0" />;
    }
    if (ext === 'js' || ext === 'mjs' || ext === 'cjs' || ext === 'ts' || ext === 'tsx' || ext === 'jsx') {
      return <FileCode className="w-4 h-4 text-yellow-400 shrink-0" />;
    }
    if (ext === 'json') {
      return <FileJson className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'ico'].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />;
    }
    if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
      return <Music className="w-4 h-4 text-pink-400 shrink-0" />;
    }
    if (['mp4', 'webm'].includes(ext)) {
      return <Video className="w-4 h-4 text-rose-400 shrink-0" />;
    }
    if (ext === 'md' || ext === 'txt') {
      return <FileText className="w-4 h-4 text-slate-300 shrink-0" />;
    }
    return <File className="w-4 h-4 text-slate-400 shrink-0" />;
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    onAddFile(newFileName.trim(), '');
    setNewFileName('');
    setIsAddingFile(false);
  };

  const renderNode = (node: FileTreeNode, depth = 0) => {
    if (searchQuery && !node.isDirectory && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return null;
    }

    if (node.isDirectory) {
      const isExpanded = expandedFolders.has(node.path) || !!searchQuery;
      return (
        <div key={node.path} className="select-none">
          <div
            onClick={(e) => toggleFolder(node.path, e)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-800/80 cursor-pointer text-xs font-medium text-slate-300 group"
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-cyan-400 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-cyan-400/80 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </div>

          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File Node
    const isSelected = selectedFilePath === node.path;
    const isEntry = entryPoint === node.path;
    const isHtml = node.name.endsWith('.html') || node.name.endsWith('.htm');

    return (
      <div
        key={node.path}
        onClick={() => onSelectFile(node.path)}
        className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer text-xs transition-colors group ${
          isSelected
            ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
            : 'hover:bg-slate-800/60 text-slate-300'
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getFileIcon(node.name, node.mimeType)}
          <span className="truncate" title={node.path}>{node.name}</span>
          {isEntry && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/20 text-cyan-400 font-mono font-normal">
              Entry
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isHtml && !isEntry && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetEntryPoint(node.path);
              }}
              title="Set as App Entry Point"
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-400"
            >
              <Play className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownloadFile(node.path);
            }}
            title="Download File"
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <Download className="w-3 h-3" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFile(node.path);
            }}
            title="Delete File"
            className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border-r border-slate-800/80 w-full overflow-hidden select-none">
      {/* Header & Search */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Files & Explorer
          </span>
          <button
            onClick={() => setIsAddingFile(!isAddingFile)}
            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1"
            title="New File"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files..."
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* New File Inline Form */}
        {isAddingFile && (
          <form onSubmit={handleCreateFileSubmit} className="flex gap-1 pt-1">
            <input
              type="text"
              autoFocus
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="e.g. styles/custom.css"
              className="flex-1 bg-slate-950 border border-cyan-500/50 rounded px-2 py-1 text-xs text-slate-200 outline-none"
            />
            <button
              type="submit"
              className="px-2 py-1 rounded bg-cyan-500 text-slate-950 text-xs font-bold"
            >
              Add
            </button>
          </form>
        )}
      </div>

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
        {treeNodes.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No files in project
          </div>
        ) : (
          treeNodes.map(node => renderNode(node))
        )}
      </div>
    </div>
  );
};
