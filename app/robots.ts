import type { MetadataRoute } from 'next';

import { absoluteUrl, isTemporaryDomain } from '@/lib/seo';

/**
 * Wat zoekmachines wel en niet mogen bekijken.
 *
 * Draait de site nog op een tijdelijk adres (`*.hosted.app` of lokaal), dan
 * vragen we ze om álles met rust te laten. Anders komt het oefenadres in Google
 * te staan naast het echte, en concurreren die twee met elkaar. Zodra
 * `NEXT_PUBLIC_SITE_URL` op het eigen domein staat, gaat dit vanzelf weer aan.
 *
 * Op het echte adres blijven persoonlijke pagina's (winkelwagen, afrekenen,
 * bedankt) en het beheer buiten de zoekresultaten. Dat is geen beveiliging —
 * daarvoor dienen de sessiecontroles — maar het voorkomt dat een bedanktpagina
 * met een ordernummer in Google belandt.
 */
export default function robots(): MetadataRoute.Robots {
  if (isTemporaryDomain()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api/',
          '/winkelwagen',
          '/afrekenen',
          '/bedankt/',
          '/betaling-simuleren/',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
