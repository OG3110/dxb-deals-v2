// Pure string builders for Design 2 (Search First) — shared by the .astro components (server first paint)
// and by d2.ts / feed.ts (client re-render), so every piece of deal markup exists exactly once. No DOM access here.
import { CATEGORIES, categoryLabel, countBy, fmtMoney, fmtSize, waLink, type ClientDeal, type Filter, type SortKey } from '../../lib/deals';
import { esc, flyerHTML } from '../../lib/client/dom';

const svg = (body: string, size = 20, extra = '') =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;
const STROKE = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const ICON = {
  heart: (size = 18) => svg('<path d="M12 21s-6.7-4.35-9.33-8.36C.9 9.93 2.08 6 5.7 5.2c2.14-.47 4.9.5 6.3 2.3 1.4-1.8 4.16-2.77 6.3-2.3 3.62.8 4.8 4.73 3.03 7.44C18.7 16.65 12 21 12 21z"/>', size, ' class="d2-heart"'),
  wa: (size = 18) => svg('<path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.5-4.3A8.5 8.5 0 1 1 20.5 11.6z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path fill="currentColor" d="M9.2 8.1c.2-.4.5-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.5.6c-.1.1-.2.3 0 .5.6 1 1.4 1.8 2.5 2.4.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.3.3.5 0 .6-.3 1.4-1 1.7-.7.3-1.6.4-3.4-.4-2-1-3.5-2.8-4-4.2-.4-1.2 0-2 .5-2.6z"/>', size),
  search: (size = 20) => svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>', size, STROKE),
  sort: svg('<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>', 16, STROKE),
  table: svg('<path d="M4 6h16M4 12h16M4 18h16"/>', 16, STROKE),
  grid: svg('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>', 16, STROKE),
  play: svg('<path d="m9 6 6 6-6 6"/>', 18, STROKE),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>', 20, STROKE),
  up: svg('<path d="m6 15 6-6 6 6"/>', 22, STROKE),
  down: svg('<path d="m6 9 6 6 6-6"/>', 22, STROKE),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 18, STROKE),
  ig: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>', 18, STROKE),
};

/* ---------- table sort (desktop): nulls always last, whatever the direction ---------- */
export type TableKey = 'id' | 'title' | 'area' | 'category' | 'price' | 'annualRent' | 'size';
export type Dir = 1 | -1;
export const COLS: { key: TableKey; label: string; num?: boolean }[] = [
  { key: 'id', label: 'ID' }, { key: 'title', label: 'Business' }, { key: 'area', label: 'Area' },
  { key: 'category', label: 'Category' }, { key: 'price', label: 'Price', num: true },
  { key: 'annualRent', label: 'Rent / yr', num: true }, { key: 'size', label: 'Size', num: true },
];
const VAL: Record<TableKey, (d: ClientDeal) => string | number | null> = {
  id: d => d.id, title: d => d.title, area: d => d.area, category: d => categoryLabel(d.category),
  price: d => d.price, annualRent: d => d.annualRent, size: d => d.size,
};
export function sortTable(list: ClientDeal[], key: TableKey, dir: Dir): ClientDeal[] {
  return list.slice().sort((a, b) => {
    const x = VAL[key](a), y = VAL[key](b);
    if (x == null || y == null) return x == null && y == null ? b.id.localeCompare(a.id) : x == null ? 1 : -1;
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'en', { sensitivity: 'base' });
    return c * dir || b.id.localeCompare(a.id);
  });
}

/* ---------- mobile sort (bottom sheet) uses the shared sortDeals keys ---------- */
export const MSORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' }, { key: 'price-asc', label: 'Price ↑' },
  { key: 'price-desc', label: 'Price ↓' }, { key: 'size-desc', label: 'Size ↓' },
];

/** Quick pills under the hero search: each sets a query and/or a filter. */
export const QUICK: { label: string; q: string; f: Filter }[] = [
  { label: '🔥 Distress deals', q: '', f: 'distress' },
  { label: 'Under AED 1M', q: 'under 1m', f: 'all' },
  { label: '🍽 Restaurants', q: '', f: 'restaurant' },
  { label: 'Business Bay', q: 'business bay', f: 'all' },
  { label: 'Jumeirah', q: 'jumeirah', f: 'all' },
];
export const quickHTML = (cls: string) =>
  QUICK.map((p, i) => `<button type="button" class="${cls}" data-quick="${i}" aria-pressed="false">${esc(p.label)}</button>`).join('');

