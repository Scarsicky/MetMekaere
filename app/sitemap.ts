import type { MetadataRoute } from 'next';

import { getActiveProducts, getCategories } from '@/lib/data/catalog';
import { getHappenings } from '@/lib/data/content';
import { getAdventSettings, isAdventInSeason } from '@/lib/data/settings';
import { absoluteUrl } from '@/lib/seo';

/**
 * De sitemap die Google gebruikt om alles te vinden.
 *
 * Alleen pagina's die echt bestaan en geïndexeerd mogen worden. De winkelwagen,
 * het afrekenen en de bedanktpagina staan er dus niet in — die zijn persoonlijk
 * en hebben in zoekresultaten niets te zoeken.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, happenings, advent] = await Promise.all([
    getActiveProducts(),
    getCategories(),
    getHappenings(),
    getAdventSettings(),
  ]);

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/webshop'), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/fluffy-dialect'), lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: absoluteUrl('/community'), lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: absoluteUrl('/doen-en-beleven'), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: absoluteUrl('/over'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/contact'), lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: absoluteUrl('/verzenden-en-retour'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/algemene-voorwaarden'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl('/privacy'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  if (isAdventInSeason(advent)) {
    staticPages.push({
      url: absoluteUrl('/adventskalender'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    });
  }

  return [
    ...staticPages,
    ...categories.map((category) => ({
      url: absoluteUrl(`/webshop/${category.slug}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: absoluteUrl(`/product/${product.slug}`),
      lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...happenings.map((happening) => ({
      url: absoluteUrl(`/doen-en-beleven/${happening.slug}`),
      lastModified: happening.updatedAt ? new Date(happening.updatedAt) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
