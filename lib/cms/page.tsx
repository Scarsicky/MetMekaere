import 'server-only';

import type { Metadata } from 'next';

import { BlockRenderer } from '@/components/blocks/block-renderer';
import { defaultPage } from '@/lib/cms/default-content';
import { getPage } from '@/lib/data/content';
import { buildMetadata } from '@/lib/seo';
import type { CmsPage } from '@/types';

/**
 * Een CMS-pagina ophalen, met terugval op de startinhoud uit
 * `default-content.ts`. Daardoor staat er altijd iets, ook voordat iemand de
 * seed heeft gedraaid of iets in de admin heeft aangepast.
 */
export async function loadPage(slug: string): Promise<CmsPage | null> {
  const fromCms = await getPage(slug);
  return fromCms ?? defaultPage(slug);
}

export async function cmsPageMetadata(slug: string, path: string): Promise<Metadata> {
  const page = await loadPage(slug);
  if (!page) return {};

  return buildMetadata({
    title: page.seo?.title ?? page.title,
    description: page.seo?.description ?? '',
    path,
    image: page.seo?.ogImage,
    noIndex: page.seo?.noIndex,
  });
}

/** Rendert de blokken van een pagina. */
export function CmsBlocks({ page }: { page: CmsPage }) {
  return <BlockRenderer blocks={page.blocks} />;
}
