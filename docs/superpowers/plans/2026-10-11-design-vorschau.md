# DXB Deals Design-Vorschau – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Astro site on branch `redesign` that serves 5 switchable website designs (each with its own desktop and mobile version) on real listing data, deployed as a Vercel preview while dxb-deals.com stays unchanged.

**Architecture:** Astro static site. Listings live as content-collection folders (`index.md` + `flyer.png`), validated by a zod schema and turned into optimized WebP images at build time. Every design page embeds the listing list as JSON; pure logic (search, formatting, sorting, WhatsApp links) lives in one tested TypeScript module shared by all designs; each design is a pair of Astro components (Desktop/Mobile) plus one client script. A floating preview bar switches design and device.

**Tech Stack:** Astro 7.3.x (static), TypeScript, zod via `astro/zod`, `astro/loaders` glob loader, `astro:assets` `getImage` (sharp), Vitest 5, vanilla JS in the browser, Vercel (Git preview deployments).

**Spec:** `docs/superpowers/specs/2026-10-11-design-vorschau-design.md`

## Global Constraints

- Repo `OG3110/dxb-deals-v2`, work only on branch `redesign`; never push to `main`, never change the production domain.
- Node ≥ 22.12 (installed: 24.16). Astro `^7.3.8`, Vitest `^5.0.3`.
- Site language English; UI copy English. Brand colours: petrol `#12303A`, gold `#F2C94C`; WhatsApp green `#25D366`.
- WhatsApp number `+971503186047`; message format: `Hello Tolga, I am interested in {ID} ({Title} – {Area}). Please send me more information.`
- Phone call link `tel:+971503186047`. No in-site messaging/chat feature.
- Every page: `<meta name="robots" content="noindex">`.
- Saved deals in `localStorage` key `dxb:saved` (JSON array of IDs), all access wrapped in try/catch.
- Mobile breakpoint: viewport width `< 768px`. `?view=mobile|desktop` overrides; `?frame=1` hides the preview bar.
- Animations must honour `prefers-reduced-motion: reduce` (disable non-essential motion).
- Flyer images delivered as WebP; largest delivered variant ≤ 250 KB.
- Any change to Vercel project settings (deployment protection, build settings in the dashboard) requires asking Güney first.
- Files stay under ~500 lines; split a design script if it grows beyond that.
- Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (use `git commit -F` with a message file or a second `-m`).

## Review Focus

1. **Search with accents / mixed case / extra spaces** (“  CAFE ”, “Café”, “restaurant  jumeirah”) – must match like the plain query. → tests in Task 2.
2. **Listings without rent or size** (DXB008, DXB019, DXB015…) – cards, quick view and sorting must show “—” and never `NaN`/`null`; size sort puts them last. → tests in Task 2, checks in Tasks 7–11.
3. **Empty results** (search “zzz”, Saved with nothing saved) – each design shows a friendly empty state with a reset action, no blank screen. → acceptance checklist in Tasks 7–11.
4. **`localStorage` unavailable** (Safari private mode throws on `setItem`) – saving still works for the session, no uncaught error. → test in Task 5.
5. **Phone opened with a desktop link and vice versa** (`/design-3/` on a 390 px phone, `?view=mobile` on a 1440 px PC) – correct version shows, only that version’s script runs, no horizontal scroll. → test in Task 6 + checklists.

---

## File Structure

```
.gitignore                         (modify: add node_modules, dist, .astro, .superpowers, .vercel)
package.json                       (create)
astro.config.mjs                   (create)
tsconfig.json                      (create)
vercel.json                        (create – build settings for this branch only)
vitest.config.ts                   (create)
scripts/migrate-listings.mjs       (create – one-off, kept for reference)
public/brand/logo.png              (from repo root dxb-logo.png)
public/brand/tolga.png             (from repo images/tolga-keklik.png)
src/content.config.ts              (schema + glob loader)
src/content/listings/<id>-<slug>/index.md + flyer.png   (26 folders, generated)
src/lib/deals.ts                   (pure logic: types, categories, fmt, search, sort, links)
src/lib/load.ts                    (build-time: collection → ClientDeal[] with WebP URLs)
src/lib/client/data.ts             (browser: read embedded JSON)
src/lib/client/saved.ts            (browser: saved store with storage fallback)
src/lib/client/quickview.ts        (browser: quick-view modal / bottom sheet)
src/lib/client/dom.ts              (browser: esc(), h() helpers)
src/designs/registry.ts            (list of the 5 designs: n, slug, name, blurb)
src/designs/shared.css             (tokens, reset, quick-view + empty-state styles)
src/designs/d1-marketplace/{Desktop.astro,Mobile.astro,d1.css,d1.ts}
src/designs/d2-search/{Desktop.astro,Mobile.astro,d2.css,d2.ts}
src/designs/d3-feed-all/{Desktop.astro,Mobile.astro,d3.css,d3.ts}
src/designs/d4-tiktok/{Desktop.astro,Mobile.astro,d4.css,d4.ts}
src/designs/d5-split/{Desktop.astro,Mobile.astro,d5.css,d5.ts}
src/components/BaseLayout.astro    (html shell, noindex, fonts, embedded JSON)
src/components/PreviewBar.astro    (design + device switcher, phone frame)
src/pages/index.astro              (landing: 5 design cards)
src/pages/design-[n].astro         (getStaticPaths 1..5 → renders design n)
tests/deals.test.ts
tests/saved.test.ts
tests/view.test.ts
```

Mockup sources to port (local only, git-ignored):
- `.superpowers/mockups/alte-entwuerfe/design-alle-a-h.html` – design **C** (`.dc-*` classes)
- `.superpowers/mockups/alte-entwuerfe/feed-suche-uebersicht.html` – **S1** (`.s1-*`), **S3** (`.s3-*`)
- `.superpowers/mockups/alte-entwuerfe/feed-varianten-tiktok.html` – **T1** (`.t1-*`), **T2** (`.t2-*`)
- `.superpowers/mockups/instagram-tiktok/mobile.html` – glass mobile feed (tab bar, rail, bottom sheets) used as the base for design 4 mobile

---

### Task 1: Astro scaffold on branch `redesign`

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vercel.json`, `vitest.config.ts`, `src/pages/index.astro` (temporary)
- Modify: `.gitignore` (create if missing)
- Add to git: `docs/superpowers/specs/2026-10-11-design-vorschau-design.md`, this plan

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm test` scripts used by every later task.

- [ ] **Step 1: Confirm branch and clean state**

Run: `git -C "C:/Users/guene/Desktop/Claude Projekte/DXB-Deals Webseite" branch --show-current`
Expected: `redesign`

- [ ] **Step 2: Write `.gitignore`**

```gitignore
node_modules/
dist/
.astro/
.superpowers/
.vercel/
*.log
.DS_Store
```

- [ ] **Step 3: Write `package.json`**

```json
{
  "name": "dxb-deals",
  "private": true,
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "dev": "astro dev --port 4322",
    "build": "astro build",
    "preview": "astro preview --port 4322",
    "test": "vitest run",
    "migrate": "node scripts/migrate-listings.mjs"
  },
  "engines": { "node": ">=22.12.0" }
}
```

Then install: `npm install astro@^7.3.8 sharp && npm install -D vitest@^5.0.3 typescript`

- [ ] **Step 4: Write `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `vercel.json`**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  image: { service: { entrypoint: 'astro/assets/services/sharp' } },
});
```

```json
// tsconfig.json
{ "extends": "astro/tsconfigs/strict", "include": [".astro/types.d.ts", "**/*"], "exclude": ["dist"] }
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/**/*.test.ts'] } });
```

```json
// vercel.json  (only lives on this branch – main has none, so production is unaffected)
{ "framework": "astro", "buildCommand": "npm run build", "outputDirectory": "dist", "installCommand": "npm install" }
```

- [ ] **Step 5: Temporary home page and build check**

```astro
---
// src/pages/index.astro (replaced in Task 12)
---
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>DXB Deals – Preview</title></head><body>Preview scaffold</body></html>
```

Run: `npm run build`
Expected: build finishes, `dist/index.html` exists.

- [ ] **Step 6: Verify Astro 7 APIs used later exist**

Run: `node -e "import('astro/zod').then(m=>console.log(typeof m.z)); import('astro/loaders').then(m=>console.log(typeof m.glob))"`
Expected: `object` and `function`. If either differs, read `node_modules/astro/CHANGELOG.md` for the v7 names and adjust Task 3/4 imports accordingly.

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts vercel.json src/pages/index.astro docs/superpowers
git commit -m "chore: scaffold Astro project for design preview"
```

---

### Task 2: Pure deal logic `src/lib/deals.ts` (TDD)

**Files:**
- Create: `src/lib/deals.ts`
- Test: `tests/deals.test.ts`

**Interfaces:**
- Produces (exact):
  ```ts
  export type Category = 'restaurant'|'cafe'|'salon-beauty'|'nightlife'|'fitness-leisure'|'retail'|'services';
  export interface ClientDeal { id: string; slug: string; title: string; area: string; category: Category;
    price: number; priceType: 'asking'|'key-money'; annualRent: number|null; size: number|null;
    status: 'available'|'reserved'|'sold'; distress: boolean; originalPrice: number|null; featured: boolean;
    publishedAt: string; img: { sm: string; md: string; lg: string } | null; }
  export const CATEGORIES: { key: Category; label: string; icon: string }[];
  export function categoryLabel(c: Category): string;
  export function legacyCategory(title: string, legacy: string): Category;
  export function fmtMoney(n: number|null): string;          // 350000→"350K", 1200000→"1.2M", 10000000→"10M", null→"—"
  export function fmtSize(n: number|null): string;           // 29900→"29,900 sqft", null→"—"
  export function discountPct(d: Pick<ClientDeal,'price'|'originalPrice'>): number|null;
  export function norm(s: string): string;                   // lower-case, accents stripped, trimmed, single spaces
  export interface ParsedQuery { words: string[]; maxPrice: number|null }
  export function parseQuery(q: string): ParsedQuery;        // "under 1M" / "under 500k" / "below 2m"
  export type Filter = 'all'|'distress'|Category;
  export function matchDeal(d: ClientDeal, q: string, f: Filter): boolean;
  export type SortKey = 'newest'|'price-asc'|'price-desc'|'size-desc';
  export function sortDeals(list: ClientDeal[], key: SortKey): ClientDeal[];   // returns new array; nulls last for size
  export function countBy(list: ClientDeal[], f: Filter): number;
  export function waLink(d: Pick<ClientDeal,'id'|'title'|'area'>): string;
  export const WA_GENERAL: string; export const WA_SELL: string; export const TEL: string;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// tests/deals.test.ts
