// Pure string builders for Design 3 (Feed ⇄ All) — shared by the .astro components (server first paint)
// and by d3.ts / mobile.ts (client re-render), so every piece of deal markup exists exactly once. No DOM access here.
import { CATEGORIES, categoryLabel, countBy, discountPct, fmtMoney, fmtSize, waLink, type ClientDeal, type Filter, type SortKey } from '../../lib/deals';
import { esc, flyerHTML, cssUrl, place } from '../../lib/client/dom';

const svg = (body: string, size = 20, extra = '') =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;
const STROKE = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const ICON = {
  wa: (size = 18) => svg('<path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.5-4.3A8.5 8.5 0 1 1 20.5 11.6z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path fill="currentColor" d="M9.2 8.1c.2-.4.5-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.5.6c-.1.1-.2.3 0 .5.6 1 1.4 1.8 2.5 2.4.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.3.3.5 0 .6-.3 1.4-1 1.7-.7.3-1.6.4-3.4-.4-2-1-3.5-2.8-4-4.2-.4-1.2 0-2 .5-2.6z"/>', size),
  mark: (size = 20) => svg('<path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.2-6.5 4.2v-16a1 1 0 0 1 1-1z"/>', size, ' class="d3-mark"'),
  search: (size = 20) => svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>', size, STROKE),
  share: svg('<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>', 21, STROKE),
  info: (size = 20) => svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>', size, STROKE),
  play: svg('<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>', 14),
  grid: svg('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>', 15, STROKE),
  up: svg('<path d="m6 15 6-6 6 6"/>', 20, STROKE),
  down: svg('<path d="m6 9 6 6 6-6"/>', 20, STROKE),
  pin: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', 15, STROKE),
};

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'price-asc', label: 'Price: low → high' },
  { key: 'price-desc', label: 'Price: high → low' },
  { key: 'size-desc', label: 'Size: largest first' },
];
export const sortOptionsHTML = () => SORTS.map(s => `<option value="${s.key}">${esc(s.label)}</option>`).join('');

const aed = (n: number | null) => (n == null ? '—' : `AED ${fmtMoney(n)}`);
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const ds = (d: ClientDeal) => (d.distress ? '<span class="d3-ds">Distress</span>' : '');
const st = (d: ClientDeal) => (d.status !== 'available' ? `<span class="d3-st">${esc(cap(d.status))}</span>` : '');
const lbl = (d: ClientDeal) => `${esc(d.title)} (${esc(d.id)})`;

/** Save toggle: visible "Save"/"Saved" swap is pure CSS on aria-pressed, so saved-state updates never rebuild markup. */
export const saveBtn = (d: ClientDeal, saved: boolean, cls: string, text = true) =>
  `<button type="button" class="${cls}" data-save="${esc(d.id)}" aria-pressed="${saved}" aria-label="Save ${lbl(d)}">${ICON.mark(text ? 18 : 22)}${text ? '<span class="d3-off">Save</span><span class="d3-on">Saved</span>' : ''}</button>`;

export function filterLabel(f: Filter): string {
  return f === 'all' ? 'All businesses' : f === 'distress' ? 'Distress deals' : categoryLabel(f);
}
export function headingText(n: number, savedOnly: boolean): string {
  return savedOnly ? `Saved (${n})` : `${n} ${n === 1 ? 'business' : 'businesses'}`;
}

/* ---------- chips (rendered once; only aria-pressed changes later) ---------- */
export function chipsHTML(deals: ClientDeal[]): string {
  const chip = (f: Filter, label: string) =>
    `<button type="button" class="d3-chip" data-filter="${esc(f)}" aria-pressed="${f === 'all'}">${label}<small>${countBy(deals, f)}</small></button>`;
  return chip('all', 'All') + chip('distress', '🔥 Distress') + CATEGORIES.map(c => chip(c.key, `${c.icon} ${esc(c.label)}`)).join('');
}
export const savedChipHTML = (cls = 'd3-chip d3-chip-sv') =>
  `<button type="button" class="${cls}" data-saved-toggle aria-pressed="false">${ICON.mark(15)}Saved<small data-saved-count>0</small></button>`;

