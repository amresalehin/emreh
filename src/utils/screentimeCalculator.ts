import { TimelineItem, ScreentimeDayData, ScreentimeAppItem, ScreentimeCategory } from '../types';

/**
 * Intelligent categorization of web domains and app names.
 */
export function categorizeAppOrDomain(input: string): ScreentimeCategory {
  const s = input.toLowerCase();

  // Development
  if (
    s.includes('github') ||
    s.includes('gitlab') ||
    s.includes('stackoverflow') ||
    s.includes('chatgpt') ||
    s.includes('claude') ||
    s.includes('openai') ||
    s.includes('anthropic') ||
    s.includes('vercel') ||
    s.includes('npmjs') ||
    s.includes('replit') ||
    s.includes('cursor') ||
    s.includes('vscode') ||
    s.includes('code') ||
    s.includes('terminal') ||
    s.includes('developer.') ||
    s.includes('typescript') ||
    s.includes('python') ||
    s.includes('codepen')
  ) {
    return 'development';
  }

  // Productivity
  if (
    s.includes('docs.google') ||
    s.includes('drive.google') ||
    s.includes('notion') ||
    s.includes('figma') ||
    s.includes('linear') ||
    s.includes('slack') ||
    s.includes('zoom') ||
    s.includes('mail.google') ||
    s.includes('gmail') ||
    s.includes('outlook') ||
    s.includes('keep.google') ||
    s.includes('box.com') ||
    s.includes('miro') ||
    s.includes('asana') ||
    s.includes('trello') ||
    s.includes('calendar') ||
    s.includes('sheets.google') ||
    s.includes('slides.google') ||
    s.includes('workspace') ||
    s.includes('notes')
  ) {
    return 'productivity';
  }

  // Social
  if (
    s.includes('twitter') ||
    s.includes('x.com') ||
    s.includes('reddit') ||
    s.includes('instagram') ||
    s.includes('linkedin') ||
    s.includes('facebook') ||
    s.includes('discord') ||
    s.includes('threads') ||
    s.includes('tiktok') ||
    s.includes('whatsapp') ||
    s.includes('telegram') ||
    s.includes('messenger') ||
    s.includes('snapchat')
  ) {
    return 'social';
  }

  // Entertainment
  if (
    s.includes('youtube') ||
    s.includes('spotify') ||
    s.includes('netflix') ||
    s.includes('twitch') ||
    s.includes('primevideo') ||
    s.includes('hulu') ||
    s.includes('disney') ||
    s.includes('soundcloud') ||
    s.includes('music') ||
    s.includes('steam') ||
    s.includes('game')
  ) {
    return 'entertainment';
  }

  // Reading
  if (
    s.includes('wikipedia') ||
    s.includes('medium.com') ||
    s.includes('substack') ||
    s.includes('ycombinator') ||
    s.includes('news') ||
    s.includes('nytimes') ||
    s.includes('bbc') ||
    s.includes('theverge') ||
    s.includes('arstechnica') ||
    s.includes('dev.to') ||
    s.includes('bloomberg') ||
    s.includes('article') ||
    s.includes('blog')
  ) {
    return 'reading';
  }

  // Utilities
  if (
    s.includes('google.com/search') ||
    s.includes('duckduckgo') ||
    s.includes('bing.com') ||
    s.includes('maps.google') ||
    s.includes('settings') ||
    s.includes('calculator') ||
    s.includes('weather') ||
    s.includes('finder')
  ) {
    return 'utilities';
  }

  return 'other';
}

/**
 * Extracts a clean display title and domain from timeline item or string.
 */
function cleanAppName(item: TimelineItem): { name: string; domain?: string } {
  if (item.type === 'spotify') {
    return { name: 'Spotify', domain: 'spotify.com' };
  }
  if (item.type === 'youtube') {
    return { name: 'YouTube', domain: 'youtube.com' };
  }
  if (item.type === 'maps') {
    return { name: 'Google Maps Timeline', domain: 'maps.google.com' };
  }
  if (item.type === 'photo') {
    return { name: 'Google Photos', domain: 'photos.google.com' };
  }

  // Browser visit
  const url = item.url || (item.raw as any)?.url || '';
  if (url) {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      const host = parsed.hostname.replace(/^www\./, '');
      const cleanHost = host.split('.')[0];
      const capitalized = cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1);
      return { name: capitalized, domain: host };
    } catch {
      return { name: item.title || 'Web Browsing', domain: url };
    }
  }

  return { name: item.title || 'Browser Session' };
}

/**
 * Formats minutes into human-readable duration (e.g. "2h 45m" or "38m").
 */
