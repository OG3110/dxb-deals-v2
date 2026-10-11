// Design 3 · Feed ⇄ All — mobile: fullscreen snap feed with glass caption + action rail, a glass top bar
// (search trigger + Feed | All), the All grid sheet and a fullscreen search sheet.
import { fmtMoney, type ClientDeal } from '../../lib/deals';
import { isQuickViewOpen } from '../../lib/client/quickview';
import { $ } from '../../lib/client/dom';
import { engine } from './engine';
import * as M from './markup';

export function initMobile(root: HTMLElement): void {
  // Park the preview-bar ◐ button in the slot reserved at the right end of our top bar.
  document.documentElement.style.setProperty('--pv-mtop', '15px');
  document.documentElement.style.setProperty('--pv-mright', '10px');
  const page = $('[data-page]', root), stage = $('[data-stage]', root), sheet = $('[data-allsheet]', root);
  const ss = $('[data-ss]', root), ssList = $('[data-ss-list]', ss), ssInput = $('[data-bind=q]', ss) as HTMLInputElement;
  const trigger = $('[data-trigger]', root), toastEl = $('[data-toast]', root);
  const allBtn = $('[data-mode=all]', root);
  const ssOpen = () => !ss.hidden;

  const app = engine(root, true, {
    slide: M.mslideHTML,
    card: M.mcardHTML,
    current() { /* each slide carries its own caption and position */ },
    mode(m, from) {
      const all = m === 'all';
      sheet.hidden = !all;
      sheet.inert = !all;
      stage.inert = all;
      if (all) sheet.querySelector<HTMLElement>('[data-scroll]')!.scrollTop = 0;
      else if (from === 'all' && sheet.contains(document.activeElement)) allBtn.focus();
    },
    after(list) {
      const q = app.st.q.trim();
      $('[data-trigger-text]', root).textContent = q || 'Search deals';
      trigger.classList.toggle('d3-has-q', !!q);
      if (ssOpen()) paintList(list);
    },
    beforeOpen() { if (ssOpen()) closeSearch(false); },
    afterReset() { (ssOpen() ? ssInput : trigger).focus(); },
  });

  const paintList = (list: ClientDeal[]) => {
    ssList.innerHTML = list.length ? `<ul class="d3-rows">${list.map(M.rowHTML).join('')}</ul>`
      : M.emptyHTML(app.st.savedOnly, app.saved.list().length);
  };

  /* ---------- search sheet: inert background, Escape, focus restore ---------- */
  ss.inert = true;
  function openSearch() {
    ss.hidden = false; ss.inert = false; ss.removeAttribute('aria-hidden');
    page.inert = true;
    paintList(app.list());
    ssInput.focus();
  }
  function closeSearch(restore = true) {
    if (!ssOpen()) return;
    ss.hidden = true; ss.inert = true; ss.setAttribute('aria-hidden', 'true');
    ssList.innerHTML = ''; // no stray [data-deal-id] rows while closed
    page.inert = false;
    if (restore) trigger.focus();
  }
  trigger.addEventListener('click', openSearch);
  $('[data-ss-close]', ss).addEventListener('click', () => closeSearch());
  $('[data-ss-show]', ss).addEventListener('click', () => {
    closeSearch(false);
    app.setMode('feed');
    app.feed.focus({ preventScroll: true });
  });
  $('[data-ss-form]', ss).addEventListener('submit', e => { e.preventDefault(); ssInput.blur(); });
  // Capture phase: read the quick-view state before its own Escape handler closes it (one Escape = one layer).
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || isQuickViewOpen()) return;
    if (ssOpen()) { e.preventDefault(); closeSearch(); }
    else if (app.st.mode === 'all') { e.preventDefault(); app.setMode('feed'); allBtn.focus(); }
  }, true);

  /* ---------- toast, share, double-tap save ---------- */
  let toastT = 0;
  function toast(msg: string) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = window.setTimeout(() => toastEl.classList.remove('on'), 1800);
  }
  async function share(d: ClientDeal) {
    const url = `${location.origin}${location.pathname}#${d.id}`;
    const data = { title: `${d.title} – ${d.area} · DXB Deals`, text: `${d.id} · ${d.title} – ${d.area} · AED ${fmtMoney(d.price)}`, url };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (e) { if ((e as DOMException)?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast(url); }
  }
  root.addEventListener('click', e => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-share]')?.dataset.share;
    const d = id ? app.byId.get(id) : undefined;
    if (d) void share(d);
  });

  let last = { t: 0, x: 0, y: 0 };
  app.feed.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    const slide = t.closest<HTMLElement>('[data-deal-id]');
    if (!slide || t.closest('a,button')) return;
    const near = Math.hypot(e.clientX - last.x, e.clientY - last.y) < 40;
    if (e.timeStamp - last.t < 350 && near) {
      last = { t: 0, x: 0, y: 0 };
      const id = slide.dataset.dealId!;
      if (!app.saved.has(id)) app.saved.toggle(id);
      burst(slide, e.clientX, e.clientY);
      toast('Saved');
    } else last = { t: e.timeStamp, x: e.clientX, y: e.clientY };
  });
  function burst(slide: HTMLElement, x: number, y: number) {
    const r = slide.getBoundingClientRect();
    const b = document.createElement('span');
    b.className = 'd3-burst';
    b.setAttribute('aria-hidden', 'true');
    b.style.left = `${x - r.left}px`; b.style.top = `${y - r.top}px`;
    b.innerHTML = M.ICON.mark(96);
    slide.append(b);
    window.setTimeout(() => b.remove(), 900);
  }

  app.render();
}
