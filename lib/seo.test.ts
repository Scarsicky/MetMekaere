import { afterEach, describe, expect, it } from 'vitest';

import {
  buildMetadata,
  eventJsonLd,
  isTemporaryDomain,
  productJsonLd,
  shippingCountries,
  siteTitle,
  siteUrl,
} from '@/lib/seo';

/**
 * Zolang de site op een tijdelijk adres draait, mag hij niet in Google komen.
 * Anders staat het oefenadres straks naast het echte en concurreren die twee.
 *
 * Deze tests bestaan omdat dat een keer stilletjes misging: de root-layout zette
 * netjes een noindex, maar elke pagina overschreef die met een eigen lege
 * `robots`-waarde. Aan de buitenkant zag je alleen dat de metatag ontbrak.
 */

const original = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = original;
});

function on(url: string) {
  process.env.NEXT_PUBLIC_SITE_URL = url;
}

const page = { title: 'Kaart', description: 'Een kaart', path: '/product/kaart' };

describe('tijdelijke adressen herkennen', () => {
  it('ziet de adressen die Firebase zelf uitdeelt als tijdelijk', () => {
    for (const url of [
      'https://metmekaere-web--metmekaere.europe-west4.hosted.app',
      'https://metmekaere.web.app',
      'https://metmekaere.firebaseapp.com',
      'https://iets.run.app',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]) {
      on(url);
      expect(isTemporaryDomain(), url).toBe(true);
    }
  });

  it('ziet het eigen domein als definitief', () => {
    for (const url of ['https://metmekaere.nl', 'https://www.metmekaere.nl']) {
      on(url);
      expect(isTemporaryDomain(), url).toBe(false);
    }
  });
});

describe('noindex op een tijdelijk adres', () => {
  it('zet noindex op elke pagina zolang het adres tijdelijk is', () => {
    on('https://metmekaere-web--metmekaere.europe-west4.hosted.app');
    expect(buildMetadata(page).robots).toEqual({ index: false, follow: false });
  });

  it('laat indexeren toe zodra het eigen domein staat', () => {
    on('https://metmekaere.nl');
    expect(buildMetadata(page).robots).toBeUndefined();
  });

  it('respecteert een pagina die zelf om noindex vraagt', () => {
    on('https://metmekaere.nl');
    expect(buildMetadata({ ...page, noIndex: true }).robots).toEqual({
      index: false,
      follow: false,
    });
  });

  it('hangt canonieke links en deelvoorbeelden aan het ingestelde adres', () => {
    on('https://metmekaere.nl');
    const meta = buildMetadata(page);
    expect(meta.alternates?.canonical).toBe('https://metmekaere.nl/product/kaart');
    expect(meta.openGraph?.url).toBe('https://metmekaere.nl/product/kaart');
  });

  it('laat een afsluitende schuine streep in het adres niet doorwerken', () => {
    on('https://metmekaere.nl/');
    expect(siteUrl()).toBe('https://metmekaere.nl');
    expect(buildMetadata(page).alternates?.canonical).toBe('https://metmekaere.nl/product/kaart');
  });
});

/**
 * De titel van de site kwam uit de code in plaats van uit de instellingen,
 * waardoor een aangepaste slogan nergens in de tabtitel terechtkwam.
 */
describe('de titel van de site', () => {
  it('zet de slogan achter de naam', () => {
    expect(siteTitle({ siteName: 'Met Mekaere', tagline: 'Samen verbinden' })).toBe(
      'Met Mekaere · Samen verbinden',
    );
  });

  it('laat het scheidingsteken weg zonder slogan', () => {
    // Anders staat er 'Met Mekaere · ' met een losse punt achteraan.
    expect(siteTitle({ siteName: 'Met Mekaere' })).toBe('Met Mekaere');
    expect(siteTitle({ siteName: 'Met Mekaere', tagline: '' })).toBe('Met Mekaere');
    expect(siteTitle({ siteName: 'Met Mekaere', tagline: '   ' })).toBe('Met Mekaere');
  });
});

