import type { ProductQuery } from '@/lib/data/catalog';
import { parseMoneyToCents } from '@/lib/money';

/**
 * Filters leven in de URL, niet in de browser.
 *
 * Daardoor is een filterselectie te delen en te bookmarken, werkt de
 * terugknop zoals je verwacht, en kan een zoekmachine een categoriepagina
 * gewoon indexeren. Zonder JavaScript werkt het ook: de filters zitten in een
 * formulier dat met GET verstuurt.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

export const SORT_OPTIONS = [
  { value: 'aanbevolen', label: 'Aanbevolen' },
  { value: 'nieuw', label: 'Nieuwste eerst' },
  { value: 'prijs-op', label: 'Prijs: laag naar hoog' },
  { value: 'prijs-af', label: 'Prijs: hoog naar laag' },
  { value: 'naam', label: 'Naam A–Z' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

/** Vaste parameternamen; al het overige wordt als facet gelezen. */
const RESERVED = new Set(['q', 'sorteer', 'min', 'max', 'voorraad', 'pagina', 'categorie']);

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** 'a,b' of herhaalde parameters worden allebei een lijst. */
function list(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((v) => v.split(','))
    .map((v) => v.trim())
    .filter(Boolean);
}

export interface ParsedFilters {
  query: ProductQuery;
  /** Welke facetwaarden zijn aangevinkt, per sleutel. */
  attributes: Record<string, string[]>;
  search: string;
  sort: SortValue;
  minInput: string;
  maxInput: string;
  inStockOnly: boolean;
  /** Aantal actieve filters, voor het bolletje bij 'Filters' op mobiel. */
  activeCount: number;
}

export function parseFilters(
  params: SearchParams,
  facetKeys: string[],
  categorySlug?: string,
): ParsedFilters {
  const attributes: Record<string, string[]> = {};
  for (const key of facetKeys) {
    if (RESERVED.has(key)) continue;
    const values = list(params[key]);
    if (values.length) attributes[key] = values;
  }

  const search = (first(params.q) ?? '').slice(0, 80);
  const sortRaw = first(params.sorteer);
  const sort = (SORT_OPTIONS.some((o) => o.value === sortRaw) ? sortRaw : 'aanbevolen') as SortValue;

  const minInput = first(params.min) ?? '';
  const maxInput = first(params.max) ?? '';
  const minPriceCents = minInput ? (parseMoneyToCents(minInput) ?? undefined) : undefined;
  const maxPriceCents = maxInput ? (parseMoneyToCents(maxInput) ?? undefined) : undefined;

  const inStockOnly = first(params.voorraad) === '1';

  const activeCount =
    Object.values(attributes).reduce((sum, v) => sum + v.length, 0) +
    (search ? 1 : 0) +
    (minPriceCents !== undefined || maxPriceCents !== undefined ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  return {
    query: {
      categorySlug,
      attributes,
      minPriceCents,
      maxPriceCents,
      inStockOnly,
      search,
      sort,
    },
    attributes,
    search,
    sort,
    minInput,
    maxInput,
    inStockOnly,
    activeCount,
  };
}

/**
 * Bouwt een URL met één facetwaarde aan- of uitgezet. Gebruikt voor de
 * filterlinks, zodat aanklikken ook zonder JavaScript werkt.
 */
export function toggleFacetHref(
  basePath: string,
  params: SearchParams,
  key: string,
  value: string,
): string {
  const search = new URLSearchParams();

  for (const [k, v] of Object.entries(params)) {
    if (k === 'pagina') continue; // bij een nieuw filter weer op pagina 1 beginnen
    const values = Array.isArray(v) ? v : v === undefined ? [] : [v];
    for (const item of values) search.append(k, item);
  }

  const current = list(params[key]);
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];

  search.delete(key);
  if (next.length) search.set(key, next.join(','));

  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Alles wissen, maar de sortering laten staan. */
export function clearFiltersHref(basePath: string, params: SearchParams): string {
  const sort = first(params.sorteer);
  return sort && sort !== 'aanbevolen' ? `${basePath}?sorteer=${sort}` : basePath;
}

export function isFacetActive(params: SearchParams, key: string, value: string): boolean {
  return list(params[key]).includes(value);
}
