// Pure string builders for Design 4 (TikTok Feed) — shared by the .astro components (server first paint) and by
// the client scripts (re-render), so every piece of deal markup exists exactly once. No DOM access here.
import {
  CATEGORIES, categoryLabel, countBy, discountPct, fmtMoney, fmtSize, matchDeal, sortDeals, waLink,
  type ClientDeal, type Filter, type SortKey,
} from '../../lib/deals';
import { esc, flyerHTML, cssUrl } from '../../lib/client/dom';

/* ---------- feeds ---------- */
/** What the feed is showing: the two curated tabs, or one of the shared filters (distress / a category). */
export type FeedKey = 'foryou' | 'new' | Exclude<Filter, 'all'>;
export const NEW_COUNT = 8;

/** "For you": newest first, but round-robin across categories so consecutive slides never feel repetitive. */
export function forYou(deals: ClientDeal[]): ClientDeal[] {
  const groups = new Map<string, ClientDeal[]>();
  for (const d of sortDeals(deals, 'newest')) {
    if (!groups.has(d.category)) groups.set(d.category, []);
    groups.get(d.category)!.push(d);
  }
  const out: ClientDeal[] = [];
  const lanes = [...groups.values()];
  for (let r = 0; out.length < deals.length; r++) lanes.forEach(l => { if (l[r]) out.push(l[r]); });
  return out;
}
export function feedList(deals: ClientDeal[], key: FeedKey): ClientDeal[] {
  if (key === 'foryou') return forYou(deals);
  if (key === 'new') return sortDeals(deals, 'newest').slice(0, NEW_COUNT);
  return sortDeals(deals.filter(d => matchDeal(d, '', key)), 'newest');
}
export function feedLabel(key: FeedKey): string {
  if (key === 'foryou') return 'For you';
  if (key === 'new') return 'New';
  if (key === 'distress') return 'Distress';
  return categoryLabel(key);
}
export const isFeedKey = (v: string): v is FeedKey =>
  v === 'foryou' || v === 'new' || v === 'distress' || CATEGORIES.some(c => c.key === v);

