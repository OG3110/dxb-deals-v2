import { CATEGORIES, type ClientDeal } from '../deals';
export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
export function $(sel: string, root: ParentNode = document): HTMLElement {
  const el = root.querySelector<HTMLElement>(sel); if (!el) throw new Error('Missing element ' + sel); return el;
}
export function $$(sel: string, root: ParentNode = document): HTMLElement[] { return [...root.querySelectorAll<HTMLElement>(sel)]; }
export function flyerHTML(d: ClientDeal, size: 'sm' | 'md' | 'lg' = 'sm', alt = `${d.title} – ${d.area}`): string {
  if (!d.img) {
    const c = CATEGORIES.find(x => x.key === d.category);
    return `<div class="flyer-card flyer-missing" style="display:flex;align-items:center;justify-content:center;font-size:48px">${c?.icon ?? '🏢'}</div>`;
  }
  return `<div class="flyer-card"><div class="blur" style="background-image:url('${d.img.sm}')"></div><img src="${d.img[size]}" alt="${esc(alt)}" loading="lazy" decoding="async"></div>`;
}
