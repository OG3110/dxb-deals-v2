// Design 4 · shared engine for desktop and mobile: feed state (tab / filter), the snap-feed position, search and
// grid results, the saved store and every delegated control both versions have in common. Search and "All" are
// overlays on top of the feed (never a mode), so the feed keeps its position underneath them.
import { fmtMoney, matchDeal, sortDeals, type ClientDeal, type Filter, type SortKey } from '../../lib/deals';
import { readDeals } from '../../lib/client/data';
import { createSavedStore } from '../../lib/client/saved';
import { openQuickView } from '../../lib/client/quickview';
import { $, $$ } from '../../lib/client/dom';
import * as M from './markup';

export interface Paint {
  slide(d: ClientDeal, i: number, n: number, saved: boolean): string;
  card(d: ClientDeal, saved: boolean): string;
  /** Feed position changed (or the feed was rebuilt). `d` is null when the feed is empty. */
  current(d: ClientDeal | null, i: number, list: ClientDeal[]): void;
  /** A search row / grid card was chosen: close the overlay, then call app.jump(id, fromGrid). */
  open(id: string, fromGrid: boolean): void;
  afterReset?(): void;
  /** Grid re-rendered (count / saved mode changed). */
  afterGrid?(n: number): void;
}
export type App = ReturnType<typeof engine>;

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Rendered only while its overlay is open, so closed overlays never hold stray [data-deal-id] elements. */
const shown = (el: HTMLElement) => !el.closest('[hidden]');

function hashId(): string {
  try { return decodeURIComponent(location.hash.slice(1)).trim().toUpperCase(); } catch { return ''; }
}