export function emptyHTML(savedOnly: boolean, savedCount: number): string {
  const [h, p, b] = savedOnly && savedCount === 0
    ? ['No saved deals yet', 'Tap the bookmark on any deal (or double-tap a flyer) to keep it here.', 'Show all deals']
    : ['No businesses match', 'Try another keyword, area, budget or category.', 'Reset filters'];
  return `<div class="empty d3-empty"><div class="d3-empty-ic">${ICON.search(24)}</div><h3>${h}</h3><p>${p}</p><button type="button" data-reset>${b}</button></div>`;
}

/* ---------- desktop ---------- */
export function slideHTML(d: ClientDeal, i: number, n: number): string {
  return `<article class="d3-sl" data-deal-id="${esc(d.id)}" aria-roledescription="slide" aria-label="${i + 1} of ${n}: ${esc(d.title)}">${flyerHTML(d, 'md')}</article>`;
}
export function infoHTML(d: ClientDeal, saved: boolean): string {
  const pct = discountPct(d);
  return `<div class="d3-info-in">
  <p class="d3-id">${esc(d.id)} · ${esc(categoryLabel(d.category).toUpperCase())}${d.distress ? ' · <em>DISTRESS</em>' : ''}${st(d)}</p>
  <h2>${esc(d.title)}</h2>
  <p class="d3-ar">${ICON.pin} ${place(d)}</p>
  <dl class="d3-kv">
    <div><dt>${d.priceType === 'asking' ? 'Price' : 'Key money'}</dt><dd>${aed(d.price)}${pct ? `<small>was ${aed(d.originalPrice)} · −${pct}%</small>` : ''}</dd></div>
    <div><dt>Rent / yr</dt><dd>${aed(d.annualRent)}</dd></div>
    <div><dt>Size</dt><dd>${esc(fmtSize(d.size))}</dd></div>
  </dl>
  <div class="d3-acts">
    <a class="d3-wa" href="${esc(waLink(d))}" target="_blank" rel="noopener">${ICON.wa(19)}WhatsApp Tolga</a>
    ${saveBtn(d, saved, 'd3-btn')}
    <button type="button" class="d3-btn" data-details="${esc(d.id)}" aria-label="Details for ${lbl(d)}">${ICON.info(18)}<span>Details</span></button>
  </div>
</div>`;
}
export function nextHTML(list: ClientDeal[]): string {
  if (!list.length) return '<p class="d3-next-none">That’s the last one — scroll up or change the filters.</p>';
  return `<ol class="d3-next-l">${list.map(d => `<li><button type="button" class="d3-nx" data-deal-id="${esc(d.id)}" data-goto="${esc(d.id)}">
    <span class="d3-nx-th">${flyerHTML(d, 'sm', '')}</span>
    <span class="d3-nx-tx"><b>${esc(d.title)}</b><small>${esc(d.area)} · ${aed(d.price)}</small></span></button></li>`).join('')}</ol>`;
}
export function cardHTML(d: ClientDeal, saved: boolean): string {
  const pct = discountPct(d);
  return `<article class="d3-c" data-deal-id="${esc(d.id)}">
  <div class="d3-c-im">${flyerHTML(d, 'sm')}${d.distress ? `<span class="d3-c-tag">Distress${pct ? ` −${pct}%` : ''}</span>` : ''}<span class="d3-c-pl" aria-hidden="true">${ICON.play}</span></div>
  <div class="d3-c-bd">
    <small>${esc(d.id)} · ${esc(categoryLabel(d.category))}${st(d)}</small>
    <h3><button type="button" class="d3-open" data-open="${esc(d.id)}">${esc(d.title)}</button></h3>
    <p>${esc(d.area)}</p>
    <div class="d3-c-row"><b>${aed(d.price)}</b><span>Rent ${aed(d.annualRent)}</span></div>
  </div>
  ${saveBtn(d, saved, 'd3-c-sv', false)}
</article>`;
}

