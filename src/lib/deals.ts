export type Category = 'restaurant' | 'cafe' | 'salon-beauty' | 'nightlife' | 'fitness-leisure' | 'retail' | 'services';
export interface ClientDeal {
  id: string; slug: string; title: string; area: string; category: Category;
  price: number; priceType: 'asking' | 'key-money'; annualRent: number | null; size: number | null;
  status: 'available' | 'reserved' | 'sold'; distress: boolean; originalPrice: number | null; featured: boolean;
  publishedAt: string; img: { sm: string; md: string; lg: string } | null;
}

export const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: 'restaurant', label: 'Restaurants', icon: '🍽' },
  { key: 'cafe', label: 'Cafés', icon: '☕' },
  { key: 'salon-beauty', label: 'Salon & Beauty', icon: '💈' },
  { key: 'nightlife', label: 'Nightlife', icon: '🌙' },
  { key: 'fitness-leisure', label: 'Fitness & Leisure', icon: '🎾' },
  { key: 'retail', label: 'Retail', icon: '🛍' },
  { key: 'services', label: 'Services', icon: '🏢' },
];
export function categoryLabel(c: Category): string {
  return CATEGORIES.find(x => x.key === c)?.label ?? c;
}

export function legacyCategory(title: string, legacy: string): Category {
  if (legacy === 'restaurant') return 'restaurant';
  if (legacy === 'salon' || /clinic/i.test(title)) return 'salon-beauty';
  if (legacy === 'nightclub') return 'nightlife';
  if (legacy === 'gym' || /padel|entertainment/i.test(title)) return 'fitness-leisure';
  if (/caf/i.test(title)) return 'cafe';
  if (/retail|florist/i.test(title)) return 'retail';
  return 'services';
}

export function fmtMoney(n: number | null): string {
  if (n == null) return '—';
  if (n >= 999_500) return (Math.round(n / 1e5) / 10).toString().replace(/\.0$/, '') + 'M';
  return Math.round(n / 1e3) + 'K';
}
export function fmtSize(n: number | null): string {
  return n == null ? '—' : n.toLocaleString('en-US') + ' sqft';
}
export function discountPct(d: { price: number; originalPrice: number | null }): number | null {
  if (!d.originalPrice || d.originalPrice <= d.price) return null;
  return Math.round((1 - d.price / d.originalPrice) * 100);
}

export function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

export interface ParsedQuery { words: string[]; maxPrice: number | null }
export function parseQuery(q: string): ParsedQuery {
  let s = norm(q);
  let maxPrice: number | null = null;
  const m = s.match(/(?:\b(?:under|below|max)|<)\s*(\d[\d,]*(?:\.\d+)?)\s*(million|mio|m|thousand|k)?\b/);
  if (m) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    const unit = m[2];
    maxPrice = !unit ? n : unit[0] === 'm' ? n * 1e6 : n * 1e3;
    s = s.replace(m[0], ' ');
  }
  return { words: s.split(' ').filter(Boolean), maxPrice };
}

export type Filter = 'all' | 'distress' | Category;
function haystack(d: ClientDeal): string {
  return norm([d.title, d.area, d.id, d.category, categoryLabel(d.category)].join(' '));
}
export function matchDeal(d: ClientDeal, q: string, f: Filter): boolean {
  if (f === 'distress' && !d.distress) return false;
  if (f !== 'all' && f !== 'distress' && d.category !== f) return false;
  const p = parseQuery(q);
  if (p.maxPrice != null && d.price > p.maxPrice) return false;
  const h = haystack(d);
  return p.words.every(w => h.includes(w) || h.includes(w.replace(/s$/, '')));
}

export type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'size-desc';
export function sortDeals(list: ClientDeal[], key: SortKey): ClientDeal[] {
  const a = list.slice();
  if (key === 'price-asc') return a.sort((x, y) => x.price - y.price);
  if (key === 'price-desc') return a.sort((x, y) => y.price - x.price);
  if (key === 'size-desc') return a.sort((x, y) => (y.size ?? -1) - (x.size ?? -1));
  return a.sort((x, y) => y.publishedAt.localeCompare(x.publishedAt) || y.id.localeCompare(x.id));
}
export function countBy(list: ClientDeal[], f: Filter): number {
  return list.filter(d => matchDeal(d, '', f)).length;
}

const PHONE = '971503186047';
export const TEL = 'tel:+' + PHONE;
export const WA_GENERAL = `https://wa.me/${PHONE}?text=` + encodeURIComponent('Hello Tolga, I found you on dxb-deals.com.');
export const WA_SELL = `https://wa.me/${PHONE}?text=` + encodeURIComponent('Hello Tolga, I would like to discuss selling my business confidentially.');
export function waLink(d: { id: string; title: string; area: string }): string {
  return `https://wa.me/${PHONE}?text=` + encodeURIComponent(`Hello Tolga, I am interested in ${d.id} (${d.title} – ${d.area}). Please send me more information.`);
}
