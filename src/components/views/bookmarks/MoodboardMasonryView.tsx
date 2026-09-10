import React from 'react';
import { Columns3 } from 'lucide-react';
import { TimelineItem } from '../../../types';
import { MoodboardCard } from './MoodboardCard';
import {
  RaindropLayoutMode,
  MoodboardDisplayConfig
} from './RaindropViewMenu';

interface MoodboardMasonryViewProps {
  bookmarks: TimelineItem[];
  bookmarkNotes: Record<string, string>;
  bookmarkTags: Record<string, string[]>;
  sessionSnapshots?: Record<string, string>;
  onOpenEditModal: (item: TimelineItem) => void;
  onCopyLink: (url: string) => void;
  copiedUrl: string | null;
  onDeleteItem?: (id: string) => void;
  onSelectTag?: (tag: string) => void;
  onSelectItem?: (item: TimelineItem) => void;
  activeItem?: TimelineItem | null;
  layoutMode?: RaindropLayoutMode;
  moodboardConfig: MoodboardDisplayConfig;
  columnWidth?: 'compact' | 'standard' | 'wide' | 'fluid';
}

export const MoodboardMasonryView: React.FC<MoodboardMasonryViewProps> = ({
  bookmarks,
  bookmarkNotes,
  bookmarkTags,
  sessionSnapshots = {},
  onOpenEditModal,
  onCopyLink,
  copiedUrl,
  onDeleteItem,
  onSelectTag,
  onSelectItem,
  activeItem,
  moodboardConfig,
  columnWidth = 'standard'
}) => {
  // Multi-column masonry style based on column width
  const getMasonryColumnClass = () => {
    switch (columnWidth) {
      case 'compact':
        return 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4';
      case 'wide':
        return 'columns-1 sm:columns-2 lg:columns-3 2xl:columns-4 gap-5';
      case 'fluid':
        return 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4';
      case 'standard':
      default:
        return 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4';
    }
  };

  return (
    <div id="moodboard-masonry-view" className="space-y-5">
      {/* Masonry Grid: Images decide card size naturally without cropping */}
      {bookmarks.length > 0 ? (
        <div className={getMasonryColumnClass()}>
          {bookmarks.map(item => (
            <div key={item.id} className="mb-4 break-inside-avoid">
              <MoodboardCard
                item={item}
                notes={bookmarkNotes[item.url || '']}
                tags={bookmarkTags[item.url || ''] || []}
                snapshot={sessionSnapshots[item.url || '']}
                config={moodboardConfig}
                isSelected={activeItem?.id === item.id}
                onSelect={onSelectItem}
                onCopyLink={onCopyLink}
                onOpenEdit={onOpenEditModal}
                onSelectTag={onSelectTag}
                onDeleteItem={onDeleteItem}
                isDraggable={false}
                copiedUrl={copiedUrl}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl border border-dashed border-gray-300 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] space-y-2">
          <Columns3 className="w-8 h-8 mx-auto text-gray-400" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            No moodboard bookmarks match your search
          </h3>
          <p className="text-xs text-gray-500">
            Try resetting your tag or search filter, or add new bookmarks with images.
          </p>
        </div>
      )}
    </div>
  );
};