const aed = (n: number | null) => (n == null ? '—' : `AED ${fmtMoney(n)}`);
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const distress = (d: ClientDeal) => (d.distress ? '<span class="d2-ds">Distress</span>' : '');
const status = (d: ClientDeal) => (d.status !== 'available' ? `<span class="d2-st">${esc(cap(d.status))}</span>` : '');
const saveBtn = (d: ClientDeal, saved: boolean, cls = 'd2-save') =>
  `<button type="button" class="${cls}" data-save aria-pressed="${saved}" aria-label="Save ${esc(d.title)} (${esc(d.id)})">${ICON.heart(18)}</button>`;

export function filterLabel(f: Filter): string {
  return f === 'all' ? 'All businesses' : f === 'distress' ? 'Distress deals' : categoryLabel(f);
}
export function headingText(n: number, total: number, filtered: boolean, savedOnly: boolean): string {
  if (savedOnly) return `Saved (${n})`;
  return filtered ? `${n} ${n === 1 ? 'result' : 'results'}` : `All businesses (${total})`;
}

/* ---------- desktop table ---------- */
export function theadHTML(key: TableKey, dir: Dir): string {
  return `<thead><tr>${COLS.map(c => {
    const on = c.key === key;
    const sort = on ? (dir === 1 ? 'ascending' : 'descending') : 'none';
    return `<th scope="col" aria-sort="${sort}"${c.num ? ' class="d2-num"' : ''}><button type="button" data-sort="${c.key}">${c.label}<span class="d2-arr" aria-hidden="true">${on ? (dir === 1 ? '▲' : '▼') : '▲'}</span></button></th>`;
  }).join('')}<th scope="col"><span class="d2-vh">Save and open</span></th></tr></thead>`;
}
export function rowHTML(d: ClientDeal, saved: boolean): string {
  return `<tr class="d2-row" data-deal-id="${esc(d.id)}">
  <td class="d2-td-id">${esc(d.id)}</td>
  <td><div class="d2-biz"><div class="d2-th">${flyerHTML(d, 'sm')}</div><div class="d2-biz-tx"><button type="button" class="d2-open" data-open>${esc(d.title)}</button>${distress(d)}${status(d)}</div></div></td>
  <td>${esc(d.area)}</td><td class="d2-td-cat">${esc(categoryLabel(d.category))}</td>
  <td class="d2-num d2-price">${aed(d.price)}</td><td class="d2-num">${aed(d.annualRent)}</td><td class="d2-num">${esc(fmtSize(d.size))}</td>
  <td class="d2-td-act">${saveBtn(d, saved)}<span class="d2-play" aria-hidden="true">${ICON.play}</span></td>
</tr>`;
}
export function tableHTML(list: ClientDeal[], key: TableKey, dir: Dir, isSaved: (id: string) => boolean): string {
  return `<div class="d2-tablewrap"><table class="d2-table">${theadHTML(key, dir)}<tbody>${list.map(d => rowHTML(d, isSaved(d.id))).join('')}</tbody></table></div>`;
}

/* ---------- desktop grid ---------- */
export function sortBarHTML(key: TableKey, dir: Dir): string {
  return `<div class="d2-sortbar" role="group" aria-label="Sort by"><span>Sort by</span>${COLS.filter(c => c.key !== 'category').map(c => {
    const on = c.key === key;
    return `<button type="button" data-sort="${c.key}" aria-pressed="${on}">${c.label}${on ? `<span class="d2-arr" aria-hidden="true">${dir === 1 ? '▲' : '▼'}</span><span class="d2-vh">${dir === 1 ? ' ascending' : ' descending'}</span>` : ''}</button>`;
  }).join('')}</div>`;
}
export function cardHTML(d: ClientDeal, saved: boolean): string {
  return `<article class="d2-card" data-deal-id="${esc(d.id)}">
  <div class="d2-card-im">${flyerHTML(d, 'md')}</div>
  <div class="d2-card-bd">
    <div class="d2-card-top"><b class="d2-card-pr">${aed(d.price)}</b>${saveBtn(d, saved)}</div>
    <h3><button type="button" class="d2-open" data-open>${esc(d.title)}</button></h3>
    <p>${esc(d.area)} · ${esc(categoryLabel(d.category))}</p>
    <div class="d2-card-ft"><span class="d2-td-id">${esc(d.id)}</span>${distress(d)}${status(d)}</div>
  </div>
</article>`;
}

/* ---------- mobile list ---------- */
export function listRowHTML(d: ClientDeal): string {
  return `<article class="d2-li" data-deal-id="${esc(d.id)}">
  <div class="d2-li-th">${flyerHTML(d, 'sm')}</div>
  <div class="d2-li-bd"><h3><button type="button" class="d2-open" data-open>${esc(d.title)}</button></h3><p>${esc(d.area)} · ${esc(categoryLabel(d.category))}</p>${d.distress || d.status !== 'available' ? `<div class="d2-li-b">${distress(d)}${status(d)}</div>` : ''}</div>
  <div class="d2-li-pr"><small>AED</small><b>${fmtMoney(d.price)}</b></div>
</article>`;
}

