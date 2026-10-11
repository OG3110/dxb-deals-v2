export interface DesignInfo { n: 1 | 2 | 3 | 4 | 5; slug: string; name: string; blurb: string; accent: string; fonts: string }
const G = 'https://fonts.googleapis.com/css2?display=swap&family=';
export const DESIGNS: DesignInfo[] = [
  { n: 1, slug: 'marketplace', name: 'Modern Marketplace', blurb: 'Bright and clear — search & filters first, every number on the card.', accent: '#12303A', fonts: G + 'Plus+Jakarta+Sans:wght@400;500;600;700;800' },
  { n: 2, slug: 'search-first', name: 'Search First', blurb: 'One big search with live suggestions, category stories and a sortable overview.', accent: '#1B4652', fonts: G + 'Inter:wght@400;500;600;700&family=Sora:wght@600;700;800' },
  { n: 3, slug: 'feed-all', name: 'Feed ⇄ All', blurb: 'Dark app style — switch between a swipe feed and the full grid.', accent: '#07090A', fonts: G + 'Inter:wght@400;500;600;700&family=Sora:wght@700;800' },
  { n: 4, slug: 'tiktok', name: 'TikTok Feed', blurb: 'One deal per screen — swipe, save, ask on WhatsApp.', accent: '#000000', fonts: G + 'Plus+Jakarta+Sans:wght@400;600;700;800' },
  { n: 5, slug: 'split', name: 'Split Scroll', blurb: 'Elegant: big numbers on one side, flyers scrolling on the other.', accent: '#F6F2EA', fonts: G + 'Bodoni+Moda:ital,wght@0,500;1,500&family=DM+Sans:wght@400;500;700' },
];
