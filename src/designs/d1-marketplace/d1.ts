import { matchDeal, sortDeals, type ClientDeal, type Filter, type SortKey } from '../../lib/deals';
import { readDeals } from '../../lib/client/data';
import { createSavedStore } from '../../lib/client/saved';
import { openQuickView } from '../../lib/client/quickview';
import { $, $$ } from '../../lib/client/dom';
import { cardHTML, chipsHTML, emptyHTML, SORTS } from './markup';

interface State { q: string; filter: Filter; budget: string; sort: SortKey; savedOnly: boolean }
type Bound = 'q' | 'filter' | 'budget' | 'sort';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollToEl = (el: Element) => el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });

/** Budget filter: "under X" reuses matchDeal's price parsing; "5m+" is a lower bound. */
export function fitsBudget(d: ClientDeal, budget: string): boolean {
  if (!budget) return true;
  if (budget === '5m+') return d.price >= 5e6;
  return matchDeal(d, 'under ' + budget, 'all');
}

/** Shared engine for both versions: state, filtering, rendering, saved + quick view wiring. */
function engine(root: HTMLElement, mobile: boolean, onRender: (count: number) => void = () => {}) {
  const deals = readDeals();
  const byId = new Map(deals.map(d => [d.id, d]));
  const saved = createSavedStore();
  const st: State = { q: '', filter: 'all', budget: '', sort: 'newest', savedOnly: false };
  const grid = $('[data-grid]', root);
  const chips = root.querySelector<HTMLElement>('[data-chips]');

  const savedCount = () => saved.list().filter(id => byId.has(id)).length;
  const results = () => sortDeals(deals.filter(d =>
    matchDeal(d, st.q, st.filter) && fitsBudget(d, st.budget) && (!st.savedOnly || saved.has(d.id))), st.sort);

  /** Push state into every bound control (inputs, selects, radio groups). */
  function sync() {
    $$('[data-bind]', root).forEach(el => {
      const v = String(st[el.dataset.bind as Bound]);
      if (el instanceof HTMLInputElement && el.type === 'radio') el.checked = el.value === v;
      else if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) { if (el.value !== v) el.value = v; }
    });
  }
  function savedUI() {
    const n = String(savedCount());
    $$('[data-saved-count]', root).forEach(el => { el.textContent = n; });
    $$('[data-saved-toggle]', root).forEach(el => el.setAttribute('aria-pressed', String(st.savedOnly)));
    $$('[data-deal-id]', grid).forEach(c => c.querySelector('[data-save]')?.setAttribute('aria-pressed', String(saved.has(c.dataset.dealId!))));
  }
  function render() {
    const list = results();
    grid.innerHTML = list.length ? list.map(d => cardHTML(d, saved.has(d.id), mobile)).join('') : emptyHTML(st.savedOnly, savedCount());
    // Chips are updated in place (never rebuilt) so keyboard focus and the mobile row's scroll position survive.
    if (chips && !chips.querySelector('[data-filter]')) chips.innerHTML = chipsHTML(deals, st.filter);
    $$('[data-filter]', root).forEach(c => c.setAttribute('aria-pressed', String(c.dataset.filter === st.filter)));
    $$('[data-count]', root).forEach(el => { el.textContent = String(list.length); });
    $$('[data-count-label]', root).forEach(el => { el.textContent = list.length === 1 ? 'opportunity' : 'opportunities'; });
    $$('[data-results-label]', root).forEach(el => { el.textContent = list.length === 1 ? 'result' : 'results'; });
    $$('[data-sort-label]', root).forEach(el => { el.textContent = SORTS.find(s => s.key === st.sort)!.label; });
    $$('[data-filtered]', root).forEach(el => { el.hidden = !(st.q.trim() || st.filter !== 'all' || st.budget || st.savedOnly); });
    sync(); savedUI(); onRender(list.length);
  }
  function set(patch: Partial<State>) { Object.assign(st, patch); render(); }
  function reset() { set({ q: '', filter: 'all', budget: '', savedOnly: false }); }

  // Controls: any element with data-bind writes to state.
  const onControl = (e: Event) => {
    const el = e.target as HTMLInputElement;
    const key = el.dataset?.bind as Bound | undefined;
    if (!key || (el.type === 'radio' && !el.checked)) return;
    set({ [key]: el.value } as Partial<State>);
  };
  root.addEventListener('input', onControl);
  root.addEventListener('change', onControl);

  root.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    const filterBtn = t.closest<HTMLElement>('[data-filter]');
    if (filterBtn) { set({ filter: filterBtn.dataset.filter as Filter }); return; }
    if (t.closest('[data-reset]')) { reset(); return; }
    if (t.closest('[data-saved-toggle]')) { set({ savedOnly: !st.savedOnly }); return; }
  });

  // Grid: save toggles and quick view (event delegation).
  grid.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    const card = t.closest<HTMLElement>('[data-deal-id]');
    if (!card) return;
    const d = byId.get(card.dataset.dealId!);
    if (!d) return;
    if (t.closest('[data-save]')) { saved.toggle(d.id); return; }
    if (t.closest('a,button') && !t.closest('[data-open]')) return;
    openQuickView(d, { mobile, saved });
  });
  saved.onChange(() => (st.savedOnly ? render() : savedUI()));

  render();
  return { st, set, render, deals };
}

export function initDesktop(root: HTMLElement): void {
  const results = $('[data-results]', root);
  const app = engine(root, false);
  $('[data-search]', root).addEventListener('submit', e => { e.preventDefault(); scrollToEl(results); });
  // Nav "Distress deals": filter + scroll.
  $$('[data-goto-filter]', root).forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    app.set({ filter: a.dataset.gotoFilter as Filter, savedOnly: false });
    scrollToEl(results);
  }));
}

export function initMobile(root: HTMLElement): void {
  // Park the preview-bar design button inside our header (left of the WhatsApp button).
  document.documentElement.style.setProperty('--pv-mtop', '9px');
  document.documentElement.style.setProperty('--pv-mright', '64px');
  engine(root, true);
  const sheet = $('[data-sheet]', root), dim = $('[data-sheet-dim]', root);
  let back: HTMLElement | null = null;
  const isOpen = () => sheet.classList.contains('on');
  const open = (from: HTMLElement) => {
    back = from;
    sheet.inert = false; sheet.removeAttribute('aria-hidden');
    sheet.classList.add('on'); dim.classList.add('on');
    sheet.querySelector<HTMLElement>('input:checked')?.focus();
  };
  const close = () => {
    if (!isOpen()) return;
    sheet.classList.remove('on'); dim.classList.remove('on');
    sheet.inert = true; sheet.setAttribute('aria-hidden', 'true');
    back?.focus(); back = null;
  };
  sheet.inert = true; sheet.setAttribute('aria-hidden', 'true');
  $$('[data-sheet-open]', root).forEach(b => b.addEventListener('click', () => open(b)));
  $$('[data-sheet-close]', root).forEach(b => b.addEventListener('click', close));
  dim.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  $('[data-search]', root).addEventListener('submit', e => {
    e.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur();
    scrollToEl($('[data-results]', root));
  });
}
