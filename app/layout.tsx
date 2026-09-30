import type { Metadata, Viewport } from 'next';
import { Nunito_Sans, Raleway } from 'next/font/google';

import { siteUrl } from '@/lib/seo';

import './globals.css';

/**
 * De buitenste laag van elke pagina: taal, fonts en de standaard metagegevens.
 *
 * De header en footer zitten bewust níét hier maar in `(site)/layout.tsx`. Zo
 * krijgt het adminpaneel zijn eigen omgeving, zonder winkelwagentje en
 * nieuwsbriefblok.
 *
 * Fonts worden door Next zelf meegeleverd en vooraf ingeladen. Geen verzoek
 * naar Google dus: sneller, en geen bezoekersgegevens die die kant op gaan.
 */
const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const nunito = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
  weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Met Mekaere · Veur wat meer aandacht veur mekaere',
    template: '%s · Met Mekaere',
  },
  description:
    'Kaarten om te sturen, aandacht voor ons dialect en activiteiten waar je mensen tegenkomt die je anders misschien nooit had gesproken.',
  applicationName: 'Met Mekaere',
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#fbf8f3',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${raleway.variable} ${nunito.variable}`}>
      <body className="min-h-dvh [--header-height:4.5rem]">{children}</body>
    </html>
  );
}
