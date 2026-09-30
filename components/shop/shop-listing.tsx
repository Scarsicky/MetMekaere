import Link from 'next/link';

import { FilterPanel, SortSelect } from '@/components/shop/filter-panel';
import { ProductGrid } from '@/components/shop/product-card';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/section';
import {
  buildFacets,
  filterProducts,
  getActiveProducts,
  getCategories,
  getTierRules,
  priceRange,
} from '@/lib/data/catalog';
import { getShopSettings } from '@/lib/data/settings';
import { formatCents } from '@/lib/money';
import { parseFilters, type SearchParams } from '@/lib/shop/filters';
import type { Category } from '@/types';

/**
 * De productlijst, gedeeld door /webshop en /webshop/[categorie].
 *
 * Filters komen uit de URL en worden op de server toegepast; de bezoeker
 * krijgt dus altijd een volledig ingevulde pagina terug. Dat is meteen wat
 * een zoekmachine ziet.
 */
export async function ShopListing({
  searchParams,
  category,
}: {
  searchParams: SearchParams;
  category?: Category;
}) {
  const [allProducts, categories, tierRules, shopSettings] = await Promise.all([
    getActiveProducts(),
    getCategories(),
    getTierRules(),
    getShopSettings(),
  ]);

  const basePath = category ? `/webshop/${category.slug}` : '/webshop';
  const facetKeys = shopSettings.facets.map((f) => f.key);
  const filters = parseFilters(searchParams, facetKeys, category?.slug);

  // Facetten en prijsbereik gelden binnen de categorie waar je in zit.
  const scope = category ? allProducts.filter((p) => p.categorySlug === category.slug) : allProducts;
  const products = filterProducts(allProducts, filters.query);
  const facets = buildFacets(scope, shopSettings.facets, filters.query);
  const bounds = priceRange(scope);

  const activeTier = tierRules.find((r) => r.active);

  return (
    <>
      {/* Kop van de pagina */}
      <div className="border-b border-sand-300 bg-white">
        <Container className="py-10 md:py-14">
          <nav aria-label="Kruimelpad" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-sand-600">
            <Link href="/" className="hover:text-brand-700">
              Home
            </Link>
            <span aria-hidden>·</span>
            {category ? (
              <>
                <Link href="/webshop" className="hover:text-brand-700">
                  Webshop
                </Link>
                <span aria-hidden>·</span>
                <span className="text-sand-900">{category.name}</span>
              </>
            ) : (
              <span className="text-sand-900">Webshop</span>
            )}
          </nav>

          <h1 className="text-3xl md:text-4xl">{category ? category.name : 'Webshop'}</h1>
          <p className="mt-3 max-w-prose text-lg leading-relaxed text-sand-700">
            {category?.description ??
              'Kaarten om te sturen en kleine dingen om weg te geven. Hoe meer kaarten je meeneemt, hoe voordeliger — ook als je verschillende ontwerpen kiest.'}
          </p>
        </Container>
      </div>

      {/* Staffelvoordeel in één zin, zodat niemand het hoeft uit te rekenen */}
      {activeTier && activeTier.steps.length ? (
        <div className="bg-ochre-100">
          <Container className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3.5 text-sm">
            <span className="font-display font-bold text-ochre-700">{activeTier.name}</span>
            <span className="text-sand-800">
              {activeTier.steps
                .map((step) =>
                  step.unitPriceCents !== undefined
                    ? `${step.minQty}+ voor ${formatCents(step.unitPriceCents)} per stuk`
                    : `${step.minQty}+ met ${step.discountPercent}% korting`,
                )
                .join(' · ')}
            </span>
            {activeTier.description ? (
              <span className="text-sand-600">{activeTier.description}</span>
            ) : null}
          </Container>
        </div>
      ) : null}

      {shopSettings.closed ? (
        <div className="bg-brand-700 text-sand-50">
          <Container className="py-4">
            <p className="font-display font-semibold">
              {shopSettings.closedMessage || 'De shop is tijdelijk gesloten.'}
            </p>
          </Container>
        </div>
      ) : null}

      <Container className="py-8 md:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          {/* Filters: op mobiel ingeklapt, op desktop altijd zichtbaar */}
          <aside className="lg:w-64 lg:shrink-0">
            <details className="group lg:hidden" name="shop-filters">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-sand-300 bg-white px-4 py-3 font-display font-semibold marker:hidden">
                <span>
                  Filters
                  {filters.activeCount > 0 ? (
                    <span className="ml-2 inline-flex min-w-5 justify-center rounded-full bg-brand-700 px-1.5 py-0.5 text-xs text-sand-50 tabular">
                      {filters.activeCount}
                    </span>
                  ) : null}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className="size-5 text-brand-700 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="mt-4 rounded-2xl border border-sand-300 bg-white p-5">
                <FilterPanel
                  basePath={basePath}
                  categories={categories}
                  activeCategory={category?.slug}
                  facets={facets}
                  active={filters}
                  priceBounds={bounds}
                  resultCount={products.length}
                />
              </div>
            </details>

            <div className="hidden lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:block">
              <FilterPanel
                basePath={basePath}
                categories={categories}
                activeCategory={category?.slug}
                facets={facets}
                active={filters}
                priceBounds={bounds}
                resultCount={products.length}
              />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-sand-600" role="status">
                {products.length === 1 ? '1 product' : `${products.length} producten`}
                {filters.search ? ` voor “${filters.search}”` : ''}
              </p>
              <SortSelect value={filters.sort} />
            </div>

            {products.length ? (
              <ProductGrid products={products} tierRules={tierRules} />
            ) : (
              <div className="rounded-2xl border border-dashed border-sand-400 bg-white/60 px-6 py-14 text-center">
                <p className="font-display text-lg font-semibold text-sand-900">
                  Hier staat nog niets dat hierbij past.
                </p>
                <p className="mx-auto mt-2 max-w-md text-sand-600">
                  Probeer een ander filter, of kijk bij alles wat er is.
                </p>
                <ButtonLink href="/webshop" variant="secondary" className="mt-6">
                  Alles bekijken
                </ButtonLink>
              </div>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}
