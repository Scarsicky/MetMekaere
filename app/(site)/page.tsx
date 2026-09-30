import { notFound } from 'next/navigation';

import { CmsBlocks, cmsPageMetadata, loadPage } from '@/lib/cms/page';

export async function generateMetadata() {
  const meta = await cmsPageMetadata('home', '/');
  return {
    ...meta,
    // De homepage gebruikt de volledige titel, niet het '… · Met Mekaere'-sjabloon.
    title: { absolute: 'Met Mekaere · Veur wat meer aandacht veur mekaere' },
  };
}

export default async function HomePage() {
  const page = await loadPage('home');
  if (!page) notFound();
  return <CmsBlocks page={page} />;
}