import { describe, it, expect } from 'vitest';
import { fmtMoney, fmtSize, norm, parseQuery, matchDeal, sortDeals, countBy, waLink, discountPct, legacyCategory, type ClientDeal } from '../src/lib/deals';

const base: ClientDeal = { id: 'DXB000', slug: 'x', title: 'X', area: 'Dubai', category: 'restaurant', price: 1, priceType: 'key-money',
  annualRent: null, size: null, status: 'available', distress: false, originalPrice: null, featured: false, publishedAt: '2026-01-01', img: null };
const d = (o: Partial<ClientDeal>): ClientDeal => ({ ...base, ...o });
const cafe = d({ id: 'DXB023', title: 'Café', area: 'Dubai Creek Harbour', category: 'cafe', price: 800000, publishedAt: '2026-06-23' });
const burger = d({ id: 'DXB011', title: 'Burger Restaurant', area: 'Jumeirah', price: 350000, distress: true, originalPrice: 900000, size: 400, publishedAt: '2026-06-11' });
const club = d({ id: 'DXB005', title: 'Nightclub', area: 'DIFC', category: 'nightlife', price: 6000000, size: 17200, publishedAt: '2026-06-05' });

describe('fmtMoney / fmtSize', () => {
  it('formats K and M', () => {
    expect(fmtMoney(350000)).toBe('350K');
    expect(fmtMoney(1200000)).toBe('1.2M');
    expect(fmtMoney(10000000)).toBe('10M');
    expect(fmtMoney(6800000)).toBe('6.8M');
    expect(fmtMoney(null)).toBe('—');
  });
  it('formats size', () => {
    expect(fmtSize(29900)).toBe('29,900 sqft');
    expect(fmtSize(null)).toBe('—');
  });
});

describe('search', () => {
  it('normalises accents, case and spaces', () => {
    expect(norm('  CAFÉ   Creek ')).toBe('cafe creek');
  });
  it('parses price limits', () => {
    expect(parseQuery('under 1M')).toEqual({ words: [], maxPrice: 1000000 });
    expect(parseQuery('restaurant under 500k')).toEqual({ words: ['restaurant'], maxPrice: 500000 });
    expect(parseQuery('below 2.5m jumeirah')).toEqual({ words: ['jumeirah'], maxPrice: 2500000 });
  });
  it('matches accent-insensitive, multi-word, id and category label', () => {
    expect(matchDeal(cafe, 'cafe', 'all')).toBe(true);
    expect(matchDeal(cafe, '  CAFE ', 'all')).toBe(true);
    expect(matchDeal(burger, 'restaurant  jumeirah', 'all')).toBe(true);
    expect(matchDeal(burger, 'restaurant difc', 'all')).toBe(false);
    expect(matchDeal(burger, 'dxb011', 'all')).toBe(true);
    expect(matchDeal(club, 'nightlife', 'all')).toBe(true);
  });
  it('applies filters and price limit', () => {
    expect(matchDeal(burger, '', 'distress')).toBe(true);
    expect(matchDeal(club, '', 'distress')).toBe(false);
    expect(matchDeal(club, '', 'nightlife')).toBe(true);
    expect(matchDeal(club, 'under 1m', 'all')).toBe(false);
    expect(matchDeal(burger, 'under 1m', 'all')).toBe(true);
  });
});

describe('sort / count', () => {
  it('sorts without mutating, nulls last for size', () => {
    const list = [cafe, burger, club];
    expect(sortDeals(list, 'price-asc').map(x => x.id)).toEqual(['DXB011', 'DXB023', 'DXB005']);
    expect(sortDeals(list, 'price-desc')[0].id).toBe('DXB005');
    expect(sortDeals(list, 'size-desc').map(x => x.id)).toEqual(['DXB005', 'DXB011', 'DXB023']);
    expect(sortDeals(list, 'newest')[0].id).toBe('DXB023');
    expect(list[0].id).toBe('DXB023');
  });
  it('counts by filter', () => {
    expect(countBy([cafe, burger, club], 'all')).toBe(3);
    expect(countBy([cafe, burger, club], 'distress')).toBe(1);
  });
});

