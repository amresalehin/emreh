import React, { useMemo } from 'react';
import { Globe, MapPin, ChevronRight, Calendar } from 'lucide-react';
import { TimelineItem } from '../../types';

interface TimelineWorldTabProps {
  items: TimelineItem[];
  onSelectPlace: (item: TimelineItem) => void;
}

// Simple country code / flag extractor from address or coordinates
function extractCountryInfo(item: TimelineItem): { country: string; flag: string } {
  const addr = (item.address || item.subtitle || '').toLowerCase();

  if (addr.includes('usa') || addr.includes('united states') || addr.includes('us')) return { country: 'United States', flag: '🇺🇸' };
  if (addr.includes('united kingdom') || addr.includes('uk') || addr.includes('england') || addr.includes('london')) return { country: 'United Kingdom', flag: '🇬🇧' };
  if (addr.includes('japan') || addr.includes('tokyo') || addr.includes('osaka')) return { country: 'Japan', flag: '🇯🇵' };
  if (addr.includes('canada') || addr.includes('toronto') || addr.includes('vancouver')) return { country: 'Canada', flag: '🇨🇦' };
  if (addr.includes('germany') || addr.includes('deutschland') || addr.includes('berlin')) return { country: 'Germany', flag: '🇩🇪' };
  if (addr.includes('france') || addr.includes('paris')) return { country: 'France', flag: '🇫🇷' };
  if (addr.includes('italy') || addr.includes('italia') || addr.includes('rome')) return { country: 'Italy', flag: '🇮🇹' };
  if (addr.includes('spain') || addr.includes('espana') || addr.includes('madrid') || addr.includes('barcelona')) return { country: 'Spain', flag: '🇪🇸' };
  if (addr.includes('australia') || addr.includes('sydney') || addr.includes('melbourne')) return { country: 'Australia', flag: '🇦🇺' };
  if (addr.includes('india') || addr.includes('delhi') || addr.includes('mumbai')) return { country: 'India', flag: '🇮🇳' };
  if (addr.includes('china') || addr.includes('beijing') || addr.includes('shanghai')) return { country: 'China', flag: '🇨🇳' };
  if (addr.includes('brazil') || addr.includes('brasil') || addr.includes('rio')) return { country: 'Brazil', flag: '🇧🇷' };
  if (addr.includes('mexico') || addr.includes('cancun')) return { country: 'Mexico', flag: '🇲🇽' };

  // Default
  return { country: 'Home Region / Territory', flag: '📍' };
}

export const TimelineWorldTab: React.FC<TimelineWorldTabProps> = ({
  items,
  onSelectPlace
}) => {
  const countryMap = useMemo(() => {
    const map = new Map<string, { country: string; flag: string; places: TimelineItem[]; firstDate: Date; lastDate: Date }>();

    items.forEach(item => {
      if (item.type !== 'maps') return;
      const { country, flag } = extractCountryInfo(item);
      const date = item.dateObj || new Date(item.ts);

      if (!map.has(country)) {
        map.set(country, { country, flag, places: [], firstDate: date, lastDate: date });
      }
      const entry = map.get(country)!;
      entry.places.push(item);
      if (date < entry.firstDate) entry.firstDate = date;
      if (date > entry.lastDate) entry.lastDate = date;
    });

    return Array.from(map.values()).sort((a, b) => b.places.length - a.places.length);
  }, [items]);

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
            {countryMap.length} Countries & Territories Visited
          </h2>
          <p className="text-xs text-gray-400">Global travel geography</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {countryMap.map((c, idx) => (
          <div
            key={idx}
            className="p-4 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-2xs hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{c.flag}</span>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {c.country}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.places.length} place records
                </p>
              </div>
            </div>
            <div className="text-right text-[11px] text-gray-400 font-medium">
              <div>{c.firstDate.toLocaleDateString()}</div>
              <div>to {c.lastDate.toLocaleDateString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
