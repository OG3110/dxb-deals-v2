import { describe, it, expect } from 'vitest';
import type { ClientDeal } from '../src/lib/deals';
import { sortTable, headingText } from '../src/designs/d2-search/markup';

const mk = (id: string, price: number, annualRent: number | null, size: number | null, title = id): ClientDeal => ({
  id, slug: id, title, area: 'Dubai', category: 'restaurant', price, priceType: 'asking', annualRent, size,
  status: 'available', distress: false, originalPrice: null, featured: false, publishedAt: '2026-06-01', img: null,
});
const list = [mk('DXB001', 300, null, 50), mk('DXB002', 100, 20, null), mk('DXB003', 200, 10, 70), mk('DXB004', 50, null, null)];
const ids = (l: ClientDeal[]) => l.map(d => d.id);

describe('d2 sortTable', () => {
  it('sorts numbers both ways', () => {
    expect(ids(sortTable(list, 'price', 1))).toEqual(['DXB004', 'DXB002', 'DXB003', 'DXB001']);
    expect(ids(sortTable(list, 'price', -1))).toEqual(['DXB001', 'DXB003', 'DXB002', 'DXB004']);
  });
  it('puts missing rent / size last regardless of direction', () => {
    expect(ids(sortTable(list, 'annualRent', 1)).slice(-2).sort()).toEqual(['DXB001', 'DXB004']);
    expect(ids(sortTable(list, 'annualRent', -1)).slice(-2).sort()).toEqual(['DXB001', 'DXB004']);
    expect(ids(sortTable(list, 'annualRent', 1)).slice(0, 2)).toEqual(['DXB003', 'DXB002']);
    expect(ids(sortTable(list, 'size', -1))).toEqual(['DXB003', 'DXB001', 'DXB004', 'DXB002']);
  });
  it('sorts text case-insensitively and does not mutate the input', () => {
    const l = [mk('DXB001', 1, 1, 1, 'café'), mk('DXB002', 1, 1, 1, 'Bar'), mk('DXB003', 1, 1, 1, 'apple')];
    expect(ids(sortTable(l, 'title', 1))).toEqual(['DXB003', 'DXB002', 'DXB001']);
    expect(ids(l)).toEqual(['DXB001', 'DXB002', 'DXB003']);
  });
});

describe('d2 headingText', () => {
  it('describes the overview state', () => {
    expect(headingText(26, 26, false, false)).toBe('All businesses (26)');
    expect(headingText(1, 26, true, false)).toBe('1 result');
    expect(headingText(3, 26, true, true)).toBe('Saved (3)');
  });
});
