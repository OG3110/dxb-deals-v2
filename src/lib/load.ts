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
