// Pure string builders for Design 1 — used by the .astro components (server first paint)
// and by d1.ts (client re-render), so card markup exists exactly once. No DOM access here.
import { CATEGORIES, categoryLabel, countBy, discountPct, fmtMoney, fmtSize, type ClientDeal, type Filter, type SortKey } from '../../lib/deals';
import { esc, flyerHTML } from '../../lib/client/dom';

const svg = (body: string, size = 20, extra = '') =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;
const STROKE = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const ICON = {
  heart: svg('<path d="M12 21s-6.7-4.35-9.33-8.36C.9 9.93 2.08 6 5.7 5.2c2.14-.47 4.9.5 6.3 2.3 1.4-1.8 4.16-2.77 6.3-2.3 3.62.8 4.8 4.73 3.03 7.44C18.7 16.65 12 21 12 21z"/>'),
  wa: (size = 18) => svg('<path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.5-4.3A8.5 8.5 0 1 1 20.5 11.6z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path fill="currentColor" d="M9.2 8.1c.2-.4.5-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.5.6c-.1.1-.2.3 0 .5.6 1 1.4 1.8 2.5 2.4.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.3.3.5 0 .6-.3 1.4-1 1.7-.7.3-1.6.4-3.4-.4-2-1-3.5-2.8-4-4.2-.4-1.2 0-2 .5-2.6z"/>', size),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>', 20, STROKE),
  sliders: svg('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>', 20, STROKE),
  sort: svg('<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>', 16, STROKE),
  ig: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>', 18, STROKE),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 18, STROKE),
  check: svg('<path d="m5 12 5 5 9-10"/>', 16, STROKE),
};

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'size-desc', label: 'Size: largest first' },
];
/** Budget keys: '' = any; 'Nk'/'Nm' = "under N" (parsed by matchDeal); '5m+' = 5M and above. */
export const BUDGETS: { key: string; label: string }[] = [
  { key: '', label: 'Any budget' },
  { key: '500k', label: 'Under AED 500K' },
  { key: '1m', label: 'Under AED 1M' },
  { key: '2m', label: 'Under AED 2M' },
  { key: '5m', label: 'Under AED 5M' },
  { key: '5m+', label: 'AED 5M and above' },
];

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const aed = (n: number | null) => (n == null ? '—' : `<small>AED</small> ${fmtMoney(n)}`);

export function cardHTML(d: ClientDeal, saved: boolean, mobile = false): string {
  const pct = discountPct(d);
  // Badges sit in the blurred side gutter of the 9:16 flyer, so they stay compact (never cover flyer text).
  const badges =
    (d.distress ? `<span class="d1-b d1-b-red"><small>Distress</small>${pct ? `−${pct}%` : ''}</span>` : '') +
    (d.status !== 'available' ? `<span class="d1-b d1-b-dark">${esc(cap(d.status))}</span>` : '');
  return `<article class="d1-card" data-deal-id="${esc(d.id)}">
  <div class="d1-im">${flyerHTML(d, mobile ? 'md' : 'sm')}<div class="d1-badges">${badges}</div></div>
  <button type="button" class="d1-save" data-save aria-pressed="${saved}" aria-label="Save ${esc(d.title)} (${esc(d.id)})">${ICON.heart}</button>
  <div class="d1-bd">
    <div class="d1-meta"><span class="d1-id">${esc(d.id)}</span><span class="d1-cat">${esc(categoryLabel(d.category))}</span></div>
    <h3 class="d1-ttl"><button type="button" data-open>${esc(d.title)}</button></h3>
    <div class="d1-loc">📍 ${esc(d.area)}</div>
    <dl class="d1-kv">
      <div><dt>${d.priceType === 'asking' ? 'Price' : 'Key money'}</dt><dd class="d1-big">${aed(d.price)}${pct ? ` <s>${fmtMoney(d.originalPrice)}</s>` : ''}</dd></div>
      <div><dt>Rent / yr</dt><dd>${aed(d.annualRent)}</dd></div>
      <div><dt>Size</dt><dd>${esc(fmtSize(d.size))}</dd></div>
    </dl>
  </div>
</article>`;
}

export function chipsHTML(deals: ClientDeal[], active: Filter): string {
  const chip = (f: Filter, label: string) =>
    `<button type="button" class="d1-chip" data-filter="${esc(f)}" aria-pressed="${f === active}">${label} <span class="d1-n">${countBy(deals, f)}</span></button>`;
  return chip('all', 'All') + chip('distress', '🔥 Distress') +
    CATEGORIES.map(c => chip(c.key, `${c.icon} ${esc(c.label)}`)).join('');
}

export function emptyHTML(savedOnly: boolean, savedCount: number): string {
  const [h, p, b] = savedOnly && savedCount === 0
    ? ['No saved deals yet', 'Tap the ♡ on any listing to keep it here for later.', 'Show all deals']
    : ['No businesses match your search', 'Try another keyword, category or budget.', 'Reset filters'];
  return `<div class="empty d1-empty"><div class="d1-empty-ic">${ICON.search}</div><h3>${h}</h3><p>${p}</p><button type="button" data-reset>${b}</button></div>`;
}

/** Copy numbers derived from the data (never hard-coded). */
export function stats(deals: ClientDeal[]) {
  return {
    total: deals.length,
    distress: countBy(deals, 'distress'),
    from: deals.length ? fmtMoney(Math.min(...deals.map(d => d.price))) : '—',
  };
}