describe('links and misc', () => {
  it('builds WhatsApp link', () => {
    expect(waLink(burger)).toBe('https://wa.me/971503186047?text=' +
      encodeURIComponent('Hello Tolga, I am interested in DXB011 (Burger Restaurant – Jumeirah). Please send me more information.'));
  });
  it('discount', () => {
    expect(discountPct(burger)).toBe(61);
    expect(discountPct(club)).toBeNull();
  });
  it('maps legacy categories', () => {
    expect(legacyCategory('Café', 'other')).toBe('cafe');
    expect(legacyCategory('Derma Clinic', 'other')).toBe('salon-beauty');
    expect(legacyCategory('Padel Court', 'other')).toBe('fitness-leisure');
    expect(legacyCategory('Entertainment Centre', 'other')).toBe('fitness-leisure');
    expect(legacyCategory('Florist', 'other')).toBe('retail');
    expect(legacyCategory('Limousine Company', 'other')).toBe('services');
    expect(legacyCategory('Club', 'nightclub')).toBe('nightlife');
    expect(legacyCategory('Fitness Studio', 'gym')).toBe('fitness-leisure');
    expect(legacyCategory('Barber Shop', 'salon')).toBe('salon-beauty');
    expect(legacyCategory('Restaurant', 'restaurant')).toBe('restaurant');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL – cannot resolve `../src/lib/deals`.

- [ ] **Step 3: Implement `src/lib/deals.ts`**

```ts
export type Category = 'restaurant' | 'cafe' | 'salon-beauty' | 'nightlife' | 'fitness-leisure' | 'retail' | 'services';
export interface ClientDeal {
  id: string; slug: string; title: string; area: string; category: Category;
  price: number; priceType: 'asking' | 'key-money'; annualRent: number | null; size: number | null;
  status: 'available' | 'reserved' | 'sold'; distress: boolean; originalPrice: number | null; featured: boolean;
  publishedAt: string; img: { sm: string; md: string; lg: string } | null;
}

export const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: 'restaurant', label: 'Restaurants', icon: '🍽' },
  { key: 'cafe', label: 'Cafés', icon: '☕' },
  { key: 'salon-beauty', label: 'Salon & Beauty', icon: '💈' },
  { key: 'nightlife', label: 'Nightlife', icon: '🌙' },
  { key: 'fitness-leisure', label: 'Fitness & Leisure', icon: '🎾' },
  { key: 'retail', label: 'Retail', icon: '🛍' },
  { key: 'services', label: 'Services', icon: '🏢' },
];
export function categoryLabel(c: Category): string {
  return CATEGORIES.find(x => x.key === c)?.label ?? c;
}

export function legacyCategory(title: string, legacy: string): Category {
  if (legacy === 'restaurant') return 'restaurant';
  if (legacy === 'salon' || /clinic/i.test(title)) return 'salon-beauty';
  if (legacy === 'nightclub') return 'nightlife';
  if (legacy === 'gym' || /padel|entertainment/i.test(title)) return 'fitness-leisure';
  if (/caf/i.test(title)) return 'cafe';
  if (/retail|florist/i.test(title)) return 'retail';
  return 'services';
}

export function fmtMoney(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e6) return (Math.round(n / 1e5) / 10).toString().replace(/\.0$/, '') + 'M';
  return Math.round(n / 1e3) + 'K';
}
export function fmtSize(n: number | null): string {
  return n == null ? '—' : n.toLocaleString('en-US') + ' sqft';
}
export function discountPct(d: { price: number; originalPrice: number | null }): number | null {
  if (!d.originalPrice || d.originalPrice <= d.price) return null;
  return Math.round((1 - d.price / d.originalPrice) * 100);
}

export function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

export interface ParsedQuery { words: string[]; maxPrice: number | null }
export function parseQuery(q: string): ParsedQuery {
  let s = norm(q);
  let maxPrice: number | null = null;
  const m = s.match(/(?:under|below|max|<)\s*([\d.]+)\s*(m|k)?\b/);
  if (m) {
    const n = parseFloat(m[1]);
    maxPrice = m[2] === 'k' ? n * 1e3 : m[2] === 'm' ? n * 1e6 : n;
    s = s.replace(m[0], ' ');
  }
  return { words: s.split(' ').filter(Boolean), maxPrice };
}

export type Filter = 'all' | 'distress' | Category;
function haystack(d: ClientDeal): string {
  return norm([d.title, d.area, d.id, d.category, categoryLabel(d.category)].join(' '));
}
export function matchDeal(d: ClientDeal, q: string, f: Filter): boolean {
  if (f === 'distress' && !d.distress) return false;
  if (f !== 'all' && f !== 'distress' && d.category !== f) return false;
  const p = parseQuery(q);
  if (p.maxPrice != null && d.price > p.maxPrice) return false;
  const h = haystack(d);
  return p.words.every(w => h.includes(w) || h.includes(w.replace(/s$/, '')));
}

export type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'size-desc';
export function sortDeals(list: ClientDeal[], key: SortKey): ClientDeal[] {
  const a = list.slice();
  if (key === 'price-asc') return a.sort((x, y) => x.price - y.price);
  if (key === 'price-desc') return a.sort((x, y) => y.price - x.price);
  if (key === 'size-desc') return a.sort((x, y) => (y.size ?? -1) - (x.size ?? -1));
  return a.sort((x, y) => y.publishedAt.localeCompare(x.publishedAt) || y.id.localeCompare(x.id));
}
export function countBy(list: ClientDeal[], f: Filter): number {
  return list.filter(d => matchDeal(d, '', f)).length;
}

const PHONE = '971503186047';
export const TEL = 'tel:+' + PHONE;
export const WA_GENERAL = `https://wa.me/${PHONE}?text=` + encodeURIComponent('Hello Tolga, I found you on dxb-deals.com.');
export const WA_SELL = `https://wa.me/${PHONE}?text=` + encodeURIComponent('Hello Tolga, I would like to discuss selling my business confidentially.');
export function waLink(d: { id: string; title: string; area: string }): string {
  return `https://wa.me/${PHONE}?text=` + encodeURIComponent(`Hello Tolga, I am interested in ${d.id} (${d.title} – ${d.area}). Please send me more information.`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests in `tests/deals.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/deals.ts tests/deals.test.ts
git commit -m "feat: shared deal logic (format, search, sort, links) with tests"
```

---

### Task 3: Content schema + migration of the 26 listings

**Files:**
- Create: `src/content.config.ts`, `scripts/migrate-listings.mjs`, `src/content/listings/**` (generated), `public/brand/logo.png`, `public/brand/tolga.png`
- Delete (after migration): root `index.html`, `listings.html`, `sell.html`, `contact.html`, `listings.json`, `hero.jpg`, `dxb-logo.png`, `images/` (all remain in git history)

**Interfaces:**
- Consumes: `legacyCategory` from Task 2 (re-implemented inline in the .mjs script because it runs in plain Node – keep the same rules).
- Produces: collection `listings` with entries whose `data` matches the schema below; folder name = `<id lowercase>-<slug>`; flyer at `<folder>/flyer.png`.

- [ ] **Step 1: Write `src/content.config.ts`**

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const listings = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/listings' }),
  schema: z.object({
    id: z.string().regex(/^DXB\d{3,}$/),
    title: z.string().min(2),
    area: z.string().min(2),
    category: z.enum(['restaurant', 'cafe', 'salon-beauty', 'nightlife', 'fitness-leisure', 'retail', 'services']),
    price: z.number().positive(),
    priceType: z.enum(['asking', 'key-money']).default('key-money'),
    annualRent: z.number().positive().nullable().default(null),
    size: z.number().positive().nullable().default(null),
    status: z.enum(['available', 'reserved', 'sold']).default('available'),
    distress: z.boolean().default(false),
    originalPrice: z.number().positive().nullable().default(null),
    featured: z.boolean().default(false),
    publishedAt: z.coerce.date(),
    highlights: z.array(z.object({ icon: z.string(), label: z.string() })).default([]),   // filled in Phase 2
  }),
});
export const collections = { listings };
```

- [ ] **Step 2: Write `scripts/migrate-listings.mjs`**

```js
// One-off: converts the legacy listings.json + images/listings/*.png into content folders.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const legacy = JSON.parse(fs.readFileSync(path.join(root, 'listings.json'), 'utf8'));
const outDir = path.join(root, 'src/content/listings');

function category(title, legacyCat) {
  if (legacyCat === 'restaurant') return 'restaurant';
  if (legacyCat === 'salon' || /clinic/i.test(title)) return 'salon-beauty';
  if (legacyCat === 'nightclub') return 'nightlife';
  if (legacyCat === 'gym' || /padel|entertainment/i.test(title)) return 'fitness-leisure';
  if (/caf/i.test(title)) return 'cafe';
  if (/retail|florist/i.test(title)) return 'retail';
  return 'services';
}
const slugify = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const yaml = v => (v === null ? 'null' : typeof v === 'string' ? JSON.stringify(v) : String(v));

legacy.forEach((x, i) => {
  const [title, areaFromTitle] = x.title.split(' – ');
  const area = areaFromTitle || x.area;
  const folder = path.join(outDir, `${x.id.toLowerCase()}-${slugify(title + ' ' + area)}`);
  fs.mkdirSync(folder, { recursive: true });
  const day = String(1 + i).padStart(2, '0');        // keeps original order: higher ID = newer
  const fm = {
    id: x.id, title, area, category: category(title, x.category), price: x.keyMoney, priceType: 'key-money',
    annualRent: x.annualRent ?? null, size: x.sizeMin ?? null, status: x.status || 'available',
    distress: !!x.distress, originalPrice: x.originalPrice ?? null, featured: false, publishedAt: `2026-06-${day}`,
  };
  const body = Object.entries(fm).map(([k, v]) => `${k}: ${yaml(v)}`).join('\n');
  fs.writeFileSync(path.join(folder, 'index.md'), `---\n${body}\n---\n`);
  const src = path.join(root, x.image);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(folder, 'flyer.png'));
  else console.warn('missing image for', x.id, x.image);
});
console.log('migrated', legacy.length, 'listings');
```

- [ ] **Step 3: Run migration and move brand assets**

Run:
```bash
npm run migrate
mkdir -p public/brand && cp dxb-logo.png public/brand/logo.png && cp images/tolga-keklik.png public/brand/tolga.png
ls src/content/listings | wc -l
```
Expected: `migrated 26 listings`, no "missing image" warnings, `26`.

- [ ] **Step 4: Check one generated file**

Run: `cat src/content/listings/dxb011-*/index.md`
Expected:
```
---
id: "DXB011"
title: "Burger Restaurant"
area: "Jumeirah"
category: "restaurant"
price: 350000
priceType: "key-money"
annualRent: 230000
size: 400
status: "available"
distress: true
originalPrice: 900000
featured: false
publishedAt: "2026-06-11"
---
```

- [ ] **Step 5: Remove legacy site files and build**

```bash
git rm -q index.html listings.html sell.html contact.html listings.json hero.jpg dxb-logo.png
git rm -rq images
npm run build
```
Expected: build passes (schema validates all 26 entries).

- [ ] **Step 6: Commit**

```bash
git add src/content.config.ts scripts/migrate-listings.mjs src/content public/brand
git commit -m "feat: listings as content collection (26 migrated) with schema"
```

---

### Task 4: Build-time loader + base layout

**Files:**
- Create: `src/lib/load.ts`, `src/components/BaseLayout.astro`, `src/designs/shared.css`

**Interfaces:**
- Consumes: collection `listings` (Task 3), `ClientDeal` (Task 2).
- Produces:
  - `export async function loadDeals(): Promise<ClientDeal[]>` – newest first, WebP URLs in `img.sm` (480w), `img.md` (800w), `img.lg` (1200w); `img: null` if no flyer.
  - `<BaseLayout title deals bodyClass?>` – renders `<script type="application/json" id="deals-data">` with `JSON.stringify(deals)` and a default `<slot />`.

- [ ] **Step 1: Write `src/lib/load.ts`**

```ts
import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { sortDeals, type ClientDeal } from './deals';

const flyers = import.meta.glob<{ default: ImageMetadata }>('/src/content/listings/*/flyer.{png,jpg,jpeg,webp}', { eager: true });

function flyerFor(folder: string): ImageMetadata | null {
  const key = Object.keys(flyers).find(k => k.split('/').at(-2) === folder);
  return key ? flyers[key].default : null;
}

async function webp(src: ImageMetadata, width: number): Promise<string> {
  const r = await getImage({ src, width, format: 'webp', quality: 72 });
  return r.src;
}

export async function loadDeals(): Promise<ClientDeal[]> {
  const entries = await getCollection('listings');
  const deals = await Promise.all(entries.map(async (e): Promise<ClientDeal> => {
    const folder = e.id.split('/')[0];
    const f = flyerFor(folder);
    return {
      id: e.data.id, slug: folder, title: e.data.title, area: e.data.area, category: e.data.category,
      price: e.data.price, priceType: e.data.priceType, annualRent: e.data.annualRent, size: e.data.size,
      status: e.data.status, distress: e.data.distress, originalPrice: e.data.originalPrice, featured: e.data.featured,
      publishedAt: e.data.publishedAt.toISOString().slice(0, 10),
      img: f ? { sm: await webp(f, 480), md: await webp(f, 800), lg: await webp(f, 1200) } : null,
    };
  }));
  return sortDeals(deals, 'newest');
}
```

Note: if `e.id` in Astro 7 is the folder name without `/index`, `split('/')[0]` still returns the folder. Verify in Step 4.

- [ ] **Step 2: Write `src/designs/shared.css`**

```css
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0}
a{color:inherit;text-decoration:none}
button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
img{display:block;max-width:100%}
:root{--petrol:#12303A;--gold:#F2C94C;--wa:#25D366;--red:#E5484D}
.flyer-card{position:relative;overflow:hidden;background:#0d2329}
.flyer-card .blur{position:absolute;inset:-20px;background-size:cover;background-position:center;filter:blur(22px) brightness(.75);transform:scale(1.1)}
.flyer-card img{position:relative;width:100%;height:100%;object-fit:contain}
.empty{padding:48px 20px;text-align:center;opacity:.8}
.empty button{margin-top:12px;padding:10px 16px;border-radius:999px;background:var(--gold);color:#0B1F25;font-weight:700}
/* quick view */
.qv-dim{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:900;opacity:0;pointer-events:none;transition:opacity .25s}
.qv-dim.on{opacity:1;pointer-events:auto}
.qv{position:fixed;z-index:901;background:#fff;color:#12303A;box-shadow:0 30px 80px rgba(0,0,0,.4);transition:transform .3s cubic-bezier(.2,.8,.2,1),opacity .3s}
.qv.desk{left:50%;top:50%;width:min(860px,92vw);max-height:88vh;border-radius:24px;display:grid;grid-template-columns:320px 1fr;overflow:hidden;transform:translate(-50%,-46%);opacity:0;pointer-events:none}
.qv.desk.on{transform:translate(-50%,-50%);opacity:1;pointer-events:auto}
.qv.mob{left:0;right:0;bottom:0;border-radius:24px 24px 0 0;padding:10px 18px calc(env(safe-area-inset-bottom) + 18px);transform:translateY(105%)}
.qv.mob.on{transform:none}
.qv .grab{width:40px;height:5px;border-radius:5px;background:#d5dde0;margin:0 auto 12px}
.qv .media{min-height:420px}
.qv .body{padding:24px;overflow:auto}
.qv h3{margin:0;font-size:24px}
.qv .loc{color:#5b7178;font-size:14px;margin:4px 0 16px}
.qv .kv{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
.qv .kv div{background:#f2f5f6;border-radius:14px;padding:12px}
.qv .kv small{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#5b7178}
.qv .kv b{font-size:18px}
.qv .acts{display:flex;gap:8px}
.qv .acts a,.qv .acts button{flex:1;text-align:center;padding:13px;border-radius:14px;font-weight:700;background:#eef2f3}
.qv .acts .wa{background:var(--wa);color:#fff;flex:2}
.qv .x{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.06);font-size:16px}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
```

- [ ] **Step 3: Write `src/components/BaseLayout.astro`**

```astro
---
import '../designs/shared.css';
import type { ClientDeal } from '../lib/deals';
interface Props { title: string; deals?: ClientDeal[]; bodyClass?: string; fonts?: string }
const { title, deals = [], bodyClass = '', fonts } = Astro.props;
---
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <meta name="robots" content="noindex" />
  <title>{title}</title>
  <link rel="icon" href="/brand/logo.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  {fonts && <link rel="stylesheet" href={fonts} />}
  <script type="application/json" id="deals-data" set:html={JSON.stringify(deals)} />
</head>
<body class={bodyClass}>
  <slot />
</body>
</html>
```

- [ ] **Step 4: Smoke test the loader via the temporary page**

Replace `src/pages/index.astro` body with:
```astro
---
import BaseLayout from '../components/BaseLayout.astro';
import { loadDeals } from '../lib/load';
const deals = await loadDeals();
---
<BaseLayout title="DXB Deals – Preview" deals={deals}><p>{deals.length} deals · first {deals[0].id} · {deals[0].slug}</p></BaseLayout>
```
Run: `npm run build && node -e "const h=require('fs').readFileSync('dist/index.html','utf8');const j=JSON.parse(h.match(/id=\"deals-data\">(.*?)<\/script>/s)[1]);console.log(j.length,j[0].id,j[0].slug,j[0].img.md)" && ls -la dist/_astro/*.webp | sort -k5 -n | tail -1`
Expected: `26 DXB026 dxb026-entertainment-centre-dubai /_astro/…webp`; the largest WebP ≤ 250 KB. If larger, lower `quality` to 64 in `load.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/load.ts src/components/BaseLayout.astro src/designs/shared.css src/pages/index.astro
git commit -m "feat: build-time deal loader with WebP flyers and base layout"
```

---

### Task 5: Shared browser modules (data, saved, quick view, dom)

**Files:**
- Create: `src/lib/client/dom.ts`, `src/lib/client/data.ts`, `src/lib/client/saved.ts`, `src/lib/client/quickview.ts`
- Test: `tests/saved.test.ts`

**Interfaces:**
- Consumes: `ClientDeal`, `fmtMoney`, `fmtSize`, `waLink`, `TEL`, `categoryLabel`, `discountPct` (Task 2).
- Produces:
  ```ts
  // dom.ts
  export function esc(s: unknown): string;                       // HTML-escape
  export function $(sel: string, root?: ParentNode): HTMLElement;  // throws if missing
  export function $$(sel: string, root?: ParentNode): HTMLElement[];
  export function flyerHTML(d: ClientDeal, size?: 'sm'|'md'|'lg', alt?: string): string; // .flyer-card markup or category tile
  // data.ts
  export function readDeals(): ClientDeal[];
  // saved.ts
  export interface SavedStore { has(id: string): boolean; toggle(id: string): boolean; list(): string[]; clear(): void; onChange(fn: () => void): void }
  export function createSavedStore(storage?: Pick<Storage,'getItem'|'setItem'> | null): SavedStore;
  // quickview.ts
  export function openQuickView(d: ClientDeal, opts: { mobile: boolean; saved: SavedStore }): void;
  export function closeQuickView(): void;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// tests/saved.test.ts
import { describe, it, expect } from 'vitest';
import { createSavedStore } from '../src/lib/client/saved';

function memStorage() { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; }

describe('saved store', () => {
  it('toggles and persists', () => {
    const s = memStorage();
    const a = createSavedStore(s);
    expect(a.toggle('DXB011')).toBe(true);
    expect(a.has('DXB011')).toBe(true);
    expect(createSavedStore(s).list()).toEqual(['DXB011']);
    expect(a.toggle('DXB011')).toBe(false);
    expect(a.list()).toEqual([]);
  });
  it('works when storage throws (private mode)', () => {
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    const a = createSavedStore(broken);
    expect(() => a.toggle('DXB001')).not.toThrow();
    expect(a.has('DXB001')).toBe(true);
  });
  it('ignores corrupt JSON', () => {
    const s = memStorage(); s.setItem('dxb:saved', '{oops');
    expect(createSavedStore(s).list()).toEqual([]);
  });
  it('notifies listeners', () => {
    const a = createSavedStore(memStorage()); let n = 0; a.onChange(() => n++);
    a.toggle('X'); a.clear(); expect(n).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/saved.test.ts`
Expected: FAIL – module not found.

- [ ] **Step 3: Implement the four modules**

```ts
// src/lib/client/saved.ts
const KEY = 'dxb:saved';
export interface SavedStore { has(id: string): boolean; toggle(id: string): boolean; list(): string[]; clear(): void; onChange(fn: () => void): void }
export function createSavedStore(storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null): SavedStore {
  let ids: string[] = [];
  try { const raw = storage?.getItem(KEY); const v = raw ? JSON.parse(raw) : []; ids = Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { ids = []; }
  const fns: (() => void)[] = [];
  const save = () => { try { storage?.setItem(KEY, JSON.stringify(ids)); } catch { /* session only */ } fns.forEach(f => f()); };
  return {
    has: id => ids.includes(id),
    toggle(id) { const on = !ids.includes(id); ids = on ? [id, ...ids] : ids.filter(x => x !== id); save(); return on; },
    list: () => ids.slice(),
    clear() { ids = []; save(); },
    onChange: fn => { fns.push(fn); },
  };
}
```

```ts
// src/lib/client/dom.ts
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
```

```ts
// src/lib/client/data.ts
import type { ClientDeal } from '../deals';
export function readDeals(): ClientDeal[] {
  const el = document.getElementById('deals-data');
  try { return el ? JSON.parse(el.textContent || '[]') : []; } catch { return []; }
}
```

```ts
// src/lib/client/quickview.ts
import { fmtMoney, fmtSize, waLink, TEL, categoryLabel, discountPct, type ClientDeal } from '../deals';
import { esc, flyerHTML } from './dom';
import type { SavedStore } from './saved';

let dim: HTMLElement | null = null, box: HTMLElement | null = null;
function ensure() {
  if (dim && box) return;
  dim = document.createElement('div'); dim.className = 'qv-dim'; dim.addEventListener('click', closeQuickView);
  box = document.createElement('section'); box.className = 'qv'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  document.body.append(dim, box);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeQuickView(); });
}
export function openQuickView(d: ClientDeal, opts: { mobile: boolean; saved: SavedStore }): void {
  ensure();
  const pct = discountPct(d);
  box!.className = 'qv ' + (opts.mobile ? 'mob' : 'desk');
  box!.innerHTML = `${opts.mobile ? '<div class="grab"></div>' : `<div class="media">${flyerHTML(d, 'md')}</div>`}
    <div class="body"><button class="x" aria-label="Close">✕</button>
      <h3>${esc(d.title)}</h3><div class="loc">📍 ${esc(d.area)}, Dubai · ${esc(categoryLabel(d.category))} · ${esc(d.id)}</div>
      <div class="kv">
        <div><small>${d.priceType === 'asking' ? 'Asking price' : 'Key money'}</small><b>AED ${fmtMoney(d.price)}</b>${pct ? `<small style="color:#E5484D;text-transform:none">−${pct}% · was AED ${fmtMoney(d.originalPrice)}</small>` : ''}</div>
        <div><small>Rent / year</small><b>${d.annualRent ? 'AED ' + fmtMoney(d.annualRent) : '—'}</b></div>
        <div><small>Size</small><b>${fmtSize(d.size)}</b></div>
        <div><small>Status</small><b>${esc(d.status[0].toUpperCase() + d.status.slice(1))}</b></div>
      </div>
      <div class="acts"><a class="wa" href="${waLink(d)}" target="_blank" rel="noopener">WhatsApp Tolga</a><a href="${TEL}">Call</a>
        <button data-qv-save>${opts.saved.has(d.id) ? 'Saved ✓' : 'Save'}</button></div>
    </div>`;
  box!.querySelector('.x')!.addEventListener('click', closeQuickView);
  box!.querySelector('[data-qv-save]')!.addEventListener('click', e => {
    const on = opts.saved.toggle(d.id); (e.currentTarget as HTMLElement).textContent = on ? 'Saved ✓' : 'Save';
  });
  requestAnimationFrame(() => { dim!.classList.add('on'); box!.classList.add('on'); });
}
export function closeQuickView(): void { dim?.classList.remove('on'); box?.classList.remove('on'); }
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests PASS (deals + saved).

- [ ] **Step 5: Commit**

```bash
git add src/lib/client tests/saved.test.ts
git commit -m "feat: shared browser modules (saved store, quick view, dom helpers)"
```

---

### Task 6: Design registry, view selection, design route, preview bar

**Files:**
- Create: `src/designs/registry.ts`, `src/lib/client/view.ts`, `src/components/PreviewBar.astro`, `src/pages/design-[n].astro`
- Test: `tests/view.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // registry.ts
  export interface DesignInfo { n: 1|2|3|4|5; slug: string; name: string; blurb: string; accent: string; fonts: string }
  export const DESIGNS: DesignInfo[];
  // view.ts
  export type View = 'desktop'|'mobile';
  export function pickView(search: string, width: number): View;   // ?view= wins, else width < 768 → mobile
  export function applyView(): View;                                // sets <html data-view>, returns it
  ```
  - Every design page renders `<div data-version="desktop">…Desktop…</div><div data-version="mobile">…Mobile…</div>`; CSS `html[data-view=desktop] [data-version=mobile], html[data-view=mobile] [data-version=desktop]{display:none}`.
  - Each design script exports `initDesktop(root: HTMLElement): void` and `initMobile(root: HTMLElement): void`; the route calls only the one for the active view.

- [ ] **Step 1: Write the failing test**

```ts
// tests/view.test.ts
import { describe, it, expect } from 'vitest';
import { pickView } from '../src/lib/client/view';
describe('pickView', () => {
  it('uses width by default', () => {
    expect(pickView('', 390)).toBe('mobile');
    expect(pickView('', 1440)).toBe('desktop');
    expect(pickView('', 767)).toBe('mobile');
    expect(pickView('', 768)).toBe('desktop');
  });
  it('query param wins', () => {
    expect(pickView('?view=mobile', 1440)).toBe('mobile');
    expect(pickView('?view=desktop&x=1', 390)).toBe('desktop');
    expect(pickView('?view=banana', 390)).toBe('mobile');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/view.test.ts`
Expected: FAIL – module not found.

- [ ] **Step 3: Implement `view.ts` and `registry.ts`**

```ts
// src/lib/client/view.ts
export type View = 'desktop' | 'mobile';
export function pickView(search: string, width: number): View {
  const v = new URLSearchParams(search).get('view');
  if (v === 'mobile' || v === 'desktop') return v;
  return width < 768 ? 'mobile' : 'desktop';
}
export function applyView(): View {
  const v = pickView(location.search, window.innerWidth);
  document.documentElement.dataset.view = v;
  return v;
}
```

```ts
// src/designs/registry.ts
export interface DesignInfo { n: 1 | 2 | 3 | 4 | 5; slug: string; name: string; blurb: string; accent: string; fonts: string }
const G = 'https://fonts.googleapis.com/css2?display=swap&family=';
export const DESIGNS: DesignInfo[] = [
  { n: 1, slug: 'marketplace', name: 'Modern Marketplace', blurb: 'Bright and clear — search & filters first, every number on the card.', accent: '#12303A', fonts: G + 'Plus+Jakarta+Sans:wght@400;500;600;700;800' },
  { n: 2, slug: 'search-first', name: 'Search First', blurb: 'One big search with live suggestions, category stories and a sortable overview.', accent: '#1B4652', fonts: G + 'Inter:wght@400;500;600;700&family=Sora:wght@600;700;800' },
  { n: 3, slug: 'feed-all', name: 'Feed ⇄ All', blurb: 'Dark app style — switch between a swipe feed and the full grid.', accent: '#07090A', fonts: G + 'Inter:wght@400;500;600;700&family=Sora:wght@700;800' },
  { n: 4, slug: 'tiktok', name: 'TikTok Feed', blurb: 'One deal per screen — swipe, save, ask on WhatsApp.', accent: '#000000', fonts: G + 'Plus+Jakarta+Sans:wght@400;600;700;800' },
  { n: 5, slug: 'split', name: 'Split Scroll', blurb: 'Elegant: big numbers on one side, flyers scrolling on the other.', accent: '#F6F2EA', fonts: G + 'Bodoni+Moda:ital,wght@0,500;1,500&family=DM+Sans:wght@400;500;700' },
];
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Write `src/components/PreviewBar.astro`**

Behaviour:
- Hidden entirely when `?frame=1`.
- Desktop: fixed pill bottom-centre (`bottom:16px`), glass background `rgba(10,20,24,.78)` + `backdrop-filter:blur(16px)`, white text, `z-index:1000`. Content: label "Preview", links `1`–`5` (active = gold background), current design name, a divider, toggle `🖥 PC` / `📱 Handy`, collapse button `–` (collapsed state = small round button "⚙" bottom-right; state stored in `sessionStorage` key `dxb:bar`).
- Clicking a number navigates to `/design-N/` preserving `view` param only if it was set explicitly.
- `📱 Handy` on desktop opens an overlay: dark backdrop, centred iPhone frame (410×864, radius 62, notch) containing `<iframe src="/design-N/?view=mobile&frame=1">`, close button top-right, Escape closes.
- Mobile view: a 40px round button top-right (`top: calc(env(safe-area-inset-top) + 64px)`) that opens a bottom sheet with the same 1–5 list (full names) and link "Open desktop version" (`?view=desktop`).

```astro
---
import { DESIGNS } from '../designs/registry';
interface Props { current: number }
const { current } = Astro.props;
---
<div id="pv" data-current={current}>
  <nav class="pv-bar" aria-label="Design preview">
    <span class="pv-lbl">Preview</span>
    {DESIGNS.map(d => <a class:list={['pv-n', { on: d.n === current }]} href={`/design-${d.n}/`} title={d.name}>{d.n}</a>)}
    <span class="pv-name">{DESIGNS[current - 1].name}</span>
    <span class="pv-sep"></span>
    <button class="pv-dev on" data-dev="desktop">🖥 PC</button>
    <button class="pv-dev" data-dev="mobile">📱 Handy</button>
    <button class="pv-min" aria-label="Minimise">–</button>
  </nav>
  <button class="pv-fab" aria-label="Open preview bar">⚙</button>
  <button class="pv-mbtn" aria-label="Choose design">◐</button>
  <div class="pv-sheet" role="dialog" aria-label="Choose design">
    <div class="pv-grab"></div>
    {DESIGNS.map(d => <a class:list={['pv-row', { on: d.n === current }]} href={`/design-${d.n}/`}><b>{d.n}</b><span>{d.name}</span></a>)}
    <a class="pv-row pv-desk" href="?view=desktop">🖥 Open desktop version</a>
  </div>
  <div class="pv-frame" role="dialog" aria-label="Mobile preview"><button class="pv-x" aria-label="Close">✕</button><div class="pv-phone"><iframe title="Mobile preview" loading="lazy"></iframe></div></div>
</div>
<style is:global>
  #pv{font-family:system-ui,-apple-system,Segoe UI,sans-serif}
  html[data-frame] #pv{display:none}
  .pv-bar{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:1000;display:flex;align-items:center;gap:6px;padding:6px 8px 6px 14px;border-radius:999px;background:rgba(10,20,24,.78);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#fff;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.14)}
  .pv-lbl{opacity:.6;margin-right:4px}
  .pv-n{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff}
  .pv-n:hover{background:rgba(255,255,255,.12)}
  .pv-n.on{background:#F2C94C;color:#0B1F25}
  .pv-name{font-weight:600;margin:0 6px}
  .pv-sep{width:1px;height:20px;background:rgba(255,255,255,.2)}
  .pv-dev{padding:6px 10px;border-radius:999px;color:#fff;font-size:13px}
  .pv-dev.on{background:rgba(255,255,255,.16)}
  .pv-min{width:28px;height:28px;border-radius:50%;color:#fff}
  .pv-fab{position:fixed;right:16px;bottom:16px;z-index:1000;width:44px;height:44px;border-radius:50%;background:rgba(10,20,24,.8);color:#fff;display:none}
  #pv.min .pv-bar{display:none} #pv.min .pv-fab{display:block}
  .pv-mbtn,.pv-sheet{display:none}
  html[data-view=mobile] .pv-bar,html[data-view=mobile] .pv-fab{display:none!important}
  html[data-view=mobile] .pv-mbtn{display:flex;position:fixed;right:12px;top:calc(env(safe-area-inset-top) + 66px);z-index:1000;width:38px;height:38px;border-radius:50%;align-items:center;justify-content:center;background:rgba(10,20,24,.7);backdrop-filter:blur(12px);color:#F2C94C;border:1px solid rgba(255,255,255,.2);font-size:18px}
  html[data-view=mobile] .pv-sheet{display:block;position:fixed;left:0;right:0;bottom:0;z-index:1001;background:#0f1b1f;color:#fff;border-radius:22px 22px 0 0;padding:10px 14px calc(env(safe-area-inset-bottom) + 14px);transform:translateY(105%);transition:transform .3s}
  html[data-view=mobile] #pv.sheet .pv-sheet{transform:none}
  .pv-grab{width:40px;height:5px;border-radius:5px;background:rgba(255,255,255,.3);margin:0 auto 10px}
  .pv-row{display:flex;gap:12px;align-items:center;padding:12px;border-radius:12px;color:#fff;font-size:15px}
  .pv-row b{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center}
  .pv-row.on b{background:#F2C94C;color:#0B1F25}
  .pv-desk{opacity:.75;font-size:14px}
  .pv-frame{position:fixed;inset:0;z-index:1002;background:rgba(5,10,12,.82);display:none;align-items:center;justify-content:center}
  #pv.frame .pv-frame{display:flex}
  .pv-phone{width:410px;height:864px;max-height:94vh;aspect-ratio:410/864;border-radius:62px;padding:10px;background:linear-gradient(145deg,#2a3a40,#0c1417);box-shadow:0 50px 100px rgba(0,0,0,.6)}
  .pv-phone iframe{width:100%;height:100%;border:0;border-radius:52px;background:#000}
  .pv-x{position:absolute;top:18px;right:22px;width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:18px}
</style>
<script>
  const root = document.getElementById('pv')!;
  const n = root.dataset.current;
  if (new URLSearchParams(location.search).get('frame') === '1') document.documentElement.dataset.frame = '1';
  try { if (sessionStorage.getItem('dxb:bar') === 'min') root.classList.add('min'); } catch {}
  const setMin = (m: boolean) => { root.classList.toggle('min', m); try { sessionStorage.setItem('dxb:bar', m ? 'min' : 'open'); } catch {} };
  root.querySelector('.pv-min')!.addEventListener('click', () => setMin(true));
  root.querySelector('.pv-fab')!.addEventListener('click', () => setMin(false));
  const frame = root.querySelector('.pv-frame')!, iframe = frame.querySelector('iframe')!;
  const devBtns = [...root.querySelectorAll<HTMLButtonElement>('.pv-dev')];
  const closeFrame = () => { root.classList.remove('frame'); iframe.src = 'about:blank'; devBtns.forEach(b => b.classList.toggle('on', b.dataset.dev === 'desktop')); };
  devBtns.forEach(b => b.addEventListener('click', () => {
    if (b.dataset.dev === 'mobile') { iframe.src = `/design-${n}/?view=mobile&frame=1`; root.classList.add('frame'); devBtns.forEach(x => x.classList.toggle('on', x === b)); }
    else closeFrame();
  }));
  frame.querySelector('.pv-x')!.addEventListener('click', closeFrame);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeFrame(); root.classList.remove('sheet'); } });
  root.querySelector('.pv-mbtn')!.addEventListener('click', () => root.classList.toggle('sheet'));
</script>
```

- [ ] **Step 6: Write `src/pages/design-[n].astro`** (initially with a stub for designs not yet built)

```astro
---
import BaseLayout from '../components/BaseLayout.astro';
import PreviewBar from '../components/PreviewBar.astro';
import { DESIGNS } from '../designs/registry';
import { loadDeals } from '../lib/load';
import D1Desktop from '../designs/d1-marketplace/Desktop.astro';
import D1Mobile from '../designs/d1-marketplace/Mobile.astro';
// Tasks 8–11 add: import D2Desktop/D2Mobile … D5Desktop/D5Mobile

export function getStaticPaths() { return DESIGNS.map(d => ({ params: { n: String(d.n) } })); }
const n = Number(Astro.params.n);
const info = DESIGNS[n - 1];
const deals = await loadDeals();
const parts: Record<number, [any, any]> = { 1: [D1Desktop, D1Mobile] };
const [Desk, Mob] = parts[n] ?? [null, null];
---
<BaseLayout title={`DXB Deals – Design ${n}: ${info.name}`} deals={deals} fonts={info.fonts} bodyClass={`design-${n}`}>
  <script is:inline>(function(){var q=new URLSearchParams(location.search).get('view');var v=q==='mobile'||q==='desktop'?q:(innerWidth<768?'mobile':'desktop');document.documentElement.dataset.view=v;})();</script>
  <style is:global>html[data-view=desktop] [data-version=mobile],html[data-view=mobile] [data-version=desktop]{display:none!important}</style>
  {Desk ? <>
    <div data-version="desktop"><Desk deals={deals} /></div>
    <div data-version="mobile"><Mob deals={deals} /></div>
  </> : <p style="padding:40px;font-family:sans-serif">Design {n} – coming next.</p>}
  <PreviewBar current={n} />
</BaseLayout>
```

The inline script runs before paint so the wrong version never flashes. Each design's own `<script>` (inside its Desktop/Mobile component) must start with:
```ts
const view = document.documentElement.dataset.view;
if (view === 'desktop') initDesktop(document.querySelector<HTMLElement>('[data-version=desktop]')!);
```
(and the mirror in Mobile.astro), so only the active version's code runs.

For this step, create minimal placeholders so the build passes:
```astro
---
// src/designs/d1-marketplace/Desktop.astro  (replaced in Task 7)
---
<section style="padding:40px">Design 1 desktop</section>
```
```astro
---
// src/designs/d1-marketplace/Mobile.astro  (replaced in Task 7)
---
<section style="padding:20px">Design 1 mobile</section>
```

- [ ] **Step 7: Verify routing and view switching**

Run: `npm run build && ls dist/design-1 dist/design-5`
Expected: `index.html` in both.
Start dev server (`npm run dev`, via the browser preview tooling) and check:
- `/design-1/` at 1440 px shows "Design 1 desktop" + preview bar; at 390 px shows "Design 1 mobile" + round ◐ button.
- `/design-1/?view=mobile` at 1440 px shows mobile; `?frame=1` hides the bar.
- Click "📱 Handy" → phone frame with mobile version; Escape closes.
- No horizontal scrollbar at 390 px (`document.documentElement.scrollWidth === innerWidth`).

- [ ] **Step 8: Commit**

```bash
git add src/designs/registry.ts src/lib/client/view.ts tests/view.test.ts src/components/PreviewBar.astro src/pages/design-[n].astro src/designs/d1-marketplace
git commit -m "feat: design routes, view selection and preview bar"
```

---

## Design tasks (7–11): common contract

Every design task follows the same contract. Repeat it for each design; the design-specific sections below say *what* to build.

**Component contract**
- `Desktop.astro` / `Mobile.astro` accept `deals: ClientDeal[]` for server-rendered first paint (first 8 items) and include `<script>` importing `./dN.ts` and calling `initDesktop` / `initMobile` guarded by `document.documentElement.dataset.view` (see Task 6).
- `dN.css` holds all styles, every selector prefixed `.dN-` to avoid clashes; imported by both components (`import './dN.css'`).
- `dN.ts` exports `initDesktop(root: HTMLElement): void` and `initMobile(root: HTMLElement): void`; it uses `readDeals()`, `createSavedStore()`, `openQuickView()`, `matchDeal`, `sortDeals`, `countBy`, `fmtMoney`, `fmtSize`, `waLink`, `CATEGORIES`, `flyerHTML`, `esc` – no duplicated logic. All interpolated strings go through `esc()`.
- Card images always use `flyerHTML(d, 'sm'|'md')` (full flyer on blurred background – never `background-size:cover` crops of the flyer).
- Numbers shown in copy (“26 opportunities”, category counts, “from AED 199K”) are computed: `deals.length`, `countBy(deals, f)`, `fmtMoney(Math.min(...deals.map(d=>d.price)))`.
- Every “Contact”/“Ask” button is an `<a href={waLink(d)} target="_blank" rel="noopener">`.
- Header WhatsApp button uses `WA_GENERAL`; any “Sell” entry uses `WA_SELL`.

**Acceptance checklist (run in the browser for each design, desktop 1440×900 AND mobile 390×844)**
1. Type `cafe` → exactly 2 results (DXB002, DXB023). Type `restaurant jumeirah` → DXB011 only. Type `under 1m` → 8 results.
2. Search `zzz` → empty state with "Reset filters"; clicking it restores all 26.
3. "All" view/overview shows 26 businesses; each category chip shows the right count and filters correctly; "Distress" shows 3 (DXB011, DXB013, DXB025).
4. Sort price ↑ → first is DXB014 (199K); price ↓ → first is DXB009 (32M); size ↓ → first DXB001, deals without size at the end.
5. Save a deal → visible in Saved view; reload page → still saved; un-save works.
6. Quick view opens with price, rent, size, status; DXB008 shows "—" for rent and size (never `null`/`NaN`).
7. WhatsApp link of DXB011 = `https://wa.me/971503186047?text=Hello%20Tolga%2C%20I%20am%20interested%20in%20DXB011%20(Burger%20Restaurant%20%E2%80%93%20Jumeirah).%20Please%20send%20me%20more%20information.`
8. No console errors; no horizontal scroll on mobile; flyer text is never cut off on cards.
9. With "Reduce motion" emulated, page still works without animations.
10. Take one desktop and one mobile screenshot as proof.

Verification commands (browser tooling, run in page):
```js
// counts helper for steps 1–3 (adapt selectors per design)
document.querySelectorAll('[data-deal-id]').length
```
Every rendered deal card/row/slide carries `data-deal-id="DXB…"` so this works in all designs.

---

### Task 7: Design 1 – Modern Marketplace

**Files:**
- Create/replace: `src/designs/d1-marketplace/Desktop.astro`, `Mobile.astro`, `d1.css`, `d1.ts`
- Port from: `.superpowers/mockups/alte-entwuerfe/design-alle-a-h.html` section **C** (classes `.dc-*`: nav, hero with `mark` highlight, search bar, chips, cards with `.dc-kv`).

**Desktop (`initDesktop`)**
- Sticky white nav: logo `/brand/logo.png` (height 32), links "Buy a business · Distress deals · Sell · About" (Sell → `WA_SELL`; About → `#about` anchor at page bottom with Tolga photo + short text), green "WhatsApp" button (`WA_GENERAL`).
- Hero (centred, gradient `#F4F8F9→#fff`): H1 "Buy a <mark>running business</mark> in Dubai", subline "{N} verified opportunities — restaurants, cafés, salons and more. Fully fitted, ready to operate."
- Search bar with 3 real controls + button: free-text input ("Business, area or ID"), `<select>` Category (All + CATEGORIES), `<select>` Budget (Any, Under 500K, Under 1M, Under 2M, Under 5M, 5M+), button "Show {count} results" updating live. Area is part of free text.
- Chips row: All · 🔥 Distress · each category with count; chip and Category select stay in sync.
- Results section: header "{count} opportunities" + sort select (Newest / Price ↑ / Price ↓ / Size ↓) + "Saved ({n})" toggle. Grid `repeat(auto-fill,minmax(280px,1fr))`, gap 22.
- Card: flyer (`flyerHTML(d,'sm')`, height 220), badges top-left (Distress −X% red, category white), ♡ save button top-right, body: ID, title, 📍 area, 3-col kv (Price, Rent/yr, Size). Click card → `openQuickView`; hover lift (`translateY(-4px)` + shadow).
- Empty state with "Reset filters".
- Footer: About Tolga block (photo `/brand/tolga.png`, "Tolga Keklik – Business broker in Dubai", WhatsApp + Instagram `https://www.instagram.com/dxb.deals/`), © 2026 DXB DEALS.

**Mobile (`initMobile`)**
- Top: sticky white header with logo + WhatsApp icon button; below it a sticky rounded search pill (input + filter icon button).
- Horizontally scrollable chips (All, Distress, categories with counts).
- Result count + sort button (opens bottom sheet with 4 sort options + Budget options).
- Cards stacked full-width: flyer height 300, same badges, ♡ save, title/area, kv row; tap → quick view (bottom sheet).
- Sticky bottom bar: "Saved ({n})" and green "WhatsApp Tolga".

- [ ] **Step 1:** Write `d1.css` (port `.dc-*` styles → `.d1-*`; add mobile styles listed above).
- [ ] **Step 2:** Write `Desktop.astro` (static markup: nav, hero, search, empty `[data-chips]`, `[data-grid]` with first 8 cards server-rendered, footer) and `Mobile.astro`.
- [ ] **Step 3:** Write `d1.ts` with `initDesktop`/`initMobile`: state `{ q, filter, budget, sort, savedOnly }`, `render()` rebuilding chips/count/grid from `readDeals()` via `matchDeal` (budget converted to a query suffix, e.g. `under 1m`; "5M+" filters `price >= 5e6` in code), event delegation on the grid for save (`[data-save]`) and quick view (`[data-deal-id]`).
- [ ] **Step 4:** Register in `design-[n].astro` (`1: [D1Desktop, D1Mobile]` already present) and run `npm run build`.
- [ ] **Step 5:** Run the acceptance checklist on desktop and mobile; fix until all 10 points pass.
- [ ] **Step 6:** Commit: `git add src/designs/d1-marketplace && git commit -m "feat(design-1): modern marketplace desktop + mobile"`

---

### Task 8: Design 2 – Search First

**Files:**
- Create: `src/designs/d2-search/{Desktop.astro,Mobile.astro,d2.css,d2.ts}`; Modify: `src/pages/design-[n].astro` (import + `2: [D2Desktop, D2Mobile]`)
- Port from: `feed-suche-uebersicht.html` section **S3** (`.s3-*`: nav, gradient hero, search with suggestions dropdown `.s3-sug`, quick pills, story rings, table/grid toggle, sortable `<th>`), plus its shared fullscreen vertical feed `.vf`.

**Desktop**
- Nav (logo, Buy/Sell/About, green WhatsApp).
- Hero (petrol gradient): H1 "Find a <span>business</span> to buy in Dubai", subline "{N} opportunities · …", big search (input + gold "Search" button). Typing shows up to 5 suggestions (flyer thumb, title, area · category · ID, price) + "See all {k} results ↓". Arrow keys move through suggestions, Enter opens the highlighted one in the feed overlay, Escape closes the dropdown.
- Quick pills: 🔥 Distress deals · Under AED 1M · Restaurants · Business Bay · Jumeirah (each sets query/filter and scrolls to overview).
- "Stories": ring per category with ≥1 deal (thumb = newest flyer of that category, label + count); click → fullscreen vertical snap feed (`.d2-vf`) of that category with caption, WhatsApp, Save, close ✕, Escape.
- Overview "All businesses ({N})": filter chips, toggle "☰ Table | ▦ Grid". Table columns ID, Business (thumb + name + DISTRESS badge), Area, Category, Price, Rent/yr, Size, ▶; clicking a header sorts (toggle asc/desc, ▲/▼ shown); row click → feed overlay starting at that deal. Grid: cards with flyer + price + title.
- Saved: "♡ Saved ({n})" pill next to filter chips shows only saved deals.

**Mobile**
- Header: logo + WhatsApp icon. Sticky search field directly below (full width, 16px font to avoid iOS zoom). Focusing it opens a fullscreen search sheet with live result list (thumb, title, area, price) and chips.
- Story rings row (horizontal scroll) → fullscreen feed.
- Overview as **list** (not table): rows with thumb 56×56, title, area · category, price right, distress badge; sort via button → bottom sheet (Newest, Price ↑, Price ↓, Size ↓); filter chips horizontal.
- Bottom sticky "Saved ({n})" + "WhatsApp".

- [ ] **Step 1:** Write `d2.css` (`.d2-*`, port S3 + `.vf`, mobile styles).
- [ ] **Step 2:** Write `Desktop.astro` and `Mobile.astro` (server-render hero, rings, first 10 table rows / list rows).
- [ ] **Step 3:** Write `d2.ts`: shared `openFeed(list, startIndex, title, mobile)`, suggestion keyboard handling, table sort state `{ key: 'id'|'title'|'area'|'category'|'price'|'annualRent'|'size', dir: 1|-1 }` with nulls last regardless of direction.
- [ ] **Step 4:** Register route parts, `npm run build`.
- [ ] **Step 5:** Acceptance checklist desktop + mobile, plus: ↓/Enter in suggestions opens the right deal; table sorted by Rent ↑ puts deals without rent last.
- [ ] **Step 6:** Commit: `git commit -am "feat(design-2): search first desktop + mobile"` after `git add src/designs/d2-search`.

---

### Task 9: Design 3 – Feed ⇄ All

**Files:**
- Create: `src/designs/d3-feed-all/{Desktop.astro,Mobile.astro,d3.css,d3.ts}`; Modify: `design-[n].astro` (`3: [D3Desktop, D3Mobile]`)
- Port from: `feed-suche-uebersicht.html` section **S1** (`.s1-*`).

**Desktop**
- Full-viewport dark app (`#07090A`), height `100vh`, no page scroll.
- Top bar: logo, search input (focus ring gold, `⌘K`/`Ctrl+K` focuses it, `/` too), segmented toggle "▶ Feed | ▦ All {count}".
- Chips row with counts (All, Distress, categories).
- Feed mode: 3 columns `1fr 360px 1fr`: left = info of current deal (ID · category · DISTRESS, title, 📍 area, kv Price/Rent/Size with "was …" for distress, buttons WhatsApp + Save + Details), centre = snap-scrolling feed (each slide: blurred flyer background + full flyer contained), counter "k / n"; right = "Up next" (next 5, click scrolls). Keyboard ↑/↓ moves. Info panel animates on change.
- All mode: grid `auto-fill,minmax(200px,1fr)` with sort select; card click → switch to Feed at that deal.
- Search and chips filter both modes; choosing a chip while in All stays in All.

**Mobile**
- Fullscreen snap feed (100dvh slides): blurred background + flyer, bottom glass caption (ID, title, area, price chips), right glass rail (Contact = WhatsApp, Save, Share via `navigator.share` fallback copy link, Details = quick view).
- Top glass bar: search field (tap → fullscreen search sheet with results list) + segmented "Feed | All".
- All = 2-column grid sheet with chips + sort; tap → back to feed at that deal.
- Double-tap on a slide saves (bookmark animation).

- [ ] **Step 1:** Write `d3.css` (`.d3-*`).
- [ ] **Step 2:** Write `Desktop.astro` / `Mobile.astro` (server-render first 3 slides + first 12 grid cards).
- [ ] **Step 3:** Write `d3.ts` (feed index from `scrollTop/clientHeight`, rebuild feed on filter change, keep current deal if still in results).
- [ ] **Step 4:** Register, build.
- [ ] **Step 5:** Acceptance checklist + keyboard ↑/↓ and Ctrl+K on desktop; double-tap save on mobile.
- [ ] **Step 6:** Commit `feat(design-3): feed ⇄ all desktop + mobile`.

---

### Task 10: Design 4 – TikTok Feed

**Files:**
- Create: `src/designs/d4-tiktok/{Desktop.astro,Mobile.astro,d4.css,d4.ts}`; Modify: `design-[n].astro` (`4: [D4Desktop, D4Mobile]`)
- Port from: `feed-varianten-tiktok.html` section **T1** (`.t1-*`) for desktop; `.superpowers/mockups/instagram-tiktok/mobile.html` (glass header, rail, tab bar, sheets, details sheet) for mobile.

**Desktop**
- Black page, no scroll; ambient background = blurred current flyer (cross-fade between two layers on deal change).
- Left column: logo, H1 "Swipe through <span>Dubai's</span> best deals.", short copy, keyboard hint (Scroll / ↑ ↓), search field (results appear as a dropdown list; choosing one jumps the feed), "▦ All deals" button.
- Centre: phone-width feed (380×~700, radius 26) with tabs on top "🔥 Distress | For you | New" (New = 8 newest), slides with flyer, right rail inside (avatar Tolga, ♥ save + count, WhatsApp "Ask", Share, Details), caption bottom.
- Right column: "Deal k / n", filter list (For you, Distress, categories with counts).
- "All deals" opens an overlay grid (4 columns, chips, sort); click → jump to deal, close overlay.

**Mobile** (port of the glass mobile mockup)
- Fullscreen feed; glass header (logo, "For you | 🔥 Distress | New", search icon); glass rail (Tolga avatar, Contact, Save, Share, Details); glass caption; swipe hint on first slide.
- Glass tab bar: Home · Search · ＋ Sell (gold, `WA_SELL`) · All deals · Saved (count badge).
- Search sheet, All sheet (2-col grid + chips + sort), Saved sheet, Details bottom sheet = shared quick view.

- [ ] **Step 1:** Write `d4.css` (`.d4-*`).
- [ ] **Step 2:** Write `Desktop.astro` / `Mobile.astro`.
- [ ] **Step 3:** Write `d4.ts`.
- [ ] **Step 4:** Register, build.
- [ ] **Step 5:** Acceptance checklist + tabs "Distress"/"New" on both versions; ambient background changes when the deal changes.
- [ ] **Step 6:** Commit `feat(design-4): tiktok feed desktop + mobile`.

---

### Task 11: Design 5 – Split Scroll

**Files:**
- Create: `src/designs/d5-split/{Desktop.astro,Mobile.astro,d5.css,d5.ts}`; Modify: `design-[n].astro` (`5: [D5Desktop, D5Mobile]`)
- Port from: `feed-varianten-tiktok.html` section **T2** (`.t2-*`).

**Desktop**
- Cream `#F6F2EA`, petrol text, Bodoni Moda headings, DM Sans body; 100vh, two columns.
- Left (sticky): logo + top-right mini nav (search icon, "All", WhatsApp). Big counter "04 / 26", category · DISTRESS, title (52px serif), 📍 area · ID, kv row Price / Rent / Size (+ "was AED …"), buttons "Details" (quick view) and "Ask on WhatsApp", "♡ Save"; progress dots (one per deal, max 26, active = wide bar). Text animates on change.
- Right: snap-scroll column of flyers (300×533, rotated ±3° and dimmed when not active, active upright).
- Search: icon opens an inline search field at top-left; results reduce the scroll list; "All" opens a full-width overlay grid (chips + sort); click → jump.

**Mobile**
- Vertical snap scroll of flyer cards (≈ 78vh each, centred).
- Fixed bottom info panel (cream glass, radius 24) with: counter, title, area, Price / Rent / Size big, buttons WhatsApp + Save + Details; content updates with animation when the active card changes.
- Top bar: logo, search icon (→ search sheet with list), "All" (→ 2-col grid sheet).

- [ ] **Step 1:** Write `d5.css` (`.d5-*`).
- [ ] **Step 2:** Write `Desktop.astro` / `Mobile.astro`.
- [ ] **Step 3:** Write `d5.ts` (active index via `IntersectionObserver` with threshold 0.6 on each flyer).
- [ ] **Step 4:** Register, build.
- [ ] **Step 5:** Acceptance checklist + counter shows correct "k / n" after filtering.
- [ ] **Step 6:** Commit `feat(design-5): split scroll desktop + mobile`.

---

### Task 12: Landing page `/` with the 5 designs

**Files:**
- Replace: `src/pages/index.astro`
- Create: `public/previews/d{1..5}-desktop.webp`, `public/previews/d{1..5}-mobile.webp`

**Interfaces:**
- Consumes: `DESIGNS` (Task 6), `loadDeals` (Task 4).

- [ ] **Step 1: Capture screenshots** – with the dev server running, open each `/design-N/` at 1440×900 and at 390×844 (`?view=mobile`), take a screenshot, save as WebP (≤ 120 KB) to `public/previews/` (use `npx sharp-cli` or a small node script with `sharp` to convert/resize: desktop 960 px wide, mobile 390 px wide).

- [ ] **Step 2: Write `src/pages/index.astro`**

```astro
---
import BaseLayout from '../components/BaseLayout.astro';
import { DESIGNS } from '../designs/registry';
import { loadDeals } from '../lib/load';
const deals = await loadDeals();
---
<BaseLayout title="DXB Deals – Design preview" fonts="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap">
  <main class="lp">
    <header><img src="/brand/logo.png" alt="DXB Deals" height="36" /><p>Design preview · {deals.length} live listings · not public</p></header>
    <h1>Choose a design</h1>
    <p class="sub">Each design works on desktop and phone. Open it on your phone to see the mobile version, or use “📱 Handy” in the preview bar.</p>
    <div class="grid">
      {DESIGNS.map(d => (
        <a class="card" href={`/design-${d.n}/`}>
          <div class="shots">
            <img class="desk" src={`/previews/d${d.n}-desktop.webp`} alt={`${d.name} desktop`} loading="lazy" />
            <img class="mob" src={`/previews/d${d.n}-mobile.webp`} alt={`${d.name} mobile`} loading="lazy" />
          </div>
          <div class="meta"><b>{d.n}</b><div><h2>{d.name}</h2><p>{d.blurb}</p></div></div>
        </a>
      ))}
    </div>
  </main>
</BaseLayout>
<style>
  .lp{min-height:100vh;background:radial-gradient(900px 600px at 80% 0%,#1B4A55,#06161B 70%);color:#F4F7F8;font-family:'Plus Jakarta Sans',sans-serif;padding:32px 24px 60px}
  header{display:flex;align-items:center;gap:14px;opacity:.9}
  header p{margin:0;font-size:13px;opacity:.7}
  h1{font-size:40px;margin:40px 0 8px;font-weight:800}
  .sub{opacity:.7;max-width:640px;margin:0 0 28px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px}
  .card{display:block;border-radius:22px;overflow:hidden;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);transition:transform .25s,border-color .25s}
  .card:hover{transform:translateY(-4px);border-color:#F2C94C}
  .shots{position:relative;aspect-ratio:16/10;overflow:hidden;background:#0b1f25}
  .desk{width:100%;height:100%;object-fit:cover;object-position:top}
  .mob{position:absolute;right:14px;bottom:-30px;width:28%;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.5);border:3px solid #0b1f25}
  .meta{display:flex;gap:14px;padding:16px 18px}
  .meta b{flex:0 0 36px;height:36px;border-radius:50%;background:#F2C94C;color:#0B1F25;display:flex;align-items:center;justify-content:center}
  .meta h2{margin:0;font-size:18px}
  .meta p{margin:4px 0 0;font-size:13px;opacity:.7}
  @media (max-width:600px){h1{font-size:30px}}
</style>
```

- [ ] **Step 3: Build and check**

Run: `npm run build`
Expected: passes; `dist/index.html` lists 5 cards; images exist in `dist/previews/`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro public/previews
git commit -m "feat: landing page listing the 5 designs"
```

---

### Task 13: Final verification and Vercel preview

**Files:** none (deployment + checks)

- [ ] **Step 1: Full local verification**

Run: `npm test && npm run build`
Expected: all tests pass, build succeeds, no warnings about missing images.
Then run the acceptance checklist once more on all 5 designs (desktop + mobile) and the landing page; collect screenshots.

- [ ] **Step 2: Ask Güney before pushing** (first push of branch `redesign` creates a Vercel preview build; production is untouched). Show: number of commits, what will be online, that `main`/dxb-deals.com are unchanged.

- [ ] **Step 3: Push** (only after OK)

```bash
git push -u origin redesign
```

- [ ] **Step 4: Check the Vercel preview build**

Use the Vercel tools: `list_deployments` for project `prj_FjVKAcQBzScJpUXduHpG9ZUJp4sY` (team `team_4p7vMAAZqD8OJkcZSwR6UMNg`), branch `redesign`; wait for state `READY`; if `ERROR`, read the build logs and fix. Confirm the production deployment for `main` is unchanged (same latest production deployment id `dpl_GzhLjg1h8b7ZwF5HTUnweHGnTBrA` as before).

- [ ] **Step 5: Check public access**

Open the branch preview URL (`https://dxb-deals-v2-git-redesign-og-s-projects31.vercel.app/` or the URL reported by Vercel) in a logged-out context (`curl -sI <url>` → expect `200`, not `401`/redirect to vercel.com/login). If protected: present both options (disable preview protection for the project vs. create a shareable bypass link) to Güney and act only on his choice.

- [ ] **Step 6: Hand over**

Send Güney: preview URL, the 5 direct links (`/design-1/` … `/design-5/`), how to view mobile (phone or "📱 Handy"), and the list of what is intentionally not included (Phase 2).
