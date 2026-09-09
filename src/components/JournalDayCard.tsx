import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  ExternalLink,
  Headphones,
  Globe,
  Map as MapIcon,
  Plus,
  Sparkles,
  Trash2,
  Video,
  Eye,
  EyeOff,
  FileText,
  ArrowUpRight,
  MapPin
} from 'lucide-react';
import { CalendarEvent, TimelineItem } from '../types';
import { TimelineCard } from './TimelineCard';
import { LeafletMap } from './LeafletMap';
import { attachGeoCorrelationToItems } from '../utils/geoCorrelation';

interface JournalDayCardProps {
  dateKey: string;
  dateObj: Date;
  isToday: boolean;
  isCurrentSelected: boolean;
  items: TimelineItem[];
  allTimelineData?: TimelineItem[];
  events: CalendarEvent[];
  dailyNote: string;
  onSaveDailyNote: (text: string) => void;
  onOpenAddEventForDate: (dateKey: string) => void;
  onDeleteEvent: (id: string | number) => void;
  onSelectBrowser?: (item: TimelineItem) => void;
  onShowTrackProfile?: (track: string, artist?: string) => void;
  onShowArtistProfile?: (artist: string) => void;
  onShowVideoProfile?: (title: string, channel?: string) => void;
  onShowChannelProfile?: (channel: string) => void;
  onShowDomainProfile?: (domain: string) => void;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
  onResolveGeo?: (lat: number, lng: number) => void;
  onSelectPhoto?: (item: TimelineItem) => void;
  onOpenInNotes?: (dateKey: string) => void;
  onOpenNote?: (noteTitle: string) => void;
  luminance?: 'light' | 'dark';
  theme?: 'solid-glass' | 'liquid-glass';
}

