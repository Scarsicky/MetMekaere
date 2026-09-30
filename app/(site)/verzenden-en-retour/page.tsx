import { notFound } from 'next/navigation';

import { CmsBlocks, cmsPageMetadata, loadPage } from '@/lib/cms/page';

const SLUG = 'verzenden-en-retour';
const PATH = '/verzenden-en-retour';

export async function generateMetadata() {
  return cmsPageMetadata(SLUG, PATH);
}

export default async function Page() {
  const page = await loadPage(SLUG);
  if (!page) notFound();
  return <CmsBlocks page={page} />;
}