export function formatMinutes(totalMin: number): string {
  const rounded = Math.round(totalMin);
  if (rounded < 1) return '< 1m';
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

/**
 * Computes realistic, rich Screentime statistics from the user's real Timeline items for any date.
 */
export function computeScreentimeFromTimeline(
  timelineData: TimelineItem[],
  targetDateKey: string
): ScreentimeDayData {
  const dayItems = timelineData.filter(item => {
    const itemDate = item.ts ? item.ts.slice(0, 10) : item.dateObj?.toISOString().slice(0, 10);
    return itemDate === targetDateKey;
  });

  // Sort chronologically
  const sorted = [...dayItems].sort((a, b) => {
    const timeA = a.dateObj?.getTime() || new Date(a.ts).getTime();
    const timeB = b.dateObj?.getTime() || new Date(b.ts).getTime();
    return timeA - timeB;
  });

  const hourlyMinutes = new Array(24).fill(0);
  const appMap: Record<string, { app: ScreentimeAppItem; count: number }> = {};
  const categories: Record<string, number> = {
    productivity: 0,
    development: 0,
    social: 0,
    entertainment: 0,
    reading: 0,
    utilities: 0,
    other: 0
  };

  let pickupsCount = 0;
  let lastTimestamp = 0;
  let firstPickup: string | undefined;
  let lastActivity: string | undefined;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const date = item.dateObj || new Date(item.ts);
    if (isNaN(date.getTime())) continue;

    const currentTs = date.getTime();
    const hour = date.getHours();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!firstPickup) firstPickup = timeStr;
    lastActivity = timeStr;

    // Detect session pickups: gaps > 15 mins count as a new pickup
    if (lastTimestamp === 0 || currentTs - lastTimestamp > 15 * 60 * 1000) {
      pickupsCount++;
    }
    lastTimestamp = currentTs;

    // Determine duration in minutes
    let durationMin = 3; // base 3 minutes per interaction/visit
    if (item.ms_played && item.ms_played > 0) {
      durationMin = Math.min(60, Math.round(item.ms_played / 60000));
    } else if (i < sorted.length - 1) {
      const nextDate = sorted[i + 1].dateObj || new Date(sorted[i + 1].ts);
      const deltaMin = (nextDate.getTime() - currentTs) / 60000;
      if (deltaMin > 0 && deltaMin <= 25) {
        durationMin = Math.max(1, Math.round(deltaMin));
      }
    }

    hourlyMinutes[hour] = Math.min(60, hourlyMinutes[hour] + durationMin);

    const { name, domain } = cleanAppName(item);
    const category = categorizeAppOrDomain(domain || name);
    categories[category] = (categories[category] || 0) + durationMin;

    const appKey = (domain || name).toLowerCase();
    if (!appMap[appKey]) {
      appMap[appKey] = {
        app: {
          id: `app_${appKey}`,
          name,
          domain,
          category,
          durationMinutes: 0
        },
        count: 0
      };
    }
    appMap[appKey].app.durationMinutes += durationMin;
    appMap[appKey].count++;
  }

  const totalMinutes = Math.min(1440, Object.values(categories).reduce((sum, v) => sum + v, 0));

  // Compute percentages and sort apps descending
  const apps: ScreentimeAppItem[] = Object.values(appMap)
    .map(({ app }) => ({
      ...app,
      percentage: totalMinutes > 0 ? Math.round((app.durationMinutes / totalMinutes) * 100) : 0
    }))
    .sort((a, b) => b.durationMinutes - a.durationMinutes);

  return {
    date: targetDateKey,
    totalMinutes,
    pickupsCount: Math.max(sorted.length > 0 ? 1 : 0, pickupsCount),
    notificationsCount: Math.round(pickupsCount * 2.8),
    firstPickup,
    lastActivity,
    hourlyMinutes,
    categories,
    apps
  };
}

/**
 * Parses files from StayFree, ActionDash, RescueTime, or Takeout Events.json.
 */
