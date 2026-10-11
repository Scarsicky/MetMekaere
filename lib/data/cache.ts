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

/**
 * Hoe lang iets mag blijven staan als niemand het actief ververst.
 *
 * Deze getallen bepalen méér dan alleen onze eigen cache: Next leidt er de
 * `s-maxage` van de pagina uit af, en dat is precies zo lang als het CDN van
 * App Hosting zijn kopie blijft uitserveren. Een `revalidateTag` na een
 * wijziging in het beheer leegt onze cache meteen, maar níet die van het CDN —
 * dat is gedocumenteerd gedrag. De tijd hieronder is dus de maximale tijd
 * tussen 'opgeslagen in het beheer' en 'zichtbaar voor een bezoeker'.
 *
 * Daarom staan ze kort. Een minuut wachten is te doen; een uur niet.
 */
export const TTL = {
  /** Redactionele inhoud. */
  content: 60,
  /** Catalogus: prijzen en voorraad. */
  catalog: 60,
  /** Instellingen: sturen onder meer de header, de footer en 'shop gesloten'. */
  settings: 60,
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
