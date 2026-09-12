import { TimelineItem } from '../types';

/**
 * Returns a rich, realistic sample dataset spanning May 14-16, 2025.
 * Contains music listening, academic and video watching, places visited with
 * coordinates, walking routes, browsing research, and photographs.
 */
export function getDemoTimelineData(): TimelineItem[] {
  return [
    // -------------------------------------------------------------
    // May 15, 2025 (Primary Demo Day)
    // -------------------------------------------------------------
    // Morning Ambient Music
    {
      id: 'demo-spot-1',
      type: 'spotify',
      ts: '2025-05-15T07:20:00.000Z',
      dateObj: new Date('2025-05-15T07:20:00.000Z'),
      title: 'Weightless',
      subtitle: 'Marconi Union',
      album: 'Ambient Transmissions Vol. 2',
      ms_played: 485000,
      trackId: '6kkwzB6hXLsqDRJKAYuzrq',
      spotify_track_uri: 'spotify:track:6kkwzB6hXLsqDRJKAYuzrq',
      master_metadata_track_name: 'Weightless',
      master_metadata_album_artist_name: 'Marconi Union',
      master_metadata_album_album_name: 'Ambient Transmissions Vol. 2'
    },
    {
      id: 'demo-spot-2',
      type: 'spotify',
      ts: '2025-05-15T07:32:00.000Z',
      dateObj: new Date('2025-05-15T07:32:00.000Z'),
      title: 'Intro',
      subtitle: 'The xx',
      album: 'xx',
      ms_played: 128000,
      trackId: '2PzvdX1bYw7sZfP6mJ1nN9',
      spotify_track_uri: 'spotify:track:2PzvdX1bYw7sZfP6mJ1nN9',
      master_metadata_track_name: 'Intro',
      master_metadata_album_artist_name: 'The xx',
      master_metadata_album_album_name: 'xx'
    },

    // Maps: Medical College & Hospital Visit
    {
      id: 'demo-map-1',
      type: 'maps',
      ts: '2025-05-15T08:15:00.000Z',
      endTs: '2025-05-15T13:30:00.000Z',
      dateObj: new Date('2025-05-15T08:15:00.000Z'),
      title: 'Medical College and Hospital, Kolkata',
      subtitle: '88 College St, Bowbazar, Kolkata, West Bengal 700073',
      address: '88 College St, Bowbazar, Kolkata, West Bengal 700073',
      lat: 22.5735,
      lng: 88.3639,
      category: 'Hospital & Medical Education',
      place_name: 'Medical College and Hospital',
      isGeocoded: true
    },

    // Maps: Walking route to Coffee House
    {
      id: 'demo-map-2',
      type: 'maps',
      ts: '2025-05-15T13:35:00.000Z',
      endTs: '2025-05-15T13:48:00.000Z',
      dateObj: new Date('2025-05-15T13:35:00.000Z'),
      title: 'Walking from Medical College to Indian Coffee House',
      subtitle: '0.4 km • 13 mins walk past College Square bookstalls',
      isRoute: true,
      activityType: 'walking',
      travelMode: 'walking',
      distance: 420,
      distanceKm: '0.42 km',
      lat: 22.5744,
      lng: 88.3638,
      origin: { lat: 22.5735, lng: 88.3639, address: '88 College St, Kolkata' },
      destination: { lat: 22.5752, lng: 88.3638, address: '15 Bankim Chatterjee St, Kolkata' },
      pathPoints: [
        { lat: 22.5735, lng: 88.3639 },
        { lat: 22.5742, lng: 88.3638 },
        { lat: 22.5749, lng: 88.3637 },
        { lat: 22.5752, lng: 88.3638 }
      ],
      isGeocoded: true
    },

    // Maps: Indian Coffee House Visit
    {
      id: 'demo-map-3',
      type: 'maps',
      ts: '2025-05-15T13:50:00.000Z',
      endTs: '2025-05-15T15:15:00.000Z',
      dateObj: new Date('2025-05-15T13:50:00.000Z'),
      title: 'Indian Coffee House',
      subtitle: '15 Bankim Chatterjee St, College Square, Kolkata, West Bengal 700073',
      address: '15 Bankim Chatterjee St, College Square, Kolkata, West Bengal 700073',
      lat: 22.5752,
      lng: 88.3638,
      category: 'Cafe & Historic Landmark',
      place_name: 'Indian Coffee House',
      isGeocoded: true
    },

    // Web Browsing: PubMed Reference
    {
      id: 'demo-web-1',
      type: 'browser',
      ts: '2025-05-15T15:30:00.000Z',
      dateObj: new Date('2025-05-15T15:30:00.000Z'),
      title: 'Cardiovascular Autonomic Regulation in Health and Disease',
      subtitle: 'PubMed National Center for Biotechnology Information',
      url: 'https://pubmed.ncbi.nlm.nih.gov/32895478/',
      domain: 'pubmed.ncbi.nlm.nih.gov',
      favicon_url: 'https://www.ncbi.nlm.nih.gov/favicon.ico',
      transition: 'link'
    },

    // Web Browsing: Heritage Medical College Archive
    {
      id: 'demo-web-2',
      type: 'browser',
      ts: '2025-05-15T15:55:00.000Z',
      dateObj: new Date('2025-05-15T15:55:00.000Z'),
      title: 'Medical College and Hospital, Kolkata — Wikipedia',
      subtitle: 'History of Asia’s oldest medical teaching institution (est. 1835)',
      url: 'https://en.wikipedia.org/wiki/Medical_College_and_Hospital,_Kolkata',
      domain: 'en.wikipedia.org',
      favicon_url: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
      transition: 'typed'
    },

    // YouTube: Veritasium Video on Memory
    {
      id: 'demo-yt-1',
      type: 'youtube',
      ts: '2025-05-15T16:20:00.000Z',
      dateObj: new Date('2025-05-15T16:20:00.000Z'),
      title: 'How Memory and Nostalgia Work in the Human Brain',
      subtitle: 'Veritasium',
      youtube_video_id: '9YfXq-R82x0',
      titleUrl: 'https://www.youtube.com/watch?v=9YfXq-R82x0'
    },

    // YouTube: Calm Piano Focus
    {
      id: 'demo-yt-2',
      type: 'youtube',
      ts: '2025-05-15T17:15:00.000Z',
      dateObj: new Date('2025-05-15T17:15:00.000Z'),
      title: 'Calm Piano for Deep Focus & Reading (2 Hours)',
      subtitle: 'Yellow Brick Cinema',
      youtube_video_id: '2OEL4P1Rz04',
      titleUrl: 'https://www.youtube.com/watch?v=2OEL4P1Rz04'
    },

    // Afternoon / Sunset Music
    {
      id: 'demo-spot-3',
      type: 'spotify',
      ts: '2025-05-15T18:05:00.000Z',
      dateObj: new Date('2025-05-15T18:05:00.000Z'),
      title: 'Sunset Lover',
      subtitle: 'Petit Biscuit',
      album: 'Presence',
      ms_played: 237000,
      trackId: '3WRQUvzRv2Pnn4NmEsvMi8',
      spotify_track_uri: 'spotify:track:3WRQUvzRv2Pnn4NmEsvMi8',
      master_metadata_track_name: 'Sunset Lover',
      master_metadata_album_artist_name: 'Petit Biscuit',
      master_metadata_album_album_name: 'Presence'
    },
    {
      id: 'demo-spot-4',
      type: 'spotify',
      ts: '2025-05-15T18:25:00.000Z',
      dateObj: new Date('2025-05-15T18:25:00.000Z'),
      title: 'Experience',
      subtitle: 'Ludovico Einaudi',
      album: 'In a Time Lapse',
      ms_played: 315000,
      trackId: '1BncfTToMfIIik6jjUmjQI',
      spotify_track_uri: 'spotify:track:1BncfTToMfIIik6jjUmjQI',
      master_metadata_track_name: 'Experience',
      master_metadata_album_artist_name: 'Ludovico Einaudi',
      master_metadata_album_album_name: 'In a Time Lapse'
    },

    // Maps: Victoria Memorial Dusk Walk
    {
      id: 'demo-map-4',
      type: 'maps',
      ts: '2025-05-15T18:40:00.000Z',
      endTs: '2025-05-15T20:00:00.000Z',
      dateObj: new Date('2025-05-15T18:40:00.000Z'),
      title: 'Victoria Memorial Hall & Gardens',
      subtitle: '1 Queen\'s Way, Maidan, Kolkata, West Bengal 700071',
      address: '1 Queen\'s Way, Maidan, Kolkata, West Bengal 700071',
      lat: 22.5448,
      lng: 88.3426,
      category: 'Monument & Public Gardens',
      place_name: 'Victoria Memorial',
      isGeocoded: true
    },

    // Photographs: Kolkata Heritage Moments
    {
      id: 'demo-photo-1',
      type: 'photo',
      ts: '2025-05-15T14:15:00.000Z',
      dateObj: new Date('2025-05-15T14:15:00.000Z'),
      title: 'Historic Bookstalls along College Street',
      subtitle: 'College Street Heritage District',
      photoUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=300&q=80',
      camera: 'Leica Q2',
      cameraModel: 'Summilux 28mm f/1.7',
      focalLength: '28mm',
      iso: 400,
      fNumber: 2.0,
      favorite: true,
      description: 'Sunlight filtering through the stacked paperbacks and academic tomes of Boi Para.'
    },
    {
      id: 'demo-photo-2',
      type: 'photo',
      ts: '2025-05-15T19:10:00.000Z',
      dateObj: new Date('2025-05-15T19:10:00.000Z'),
      title: 'Victoria Memorial Reflecting Pool at Dusk',
      subtitle: 'Maidan Cultural Quarter',
      photoUrl: 'https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=300&q=80',
      camera: 'Sony Alpha 7 IV',
      cameraModel: 'FE 35mm F1.4 GM',
      focalLength: '35mm',
      iso: 640,
      fNumber: 1.8,
      favorite: true,
      description: 'Soft twilight illumination over the marble colonnades and calm water.'
    },

    // Night Reading Music
    {
      id: 'demo-spot-5',
      type: 'spotify',
      ts: '2025-05-15T22:10:00.000Z',
      dateObj: new Date('2025-05-15T22:10:00.000Z'),
      title: 'Gymnopédie No. 1',
      subtitle: 'Erik Satie',
      album: 'Satie: Piano Works',
      ms_played: 184000,
      trackId: '5NGtFXV1hlun14Gh49kbG0',
      spotify_track_uri: 'spotify:track:5NGtFXV1hlun14Gh49kbG0',
      master_metadata_track_name: 'Gymnopédie No. 1',
      master_metadata_album_artist_name: 'Erik Satie',
      master_metadata_album_album_name: 'Satie: Piano Works'
    },

    // -------------------------------------------------------------
    // May 14, 2025 (Previous Day)
    // -------------------------------------------------------------
    {
      id: 'demo-spot-6',
      type: 'spotify',
      ts: '2025-05-14T08:45:00.000Z',
      dateObj: new Date('2025-05-14T08:45:00.000Z'),
      title: 'Midnight City',
      subtitle: 'M83',
      album: 'Hurry Up, We’re Dreaming',
      ms_played: 243000,
      trackId: '1eyzqe2QqGZUmfcPZtrIyt',
      spotify_track_uri: 'spotify:track:1eyzqe2QqGZUmfcPZtrIyt',
      master_metadata_track_name: 'Midnight City',
      master_metadata_album_artist_name: 'M83',
      master_metadata_album_album_name: 'Hurry Up, We’re Dreaming'
    },
    {
      id: 'demo-map-5',
      type: 'maps',
      ts: '2025-05-14T11:00:00.000Z',
      endTs: '2025-05-14T16:30:00.000Z',
      dateObj: new Date('2025-05-14T11:00:00.000Z'),
      title: 'Central Library, Medical College Kolkata',
      subtitle: '88 College St, Bowbazar, Kolkata, West Bengal 700073',
      address: '88 College St, Bowbazar, Kolkata, West Bengal 700073',
      lat: 22.5738,
      lng: 88.3642,
      category: 'Academic Library',
      place_name: 'Central Library',
      isGeocoded: true
    },
    {
      id: 'demo-yt-3',
      type: 'youtube',
      ts: '2025-05-14T19:30:00.000Z',
      dateObj: new Date('2025-05-14T19:30:00.000Z'),
      title: 'Architecture of Heritage Kolkata — Audio Documentary',
      subtitle: 'Architecture Hunter',
      youtube_video_id: '4F5Q5X1kC6M',
      titleUrl: 'https://www.youtube.com/watch?v=4F5Q5X1kC6M'
    },

    // -------------------------------------------------------------
    // May 16, 2025 (Next Day)
    // -------------------------------------------------------------
    {
      id: 'demo-spot-7',
      type: 'spotify',
      ts: '2025-05-16T09:15:00.000Z',
      dateObj: new Date('2025-05-16T09:15:00.000Z'),
      title: 'Clair de Lune',
      subtitle: 'Claude Debussy',
      album: 'Suite bergamasque',
      ms_played: 302000,
      trackId: '6N7gsq9tzguZZMSEi51BfC',
      spotify_track_uri: 'spotify:track:6N7gsq9tzguZZMSEi51BfC',
      master_metadata_track_name: 'Clair de Lune',
      master_metadata_album_artist_name: 'Claude Debussy',
      master_metadata_album_album_name: 'Suite bergamasque'
    },
    {
      id: 'demo-web-3',
      type: 'browser',
      ts: '2025-05-16T11:40:00.000Z',
      dateObj: new Date('2025-05-16T11:40:00.000Z'),
      title: 'The Cellular Basis of Memory Consolidation — Nature Reviews',
      subtitle: 'Nature Reviews Neuroscience',
      url: 'https://www.nature.com/articles/nrn.2025.102',
      domain: 'nature.com',
      favicon_url: 'https://www.nature.com/static/images/favicons/nature/favicon.ico',
      transition: 'link'
    },
    {
      id: 'demo-map-6',
      type: 'maps',
      ts: '2025-05-16T16:00:00.000Z',
      endTs: '2025-05-16T18:00:00.000Z',
      dateObj: new Date('2025-05-16T16:00:00.000Z'),
      title: 'Park Street Oxford Bookstore & Tea Room',
      subtitle: '17 Park St, Taltala, Kolkata, West Bengal 700016',
      address: '17 Park St, Taltala, Kolkata, West Bengal 700016',
      lat: 22.5511,
      lng: 88.3524,
      category: 'Bookstore & Tea Room',
      place_name: 'Oxford Bookstore',
      isGeocoded: true
    }
  ];
}