export const JournalDayCard: React.FC<JournalDayCardProps> = React.memo(({
  dateKey,
  dateObj,
  isToday,
  isCurrentSelected,
  items,
  allTimelineData,
  events,
  dailyNote,
  onSaveDailyNote,
  onOpenAddEventForDate,
  onDeleteEvent,
  onSelectBrowser,
  onShowTrackProfile,
  onShowArtistProfile,
  onShowVideoProfile,
  onShowChannelProfile,
  onShowDomainProfile,
  onOpenMapModal,
  onResolveGeo,
  onSelectPhoto,
  onOpenInNotes,
  onOpenNote,
  luminance = 'dark',
  theme = 'solid-glass'
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const [noteText, setNoteText] = useState(dailyNote || '');
  const cardRef = useRef<HTMLDivElement>(null);

  // Sync local note text with external changes
  useEffect(() => {
    setNoteText(dailyNote || '');
  }, [dailyNote]);

  const handleNoteBlur = () => {
    setIsNoteFocused(false);
    if (noteText !== dailyNote) {
      onSaveDailyNote(noteText);
    }
  };

  // Attach geo-correlation metadata so non-map items know their location context
  const correlatedDayItems = useMemo(() => {
    const candidateSource = (allTimelineData && allTimelineData.length > 0)
      ? allTimelineData
      : items;
    return attachGeoCorrelationToItems(items, candidateSource);
  }, [items, allTimelineData]);

  const mapItems = useMemo(() => items.filter(s => s.type === 'maps'), [items]);
  const spotifyCount = useMemo(() => items.filter(s => s.type === 'spotify').length, [items]);
  const youtubeCount = useMemo(() => items.filter(s => s.type === 'youtube').length, [items]);
  const browserCount = useMemo(() => items.filter(s => s.type === 'browser').length, [items]);
  const mapsCount = mapItems.length;
  const correlatedPlacesCount = useMemo(
    () => correlatedDayItems.filter(i => i.type !== 'maps' && i.correlatedLocation).length,
    [correlatedDayItems]
  );
  const totalCount = items.length + events.length;

  // Formatted date string in expressive editorial tone
  const formattedDayTitle = useMemo(() => {
    return dateObj.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }, [dateObj]);

  // Fast O(N) bucketing by hour using correlated items
  const itemsByHour = useMemo(() => {
    const buckets: { items: TimelineItem[]; events: CalendarEvent[] }[] = Array.from(
      { length: 24 },
      () => ({ items: [], events: [] })
    );

    events.forEach(ev => {
      if (ev.start) {
        const h = parseInt(ev.start.split(':')[0], 10);
        if (!isNaN(h) && h >= 0 && h < 24) {
          buckets[h].events.push(ev);
        }
      }
    });

    correlatedDayItems.forEach(it => {
      if (it.type !== 'maps' && it.dateObj) {
        const h = it.dateObj.getHours();
        if (h >= 0 && h < 24) {
          buckets[h].items.push(it);
        }
      }
    });

    return buckets;
  }, [correlatedDayItems, events]);

  const hoursRows = useMemo(() => {
    return itemsByHour.map((bucket, hour) => {
      if (bucket.items.length === 0 && bucket.events.length === 0) {
        return null;
      }

      const displayHour =
        hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;

      return (
        <div
          key={hour}
          className="space-y-3 pt-2"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] text-xs font-sans tracking-wide uppercase text-neutral-400 ring-1 ring-white/[0.06]">
            <Clock className="w-3 h-3 text-[#d4a373]" />
            <span>{displayHour}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bucket.events.map(ev => (
              <div
                key={ev.id}
                className="relative rounded-2xl bg-[#171614]/70 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.05] hover:ring-white/[0.12] transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start font-bold">
                    <span className="flex items-center gap-1.5 font-serif font-medium text-sm sm:text-base text-neutral-100">
                      • {ev.title}
                    </span>
                    <button
                      aria-label="Delete Event"
                      onClick={() => onDeleteEvent(ev.id)}
                      className="text-neutral-500 hover:text-rose-400 p-1 rounded-md hover:bg-white/[0.05] cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {ev.description && (
                    <p className="mt-1 font-serif italic text-xs text-neutral-300 leading-relaxed font-normal">
                      {ev.description}
                    </p>
                  )}
                </div>
                {ev.start && (
                  <div className="mt-2.5 pt-1.5 border-t border-white/[0.06] flex items-center justify-between font-sans text-xs tracking-wide uppercase text-neutral-400">
                    <span>Scheduled Time</span>
                    <span className="font-mono text-neutral-300">{ev.start} {ev.end ? `→ ${ev.end}` : ''}</span>
                  </div>
                )}
              </div>
            ))}
            {bucket.items.map(item => (
              <div key={item.id} className="w-full">
                <TimelineCard
                  item={item}
                  onSelectBrowser={onSelectBrowser}
                  onShowTrackProfile={onShowTrackProfile}
                  onShowArtistProfile={onShowArtistProfile}
                  onShowVideoProfile={onShowVideoProfile}
                  onShowChannelProfile={onShowChannelProfile}
                  onShowDomainProfile={onShowDomainProfile}
                  onOpenMapModal={onOpenMapModal}
                  onResolveGeo={onResolveGeo}
                  onSelectPhoto={onSelectPhoto}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }).filter(Boolean);
  }, [itemsByHour, onDeleteEvent, onSelectBrowser, onShowTrackProfile, onShowArtistProfile, onShowVideoProfile, onShowChannelProfile, onShowDomainProfile, onOpenMapModal, onResolveGeo, onSelectPhoto]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 26, stiffness: 220 }}
      id={`journal-day-${dateKey}`}
      ref={cardRef}
      className={`scroll-mt-16 mb-8 rounded-2xl bg-[#171614]/70 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.35)] ring-1 ${
        isCurrentSelected
          ? 'ring-[#d4a373] shadow-[0_6px_32px_rgba(212,163,115,0.18)]'
          : isToday
          ? 'ring-[#d4a373]/60'
          : 'ring-white/[0.05] hover:ring-white/[0.12]'
      } backdrop-blur-md transition-all duration-300`}
    >
      {/* Editorial Day Header Bar */}
      <div className="sticky top-0 z-20 py-3 px-4 mb-4 rounded-xl flex items-center justify-between gap-3 bg-[#121110]/90 backdrop-blur-md ring-1 ring-white/[0.05] shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] text-[#d4a373] flex items-center justify-center shrink-0 font-serif font-semibold text-sm">
            {dateObj.getDate()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif text-base sm:text-lg font-medium text-neutral-100 leading-tight">
                {formattedDayTitle}
              </h3>
              {isToday && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#d4a373]/20 text-[#d4a373] ring-1 ring-[#d4a373]/30 font-sans text-xs tracking-wide uppercase">
                  Today
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 font-sans text-xs tracking-wide uppercase text-neutral-400 flex-wrap">
              <span>{totalCount} item{totalCount !== 1 ? 's' : ''}</span>
              {spotifyCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[#d4a373]">
                  • <Headphones className="w-2.5 h-2.5" /> {spotifyCount}
                </span>
              )}
              {youtubeCount > 0 && (
                <span className="inline-flex items-center gap-1 text-rose-400">
                  • <Video className="w-2.5 h-2.5" /> {youtubeCount}
                </span>
              )}
              {browserCount > 0 && (
                <span className="inline-flex items-center gap-1 text-neutral-300">
                  • <Globe className="w-2.5 h-2.5" /> {browserCount}
                </span>
              )}
              {mapsCount > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  • <MapIcon className="w-2.5 h-2.5" /> {mapsCount}
                </span>
              )}
              {correlatedPlacesCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-[#d4a373] bg-[#d4a373]/10 px-1.5 py-0.5 rounded-full ring-1 ring-[#d4a373]/20"
                  title={`${correlatedPlacesCount} items linked to places on this day`}
                >
                  <MapPin className="w-2.5 h-2.5 text-[#d4a373]" /> {correlatedPlacesCount} linked
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Day Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenInNotes && (
            <button
              aria-label="Open in Notes"
              onClick={() => onOpenInNotes(dateKey)}
              className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/[0.06] text-[#d4a373] font-sans text-xs tracking-wide uppercase font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Open or create note for this day in Notes app"
            >
              <FileText className="w-3.5 h-3.5 text-[#d4a373]" />
              <span className="hidden sm:inline">Open in Notes</span>
              <ArrowUpRight className="w-3 h-3 text-[#d4a373] opacity-80" />
            </button>
          )}

          {mapsCount > 0 && (
            <button
              aria-label="Toggle Day Movement Map"
              onClick={() => setShowMap(!showMap)}
              className={`px-2.5 py-1 rounded-xl font-sans text-xs tracking-wide uppercase font-semibold flex items-center gap-1.5 transition-all cursor-pointer ring-1 ${
                showMap
                  ? 'bg-[#d4a373]/20 text-[#d4a373] ring-[#d4a373]/30'
                  : 'bg-white/[0.04] ring-white/[0.06] text-neutral-300 hover:bg-white/[0.08]'
              }`}
              title="Toggle Day Movement Map"
            >
              <MapIcon className="w-3.5 h-3.5 text-[#d4a373]" />
              <span className="hidden sm:inline">{showMap ? 'Hide Map' : 'Day Map'}</span>
            </button>
          )}

          <button
            aria-label="Add Event"
            onClick={() => onOpenAddEventForDate(dateKey)}
            className="px-3 py-1 rounded-xl bg-[#d4a373] hover:bg-[#e0a96d] text-neutral-950 font-sans text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Add event on this date"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Event</span>
          </button>

          <button
            aria-label={isExpanded ? 'Collapse day' : 'Expand day'}
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/[0.06] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse day' : 'Expand day'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Day Content */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Standalone Card: Daily Reflection / Journal Entry Box */}
          <div className="relative rounded-2xl bg-white/[0.02] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.05] hover:ring-white/[0.10] backdrop-blur-md transition-all duration-300">
            <div className="flex items-center justify-between mb-2.5">
              <label className="font-sans text-xs tracking-wide uppercase text-neutral-400 flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5 text-[#d4a373]" /> Daily Reflections & Journal
              </label>
              <div className="flex items-center gap-2">
                {dailyNote && !isNoteFocused && (
                  <span className="font-sans text-xs tracking-wide uppercase text-[#d4a373]">
                    ✓ Saved
                  </span>
                )}
                {onOpenInNotes && (
                  <button
                    aria-label="Full Editor"
                    type="button"
                    onClick={() => onOpenInNotes(dateKey)}
                    className="font-sans text-xs font-medium text-[#d4a373] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Editor</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onFocus={() => setIsNoteFocused(true)}
              onBlur={handleNoteBlur}
              placeholder={`Write your thoughts, memories, reflections, or notes for ${dateKey}...`}
              rows={noteText || isNoteFocused ? 4 : 2}
              className="w-full bg-transparent border-0 outline-none text-neutral-100 placeholder:text-neutral-500 font-serif text-base sm:text-lg leading-relaxed resize-y transition-all focus:ring-0 p-0 mt-1"
            />
            {/* Quick interactive links preview if text has [[...]] and not focused */}
            {!isNoteFocused && noteText && /\[\[.*?\]\]/.test(noteText) && onOpenNote && (
              <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center gap-1.5 flex-wrap">
                <span className="font-sans text-xs tracking-wide uppercase text-neutral-400">Interlinks:</span>
                {(Array.from(new Set(noteText.match(/\[\[(.*?)\]\]/g) || [])) as string[]).map((m) => {
                  const title = m.slice(2, -2).trim();
                  return (
                    <button
                      aria-label="Link to note"
                      key={m}
                      type="button"
                      onClick={() => onOpenNote(title)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#d4a373]/10 hover:bg-[#d4a373]/20 text-[#d4a373] font-sans text-xs font-medium cursor-pointer transition-colors ring-1 ring-[#d4a373]/20"
                    >
                      <span>{title}</span>
                      <ArrowUpRight className="w-2.5 h-2.5 text-[#d4a373]" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Standalone Card: Day Map (if toggled) */}
          {showMap && mapItems.length > 0 && (
            <div className="relative rounded-2xl bg-[#171614]/70 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.05] backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-serif text-sm font-medium text-neutral-100 flex items-center gap-1.5">
                  <MapIcon className="w-3.5 h-3.5 text-[#d4a373]" />
                  Day Movement Path ({mapItems.length} locations)
                </h4>
              </div>
              <div className="w-full h-72 rounded-xl overflow-hidden ring-1 ring-white/[0.08] shadow-inner relative z-0 isolate">
                <LeafletMap
                  containerId={`journal-day-map-${dateKey}`}
                  items={mapItems}
                  onPreviewOpen={onOpenMapModal}
                />
              </div>
            </div>
          )}

          {/* Activity & Event Items Feed */}
          {totalCount === 0 ? (
            <div className="py-6 px-4 text-center font-serif italic text-xs text-neutral-400 bg-white/[0.02] rounded-2xl ring-1 ring-white/[0.04]">
              No recorded activity or events for this date.
            </div>
          ) : (
            <div className="space-y-3">
              {hoursRows}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
});

JournalDayCard.displayName = 'JournalDayCard';
