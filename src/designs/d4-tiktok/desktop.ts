// Design 4 · TikTok Feed — desktop: a black stage with one phone-sized feed in the middle, the pitch + search on the
// left, the position and feed filters on the right, and an ambient glow of the current flyer behind everything.
// Search results drop down under the field; "All deals" is a modal grid overlay. Both jump the feed to a deal.
import type { ClientDeal } from '../../lib/deals';
import { isQuickViewOpen } from '../../lib/client/quickview';
import { $, $$, cssUrl } from '../../lib/client/dom';
import { createWheelStepper } from '../../lib/client/wheel';
import { engine } from './engine';
import * as M from './markup';

export function initDesktop(root: HTMLElement): void {
  const main = $('[data-main]', root), ov = $('[data-ov]', root), sbox = $('[data-sbox]', root), drop = $('[data-drop]', root);
  const q = $('[data-bind=q]', sbox) as HTMLInputElement, ctr = $('[data-ctr]', root);
  const prev = $('[data-prev]', root) as HTMLButtonElement, next = $('[data-next]', root) as HTMLButtonElement;
  const amb = $$('[data-amb] > i', root);
  let ambOn = 0, ambId = '', ovFrom: HTMLElement | null = null;

  /* ---------- ambient background: cross-fade two blurred layers of the current flyer ---------- */
  function ambient(d: ClientDeal) {
    if (d.id === ambId) return;
    ambId = d.id;
    const nxt = amb[1 - ambOn];
    nxt.innerHTML = d.img ? `<b style="background-image:url('${cssUrl(d.img.sm)}')"></b>` : '';
    nxt.classList.add('on'); amb[ambOn].classList.remove('on');
    ambOn = 1 - ambOn;
  }

  const app = engine(root, false, {
    slide: M.slideHTML,
    card: M.cardHTML,
    current(d, i, list) {
      ctr.textContent = d ? `${i + 1} / ${list.length}` : '0 / 0';
      prev.disabled = !d || i <= 0; next.disabled = !d || i >= list.length - 1;
      if (d) ambient(d);
    },
    open(id, fromGrid) {
      if (!ov.hidden) closeOverlay(false);
      closeDrop();
      app.jump(id, fromGrid);
    },
    afterReset() {
      // A reset inside the All/Saved overlay (e.g. "Browse all deals") stays there: the page behind is inert,
      // so focusing the field would fail and the dropdown would be left open behind the overlay.
      if (!ov.hidden) return;
      q.focus(); openDrop();
    },
  });

  /* ---------- search dropdown ---------- */
  const dropOpen = () => !drop.hidden;
  function openDrop() {
    if (dropOpen()) return;
    drop.hidden = false; q.setAttribute('aria-expanded', 'true');
    app.renderSearch();
  }
  function closeDrop() {
    if (!dropOpen()) return;
    drop.hidden = true; q.setAttribute('aria-expanded', 'false');
    $('[data-results]', drop).innerHTML = ''; // no stray [data-deal-id] rows while closed
  }
  q.addEventListener('focus', openDrop);
  // Typing re-opens a dropdown closed with Escape. Store the query first: rendering syncs the field to the state.
  q.addEventListener('input', () => { app.st.q = q.value; openDrop(); });
  sbox.addEventListener('focusout', e => { if (!sbox.contains(e.relatedTarget as Node | null)) closeDrop(); });
  // Keep focus inside the box while a row is pressed (Safari does not focus buttons on click).
  drop.addEventListener('mousedown', e => { if ((e.target as Element).closest('button')) e.preventDefault(); });
  $('form', sbox).addEventListener('submit', e => {
    e.preventDefault();
    const first = app.results()[0];
    if (!first) return;
    closeDrop();
    app.jump(first.id);
  });
  sbox.addEventListener('keydown', e => {
    const rows = $$('[data-open]', drop);
    const at = rows.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); openDrop(); (rows[at + 1] ?? rows[at] ?? q).focus(); }
    else if (e.key === 'ArrowUp' && at >= 0) { e.preventDefault(); (at === 0 ? q : rows[at - 1]).focus(); }
    else if (e.key === 'Escape' && dropOpen()) { e.preventDefault(); e.stopPropagation(); closeDrop(); q.focus(); }
  });

  /* ---------- "All deals" / "Saved" overlay (modal: inert page, Escape, backdrop, focus restore) ---------- */
  function openOverlay(savedOnly: boolean, from: HTMLElement) {
    closeDrop();
    ovFrom = from;
    app.st.savedOnly = savedOnly;
    ov.hidden = false; ov.removeAttribute('aria-hidden'); main.inert = true;
    app.renderGrid();
    $('[data-ov-scroll]', ov).scrollTop = 0;
    $('.d4-ov-x', ov).focus();
  }
  function closeOverlay(restore = true) {
    if (ov.hidden) return;
    ov.hidden = true; ov.setAttribute('aria-hidden', 'true'); main.inert = false;
    $('[data-grid]', ov).innerHTML = '';
    const back = ovFrom; ovFrom = null;
    if (restore && back && document.contains(back)) back.focus();
  }
  $$('[data-ov-open]', root).forEach(b => b.addEventListener('click', () => openOverlay(b.dataset.ovOpen === 'saved', b)));
  $$('[data-ov-x]', ov).forEach(b => b.addEventListener('click', () => closeOverlay()));

  /* ---------- feed navigation: arrows, wheel (one slide per gesture), keyboard ---------- */
  prev.addEventListener('click', () => app.go(app.cur() - 1));
  next.addEventListener('click', () => app.go(app.cur() + 1));
  const wheel = createWheelStepper({ idleMs: 200, threshold: 30 });
  root.addEventListener('wheel', e => {
    if (!ov.hidden || (e.target as Element).closest('[data-drop],[data-ov]')) return; // those scroll natively
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; // pinch-zoom / horizontal
    e.preventDefault();
    const step = wheel.onWheel(e.deltaY, e.deltaMode, e.timeStamp, app.reel.clientHeight);
    if (step) app.go(app.cur() + step);
  }, { passive: false });

  // Capture phase on window: runs before the quick view's own Escape, and bails out while it is open.
  window.addEventListener('keydown', e => {
    if (isQuickViewOpen()) return;
    const focusSearch = () => { e.preventDefault(); if (!ov.hidden) closeOverlay(false); q.focus(); q.select(); };
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') return focusSearch();
    const t = e.target as HTMLElement;
    const typing = !!t.closest?.('input,select,textarea,[contenteditable=true]');
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) return focusSearch();
    if (e.key === 'Escape' && !ov.hidden) { e.preventDefault(); closeOverlay(); return; }
    if (typing || !ov.hidden || sbox.contains(t) || e.altKey || e.ctrlKey || e.metaKey) return;
    const step = ({ ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 } as Record<string, number>)[e.key];
    if (step) { e.preventDefault(); app.go(app.cur() + step); }
    else if (e.key === 'Home') { e.preventDefault(); app.go(0); }
    else if (e.key === 'End') { e.preventDefault(); app.go(app.list().length - 1); }
  }, true);

  if (/Mac|iPhone|iPad/.test(navigator.platform)) $('[data-kbd]', root).textContent = '⌘K';
  app.init();
}
