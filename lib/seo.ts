import type { Metadata } from 'next';

import { formatCents } from '@/lib/money';
import { markdownToPlainText, truncate } from '@/lib/utils';
import type { GeneralSettings, Happening, Product } from '@/types';

/**
 * Alles rond vindbaarheid op één plek: canonieke links, deelvoorbeelden voor
 * WhatsApp en Facebook, en de gestructureerde gegevens waarmee Google prijs,
 * voorraad en datums kan tonen.
 */

const FALLBACK_URL = 'https://metmekaere.nl';

export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    // App Hosting zet deze variabele met de draaiende backend-URL.
    (process.env.FIREBASE_APP_HOSTING_URL ? `https://${process.env.FIREBASE_APP_HOSTING_URL}` : '') ||
    FALLBACK_URL;
  return raw.replace(/\/+$/, '');
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Draait de site op een tijdelijk adres, of op het eigen domein?
 *
 * Tijdelijke adressen zijn de lokale ontwikkelserver en de adressen die
 * Firebase zelf uitdeelt (`*.hosted.app`, `*.run.app`, `*.web.app`).
 *
 * Dit bepaalt twee dingen. Zoekmachines wordt gevraagd een tijdelijk adres met
 * rust te laten — anders staat straks het oefenadres in Google naast het echte
 * en concurreren die twee met elkaar. En het beheer weet zo of een
 * Mollie-testsleutel onschuldig is (op een oefenadres) of juist een lek
 * (op het eigen domein).
 *
 * Het schakelt zichzelf om: zodra `NEXT_PUBLIC_SITE_URL` op het echte domein
 * staat, gaat indexeren vanzelf aan.
 */
export function isTemporaryDomain(): boolean {
  return /localhost|127\.0\.0\.1|\.hosted\.app|\.run\.app|\.web\.app|\.firebaseapp\.com/.test(
    siteUrl(),
  );
}

/** Meta-omschrijving: één alinea, niet afgekapt midden in een woord. */
export function metaDescription(input: string, max = 160): string {
  return truncate(markdownToPlainText(input), max);
}

export function buildMetadata(args: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  imageAlt?: string;
  noIndex?: boolean;
  type?: 'website' | 'article';
}): Metadata {
  const url = absoluteUrl(args.path);
  const image = args.image ? absoluteUrl(args.image) : absoluteUrl('/logo.png');

  return {
    title: args.title,
    description: args.description,
    alternates: { canonical: url },
    robots: args.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: args.type ?? 'website',
      title: args.title,
      description: args.description,
      url,
      siteName: 'Met Mekaere',
      locale: 'nl_NL',
      images: [{ url: image, alt: args.imageAlt ?? args.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: args.title,
      description: args.description,
      images: [image],
    },
  };
}

/* ------------------------------------------------------------------ *
 * Gestructureerde gegevens (JSON-LD)
 * ------------------------------------------------------------------ */

export function organizationJsonLd(general: GeneralSettings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: general.siteName,
    url: siteUrl(),
    logo: absoluteUrl('/logo.png'),
    description: general.description,
    email: general.email,
    ...(general.phone ? { telephone: general.phone } : {}),
    ...(general.address?.city
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: [general.address.street, general.address.houseNumber].filter(Boolean).join(' '),
            postalCode: general.address.postalCode,
            addressLocality: general.address.city,
            addressCountry: general.address.country ?? 'NL',
          },
        }
      : {}),
    ...(general.socials.length ? { sameAs: general.socials.map((s) => s.href) } : {}),
  };
}

export function websiteJsonLd(general: GeneralSettings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: general.siteName,
    url: siteUrl(),
    inLanguage: 'nl-NL',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl()}/webshop?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Productgegevens voor de zoekresultaten. `availability` vertelt Google of
 * iets te koop is; dat is precies waar de voorraadadministratie voor is.
 */
export function productJsonLd(product: Product, general: GeneralSettings) {
  const inStock =
    !product.stock.tracked || product.stock.allowBackorder || product.stock.quantity > 0;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: metaDescription(product.shortDescription || product.description, 300),
    sku: product.id,
    ...(product.images.length ? { image: product.images.map((i) => absoluteUrl(i.url)) } : {}),
    brand: { '@type': 'Brand', name: general.siteName },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/product/${product.slug}`),
      priceCurrency: 'EUR',
      price: (product.priceCents / 100).toFixed(2),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: general.siteName },
    },
  };
}

export function breadcrumbJsonLd(trail: { name: string; href: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

/** Een activiteit met datum kan als evenement in de zoekresultaten komen. */
export function eventJsonLd(happening: Happening, general: GeneralSettings) {
  if (!happening.date) return null;

  const start = happening.startTime ? `${happening.date}T${happening.startTime}:00` : happening.date;
  const end = happening.endTime ? `${happening.date}T${happening.endTime}:00` : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: happening.title,
    description: metaDescription(happening.summary || happening.body, 300),
    startDate: start,
    ...(end ? { endDate: end } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(happening.images.length ? { image: happening.images.map((i) => absoluteUrl(i.url)) } : {}),
    ...(happening.location
      ? { location: { '@type': 'Place', name: happening.location, address: happening.location } }
      : {}),
    organizer: { '@type': 'Organization', name: general.siteName, url: siteUrl() },
    url: absoluteUrl(`/doen-en-beleven/${happening.slug}`),
  };
}

/** Prijslabel voor deelvoorbeelden: 'vanaf € 3,50'. */
export function priceLabel(product: Product): string {
  return formatCents(product.priceCents);
}

/**
 * Rendert JSON-LD. React escapet de inhoud niet in een script-tag, dus we
 * breken `<` op zodat een tekst met HTML erin het script niet kan afsluiten.
 */
export function jsonLdScript(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') };
}
