// tests/deals.test.ts
import { describe, it, expect } from 'vitest';
import { fmtMoney, fmtSize, norm, parseQuery, matchDeal, sortDeals, countBy, waLink, discountPct, legacyCategory, type ClientDeal } from '../src/lib/deals';

const base: ClientDeal = { id: 'DXB000', slug: 'x', title: 'X', area: 'Dubai', category: 'restaurant', price: 1, priceType: 'key-money',
  annualRent: null, size: null, status: 'available', distress: false, originalPrice: null, featured: false, publishedAt: '2026-01-01', img: null };
const d = (o: Partial<ClientDeal>): ClientDeal => ({ ...base, ...o });
const cafe = d({ id: 'DXB023', title: 'Café', area: 'Dubai Creek Harbour', category: 'cafe', price: 800000, publishedAt: '2026-06-23' });
const burger = d({ id: 'DXB011', title: 'Burger Restaurant', area: 'Jumeirah', price: 350000, distress: true, originalPrice: 900000, size: 400, publishedAt: '2026-06-11' });
const club = d({ id: 'DXB005', title: 'Nightclub', area: 'DIFC', category: 'nightlife', price: 6000000, size: 17200, publishedAt: '2026-06-05' });

describe('fmtMoney / fmtSize', () => {
  it('formats K and M', () => {
    expect(fmtMoney(350000)).toBe('350K');
    expect(fmtMoney(1200000)).toBe('1.2M');
    expect(fmtMoney(10000000)).toBe('10M');
    expect(fmtMoney(6800000)).toBe('6.8M');
    expect(fmtMoney(null)).toBe('—');
  });
  it('formats size', () => {
    expect(fmtSize(29900)).toBe('29,900 sqft');
    expect(fmtSize(null)).toBe('—');
  });
});

describe('search', () => {
  it('normalises accents, case and spaces', () => {
    expect(norm('  CAFÉ   Creek ')).toBe('cafe creek');
  });
  it('parses price limits', () => {
    expect(parseQuery('under 1M')).toEqual({ words: [], maxPrice: 1000000 });
    expect(parseQuery('restaurant under 500k')).toEqual({ words: ['restaurant'], maxPrice: 500000 });
    expect(parseQuery('below 2.5m jumeirah')).toEqual({ words: ['jumeirah'], maxPrice: 2500000 });
  });
  it('matches accent-insensitive, multi-word, id and category label', () => {
    expect(matchDeal(cafe, 'cafe', 'all')).toBe(true);
    expect(matchDeal(cafe, '  CAFE ', 'all')).toBe(true);
    expect(matchDeal(burger, 'restaurant  jumeirah', 'all')).toBe(true);
    expect(matchDeal(burger, 'restaurant difc', 'all')).toBe(false);
    expect(matchDeal(burger, 'dxb011', 'all')).toBe(true);
    expect(matchDeal(club, 'nightlife', 'all')).toBe(true);
  });
  it('applies filters and price limit', () => {
    expect(matchDeal(burger, '', 'distress')).toBe(true);
    expect(matchDeal(club, '', 'distress')).toBe(false);
    expect(matchDeal(club, '', 'nightlife')).toBe(true);
    expect(matchDeal(club, 'under 1m', 'all')).toBe(false);
    expect(matchDeal(burger, 'under 1m', 'all')).toBe(true);
  });
});

describe('sort / count', () => {
  it('sorts without mutating, nulls last for size', () => {
    const list = [cafe, burger, club];
    expect(sortDeals(list, 'price-asc').map(x => x.id)).toEqual(['DXB011', 'DXB023', 'DXB005']);
    expect(sortDeals(list, 'price-desc')[0].id).toBe('DXB005');
    expect(sortDeals(list, 'size-desc').map(x => x.id)).toEqual(['DXB005', 'DXB011', 'DXB023']);
    expect(sortDeals(list, 'newest')[0].id).toBe('DXB023');
    expect(list[0].id).toBe('DXB023');
  });
  it('counts by filter', () => {
    expect(countBy([cafe, burger, club], 'all')).toBe(3);
    expect(countBy([cafe, burger, club], 'distress')).toBe(1);
  });
});

describe('links and misc', () => {
  it('builds WhatsApp link', () => {
    expect(waLink(burger)).toBe('https://wa.me/971503186047?text=' +
      encodeURIComponent('Hello Tolga, I am interested in DXB011 (Burger Restaurant – Jumeirah). Please send me more information.'));
  });
  it('discount', () => {
    expect(discountPct(burger)).toBe(61);
    expect(discountPct(club)).toBeNull();
  });
  it('maps legacy categories', () => {
    expect(legacyCategory('Café', 'other')).toBe('cafe');
    expect(legacyCategory('Derma Clinic', 'other')).toBe('salon-beauty');
    expect(legacyCategory('Padel Court', 'other')).toBe('fitness-leisure');
    expect(legacyCategory('Entertainment Centre', 'other')).toBe('fitness-leisure');
    expect(legacyCategory('Florist', 'other')).toBe('retail');
    expect(legacyCategory('Limousine Company', 'other')).toBe('services');
    expect(legacyCategory('Club', 'nightclub')).toBe('nightlife');
    expect(legacyCategory('Fitness Studio', 'gym')).toBe('fitness-leisure');
    expect(legacyCategory('Barber Shop', 'salon')).toBe('salon-beauty');
    expect(legacyCategory('Restaurant', 'restaurant')).toBe('restaurant');
  });
});