/* ---------- icons ---------- */
const svg = (body: string, size = 20, extra = '') =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;
const STROKE = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const ICON = {
  heart: (size = 26) => svg('<path d="M12 20.5s-7.5-4.6-9.6-9.2C.9 7.9 3 4.5 6.4 4.5c2.2 0 3.7 1.3 4.6 2.7h2c.9-1.4 2.4-2.7 4.6-2.7 3.4 0 5.5 3.4 4 6.8-2.1 4.6-9.6 9.2-9.6 9.2z"/>', size, ' class="d4-heart"'),
  mark: (size = 21) => svg('<path d="M19 21 12 16l-7 5V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17Z"/>', size, ' class="d4-mark"'),
  wa: (size = 22) => svg('<path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8 0-1.4.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.6 2.1 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/>', size),
  share: (size = 22) => svg('<path d="M22 3 9.2 10.1M22 3l-8 18-4.8-10.9L2 7.5 22 3Z"/>', size, STROKE),
  info: (size = 22) => svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.01"/>', size, STROKE),
  search: (size = 20) => svg('<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>', size, STROKE),
  grid: (size = 18) => svg('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>', size, STROKE),
  home: (size = 24) => svg('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z"/>', size, STROKE),
  plus: (size = 26) => svg('<path d="M12 5v14M5 12h14"/>', size, ' fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"'),
  pin: (size = 13) => svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', size, STROKE),
  close: (size = 18) => svg('<path d="M6 6l12 12M18 6 6 18"/>', size, STROKE),
  up: (size = 18) => svg('<path d="m6 15 6-6 6 6"/>', size, STROKE),
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
/** "Jumeirah, Dubai" — but never "Dubai, Dubai". */
export const place = (d: ClientDeal) => (/^dubai$/i.test(d.area.trim()) ? esc(d.area) : `${esc(d.area)}, Dubai`);
const lbl = (d: ClientDeal) => `${esc(d.title)} (${esc(d.id)})`;
const tag = (s: string) => '#' + s.replace(/[^\p{L}\p{N}]+/gu, '');
const status = (d: ClientDeal) => (d.status !== 'available' ? `<span class="d4-st">${esc(cap(d.status))}</span>` : '');
const bg = (d: ClientDeal, cls: string) =>
  `<div class="${cls}" aria-hidden="true"${d.img ? ` style="background-image:url('${cssUrl(d.img.sm)}')"` : ''}></div>`;
const avatar = (cls: string) => `<span class="${cls}" aria-hidden="true"><b></b></span>`; // Tolga's photo via CSS

export function headingText(n: number, savedOnly: boolean): string {
  return savedOnly ? `Saved · ${n}` : `${n} ${n === 1 ? 'business' : 'businesses'}`;
}
export function resultsText(n: number, q: string): string {
  return q.trim() ? `${n} ${n === 1 ? 'result' : 'results'}` : `All ${n} businesses`;
}

/* ---------- filters (rendered once; only aria-pressed changes later) ---------- */
/** Right-column feed filters on desktop: For you, Distress, every category — with live counts. */
export function feedFiltersHTML(deals: ClientDeal[]): string {
  const row = (k: FeedKey, icon: string, label: string, n: number) =>
    `<li><button type="button" class="d4-ff" data-set-feed="${esc(k)}" aria-pressed="${k === 'foryou'}"><span aria-hidden="true">${icon}</span>${esc(label)}<small>${n}</small></button></li>`;
  return `<ul class="d4-ffl">${row('foryou', '✦', 'For you', deals.length)}${row('distress', '🔥', 'Distress', countBy(deals, 'distress'))}${
    CATEGORIES.map(c => row(c.key, c.icon, c.label, countBy(deals, c.key))).join('')}</ul>`;
}
/** The three TikTok tabs. `order` differs between desktop (Distress | For you | New) and mobile. */
export function tabsHTML(order: FeedKey[], cls: string): string {
  const text: Record<string, string> = { foryou: 'For you', distress: '🔥 Distress', new: 'New' };
  return order.map(k => `<button type="button" class="${cls}" data-set-feed="${k}" aria-pressed="${k === 'foryou'}">${text[k]}</button>`).join('');
}
/** Category chips of the All overlay / sheet. */
export function chipsHTML(deals: ClientDeal[], savedChip: boolean): string {
  const chip = (f: Filter, label: string) =>
    `<button type="button" class="d4-chip" data-filter="${esc(f)}" aria-pressed="${f === 'all'}">${label}<small>${countBy(deals, f)}</small></button>`;
  return chip('all', 'All') + chip('distress', '🔥 Distress') + CATEGORIES.map(c => chip(c.key, `${c.icon} ${esc(c.label)}`)).join('')
    + (savedChip ? `<button type="button" class="d4-chip d4-chip-sv" data-saved-toggle aria-pressed="false">${ICON.heart(14)}Saved<small data-saved-count>0</small></button>` : '');
}

export function emptyHTML(kind: 'search' | 'saved' | 'feed'): string {
  const [h, p, act] = kind === 'saved'
    ? ['No saved deals yet', 'Tap Save on any deal — or double-tap its flyer — to keep it here.', '<button type="button" data-reset>Browse all deals</button>']
    : kind === 'feed'
      ? ['Nothing here yet', 'There are no businesses in this feed right now.', '<button type="button" data-set-feed="foryou">Show all deals</button>']
      : ['No businesses match', 'Try another keyword, area, budget (“under 1m”) or ID.', '<button type="button" data-reset>Reset filters</button>'];
  return `<div class="empty d4-empty"><div class="d4-empty-ic">${ICON.search(22)}</div><h3>${h}</h3><p>${p}</p>${act}</div>`;
}

/* ---------- desktop slide (inside the phone) ---------- */
export function slideHTML(d: ClientDeal, i: number, n: number, saved: boolean): string {
  const pct = discountPct(d);
  return `<article class="d4-sl" data-deal-id="${esc(d.id)}" aria-roledescription="slide" aria-label="${i + 1} of ${n}: ${esc(d.title)}">
  ${bg(d, 'd4-sl-bg')}
  <div class="d4-sl-fl">${flyerHTML(d, 'md')}</div>
  <div class="d4-rail">
    ${avatar('d4-av')}
    <button type="button" class="d4-ra d4-ra-lk" data-save="${esc(d.id)}" aria-pressed="${saved}" aria-label="Save ${lbl(d)}"><i>${ICON.heart()}</i><span class="d4-off" aria-hidden="true">Save</span><span class="d4-on" aria-hidden="true">Saved</span></button>
    <a class="d4-ra d4-ra-wa" href="${esc(waLink(d))}" target="_blank" rel="noopener" aria-label="Ask Tolga on WhatsApp about ${lbl(d)}"><i>${ICON.wa()}</i><span aria-hidden="true">Ask</span></a>
    <button type="button" class="d4-ra" data-share="${esc(d.id)}" aria-label="Share ${lbl(d)}"><i>${ICON.share()}</i><span aria-hidden="true">Share</span></button>
    <button type="button" class="d4-ra" data-details="${esc(d.id)}" aria-label="Details for ${lbl(d)}"><i>${ICON.info()}</i><span aria-hidden="true">Details</span></button>
  </div>
  <div class="d4-cap">
    <p class="d4-cap-u">@dxb.deals <span class="d4-tick" aria-label="verified">✔</span> · ${esc(d.id)}${d.distress ? '<em>Distress</em>' : ''}${status(d)}</p>
    <h2>${esc(d.title)} · ${esc(d.area)}</h2>
    <p class="d4-cap-tg">${esc(tag(categoryLabel(d.category)))} ${esc(tag(d.area))} ${d.area.trim().toLowerCase() === 'dubai' ? '' : '#Dubai '}#ForSale</p>
    <p class="d4-cap-pr"><span>${d.priceType === 'asking' ? 'Price' : 'Key money'} <b>${aed(d.price)}</b>${pct ? ` <s>${aed(d.originalPrice)}</s>` : ''}</span><span>Rent ${aed(d.annualRent)}</span><span>${d.size == null ? 'Size —' : esc(fmtSize(d.size))}</span></p>
  </div>
</article>`;
}

/* ---------- mobile slide (fullscreen, glass) ---------- */
export function mslideHTML(d: ClientDeal, i: number, n: number, saved: boolean): string {
  const pct = discountPct(d);
  return `<article class="d4-ms" data-deal-id="${esc(d.id)}" aria-roledescription="slide" aria-label="${i + 1} of ${n}: ${esc(d.title)}">
  ${bg(d, 'd4-ms-bg')}
  <div class="d4-ms-fl">${flyerHTML(d, 'md')}</div>
  <div class="d4-mcap d4-glass">
    <p class="d4-mcap-u"><span class="d4-mlogo" aria-hidden="true"></span>dxb.deals <span class="d4-tick" aria-label="verified">✔</span><small>${esc(d.id)} · ${i + 1}/${n}</small></p>
    <h2>${esc(d.title)}</h2>
    <p class="d4-mcap-a">${ICON.pin()} ${place(d)} · ${esc(categoryLabel(d.category))}${status(d)}</p>
    <p class="d4-mcap-kv"><span class="d4-p">${aed(d.price)}</span>${pct ? `<span class="d4-pd">−${pct}% · was ${aed(d.originalPrice)}</span>` : d.distress ? '<span class="d4-pd">Distress</span>' : ''}<span>Rent ${aed(d.annualRent)}</span><span>${d.size == null ? 'Size —' : esc(fmtSize(d.size))}</span></p>
  </div>
  <div class="d4-mrail d4-glass">
    ${avatar('d4-me')}
    <a class="d4-act d4-act-wa" href="${esc(waLink(d))}" target="_blank" rel="noopener" aria-label="Contact Tolga on WhatsApp about ${lbl(d)}"><i>${ICON.wa(21)}</i><span aria-hidden="true">Contact</span></a>
    <button type="button" class="d4-act d4-act-sv" data-save="${esc(d.id)}" aria-pressed="${saved}" aria-label="Save ${lbl(d)}"><i>${ICON.mark()}</i><span class="d4-off" aria-hidden="true">Save</span><span class="d4-on" aria-hidden="true">Saved</span></button>
    <button type="button" class="d4-act" data-share="${esc(d.id)}" aria-label="Share ${lbl(d)}"><i>${ICON.share(20)}</i><span aria-hidden="true">Share</span></button>
    <button type="button" class="d4-act" data-details="${esc(d.id)}" aria-label="Details for ${lbl(d)}"><i>${ICON.info(21)}</i><span aria-hidden="true">Details</span></button>
  </div>
</article>`;
}

/* ---------- grid cards (All overlay / sheet) and search rows ---------- */
export function cardHTML(d: ClientDeal, saved: boolean): string {
  const pct = discountPct(d);
  // Badges and the save button sit in the card body, never on top of the flyer.
  return `<article class="d4-c" data-deal-id="${esc(d.id)}">
  <div class="d4-c-im">${flyerHTML(d, 'sm')}</div>
  <div class="d4-c-bd">
    <p class="d4-c-pr"><b>${aed(d.price)}</b>${d.distress ? `<span class="d4-c-tag">${pct ? `−${pct}%` : 'Distress'}</span>` : ''}</p>
    <h3><button type="button" class="d4-open" data-open="${esc(d.id)}">${esc(d.title)}</button></h3>
    <small>${esc(d.area)} · ${esc(d.id)}${status(d)}</small>
    <button type="button" class="d4-c-sv" data-save="${esc(d.id)}" aria-pressed="${saved}" aria-label="Save ${lbl(d)}">${ICON.heart(17)}</button>
  </div>
</article>`;
}
export function rowHTML(d: ClientDeal): string {
  return `<li><button type="button" class="d4-row" data-deal-id="${esc(d.id)}" data-open="${esc(d.id)}">
  <span class="d4-row-th">${flyerHTML(d, 'sm', '')}</span>
  <span class="d4-row-tx"><b>${esc(d.title)} · ${esc(d.area)}</b><small>${esc(d.id)} · ${esc(categoryLabel(d.category))}${d.distress ? ' · 🔥 Distress' : ''}</small></span>
  <em>${aed(d.price)}</em></button></li>`;
}
export const rowsHTML = (list: ClientDeal[]) => (list.length ? `<ul class="d4-rows">${list.map(rowHTML).join('')}</ul>` : emptyHTML('search'));

/** Copy numbers derived from the data (never hard-coded). */
export function stats(deals: ClientDeal[]) {
  return { total: deals.length, from: deals.length ? fmtMoney(Math.min(...deals.map(d => d.price))) : '—', distress: countBy(deals, 'distress') };
}
