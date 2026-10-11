// Design 2 · fullscreen vertical snap feed (".vf" of the S3 mockup), shared by desktop and mobile.
// The overlay lives on <body> (outside the design root) so the root can be made inert while it is open.
import type { ClientDeal } from '../../lib/deals';
import type { SavedStore } from '../../lib/client/saved';
import { openQuickView } from '../../lib/client/quickview';
import { $, $$ } from '../../lib/client/dom';
import { ICON, slideHTML } from './markup';

export type OpenFeed = (list: ClientDeal[], startIndex: number, title: string) => void;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// The quick view drops aria-hidden synchronously on open (its .on class is added a frame later).
const qvOpen = () => !!document.querySelector('.qv:not([aria-hidden])');

export function createFeed(root: HTMLElement, saved: SavedStore, mobile: boolean): OpenFeed {
  const el = document.createElement('section');
  el.className = 'd2-vf ' + (mobile ? 'd2-vf-m' : 'd2-vf-d');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'd2-vf-t');
  el.hidden = true;
  el.innerHTML = `<header class="d2-vf-hd"><h2 id="d2-vf-t"><span data-vf-title></span><small data-vf-pos></small></h2>
    <button type="button" class="d2-vf-x" data-vf-close aria-label="Close feed">✕</button></header>
  <div class="d2-vf-feed" data-vf-feed tabindex="-1" aria-label="Deals – scroll for the next one"></div>
  <div class="d2-vf-nav"><button type="button" data-vf-prev aria-label="Previous deal">${ICON.up}</button><button type="button" data-vf-next aria-label="Next deal">${ICON.down}</button><p>Scroll or use<br><kbd>↑</kbd> <kbd>↓</kbd></p></div>`;
  document.body.append(el);

  const feed = $('[data-vf-feed]', el), pos = $('[data-vf-pos]', el);
  const prev = $('[data-vf-prev]', el) as HTMLButtonElement, next = $('[data-vf-next]', el) as HTMLButtonElement;
  let list: ClientDeal[] = [], cur = 0, back: HTMLElement | null = null;
  const isOpen = () => !el.hidden;

  const clamp = (i: number) => Math.max(0, Math.min(list.length - 1, i));
  function show(i: number) {
    cur = clamp(i);
    pos.textContent = list.length ? `${cur + 1} / ${list.length}` : '';
    prev.disabled = cur <= 0; next.disabled = cur >= list.length - 1;
  }
  let tid = 0;
  let target = -1; // while a smooth scroll runs, keep counting from where it is heading
  feed.addEventListener('scroll', () => {
    const at = Math.round(feed.scrollTop / (feed.clientHeight || 1));
    if (target < 0 || at === target) { target = -1; show(at); }
  }, { passive: true });

  function go(i: number) {
    const s = feed.children[clamp(i)] as HTMLElement | undefined;
    if (!s) return;
    target = clamp(i); show(target);
    clearTimeout(tid); tid = window.setTimeout(() => { target = -1; }, 900); // a swipe may interrupt the smooth scroll
    feed.scrollTo({ top: s.offsetTop, behavior: reduced() ? 'auto' : 'smooth' });
  }
  function close() {
    if (!isOpen()) return;
    el.hidden = true;
    feed.innerHTML = ''; // no stray [data-deal-id] slides once closed
    root.inert = false;
    document.documentElement.classList.remove('d2-lock');
    const b = back; back = null;
    if (b && document.contains(b)) b.focus();
  }
  const open: OpenFeed = (l, startIndex, title) => {
    if (!l.length) return;
    list = l;
    if (!isOpen()) { const a = document.activeElement; back = a instanceof HTMLElement && a !== document.body ? a : null; }
    $('[data-vf-title]', el).textContent = title;
    feed.innerHTML = list.map((d, i) => slideHTML(d, i, list.length, saved.has(d.id))).join('');
    el.hidden = false;
    root.inert = true;
    document.documentElement.classList.add('d2-lock');
    const s = feed.children[Math.max(0, startIndex)] as HTMLElement | undefined;
    target = -1;
    feed.scrollTop = s ? s.offsetTop : 0;
    show(Math.max(0, startIndex));
    feed.focus({ preventScroll: true });
  };

  el.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-vf-close]')) return close();
    if (t.closest('[data-vf-prev]')) return go(cur - 1);
    if (t.closest('[data-vf-next]')) return go(cur + 1);
    const slide = t.closest<HTMLElement>('[data-deal-id]');
    const d = slide && list.find(x => x.id === slide.dataset.dealId);
    if (!d) return;
    if (t.closest('[data-vf-save]')) saved.toggle(d.id);
    else if (t.closest('[data-vf-info]')) openQuickView(d, { mobile, saved });
  });
  // Registered at init, i.e. before the quick view's own listener: while the quick view is open, leave Escape to it.
  document.addEventListener('keydown', e => {
    if (!isOpen() || qvOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    const t = e.target as HTMLElement;
    if (t.closest?.('a,button') && (e.key === ' ' || e.key === 'Enter')) return;
    const step = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (step) { e.preventDefault(); go(cur + step); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(list.length - 1); }
  });
  saved.onChange(() => $$('[data-deal-id]', feed).forEach(s =>
    s.querySelector('[data-vf-save]')?.setAttribute('aria-pressed', String(saved.has(s.dataset.dealId!)))));
  return open;
}
