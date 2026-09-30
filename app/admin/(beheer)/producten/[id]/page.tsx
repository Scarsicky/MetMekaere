import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductForm } from '@/app/admin/(beheer)/producten/[id]/product-form';
import { AdminPage } from '@/components/admin/ui';
import { getAllCategoriesForAdmin, getProductById, getTierRules } from '@/lib/data/catalog';
import { getShopSettings } from '@/lib/data/settings';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === 'nieuw') return { title: 'Nieuw product' };
  const product = await getProductById(id);
  return { title: product?.title ?? 'Product' };
}

export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'nieuw';

  const [product, categories, tierRules, settings] = await Promise.all([
    isNew ? Promise.resolve(null) : getProductById(id),
    getAllCategoriesForAdmin(),
    getTierRules(),
    getShopSettings(),
  ]);

  if (!isNew && !product) notFound();

  return (
    <AdminPage
      title={isNew ? 'Nieuw product' : (product?.title ?? 'Product')}
      breadcrumb={{ label: 'Alle producten', href: '/admin/producten' }}
      actions={
        product && product.status === 'active' ? (
          <Link
            href={`/product/${product.slug}`}
            target="_blank"
            className="inline-flex min-h-11 items-center rounded-full border border-sand-300 bg-white px-5 font-display text-[0.95rem] font-semibold text-sand-800 transition-colors hover:border-sand-400"
          >
            Bekijk in de webshop ↗
          </Link>
        ) : null
      }
    >
      {categories.length === 0 ? (
        <p className="mb-5 rounded-xl bg-ochre-100 px-4 py-3 text-sm text-ochre-700">
          Er zijn nog geen categorieën.{' '}
          <Link href="/admin/categorieen" className="underline underline-offset-2">
            Maak er eerst één aan
          </Link>
          , dan kun je dit product goed indelen.
        </p>
      ) : null}

      <ProductForm
        product={product}
        categories={categories}
        tierRules={tierRules}
        facets={settings.facets}
      />
    </AdminPage>
  );
}
