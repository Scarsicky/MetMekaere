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
