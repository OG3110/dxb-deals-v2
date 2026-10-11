// Design 3 · Feed ⇄ All — desktop: full-viewport dark app with a centred snap feed between the current deal's
// info panel and an "Up next" list, or the whole result set as a grid. Mobile lives in ./mobile.ts.
import type { ClientDeal } from '../../lib/deals';
import { isQuickViewOpen } from '../../lib/client/quickview';
import { $ } from '../../lib/client/dom';
import { engine } from './engine';
import { createWheelStepper } from './wheel';
import * as M from './markup';

export { initMobile } from './mobile';

export function initDesktop(root: HTMLElement): void {
  const info = $('[data-info]', root), cnt = $('[data-cnt]', root), next = $('[data-next]', root);
  const prev = $('[data-prev]', root) as HTMLButtonElement, nxt = $('[data-nextbtn]', root) as HTMLButtonElement;
  const feedv = $('[data-feedv]', root), allv = $('[data-allv]', root);
  const q = $('[data-bind=q]', root) as HTMLInputElement;
  let shown = '';

  const app = engine(root, false, {
    slide: (d, i, n) => M.slideHTML(d, i, n),
    card: (d, s) => M.cardHTML(d, s),
    current(d: ClientDeal | null, i, list) {
      cnt.textContent = d ? `${i + 1} / ${list.length}` : '0 / 0';
      prev.disabled = !d || i <= 0; nxt.disabled = !d || i >= list.length - 1;
      if (!d) { shown = ''; return; }
      next.innerHTML = M.nextHTML(list.slice(i + 1, i + 6));
      // Rebuilding the panel replays its entrance animation — only do it when the deal actually changes.
      if (d.id !== shown) { shown = d.id; info.innerHTML = M.infoHTML(d, app.saved.has(d.id)); }
    },
    mode(m) {
      feedv.hidden = m !== 'feed';
      allv.hidden = m !== 'all';
      if (m === 'all') allv.scrollTop = 0;
    },
    afterReset() { q.focus(); },
  });

  q.form?.addEventListener('submit', e => e.preventDefault());
  if (/Mac|iPhone|iPad/.test(navigator.platform)) $('[data-kbd]', root).textContent = '⌘K';
  prev.addEventListener('click', () => app.go(app.cur() - 1));
  nxt.addEventListener('click', () => app.go(app.cur() + 1));

  // Wheel / trackpad anywhere over the feed view = exactly one slide per gesture. Native wheel scrolling on a
  // mandatory snap container snaps back when one notch is less than half a slide, so we step it ourselves.
  const wheel = createWheelStepper({ idleMs: 200, threshold: 30 });
  feedv.addEventListener('wheel', e => {
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; // pinch-zoom / horizontal
    e.preventDefault();
    const step = wheel.onWheel(e.deltaY, e.deltaMode, e.timeStamp, app.feed.clientHeight);
    if (step) app.go(app.cur() + step);
  }, { passive: false });

  // Capture phase on window: runs before the quick view's own Escape/keys, and we bail out while it is open.
  window.addEventListener('keydown', e => {
    if (isQuickViewOpen()) return;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); q.focus(); q.select(); return; }
    const t = e.target as HTMLElement;
    const typing = !!t.closest?.('input,select,textarea,[contenteditable=true]');
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) { e.preventDefault(); q.focus(); q.select(); return; }
    if (e.key === 'Escape' && t === q && q.value === '') { q.blur(); return; }
    if (typing || app.st.mode !== 'feed' || e.altKey || e.ctrlKey || e.metaKey) return;
    const step = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (step) { e.preventDefault(); app.go(app.cur() + step); }
    else if (e.key === 'Home') { e.preventDefault(); app.go(0); }
    else if (e.key === 'End') { e.preventDefault(); app.go(app.list().length - 1); }
  }, true);

  app.render();
}