/**
 * De gestructureerde gegevens voor Google.
 *
 * Search Console vroeg (oktober 2026) om een retourbeleid bij producten en een
 * prijs bij evenementen. Beide zijn beloften aan een lezer die ze in een
 * zoekresultaat te zien krijgt, dus ze moeten kloppen met wat er op de site
 * staat — en als we het niet zeker weten, hoort er niets te staan.
 */
describe('gestructureerde gegevens', () => {
  const general = { siteName: 'Met Mekaere', description: 'Kaarten', email: 'info@example.nl' };

  const product = {
    id: 'kaart-1',
    slug: 'kaart',
    title: 'Kaart',
    shortDescription: 'Een kaart',
    description: 'Een kaart',
    priceCents: 195,
    images: [],
    stock: { tracked: false, quantity: 0, allowBackorder: false, lowStockThreshold: 0 },
  };

  const happening = {
    id: 'a1',
    slug: 'workshop',
    title: 'Workshop',
    summary: 'Samen maken',
    body: '',
    images: [],
    theme: 'Maken & Leren',
    date: '2026-12-05',
    createdAt: Date.UTC(2026, 9, 1),
  };

  it('zet het retourbeleid bij een product', () => {
    on('https://metmekaere.nl');
    const data = productJsonLd(product as never, general as never, ['NL', 'BE']) as never as {
      offers: { hasMerchantReturnPolicy: Record<string, unknown> };
    };
    const beleid = data.offers.hasMerchantReturnPolicy;

    expect(beleid.merchantReturnDays).toBe(14);
    expect(beleid.applicableCountry).toEqual(['NL', 'BE']);
    // De klant stuurt zelf terug en betaalt dat zelf; zo staat het op de site.
    expect(beleid.returnFees).toBe('https://schema.org/ReturnFeesCustomerResponsibleForShipping');
  });

  it('valt terug op Nederland als er geen verzendmethode is', () => {
    on('https://metmekaere.nl');
    const data = productJsonLd(product as never, general as never) as never as {
      offers: { hasMerchantReturnPolicy: { applicableCountry: string[] } };
    };
    expect(data.offers.hasMerchantReturnPolicy.applicableCountry).toEqual(['NL']);
  });

  it('leest de landen uit de actieve verzendmethodes', () => {
    expect(
      shippingCountries([
        { countries: ['NL'], active: true },
        { countries: ['nl', 'BE'], active: true },
        { countries: ['DE'], active: false },
      ]),
    ).toEqual(['BE', 'NL']);
  });

  it('zet de prijs bij een evenement', () => {
    on('https://metmekaere.nl');
    const data = eventJsonLd({ ...happening, priceCents: 1250 } as never, general as never) as {
      offers?: { price: string; priceCurrency: string; url: string };
    };
    expect(data?.offers?.price).toBe('12.50');
    expect(data?.offers?.priceCurrency).toBe('EUR');
    expect(data?.offers?.url).toBe('https://metmekaere.nl/doen-en-beleven/workshop');
  });

  it('noemt gratis ook een prijs, want dat is het', () => {
    on('https://metmekaere.nl');
    const data = eventJsonLd({ ...happening, priceCents: 0 } as never, general as never) as {
      offers?: { price: string };
    };
    expect(data?.offers?.price).toBe('0.00');
  });

  it('verzwijgt de prijs als er geen bedrag bekend is', () => {
    on('https://metmekaere.nl');
    // Een vrije tekst als 'bijdrage voor materialen' is geen bedrag. Liever
    // niets in Google dan een verzonnen getal.
    const data = eventJsonLd(
      { ...happening, priceLabel: 'Bijdrage voor materialen' } as never,
      general as never,
    ) as { offers?: unknown };
    expect(data?.offers).toBeUndefined();
  });

  it('wijst de aanmeldlink aan als die er is', () => {
    on('https://metmekaere.nl');
    const data = eventJsonLd(
      { ...happening, priceCents: 500, signupUrl: 'https://aanmelden.example.nl/x' } as never,
      general as never,
    ) as { offers?: { url: string } };
    expect(data?.offers?.url).toBe('https://aanmelden.example.nl/x');
  });
});