export async function parseScreentimeFiles(
  files: File[]
): Promise<Record<string, ScreentimeDayData>> {
  const result: Record<string, ScreentimeDayData> = {};

  for (const file of files) {
    const text = await file.text();
    const nameLower = file.name.toLowerCase();

    // 1. JSON exports
    if (nameLower.endsWith('.json')) {
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          // Process JSON array items
          json.forEach(item => {
            const dateStr = (item.date || item.startTime || item.timestamp || '').slice(0, 10);
            if (!dateStr || dateStr.length < 10) return;
            if (!result[dateStr]) {
              result[dateStr] = {
                date: dateStr,
                totalMinutes: 0,
                pickupsCount: 0,
                hourlyMinutes: new Array(24).fill(0),
                categories: {},
                apps: []
              };
            }
            const min = Number(item.durationMinutes || item.minutes || item.usageTime || 5);
            const appName = item.appName || item.package || item.name || 'App';
            const cat = categorizeAppOrDomain(appName);
            result[dateStr].totalMinutes += min;
            result[dateStr].categories[cat] = (result[dateStr].categories[cat] || 0) + min;

            const existingApp = result[dateStr].apps.find(a => a.name.toLowerCase() === appName.toLowerCase());
            if (existingApp) {
              existingApp.durationMinutes += min;
            } else {
              result[dateStr].apps.push({
                id: `st_${dateStr}_${appName}`,
                name: appName,
                category: cat,
                durationMinutes: min
              });
            }
          });
        }
      } catch (err) {
        console.warn('Error parsing JSON screentime file:', err);
      }
    }

    // 2. CSV exports (StayFree / ActionDash / RescueTime)
    if (nameLower.endsWith('.csv')) {
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('day'));
        const nameIdx = headers.findIndex(h => h.includes('app') || h.includes('activity') || h.includes('name'));
        const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('duration') || h.includes('minute') || h.includes('seconds'));

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(c => c.trim().replace(/['"]/g, ''));
          if (row.length < 2) continue;

          const rawDate = dateIdx !== -1 ? row[dateIdx] : new Date().toISOString().slice(0, 10);
          const dateStr = rawDate.slice(0, 10);
          const appName = nameIdx !== -1 ? row[nameIdx] : 'Application';
          const rawTime = timeIdx !== -1 ? parseFloat(row[timeIdx]) : 10;
          const min = isNaN(rawTime) ? 5 : (headers[timeIdx]?.includes('second') ? Math.round(rawTime / 60) : Math.round(rawTime));

          if (!result[dateStr]) {
            result[dateStr] = {
              date: dateStr,
              totalMinutes: 0,
              pickupsCount: 25,
              hourlyMinutes: new Array(24).fill(0),
              categories: {},
              apps: []
            };
          }

          const cat = categorizeAppOrDomain(appName);
          result[dateStr].totalMinutes += min;
          result[dateStr].categories[cat] = (result[dateStr].categories[cat] || 0) + min;

          const existingApp = result[dateStr].apps.find(a => a.name.toLowerCase() === appName.toLowerCase());
          if (existingApp) {
            existingApp.durationMinutes += min;
          } else {
            result[dateStr].apps.push({
              id: `st_${dateStr}_${appName}`,
              name: appName,
              category: cat,
              durationMinutes: min
            });
          }
        }
      }
    }
  }

  // Recalculate percentages
  Object.values(result).forEach(day => {
    day.apps.forEach(app => {
      app.percentage = day.totalMinutes > 0 ? Math.round((app.durationMinutes / day.totalMinutes) * 100) : 0;
    });
    day.apps.sort((a, b) => b.durationMinutes - a.durationMinutes);
  });

  return result;
}

/**
 * Generates sample demo Screentime data for 7 consecutive days for instant preview.
 */
export function generateDemoScreentimeData(baseDate = new Date()): Record<string, ScreentimeDayData> {
  const result: Record<string, ScreentimeDayData> = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);

    const apps: ScreentimeAppItem[] = [
      { id: `demo_${dateKey}_vs`, name: 'Visual Studio Code', category: 'development', durationMinutes: 145 },
      { id: `demo_${dateKey}_gh`, name: 'GitHub', category: 'development', durationMinutes: 65 },
      { id: `demo_${dateKey}_notion`, name: 'Notion Workspace', category: 'productivity', durationMinutes: 48 },
      { id: `demo_${dateKey}_yt`, name: 'YouTube', category: 'entertainment', durationMinutes: 55 },
      { id: `demo_${dateKey}_spot`, name: 'Spotify Music', category: 'entertainment', durationMinutes: 42 },
      { id: `demo_${dateKey}_x`, name: 'X / Twitter', category: 'social', durationMinutes: 28 },
      { id: `demo_${dateKey}_docs`, name: 'Google Docs', category: 'productivity', durationMinutes: 35 },
      { id: `demo_${dateKey}_wiki`, name: 'Wikipedia', category: 'reading', durationMinutes: 18 }
    ];

    const totalMinutes = apps.reduce((s, a) => s + a.durationMinutes, 0);
    apps.forEach(a => {
      a.percentage = Math.round((a.durationMinutes / totalMinutes) * 100);
    });

    const hourlyMinutes = [
      0, 0, 0, 0, 0, 0, // 0-5am
      5, 20, 38, 45, 52, 40, // 6-11am
      35, 48, 55, 42, 30, 25, // 12-5pm
      35, 45, 28, 15, 5, 0 // 6-11pm
    ];

    const categories: Record<string, number> = {};
    apps.forEach(a => {
      categories[a.category] = (categories[a.category] || 0) + a.durationMinutes;
    });

    result[dateKey] = {
      date: dateKey,
      totalMinutes,
      pickupsCount: 42 + (i % 8),
      notificationsCount: 118 + (i % 25),
      firstPickup: '07:15 AM',
      lastActivity: '11:24 PM',
      hourlyMinutes,
      categories,
      apps
    };
  }

  return result;
}
