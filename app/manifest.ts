import type { MetadataRoute } from 'next';

import { getGeneralSettings } from '@/lib/data/settings';

/**
 * Maakt de site installeerbaar op een telefoon — 'Zet op beginscherm'.
 *
 * Bewust zonder service worker die pagina's offline bewaart. Bij de oude
 * adventskalender was dat prima: die inhoud verandert nauwelijks. Op een
 * webshop is het juist riskant, want dan kan iemand een oude prijs of een
 * uitverkocht product te zien krijgen. De site laadt zo al snel genoeg.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const general = await getGeneralSettings();

  return {
    name: `${general.siteName} · ${general.tagline}`,
    short_name: general.siteName,
    description: general.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'nl-NL',
    dir: 'ltr',
    background_color: '#fbf8f3',
    theme_color: '#fbf8f3',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Webshop', url: '/webshop' },
      { name: 'Adventskalender', url: '/adventskalender' },
      { name: 'Doen en Beleven', url: '/doen-en-beleven' },
    ],
  };
}
