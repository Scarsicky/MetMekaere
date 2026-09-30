import 'server-only';

import { cached, TAGS, TTL } from '@/lib/data/cache';
import {
  normalizeCategory,
  normalizeDiscountCode,
  normalizeProduct,
  normalizeShippingRate,
  normalizeTierRule,
} from '@/lib/data/normalize';
import { adminDb, isAdminUsable } from '@/lib/firebase/admin';
import type { Category, DiscountCode, Facet, Product, ShippingRate, TierRule } from '@/types';

/**
 * Catalogus lezen.
 *
 * Opzet: alle actieve producten worden in één keer opgehaald en gecached;
 * categorieën, filters en facetten worden daarna in het geheugen bepaald.
 * Dat houdt de filters razendsnel en scheelt een reeks samengestelde
 * Firestore-indexen. Bij duizenden producten is dit het punt om naar
 * per-categorie-queries te gaan — zie `getActiveProducts` hieronder.
 */

const PRODUCTS = 'products';
const CATEGORIES = 'categories';
const TIERS = 'tierRules';
const SHIPPING = 'shippingRates';
const DISCOUNTS = 'discountCodes';

/** Alle verkoopbare producten, gesorteerd zoals de admin ze heeft gezet. */
export const getActiveProducts = cached(
  async (): Promise<Product[]> => {
    if (!isAdminUsable()) return [];
    try {
      const snap = await adminDb().collection(PRODUCTS).where('status', '==', 'active').get();
      return snap.docs
        .map((d) => normalizeProduct(d.id, d.data()))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'nl'));
    } catch (error) {
      console.warn('[catalog] kon producten niet lezen:', error);
      return [];
    }
  },
  ['catalog', 'products', 'active'],
  { tags: [TAGS.products], revalidate: TTL.catalog },
);

/** Inclusief concepten en archief — alleen voor de admin. */
export async function getAllProductsForAdmin(): Promise<Product[]> {
  const snap = await adminDb().collection(PRODUCTS).get();
  return snap.docs
    .map((d) => normalizeProduct(d.id, d.data()))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'nl'));
}

export const getProductBySlug = cached(
  async (slug: string): Promise<Product | null> => {
    if (!isAdminUsable()) return null;
    try {
      const snap = await adminDb().collection(PRODUCTS).where('slug', '==', slug).limit(1).get();
      if (snap.empty) return null;
      const doc = snap.docs[0];
      return normalizeProduct(doc.id, doc.data());
    } catch (error) {
      console.warn(`[catalog] kon product ${slug} niet lezen:`, error);
      return null;
    }
  },
  ['catalog', 'product', 'bySlug'],
  { tags: [TAGS.products], revalidate: TTL.catalog },
);

export async function getProductById(id: string): Promise<Product | null> {
  const snap = await adminDb().collection(PRODUCTS).doc(id).get();
  return snap.exists ? normalizeProduct(snap.id, snap.data() as Record<string, unknown>) : null;
}

/**
 * Producten voor een winkelwagen. Bewust NIET gecached en zonder
 * foutonderdrukking: hier hangen prijs en voorraad aan, dus een mislukte
 * lezing moet zichtbaar falen in plaats van een lege wagen op te leveren.
 *
 * Firestore staat maximaal 30 waarden toe in een `in`-filter, dus we lezen in
 * blokken van 30.
 */
export async function getProductsByIds(ids: string[]): Promise<Map<string, Product>> {
  const unique = [...new Set(ids)].filter(Boolean);
  const out = new Map<string, Product>();
  if (unique.length === 0) return out;

  const db = adminDb();
  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30);
    const refs = chunk.map((id) => db.collection(PRODUCTS).doc(id));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (snap.exists) {
        out.set(snap.id, normalizeProduct(snap.id, snap.data() as Record<string, unknown>));
      }
    }
  }
  return out;
}

export const getCategories = cached(
  async (): Promise<Category[]> => {
    if (!isAdminUsable()) return [];
    try {
      const snap = await adminDb().collection(CATEGORIES).get();
      return snap.docs
        .map((d) => normalizeCategory(d.id, d.data()))
        .filter((c) => c.active)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'nl'));
    } catch (error) {
      console.warn('[catalog] kon categorieën niet lezen:', error);
      return [];
    }
  },
  ['catalog', 'categories'],
  { tags: [TAGS.categories], revalidate: TTL.catalog },
);

export async function getAllCategoriesForAdmin(): Promise<Category[]> {
  const snap = await adminDb().collection(CATEGORIES).get();
  return snap.docs
    .map((d) => normalizeCategory(d.id, d.data()))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'nl'));
}

export const getTierRules = cached(
  async (): Promise<TierRule[]> => {
    if (!isAdminUsable()) return [];
    try {
      const snap = await adminDb().collection(TIERS).get();
      return snap.docs.map((d) => normalizeTierRule(d.id, d.data()));
    } catch (error) {
      console.warn('[catalog] kon staffelregels niet lezen:', error);
      return [];
    }
  },
  ['catalog', 'tierRules'],
  { tags: [TAGS.tiers], revalidate: TTL.catalog },
);

export const getShippingRates = cached(
  async (): Promise<ShippingRate[]> => {
    if (!isAdminUsable()) return [];
    try {
      const snap = await adminDb().collection(SHIPPING).get();
      return snap.docs
        .map((d) => normalizeShippingRate(d.id, d.data()))
        .sort((a, b) => a.sortOrder - b.sortOrder);
    } catch (error) {
      console.warn('[catalog] kon verzendtarieven niet lezen:', error);
      return [];
    }
  },
  ['catalog', 'shippingRates'],
  { tags: [TAGS.shipping], revalidate: TTL.catalog },
);

