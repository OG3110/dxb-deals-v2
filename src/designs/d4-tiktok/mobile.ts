// Design 4 · TikTok Feed — mobile: fullscreen snap feed with glass header (For you | Distress | New), glass rail and
// caption, and a glass tab bar. Search, All deals and Saved are sheets that slide over the feed; Details is the
// shared quick view (styled as a glass bottom sheet in d4-mob.css).
import { CATEGORIES } from '../../lib/deals';
import { isQuickViewOpen } from '../../lib/client/quickview';
import { $, $$, esc } from '../../lib/client/dom';
import { engine } from './engine';
import * as M from './markup';

type Tab = 'home' | 'search' | 'all' | 'saved';

export function initMobile(root: HTMLElement): void {
  // Park the preview-bar ◐ button in the slot reserved at the right end of our glass header.
  document.documentElement.style.setProperty('--pv-mtop', '16px');
  document.documentElement.style.setProperty('--pv-mright', '10px');
  const page = $('[data-page]', root), ss = $('[data-sheet=search]', root), gs = $('[data-sheet=grid]', root);
  const q = $('[data-bind=q]', ss) as HTMLInputElement, chip = $('[data-feed-chip]', root), hdr = $('[data-hdr]', root);
  const tabs = $$('[data-tab]', root);
  let open: Exclude<Tab, 'home'> | null = null, from: HTMLElement | null = null;

  const app = engine(root, true, {
    slide: M.mslideHTML,
    card: M.cardHTML,
    current() {
      // A category feed (chosen from the All sheet) has no header tab, so show it as a dismissible chip.
      const c = CATEGORIES.find(x => x.key === app.st.feed);
      chip.hidden = !c;
      hdr.classList.toggle('d4-hdr-cat', !!c);
      if (c) $('[data-feed-chip-text]', chip).innerHTML = `${c.icon} ${esc(c.label)}`;
    },
    open(id, fromGrid) {
      close(false);
      app.jump(id, fromGrid);
    },
    afterReset() {
      if (open === 'saved') show('all');
      else if (open === 'search') q.focus();
    },
  });

  /* ---------- sheets: page inert while open, Escape, focus restore; the tab bar stays live on top ---------- */
  function mark(t: Tab) { tabs.forEach(b => (b.dataset.tab === t ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'))); }
  function hide(el: HTMLElement) {
    el.hidden = true; el.inert = true; el.setAttribute('aria-hidden', 'true');
    $$('[data-results],[data-grid]', el).forEach(c => { c.innerHTML = ''; }); // no stray [data-deal-id] while closed
  }
  function reveal(el: HTMLElement) { el.hidden = false; el.inert = false; el.removeAttribute('aria-hidden'); }
  function show(t: Tab) {
    if (t === 'home') { if (open) close(); else app.go(0); return; }
    if (t === open) return;
    if (open) hide(open === 'search' ? ss : gs);
    else { const a = document.activeElement; from = a instanceof HTMLElement && a !== document.body ? a : null; }
    open = t; page.inert = true; mark(t);
    if (t === 'search') {
      reveal(ss); app.renderSearch();
      $('[data-scroll]', ss).scrollTop = 0;
      q.focus({ preventScroll: true });
    } else {
      app.st.savedOnly = t === 'saved';
      gs.dataset.kind = t; // CSS hides the chips in Saved
      $('[data-grid-title]', gs).textContent = t === 'saved' ? 'Saved' : 'All deals';
      reveal(gs); app.renderGrid();
      $('[data-scroll]', gs).scrollTop = 0;
      $('[data-sheet-x]', gs).focus({ preventScroll: true });
    }
  }
  function close(restore = true) {
    if (!open) return;
    hide(open === 'search' ? ss : gs);
    open = null; page.inert = false; mark('home');
    const back = from; from = null;
    if (restore) (back && document.contains(back) ? back : tabs[0]).focus({ preventScroll: true });
  }
  hide(ss); hide(gs);
  tabs.forEach(b => b.addEventListener('click', () => show(b.dataset.tab as Tab)));
  $$('[data-open-search]', root).forEach(b => b.addEventListener('click', () => show('search')));
  $$('[data-sheet-x]', root).forEach(b => b.addEventListener('click', () => close()));
  $('form', ss).addEventListener('submit', e => { e.preventDefault(); q.blur(); });

  // Capture phase: read the quick-view state before its own Escape handler closes it (one Escape = one layer).
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || isQuickViewOpen() || !open) return;
    e.preventDefault(); close();
  }, true);

  app.init();
}
