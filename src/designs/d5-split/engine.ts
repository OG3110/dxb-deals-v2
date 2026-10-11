// Design 5 · shared engine for desktop and mobile: the scroll list (search query or one filter), the active flyer
// (IntersectionObserver, threshold 0.6 on every flyer), the overview grid, the saved store and every delegated
// control both versions share. Version-specific chrome (left column / bottom panel, overlays, sheets) lives in
// ./desktop.ts and ./mobile.ts and is driven through the Paint callbacks.
import { matchDeal, sortDeals, type ClientDeal, type Filter, type SortKey } from '../../lib/deals';
import { readDeals } from '../../lib/client/data';
import { createSavedStore } from '../../lib/client/saved';
import { openQuickView } from '../../lib/client/quickview';
import { $, $$ } from '../../lib/client/dom';
import * as M from './markup';

export interface Paint {
  /** Active deal changed (or the list was rebuilt). `d` is null when the list is empty. */
  current(d: ClientDeal | null, i: number, list: ClientDeal[]): void;
  /** A search row / grid card was chosen: close the layer it lives in, then call app.jump(id, fromGrid). */
  open(id: string, fromGrid: boolean): void;
  /** After a reset; `inLayer` = the reset button sat inside an overlay / sheet. */
  afterReset?(inLayer: boolean): void;
}
export type App = ReturnType<typeof engine>;

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Swap the content of an animated block (restarts the CSS entrance animation; no-op styling under reduced motion). */
export function swap(el: HTMLElement, html: string) {
  el.innerHTML = html;
  el.classList.remove('d5-anim');
  if (!reduced()) { void el.offsetWidth; el.classList.add('d5-anim'); }
}
/** Rendered only while its layer is open, so closed layers never hold stray [data-deal-id] elements. */
const shown = (el: HTMLElement) => !el.closest('[hidden]');

function hashId(): string {
  try { return decodeURIComponent(location.hash.slice(1)).trim().toUpperCase(); } catch { return ''; }
}

