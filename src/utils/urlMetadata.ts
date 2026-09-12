import { UrlMetadata } from '../types';

export function extractDomain(urlStr: string): string {
  if (!urlStr) return 'Web';
  try {
    let clean = urlStr.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('file://')) {
      clean = 'https://' + clean;
    }
    const parsed = new URL(clean);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    const match = String(urlStr).match(/^(?:https?:\/\/)?(?:www\.)?([^/?#:]+)/i);
    return match ? match[1] : 'Web';
  }
}

export function extractUrlMetadata(rawUrl: string, pageTitle?: string): UrlMetadata {
  let domain = '';
  let protocol = 'https:';
  let pathname = '';
  let pathSegments: string[] = [];
  let searchQuery = '';
  let category = 'Web Resource';
  let categoryIcon = 'globe';
  let accentColor = '#0ea5e9';
  let isSecure = true;
  let smartTags: string[] = [];

  try {
    let clean = rawUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    const u = new URL(clean);
    domain = u.hostname.replace(/^www\./, '');
    protocol = u.protocol;
    isSecure = protocol === 'https:';
    pathname = u.pathname;
    pathSegments = u.pathname.split('/').filter(s => s && s.length > 1 && !/^[0-9a-f]{8,}$/i.test(s));
    searchQuery = u.search;
  } catch {
    domain = extractDomain(rawUrl) || 'webpage';
  }

  const domLower = domain.toLowerCase();
  const pathLower = pathname.toLowerCase();
  const titleLower = (pageTitle || '').toLowerCase();

  let palette = ['#0ea5e9', '#38bdf8', '#7dd3fc', '#f0f9ff'];
  let requiresAuth = false;
  let isLoginPage = false;
  let authType: string | null = null;
  let authServiceName = '';
  let authBrandIcon = 'globe';
  let authBrandGradient = 'from-slate-900 via-neutral-900 to-black';

  // Categorize for semantic styling, color palette, and smart tags without assuming authentication requirements
  if (domLower.includes('mail.google.com') || domLower.includes('inbox.google.com') || domLower.includes('drive.google.com') || domLower.includes('docs.google.com') || domLower.includes('meet.google.com') || domLower.includes('calendar.google.com') || domLower.includes('keep.google.com') || domLower.includes('console.cloud.google.com') || domLower.includes('admin.google.com')) {
    category = 'Productivity & Workspace';
    categoryIcon = 'layout';
    accentColor = '#2563eb';
    palette = ['#1d4ed8', '#2563eb', '#60a5fa', '#eff6ff'];
    authBrandGradient = 'from-blue-950 via-slate-900 to-neutral-950';
    smartTags.unshift('#google', '#workspace', '#productivity');
  } else if (domLower.includes('slack.com')) {
    category = 'Communication & Team';
    categoryIcon = 'message-square';
    accentColor = '#4a154b';
    palette = ['#4a154b', '#611f69', '#36c5f0', '#2eb67d'];
    authBrandGradient = 'from-[#350d36] via-[#1a1d21] to-[#0b0c0e]';
    smartTags.unshift('#slack', '#messages', '#collaboration');
  } else if (domLower.includes('notion.so')) {
    category = 'Notes & Docs';
    categoryIcon = 'book-open';
    accentColor = '#18181b';
    palette = ['#18181b', '#27272a', '#71717a', '#f4f4f5'];
    authBrandGradient = 'from-neutral-900 via-zinc-900 to-black';
    smartTags.unshift('#notion', '#notes', '#wiki');
  } else if (domLower.includes('linear.app') || domLower.includes('jira.atlassian.com') || domLower.includes('asana.com') || domLower.includes('clickup.com') || domLower.includes('monday.com') || domLower.includes('trello.com')) {
    category = 'Project & Tasks';
    categoryIcon = 'check-circle-2';
    accentColor = '#5e6ad2';
    palette = ['#4338ca', '#5e6ad2', '#818cf8', '#e0e7ff'];
    authBrandGradient = 'from-indigo-950 via-slate-950 to-black';
    smartTags.unshift('#tasks', '#project', '#workflow');
  } else if (domLower.includes('chatgpt.com') || domLower.includes('chat.openai.com') || domLower.includes('claude.ai') || domLower.includes('perplexity.ai') || domLower.includes('openai.com') || domLower.includes('anthropic.com') || domLower.includes('huggingface.co') || domLower.includes('midjourney.com') || titleLower.includes('ai ') || titleLower.includes('gpt') || titleLower.includes('llm')) {
    category = 'AI & Intelligence';
    categoryIcon = 'cpu';
    accentColor = '#10a37f';
    palette = ['#059669', '#10a37f', '#34d399', '#ecfdf5'];
    authBrandGradient = 'from-emerald-950 via-teal-950 to-black';
    smartTags.unshift('#ai', '#assistant', '#model');
  } else if (domLower.includes('figma.com') || domLower.includes('dribbble.com') || domLower.includes('behance.net') || domLower.includes('unsplash.com') || domLower.includes('pinterest.com') || domLower.includes('awwwards.com') || domLower.includes('mobbin.com') || titleLower.includes('design') || titleLower.includes('ui/ux')) {
    category = 'Design & Creative';
    categoryIcon = 'pen-tool';
    accentColor = '#a855f7';
    palette = ['#7e22ce', '#a855f7', '#d8b4fe', '#f3e8ff'];
    authBrandGradient = 'from-purple-950 via-neutral-900 to-black';
    smartTags.unshift('#design', '#creative', '#ui');
  } else if (domLower.includes('chase.com') || domLower.includes('bankofamerica.com') || domLower.includes('paypal.com') || domLower.includes('wellsfargo.com') || domLower.includes('fidelity.com') || domLower.includes('vanguard.com') || domLower.includes('citi.com') || domLower.includes('capitalone.com') || domLower.includes('stripe.com')) {
    category = 'Finance & Banking';
    categoryIcon = 'shield';
    accentColor = '#059669';
    palette = ['#047857', '#059669', '#34d399', '#ecfdf5'];
    authBrandGradient = 'from-emerald-950 via-slate-950 to-black';
    smartTags.unshift('#finance', '#banking', '#payments');
  } else if (domLower.includes('github') || domLower.includes('gitlab') || domLower.includes('stackoverflow') || domLower.includes('npm') || domLower.includes('vercel') || domLower.includes('dev.to') || pathLower.includes('repo') || pathLower.includes('code')) {
    category = 'Code & Repository';
    categoryIcon = 'code-2';
    accentColor = '#6366f1';
    palette = ['#4338ca', '#6366f1', '#a5b4fc', '#e0e7ff'];
    smartTags.push('#code', '#dev', '#repo');
  } else if (domLower.includes('medium') || domLower.includes('substack') || domLower.includes('nytimes') || domLower.includes('theverge') || domLower.includes('bbc') || domLower.includes('wikipedia') || domLower.includes('wired') || domLower.includes('atlantic') || domLower.includes('blog') || pathLower.includes('article') || pathLower.includes('post')) {
    category = 'Article & Reading';
    categoryIcon = 'book-open';
    accentColor = '#f59e0b';
    palette = ['#b45309', '#f59e0b', '#fcd34d', '#fef3c7'];
    smartTags.push('#article', '#reading', '#longform');
  } else if (domLower.includes('youtube') || domLower.includes('vimeo') || domLower.includes('twitch') || domLower.includes('netflix') || domLower.includes('bilibili') || titleLower.includes('video') || titleLower.includes('watch')) {
    category = 'Video & Media';
    categoryIcon = 'video';
    accentColor = '#ef4444';
    palette = ['#b91c1c', '#ef4444', '#fca5a5', '#fee2e2'];
    smartTags.push('#video', '#media', '#stream');
  } else if (domLower.includes('spotify') || domLower.includes('soundcloud') || domLower.includes('apple.com/music') || domLower.includes('bandcamp') || titleLower.includes('track') || titleLower.includes('album')) {
    category = 'Audio & Music';
    categoryIcon = 'headphones';
    accentColor = '#10b981';
    palette = ['#047857', '#10b981', '#6ee7b7', '#d1fae5'];
    smartTags.push('#audio', '#music', '#sound');
  } else if (domLower.includes('amazon') || domLower.includes('ebay') || domLower.includes('shopify') || domLower.includes('etsy') || domLower.includes('target') || domLower.includes('store') || pathLower.includes('product') || pathLower.includes('shop')) {
    category = 'Product & Store';
    categoryIcon = 'shopping-bag';
    accentColor = '#f43f5e';
    palette = ['#be123c', '#f43f5e', '#fda4af', '#ffe4e6'];
    smartTags.push('#product', '#shopping', '#store');
  } else if (domLower.includes('reddit') || domLower.includes('twitter') || domLower.includes('x.com') || domLower.includes('linkedin') || domLower.includes('threads') || domLower.includes('news.ycombinator.com') || domLower.includes('whatsapp') || domLower.includes('telegram') || domLower.includes('discord')) {
    category = 'Social & Community';
    categoryIcon = 'message-circle';
    accentColor = '#06b6d4';
    palette = ['#0e7490', '#06b6d4', '#67e8f9', '#cffafe'];
    smartTags.push('#community', '#social', '#discussion');
  } else if (pathLower.includes('doc') || pathLower.includes('guide') || pathLower.includes('api') || pathLower.includes('tutorial') || pathLower.includes('manual') || pathLower.includes('learn')) {
    category = 'Docs & Reference';
    categoryIcon = 'file-text';
    accentColor = '#14b8a6';
    palette = ['#0f766e', '#14b8a6', '#5eead4', '#ccfbf1'];
    smartTags.push('#docs', '#reference', '#guide');
  }

  const cleanDomTag = domLower.split('.')[0].replace(/[^a-z0-9]/g, '');
  if (cleanDomTag && cleanDomTag.length > 1) {
    smartTags.unshift(`#${cleanDomTag}`);
  }
  pathSegments.forEach(seg => {
    const cleanSeg = seg.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (cleanSeg && cleanSeg.length > 2 && cleanSeg.length < 15 && !smartTags.includes(`#${cleanSeg}`)) {
      smartTags.push(`#${cleanSeg}`);
    }
  });

  smartTags = Array.from(new Set(smartTags)).slice(0, 6);
  const titleLen = (pageTitle || '').length;
  const pathDepth = pathSegments.length;
  const readMinutes = Math.max(1, Math.min(15, Math.round(2 + (pathDepth * 0.8) + (titleLen > 50 ? 1 : 0))));
  const snapshotUrl = getPreviewImageUrl(rawUrl, pageTitle);
  const readTime = `~${readMinutes} min`;

  let smartSynopsis = '';
  if (requiresAuth) {
    if (isLoginPage) {
      smartSynopsis = `Authentication gateway and login redirect portal for ${domain}. Sign-in is required to access account services.`;
    } else {
      smartSynopsis = `Authenticated private workspace and personal user account on ${domain}. Direct access is available via your active browser session.`;
    }
  } else if (category === 'Code & Repository') {
    smartSynopsis = `Developer repository and codebase hosted on ${domain}. Includes code assets, dependencies, and reference documentation.`;
  } else if (category === 'Design & Moodboard') {
    smartSynopsis = `Visual reference and design creative captured from ${domain}. Curated typography, layout system, and visual mood.`;
  } else if (category === 'AI & Intelligence') {
    smartSynopsis = `Artificial intelligence paper, model resource, or prompt interface on ${domain}.`;
  } else if (category === 'Article & Reading') {
    smartSynopsis = `Curated reading material and in-depth thoughts published on ${domain}. Estimated ~${readMinutes} min reading depth.`;
  } else if (category === 'Product & Store') {
    smartSynopsis = `Product catalogue item and commercial listing saved from ${domain}.`;
  } else if (category === 'Video & Media') {
    smartSynopsis = `Multimedia stream and video recording published on ${domain}.`;
  } else if (category === 'Audio & Music') {
    smartSynopsis = `Audio release and track recording streamed on ${domain}.`;
  } else if (category === 'Docs & Reference') {
    smartSynopsis = `Technical documentation and API reference manual indexed on ${domain}.`;
  } else {
    smartSynopsis = `Web bookmark and digital memory captured from ${domain}. Direct access available in your system browser.`;
  }

  return {
    domain,
    protocol,
    isSecure,
    pathname,
    pathSegments,
    category,
    categoryIcon,
    icon: categoryIcon,
    accentColor,
    palette,
    smartTags,
    tags: smartTags.map(t => t.replace(/^#/, '')),
    smartSynopsis,
    synopsis: smartSynopsis,
    readMinutes,
    readTime,
    snapshotUrl,
    imageUrl: snapshotUrl,
    requiresAuth,
    isLoginPage,
    authType,
    authServiceName,
    authBrandIcon,
    authBrandGradient,
    fallbackHeroSvg: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
  };
}

/**
 * Returns a high-quality preview or thumbnail URL for a given web page.
 * Supports YouTube video thumbnails, GitHub repo OpenGraph cards, and WordPress mShots screenshot thumbnail service.
 */
export function getPreviewImageUrl(url: string, _title?: string): string {
  if (!url) return '';
  const urlLower = url.toLowerCase();

  // YouTube Video Thumbnail
  if (urlLower.includes('youtube.com/watch') || urlLower.includes('youtu.be/')) {
    try {
      let videoId = '';
      if (urlLower.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('#')[0] || '';
      } else if (urlLower.includes('v=')) {
        const urlObj = new URL(url);
        videoId = urlObj.searchParams.get('v') || '';
      }
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    } catch {
      // fallback
    }
  }

  // GitHub OpenGraph
  if (urlLower.includes('github.com/')) {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && !['explore', 'topics', 'trending', 'settings', 'notifications'].includes(parts[0])) {
        return `https://opengraph.githubassets.com/1/${parts[0]}/${parts[1]}`;
      }
    } catch {
      // fallback
    }
  }

  // General Websites: Use WordPress mShots screenshot thumbnail service (fast, clean, reliable CDN)
  return `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=640`;
}
