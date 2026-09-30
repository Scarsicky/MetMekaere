import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { getGeneralSettings } from '@/lib/data/settings';
import { jsonLdScript, organizationJsonLd, websiteJsonLd } from '@/lib/seo';

/**
 * Het kader van de publieke site: header, inhoud, footer.
 *
 * De gestructureerde gegevens over de organisatie staan hier en niet in de
 * root-layout, zodat ze niet meeliften op het adminpaneel.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const general = await getGeneralSettings();

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#inhoud" className="skip-link">
        Naar de inhoud
      </a>

      <Header />

      <main id="inhoud" className="flex-1">
        {children}
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(organizationJsonLd(general))}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(websiteJsonLd(general))}
      />
    </div>
  );
}
