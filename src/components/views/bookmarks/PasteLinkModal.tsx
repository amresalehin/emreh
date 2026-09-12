import React, { useState, useEffect } from 'react';
import {
  X,
  Link,
  Plus,
  Tag,
  Folder,
  Globe,
  Sparkles,
  Check,
  Clipboard,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { TimelineItem } from '../../../types';

export interface PasteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBookmark: (item: TimelineItem, note?: string, tags?: string[]) => void;
  existingCollections?: string[];
  existingTags?: string[];
  activeServiceOrPlatform?: string;
}

export const PasteLinkModal: React.FC<PasteLinkModalProps> = ({
  isOpen,
  onClose,
  onSaveBookmark,
  existingCollections = [],
  existingTags = [],
  activeServiceOrPlatform = 'manual'
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [collectionInput, setCollectionInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [servicePlatform, setServicePlatform] = useState(activeServiceOrPlatform || 'manual');
  const [detectedDomain, setDetectedDomain] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCopiedSuccess, setIsCopiedSuccess] = useState(false);

  // Auto-detect domain & check URL validity as user types
  useEffect(() => {
    const raw = urlInput.trim();
    if (!raw) {
      setDetectedDomain('');
      setIsValidUrl(false);
      setErrorMessage('');
      return;
    }

    let urlToTest = raw;
    if (!urlToTest.startsWith('http://') && !urlToTest.startsWith('https://')) {
      urlToTest = `https://${urlToTest}`;
    }

    try {
      const parsed = new URL(urlToTest);
      if (parsed.hostname && parsed.hostname.includes('.')) {
        setDetectedDomain(parsed.hostname.replace(/^www\./, ''));
        setIsValidUrl(true);
        setErrorMessage('');
        // Suggest title if empty
        if (!titleInput.trim()) {
          const pathEnd = parsed.pathname.split('/').filter(Boolean).pop();
          if (pathEnd && pathEnd.length > 2) {
            const formatted = decodeURIComponent(pathEnd)
              .replace(/[-_]/g, ' ')
              .replace(/\.[a-z0-9]+$/i, '');
            setTitleInput(formatted.charAt(0).toUpperCase() + formatted.slice(1));
          } else {
            setTitleInput(parsed.hostname.replace(/^www\./, ''));
          }
        }
      } else {
        setDetectedDomain('');
        setIsValidUrl(false);
      }
    } catch {
      setDetectedDomain('');
      setIsValidUrl(false);
    }
  }, [urlInput]);

  // Read clipboard automatically or on button click
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setUrlInput(text.trim());
          setIsCopiedSuccess(true);
          setTimeout(() => setIsCopiedSuccess(false), 2000);
        }
      }
    } catch (e) {
      console.warn('Clipboard read permission denied or unavailable', e);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const t = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (t && !tagsList.includes(t)) {
      setTagsList(prev => [...prev, t]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTagsList(prev => prev.filter(x => x !== t));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = urlInput.trim();
    if (!finalUrl) {
      setErrorMessage('Please enter a valid website URL');
      return;
    }

    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }

    let domain = detectedDomain;
    try {
      const parsed = new URL(finalUrl);
      domain = parsed.hostname.replace(/^www\./, '');
    } catch {
      setErrorMessage('Invalid URL format');
      return;
    }

    const now = new Date();
    const finalTitle = titleInput.trim() || domain;

    const newItem: TimelineItem = {
      id: `bookmark-manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'browser',
      title: finalTitle,
      subtitle: domain,
      url: finalUrl,
      domain: domain,
      transition: 'BOOKMARK',
      platform: servicePlatform || 'manual',
      dateObj: now,
      ts: now.toISOString(),
      category: collectionInput.trim() || 'Unsorted',
      cover: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    };

    onSaveBookmark(newItem, noteInput.trim() || undefined, tagsList.length > 0 ? tagsList : undefined);

    // Reset and close
    setUrlInput('');
    setTitleInput('');
    setCollectionInput('');
    setTagInput('');
    setTagsList([]);
    setNoteInput('');
    setErrorMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-[#18181b] rounded-3xl max-w-lg w-full border border-gray-200/80 dark:border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Link className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Paste Link to Bookmark
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Instantly save any web address with notes and tags
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* URL Input with Clipboard Paste Action */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Web Address / URL *</span>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Clipboard className="w-3 h-3" />
                <span>{isCopiedSuccess ? 'Pasted!' : 'Paste from clipboard'}</span>
              </button>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                autoFocus
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com/article..."
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
              />
              {isValidUrl && (
                <div className="absolute right-3 text-emerald-500 flex items-center gap-1 text-[11px] font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{detectedDomain}</span>
                </div>
              )}
            </div>
            {errorMessage && (
              <p className="text-[11px] text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errorMessage}</span>
              </p>
            )}
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Title / Name
            </label>
            <input
              type="text"
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              placeholder={detectedDomain ? `e.g. My saved page on ${detectedDomain}` : 'e.g. Design Systems Guide'}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Destination Service / Collection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Folder / Collection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-amber-500" />
                <span>Folder / Collection</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="bookmark-collections-list"
                  value={collectionInput}
                  onChange={e => setCollectionInput(e.target.value)}
                  placeholder="e.g. Work, Reading, Design..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-blue-500"
                />
                <datalist id="bookmark-collections-list">
                  {existingCollections.map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Target Category / Platform */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>Service / Group</span>
              </label>
              <select
                value={servicePlatform}
                onChange={e => setServicePlatform(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="manual">Manual Quick Save</option>
                <option value="raindrop">Raindrop.io</option>
                <option value="pinterest">Pinterest</option>
                <option value="browser">Browser Bookmarks</option>
                <option value="pocket">Pocket</option>
                <option value="pinboard">Pinboard</option>
                <option value="linkding">Linkding</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-purple-500" />
              <span>Tags</span>
            </label>
            {tagsList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {tagsList.map(t => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-medium flex items-center gap-1"
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-purple-900 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(e);
                  }
                }}
                placeholder="Add tag and press Enter..."
                className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-purple-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
                className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer transition-colors"
              >
                Add
              </button>
            </div>
            {existingTags.length > 0 && tagsList.length === 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-[10px] text-gray-400 self-center">Suggestions:</span>
                {existingTags.slice(0, 5).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTagsList(prev => [...prev, t])}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-gray-600 dark:text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Personal Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Personal Note / Excerpt (optional)
            </label>
            <textarea
              rows={2}
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              placeholder="Why you saved this link or key highlights..."
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-blue-500 resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!urlInput.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save Bookmark</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
