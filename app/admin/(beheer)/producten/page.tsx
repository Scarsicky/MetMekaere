import Image from 'next/image';
import Link from 'next/link';

import { AdminEmpty, AdminList, AdminListRow, AdminPage, StatusPill } from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';
import { getAllCategoriesForAdmin, getAllProductsForAdmin } from '@/lib/data/catalog';
import { formatCents } from '@/lib/money';
import type { Product } from '@/types';

export const metadata = { title: 'Producten' };

function stockLabel(product: Product): { text: string; tone: 'green' | 'amber' | 'red' | 'grey' } {
  if (!product.stock.tracked) return { text: 'Altijd leverbaar', tone: 'grey' };
  if (product.stock.quantity <= 0) {
    return product.stock.allowBackorder
      ? { text: 'Op = door', tone: 'amber' }
      : { text: 'Uitverkocht', tone: 'red' };
  }
  if (product.stock.quantity <= product.stock.lowStockThreshold) {
    return { text: `Nog ${product.stock.quantity}`, tone: 'amber' };
  }
  return { text: `${product.stock.quantity} op voorraad`, tone: 'green' };
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string; status?: string }>;
}) {
  const [products, categories] = await Promise.all([
    getAllProductsForAdmin(),
    getAllCategoriesForAdmin(),
  ]);
  const filters = await searchParams;

  const visible = products.filter((product) => {
    if (filters.categorie && product.categorySlug !== filters.categorie) return false;
    if (filters.status && product.status !== filters.status) return false;
    // Gearchiveerde producten alleen tonen als je er expliciet om vraagt.
    if (!filters.status && product.status === 'archived') return false;
    return true;
  });

  const counts = {
    active: products.filter((p) => p.status === 'active').length,
    draft: products.filter((p) => p.status === 'draft').length,
    archived: products.filter((p) => p.status === 'archived').length,
  };

  return (
    <AdminPage
      title="Producten"
      description="Teksten, foto’s, prijzen en voorraad. Wat op concept staat, is nog niet zichtbaar in de webshop."
      actions={<ButtonLink href="/admin/producten/nieuw">Nieuw product</ButtonLink>}
    >
      {/* Filters als links, zodat je ze kunt bookmarken. */}
      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip href="/admin/producten" active={!filters.status && !filters.categorie}>
          Alles ({counts.active + counts.draft})
        </FilterChip>
        <FilterChip href="/admin/producten?status=active" active={filters.status === 'active'}>
          In de webshop ({counts.active})
        </FilterChip>
        <FilterChip href="/admin/producten?status=draft" active={filters.status === 'draft'}>
          Concept ({counts.draft})
        </FilterChip>
        {counts.archived > 0 ? (
          <FilterChip href="/admin/producten?status=archived" active={filters.status === 'archived'}>
            Archief ({counts.archived})
          </FilterChip>
        ) : null}

        {categories.length > 1 ? (
          <>
            <span aria-hidden className="mx-1 self-center text-sand-400">
              |
            </span>
            {categories.map((category) => (
              <FilterChip
                key={category.slug}
                href={`/admin/producten?categorie=${category.slug}`}
                active={filters.categorie === category.slug}
              >
                {category.name}
              </FilterChip>
            ))}
          </>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <AdminEmpty
          title={products.length ? 'Niets gevonden met dit filter' : 'Nog geen producten'}
          description={
            products.length
              ? 'Probeer een ander filter.'
              : 'Voeg je eerste kaart toe. Je kunt hem eerst als concept opslaan en later zichtbaar maken.'
          }
          action={<ButtonLink href="/admin/producten/nieuw">Nieuw product</ButtonLink>}
        />
      ) : (
        <AdminList>
          {visible.map((product) => {
            const stock = stockLabel(product);
            const image = product.images[0];

            return (
              <AdminListRow key={product.id} href={`/admin/producten/${product.id}`}>
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-sand-200">
                  {image ? (
                    <Image src={image.url} alt="" fill sizes="3rem" className="object-cover" unoptimized />
                  ) : (
                    <Image
                      src="/logo.png"
                      alt=""
                      width={512}
                      height={512}
                      className="size-full p-2 opacity-30"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-semibold text-sand-900">{product.title}</p>
                  <p className="truncate text-sm text-sand-600">
                    {categories.find((c) => c.slug === product.categorySlug)?.name ?? product.categorySlug}
                    {product.tierGroup ? ` · staffel: ${product.tierGroup}` : ''}
                  </p>
                </div>

                <span className="font-semibold whitespace-nowrap tabular">
                  {formatCents(product.priceCents)}
                </span>

                <StatusPill tone={stock.tone}>{stock.text}</StatusPill>

                <StatusPill
                  tone={
                    product.status === 'active' ? 'green' : product.status === 'draft' ? 'amber' : 'grey'
                  }
                >
                  {product.status === 'active' ? 'Online' : product.status === 'draft' ? 'Concept' : 'Archief'}
                </StatusPill>
              </AdminListRow>
            );
          })}
        </AdminList>
      )}
    </AdminPage>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'rounded-full bg-sand-800 px-3.5 py-1.5 font-display text-sm font-semibold text-sand-50'
          : 'rounded-full border border-sand-300 bg-white px-3.5 py-1.5 font-display text-sm font-semibold text-sand-700 transition-colors hover:border-sand-400'
      }
    >
      {children}
    </Link>
  );
}
