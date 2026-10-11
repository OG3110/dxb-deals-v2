const KEY = 'dxb:saved';
export interface SavedStore { has(id: string): boolean; toggle(id: string): boolean; list(): string[]; clear(): void; onChange(fn: () => void): void }
export function createSavedStore(storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null): SavedStore {
  let ids: string[] = [];
  try { const raw = storage?.getItem(KEY); const v = raw ? JSON.parse(raw) : []; ids = Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { ids = []; }
  const fns: (() => void)[] = [];
  const save = () => { try { storage?.setItem(KEY, JSON.stringify(ids)); } catch { /* session only */ } fns.forEach(f => f()); };
  return {
    has: id => ids.includes(id),
    toggle(id) { const on = !ids.includes(id); ids = on ? [id, ...ids] : ids.filter(x => x !== id); save(); return on; },
    list: () => ids.slice(),
    clear() { ids = []; save(); },
    onChange: fn => { fns.push(fn); },
  };
}
