import 'server-only';

import { unstable_cache } from 'next/cache';

/**
 * Cachelabels. Eén plek, zodat een admin-wijziging precies het juiste stuk
 * site ververst en niet meer.
 *
 * We gebruiken bewust het klassieke model (`unstable_cache` + tags) en niet
 * Cache Components: de winkelwagen leest cookies en moet altijd vers zijn,
 * en dit model is daar het makkelijkst mee te combineren.
 *
 * NIET gecached: kortingscodes (het gebruiksaantal loopt op), winkelwagens en
 * orders. Die worden elke keer direct uit Firestore gelezen.
 */
export const TAGS = {
  settings: 'settings',
  products: 'products',
  product: (slug: string) => `product:${slug}`,
  categories: 'categories',
  tiers: 'tiers',
  shipping: 'shipping',
  pages: 'pages',
  page: (slug: string) => `page:${slug}`,
  happenings: 'happenings',
  happening: (slug: string) => `happening:${slug}`,
  dialect: 'dialect',
  activities: 'activities',
} as const;

/** Hoe lang iets mag blijven staan als niemand het actief ververst. */
export const TTL = {
  /** Redactionele inhoud: rustig, wordt bij wijziging toch actief ververst. */
  content: 60 * 60,
  /** Catalogus: korter, want voorraad schuift mee. */
  catalog: 60 * 5,
  /** Instellingen: zelden gewijzigd. */
  settings: 60 * 60,
} as const;

/**
 * Wikkelt een Firestore-lezing in de cache.
 *
 * `keyParts` moet alle argumenten bevatten die het resultaat beïnvloeden,
 * anders krijgen twee verschillende vragen hetzelfde antwoord.
 */
export function cached<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyParts: string[],
  options: { tags: string[]; revalidate?: number },
): (...args: Args) => Promise<Result> {
  return unstable_cache(fn, keyParts, {
    tags: options.tags,
    revalidate: options.revalidate ?? TTL.content,
  });
}
