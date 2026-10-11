import { CATEGORIES, type ClientDeal } from '../deals';
export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
/** CSS-safe URL for use inside url('...') in an HTML style attribute: percent-encodes quotes, parens, backslashes, whitespace and angle brackets, then HTML-escapes (the browser decodes entities before CSS parsing, so esc() alone is not enough). */
export function cssUrl(u: unknown): string {
  return esc(String(u ?? '').replace(/["'()\\\s<>]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')));
}
/** Escaped place label: "Jumeirah, Dubai" — but never "Dubai, Dubai". */
export function place(d: { area: string }): string {
  return /^dubai$/i.test(d.area.trim()) ? esc(d.area) : `${esc(d.area)}, Dubai`;
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
  return `<div class="flyer-card"><div class="blur" style="background-image:url('${cssUrl(d.img.sm)}')"></div><img src="${esc(d.img[size])}" alt="${esc(alt)}" loading="lazy" decoding="async"></div>`;
}