/**
 * Kortingscode opzoeken. Nooit gecached: `usedCount` loopt op en een code die
 * net is uitgeschakeld moet direct geweigerd worden.
 */
export async function getDiscountCode(code: string): Promise<DiscountCode | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  if (!isAdminUsable()) return null;
  try {
    const snap = await adminDb().collection(DISCOUNTS).doc(normalized).get();
    return snap.exists ? normalizeDiscountCode(snap.id, snap.data() as Record<string, unknown>) : null;
  } catch (error) {
    console.warn(`[catalog] kon kortingscode ${normalized} niet lezen:`, error);
    return null;
  }
}

export async function getAllDiscountCodes(): Promise<DiscountCode[]> {
  const snap = await adminDb().collection(DISCOUNTS).get();
  return snap.docs
    .map((d) => normalizeDiscountCode(d.id, d.data()))
    .sort((a, b) => a.code.localeCompare(b.code, 'nl'));
}

/* ------------------------------------------------------------------ *
 * Filteren en facetten — in het geheugen, op de gecachte lijst
 * ------------------------------------------------------------------ */

export interface ProductQuery {
  categorySlug?: string;
  /** Facetfilters: `{ thema: ['kerst','winter'] }` — binnen een facet OF, tussen facetten EN. */
  attributes?: Record<string, string[]>;
  tags?: string[];
  minPriceCents?: number;
  maxPriceCents?: number;
  /** Alleen wat direct te koop is. */
  inStockOnly?: boolean;
  search?: string;
  sort?: 'aanbevolen' | 'prijs-op' | 'prijs-af' | 'nieuw' | 'naam';
}

export function isPurchasable(product: Product): boolean {
  if (!product.stock.tracked) return true;
  return product.stock.allowBackorder || product.stock.quantity > 0;
}

function matchesSearch(product: Product, needle: string): boolean {
  const haystack = [
    product.title,
    product.subtitle ?? '',
    product.shortDescription ?? '',
    product.description,
    ...product.tags,
    ...Object.values(product.attributes).flat(),
  ]
    .join(' ')
    .toLowerCase();
  return needle
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export function filterProducts(products: Product[], query: ProductQuery): Product[] {
  let out = products;

  if (query.categorySlug) {
    out = out.filter((p) => p.categorySlug === query.categorySlug);
  }

  for (const [key, values] of Object.entries(query.attributes ?? {})) {
    if (!values.length) continue;
    out = out.filter((p) => (p.attributes[key] ?? []).some((v) => values.includes(v)));
  }

  if (query.tags?.length) {
    out = out.filter((p) => query.tags!.some((t) => p.tags.includes(t)));
  }

  if (typeof query.minPriceCents === 'number') {
    out = out.filter((p) => p.priceCents >= query.minPriceCents!);
  }
  if (typeof query.maxPriceCents === 'number') {
    out = out.filter((p) => p.priceCents <= query.maxPriceCents!);
  }

  if (query.inStockOnly) {
    out = out.filter(isPurchasable);
  }

  if (query.search?.trim()) {
    out = out.filter((p) => matchesSearch(p, query.search!.trim()));
  }

  switch (query.sort) {
    case 'prijs-op':
      return [...out].sort((a, b) => a.priceCents - b.priceCents);
    case 'prijs-af':
      return [...out].sort((a, b) => b.priceCents - a.priceCents);
    case 'nieuw':
      return [...out].sort((a, b) => b.createdAt - a.createdAt);
    case 'naam':
      return [...out].sort((a, b) => a.title.localeCompare(b.title, 'nl'));
    default:
      // 'aanbevolen': uitgelicht eerst, daarna de volgorde van de admin.
      return [...out].sort(
        (a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder,
      );
  }
}

export type { Facet };

/**
 * Bouwt de filterblokken uit de producten die er zijn. Zo verschijnt een
 * nieuw thema automatisch als filter zodra de admin het invult — zonder
 * ergens een lijst bij te houden.
 *
 * De aantallen worden geteld op de selectie *zonder* het facet zelf, zodat
 * je na het aanvinken van 'kerst' nog kunt zien hoeveel 'winter' erbij zou
 * komen (gangbaar gedrag in webshopfilters).
 */
export function buildFacets(
  products: Product[],
  facetConfig: { key: string; label: string }[],
  activeQuery: ProductQuery,
): Facet[] {
  const facets: Facet[] = [];

  for (const { key, label } of facetConfig) {
    const withoutThisFacet: ProductQuery = {
      ...activeQuery,
      attributes: Object.fromEntries(
        Object.entries(activeQuery.attributes ?? {}).filter(([k]) => k !== key),
      ),
    };
    const scope = filterProducts(products, withoutThisFacet);

    const counts = new Map<string, number>();
    for (const product of scope) {
      for (const value of product.attributes[key] ?? []) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    if (counts.size === 0) continue;

    facets.push({
      key,
      label,
      values: [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'nl')),
    });
  }

  return facets;
}

/** Het prijsbereik van een set producten, voor de prijsfilter. */
export function priceRange(products: Product[]): { minCents: number; maxCents: number } {
  if (!products.length) return { minCents: 0, maxCents: 0 };
  const prices = products.map((p) => p.priceCents);
  return { minCents: Math.min(...prices), maxCents: Math.max(...prices) };
}