/* ---------- mobile ---------- */
export function mslideHTML(d: ClientDeal, i: number, n: number, saved: boolean): string {
  const pct = discountPct(d);
  return `<article class="d3-ms" data-deal-id="${esc(d.id)}" aria-roledescription="slide" aria-label="${i + 1} of ${n}: ${esc(d.title)}">
  ${d.img ? `<div class="d3-ms-bg" style="background-image:url('${cssUrl(d.img.sm)}')"></div>` : '<div class="d3-ms-bg"></div>'}
  <div class="d3-ms-fl">${flyerHTML(d, 'md')}</div>
  <div class="d3-cap d3-glass">
    <p class="d3-cap-u"><b>${esc(d.id)}</b><span>${esc(categoryLabel(d.category))}</span>${ds(d)}${st(d)}<small>${i + 1}/${n}</small></p>
    <h2>${esc(d.title)}</h2>
    <p class="d3-cap-a">${ICON.pin} ${place(d)}</p>
    <p class="d3-cap-kv"><span class="d3-p">${aed(d.price)}</span>${pct ? `<span class="d3-pd">−${pct}% · was ${aed(d.originalPrice)}</span>` : ''}<span>Rent ${aed(d.annualRent)}</span><span>${d.size == null ? 'Size —' : esc(fmtSize(d.size))}</span></p>
  </div>
  <div class="d3-rail d3-glass">
    <a class="d3-act d3-act-wa" href="${esc(waLink(d))}" target="_blank" rel="noopener" aria-label="Contact Tolga on WhatsApp about ${lbl(d)}"><i>${ICON.wa(21)}</i><span aria-hidden="true">Contact</span></a>
    <button type="button" class="d3-act d3-act-sv" data-save="${esc(d.id)}" aria-pressed="${saved}" aria-label="Save ${lbl(d)}"><i>${ICON.mark(21)}</i><span class="d3-off" aria-hidden="true">Save</span><span class="d3-on" aria-hidden="true">Saved</span></button>
    <button type="button" class="d3-act" data-share="${esc(d.id)}" aria-label="Share ${lbl(d)}"><i>${ICON.share}</i><span aria-hidden="true">Share</span></button>
    <button type="button" class="d3-act" data-details="${esc(d.id)}" aria-label="Details for ${lbl(d)}"><i>${ICON.info(21)}</i><span aria-hidden="true">Details</span></button>
  </div>
</article>`;
}
export function mcardHTML(d: ClientDeal, saved: boolean): string {
  const pct = discountPct(d);
  return `<article class="d3-mc" data-deal-id="${esc(d.id)}">
  <div class="d3-mc-im">${flyerHTML(d, 'sm')}${d.distress ? `<span class="d3-c-tag">${pct ? `−${pct}%` : 'Distress'}</span>` : ''}</div>
  <div class="d3-mc-bd"><b>${aed(d.price)}</b><h3><button type="button" class="d3-open" data-open="${esc(d.id)}">${esc(d.title)}</button></h3><small>${esc(d.area)} · ${esc(d.id)}</small></div>
  ${saveBtn(d, saved, 'd3-c-sv', false)}
</article>`;
}
export function rowHTML(d: ClientDeal): string {
  return `<li><button type="button" class="d3-row" data-deal-id="${esc(d.id)}" data-open="${esc(d.id)}">
  <span class="d3-row-th">${flyerHTML(d, 'sm', '')}</span>
  <span class="d3-row-tx"><b>${esc(d.title)}</b><small>${esc(d.area)} · ${esc(categoryLabel(d.category))} · ${esc(d.id)}</small></span>
  <em>${aed(d.price)}</em></button></li>`;
}

/** Copy numbers derived from the data (never hard-coded). */
export function stats(deals: ClientDeal[]) {
  return { total: deals.length, from: deals.length ? fmtMoney(Math.min(...deals.map(d => d.price))) : '—' };
}
