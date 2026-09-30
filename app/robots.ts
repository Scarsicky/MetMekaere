import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/seo';

/**
 * Wat zoekmachines wel en niet mogen bekijken.
 *
 * Persoonlijke pagina's (winkelwagen, afrekenen, bedankt) en alles achter het
 * beheer blijven buiten de zoekresultaten. Dat is geen beveiliging — daarvoor
 * dienen de sessiecontroles — maar het voorkomt dat een bedanktpagina met een
 * ordernummer in Google belandt.
 */
export default function robots(): MetadataRoute.Robots {
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
