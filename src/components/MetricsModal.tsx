import React from 'react';
import { X, Music, Youtube, BarChart2, ExternalLink, Globe, MapPin, Sparkles, Clock, Calendar, Navigation } from 'lucide-react';
import { TimelineItem, MetricsModalState } from '../types';
import { formatDuration, parseSpotifyId, buildGoogleMapsUrl, buildGoogleMapsEmbedUrl, getPlaceCategory } from '../utils/dataParser';
import { extractDomain } from '../utils/urlMetadata';
import { LocationMapView } from './maps/LocationMapView';

interface MetricsModalProps {
  isOpen?: boolean;
  modalState?: MetricsModalState;
  onClose: () => void;
  type?: string;
  title?: string;
  subtitle?: string;
  processedData?: TimelineItem[];
  rawData?: TimelineItem[];
  onJumpToDate?: (date: Date) => void;
  onSelectTrack?: (track: string, artist?: string) => void;
  onSelectArtist?: (artist: string) => void;
  onSelectVideo?: (title: string, channel?: string) => void;
  onSelectChannel?: (channel: string) => void;
  onSelectBrowserUrl?: (url: string, title?: string, domain?: string) => void;
}

export const MetricsModal: React.FC<MetricsModalProps> = ({
  isOpen: propIsOpen,
  modalState,
  onClose,
  type: propType,
  title: propTitle,
  subtitle: propSubtitle,
  processedData,
  rawData: propRawData,
  onJumpToDate,
  onSelectTrack,
  onSelectArtist,
  onSelectVideo,
  onSelectChannel,
  onSelectBrowserUrl
}) => {
  const isOpen = propIsOpen !== undefined ? propIsOpen : (modalState ? modalState.isOpen : false);
  if (!isOpen) return null;

  const type = propType || (modalState ? modalState.type : '');
  const title = propTitle || (modalState ? modalState.title : '');
  const subtitle = propSubtitle || (modalState ? modalState.subtitle : '');
  const rawData = processedData || propRawData || [];

  const handleSelectTrack = onSelectTrack || ((t: string, a?: string) => {});
  const handleSelectArtist = onSelectArtist || ((a: string) => {});
  const handleSelectVideo = onSelectVideo || ((t: string, c?: string) => {});
  const handleSelectChannel = onSelectChannel || ((c: string) => {});
  const handleSelectBrowserUrl = onSelectBrowserUrl || ((u: string) => {});

  // 1. Track Profile
  if (type === 'track') {
    const filtered = rawData.filter(d =>
      d.type === 'spotify' &&
      (d.title === title || d.master_metadata_track_name === title) &&
      (!subtitle || d.subtitle === subtitle || d.master_metadata_album_artist_name === subtitle)
    );
    const totalStreams = filtered.length;
    const totalMs = filtered.reduce((acc, curr) => acc + (curr.ms_played || 0), 0);
    const dates = filtered.map(d => new Date(d.ts).getTime()).filter(t => !isNaN(t));
    const firstPlayedStr = dates.length > 0 ? new Date(Math.min(...dates)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
    const lastPlayedStr = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
    const sampleWithUri = filtered.find(d => d.spotify_track_uri);
    const trackId = sampleWithUri ? parseSpotifyId(sampleWithUri.spotify_track_uri) : (filtered[0]?.trackId || null);
    const sortedStreams = [...filtered].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    return (
      <div className="fixed inset-0 z-[230] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className="bg-white dark:bg-[#151515] rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] relative z-10 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
          <div className="absolute top-4 right-4 z-20">
            <button aria-label="Action" onClick={onClose} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 shadow-sm">
                <Music className="w-7 h-7" />
              </div>
              <div className="min-w-0 pr-6">
                <span className="bg-purple-500/10 text-purple-500 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">Track Profile</span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate mt-1 tracking-tight" title={title}>{title}</h3>
                <p
                  className="text-xs text-emerald-500 truncate cursor-pointer hover:underline mt-0.5 font-medium"
                  onClick={() => subtitle && handleSelectArtist(subtitle)}
                >
                  {subtitle || 'Unknown Artist'}
                </p>
              </div>
            </div>

            {trackId && (
              <div className="mb-4 rounded-2xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-800 bg-black">
                <iframe title="Content"
                  src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator`}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="block"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Total Plays</div>
                <div className="font-bold text-gray-900 dark:text-white text-lg mt-0.5">{totalStreams.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Time Listened</div>
                <div className="font-bold text-emerald-500 text-lg mt-0.5">{((totalMs) / (1000 * 60 * 60)).toFixed(1)}h</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">First Played</div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-1 truncate">{firstPlayedStr}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Last Played</div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-1 truncate">{lastPlayedStr}</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">All Streams ({sortedStreams.length})</h4>
              <div className="bg-gray-50 dark:bg-gray-900/50 px-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/80 max-h-48 overflow-y-auto">
                {sortedStreams.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onJumpToDate) onJumpToDate(new Date(s.ts));
                    }}
                    className="flex justify-between items-center py-2.5 border-b border-gray-100 dark:border-gray-800/60 last:border-0 text-xs cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="truncate pr-2 text-gray-600 dark:text-gray-300">
                      {new Date(s.ts).toLocaleString()}
                    </div>
                    <span className="text-emerald-500 font-mono shrink-0">{formatDuration(s.ms_played)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Artist Profile
  if (type === 'artist') {
    const artistName = title || subtitle || '';
    const filtered = rawData.filter(d =>
      d.type === 'spotify' &&
      (d.subtitle === artistName || d.master_metadata_album_artist_name === artistName)
    );
    const totalStreams = filtered.length;
    const totalMs = filtered.reduce((acc, curr) => acc + (curr.ms_played || 0), 0);
    const uniqueTracks = new Set(filtered.map(d => d.title || d.master_metadata_track_name)).size;
    const dates = filtered.map(d => new Date(d.ts).getTime()).filter(t => !isNaN(t));
    const firstPlayedStr = dates.length > 0 ? new Date(Math.min(...dates)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
    const lastPlayedStr = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

    const trackCounts: Record<string, number> = {};
    filtered.forEach(d => {
      const t = d.title || d.master_metadata_track_name;
      if (t) trackCounts[t] = (trackCounts[t] || 0) + 1;
    });
    const allArtistTracks = Object.entries(trackCounts).sort((a, b) => b[1] - a[1]);
    const maxTrkCount = allArtistTracks.length > 0 ? allArtistTracks[0][1] : 1;

    return (
      <div className="fixed inset-0 z-[230] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className="bg-white dark:bg-[#151515] rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] relative z-10 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
          <div className="absolute top-4 right-4 z-20">
            <button aria-label="Action" onClick={onClose} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-lg shadow-emerald-500/20">
                {artistName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 pr-6">
                <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">Artist Profile</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate mt-1 tracking-tight" title={artistName}>{artistName}</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Total Streams</div>
                <div className="font-bold text-gray-900 dark:text-white text-lg mt-0.5">{totalStreams.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Listening Time</div>
                <div className="font-bold text-emerald-500 text-lg mt-0.5">{((totalMs) / (1000 * 60 * 60)).toFixed(1)}h</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Unique Tracks</div>
                <div className="font-bold text-purple-500 text-lg mt-0.5">{uniqueTracks.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Active Period</div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-1 truncate">{firstPlayedStr} - {lastPlayedStr}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Top Songs ({allArtistTracks.length})</h4>
                <div className="space-y-2 bg-gray-50 dark:bg-gray-900/50 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/80 max-h-48 overflow-y-auto">
                  {allArtistTracks.map(([trk, count]) => (
                    <div
                      key={trk}
                      className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity py-1.5"
                      onClick={() => handleSelectTrack(trk, artistName)}
                    >
                      <div className="flex justify-between items-end text-xs mb-1">
                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate pr-2 hover:underline">{trk}</span>
                        <span className="text-gray-400 shrink-0 font-mono">{count} plays</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(count / maxTrkCount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. YouTube Video Profile
  if (type === 'video' || type === 'youtube-video') {
    const filtered = rawData.filter(d =>
      d.type === 'youtube' &&
      d.title === title &&
      (!subtitle || d.subtitle === subtitle)
    );
    const totalViews = filtered.length;
    const sample = filtered[0];
    const videoId = sample?.youtube_video_id;
    const dates = filtered.map(d => new Date(d.ts).getTime()).filter(t => !isNaN(t));
    const firstWatchedStr = dates.length > 0 ? new Date(Math.min(...dates)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
    const lastWatchedStr = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
    const sortedViews = [...filtered].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    return (
      <div className="fixed inset-0 z-[230] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className="bg-white dark:bg-[#151515] rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] relative z-10 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
          <div className="absolute top-4 right-4 z-20">
            <button aria-label="Action" onClick={onClose} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 shadow-sm">
                <Youtube className="w-7 h-7" />
              </div>
              <div className="min-w-0 pr-6">
                <span className="bg-red-500/10 text-red-500 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">Video Profile</span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate mt-1 tracking-tight" title={title}>{title}</h3>
                <p
                  className="text-xs text-red-500 truncate cursor-pointer hover:underline mt-0.5 font-medium"
                  onClick={() => subtitle && handleSelectChannel(subtitle)}
                >
                  {subtitle || 'YouTube Channel'}
                </p>
              </div>
            </div>

            {videoId && (
              <div className="mb-4 rounded-2xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-800 bg-black aspect-video">
                <iframe title="Content"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Times Watched</div>
                <div className="font-bold text-gray-900 dark:text-white text-lg mt-0.5">{totalViews.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">First Watched</div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-1 truncate">{firstWatchedStr}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Last Watched</div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-1 truncate">{lastWatchedStr}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Link</div>
                {sample?.titleUrl ? (
                  <a href={sample.titleUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-red-500 hover:underline font-semibold mt-1 block truncate">
                    Open on YouTube ↗
                  </a>
                ) : (
                  <div className="text-xs text-gray-400 mt-1">N/A</div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Watch History ({sortedViews.length})</h4>
              <div className="bg-gray-50 dark:bg-gray-900/50 px-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/80 max-h-48 overflow-y-auto">
                {sortedViews.map((v, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onJumpToDate) onJumpToDate(new Date(v.ts));
                    }}
                    className="flex justify-between items-center py-2.5 border-b border-gray-100 dark:border-gray-800/60 last:border-0 text-xs cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="truncate pr-2 text-gray-600 dark:text-gray-300">
                      {new Date(v.ts).toLocaleString()}
                    </div>
                    <span className="text-red-500 font-mono shrink-0">Watched</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. YouTube Channel Profile
  if (type === 'channel' || type === 'youtube-channel') {
    const channelName = title || subtitle || '';
    const filtered = rawData.filter(d =>
      d.type === 'youtube' &&
      d.subtitle === channelName
    );
    const totalViews = filtered.length;
    const uniqueVideos = new Set(filtered.map(d => d.title)).size;
    const dates = filtered.map(d => new Date(d.ts).getTime()).filter(t => !isNaN(t));
    const firstWatchedStr = dates.length > 0 ? new Date(Math.min(...dates)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
    const lastWatchedStr = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

    const videoCounts: Record<string, number> = {};
    filtered.forEach(d => {
      if (d.title) videoCounts[d.title] = (videoCounts[d.title] || 0) + 1;
    });
    const allChannelVideos = Object.entries(videoCounts).sort((a, b) => b[1] - a[1]);
    const maxVidCount = allChannelVideos.length > 0 ? allChannelVideos[0][1] : 1;

    return (
      <div className="fixed inset-0 z-[230] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className="bg-white dark:bg-[#151515] rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] relative z-10 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
          <div className="absolute top-4 right-4 z-20">
            <button aria-label="Action" onClick={onClose} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500 text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-lg shadow-red-500/20">
                {channelName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 pr-6">
                <span className="bg-red-500/10 text-red-500 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">Channel Profile</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate mt-1 tracking-tight" title={channelName}>{channelName}</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Total Videos Watched</div>
                <div className="font-bold text-gray-900 dark:text-white text-lg mt-0.5">{totalViews.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Unique Videos</div>
                <div className="font-bold text-red-500 text-lg mt-0.5">{uniqueVideos.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">First Watched</div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-1 truncate">{firstWatchedStr}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Last Watched</div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-1 truncate">{lastWatchedStr}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Top Watched Videos ({allChannelVideos.length})</h4>
                <div className="space-y-2 bg-gray-50 dark:bg-gray-900/50 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/80 max-h-48 overflow-y-auto">
                  {allChannelVideos.map(([vid, count]) => (
                    <div
                      key={vid}
                      className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity py-1.5"
                      onClick={() => handleSelectVideo(vid, channelName)}
                    >
                      <div className="flex justify-between items-end text-xs mb-1">
                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate pr-2 hover:underline">{vid}</span>
                        <span className="text-gray-400 shrink-0 font-mono">{count} views</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                        <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${(count / maxVidCount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. Browser Domain Profile
  if (type === 'domain' || type === 'browser-domain') {
    const domainName = title || '';
    const filtered = rawData.filter(d =>
      d.type === 'browser' &&
      (d.domain === domainName || extractDomain(d.url || '') === domainName)
    );
    const totalVisits = filtered.length;
    const uniqueUrls = new Set(filtered.map(d => d.url)).size;
    const dates = filtered.map(d => new Date(d.ts).getTime()).filter(t => !isNaN(t));
    const firstVisitStr = dates.length > 0 ? new Date(Math.min(...dates)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
    const lastVisitStr = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

    const urlCounts: Record<string, number> = {};
    const urlTitles: Record<string, string> = {};
    filtered.forEach(d => {
      if (d.url) {
        urlCounts[d.url] = (urlCounts[d.url] || 0) + 1;
        if (d.title && !urlTitles[d.url]) urlTitles[d.url] = d.title;
      }
    });
    const topUrls = Object.entries(urlCounts).sort((a, b) => b[1] - a[1]);
    const maxCount = topUrls.length > 0 ? topUrls[0][1] : 1;
    const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domainName)}&sz=64`;

    return (
      <div className="fixed inset-0 z-[230] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className="bg-white dark:bg-[#151515] rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] relative z-10 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
          <div className="absolute top-4 right-4 z-20">
            <button aria-label="Action" onClick={onClose} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0 shadow-sm p-3">
                <img alt="Image" src={favicon} className="w-8 h-8 rounded object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              </div>
              <div className="min-w-0 flex-1 pr-6">
                <span className="bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">Domain Analytics</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate mt-1 tracking-tight" title={domainName}>{domainName}</h3>
                <a href={`https://${domainName}`} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-500 hover:underline flex items-center gap-1 mt-0.5 font-mono">
                  <span>https://{domainName}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Total Visits</div>
                <div className="font-bold text-gray-900 dark:text-white text-lg mt-0.5">{totalVisits.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Unique Pages</div>
                <div className="font-bold text-sky-500 text-lg mt-0.5">{uniqueUrls.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">First Visited</div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-1 truncate">{firstVisitStr}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Last Visited</div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-1 truncate">{lastVisitStr}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Top Visited Pages ({topUrls.length})</h4>
                <div className="space-y-2 bg-gray-50 dark:bg-gray-900/50 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/80 max-h-52 overflow-y-auto">
                  {topUrls.slice(0, 15).map(([url, count]) => {
                    const pageTitle = urlTitles[url] || url;
                    return (
                      <div key={url} className="flex flex-col py-1.5 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                        <div className="flex justify-between items-start text-xs mb-1 gap-2">
                          <button aria-label="Action"
                            onClick={() => {
                              onClose();
                              handleSelectBrowserUrl(url, pageTitle, domainName);
                            }}
                            className="font-medium text-left text-gray-800 dark:text-gray-200 truncate hover:text-sky-500 hover:underline flex-1 cursor-pointer"
                            title={pageTitle}
                          >
                            {pageTitle}
                          </button>
                          <span className="text-sky-500 shrink-0 font-mono text-[11px] font-semibold">{count} visit{count > 1 ? 's' : ''}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                          <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. Place Profile (Google Maps Location & Visit History)
  if (type === 'place' || type === 'maps-place' || type === 'maps') {
    const filtered = rawData.filter(
      d =>
        d.type === 'maps' &&
        (d.title === title || d.address === title || d.address === subtitle || (subtitle && d.subtitle === subtitle))
    );
    const totalVisits = filtered.length || 1;
    const totalMs = filtered.reduce((acc, curr) => acc + (curr.ms_played || 0), 0);
    const dates = filtered.map(d => new Date(d.ts).getTime()).filter(t => !isNaN(t));
    const firstVisitStr =
      dates.length > 0
        ? new Date(Math.min(...dates)).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        : 'N/A';
    const lastVisitStr =
      dates.length > 0
        ? new Date(Math.max(...dates)).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        : 'N/A';

    const sampleItem = filtered[0] || ({ title, subtitle, address: subtitle, type: 'maps' } as any);
    const categoryInfo = getPlaceCategory(sampleItem);
    const gmapsUrl = buildGoogleMapsUrl(sampleItem);
    const gmapsEmbed = buildGoogleMapsEmbedUrl(sampleItem);
    const sortedVisits = [...filtered].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    return (
      <div className="fixed inset-0 z-[230] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className="bg-white dark:bg-[#151515] rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] relative z-10 overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
          <div className="absolute top-4 right-4 z-20">
            <button aria-label="Action"
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`w-14 h-14 rounded-2xl ${categoryInfo.bg} ${categoryInfo.color} flex items-center justify-center shrink-0 shadow-sm`}
              >
                <MapPin className="w-7 h-7" />
              </div>
              <div className="min-w-0 pr-6">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${categoryInfo.bg} ${categoryInfo.color}`}>
                  {categoryInfo.label}
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate mt-1 tracking-tight" title={title}>
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={subtitle}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="mb-4 rounded-2xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-800 aspect-video bg-gray-100 dark:bg-gray-900">
              <LocationMapView
                lat={sampleItem.lat}
                lng={sampleItem.lng}
                title={title}
                subtitle={subtitle}
                externalUrl={gmapsUrl}
                category={categoryInfo.label}
                className="w-full h-full border-0"
                showControls={true}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  Total Visits
                </div>
                <div className="font-bold text-gray-900 dark:text-white text-lg mt-0.5">{totalVisits}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  Total Time Spent
                </div>
                <div className="font-bold text-blue-500 text-lg mt-0.5">
                  {totalMs > 0 ? formatDuration(totalMs) : '< 10m'}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  First Visited
                </div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-1 truncate">{firstVisitStr}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  Last Visited
                </div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-1 truncate">{lastVisitStr}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Visit History Log ({sortedVisits.length})
                </h4>
                <div className="space-y-2 bg-gray-50 dark:bg-gray-900/50 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/80 max-h-48 overflow-y-auto">
                  {sortedVisits.map((item, idx) => {
                    const itemDate = item.dateObj || new Date(item.ts);
                    return (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 dark:border-gray-800/60 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span
                            className="font-medium text-gray-800 dark:text-gray-200 cursor-pointer hover:underline hover:text-blue-500"
                            onClick={() => {
                              onClose();
                              if (onJumpToDate) onJumpToDate(itemDate);
                            }}
                          >
                            {itemDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {item.ms_played ? (
                          <span className="font-mono text-[11px] text-gray-400">
                            {formatDuration(item.ms_played)}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <a
                href={gmapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <span>Explore on Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
