import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Link,
  Maximize2,
  Download,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ZoomIn,
  ZoomOut,
  X,
  Copy,
  Check,
  RotateCw
} from 'lucide-react';
import { NoteBlock, ImageAttachment } from '../../../types/notes';

interface ImageBlockProps {
  block: NoteBlock;
  isFocused?: boolean;
  onUpdate: (updatedBlock: NoteBlock) => void;
  onDelete: () => void;
}

export const ImageBlock: React.FC<ImageBlockProps> = ({
  block,
  isFocused,
  onUpdate,
  onDelete
}) => {
  const imgData: ImageAttachment | undefined = block.imageData || (block.content.startsWith('http') || block.content.startsWith('data:image') ? { url: block.content } : undefined);
  
  const [isHovered, setIsHovered] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(100);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentWidth = imgData?.width || 'wide';
  const currentAlign = imgData?.align || 'center';

  const handleFilePicked = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP, GIF, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onUpdate({
        ...block,
        content: file.name,
        imageData: {
          url: dataUrl,
          name: file.name,
          caption: imgData?.caption || '',
          width: currentWidth,
          align: currentAlign,
          size: file.size
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    onUpdate({
      ...block,
      content: inputUrl.trim(),
      imageData: {
        url: inputUrl.trim(),
        name: 'Web Image',
        caption: imgData?.caption || '',
        width: currentWidth,
        align: currentAlign
      }
    });
    setInputUrl('');
  };

  const setWidth = (w: 'small' | 'medium' | 'wide' | 'full') => {
    if (!imgData) return;
    onUpdate({
      ...block,
      imageData: { ...imgData, width: w }
    });
  };

  const setAlign = (a: 'left' | 'center' | 'right') => {
    if (!imgData) return;
    onUpdate({
      ...block,
      imageData: { ...imgData, align: a }
    });
  };

  const setCaption = (val: string) => {
    if (!imgData) return;
    onUpdate({
      ...block,
      imageData: { ...imgData, caption: val }
    });
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!imgData?.url) return;
    const a = document.createElement('a');
    a.href = imgData.url;
    a.download = imgData.name || 'image.png';
    a.click();
  };

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!imgData?.url) return;
    navigator.clipboard.writeText(imgData.url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // If no image is set yet, render dropzone/uploader
  if (!imgData || !imgData.url) {
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
        className={`my-3 p-5 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center ${
          isDragOver
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/40 hover:border-amber-500/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFilePicked(e.target.files?.[0])}
        />

        <div className="flex items-center gap-1 p-0.5 bg-stone-200/60 dark:bg-stone-800/80 rounded-xl mb-3 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Upload Image
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Embed Link
          </button>
        </div>

        {activeTab === 'upload' ? (
          <div className="flex flex-col items-center">
            <div className="p-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
              <ImageIcon className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 mb-1">
              Drop an image here, or choose a file
            </p>
            <p className="text-[11px] text-stone-400 mb-3">
              PNG, JPG, WebP, GIF, SVG up to 25MB
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                Choose Image File
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
        ) : (
          <form onSubmit={handleUrlSubmit} className="w-full max-w-sm flex flex-col items-center">
            <div className="w-full flex items-center gap-2 mb-2">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs outline-none focus:border-amber-500 text-stone-800 dark:text-stone-200"
              />
              <button
                type="submit"
                disabled={!inputUrl.trim()}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Embed
              </button>
            </div>
            <button
              type="button"
              onClick={onDelete}
              className="text-[11px] text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    );
  }

  // Width classes
  const widthClasses = {
    small: 'max-w-xs',
    medium: 'max-w-md',
    wide: 'max-w-2xl',
    full: 'w-full'
  }[currentWidth];

  // Align container classes
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  }[currentAlign];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="my-3 group relative select-none"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFilePicked(e.target.files?.[0])}
      />

      <div className={`flex w-full ${alignClasses}`}>
        <div className={`relative flex flex-col items-center ${widthClasses} transition-all`}>
          {/* Floating Action Controls on Hover / Focus */}
          <div
            className={`absolute top-2 right-2 z-20 flex items-center gap-1 bg-stone-900/80 backdrop-blur-md text-white p-1 rounded-xl shadow-lg border border-white/10 transition-opacity duration-150 ${
              isHovered || isFocused ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Width selector */}
            <div className="flex items-center gap-0.5 px-1 text-[10px] font-bold border-r border-white/20">
              <button
                type="button"
                onClick={() => setWidth('small')}
                title="Small width"
                className={`px-1.5 py-0.5 rounded ${currentWidth === 'small' ? 'bg-amber-500 text-white' : 'text-stone-300 hover:text-white'}`}
              >
                S
              </button>
              <button
                type="button"
                onClick={() => setWidth('medium')}
                title="Medium width"
                className={`px-1.5 py-0.5 rounded ${currentWidth === 'medium' ? 'bg-amber-500 text-white' : 'text-stone-300 hover:text-white'}`}
              >
                M
              </button>
              <button
                type="button"
                onClick={() => setWidth('wide')}
                title="Wide width"
                className={`px-1.5 py-0.5 rounded ${currentWidth === 'wide' ? 'bg-amber-500 text-white' : 'text-stone-300 hover:text-white'}`}
              >
                L
              </button>
              <button
                type="button"
                onClick={() => setWidth('full')}
                title="Full width"
                className={`px-1.5 py-0.5 rounded ${currentWidth === 'full' ? 'bg-amber-500 text-white' : 'text-stone-300 hover:text-white'}`}
              >
                Full
              </button>
            </div>

            {/* Alignment */}
            <button
              type="button"
              onClick={() => setAlign(currentAlign === 'left' ? 'center' : currentAlign === 'center' ? 'right' : 'left')}
              title={`Alignment: ${currentAlign}`}
              className="p-1 rounded hover:bg-white/15 text-stone-300 hover:text-white cursor-pointer"
            >
              {currentAlign === 'left' ? (
                <AlignLeft className="w-3.5 h-3.5" />
              ) : currentAlign === 'right' ? (
                <AlignRight className="w-3.5 h-3.5" />
              ) : (
                <AlignCenter className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Lightbox */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              title="Fullscreen Lightbox"
              className="p-1 rounded hover:bg-white/15 text-stone-300 hover:text-white cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              title="Download image"
              className="p-1 rounded hover:bg-white/15 text-stone-300 hover:text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Replace image */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Replace image"
              className="p-1 rounded hover:bg-white/15 text-stone-300 hover:text-white cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={onDelete}
              title="Delete image"
              className="p-1 rounded hover:bg-rose-500/30 text-rose-300 hover:text-rose-100 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Image Container with subtle rounded border */}
          <div
            onClick={() => setIsLightboxOpen(true)}
            className="w-full overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 cursor-zoom-in group-hover:shadow-md transition-all"
          >
            <img
              src={imgData.url}
              alt={imgData.caption || imgData.name || 'Note attachment'}
              className="w-full h-auto object-cover max-h-[700px] block"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>

          {/* Inline Editable Caption */}
          <div className="w-full mt-1.5 px-2">
            <input
              type="text"
              value={imgData.caption || ''}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="w-full text-center text-xs text-stone-500 dark:text-stone-400 placeholder:text-stone-300 dark:placeholder:text-stone-600 bg-transparent outline-none focus:border-b focus:border-amber-500/50 pb-0.5 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom Modal */}
      {isLightboxOpen && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
        >
          {/* Lightbox Header Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10"
          >
            <div className="flex items-center gap-2 max-w-sm truncate text-xs font-semibold">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span className="truncate">{imgData.name || imgData.caption || 'Image Preview'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxZoom(Math.max(50, lightboxZoom - 20))}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs px-1 select-none">{lightboxZoom}%</span>
              <button
                type="button"
                onClick={() => setLightboxZoom(Math.min(300, lightboxZoom + 20))}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                title="Copy Image URL"
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer ml-2"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Centered Image with Zoom */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="overflow-auto max-w-full max-h-[85vh] flex items-center justify-center p-4"
          >
            <img
              src={imgData.url}
              alt={imgData.caption || 'Preview'}
              style={{ transform: `scale(${lightboxZoom / 100})` }}
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl shadow-2xl transition-transform duration-150"
            />
          </div>

          {/* Caption in lightbox */}
          {imgData.caption && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-6 text-center text-xs text-white/80 bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full max-w-md truncate"
            >
              {imgData.caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
