import { matchDeal, sortDeals, type ClientDeal, type Filter, type SortKey } from '../../lib/deals';
import { readDeals } from '../../lib/client/data';
import { createSavedStore } from '../../lib/client/saved';
import { $, $$ } from '../../lib/client/dom';
import { createFeed } from './feed';
import * as M from './markup';

interface State { q: string; filter: Filter; savedOnly: boolean; tkey: M.TableKey; tdir: M.Dir; msort: SortKey; view: 'table' | 'grid' }

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollToEl = (el: Element) => el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });

/** Shared engine for both versions: state, filtering, saved store, feed, delegated controls. */
function engine(root: HTMLElement, mobile: boolean, paint: (list: ClientDeal[]) => void) {
  const deals = readDeals();
  const byId = new Map(deals.map(d => [d.id, d]));
  const saved = createSavedStore();
  const st: State = { q: '', filter: 'all', savedOnly: false, tkey: 'id', tdir: -1, msort: 'newest', view: 'table' };
  const openFeedRaw = createFeed(root, saved, mobile);
  const hooks = { quick: () => {}, open: (_d: ClientDeal) => {} };

  const savedCount = () => saved.list().filter(id => byId.has(id)).length;
  const filtered = () => !!(st.q.trim() || st.filter !== 'all' || st.savedOnly);
  function results(): ClientDeal[] {
    const l = deals.filter(d => matchDeal(d, st.q, st.filter) && (!st.savedOnly || saved.has(d.id)));
    return mobile ? sortDeals(l, st.msort) : M.sortTable(l, st.tkey, st.tdir);
  }
  const feedTitle = () => st.savedOnly ? 'Saved deals' : st.q.trim() ? `Results for “${st.q.trim()}”` : M.filterLabel(st.filter);
  /** Open the feed on the current result list, starting at deal `id`. */
  function openAt(id: string) {
    const list = results();
    openFeedRaw(list, Math.max(0, list.findIndex(d => d.id === id)), feedTitle());
  }

  function sync() {
    $$('[data-bind]', root).forEach(el => {
      const v = String(st[el.dataset.bind as 'q' | 'msort']);
      if (el instanceof HTMLInputElement && el.type === 'radio') el.checked = el.value === v;
      else if (el instanceof HTMLInputElement && el.value !== v) el.value = v;
    });
  }
  function savedUI() {
    const n = String(savedCount());
    $$('[data-saved-count]', root).forEach(el => { el.textContent = n; });
    $$('[data-saved-toggle]', root).forEach(el => el.setAttribute('aria-pressed', String(st.savedOnly)));
    $$('[data-deal-id] [data-save]', root).forEach(b =>
      b.setAttribute('aria-pressed', String(saved.has(b.closest<HTMLElement>('[data-deal-id]')!.dataset.dealId!))));
  }
  function render() {
    const list = results();
    paint(list);
    // Chips/pills are updated in place (never rebuilt) so keyboard focus and horizontal scroll survive.
    $$('[data-filter]', root).forEach(c => c.setAttribute('aria-pressed', String(c.dataset.filter === st.filter)));
    $$('[data-quick]', root).forEach(c => {
      const p = M.QUICK[Number(c.dataset.quick)];
      c.setAttribute('aria-pressed', String(!st.savedOnly && st.q.trim() === p.q && st.filter === p.f));
    });
    const h = M.headingText(list.length, deals.length, filtered(), st.savedOnly);
    $$('[data-heading]', root).forEach(el => { if (el.textContent !== h) el.textContent = h; });
    $$('[data-count]', root).forEach(el => { el.textContent = String(list.length); });
    $$('[data-results-label]', root).forEach(el => { el.textContent = list.length === 1 ? 'result' : 'results'; });
    $$('[data-filtered]', root).forEach(el => { el.hidden = !filtered(); });
    sync(); savedUI();
  }
  function set(patch: Partial<State>) { Object.assign(st, patch); render(); }
  function reset() { set({ q: '', filter: 'all', savedOnly: false }); }

  // Text fields → `input`; radios → `change` (one render per edit).
  root.addEventListener('input', e => {
    const el = e.target as HTMLInputElement;
    if (el.dataset?.bind === 'q') set({ q: el.value });
  });
  root.addEventListener('change', e => {
    const el = e.target as HTMLInputElement;
    if (el.dataset?.bind === 'msort' && el.checked) set({ msort: el.value as SortKey });
  });
  root.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    const btn = <T extends string>(sel: string, key: T) => t.closest<HTMLElement>(sel)?.dataset[key];
    const f = btn('[data-filter]', 'filter');
    if (f) return set({ filter: f as Filter });
    const qi = btn('[data-quick]', 'quick');
    if (qi) { const p = M.QUICK[Number(qi)]; set({ q: p.q, filter: p.f, savedOnly: false }); return hooks.quick(); }
    if (t.closest('[data-reset]')) return reset();
    if (t.closest('[data-saved-toggle]')) return set({ savedOnly: !st.savedOnly });
    const ring = btn('[data-ring]', 'ring');
    if (ring) {
      const l = deals.filter(d => d.category === ring);
      return openFeedRaw(l, 0, M.filterLabel(ring as Filter));
    }
    const card = t.closest<HTMLElement>('[data-deal-id]');
    const d = card && byId.get(card.dataset.dealId!);
    if (!d) return;
    if (t.closest('[data-save]')) { saved.toggle(d.id); return; }
    if (t.closest('a,button,input') && !t.closest('[data-open]')) return;
    hooks.open(d);
  });
  saved.onChange(() => (st.savedOnly ? render() : savedUI()));

  return { st, set, render, results, openAt, hooks, deals, saved, savedCount };
}

