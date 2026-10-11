// Pure string builders for Design 5 (Split Scroll) — shared by the .astro components (server first paint) and by the
// client scripts (re-render), so every piece of deal markup exists exactly once. No DOM access here.
import {
  CATEGORIES, categoryLabel, countBy, discountPct, fmtMoney, fmtSize, matchDeal, sortDeals,
  type ClientDeal, type Filter, type SortKey,
} from '../../lib/deals';
import { esc, flyerHTML, place } from '../../lib/client/dom';

/* ---------- the scroll list: everything, a search query or one filter (never both: a filter clears the query) ---------- */
export interface FeedState { q: string; ff: Filter }
export const feedList = (deals: ClientDeal[], s: FeedState) => sortDeals(deals.filter(d => matchDeal(d, s.q, s.ff)), 'newest');
/** Label of the active narrowing ("“cafe”", "🍽 Restaurants", "🔥 Distress"), or '' when the full list is shown. */
export function feedLabel(s: FeedState): string {
  if (s.q.trim()) return `“${esc(s.q.trim())}”`;
  if (s.ff === 'distress') return '🔥 Distress';
  const c = CATEGORIES.find(x => x.key === s.ff);
  return c ? `${c.icon} ${esc(c.label)}` : '';
}

/* ---------- icons ---------- */
const svg = (body: string, size: number, extra = '') =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;
const STROKE = ' fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
export const ICON = {
  search: (s = 19) => svg('<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>', s, STROKE),
  grid: (s = 17) => svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>', s, STROKE),
  heart: (s = 18) => svg('<path d="M12 20.5s-7.5-4.6-9.6-9.2C.9 7.9 3 4.5 6.4 4.5c2.2 0 3.7 1.3 4.6 2.7h2c.9-1.4 2.4-2.7 4.6-2.7 3.4 0 5.5 3.4 4 6.8-2.1 4.6-9.6 9.2-9.6 9.2z"/>', s, ' class="d5-heart"'),
  wa: (s = 18) => svg('<path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8 0-1.4.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.6 2.1 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/>', s),
  close: (s = 16) => svg('<path d="M6 6l12 12M18 6 6 18"/>', s, STROKE),
  info: (s = 18) => svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.01"/>', s, STROKE),
};

/* ---------- small helpers ---------- */
export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'price-asc', label: 'Price: low → high' },
  { key: 'price-desc', label: 'Price: high → low' },
  { key: 'size-desc', label: 'Size: largest first' },
];
export const sortOptionsHTML = () => SORTS.map(s => `<option value="${s.key}">${esc(s.label)}</option>`).join('');
const aed = (n: number | null) => (n == null ? '—' : `AED ${fmtMoney(n)}`);
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const pad = (n: number) => String(n).padStart(2, '0');
const lbl = (d: ClientDeal) => `${esc(d.title)} (${esc(d.id)})`;
const status = (d: ClientDeal) => (d.status !== 'available' ? ` · ${esc(cap(d.status))}` : '');

/** "04 / 26" — the big number is the position, the small one the length of the (filtered) list. */
export const counterHTML = (i: number, n: number) => `<b>${pad(n ? i + 1 : 0)}</b> / ${pad(n)}`;
export const counterLabel = (i: number, n: number) => (n ? `Deal ${i + 1} of ${n}` : 'No deals');
export function resultsText(n: number, s: FeedState): string {
  return s.q.trim() || s.ff !== 'all' ? `${n} ${n === 1 ? 'result' : 'results'}` : `All ${n} businesses`;
}
export function headingText(n: number, savedOnly: boolean): string {
  return savedOnly ? `Saved · ${n}` : `${n} ${n === 1 ? 'business' : 'businesses'}`;
}
export function stats(deals: ClientDeal[]) {
  return { total: deals.length, from: deals.length ? fmtMoney(Math.min(...deals.map(d => d.price))) : '—', distress: countBy(deals, 'distress') };
}

/* ---------- the current deal (left column on desktop, bottom panel on mobile) ---------- */
function kv(d: ClientDeal, mobile: boolean): string {
  const pct = discountPct(d);
  const was = pct ? `<em>−${pct}% · was ${aed(d.originalPrice)}</em>` : '';
  return `<dl class="d5-kv">
    <div><dt>${d.priceType === 'asking' ? 'Price' : 'Key money'}</dt><dd>${aed(d.price)}</dd>${mobile ? '' : was}</div>
    <div><dt>Rent / yr</dt><dd>${aed(d.annualRent)}</dd></div>
    <div><dt>Size</dt><dd>${d.size == null ? '—' : esc(fmtSize(d.size))}</dd></div>
  </dl>`;
}
export function infoHTML(d: ClientDeal | null): string {
  if (!d) return `<p class="d5-cat">Nothing found</p><h2>No businesses match</h2><p class="d5-ar">Try another keyword, area, budget (“under 1m”) or ID.</p>`;
  return `<p class="d5-cat">${esc(categoryLabel(d.category))}${d.distress ? ' · <span>Distress</span>' : ''}${status(d)}</p>
  <h2>${esc(d.title)}</h2>
  <p class="d5-ar"><span aria-hidden="true">📍</span> ${place(d)} · ${esc(d.id)}</p>
  ${kv(d, false)}`;
}
export function minfoHTML(d: ClientDeal | null): string {
  if (!d) return `<h2>No businesses match</h2><p class="d5-ar">Try another keyword, area or budget.</p>`;
  const pct = discountPct(d);
  return `<h2>${esc(d.title)}</h2>
  <p class="d5-ar"><span aria-hidden="true">📍</span> ${place(d)} · ${esc(d.id)}${d.distress ? ` · <span class="d5-ds">Distress${pct ? ` −${pct}%` : ''}</span>` : ''}${status(d)}</p>
  ${kv(d, true)}`;
}
/** Accessible names of the static action buttons (updated in place so keyboard focus survives a deal change). */
export const actLabels = (d: ClientDeal) => ({
  details: `Details for ${d.title} (${d.id})`, wa: `Ask Tolga on WhatsApp about ${d.title} (${d.id})`, save: `Save ${d.title} (${d.id})`,
});

