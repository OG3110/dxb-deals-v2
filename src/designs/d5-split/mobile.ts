// Design 5 · Split Scroll — mobile: a vertical snap column of flyer cards between a slim top bar and a fixed cream
// glass panel at the bottom that always shows the current deal (counter, title, place, price / rent / size,
// WhatsApp · Save · Details) and fades to the next one when another card snaps in. Search and All / Saved are
// sheets over the page.
import { waLink, type ClientDeal } from '../../lib/deals';
import { isQuickViewOpen } from '../../lib/client/quickview';
import { $, $$ } from '../../lib/client/dom';
import { engine, swap } from './engine';
import * as M from './markup';

type Sheet = 'search' | 'all' | 'saved';

export function initMobile(root: HTMLElement): void {
  // Park the preview-bar ◐ button in the slot reserved at the right end of the top bar.
  document.documentElement.style.setProperty('--pv-mtop', '9px');
  document.documentElement.style.setProperty('--pv-mright', '10px');
  const page = $('[data-page]', root), ss = $('[data-sheet=search]', root), gs = $('[data-sheet=grid]', root);
  const q = $('[data-bind=q]', ss) as HTMLInputElement;
  const ctr = $('[data-ctr]', root), info = $('[data-info]', root), acts = $('[data-acts]', root);
  const det = $('[data-cta-details]', root), wa = $('[data-cta-wa]', root) as HTMLAnchorElement, sv = $('[data-cta-save]', root);
  let open: Sheet | null = null, from: HTMLElement | null = null, shownId: string | null = '';

  const app = engine(root, true, {
    current(d: ClientDeal | null, i: number, list: ClientDeal[]) {
      ctr.innerHTML = M.counterHTML(i, list.length);
      ctr.setAttribute('aria-label', M.counterLabel(i, list.length));
      acts.hidden = !d;
      if ((d?.id ?? null) === shownId) return;
      shownId = d?.id ?? null;
      swap(info, M.minfoHTML(d));
      if (!d) return;
      const l = M.actLabels(d);
      det.dataset.details = d.id; det.setAttribute('aria-label', l.details);
      wa.href = waLink(d); wa.setAttribute('aria-label', l.wa);
      sv.dataset.save = d.id; sv.setAttribute('aria-label', l.save); sv.setAttribute('aria-pressed', String(app.saved.has(d.id)));
    },
    open(id, fromGrid) {
      close(false);
      app.jump(id, fromGrid);
    },
    afterReset(inLayer) {
      if (!inLayer) return;
      if (open === 'saved') show('all'); // "Browse all deals" from the empty Saved sheet
      else if (open === 'search') q.focus({ preventScroll: true });
      else if (open) $('[data-sheet-x]', gs).focus({ preventScroll: true }); // the pressed button is gone
    },
  });

  /* ---------- sheets: page inert while open, Escape, focus restore ---------- */
  function hide(el: HTMLElement) {
    el.hidden = true; el.inert = true; el.setAttribute('aria-hidden', 'true');
    $$('[data-results],[data-grid]', el).forEach(c => { c.innerHTML = ''; }); // no stray [data-deal-id] while closed
  }
  function reveal(el: HTMLElement) { el.hidden = false; el.inert = false; el.removeAttribute('aria-hidden'); }
  function show(s: Sheet) {
    if (s === open) return;
    if (open) hide(open === 'search' ? ss : gs);
    else { const a = document.activeElement; from = a instanceof HTMLElement && a !== document.body ? a : null; }
    open = s; page.inert = true;
    if (s === 'search') {
      reveal(ss); app.renderRows();
      $('[data-scroll]', ss).scrollTop = 0;
      q.focus({ preventScroll: true });
    } else {
      app.st.savedOnly = s === 'saved';
      gs.dataset.kind = s; // CSS hides the chips in Saved
      $('[data-grid-title]', gs).textContent = s === 'saved' ? 'Saved' : 'All deals';
      reveal(gs); app.renderGrid();
      $('[data-scroll]', gs).scrollTop = 0;
      $('[data-sheet-x]', gs).focus({ preventScroll: true });
    }
  }
  function close(restore = true) {
    if (!open) return;
    hide(open === 'search' ? ss : gs);
    open = null; page.inert = false;
    const back = from; from = null;
    if (restore && back && document.contains(back)) back.focus({ preventScroll: true });
  }
  hide(ss); hide(gs);
  $$('[data-sheet-open]', root).forEach(b => b.addEventListener('click', () => show(b.dataset.sheetOpen as Sheet)));
  $$('[data-sheet-x]', root).forEach(b => b.addEventListener('click', () => close()));
  // Enter / "Search" on the keyboard: show the narrowed column.
  $('form', ss).addEventListener('submit', e => { e.preventDefault(); q.blur(); if (app.list().length) close(); });

  // Capture phase: read the quick-view state before its own Escape handler closes it (one Escape = one layer).
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || isQuickViewOpen() || !open) return;
    e.preventDefault(); close();
  }, true);

  app.init();
}
