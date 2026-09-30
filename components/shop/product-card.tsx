import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { isPurchasable } from '@/lib/data/catalog';
import { formatCents } from '@/lib/money';
import { tierPreviewForProduct } from '@/lib/shop/pricing';
import { cn } from '@/lib/utils';
import type { Product, TierRule } from '@/types';

/** Is dit product de afgelopen maand toegevoegd? */
function isNew(product: Product): boolean {
  if (!product.createdAt) return false;
  return Date.now() - product.createdAt < 30 * 24 * 60 * 60 * 1000;
}

export function ProductCard({
  product,
  tierRules = [],
  priority = false,
  className,
}: {
  product: Product;
  tierRules?: TierRule[];
  /** Voor de eerste rij in de lijst: laadt de afbeelding met voorrang. */
  priority?: boolean;
  className?: string;
}) {
  const image = product.images[0];
  const available = isPurchasable(product);
  const onSale = product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents;

  const rule = product.tierGroup ? tierRules.find((r) => r.group === product.tierGroup && r.active) : null;
  const firstTier = tierPreviewForProduct(product, rule)[0];

  return (
    <article className={cn('group relative flex flex-col', className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-sand-300 bg-white shadow-soft">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || product.title}
            fill
            sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 90vw"
            priority={priority}
            className={cn(
              'object-cover transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]',
              !available && 'opacity-60 grayscale-[0.4]',
            )}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-sand-200">
            <Image src="/logo.png" alt="" width={512} height={512} className="size-24 opacity-25" />
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {!available ? <Badge tone="muted">Uitverkocht</Badge> : null}
          {available && onSale ? <Badge tone="brand">Aanbieding</Badge> : null}
          {available && !onSale && isNew(product) ? <Badge tone="sage">Nieuw</Badge> : null}
        </div>

        {firstTier ? (
          <div className="absolute right-3 bottom-3">
            <Badge tone="ochre">
              {firstTier.minQty}+ voor {formatCents(firstTier.unitPriceCents)} per stuk
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="mt-3.5 flex flex-1 flex-col">
        <h3 className="font-display text-base leading-snug font-semibold text-sand-900">
          <Link href={`/product/${product.slug}`} className="after:absolute after:inset-0">
            {product.title}
          </Link>
        </h3>

        {product.shortDescription || product.subtitle ? (
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-sand-600">
            {product.shortDescription || product.subtitle}
          </p>
        ) : null}

        <p className="mt-2 flex items-baseline gap-2">
          <span className="font-display font-semibold text-sand-900 tabular">
            {formatCents(product.priceCents)}
          </span>
          {onSale ? (
            <span className="text-sm text-sand-500 line-through tabular">
              {formatCents(product.compareAtPriceCents!)}
            </span>
          ) : null}
        </p>
      </div>
    </article>
  );
}

/** Raster van productkaarten, met dezelfde tussenruimte door de hele site. */
export function ProductGrid({
  products,
  tierRules = [],
  className,
}: {
  products: Product[];
  tierRules?: TierRule[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4',
        className,
      )}
    >
      {products.map((product, index) => (
        <li key={product.id} className="flex">
          <ProductCard product={product} tierRules={tierRules} priority={index < 4} className="w-full" />
        </li>
      ))}
    </ul>
  );
}