/* ---------- flyers in the scroll column ---------- */
export function itemHTML(d: ClientDeal, i: number, n: number): string {
  return `<article class="d5-it" data-deal-id="${esc(d.id)}" aria-roledescription="slide" aria-label="${i + 1} of ${n}: ${esc(d.title)}">
  <button type="button" class="d5-card" data-card="${i}" aria-label="${esc(d.title)} – ${place(d)}: show this deal">${flyerHTML(d, 'md')}</button>
</article>`;
}
/** One dot per deal (at most 26); with longer lists each dot stands for a range. Helpers carry data-goto, never data-deal-id. */
export const MAX_DOTS = 26;
export const dotCount = (n: number) => Math.min(n, MAX_DOTS);
export const dotFor = (i: number, n: number) => Math.floor((i * dotCount(n)) / Math.max(1, n));
export function dotsHTML(n: number): string {
  const k = dotCount(n);
  return Array.from({ length: k }, (_, j) => `<i data-goto="${Math.floor((j * n) / k)}"></i>`).join('');
}

/* ---------- overview (All / Saved) and search rows ---------- */
export function chipsHTML(deals: ClientDeal[]): string {
  const chip = (f: Filter, label: string) =>
    `<button type="button" class="d5-chip" data-filter="${esc(f)}" aria-pressed="${f === 'all'}">${label}<small>${countBy(deals, f)}</small></button>`;
  return chip('all', 'All') + chip('distress', '🔥 Distress') + CATEGORIES.map(c => chip(c.key, `${c.icon} ${esc(c.label)}`)).join('')
    + `<button type="button" class="d5-chip d5-chip-sv" data-saved-toggle aria-pressed="false">${ICON.heart(14)}Saved<small data-saved-count>0</small></button>`;
}
export function cardHTML(d: ClientDeal, saved: boolean): string {
  const pct = discountPct(d);
  return `<article class="d5-c" data-deal-id="${esc(d.id)}">
  <div class="d5-c-im">${flyerHTML(d, 'sm')}</div>
  <div class="d5-c-bd">
    <p class="d5-c-cat">${esc(categoryLabel(d.category))}${d.distress ? ` · <span>${pct ? `−${pct}%` : 'Distress'}</span>` : ''}</p>
    <h3><button type="button" class="d5-open" data-open="${esc(d.id)}">${esc(d.title)}</button></h3>
    <p class="d5-c-ar">${esc(d.area)} · ${esc(d.id)}${status(d)}</p>
    <p class="d5-c-pr">${aed(d.price)}</p>
    <button type="button" class="d5-c-sv" data-save="${esc(d.id)}" aria-pressed="${saved}" aria-label="Save ${lbl(d)}">${ICON.heart(17)}</button>
  </div>
</article>`;
}
export function rowHTML(d: ClientDeal): string {
  return `<li><button type="button" class="d5-row" data-deal-id="${esc(d.id)}" data-open="${esc(d.id)}">
  <span class="d5-row-th">${flyerHTML(d, 'sm', '')}</span>
  <span class="d5-row-tx"><b>${esc(d.title)}</b><small>${esc(d.area)} · ${esc(d.id)}${d.distress ? ' · Distress' : ''}</small></span>
  <em>${aed(d.price)}</em></button></li>`;
}
export function emptyHTML(kind: 'search' | 'saved'): string {
  const [h, p, act] = kind === 'saved'
    ? ['No saved deals yet', 'Tap “Save” on any deal to keep it here.', '<button type="button" data-reset>Browse all deals</button>']
    : ['No businesses match', 'Try another keyword, area, budget (“under 1m”) or ID.', '<button type="button" data-reset>Reset filters</button>'];
  return `<div class="empty d5-empty"><p class="d5-empty-n" aria-hidden="true">0</p><h3>${h}</h3><p>${p}</p>${act}</div>`;
}
export const rowsHTML = (list: ClientDeal[]) => (list.length ? `<ul class="d5-rows">${list.map(rowHTML).join('')}</ul>` : emptyHTML('search'));
