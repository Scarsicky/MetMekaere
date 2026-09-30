import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AddToCartForm } from '@/components/shop/add-to-cart-form';
import { ProductGallery } from '@/components/shop/product-gallery';
import { ProductGrid } from '@/components/shop/product-card';
import { Badge } from '@/components/ui/badge';
import { Container, Section, SectionHeading } from '@/components/ui/section';
import { Prose } from '@/components/ui/prose';
import {
  getActiveProducts,
  getCategories,
  getProductBySlug,
  getTierRules,
  isPurchasable,
} from '@/lib/data/catalog';
import { getGeneralSettings } from '@/lib/data/settings';
import { formatCents } from '@/lib/money';
import {
  breadcrumbJsonLd,
  buildMetadata,
  jsonLdScript,
  metaDescription,
  productJsonLd,
} from '@/lib/seo';
import { MAX_LINE_QTY } from '@/lib/shop/cart';
import { tierPreviewForProduct } from '@/lib/shop/pricing';

/** Alle actieve producten vooraf klaarzetten: snel én goed vindbaar. */
export async function generateStaticParams() {
  const products = await getActiveProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  return buildMetadata({
    title: product.seo?.title ?? product.title,
    description:
      product.seo?.description ??
      metaDescription(product.shortDescription || product.subtitle || product.description),
    path: `/product/${product.slug}`,
    image: product.images[0]?.url,
    imageAlt: product.images[0]?.alt,
    noIndex: product.seo?.noIndex,
    type: 'article',
  });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [product, tierRules, categories, general, allProducts] = await Promise.all([
    getProductBySlug(slug),
    getTierRules(),
    getCategories(),
    getGeneralSettings(),
    getActiveProducts(),
  ]);

  if (!product || product.status !== 'active') notFound();

  const category = categories.find((c) => c.slug === product.categorySlug);
  const rule = product.tierGroup ? tierRules.find((r) => r.group === product.tierGroup && r.active) : null;
  const tiers = tierPreviewForProduct(product, rule);

  const available = isPurchasable(product);
  const maxQty =
    product.stock.tracked && !product.stock.allowBackorder
      ? Math.max(0, product.stock.quantity)
      : MAX_LINE_QTY;
  const lowStock =
    product.stock.tracked &&
    !product.stock.allowBackorder &&
    product.stock.quantity > 0 &&
    product.stock.quantity <= product.stock.lowStockThreshold;

  const onSale = product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents;

  // Verwante producten: eerst dezelfde categorie, aangevuld met de rest.
  const related = allProducts
    .filter((p) => p.id !== product.id)
    .sort(
      (a, b) =>
        Number(b.categorySlug === product.categorySlug) - Number(a.categorySlug === product.categorySlug) ||
        a.sortOrder - b.sortOrder,
    )
    .slice(0, 4);

  const trail = [
    { name: 'Home', href: '/' },
    { name: 'Webshop', href: '/webshop' },
    ...(category ? [{ name: category.name, href: `/webshop/${category.slug}` }] : []),
    { name: product.title, href: `/product/${product.slug}` },
  ];

  return (
    <>
      <Container className="py-8 md:py-12">
        <nav aria-label="Kruimelpad" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-sand-600">
          {trail.map((item, index) => (
            <span key={item.href} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden>·</span> : null}
              {index === trail.length - 1 ? (
                <span className="text-sand-900">{item.name}</span>
              ) : (
                <Link href={item.href} className="hover:text-brand-700">
                  {item.name}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <ProductGallery images={product.images} title={product.title} />

          <div className="flex flex-col">
            <div className="flex flex-wrap gap-2">
              {category ? (
                <Link href={`/webshop/${category.slug}`}>
                  <Badge tone="neutral">{category.name}</Badge>
                </Link>
              ) : null}
              {!available ? <Badge tone="muted">Uitverkocht</Badge> : null}
              {available && onSale ? <Badge tone="brand">Aanbieding</Badge> : null}
              {lowStock ? <Badge tone="ochre">Nog {product.stock.quantity} op voorraad</Badge> : null}
            </div>

            <h1 className="mt-3 text-3xl leading-tight md:text-4xl">{product.title}</h1>
            {product.subtitle ? (
              <p className="mt-2 font-display text-lg text-sand-600">{product.subtitle}</p>
            ) : null}

            <p className="mt-5 flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold text-sand-900 tabular">
                {formatCents(product.priceCents)}
              </span>
              {onSale ? (
                <span className="text-lg text-sand-500 line-through tabular">
                  {formatCents(product.compareAtPriceCents!)}
                </span>
              ) : null}
              <span className="text-sm text-sand-600">incl. btw</span>
            </p>

            {/* Staffeltabel: laat zwart-op-wit zien wat meerdere kaarten opleveren. */}
            {tiers.length ? (
              <div className="mt-6 overflow-hidden rounded-2xl border border-ochre-300 bg-ochre-100">
                <p className="border-b border-ochre-300 px-4 py-2.5 font-display text-sm font-bold text-ochre-700">
                  {rule?.name ?? 'Staffelvoordeel'}
                </p>
                <table className="w-full text-sm">
                  <caption className="sr-only">Prijs per stuk bij grotere aantallen</caption>
                  <tbody>
                    <tr className="border-b border-ochre-200/70">
                      <th scope="row" className="px-4 py-2 text-left font-normal text-sand-700">
                        1–{(tiers[0]?.minQty ?? 2) - 1} stuks
                      </th>
                      <td className="px-4 py-2 text-right font-semibold tabular">
                        {formatCents(product.priceCents)}
                      </td>
                    </tr>
                    {tiers.map((tier) => (
                      <tr key={tier.minQty} className="border-b border-ochre-200/70 last:border-0">
                        <th scope="row" className="px-4 py-2 text-left font-normal text-sand-700">
                          Vanaf {tier.minQty} stuks
                        </th>
                        <td className="px-4 py-2 text-right font-semibold tabular">
                          {formatCents(tier.unitPriceCents)}
                          <span className="ml-2 font-normal text-ochre-700">−{tier.discountPercent}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rule?.description ? (
                  <p className="px-4 pt-2 pb-3 text-sm text-sand-700">{rule.description}</p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-7">
              <AddToCartForm product={product} maxQty={maxQty} soldOut={!available} />
            </div>

            {product.description ? (
              <div className="mt-9 border-t border-sand-300 pt-7">
                <Prose markdown={product.description} />
              </div>
            ) : null}

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-sand-300 pt-6 text-sm">
              {product.weightGrams > 0 ? (
                <div>
                  <dt className="text-sand-600">Verzending</dt>
                  <dd className="font-medium text-sand-900">
                    {product.shippingClass === 'letterbox'
                      ? 'Past door de brievenbus'
                      : product.shippingClass === 'pickup_only'
                        ? 'Alleen ophalen'
                        : 'Als pakket'}
                  </dd>
                </div>
              ) : null}
              {Object.entries(product.attributes).map(([key, values]) => (
                <div key={key}>
                  <dt className="text-sand-600 capitalize">{key}</dt>
                  <dd className="font-medium text-sand-900">{values.join(', ')}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>

      {related.length ? (
        <Section tone="white">
          <Container>
            <SectionHeading title="Misschien ook iets" className="mb-8" />
            <ProductGrid products={related} tierRules={tierRules} />
          </Container>
        </Section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(productJsonLd(product, general))}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbJsonLd(trail))}
      />
    </>
  );
}
