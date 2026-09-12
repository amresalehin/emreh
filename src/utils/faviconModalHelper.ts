import { FaviconModalData } from '../components/modals/FaviconModal';

type FaviconModalListener = (data: FaviconModalData | null) => void;
const listeners = new Set<FaviconModalListener>();

export const showFaviconModal = (data: Omit<FaviconModalData, 'isOpen'>) => {
  const modalData: FaviconModalData = { ...data, isOpen: true };
  listeners.forEach(fn => fn(modalData));
};

export const closeFaviconModal = () => {
  listeners.forEach(fn => fn(null));
};

export const subscribeFaviconModal = (listener: FaviconModalListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Convenience helper to open the Favicon Modal given an item or domain
 */
export const openFaviconFor = (params: {
  title?: string;
  domain?: string;
  url?: string;
  faviconUrl?: string;
  description?: string;
  category?: string;
}) => {
  const domain = params.domain || (params.url ? (new URL(params.url.startsWith('http') ? params.url : `https://${params.url}`).hostname.replace(/^www\./, '')) : '');
  const title = params.title || domain || 'Website Icon';
  const hiresFavicon = params.faviconUrl || (domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : '');
  
  const description = params.description || 
    (domain ? `High-resolution brand favicon and metadata for ${domain}. Click 'Visit Site' to open this webpage in a new tab.` : 'Website favicon preview.');

  showFaviconModal({
    title,
    subtitle: domain || undefined,
    imageUrl: hiresFavicon,
    description,
    linkUrl: params.url,
    category: params.category || 'Website Asset'
  });
};
