import { notFound } from 'next/navigation';

import { CmsBlocks, cmsPageMetadata, loadPage } from '@/lib/cms/page';

const SLUG = 'algemene-voorwaarden';
const PATH = '/algemene-voorwaarden';

export async function generateMetadata() {
  return cmsPageMetadata(SLUG, PATH);
}

export default async function Page() {
  const page = await loadPage(SLUG);
  if (!page) notFound();
  return <CmsBlocks page={page} />;
}
