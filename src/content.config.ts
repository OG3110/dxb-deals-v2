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
