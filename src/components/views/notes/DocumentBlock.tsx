import React, { useState, useRef } from 'react';
import {
  FileText,
  Download,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Columns,
  Eye,
  Type,
  FileCode,
  X,
  Upload,
  Loader2
} from 'lucide-react';
import { NoteBlock, DocumentAttachment, DocumentViewMode } from '../../../types/notes';
import { formatFileSize, processUploadedDocument } from '../../../utils/documentProcessor';

interface DocumentBlockProps {
  block: NoteBlock;
  isFocused?: boolean;
  onUpdate: (updatedBlock: NoteBlock) => void;
  onDelete: () => void;
}

export const DocumentBlock: React.FC<DocumentBlockProps> = ({
  block,
  isFocused,
  onUpdate,
  onDelete
}) => {
  const doc = block.documentData;
  const [zoom, setZoom] = useState<number>(100);
  const [viewerHeight, setViewerHeight] = useState<number>(600);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [docxTheme, setDocxTheme] = useState<'paper' | 'white' | 'dark'>('paper');
  const [docxFontSize, setDocxFontSize] = useState<number>(15);
  const [activeTab, setActiveTab] = useState<'rendered' | 'raw'>('rendered');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilePicked = async (file?: File) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const processed = await processUploadedDocument(file);
      onUpdate({
        ...block,
        content: processed.name,
        documentData: processed
      });
    } catch (err) {
      console.error('Failed to process document:', err);
      alert('Could not process this document.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!doc) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const file = e.dataTransfer.files?.[0];
          handleFilePicked(file);
        }}
        className={`my-3 p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center ${
          isDragOver
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/30 hover:border-amber-500/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          className="hidden"
          onChange={(e) => handleFilePicked(e.target.files?.[0])}
        />
        <div className="p-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
        </div>
        <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 mb-1">
          {isProcessing ? 'Processing Document...' : 'Embed Document with Omni Viewer'}
        </div>
        <div className="text-[11px] text-stone-400 mb-3 max-w-xs leading-relaxed">
          Drop your PDF or Word (.docx) document here, or browse to view with interactive Omni Viewer.
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
          >
            Choose PDF or DOCX
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-2.5 py-1.5 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 text-xs cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const viewMode: DocumentViewMode = doc.viewMode || 'embedded';

  const setViewMode = (mode: DocumentViewMode) => {
    onUpdate({
      ...block,
      documentData: {
        ...doc,
        viewMode: mode
      }
    });
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!doc.dataUrl) return;
    const a = document.createElement('a');
    a.href = doc.dataUrl;
    a.download = doc.name;
    a.click();
  };

  const handleCopyExtractedText = () => {
    const textToCopy = doc.textExtract || (doc.htmlExtract ? doc.htmlExtract.replace(/<[^>]*>/g, '') : '');
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  // Badge styling depending on file type
  const isPdf = doc.fileType === 'pdf';
  const isDocx = doc.fileType === 'docx';
  const badgeColor = isPdf
    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
    : isDocx
    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'
    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';

  const badgeIcon = isPdf ? 'PDF' : isDocx ? 'DOCX' : (doc.fileType || 'DOC').toUpperCase();

  // 1. INLINE CARD VIEW (Sleek pill card like Apple Notes & AFFiNE)
  if (viewMode === 'inline_card' && !isFullscreen) {
    return (
      <div className="my-2 group select-none">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-stone-200/80 dark:border-stone-800/80 hover:border-amber-500/40 dark:hover:border-amber-500/40 shadow-xs transition-all">
          {/* File Info */}
          <div
            onClick={() => setViewMode('embedded')}
            className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
          >
            <div className={`px-2 py-1 rounded-lg border text-[11px] font-black tracking-wider ${badgeColor}`}>
              {badgeIcon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {doc.name}
              </div>
              <div className="text-[11px] text-stone-400 dark:text-stone-500 flex items-center gap-2 mt-0.5">
                <span>{formatFileSize(doc.size)}</span>
                <span>•</span>
                <span className="capitalize">{doc.fileType} Document</span>
                {doc.textExtract && (
                  <>
                    <span>•</span>
                    <span>{doc.textExtract.split(/\s+/).filter(Boolean).length} words</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Card Actions */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setViewMode('embedded')}
              title="Expand Omni Viewer"
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-300 text-stone-600 dark:text-stone-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              title="Open Fullscreen Reader"
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleDownload}
              title="Download file"
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Inner Content for Embedded or Fullscreen Reader
  const renderViewerBody = () => {
    if (isPdf) {
      return (
        <div
          className="relative w-full bg-stone-100 dark:bg-stone-900 overflow-hidden flex flex-col items-center"
          style={{ height: isFullscreen ? 'calc(100vh - 120px)' : `${viewerHeight}px` }}
        >
          {doc.dataUrl ? (
            <div
              className="w-full h-full transition-transform duration-150 origin-top flex justify-center"
              style={{ transform: `scale(${zoom / 100})` }}
            >
              <iframe
                src={`${doc.dataUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0"
                title={doc.name}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-stone-400">
              <FileText className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">PDF content could not be previewed.</p>
              <button
                onClick={handleDownload}
                className="mt-3 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold"
              >
                Download PDF
              </button>
            </div>
          )}
        </div>
      );
    }

    if (isDocx) {
      // DOCX styling themes
      const themeClasses =
        docxTheme === 'paper'
          ? 'bg-[#fbf9f4] text-[#2c2a29] dark:bg-[#1f1e1c] dark:text-[#edebe8]'
          : docxTheme === 'dark'
          ? 'bg-[#18181b] text-stone-200'
          : 'bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100';

      return (
        <div
          className={`w-full overflow-y-auto px-6 sm:px-12 py-8 transition-colors ${themeClasses}`}
          style={{
            height: isFullscreen ? 'calc(100vh - 120px)' : `${viewerHeight}px`,
            fontSize: `${docxFontSize}px`
          }}
        >
          <div className="max-w-2xl mx-auto space-y-4 font-sans leading-relaxed">
            {activeTab === 'rendered' ? (
              doc.htmlExtract ? (
                <div
                  className="docx-content prose dark:prose-invert max-w-none space-y-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-stone-300 dark:[&_th]:border-stone-700 [&_th]:p-2 [&_td]:border [&_td]:border-stone-300 dark:[&_td]:border-stone-700 [&_td]:p-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: doc.htmlExtract }}
                />
              ) : (
                <div className="whitespace-pre-wrap font-sans text-stone-800 dark:text-stone-200">
                  {doc.textExtract || 'Empty document.'}
                </div>
              )
            ) : (
              <pre className="p-4 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-mono whitespace-pre-wrap overflow-x-auto text-stone-700 dark:text-stone-300">
                {doc.textExtract || 'No raw text extract available.'}
              </pre>
            )}
          </div>
        </div>
      );
    }

    // Generic text/file viewer
    return (
      <div
        className="w-full overflow-y-auto p-6 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-200 font-mono text-xs whitespace-pre-wrap"
        style={{ height: isFullscreen ? 'calc(100vh - 120px)' : `${viewerHeight}px` }}
      >
        {doc.textExtract || 'File content.'}
      </div>
    );
  };

  // 2. FULLSCREEN MODAL READER
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
        <div className="w-full max-w-5xl h-full max-h-[95vh] bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden">
          {/* Fullscreen Header */}
          <div className="h-14 px-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 bg-stone-50 dark:bg-[#141416] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`px-2 py-0.5 rounded-md border text-[10px] font-black ${badgeColor}`}>
                {badgeIcon}
              </div>
              <span className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate">
                {doc.name}
              </span>
              <span className="text-xs text-stone-400">({formatFileSize(doc.size)})</span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {isPdf && (
                <div className="flex items-center gap-1 bg-stone-200/60 dark:bg-stone-800 px-2 py-1 rounded-xl text-xs text-stone-600 dark:text-stone-300">
                  <button
                    onClick={() => setZoom(Math.max(50, zoom - 15))}
                    className="p-0.5 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] px-1">{zoom}%</span>
                  <button
                    onClick={() => setZoom(Math.min(200, zoom + 15))}
                    className="p-0.5 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoom(100)}
                    className="p-0.5 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer ml-1"
                    title="Reset zoom"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              )}

              {isDocx && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyExtractedText}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-stone-200/60 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 cursor-pointer"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Text</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleDownload}
                title="Download original file"
                className="p-1.5 rounded-lg hover:bg-stone-200/70 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                title="Close Fullscreen (Esc)"
                className="p-1.5 rounded-lg hover:bg-stone-200/70 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Fullscreen Body */}
          <div className="flex-1 overflow-hidden">
            {renderViewerBody()}
          </div>
        </div>
      </div>
    );
  }

  // 3. EMBEDDED OMNI VIEWER MODE (Inline with document flow)
  return (
    <div className="my-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#18181b] overflow-hidden shadow-xs group transition-all">
      {/* Omni Viewer Toolbar Header */}
      <div className="h-11 px-3.5 border-b border-stone-200/60 dark:border-stone-800/80 bg-stone-50/70 dark:bg-[#151517]/70 flex items-center justify-between gap-2 select-none">
        {/* Left: Badge & File Title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black ${badgeColor}`}>
            {badgeIcon}
          </div>
          <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate max-w-[200px] sm:max-w-xs">
            {doc.name}
          </span>
          <span className="text-[10px] text-stone-400 hidden sm:inline">
            ({formatFileSize(doc.size)})
          </span>
        </div>

        {/* Center: Contextual Controls */}
        <div className="flex items-center gap-1.5">
          {isPdf && (
            <div className="hidden sm:flex items-center gap-1 bg-stone-200/50 dark:bg-stone-800/80 px-2 py-0.5 rounded-lg text-xs text-stone-600 dark:text-stone-300">
              <button
                onClick={() => setZoom(Math.max(50, zoom - 15))}
                className="p-0.5 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="font-mono text-[10px] px-1">{zoom}%</span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 15))}
                className="p-0.5 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          )}

          {isDocx && (
            <div className="flex items-center gap-1">
              {/* Paper Theme selector */}
              <div className="flex items-center gap-0.5 p-0.5 bg-stone-200/50 dark:bg-stone-800/60 rounded-md text-[10px]">
                <button
                  type="button"
                  onClick={() => setDocxTheme('paper')}
                  title="Warm Paper Theme"
                  className={`px-1.5 py-0.5 rounded ${docxTheme === 'paper' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold' : 'text-stone-500'}`}
                >
                  Paper
                </button>
                <button
                  type="button"
                  onClick={() => setDocxTheme('white')}
                  title="Clean White Theme"
                  className={`px-1.5 py-0.5 rounded ${docxTheme === 'white' ? 'bg-white dark:bg-stone-700 shadow-2xs font-semibold' : 'text-stone-500'}`}
                >
                  White
                </button>
                <button
                  type="button"
                  onClick={() => setDocxTheme('dark')}
                  title="Dark Theme"
                  className={`px-1.5 py-0.5 rounded ${docxTheme === 'dark' ? 'bg-stone-700 text-white font-semibold' : 'text-stone-500'}`}
                >
                  Dark
                </button>
              </div>

              {/* Font resize */}
              <button
                type="button"
                onClick={() => setDocxFontSize(Math.max(12, docxFontSize - 1))}
                className="p-1 rounded text-stone-500 hover:text-stone-800 text-[11px] font-bold"
                title="Smaller font"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setDocxFontSize(Math.min(24, docxFontSize + 1))}
                className="p-1 rounded text-stone-500 hover:text-stone-800 text-[11px] font-bold"
                title="Larger font"
              >
                A+
              </button>
            </div>
          )}

          {/* Height Adjuster */}
          <div className="hidden md:flex items-center gap-0.5 text-stone-400">
            <button
              type="button"
              onClick={() => setViewerHeight(viewerHeight === 400 ? 650 : viewerHeight === 650 ? 900 : 400)}
              title={`Toggle viewer height (Current: ${viewerHeight}px)`}
              className="p-1 rounded hover:bg-stone-200/50 dark:hover:bg-stone-800 text-xs font-mono"
            >
              {viewerHeight === 400 ? '400px' : viewerHeight === 650 ? '650px' : '900px'}
            </button>
          </div>
        </div>

        {/* Right: View Mode & Action Buttons */}
        <div className="flex items-center gap-1">
          {isDocx && (
            <button
              type="button"
              onClick={handleCopyExtractedText}
              title="Copy extracted text"
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Collapse to Card View */}
          <button
            type="button"
            onClick={() => setViewMode('inline_card')}
            title="Collapse to card"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Reader */}
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            title="Expand to Fullscreen Reader"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Download Original File */}
          <button
            type="button"
            onClick={handleDownload}
            title="Download document"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Rendered Viewer Content */}
      <div className="w-full overflow-hidden">
        {renderViewerBody()}
      </div>
    </div>
  );
};
