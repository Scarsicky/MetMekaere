import { afterEach, describe, expect, it } from 'vitest';

import { buildMetadata, isTemporaryDomain, siteUrl } from '@/lib/seo';

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
