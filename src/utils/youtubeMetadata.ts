import { YouTubeMetadata } from '../types';

export function extractYouTubeId(urlOrId?: string): string {
  if (!urlOrId) return 'aircAruvnKk';
  const clean = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }
  try {
    const parsed = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1);
    }
    if (parsed.searchParams.has('v')) {
      return parsed.searchParams.get('v') || 'aircAruvnKk';
    }
    const match = clean.match(/(?:embed\/|v\/|shorts\/|watch\?v=)([\w-]{11})/);
    if (match) return match[1];
  } catch {
    const match = clean.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/);
    if (match) return match[1];
  }
  return 'aircAruvnKk';
}

export function extractYouTubeMetadata(
  videoTitle: string,
  channelName?: string,
  rawUrlOrId?: string,
  msPlayed?: number
): YouTubeMetadata {
  const videoId = extractYouTubeId(rawUrlOrId || '');
  const title = (videoTitle || 'YouTube Video').trim();
  const channel = (channelName || 'YouTube Creator').trim();
  const titleLower = title.toLowerCase();
  const channelLower = channel.toLowerCase();

  let category = 'Video & Media';
  let categoryIcon = 'video';
  let contentArchetype: YouTubeMetadata['contentArchetype'] = 'video';
  let accentColor = '#ef4444';
  let colorMood = 'Electric Scarlet';
  let palette = ['#ef4444', '#f87171', '#fca5a5', '#fee2e2'];
  let smartTags: string[] = [];

  // Categorize based on semantic keywords
  if (
    titleLower.includes('code') ||
    titleLower.includes('programming') ||
    titleLower.includes('react') ||
    titleLower.includes('python') ||
    titleLower.includes('javascript') ||
    titleLower.includes('typescript') ||
    titleLower.includes('dev') ||
    titleLower.includes('api') ||
    titleLower.includes('workflow') ||
    titleLower.includes('gemini') ||
    titleLower.includes('ai') ||
    channelLower.includes('tech') ||
    channelLower.includes('fireship')
  ) {
    category = 'Tech & Engineering';
    categoryIcon = 'code-2';
    contentArchetype = 'coding';
    accentColor = '#0ea5e9';
    colorMood = 'Ocean Cyan';
    palette = ['#0284c7', '#0ea5e9', '#38bdf8', '#e0f2fe'];
    smartTags = ['#coding', '#developer', '#engineering', '#tech'];
  } else if (
    titleLower.includes('how to') ||
    titleLower.includes('guide') ||
    titleLower.includes('tutorial') ||
    titleLower.includes('crash course') ||
    titleLower.includes('learn') ||
    titleLower.includes('step by step') ||
    titleLower.includes('explained')
  ) {
    category = 'Tutorial & Guide';
    categoryIcon = 'book-open';
    contentArchetype = 'tutorial';
    accentColor = '#10b981';
    colorMood = 'Emerald Forest';
    palette = ['#059669', '#10b981', '#34d399', '#ecfdf5'];
    smartTags = ['#tutorial', '#learning', '#guide', '#education'];
  } else if (
    titleLower.includes('podcast') ||
    titleLower.includes('interview') ||
    titleLower.includes('talk') ||
    titleLower.includes('huberman') ||
    titleLower.includes('lex fridman') ||
    titleLower.includes('conversation')
  ) {
    category = 'Podcast & Discussion';
    categoryIcon = 'mic';
    contentArchetype = 'podcast';
    accentColor = '#8b5cf6';
    colorMood = 'Electric Violet';
    palette = ['#7c3aed', '#8b5cf6', '#a78bfa', '#ede9fe'];
    smartTags = ['#podcast', '#interview', '#deepdive', '#discussion'];
  } else if (
    titleLower.includes('music') ||
    titleLower.includes('remix') ||
    titleLower.includes('official audio') ||
    titleLower.includes('live') ||
    titleLower.includes('soundtrack') ||
    titleLower.includes('synthwave') ||
    titleLower.includes('lofi')
  ) {
    category = 'Music & Sound';
    categoryIcon = 'headphones';
    contentArchetype = 'music';
    accentColor = '#ec4899';
    colorMood = 'Berry Rose';
    palette = ['#db2777', '#ec4899', '#f472b6', '#fdf2f8'];
    smartTags = ['#music', '#soundtrack', '#audio', '#listen'];
  } else if (
    titleLower.includes('design') ||
    titleLower.includes('ui') ||
    titleLower.includes('ux') ||
    titleLower.includes('figma') ||
    titleLower.includes('animation') ||
    titleLower.includes('art')
  ) {
    category = 'Design & Creative';
    categoryIcon = 'pen-tool';
    contentArchetype = 'design';
    accentColor = '#f59e0b';
    colorMood = 'Sunset Amber';
    palette = ['#d97706', '#f59e0b', '#fbbf24', '#fef3c7'];
    smartTags = ['#design', '#creative', '#uiux', '#visual'];
  } else if (
    titleLower.includes('documentary') ||
    titleLower.includes('history') ||
    titleLower.includes('investigation') ||
    titleLower.includes('story')
  ) {
    category = 'Documentary & Story';
    categoryIcon = 'film';
    contentArchetype = 'documentary';
    accentColor = '#64748b';
    colorMood = 'Monochrome Slate';
    palette = ['#475569', '#64748b', '#94a3b8', '#f8fafc'];
    smartTags = ['#documentary', '#story', '#deepdive', '#history'];
  } else {
    category = 'Entertainment & Media';
    categoryIcon = 'video';
    contentArchetype = 'entertainment';
    accentColor = '#ef4444';
    colorMood = 'Electric Scarlet';
    palette = ['#dc2626', '#ef4444', '#f87171', '#fee2e2'];
    smartTags = ['#video', '#watch', '#youtube', '#media'];
  }

  // Duration formatting
  let durationSeconds = 720;
  if (msPlayed && msPlayed > 1000) {
    durationSeconds = Math.round(msPlayed / 1000);
  } else {
    // Generate pseudo duration based on title length
    durationSeconds = 300 + ((title.length * 17) % 1500);
  }

  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  const durationFormatted = `${mins}:${String(secs).padStart(2, '0')}`;

  // View count simulator
  const viewHash = Math.abs(title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) * 12347);
  const viewCount = `${((viewHash % 890) + 12).toLocaleString()}K views`;

  // Dynamic Chapters with timestamps
  const part1 = Math.floor(durationSeconds * 0.15);
  const part2 = Math.floor(durationSeconds * 0.45);
  const part3 = Math.floor(durationSeconds * 0.75);

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sc = s % 60;
    return `${m}:${String(sc).padStart(2, '0')}`;
  };

  const chapters = [
    { time: '0:00', seconds: 0, title: 'Introduction & Key Context' },
    { time: formatSec(part1), seconds: part1, title: `Core Concepts & Architecture: ${title.slice(0, 30)}...` },
    { time: formatSec(part2), seconds: part2, title: 'Deep Dive, Implementation & Demonstration' },
    { time: formatSec(part3), seconds: part3, title: 'Takeaways, Best Practices & Summary' }
  ];

  // AI Synopsis
  const smartSynopsis = `In this video by ${channel}, "${title}", key topics, practical insights, and step-by-step breakdowns are explored with high visual clarity.`;

  const keyPoints = [
    `Comprehensive analysis and demonstration of core ideas behind "${title}".`,
    `Produced and hosted by ${channel} with structured visual milestones and practical examples.`,
    `Optimal viewing duration of ${durationFormatted} delivering actionable concepts and best practices.`
  ];

  const transcript = [
    `Welcome everyone to this session by ${channel}. Today we are going deep into ${title}, discussing how the fundamentals connect to real-world workflows.`,
    `As we explore this topic, notice how the core principles allow us to build cleaner, more scalable solutions without unnecessary friction.`,
    `Let's transition into the implementation phase. Here, every step is optimized for clarity, speed, and maintainability.`,
    `To wrap up: understanding these key concepts empowers us to approach complex problems with high confidence and precision.`
  ];

  const channelAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(channel)}&backgroundColor=0284c7,ef4444,10b981,8b5cf6&fontSize=42`;

  const thumbnailUrl = videoId && videoId.length === 11
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : `https://picsum.photos/seed/${encodeURIComponent(title)}/640/360`;

  return {
    videoId,
    thumbnailUrl,
    channel,
    channelAvatarUrl,
    category,
    categoryIcon,
    accentColor,
    palette,
    colorMood,
    contentArchetype,
    durationFormatted,
    durationSeconds,
    viewCount,
    smartSynopsis,
    keyPoints,
    chapters,
    transcript,
    smartTags,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`
  };
}
