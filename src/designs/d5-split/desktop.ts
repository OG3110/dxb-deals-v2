// Design 5 · Split Scroll — desktop: cream page split in two. The left column holds the current deal in big type
// (counter, category, title, place, price / rent / size, Details · Ask on WhatsApp · Save, progress dots) and swaps
// it with a fade whenever another flyer snaps in on the right. Search is an inline field at the top left that
// narrows the flyer column; "All" / "Saved" open a full-width overview overlay.
import { waLink, type ClientDeal } from '../../lib/deals';
import { isQuickViewOpen } from '../../lib/client/quickview';
import { $, $$ } from '../../lib/client/dom';
import { createWheelStepper } from '../../lib/client/wheel';
import { engine, swap } from './engine';
import * as M from './markup';

export function initDesktop(root: HTMLElement): void {
  const main = $('[data-main]', root), ov = $('[data-ov]', root);
  const sf = $('[data-sf]', root), q = $('[data-bind=q]', sf) as HTMLInputElement, sbtn = $('[data-search-toggle]', root);
  const ctr = $('[data-ctr]', root), info = $('[data-info]', root), dots = $('[data-dots]', root), cta = $('[data-cta]', root);
  const det = $('[data-cta-details]', root), wa = $('[data-cta-wa]', root) as HTMLAnchorElement, sv = $('[data-cta-save]', root);
  let shownId: string | null = '', dotsFor: ClientDeal[] | null = null, ovFrom: HTMLElement | null = null;

  const app = engine(root, false, {
    current(d, i, list) {
      ctr.innerHTML = M.counterHTML(i, list.length);
      ctr.setAttribute('aria-label', M.counterLabel(i, list.length));
      if (dotsFor !== list) { dotsFor = list; dots.innerHTML = M.dotsHTML(list.length); }
      const on = d ? M.dotFor(i, list.length) : -1;
      [...dots.children].forEach((el, j) => el.classList.toggle('on', j === on));
      cta.hidden = !d;
      if ((d?.id ?? null) === shownId) return;
      shownId = d?.id ?? null;
      swap(info, M.infoHTML(d));
      if (!d) return;
      // The buttons stay in place (focus survives a deal change); only their target changes.
      const l = M.actLabels(d);
      det.dataset.details = d.id; det.setAttribute('aria-label', l.details);
      wa.href = waLink(d); wa.setAttribute('aria-label', l.wa);
      sv.dataset.save = d.id; sv.setAttribute('aria-label', l.save); sv.setAttribute('aria-pressed', String(app.saved.has(d.id)));
    },
    open(id, fromGrid) {
      closeOverlay(false);
      app.jump(id, fromGrid);
    },
    afterReset(inLayer) {
      // A reset inside the overview (e.g. "Browse all deals" in an empty Saved view) stays there: the page behind is
      // inert. A reset of the flyer column returns to the search field when it is open.
      if (inLayer || !ov.hidden) { if (!ov.hidden) $('[data-ov-close]', ov).focus(); return; } // the pressed button is gone
      if (!sf.hidden) q.focus();
    },
  });

  /* ---------- inline search at the top left: narrows the flyer column ---------- */
  function openSearch() {
    if (!ov.hidden) closeOverlay(false);
    sf.hidden = false; sbtn.setAttribute('aria-expanded', 'true'); root.classList.add('d5-searching');
    q.focus(); q.select();
  }
  function closeSearch(restore = true) {
    if (app.st.q) app.clearFeed(); // also empties the field
    sf.hidden = true; sbtn.setAttribute('aria-expanded', 'false'); root.classList.remove('d5-searching');
    if (restore) sbtn.focus();
  }
  sbtn.addEventListener('click', () => (sf.hidden ? openSearch() : closeSearch()));
  $('[data-search-close]', sf).addEventListener('click', () => closeSearch());
  // Enter: show the first match (the column is already narrowed while typing).
  sf.addEventListener('submit', e => { e.preventDefault(); if (app.list().length) app.jump(app.list()[0].id); });

  /* ---------- "All" / "Saved" overview (modal: inert page, Escape, backdrop, focus restore) ---------- */
  function openOverlay(savedOnly: boolean, from: HTMLElement) {
    ovFrom = from;
    app.st.savedOnly = savedOnly;
    ov.hidden = false; ov.removeAttribute('aria-hidden'); main.inert = true;
    app.renderGrid();
    $('[data-ov-scroll]', ov).scrollTop = 0;
    $('[data-ov-close]', ov).focus();
  }
  function closeOverlay(restore = true) {
    if (ov.hidden) return;
    ov.hidden = true; ov.setAttribute('aria-hidden', 'true'); main.inert = false;
    $('[data-grid]', ov).innerHTML = ''; // no stray [data-deal-id] cards while closed
    const back = ovFrom; ovFrom = null;
    if (restore && back && document.contains(back)) back.focus();
  }
  $$('[data-ov-open]', root).forEach(b => b.addEventListener('click', () => openOverlay(b.dataset.ovOpen === 'saved', b)));
  $$('[data-ov-x]', ov).forEach(b => b.addEventListener('click', () => closeOverlay()));

  /* ---------- navigation: one flyer per wheel gesture anywhere on the page, keys ---------- */
  const wheel = createWheelStepper({ idleMs: 200, threshold: 30 });
  root.addEventListener('wheel', e => {
    if (!ov.hidden || isQuickViewOpen()) return; // the overview scrolls natively
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; // pinch-zoom / horizontal
    e.preventDefault();
    const step = wheel.onWheel(e.deltaY, e.deltaMode, e.timeStamp, app.reel.clientHeight);
    if (step) app.go(app.cur() + step);
  }, { passive: false });

  // Capture phase on window: runs before the quick view's own Escape handler and bails out while it is open.
  window.addEventListener('keydown', e => {
    if (isQuickViewOpen()) return;
    const t = e.target as HTMLElement;
    const typing = !!t.closest?.('input,select,textarea,[contenteditable=true]');
    if (((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey)) {
      e.preventDefault(); openSearch(); return;
    }
    if (e.key === 'Escape') {
      if (!ov.hidden) { e.preventDefault(); closeOverlay(); return; }
      // Search open: the first Escape clears the query, the next one closes the field.
      if (!sf.hidden) { e.preventDefault(); if (q.value) app.clearFeed(); else closeSearch(); }
      return;
    }
    if (typing || !ov.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    const step = ({ ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 } as Record<string, number>)[e.key];
    if (step) { e.preventDefault(); app.go(app.cur() + step); }
    else if (e.key === 'Home') { e.preventDefault(); app.go(0); }
    else if (e.key === 'End') { e.preventDefault(); app.go(app.list().length - 1); }
  }, true);

  app.init();
}
