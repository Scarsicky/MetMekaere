import { notFound } from 'next/navigation';

import { CmsBlocks, cmsPageMetadata, loadPage } from '@/lib/cms/page';
import { getGeneralSettings } from '@/lib/data/settings';
import { siteTitle } from '@/lib/seo';

export async function generateMetadata() {
  const [meta, general] = await Promise.all([cmsPageMetadata('home', '/'), getGeneralSettings()]);

  return {
    ...meta,
    /*
     * De homepage draagt de volledige titel en niet het '… · Met Mekaere'-
     * sjabloon: 'Home · Met Mekaere' zegt niets, de naam met de slogan wel.
     *
     * Die stond hier als vaste tekst, waardoor de slogan uit de instellingen
     * nergens terechtkwam.
     */
    title: { absolute: siteTitle(general) },
  };
}

export default async function HomePage() {
  const page = await loadPage('home');
  if (!page) notFound();
  return <CmsBlocks page={page} />;
}
