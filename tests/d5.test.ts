import { describe, it, expect } from 'vitest';
import type { ClientDeal } from '../src/lib/deals';
import {
  feedList, feedLabel, counterHTML, counterLabel, resultsText, dotsHTML, dotFor, MAX_DOTS,
  infoHTML, minfoHTML, itemHTML, cardHTML, rowHTML, headingText,
} from '../src/designs/d5-split/markup';

const mk = (p: Partial<ClientDeal> = {}): ClientDeal => ({
  id: 'DXB008', slug: 'x', title: 'Property <Management>', area: 'Dubai', category: 'services', price: 13e6, priceType: 'key-money',
  annualRent: null, size: null, status: 'available', distress: false, originalPrice: null, featured: false, publishedAt: '2026-06-01', img: null, ...p,
});
const deals = [
  mk({ id: 'DXB001', title: 'Café', category: 'cafe', area: 'Jumeirah', price: 8e5, publishedAt: '2026-06-01' }),
  mk({ id: 'DXB002', title: 'Burger Restaurant', category: 'restaurant', area: 'Jumeirah', price: 3.5e5, distress: true, originalPrice: 9e5, publishedAt: '2026-06-03' }),
  mk({ id: 'DXB003', title: 'Restaurant', category: 'restaurant', area: 'Al Wasl', price: 4e6, publishedAt: '2026-06-02' }),
];

describe('d5 scroll list', () => {
  it('narrows by query or filter, newest first', () => {
    expect(feedList(deals, { q: '', ff: 'all' }).map(d => d.id)).toEqual(['DXB002', 'DXB003', 'DXB001']);
    expect(feedList(deals, { q: '  CAFE ', ff: 'all' }).map(d => d.id)).toEqual(['DXB001']);
    expect(feedList(deals, { q: 'restaurant  jumeirah', ff: 'all' }).map(d => d.id)).toEqual(['DXB002']);
    expect(feedList(deals, { q: 'under 1m', ff: 'all' }).map(d => d.id)).toEqual(['DXB002', 'DXB001']);
    expect(feedList(deals, { q: '', ff: 'distress' }).map(d => d.id)).toEqual(['DXB002']);
  });
  it('labels the narrowing (escaped) and nothing for the full list', () => {
    expect(feedLabel({ q: '', ff: 'all' })).toBe('');
    expect(feedLabel({ q: ' <b> ', ff: 'all' })).toBe('“&lt;b&gt;”');
    expect(feedLabel({ q: '', ff: 'restaurant' })).toContain('Restaurants');
  });
  it('counter shows k / n of the filtered list, padded', () => {
    expect(counterHTML(3, 26)).toBe('<b>04</b> / 26');
    expect(counterHTML(0, 2)).toBe('<b>01</b> / 02');
    expect(counterHTML(-1, 0)).toBe('<b>00</b> / 00');
    expect(counterLabel(1, 2)).toBe('Deal 2 of 2');
    expect(resultsText(2, { q: 'cafe', ff: 'all' })).toBe('2 results');
    expect(resultsText(26, { q: '', ff: 'all' })).toBe('All 26 businesses');
    expect(headingText(1, true)).toBe('Saved · 1');
  });
  it('one dot per deal, at most 26; dots are helpers (data-goto, never data-deal-id)', () => {
    expect(dotsHTML(8).match(/<i /g)).toHaveLength(8);
    expect(dotsHTML(60).match(/<i /g)).toHaveLength(MAX_DOTS);
    expect(dotsHTML(8)).not.toContain('data-deal-id');
    expect(dotFor(5, 8)).toBe(5);
    expect(dotFor(59, 60)).toBe(MAX_DOTS - 1);
  });
});

describe('d5 markup', () => {
  it('shows — for missing rent/size, never null/NaN, escapes, and never prints "Dubai, Dubai"', () => {
    for (const html of [infoHTML(mk()), minfoHTML(mk()), itemHTML(mk(), 0, 1), cardHTML(mk(), false), rowHTML(mk())]) {
      expect(html).not.toMatch(/null|NaN|undefined/);
      expect(html).toContain('&lt;Management&gt;');
      expect(html).not.toContain('<Management>');
      expect(html).not.toContain('Dubai, Dubai');
    }
    expect(infoHTML(mk())).toMatch(/Rent \/ yr<\/dt><dd>—<\/dd>/);
    expect(minfoHTML(mk())).toMatch(/Size<\/dt><dd>—<\/dd>/);
    for (const html of [itemHTML(mk(), 0, 1), cardHTML(mk(), false), rowHTML(mk())]) expect(html).toContain('data-deal-id="DXB008"');
  });
  it('shows the discount of a distress deal', () => {
    const d = deals[1];
    expect(infoHTML(d)).toContain('−61% · was AED 900K');
    expect(infoHTML(d)).toContain('Distress');
    expect(minfoHTML(d)).toContain('Distress −61%');
  });
  it('empty list renders a friendly message', () => {
    expect(infoHTML(null)).toContain('No businesses match');
    expect(minfoHTML(null)).toContain('No businesses match');
  });
});
