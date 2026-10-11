import { describe, it, expect } from 'vitest';
import type { ClientDeal } from '../src/lib/deals';
import { headingText, infoHTML, mslideHTML, cardHTML } from '../src/designs/d3-feed-all/markup';

const mk = (p: Partial<ClientDeal> = {}): ClientDeal => ({
  id: 'DXB008', slug: 'x', title: 'Property <Management>', area: 'Dubai', category: 'services', price: 13e6, priceType: 'key-money',
  annualRent: null, size: null, status: 'available', distress: false, originalPrice: null, featured: false, publishedAt: '2026-06-01', img: null, ...p,
});

describe('d3 markup', () => {
  it('heading counts', () => {
    expect(headingText(26, false)).toBe('26 businesses');
    expect(headingText(1, false)).toBe('1 business');
    expect(headingText(2, true)).toBe('Saved (2)');
  });
  it('shows — for missing rent/size, never null/NaN, and escapes titles', () => {
    for (const html of [infoHTML(mk(), false), mslideHTML(mk(), 0, 1, false), cardHTML(mk(), false)]) {
      expect(html).not.toMatch(/null|NaN|undefined/);
      expect(html).toContain('&lt;Management&gt;');
      expect(html).not.toContain('<Management>');
    }
    expect(mslideHTML(mk(), 0, 1, false)).toContain('Size —');
    expect(infoHTML(mk(), false)).toContain('Rent / yr</dt><dd>—');
  });
  it('does not print "Dubai, Dubai"', () => {
    expect(infoHTML(mk(), false)).not.toContain('Dubai, Dubai');
    expect(infoHTML(mk({ area: 'Jumeirah' }), false)).toContain('Jumeirah, Dubai');
  });
  it('distress shows the original price and discount', () => {
    const h = infoHTML(mk({ distress: true, price: 350e3, originalPrice: 900e3 }), false);
    expect(h).toContain('was AED 900K · −61%');
  });
});
