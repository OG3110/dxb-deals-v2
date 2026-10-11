// Design 3 · shared engine for desktop and mobile: state, filtering, saved store, snap-feed position and the
// delegated controls both versions have in common. Each version only supplies its markup and its own extras.
import { matchDeal, sortDeals, type ClientDeal, type Filter, type SortKey } from '../../lib/deals';
import { readDeals } from '../../lib/client/data';
import { createSavedStore } from '../../lib/client/saved';
import { openQuickView } from '../../lib/client/quickview';
import { $, $$ } from '../../lib/client/dom';
import * as M from './markup';

export type Mode = 'feed' | 'all';
export interface State { q: string; filter: Filter; sort: SortKey; savedOnly: boolean; mode: Mode }
export interface Paint {
  slide(d: ClientDeal, i: number, n: number, saved: boolean): string;
  card(d: ClientDeal, saved: boolean): string;
  /** Feed position changed (or the list was rebuilt). `d` is null when nothing matches. */
  current(d: ClientDeal | null, i: number, list: ClientDeal[]): void;
  mode(m: Mode, from: Mode): void;
  after?(list: ClientDeal[]): void;
  beforeOpen?(): void;
  afterReset?(): void;
}
export type App = ReturnType<typeof engine>;

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function engine(root: HTMLElement, mobile: boolean, paint: Paint) {
  const deals = readDeals();
  const byId = new Map(deals.map(d => [d.id, d]));
  const saved = createSavedStore();
  const st: State = { q: '', filter: 'all', sort: 'newest', savedOnly: false, mode: 'feed' };
  const feed = $('[data-feed]', root), grid = $('[data-grid]', root);
  const fromHash = decodeURIComponent(location.hash.slice(1)).toUpperCase();
  let list: ClientDeal[] = [], cur = -1, curId = byId.has(fromHash) ? fromHash : '';
  let target = -1, tid = 0;

  const savedCount = () => saved.list().filter(id => byId.has(id)).length;
  const results = () => sortDeals(deals.filter(d => matchDeal(d, st.q, st.filter) && (!st.savedOnly || saved.has(d.id))), st.sort);
  const clamp = (i: number) => Math.max(0, Math.min(list.length - 1, i));
  const h = () => feed.clientHeight;

  function setCur(i: number, force = false) {
    if (!list.length) { cur = -1; paint.current(null, -1, list); return; }
    i = clamp(i);
    if (i === cur && !force) return;
    cur = i; curId = list[i].id;
    paint.current(list[i], i, list);
  }
  // Every slide is exactly one feed height tall, so index ⇄ scrollTop is a plain multiplication (never offsetTop).
  /** Jump without animation (rebuild, mode switch, resize). No-op while the feed is hidden (height 0). */
  function snap(i = cur) { target = -1; if (h() && i >= 0) feed.scrollTop = clamp(i) * h(); }
  function go(i: number) {
    if (!list.length) return;
    target = clamp(i); setCur(target);
    clearTimeout(tid); tid = window.setTimeout(() => { target = -1; }, 900); // a wheel/swipe may interrupt the smooth scroll
    feed.scrollTo({ top: target * h(), behavior: reduced() ? 'auto' : 'smooth' });
  }
  feed.addEventListener('scroll', () => {
    const fh = h();
    if (!fh || !list.length) return;
    const at = clamp(Math.round(feed.scrollTop / fh));
    if (target < 0 || at === target) { target = -1; setCur(at); }
  }, { passive: true });
  window.addEventListener('resize', () => snap());

  function sync() {
    $$('[data-bind=q]', root).forEach(el => { const i = el as HTMLInputElement; if (i.value !== st.q) i.value = st.q; });
    $$('[data-sort]', root).forEach(el => { const s = el as HTMLSelectElement; if (s.value !== st.sort) s.value = st.sort; });
  }
  function savedUI() {
    const n = String(savedCount());
    $$('[data-saved-count]', root).forEach(el => { el.textContent = n; });
    $$('[data-saved-toggle]', root).forEach(el => el.setAttribute('aria-pressed', String(st.savedOnly)));
    $$('[data-save]', root).forEach(b => b.setAttribute('aria-pressed', String(saved.has(b.dataset.save!))));
  }
  function render() {
    list = results();
    const keep = list.findIndex(d => d.id === curId); // keep the current deal if it is still in the results
    feed.innerHTML = list.map((d, i) => paint.slide(d, i, list.length, saved.has(d.id))).join('');
    grid.innerHTML = list.map(d => paint.card(d, saved.has(d.id))).join('');
    root.classList.toggle('d3-none', !list.length);
    $$('[data-empty]', root).forEach(el => { el.innerHTML = list.length ? '' : M.emptyHTML(st.savedOnly, savedCount()); });
    // Chips are updated in place (never rebuilt) so keyboard focus and horizontal scroll survive.
    $$('[data-filter]', root).forEach(c => c.setAttribute('aria-pressed', String(c.dataset.filter === st.filter)));
    const head = M.headingText(list.length, st.savedOnly);
    $$('[data-heading]', root).forEach(el => { if (el.textContent !== head) el.textContent = head; });
    $$('[data-count]', root).forEach(el => { el.textContent = String(list.length); });
    sync(); savedUI();
    const i = Math.max(0, keep);
    cur = -1; snap(i); setCur(i, true);
    paint.after?.(list);
  }
  function set(patch: Partial<State>) { Object.assign(st, patch); render(); }
  function reset() { set({ q: '', filter: 'all', savedOnly: false }); paint.afterReset?.(); }
  function setMode(m: Mode) {
    const from = st.mode;
    st.mode = m; root.dataset.state = m; // not data-mode: that marks the toggle buttons
    $$('[data-mode]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    paint.mode(m, from);
    if (m === 'feed') snap(cur);
  }
  /** Grid card / search row → Feed, positioned on that deal. */
  function openAt(id: string) {
    const i = list.findIndex(d => d.id === id);
    if (i < 0) return;
    paint.beforeOpen?.();
    cur = -1; curId = id;
    setMode('feed');
    snap(i); setCur(i);
    feed.focus({ preventScroll: true });
  }

  // Text fields → `input`; selects → `change` (one render per edit).
  root.addEventListener('input', e => {
    const el = e.target as HTMLInputElement;
    if (el.dataset?.bind === 'q') set({ q: el.value });
  });
  root.addEventListener('change', e => {
    const el = e.target as HTMLSelectElement;
    if (el.matches?.('[data-sort]')) set({ sort: el.value as SortKey });
  });
  root.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    const pick = (sel: string, key: string) => t.closest<HTMLElement>(sel)?.dataset[key];
    let v: string | undefined;
    if ((v = pick('[data-filter]', 'filter'))) return set({ filter: v as Filter }); // mode stays as it is
    if (t.closest('[data-saved-toggle]')) return set({ savedOnly: !st.savedOnly });
    if (t.closest('[data-reset]')) return reset();
    if ((v = pick('[data-mode]', 'mode'))) return v !== st.mode ? setMode(v as Mode) : undefined;
    if ((v = pick('[data-save]', 'save'))) { saved.toggle(v); return; }
    if ((v = pick('[data-details]', 'details'))) { const d = byId.get(v); if (d) openQuickView(d, { mobile, saved }); return; }
    if ((v = pick('[data-goto]', 'goto'))) return go(list.findIndex(d => d.id === v));
    if ((v = pick('[data-open]', 'open'))) return openAt(v);
  });
  saved.onChange(() => (st.savedOnly ? render() : savedUI()));

  return {
    st, deals, byId, saved, feed, set, render, setMode, go, snap, openAt,
    list: () => list, cur: () => cur, current: () => list[cur] as ClientDeal | undefined,
  };
}
