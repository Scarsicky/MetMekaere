import Image from 'next/image';
import Link from 'next/link';

import { NewsletterForm } from '@/components/newsletter-form';
import { getAdventSettings, getGeneralSettings, isAdventInSeason } from '@/lib/data/settings';
import { ADVENT_NAV, FOOTER_LINKS, MAIN_NAV } from '@/lib/navigation';

export async function Footer() {
  const [general, advent] = await Promise.all([getGeneralSettings(), getAdventSettings()]);
  const year = new Date().getFullYear();
  const navItems = isAdventInSeason(advent) ? [...MAIN_NAV.slice(1), ADVENT_NAV] : MAIN_NAV.slice(1);

  return (
    <footer className="mt-auto border-t border-sand-300 bg-white">
      {/* Nieuwsbrief: de belangrijkste vraag onderaan elke pagina. */}
      <div className="border-b border-sand-200 bg-sage-100">
        <div className="container-page py-10 md:py-12">
          <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,28rem)] md:items-center">
            <div>
              <h2 className="text-xl md:text-2xl">Blijf op de hoogte</h2>
              <p className="mt-2 max-w-prose text-sand-700">
                Een berichtje als er nieuwe kaarten zijn of als er iets te beleven valt. Niet vaker
                dan nodig.
              </p>
            </div>
            <NewsletterForm source="footer" />
          </div>
        </div>
      </div>

      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-[minmax(0,20rem)_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <Image src="/logo.png" alt="" width={512} height={512} className="size-14" />
              <span>
                <span className="block font-display text-lg leading-none font-semibold text-sand-900">
                  {general.siteName}
                </span>
                <span className="mt-1 block font-display text-[0.7rem] leading-none tracking-[0.18em] text-sand-600 uppercase">
                  Samen verbinden
                </span>
              </span>
            </Link>

            <p className="mt-5 max-w-prose text-sand-700">{general.tagline}</p>

            <div className="mt-5 flex flex-col gap-1 text-sm">
              <a
                href={`mailto:${general.email}`}
                className="text-brand-700 underline decoration-brand-300 decoration-2 underline-offset-2 hover:decoration-brand-700"
              >
                {general.email}
              </a>
              {general.phone ? <span className="text-sand-700">{general.phone}</span> : null}
            </div>

            {general.socials.length ? (
              <ul className="mt-5 flex flex-wrap gap-2">
                {general.socials.map((social) => (
                  <li key={social.href}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex rounded-full border border-sand-300 px-3.5 py-1.5 font-display text-sm font-semibold text-sand-800 transition-colors hover:border-brand-300 hover:text-brand-700"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <nav aria-labelledby="footer-nav-pages">
              <h2 id="footer-nav-pages" className="font-display text-sm font-bold tracking-wide text-sand-900 uppercase">
                Ontdekken
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sand-700 transition-colors hover:text-brand-700">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-labelledby="footer-nav-service">
              <h2 id="footer-nav-service" className="font-display text-sm font-bold tracking-wide text-sand-900 uppercase">
                Praktisch
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {FOOTER_LINKS.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sand-700 transition-colors hover:text-brand-700">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-sand-200 pt-6 text-sm text-sand-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {general.siteName}
            {general.kvk ? ` · KvK ${general.kvk}` : ''}
            {general.vatNumber ? ` · btw ${general.vatNumber}` : ''}
          </p>
          <p className="font-display italic">{general.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