/* ======================= desktop ======================= */
export function initDesktop(root: HTMLElement): void {
  const out = $('[data-out]', root), all = $('#d2-all', root);
  const app = engine(root, false, list => {
    const a = document.activeElement as HTMLElement | null;
    const keepSort = a?.dataset?.sort; // header/sort buttons are rebuilt — put focus back on the same one
    out.innerHTML = !list.length ? M.emptyHTML(app.st.savedOnly, app.savedCount())
      : app.st.view === 'table' ? M.tableHTML(list, app.st.tkey, app.st.tdir, id => isSaved(id))
      : M.sortBarHTML(app.st.tkey, app.st.tdir) + `<div class="d2-grid">${list.map(d => M.cardHTML(d, isSaved(d.id))).join('')}</div>`;
    if (keepSort) out.querySelector<HTMLElement>(`[data-sort="${keepSort}"]`)?.focus();
    $$('[data-view-btn]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.viewBtn === app.st.view)));
  });
  const isSaved = (id: string) => app.saved.has(id);
  app.hooks.open = d => app.openAt(d.id);
  root.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    const s = t.closest<HTMLElement>('[data-sort]');
    if (s) {
      const k = s.dataset.sort as M.TableKey;
      app.set(k === app.st.tkey ? { tdir: (app.st.tdir * -1) as M.Dir } : { tkey: k, tdir: 1 });
      return;
    }
    const v = t.closest<HTMLElement>('[data-view-btn]');
    if (v) app.set({ view: v.dataset.viewBtn as 'table' | 'grid' });
  });
  $$('[data-goto-all]', root).forEach(a => a.addEventListener('click', e => { e.preventDefault(); scrollToEl(all); }));
  initSuggest(root, app, all);
  app.render();
}

