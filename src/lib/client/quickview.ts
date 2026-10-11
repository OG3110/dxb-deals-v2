import { fmtMoney, fmtSize, waLink, TEL, categoryLabel, discountPct, type ClientDeal } from '../deals';
import { esc, flyerHTML } from './dom';
import type { SavedStore } from './saved';

let dim: HTMLElement | null = null, box: HTMLElement | null = null;
let lastFocus: HTMLElement | null = null;
let isOpen = false;

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : '');

function setClosedA11y(closed: boolean) {
  if (!box) return;
  if (closed) { box.inert = true; box.setAttribute('aria-hidden', 'true'); }
  else { box.inert = false; box.removeAttribute('aria-hidden'); }
}

function ensure() {
  if (dim && box) return;
  dim = document.createElement('div'); dim.className = 'qv-dim'; dim.addEventListener('click', closeQuickView);
  box = document.createElement('section'); box.className = 'qv'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  setClosedA11y(true);
  document.body.append(dim, box);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeQuickView(); });
}
/** True from openQuickView() until closeQuickView() (synchronous; independent of the CSS .on class). */
export function isQuickViewOpen(): boolean { return isOpen; }
export function openQuickView(d: ClientDeal, opts: { mobile: boolean; saved: SavedStore }): void {
  ensure();
  if (!isOpen) {
    const a = document.activeElement;
    lastFocus = a instanceof HTMLElement && a !== document.body ? a : null;
  }
  isOpen = true;
  const pct = discountPct(d);
  box!.className = 'qv ' + (opts.mobile ? 'mob' : 'desk');
  box!.innerHTML = `${opts.mobile ? '<div class="grab"></div>' : `<div class="media">${flyerHTML(d, 'md')}</div>`}
    <div class="body"><button class="x" aria-label="Close">✕</button>
      <h3>${esc(d.title)}</h3><div class="loc">📍 ${esc(d.area)}, Dubai · ${esc(categoryLabel(d.category))} · ${esc(d.id)}</div>
      <div class="kv">
        <div><small>${d.priceType === 'asking' ? 'Asking price' : 'Key money'}</small><b>AED ${fmtMoney(d.price)}</b>${pct ? `<small style="color:#E5484D;text-transform:none">−${pct}% · was AED ${fmtMoney(d.originalPrice)}</small>` : ''}</div>
        <div><small>Rent / year</small><b>${d.annualRent ? 'AED ' + fmtMoney(d.annualRent) : '—'}</b></div>
        <div><small>Size</small><b>${fmtSize(d.size)}</b></div>
        <div><small>Status</small><b>${esc(cap(d.status))}</b></div>
      </div>
      <div class="acts"><a class="wa" href="${waLink(d)}" target="_blank" rel="noopener">WhatsApp Tolga</a><a href="${TEL}">Call</a>
        <button data-qv-save>${opts.saved.has(d.id) ? 'Saved ✓' : 'Save'}</button></div>
    </div>`;
  const closeBtn = box!.querySelector<HTMLElement>('.x')!;
  closeBtn.addEventListener('click', closeQuickView);
  box!.querySelector('[data-qv-save]')!.addEventListener('click', e => {
    const on = opts.saved.toggle(d.id); (e.currentTarget as HTMLElement).textContent = on ? 'Saved ✓' : 'Save';
  });
  setClosedA11y(false);
  closeBtn.focus();
  requestAnimationFrame(() => { if (!isOpen) return; dim!.classList.add('on'); box!.classList.add('on'); });
}
export function closeQuickView(): void {
  dim?.classList.remove('on'); box?.classList.remove('on');
  if (!isOpen) return;
  isOpen = false;
  setClosedA11y(true);
  const back = lastFocus; lastFocus = null;
  if (back && document.contains(back)) back.focus();
}