export function engine(root: HTMLElement, mobile: boolean, paint: Paint) {
  const deals = readDeals();
  const byId = new Map(deals.map(d => [d.id, d]));
  const saved = createSavedStore();
  const st = { q: '', ff: 'all' as Filter, filter: 'all' as Filter, sort: 'newest' as SortKey, savedOnly: false };
  const reel = $('[data-reel]', root);
  const fromHash = hashId();
  let list: ClientDeal[] = [], cur = -1, curId = byId.has(fromHash) ? fromHash : '';
  let target = -1, lockT = 0;

  const clamp = (i: number) => Math.max(0, Math.min(list.length - 1, i));
  const items = () => $$('.d5-it', reel);
  /** scrollTop that centres item i in the column (items are snap-aligned to the centre). */
  function topOf(i: number): number {
    const it = items()[i];
    return it ? Math.max(0, it.offsetTop - (reel.clientHeight - it.offsetHeight) / 2) : 0;
  }

  /* ---------- active flyer ---------- */
  function setCur(i: number, force = false) {
    if (!list.length) { cur = -1; paint.current(null, -1, list); return; }
    i = clamp(i);
    if (i === cur && !force) return;
    cur = i; curId = list[i].id;
    items().forEach((it, j) => it.classList.toggle('on', j === i));
    if (i > 0) root.classList.add('d5-moved'); // the scroll hint has done its job
    paint.current(list[i], i, list);
  }
  /** Fallback when no threshold was crossed (e.g. an interrupted smooth scroll): the flyer nearest the centre wins. */
  function sync() {
    if (!list.length) return;
    const mid = reel.scrollTop + reel.clientHeight / 2;
    let best = 0, dist = Infinity;
    items().forEach((it, j) => { const d = Math.abs(it.offsetTop + it.offsetHeight / 2 - mid); if (d < dist) { dist = d; best = j; } });
    target = -1; setCur(best);
  }
  // Threshold 0.6 on each flyer: a flyer becomes active once 60 % of it is inside the column. While a programmatic
  // scroll runs, only its target may take over (no flicker through the deals in between).
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting || e.intersectionRatio < 0.6) continue;
      const i = Number((e.target as HTMLElement).dataset.card);
      if (target >= 0 && i !== target) continue;
      if (i === target) { target = -1; clearTimeout(lockT); }
      setCur(i);
    }
  }, { root: reel, threshold: 0.6 });

  function go(i: number, smooth = true) {
    if (!list.length) return;
    i = clamp(i);
    setCur(i);
    if (Math.abs(reel.scrollTop - topOf(i)) < 2) return;
    const anim = smooth && !reduced();
    target = anim ? i : -1;
    clearTimeout(lockT);
    if (anim) lockT = window.setTimeout(sync, 1500); // fallback: a wheel / swipe may interrupt the smooth scroll
    reel.scrollTo({ top: topOf(i), behavior: anim ? 'smooth' : 'auto' });
  }
  reel.addEventListener('scrollend', () => { if (target >= 0) { clearTimeout(lockT); sync(); } });
  window.addEventListener('resize', () => { if (cur >= 0) reel.scrollTop = topOf(cur); });

  /* ---------- the scroll list ---------- */
  function renderFeed() {
    list = M.feedList(deals, st);
    io.disconnect();
    reel.innerHTML = list.map((d, i) => M.itemHTML(d, i, list.length)).join('');
    root.classList.toggle('d5-none', !list.length);
    $$('[data-feed-empty]', root).forEach(el => { el.innerHTML = list.length ? '' : M.emptyHTML('search'); });
    const label = M.feedLabel(st);
    $$('[data-clear-feed]', root).forEach(b => {
      b.hidden = !label;
      $('[data-clear-text]', b).innerHTML = label;
    });
    const head = M.resultsText(list.length, st);
    $$('[data-results-head]', root).forEach(el => { if (el.textContent !== head) el.textContent = head; });
    const keep = Math.max(0, list.findIndex(d => d.id === curId));
    target = -1; cur = -1;
    reel.scrollTop = topOf(keep);
    setCur(keep, true);
    items().forEach(it => io.observe($('.d5-card', it)));
  }
  /** Position the list on a deal. A card picked from a filtered overview turns the list into that filter
   *  ("show me these"); otherwise the list is widened to everything when it does not hold the deal. */
  function jump(id: string, fromGrid = false) {
    if (!byId.has(id)) return;
    curId = id;
    if (fromGrid && !st.savedOnly && st.filter !== 'all') { st.ff = st.filter; st.q = ''; syncQ(); }
    else if (!list.some(d => d.id === id)) { st.ff = 'all'; st.q = ''; syncQ(); }
    renderFeed();
    reel.focus({ preventScroll: true });
  }
  function syncQ() { $$('[data-bind=q]', root).forEach(el => { const i = el as HTMLInputElement; if (i.value !== st.q) i.value = st.q; }); }

  /* ---------- search rows (mobile sheet) and the overview grid ---------- */
  function renderRows() {
    $$('[data-results]', root).filter(shown).forEach(el => { el.innerHTML = M.rowsHTML(list); });
  }
  function renderGrid() {
    const res = sortDeals(deals.filter(d => (st.savedOnly ? saved.has(d.id) : matchDeal(d, '', st.filter))), st.sort);
    $$('[data-grid]', root).filter(shown).forEach(el => {
      el.innerHTML = res.length ? res.map(d => M.cardHTML(d, saved.has(d.id))).join('') : M.emptyHTML(st.savedOnly ? 'saved' : 'search');
    });
    // Chips are updated in place (never rebuilt) so keyboard focus and horizontal scroll survive.
    $$('[data-filter]', root).forEach(c => c.setAttribute('aria-pressed', String(!st.savedOnly && c.dataset.filter === st.filter)));
    $$('[data-saved-toggle]', root).forEach(c => c.setAttribute('aria-pressed', String(st.savedOnly)));
    $$('[data-sort]', root).forEach(el => { const s = el as HTMLSelectElement; if (s.value !== st.sort) s.value = st.sort; });
    const head = M.headingText(res.length, st.savedOnly);
    $$('[data-grid-head]', root).forEach(el => { if (el.textContent !== head) el.textContent = head; });
  }
  function savedUI() {
    const n = saved.list().filter(id => byId.has(id)).length;
    $$('[data-saved-count]', root).forEach(el => { el.textContent = String(n); });
    $$('[data-saved-badge]', root).forEach(el => { el.textContent = String(n); el.hidden = !n; });
    $$('[data-save]', root).forEach(b => b.setAttribute('aria-pressed', String(saved.has(b.dataset.save!))));
  }
  /** A new query starts at its first result and always looks through everything. */
  function setQuery(q: string) {
    st.q = q; st.ff = 'all'; curId = '';
    renderFeed(); renderRows();
  }
  /** Back to the full list, staying on the deal being looked at. */
  function clearFeed() { st.q = ''; st.ff = 'all'; syncQ(); renderFeed(); renderRows(); }
  function reset(inLayer: boolean) {
    st.q = ''; st.ff = 'all'; st.filter = 'all'; st.savedOnly = false;
    syncQ(); renderFeed(); renderRows(); renderGrid();
    paint.afterReset?.(inLayer);
  }

  /* ---------- delegated controls ---------- */
  // Text fields → `input`; selects → `change` (one render per edit).
  root.addEventListener('input', e => {
    const el = e.target as HTMLInputElement;
    if (el.dataset?.bind === 'q') setQuery(el.value);
  });
  root.addEventListener('change', e => {
    const el = e.target as HTMLSelectElement;
    if (el.matches?.('[data-sort]')) { st.sort = el.value as SortKey; renderGrid(); }
  });
  root.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    const pick = (sel: string, key: string) => t.closest<HTMLElement>(sel)?.dataset[key];
    let v: string | undefined;
    if ((v = pick('[data-card]', 'card')) != null) {
      const i = Number(v);
      if (i === cur) { const d = list[i]; if (d) openQuickView(d, { mobile, saved }); } // the active flyer opens its details
      else go(i);
      return;
    }
    if ((v = pick('[data-goto]', 'goto')) != null) return go(Number(v));
    if ((v = pick('[data-filter]', 'filter'))) { st.filter = v as Filter; st.savedOnly = false; return renderGrid(); }
    if (t.closest('[data-saved-toggle]')) { st.savedOnly = !st.savedOnly; return renderGrid(); }
    if (t.closest('[data-reset]')) return reset(!!t.closest('[data-layer]'));
    if (t.closest('[data-clear-feed]')) return clearFeed();
    if ((v = pick('[data-save]', 'save'))) { saved.toggle(v); return; }
    if ((v = pick('[data-details]', 'details'))) { const d = byId.get(v); if (d) openQuickView(d, { mobile, saved }); return; }
    if ((v = pick('[data-open]', 'open'))) return paint.open(v, !!t.closest('[data-grid]'));
  });
  saved.onChange(() => { savedUI(); if (st.savedOnly) renderGrid(); });

  function init() {
    renderFeed(); renderGrid(); savedUI();
    window.setTimeout(() => root.classList.add('d5-moved'), 7000); // the scroll hint never lingers
  }

  return {
    st, deals, byId, saved, reel, init, go, jump, setQuery, clearFeed, renderRows, renderGrid, savedUI,
    list: () => list, cur: () => cur,
  };
}
