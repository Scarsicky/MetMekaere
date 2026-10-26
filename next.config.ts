import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * We gebruiken het klassieke cachemodel (`unstable_cache` + tags) in plaats
   * van Cache Components. Reden: voorspelbaar gedrag en minder bouwrestricties
   * voor een site met winkelwagen-cookies. Zie lib/data/cache.ts.
   */
  /**
   * Hoe lang een verouderde pagina nog hergebruikt mag worden.
   *
   * Zonder deze instelling zet Next er een jaar in: de `Cache-Control` wordt
   * dan `s-maxage=300, stale-while-revalidate=31535700`. Dat laatste geldt niet
   * alleen voor het CDN maar ook voor de browser van de bezoeker, en daardoor
   * kreeg wie al eens langs was geweest maandenlang de oude pagina te zien —
   * tot hij zijn browsegegevens wiste.
   *
   * Gelijk aan de verversingstijd in `lib/data/cache.ts`, zodat er geen
   * hergebruik van verouderde pagina's overblijft.
   */
  expireTime: 60,

  images: {
    remotePatterns: [
      // Afbeeldingen uit Cloud Storage (productfoto's, CMS-beelden).
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: '*.firebasestorage.app' },
    ],
    // Formaten die we daadwerkelijk gebruiken; houdt de cache klein.
    imageSizes: [64, 96, 128, 256, 384],
    deviceSizes: [384, 640, 750, 828, 1080, 1200, 1920],
  },

  // Ordergegevens en winkelwagens horen nooit in een CDN-cache.
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Camera/microfoon heeft deze site nergens nodig.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          /*
           * Voortaan alleen nog via https, ook als iemand een oude http-link
           * aanklikt. Dat scheelt één omleiding waarin een aanvaller op een
           * openbaar netwerk zou kunnen ingrijpen.
           *
           * Twee jaar, inclusief subdomeinen. `preload` staat er bewust niet
           * bij: daarmee kom je op een lijst die in browsers wordt
           * meegeleverd, en daar kom je niet makkelijk meer vanaf.
           */
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
          /*
           * Andere vensters kunnen niet meer bij dit venster.
           *
           * Met opzet `same-origin-allow-popups` en niet `same-origin`, hoe
           * vaak dat laatste ook wordt aangeraden: dat verbreekt de band met
           * het inlogvenster van Google, en dan komt niemand het beheer nog
           * in. Inloggen gaat via `signInWithPopup`, en dat venster moet
           * kunnen terugpraten.
           */
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          /*
           * Onze eigen bestanden mogen alleen door onze eigen pagina's worden
           * geladen. Bescheiden winst — de productfoto's staan bij Cloud
           * Storage en vallen hier dus niet onder, dit dekt alleen onze
           * scripts, stijlen en het logo — maar het kost niets.
           *
           * Dit geldt voor bronnen in een pagina, niet voor het aanklikken van
           * een link. Linkjes naar de site blijven dus gewoon werken, en wie
           * een pagina deelt op sociale media krijgt nog steeds een voorbeeld
           * te zien: die diensten halen zo'n plaatje van hun eigen server af.
           */
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ];
  },

  experimental: {
    // firebase-admin is een zware CJS-bundel; laat Next hem niet meebundelen.
    serverActions: { bodySizeLimit: '4mb' },
  },

  serverExternalPackages: ['firebase-admin', 'nodemailer', '@mollie/api-client'],

  poweredByHeader: false,
};

export default nextConfig;
