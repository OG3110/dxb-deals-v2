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
const slugify = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
