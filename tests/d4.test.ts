import { describe, it, expect } from 'vitest';
import type { ClientDeal } from '../src/lib/deals';
import { forYou, feedList, isFeedKey, slideHTML, mslideHTML, cardHTML, rowHTML, headingText, resultsText } from '../src/designs/d4-tiktok/markup';

const mk = (p: Partial<ClientDeal> = {}): ClientDeal => ({
  id: 'DXB008', slug: 'x', title: 'Property <Management>', area: 'Dubai', category: 'services', price: 13e6, priceType: 'key-money',
  annualRent: null, size: null, status: 'available', distress: false, originalPrice: null, featured: false, publishedAt: '2026-06-01', img: null, ...p,
});
const cats = ['restaurant', 'restaurant', 'restaurant', 'cafe', 'retail', 'restaurant', 'cafe', 'nightlife'] as const;
const deals = cats.map((c, i) => mk({ id: `DXB0${10 + i}`, category: c, publishedAt: `2026-06-${10 + i}`, distress: i % 3 === 0 }));

describe('d4 feeds', () => {
  it('"For you" contains every deal exactly once and mixes categories', () => {
    const f = forYou(deals);
    expect(f.map(d => d.id).sort()).toEqual(deals.map(d => d.id).sort());
    expect(f[0].id).toBe('DXB017'); // newest overall first
    expect(new Set(f.slice(0, 4).map(d => d.category)).size).toBe(4); // first round: one per category
  });
  it('"New" is the 8 newest, Distress / categories filter', () => {
    const many = Array.from({ length: 12 }, (_, i) => mk({ id: `DXB${100 + i}`, publishedAt: `2026-07-${10 + i}` }));
    expect(feedList(many, 'new').map(d => d.id)).toEqual(['DXB111', 'DXB110', 'DXB109', 'DXB108', 'DXB107', 'DXB106', 'DXB105', 'DXB104']);
    expect(feedList(deals, 'distress').every(d => d.distress)).toBe(true);
    expect(feedList(deals, 'cafe').map(d => d.id)).toEqual(['DXB016', 'DXB013']);
  });
  it('validates feed keys from the DOM', () => {
    expect(isFeedKey('foryou') && isFeedKey('new') && isFeedKey('distress') && isFeedKey('cafe')).toBe(true);
    expect(isFeedKey('all') || isFeedKey('nope')).toBe(false);
  });
});

describe('d4 markup', () => {
  it('shows — for missing rent/size, never null/NaN, and escapes titles', () => {
    for (const html of [slideHTML(mk(), 0, 1, false), mslideHTML(mk(), 0, 1, false), cardHTML(mk(), false), rowHTML(mk())]) {
      expect(html).not.toMatch(/null|NaN|undefined/);
      expect(html).toContain('&lt;Management&gt;');
      expect(html).not.toContain('<Management>');
      expect(html).toContain('data-deal-id="DXB008"');
    }
    expect(slideHTML(mk(), 0, 1, false)).toContain('Rent —');
    expect(mslideHTML(mk(), 0, 1, false)).toContain('Size —');
  });
  it('does not print "Dubai, Dubai"', () => {
    expect(mslideHTML(mk(), 0, 1, false)).not.toContain('Dubai, Dubai');
    expect(mslideHTML(mk({ area: 'Jumeirah' }), 0, 1, false)).toContain('Jumeirah, Dubai');
  });
  it('distress shows discount and original price', () => {
    const d = mk({ distress: true, price: 350e3, originalPrice: 900e3, priceType: 'asking' });
    expect(slideHTML(d, 0, 1, false)).toContain('<s>AED 900K</s>');
    expect(mslideHTML(d, 0, 1, false)).toContain('−61% · was AED 900K');
    expect(cardHTML(d, false)).toContain('−61%');
  });
  it('headings', () => {
    expect(headingText(26, false)).toBe('26 businesses');
    expect(headingText(1, true)).toBe('Saved · 1');
    expect(resultsText(26, '  ')).toBe('All 26 businesses');
    expect(resultsText(1, 'cafe')).toBe('1 result');
  });
});
