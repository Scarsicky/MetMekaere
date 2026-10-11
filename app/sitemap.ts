import type { MetadataRoute } from 'next';

import { getActiveProducts, getCategories } from '@/lib/data/catalog';
import { getHappenings, getPageIndex } from '@/lib/data/content';
import { getAdventSettings, isAdventInSeason } from '@/lib/data/settings';
import { isNavVisible } from '@/lib/navigation';
import { absoluteUrl } from '@/lib/seo';

/**
 * De sitemap die Google gebruikt om alles te vinden.
 *
 * Alleen pagina's die echt bestaan en geïndexeerd mogen worden. De winkelwagen,
 * het afrekenen en de bedanktpagina staan er dus niet in — die zijn persoonlijk
 * en hebben in zoekresultaten niets te zoeken.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, happenings, advent, pageIndex] = await Promise.all([
    getActiveProducts(),
    getCategories(),
    getHappenings(),
    getAdventSettings(),
    getPageIndex(),
  ]);

  const now = new Date();

  /*
   * Pagina's die op concept staan horen hier niet in: Google zou ze oppikken
   * en de bezoeker landt dan op een 404. Dezelfde regel als in het menu, zodat
   * er maar één plek is die bepaalt of een pagina publiek is.
   */
  const staticPages: MetadataRoute.Sitemap = (
    [
      { path: '/', changeFrequency: 'weekly', priority: 1 },
      { path: '/webshop', changeFrequency: 'weekly', priority: 0.9 },
      { path: '/fluffy-dialect', changeFrequency: 'monthly', priority: 0.7 },
      { path: '/community', changeFrequency: 'monthly', priority: 0.7 },
      { path: '/doen-en-beleven', changeFrequency: 'weekly', priority: 0.7 },
      { path: '/over', changeFrequency: 'monthly', priority: 0.6 },
      { path: '/contact', changeFrequency: 'yearly', priority: 0.4 },
      { path: '/verzenden-en-retour', changeFrequency: 'yearly', priority: 0.3 },
      { path: '/algemene-voorwaarden', changeFrequency: 'yearly', priority: 0.2 },
      { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
    ] as const
  )
    .filter((entry) => isNavVisible(entry.path, pageIndex))
    .map((entry) => ({
      url: absoluteUrl(entry.path),
      lastModified: now,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    }));

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