/** Hero search as an ARIA combobox: ↑/↓ move, Enter opens the highlighted deal in the feed, Escape closes. */
function initSuggest(root: HTMLElement, app: ReturnType<typeof engine>, all: HTMLElement) {
  const form = $('[data-search]', root), input = $('[data-q]', form) as HTMLInputElement, box = $('[data-sug]', form);
  let items: HTMLElement[] = [], active = -1;
  const isOpen = () => !box.hidden;
  function close() {
    box.hidden = true; active = -1;
    input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
  }
  function show() {
    if (!app.st.q.trim()) return close();
    const list = app.results();
    box.innerHTML = M.sugHTML(list.slice(0, 5), list.length, app.st.q);
    items = $$('[role=option]', box); active = -1;
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true'); input.removeAttribute('aria-activedescendant');
  }
  function move(i: number) {
    active = i;
    items.forEach((el, j) => el.setAttribute('aria-selected', String(j === i)));
    if (i >= 0) { input.setAttribute('aria-activedescendant', items[i].id); items[i].scrollIntoView({ block: 'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
  }
  function choose(el: HTMLElement) {
    close();
    if (el.dataset.sug) app.openAt(el.dataset.sug);
    else scrollToEl(all);
  }
  // Root listeners run in registration order: the engine has already stored the new query.
  root.addEventListener('input', e => { if (e.target === input) show(); });
  input.addEventListener('click', () => { if (!isOpen()) show(); });
  input.addEventListener('keydown', e => {
    const n = items.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!isOpen()) show(); else if (n) move(active + 1 >= n ? -1 : active + 1); }
    else if (e.key === 'ArrowUp') { if (!isOpen() || !n) return; e.preventDefault(); move(active - 1 < -1 ? n - 1 : active - 1); }
    else if (e.key === 'Enter' && isOpen() && active >= 0) { e.preventDefault(); choose(items[active]); }
    else if (e.key === 'Escape' && isOpen()) { e.preventDefault(); close(); }
  });
  box.addEventListener('mousedown', e => e.preventDefault()); // keep focus in the input
  box.addEventListener('click', e => { const it = (e.target as HTMLElement).closest<HTMLElement>('[role=option]'); if (it) choose(it); });
  box.addEventListener('mousemove', e => {
    const it = (e.target as HTMLElement).closest<HTMLElement>('[role=option]');
    if (it && items.indexOf(it) !== active) move(items.indexOf(it));
  });
  form.addEventListener('focusout', e => { if (!form.contains(e.relatedTarget as Node | null)) close(); });
  form.addEventListener('submit', e => { e.preventDefault(); close(); scrollToEl(all); });
  app.hooks.quick = () => { close(); scrollToEl(all); };
}

/* ======================= mobile ======================= */
export function initMobile(root: HTMLElement): void {
  // Park the preview-bar design button inside our header (left of the WhatsApp button).
  document.documentElement.style.setProperty('--pv-mtop', '9px');
  document.documentElement.style.setProperty('--pv-mright', '64px');
  const out = $('[data-out]', root), page = $('[data-page]', root), all = $('#d2-mall', root);
  const ss = $('[data-ss]', root), ssList = $('[data-ss-list]', ss), ssInput = $('[data-bind=q]', ss) as HTMLInputElement;
  const sort = $('[data-sort-sheet]', root), dim = $('[data-dim]', root);
  const app = engine(root, true, list => {
    out.innerHTML = list.length ? list.map(M.listRowHTML).join('') : M.emptyHTML(app.st.savedOnly, app.savedCount());
    if (!ss.hidden) ssList.innerHTML = list.length ? list.map(M.listRowHTML).join('') : M.emptyHTML(false, 1);
    const q = app.st.q.trim();
    $('[data-trigger-text]', root).textContent = q || 'Business, area or ID';
    $('[data-trigger]', root).classList.toggle('d2-has-q', !!q);
    $$('[data-clear-q]', root).forEach(b => { b.hidden = !q; });
    $('[data-ss-pop]', ss).hidden = !!q;
    $$('[data-sort-label]', root).forEach(el => { el.textContent = M.MSORTS.find(s => s.key === app.st.msort)!.label; });
  });

  // One helper for both overlays (search sheet + sort sheet): inert background, Escape, focus restore.
  let back: HTMLElement | null = null, current: HTMLElement | null = null;
  function openLayer(layer: HTMLElement, from: HTMLElement | null, focus: () => void) {
    if (current) closeLayer(false);
    back = from; current = layer;
    layer.hidden = false; layer.inert = false; layer.removeAttribute('aria-hidden');
    layer.classList.add('on');
    if (layer === sort) dim.classList.add('on');
    page.inert = true;
    if (layer === ss) document.documentElement.classList.add('d2-lock');
    focus();
  }
  function closeLayer(restore = true) {
    const layer = current;
    if (!layer) return;
    current = null;
    layer.classList.remove('on'); dim.classList.remove('on');
    layer.inert = true; layer.setAttribute('aria-hidden', 'true');
    if (layer === ss) { layer.hidden = true; ssList.innerHTML = ''; document.documentElement.classList.remove('d2-lock'); }
    page.inert = false;
    if (restore) back?.focus();
    back = null;
  }
  [ss, sort].forEach(l => { l.inert = true; l.setAttribute('aria-hidden', 'true'); });

  const trigger = $('[data-trigger]', root);
  const openSearch = () => openLayer(ss, trigger, () => { app.render(); ssInput.focus(); });
  trigger.addEventListener('click', openSearch);
  $$('[data-sort-open]', root).forEach(b => b.addEventListener('click', () =>
    openLayer(sort, b, () => sort.querySelector<HTMLElement>('input:checked')?.focus())));
  root.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-layer-close]')) closeLayer();
    else if (t.closest('[data-clear-q]')) { app.set({ q: '' }); if (current === ss) ssInput.focus(); }
    else if (t.closest('[data-ss-show]')) { closeLayer(); scrollToEl(all); }
  });
  dim.addEventListener('click', () => closeLayer());
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && current && !document.querySelector('.qv.on')) closeLayer(); });
  $('[data-ss-form]', ss).addEventListener('submit', e => { e.preventDefault(); closeLayer(); scrollToEl(all); });

  // Tapping a row (overview or live search list) opens the feed at that deal.
  app.hooks.open = d => { if (current === ss) closeLayer(); app.openAt(d.id); };
  app.hooks.quick = () => { if (current !== ss) scrollToEl(all); };
  app.render();
}
