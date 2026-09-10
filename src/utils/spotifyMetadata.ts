import { SpotifyMetadata } from '../types';

export function extractSpotifyMetadata(
  trackName: string,
  artistName?: string,
  albumName?: string,
  trackUri?: string,
  msPlayed?: number
): SpotifyMetadata {
  const track = (trackName || 'Unknown Track').trim();
  const artist = (artistName || 'Unknown Artist').trim();
  const album = (albumName || `${track} - Single`).trim();
  const uri = trackUri || `spotify:track:${encodeURIComponent(track + artist).slice(0, 22)}`;
  const trackId = uri.replace('spotify:track:', '') || 'track123';

  const trackLower = track.toLowerCase();
  const artistLower = artist.toLowerCase();
  const albumLower = album.toLowerCase();

  let genre = 'Electronic & Pop';
  let genreArchetype: SpotifyMetadata['genreArchetype'] = 'electronic';
  let accentColor = '#10b981';
  let colorMood = 'Emerald Sound';
  let palette = ['#059669', '#10b981', '#34d399', '#ecfdf5'];
  let smartTags: string[] = [];

  let bpm = 124;
  let keySignature = 'C# Minor';
  let energy = 78;
  let danceability = 82;
  let valence = 65;
  let acousticness = 18;

  if (
    trackLower.includes('synth') ||
    trackLower.includes('midnight') ||
    trackLower.includes('wave') ||
    trackLower.includes('starboy') ||
    trackLower.includes('cyber') ||
    artistLower.includes('m83') ||
    artistLower.includes('daft punk') ||
    artistLower.includes('kavinsky')
  ) {
    genre = 'Synthwave & Retro Electro';
    genreArchetype = 'electronic';
    accentColor = '#a855f7';
    colorMood = 'Electric Violet';
    palette = ['#9333ea', '#a855f7', '#c084fc', '#f3e8ff'];
    smartTags = ['#synthwave', '#electronic', '#retro', '#nightdrive'];
    bpm = 118;
    keySignature = 'A Minor';
    energy = 88;
    danceability = 74;
    valence = 60;
    acousticness = 12;
  } else if (
    trackLower.includes('lofi') ||
    trackLower.includes('chill') ||
    trackLower.includes('sleep') ||
    trackLower.includes('coffee') ||
    trackLower.includes('study') ||
    trackLower.includes('calm')
  ) {
    genre = 'Lo-Fi & Study Beats';
    genreArchetype = 'chill';
    accentColor = '#f59e0b';
    colorMood = 'Sunset Amber';
    palette = ['#d97706', '#f59e0b', '#fbbf24', '#fef3c7'];
    smartTags = ['#lofi', '#chillbeats', '#study', '#relax'];
    bpm = 82;
    keySignature = 'F Major';
    energy = 42;
    danceability = 68;
    valence = 52;
    acousticness = 72;
  } else if (
    trackLower.includes('ambient') ||
    trackLower.includes('peace') ||
    trackLower.includes('zen') ||
    trackLower.includes('space') ||
    trackLower.includes('rain')
  ) {
    genre = 'Ambient & Drone';
    genreArchetype = 'ambient';
    accentColor = '#0ea5e9';
    colorMood = 'Ocean Blue';
    palette = ['#0284c7', '#0ea5e9', '#38bdf8', '#e0f2fe'];
    smartTags = ['#ambient', '#meditation', '#focus', '#soundscape'];
    bpm = 65;
    keySignature = 'D Minor';
    energy = 24;
    danceability = 30;
    valence = 40;
    acousticness = 88;
  } else if (
    trackLower.includes('rock') ||
    trackLower.includes('guitar') ||
    trackLower.includes('indie') ||
    trackLower.includes('arctic') ||
    trackLower.includes('strokes') ||
    artistLower.includes('radiohead')
  ) {
    genre = 'Indie & Alternative Rock';
    genreArchetype = 'rock';
    accentColor = '#ef4444';
    colorMood = 'Crimson Vibe';
    palette = ['#dc2626', '#ef4444', '#f87171', '#fee2e2'];
    smartTags = ['#indierock', '#alternative', '#guitar', '#band'];
    bpm = 135;
    keySignature = 'E Minor';
    energy = 84;
    danceability = 58;
    valence = 64;
    acousticness = 22;
  } else if (
    trackLower.includes('jazz') ||
    trackLower.includes('blues') ||
    trackLower.includes('sax') ||
    trackLower.includes('piano') ||
    trackLower.includes('soul')
  ) {
    genre = 'Jazz & Neo-Soul';
    genreArchetype = 'jazz';
    accentColor = '#d97706';
    colorMood = 'Golden Amber';
    palette = ['#b45309', '#d97706', '#f59e0b', '#fffbeb'];
    smartTags = ['#jazz', '#neosoul', '#smooth', '#acoustic'];
    bpm = 96;
    keySignature = 'B♭ Major';
    energy = 54;
    danceability = 70;
    valence = 75;
    acousticness = 64;
  } else if (
    trackLower.includes('rap') ||
    trackLower.includes('hiphop') ||
    trackLower.includes('drake') ||
    trackLower.includes('kendrick') ||
    trackLower.includes('beat')
  ) {
    genre = 'Hip-Hop & Urban';
    genreArchetype = 'hiphop';
    accentColor = '#6366f1';
    colorMood = 'Indigo Pulse';
    palette = ['#4f46e5', '#6366f1', '#818cf8', '#e0e7ff'];
    smartTags = ['#hiphop', '#rhythm', '#flow', '#urban'];
    bpm = 140;
    keySignature = 'G Minor';
    energy = 80;
    danceability = 86;
    valence = 58;
    acousticness = 16;
  } else {
    genre = 'Modern Pop & Hits';
    genreArchetype = 'pop';
    accentColor = '#10b981';
    colorMood = 'Emerald Sound';
    palette = ['#059669', '#10b981', '#34d399', '#ecfdf5'];
    smartTags = ['#pop', '#hits', '#melodic', '#anthem'];
    bpm = 120;
    keySignature = 'G Major';
    energy = 76;
    danceability = 79;
    valence = 72;
    acousticness = 30;
  }

  // Duration
  let durationMs = msPlayed && msPlayed > 1000 ? msPlayed : 214000;
  const totalSeconds = Math.round(durationMs / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const durationFormatted = `${m}:${String(s).padStart(2, '0')}`;

  // Release year generator
  const hash = Math.abs(track.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  const releaseYear = String(2018 + (hash % 8));

  // Lyrics verses generator
  const lyrics = [
    `[Verse 1]`,
    `City lights glowing in the evening mist`,
    `Moments frozen in time that we can't resist`,
    `The rhythm echoes softly down the empty street`,
    `Guiding every heartbeat with an endless beat`,
    ``,
    `[Chorus]`,
    `Underneath the midnight skies we find our way`,
    `Lost inside the melody, fading night into the day`,
    `Nothing matters when the music starts to play`,
    `In this sanctuary where we choose to stay`,
    ``,
    `[Verse 2]`,
    `Waves of sound reverberate across the floor`,
    `Opening a world we never saw before`,
    `Step by step we feel the harmony arrive`,
    `In the pulse of sound that makes us come alive`,
    ``,
    `[Outro]`,
    `Fading into echoes...`,
    `Forever in the rhythm of the night.`
  ];

  const keyTakeaways = [
    `Rich harmonic structure in ${keySignature} with a steady ${bpm} BPM groove.`,
    `Exhibits ${energy}% energy and ${danceability}% danceability, ideal for sustained flow and immersion.`,
    `Recorded by ${artist} on the album "${album}" (${releaseYear}).`
  ];

  const smartSynopsis = `"${track}" by ${artist} offers a cohesive blend of ${genre.toLowerCase()} featuring lush textures, crisp drum patterns, and dynamic tonal transitions.`;

  const artistAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(artist)}&backgroundColor=10b981,0ea5e9,a855f7,f59e0b&fontSize=42`;

  const albumArtUrl = `https://picsum.photos/seed/${encodeURIComponent(track + artist)}/500/500`;

  return {
    trackId,
    trackUri: uri,
    albumArtUrl,
    artist,
    artistAvatarUrl,
    album,
    releaseYear,
    genre,
    accentColor,
    palette,
    colorMood,
    genreArchetype,
    durationFormatted,
    durationMs,
    bpm,
    keySignature,
    energy,
    danceability,
    valence,
    acousticness,
    smartSynopsis,
    keyTakeaways,
    lyrics,
    smartTags,
    previewAudioAvailable: true
  };
}
