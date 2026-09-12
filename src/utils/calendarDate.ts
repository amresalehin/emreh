export class CalendarDate {
  public readonly year: number;
  public readonly month: number;
  public readonly day: number;

  constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.day = day;
  }

  toISOString(): string {
    const y = String(this.year).padStart(4, '0');
    const m = String(this.month).padStart(2, '0');
    const d = String(this.day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  toString(): string {
    return this.toISOString();
  }
}

function parseTimestamp(ts: number): CalendarDate | null {
  if (ts <= 0) return null;
  let ms = ts;
  if (ts > 1e16) {
    ms = Math.floor(ts / 1e6); // nanoseconds to ms
  } else if (ts > 1e13) {
    ms = Math.floor(ts / 1e3); // microseconds to ms
  } else if (ts < 1e11) {
    ms = ts * 1000; // seconds to ms
  }
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return new CalendarDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function parseCalendarDate(val: any, fallbackFileName?: string): CalendarDate | null {
  if (val instanceof CalendarDate) {
    return val;
  }

  if (val !== undefined && val !== null && val !== '') {
    if (typeof val === 'string') {
      const clean = val.replace(/^\uFEFF/, '').trim();
      // Match YYYY-MM-DD
      const dateMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
      if (dateMatch) {
        const y = parseInt(dateMatch[1], 10);
        const m = parseInt(dateMatch[2], 10);
        const d = parseInt(dateMatch[3], 10);
        if (y > 1900 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          return new CalendarDate(y, m, d);
        }
      }

      // Check numeric timestamp string
      const num = Number(clean);
      if (!isNaN(num) && num > 0) {
        return parseTimestamp(num);
      }

      // Try Date.parse
      const parsed = Date.parse(clean);
      if (!isNaN(parsed)) {
        return parseTimestamp(parsed);
      }
    } else if (typeof val === 'number') {
      return parseTimestamp(val);
    } else if (val instanceof Date) {
      if (!isNaN(val.getTime())) {
        return new CalendarDate(val.getUTCFullYear(), val.getUTCMonth() + 1, val.getUTCDate());
      }
    }
  }

  // Fallback to filename
  if (fallbackFileName) {
    const match = fallbackFileName.match(/(\d{4})[-_.](\d{2})[-_.](\d{2})/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const d = parseInt(match[3], 10);
      return new CalendarDate(y, m, d);
    }
  }

  return null;
}

export function parseCalendarInstant(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    let ms = val;
    if (val > 1e16) ms = Math.floor(val / 1e6);
    else if (val > 1e13) ms = Math.floor(val / 1e3);
    else if (val < 1e11) ms = val * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export function validateCoordinates(lat: any, lng: any): { lat: number; lng: number } | null {
  const latitude = typeof lat === 'number' ? lat : parseFloat(lat);
  const longitude = typeof lng === 'number' ? lng : parseFloat(lng);
  if (isNaN(latitude) || isNaN(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { lat: latitude, lng: longitude };
}