export function engine(root: HTMLElement, mobile: boolean, paint: Paint) {
  const deals = readDeals();
  const byId = new Map(deals.map(d => [d.id, d]));
  const saved = createSavedStore();
  const st = { feed: 'foryou' as M.FeedKey, q: '', filter: 'all' as Filter, sort: 'newest' as SortKey, savedOnly: false };
  const reel = $('[data-reel]', root), toastEl = $('[data-toast]', root);
  const fromHash = hashId();
  let list: ClientDeal[] = [], cur = -1, curId = byId.has(fromHash) ? fromHash : '';
  let target = -1, tid = 0;

  const savedCount = () => saved.list().filter(id => byId.has(id)).length;
  const clamp = (i: number) => Math.max(0, Math.min(list.length - 1, i));
  const h = () => reel.clientHeight;

  /* ---------- feed position: every slide is exactly one feed tall, so index ⇄ scrollTop = i * height ---------- */
  function setCur(i: number, force = false) {
    if (!list.length) { cur = -1; paint.current(null, -1, list); return; }
    i = clamp(i);
    if (i === cur && !force) return;
    cur = i; curId = list[i].id;
    if (i > 0) root.classList.add('d4-moved'); // the swipe hint has done its job
    paint.current(list[i], i, list);
  }
  function snap(i = cur) { target = -1; if (h() && i >= 0) reel.scrollTop = clamp(i) * h(); }
  function go(i: number) {
    if (!list.length) return;
    target = clamp(i); setCur(target);
    clearTimeout(tid); tid = window.setTimeout(() => { target = -1; }, 900); // a wheel/swipe may interrupt the smooth scroll
    reel.scrollTo({ top: target * h(), behavior: reduced() ? 'auto' : 'smooth' });
  }
  reel.addEventListener('scroll', () => {
    const fh = h();
    if (!fh || !list.length) return;
    const at = clamp(Math.round(reel.scrollTop / fh));
    if (target < 0 || at === target) { target = -1; setCur(at); }
  }, { passive: true });
  window.addEventListener('resize', () => snap());

  function renderFeed() {
    list = M.feedList(deals, st.feed);
    const keep = list.findIndex(d => d.id === curId);
    reel.innerHTML = list.length ? list.map((d, i) => paint.slide(d, i, list.length, saved.has(d.id))).join('') : '';
    root.classList.toggle('d4-none', !list.length);
    $$('[data-feed-empty]', root).forEach(el => { el.innerHTML = list.length ? '' : M.emptyHTML('feed'); });
    $$('[data-set-feed][aria-pressed]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setFeed === st.feed)));
    $$('[data-feed-label]', root).forEach(el => { el.textContent = M.feedLabel(st.feed); });
    cur = -1; snap(Math.max(0, keep)); setCur(Math.max(0, keep), true);
  }
  function setFeed(k: M.FeedKey) {
    if (k === st.feed) { go(0); return; } // tapping the active tab again = back to the top, like TikTok
    st.feed = k; curId = ''; renderFeed();
  }
  /** Position the feed on a deal. A card picked from a filtered grid turns the feed into that filter ("watch these");
   *  anything else keeps the current feed when it holds the deal, otherwise falls back to "For you". */
  function jump(id: string, fromGrid = false) {
    if (!byId.has(id)) return;
    curId = id;
    if (fromGrid && !st.savedOnly && st.filter !== 'all') st.feed = st.filter;
    else if (!list.some(d => d.id === id)) st.feed = 'foryou';
    renderFeed();
    reel.focus({ preventScroll: true });
  }

  /* ---------- search results and the grid ---------- */
  const searchResults = () => deals.filter(d => matchDeal(d, st.q, 'all'));
  const gridResults = () => sortDeals(deals.filter(d => (st.savedOnly ? saved.has(d.id) : matchDeal(d, '', st.filter))), st.sort);
  function renderSearch() {
    const res = searchResults();
    $$('[data-results]', root).filter(shown).forEach(el => { el.innerHTML = M.rowsHTML(res); });
    const head = M.resultsText(res.length, st.q);
    $$('[data-results-head]', root).forEach(el => { if (el.textContent !== head) el.textContent = head; });
    $$('[data-bind=q]', root).forEach(el => { const i = el as HTMLInputElement; if (i.value !== st.q) i.value = st.q; });
    return res;
  }
  function renderGrid() {
    const res = gridResults();
    $$('[data-grid]', root).filter(shown).forEach(el => {
      el.innerHTML = res.length ? res.map(d => paint.card(d, saved.has(d.id))).join('') : M.emptyHTML(st.savedOnly ? 'saved' : 'search');
    });
    // Chips are updated in place (never rebuilt) so keyboard focus and horizontal scroll survive.
    $$('[data-filter]', root).forEach(c => c.setAttribute('aria-pressed', String(!st.savedOnly && c.dataset.filter === st.filter)));
    $$('[data-saved-toggle]', root).forEach(c => c.setAttribute('aria-pressed', String(st.savedOnly)));
    $$('[data-sort]', root).forEach(el => { const s = el as HTMLSelectElement; if (s.value !== st.sort) s.value = st.sort; });
    const head = M.headingText(res.length, st.savedOnly);
    $$('[data-grid-head]', root).forEach(el => { if (el.textContent !== head) el.textContent = head; });
    paint.afterGrid?.(res.length);
  }
  function savedUI() {
    const n = savedCount();
    $$('[data-saved-count]', root).forEach(el => { el.textContent = String(n); });
    $$('[data-saved-badge]', root).forEach(el => { el.textContent = String(n); el.hidden = !n; });
    $$('[data-save]', root).forEach(b => b.setAttribute('aria-pressed', String(saved.has(b.dataset.save!))));
  }
  function reset() {
    st.q = ''; st.filter = 'all'; st.savedOnly = false;
    renderSearch(); renderGrid();
    paint.afterReset?.();
  }

  /* ---------- toast + share ---------- */
  let toastT = 0;
  function toast(msg: string) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = window.setTimeout(() => toastEl.classList.remove('on'), 1800);
  }
  async function share(d: ClientDeal) {
    const url = `${location.origin}${location.pathname}#${d.id}`;
    const data = { title: `${d.title} – ${d.area} · DXB Deals`, text: `${d.id} · ${d.title} – ${d.area} · AED ${fmtMoney(d.price)}`, url };
    if (mobile && navigator.share) {
      try { await navigator.share(data); return; } catch (e) { if ((e as DOMException)?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast(url); }
  }

  /* ---------- delegated controls ---------- */
  // Text fields → `input`; selects → `change` (one render per edit).
  root.addEventListener('input', e => {
    const el = e.target as HTMLInputElement;
    if (el.dataset?.bind === 'q') { st.q = el.value; renderSearch(); }
  });
  root.addEventListener('change', e => {
    const el = e.target as HTMLSelectElement;
    if (el.matches?.('[data-sort]')) { st.sort = el.value as SortKey; renderGrid(); }
  });
  root.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    const pick = (sel: string, key: string) => t.closest<HTMLElement>(sel)?.dataset[key];
    let v: string | undefined;
    if ((v = pick('[data-set-feed]', 'setFeed')) && M.isFeedKey(v)) return setFeed(v);
    if ((v = pick('[data-filter]', 'filter'))) { st.filter = v as Filter; st.savedOnly = false; return renderGrid(); }
    if (t.closest('[data-saved-toggle]')) { st.savedOnly = !st.savedOnly; return renderGrid(); }
    if (t.closest('[data-reset]')) return reset();
    if ((v = pick('[data-save]', 'save'))) { toast(saved.toggle(v) ? 'Saved' : 'Removed from saved'); return; }
    if ((v = pick('[data-details]', 'details'))) { const d = byId.get(v); if (d) openQuickView(d, { mobile, saved }); return; }
    if ((v = pick('[data-share]', 'share'))) { const d = byId.get(v); if (d) void share(d); return; }
    if ((v = pick('[data-open]', 'open'))) return paint.open(v, !!t.closest('[data-grid]'));
  });
  saved.onChange(() => { savedUI(); if (st.savedOnly) renderGrid(); });

  /* ---------- double-tap / double-click a flyer = save (+ burst) ---------- */
  let last = { t: 0, x: 0, y: 0 };
  reel.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    const slide = t.closest<HTMLElement>('[data-deal-id]');
    if (!slide || t.closest('a,button')) return;
    const near = Math.hypot(e.clientX - last.x, e.clientY - last.y) < 40;
    if (e.timeStamp - last.t < 350 && near) {
      last = { t: 0, x: 0, y: 0 };
      const id = slide.dataset.dealId!;
      if (!saved.has(id)) saved.toggle(id);
      burst(slide, e.clientX, e.clientY);
      toast('Saved');
    } else last = { t: e.timeStamp, x: e.clientX, y: e.clientY };
  });
  function burst(slide: HTMLElement, x: number, y: number) {
    const r = slide.getBoundingClientRect();
    const b = document.createElement('span');
    b.className = 'd4-burst';
    b.setAttribute('aria-hidden', 'true');
    b.style.left = `${x - r.left}px`; b.style.top = `${y - r.top}px`;
    b.innerHTML = mobile ? M.ICON.mark(104) : M.ICON.heart(104);
    slide.append(b);
    window.setTimeout(() => b.remove(), 900);
  }

  function init() {
    renderFeed(); renderSearch(); renderGrid(); savedUI();
    window.setTimeout(() => root.classList.add('d4-moved'), 6000); // the swipe hint never lingers over a flyer
  }

  return {
    st, deals, byId, saved, reel, init, go, snap, jump, setFeed, renderSearch, renderGrid, toast,
    list: () => list, cur: () => cur, results: searchResults,
  };
}
