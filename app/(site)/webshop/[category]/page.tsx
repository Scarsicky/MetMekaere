import { notFound } from 'next/navigation';

import { ShopListing } from '@/components/shop/shop-listing';
import { getCategories } from '@/lib/data/catalog';
import { buildMetadata } from '@/lib/seo';
import type { SearchParams } from '@/lib/shop/filters';

/** De categorieën vooraf klaarzetten, zodat ze snel en goed vindbaar zijn. */
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ category: category.slug }));
}

async function findCategory(slug: string) {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = await findCategory(slug);
  if (!category) return {};

  return buildMetadata({
    title: category.seo?.title ?? category.name,
    description: category.seo?.description ?? category.description ?? '',
    path: `/webshop/${category.slug}`,
    image: category.image?.url,
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { category: slug } = await params;
  const category = await findCategory(slug);
  if (!category) notFound();

  return <ShopListing searchParams={await searchParams} category={category} />;
}