/* ---------- suggestions (desktop combobox) ---------- */
export function sugHTML(top: ClientDeal[], total: number, q: string): string {
  const items = top.map((d, i) => `<li role="option" id="d2-sug-${i}" class="d2-sug-it" data-sug="${esc(d.id)}" aria-selected="false">
    <span class="d2-sug-th">${flyerHTML(d, 'sm')}</span>
    <span class="d2-sug-tx"><b>${esc(d.title)}</b><small>${esc(d.area)} · ${esc(categoryLabel(d.category))} · ${esc(d.id)}</small></span>
    <em>${aed(d.price)}</em></li>`).join('');
  if (!total) return `<li class="d2-sug-none" role="presentation">No matches for “${esc(q.trim())}” — try another word, area or ID.</li>`;
  return items + `<li role="option" id="d2-sug-all" class="d2-sug-all" data-sug-all aria-selected="false">See all ${total} ${total === 1 ? 'result' : 'results'} ↓</li>`;
}

/* ---------- stories ---------- */
export function ringsHTML(deals: ClientDeal[]): string {
  return CATEGORIES.map(c => {
    const list = deals.filter(d => d.category === c.key); // deals arrive newest first
    if (!list.length) return '';
    return `<button type="button" class="d2-ring" data-ring="${esc(c.key)}" aria-label="${esc(c.label)}: ${list.length} ${list.length === 1 ? 'deal' : 'deals'} – open story">
  <span class="d2-ring-o"><span class="d2-ring-i">${flyerHTML(list[0], 'sm', '')}</span></span>
  <span class="d2-ring-l">${esc(c.label)}</span><small>${list.length} ${list.length === 1 ? 'deal' : 'deals'}</small></button>`;
  }).join('');
}

/* ---------- filter chips + empty state ---------- */
export function chipsHTML(deals: ClientDeal[], active: Filter): string {
  const chip = (f: Filter, label: string) =>
    `<button type="button" class="d2-chip" data-filter="${esc(f)}" aria-pressed="${f === active}">${label}<span class="d2-n">${countBy(deals, f)}</span></button>`;
  return chip('all', 'All') + chip('distress', '🔥 Distress') + CATEGORIES.map(c => chip(c.key, esc(c.label))).join('');
}
export function emptyHTML(savedOnly: boolean, savedCount: number): string {
  const [h, p, b] = savedOnly && savedCount === 0
    ? ['No saved deals yet', 'Tap ♡ on any deal to keep it here for later.', 'Show all deals']
    : ['No businesses match your search', 'Try another keyword, area, budget or category.', 'Reset filters'];
  return `<div class="empty d2-empty"><div class="d2-empty-ic">${ICON.search(22)}</div><h3>${h}</h3><p>${p}</p><button type="button" data-reset>${b}</button></div>`;
}

/* ---------- fullscreen vertical feed slide ---------- */
export function slideHTML(d: ClientDeal, i: number, n: number, saved: boolean): string {
  return `<article class="d2-vf-sl" data-deal-id="${esc(d.id)}" aria-roledescription="slide" aria-label="${i + 1} of ${n}: ${esc(d.title)}">
  <div class="d2-vf-im">${flyerHTML(d, 'md')}</div>
  <div class="d2-vf-cap">
    <div class="d2-vf-meta"><span>${esc(d.id)}</span><span>${esc(categoryLabel(d.category))}</span>${distress(d)}${status(d)}</div>
    <h3>${esc(d.title)}</h3>
    <p>📍 ${esc(d.area)} · <b>${aed(d.price)}</b>${d.annualRent != null ? ` · Rent ${aed(d.annualRent)}/yr` : ''}</p>
    <div class="d2-vf-acts">
      <a class="d2-vf-wa" href="${esc(waLink(d))}" target="_blank" rel="noopener">${ICON.wa(18)}Ask on WhatsApp</a>
      <button type="button" class="d2-vf-btn" data-vf-save aria-pressed="${saved}" aria-label="Save ${esc(d.title)} (${esc(d.id)})">${ICON.heart(20)}</button>
      <button type="button" class="d2-vf-btn" data-vf-info aria-label="Details for ${esc(d.title)} (${esc(d.id)})">${ICON.info}</button>
    </div>
  </div>
</article>`;
}

/** Copy numbers derived from the data (never hard-coded). */
export function stats(deals: ClientDeal[]) {
  return {
    total: deals.length,
    distress: countBy(deals, 'distress'),
    from: deals.length ? fmtMoney(Math.min(...deals.map(d => d.price))) : '—',
  };
}
