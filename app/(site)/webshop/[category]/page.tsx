import { notFound } from 'next/navigation';

import { ShopListing } from '@/components/shop/shop-listing';
import { getCategories } from '@/lib/data/catalog';
import { buildMetadata } from '@/lib/seo';
import type { SearchParams } from '@/lib/shop/filters';

/*
 * Hier staat met opzet géén `generateStaticParams`.
 *
 * Deze pagina leest de filters uit de URL, en dat kan alleen op de server op
 * het moment van opvragen. Een route die tegelijk 'vooraf klaargezet' heet én
 * de URL uitleest, is tegenstrijdig — Next weigert hem dan met
 * DYNAMIC_SERVER_USAGE.
 *
 * Dat ging eerder mis op een manier die lokaal onzichtbaar was: bij het bouwen
 * was de database nog leeg, dus `generateStaticParams` gaf een lege lijst terug
 * en bestempelde Next de route als volledig statisch. Op de ontwikkelmachine —
 * mét data — werd dezelfde route dynamisch en werkte alles. Het verschil zat
 * dus niet in de code maar in wat er toevallig in de database stond tijdens het
 * bouwen.
 *
 * Zonder deze functie is de rendermodus voorspelbaar, wat er ook in de database
 * staat. Voor vindbaarheid maakt het niets uit: de server levert nog steeds
 * volledige HTML aan bezoekers en zoekmachines.
 */

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
