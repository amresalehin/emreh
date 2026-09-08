import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Tag,
  StickyNote,
  Layers,
  Calendar,
  Info,
  Link,
  Hash,
  Clock,
  X,
  Sparkles
} from 'lucide-react';
import { TimelineItem } from '../../../types';

interface RaindropSearchDropdownProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  value?: string;
  onChange?: (query: string) => void;
  bookmarks?: TimelineItem[];
  bookmarkNotes?: Record<string, string>;
  bookmarkTags?: Record<string, string[]>;
  tags?: string[];
  collections?: string[];
  totalCount?: number;
  placeholder?: string;
  className?: string;
}

export const RaindropSearchDropdown: React.FC<RaindropSearchDropdownProps> = ({
  searchQuery: propSearchQuery,
  onSearchChange: propOnSearchChange,
  value: propValue,
  onChange: propOnChange,
  bookmarks = [],
  bookmarkNotes = {},
  bookmarkTags = {},
  tags = [],
  collections = [],
  totalCount,
  placeholder = 'Search bookmarks, notes, or tags...',
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQuery = propValue !== undefined ? propValue : (propSearchQuery || '');
  const handleQueryChange = (val: string) => {
    if (propOnChange) propOnChange(val);
    if (propOnSearchChange) propOnSearchChange(val);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Compute dynamic counts matching Screenshot 1
  const stats = useMemo(() => {
    // 1. Total unique tags count
    const tagSet = new Set<string>();
    (Object.values(bookmarkTags) as string[][]).forEach(tList => {
      if (Array.isArray(tList)) {
        tList.forEach(t => tagSet.add(t.toLowerCase()));
      }
    });
    if (tags.length > 0) {
      tags.forEach(t => tagSet.add(t.toLowerCase()));
    }
    const tagCount = tagSet.size;

    // 2. Bookmarks with notes
    let notesCount = 0;
    bookmarks.forEach(b => {
      const n = (b.url && bookmarkNotes[b.url]) || b.description;
      if (n && n.trim().length > 0) notesCount++;
    });

    // 3. Types (images, articles, links, audio, video)
    const types = new Set<string>();
    bookmarks.forEach(b => {
      if (b.cover || b.image_url) types.add('image');
      if (b.platform?.toLowerCase().includes('spotify') || b.platform?.toLowerCase().includes('audio')) types.add('audio');
      if (b.platform?.toLowerCase().includes('youtube') || b.platform?.toLowerCase().includes('video')) types.add('video');
      types.add('link');
    });
    const typeCount = Math.max(types.size, 5);

    // 4. Date of creation (unique days)
    const days = new Set<string>();
    bookmarks.forEach(b => {
      if (b.ts) days.add(b.ts.slice(0, 10));
    });
    const dateCount = Math.max(days.size, 1);

    // 5. Without tags
    let withoutTagsCount = 0;
    bookmarks.forEach(b => {
      const t = (b.url && bookmarkTags[b.url]) || [];
      if (t.length === 0) withoutTagsCount++;
    });

    // Format number to 'K' if >= 1000
    const formatCount = (n: number) => {
      if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
      return String(n);
    };

    return {
      tagCount: formatCount(tagCount),
      notesCount: formatCount(notesCount),
      typeCount: formatCount(types.size),
      dateCount: formatCount(days.size),
      withoutTagsCount: formatCount(withoutTagsCount)
    };
  }, [bookmarks, bookmarkNotes, bookmarkTags, tags]);

  // Search operator quick shortcuts
  const searchOperators = [
    { query: 'type:image', label: 'type:image', desc: 'Images' },
    { query: 'type:video', label: 'type:video', desc: 'Videos' },
    { query: 'type:article', label: 'type:article', desc: 'Articles' },
    { query: 'note:true', label: 'note:true', desc: 'With notes' },
    { query: 'notag:true', label: 'notag:true', desc: 'Untagged' },
    { query: 'in:title ', label: 'in:title <text>', desc: 'Title' }
  ];

  const handleSelectSuggested = (op: string) => {
    handleQueryChange(op);
    setIsFocused(false);
  };

  return (
    <div className={`relative w-full min-w-0 ${className}`} ref={containerRef}>
      {/* Search Input Bar */}
      <div className="relative flex items-center w-full min-w-0">
        <Search className="w-4 h-4 absolute left-3 text-gray-400 pointer-events-none shrink-0" />
        <input
          id="raindrop-bookmark-search-input"
          ref={inputRef}
          type="text"
          value={currentQuery}
          onChange={e => handleQueryChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder || 'Search bookmarks, notes, or #tags...'}
          className="w-full min-w-0 pl-9 pr-8 py-2 bg-white dark:bg-[#18181b] border border-gray-200/90 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#0089FF] dark:focus:border-[#0089FF] transition-all shadow-2xs"
        />
        {currentQuery ? (
          <button
            type="button"
            onClick={() => handleQueryChange('')}
            className="absolute right-2.5 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsFocused(prev => !prev)}
            className="absolute right-2.5 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer shrink-0"
            title="Search options & operators"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Raindrop Search Suggestion Dropdown */}
      {isFocused && (
        <div
          id="raindrop-search-dropdown-menu"
          className="absolute left-0 right-0 sm:right-auto mt-2 z-50 rounded-2xl bg-[#202124] border border-neutral-700/90 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none max-h-[440px] flex flex-col text-gray-200 w-full sm:w-[380px] max-w-[calc(100vw-2rem)]"
        >
          {/* Header Bar with Sliders Icon */}
          <div className="px-3.5 py-2.5 border-b border-neutral-700/80 flex items-center justify-between text-xs font-bold text-gray-300">
            <span>Search Filters</span>
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
          </div>

          <div className="overflow-y-auto divide-y divide-neutral-700/60 p-1.5 space-y-2">
            {/* Suggested Section */}
            <div>
              <div className="text-[11px] font-semibold text-gray-400 px-2.5 py-1">
                Suggested
              </div>

              <div className="space-y-0.5">
                {/* Tag */}
                <button
                  type="button"
                  onClick={() => handleSelectSuggested('#')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <Hash className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                    <span className="text-xs text-gray-200 group-hover:text-white">Tag</span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium">{stats.tagCount}</span>
                </button>

                {/* Notes */}
                <button
                  type="button"
                  onClick={() => handleSelectSuggested('note:true')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <StickyNote className="w-4 h-4 text-amber-400/90" />
                    <span className="text-xs text-gray-200 group-hover:text-white">Notes</span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium">{stats.notesCount}</span>
                </button>

                {/* Type */}
                <button
                  type="button"
                  onClick={() => handleSelectSuggested('type:')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                    <span className="text-xs text-gray-200 group-hover:text-white">Type</span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium">{stats.typeCount}</span>
                </button>

                {/* Date of creation */}
                <button
                  type="button"
                  onClick={() => handleSelectSuggested('date:')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                    <span className="text-xs text-gray-200 group-hover:text-white">Date of creation</span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium">{stats.dateCount}</span>
                </button>

                {/* In title/description */}
                <button
                  type="button"
                  onClick={() => handleSelectSuggested('in:title ')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <Info className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                    <span className="text-xs text-gray-200 group-hover:text-white">In title/description</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">in:title</span>
                </button>

                {/* In URL */}
                <button
                  type="button"
                  onClick={() => handleSelectSuggested('in:url ')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <Link className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                    <span className="text-xs text-gray-200 group-hover:text-white">In URL</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">in:url</span>
                </button>

                {/* Without tags */}
                <button
                  type="button"
                  onClick={() => handleSelectSuggested('notag:true')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <Hash className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                    <span className="text-xs text-gray-200 group-hover:text-white">Without tags</span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium">{stats.withoutTagsCount}</span>
                </button>
              </div>
            </div>

            {/* Quick Operators Section */}
            <div className="pt-2">
              <div className="text-[11px] font-semibold text-gray-400 px-2.5 py-1">
                Operators
              </div>

              <div className="space-y-0.5">
                {searchOperators.map((op, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggested(op.query)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Search className="w-3.5 h-3.5 text-gray-400 shrink-0 group-hover:text-blue-400" />
                      <span className="text-xs text-gray-300 font-mono truncate group-hover:text-white">
                        {op.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-sans shrink-0 ml-2">
                      {op.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
