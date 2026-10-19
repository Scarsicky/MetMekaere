import { ShopListing } from '@/components/shop/shop-listing';
import { getShopSettings } from '@/lib/data/settings';
import { buildMetadata } from '@/lib/seo';
import { DEFAULT_SHOP_INTRO } from '@/lib/shop/shop-copy';
import type { SearchParams } from '@/lib/shop/filters';

export async function generateMetadata() {
  // Dezelfde tekst als op de pagina zelf. Stonden die los van elkaar, dan zou
  // een aanpassing in het beheer de pagina wél veranderen en wat Google toont
  // niet.
  const shop = await getShopSettings();

  return buildMetadata({
    title: 'Webshop',
    description: shop.shopIntro ?? DEFAULT_SHOP_INTRO,
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
