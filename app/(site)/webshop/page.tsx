import { ShopListing } from '@/components/shop/shop-listing';
import { buildMetadata } from '@/lib/seo';
import type { SearchParams } from '@/lib/shop/filters';

export async function generateMetadata() {
  return buildMetadata({
    title: 'Webshop',
    description:
      'Kaarten om te sturen en kleine dingen om weg te geven. Hoe meer kaarten je meeneemt, hoe voordeliger — ook als je verschillende ontwerpen kiest.',
    path: '/webshop',
  });
}

export default async function WebshopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <ShopListing searchParams={await searchParams} />;
}
