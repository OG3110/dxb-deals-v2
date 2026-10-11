// tests/saved.test.ts
import { describe, it, expect } from 'vitest';
import { createSavedStore } from '../src/lib/client/saved';

function memStorage() { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; }

describe('saved store', () => {
  it('toggles and persists', () => {
    const s = memStorage();
    const a = createSavedStore(s);
    expect(a.toggle('DXB011')).toBe(true);
    expect(a.has('DXB011')).toBe(true);
    expect(createSavedStore(s).list()).toEqual(['DXB011']);
    expect(a.toggle('DXB011')).toBe(false);
    expect(a.list()).toEqual([]);
  });
  it('works when storage throws (private mode)', () => {
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    const a = createSavedStore(broken);
    expect(() => a.toggle('DXB001')).not.toThrow();
    expect(a.has('DXB001')).toBe(true);
  });
  it('ignores corrupt JSON', () => {
    const s = memStorage(); s.setItem('dxb:saved', '{oops');
    expect(createSavedStore(s).list()).toEqual([]);
  });
  it('notifies listeners', () => {
    const a = createSavedStore(memStorage()); let n = 0; a.onChange(() => n++);
    a.toggle('X'); a.clear(); expect(n).toBe(2);
  });
});
