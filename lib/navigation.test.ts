import { describe, expect, it } from 'vitest';

import { cmsSlugForHref, FOOTER_LINKS, isNavVisible, MAIN_NAV, visibleNav } from '@/lib/navigation';

/**
 * Deze tests bestaan naar aanleiding van een echte melding.
 *
 * Een pagina die in het beheer op 'concept' werd gezet bleef gewoon in het
 * menu en in de footer staan. Het menu was een vaste lijst in code en keek
 * nergens naar de publicatiestatus.
 */

describe('welke menulink hoort bij welke CMS-pagina', () => {
  it('herkent de pagina die het CMS beheert', () => {
    expect(cmsSlugForHref('/over')).toBe('over');
    expect(cmsSlugForHref('/')).toBe('home');
    expect(cmsSlugForHref('/algemene-voorwaarden')).toBe('algemene-voorwaarden');
  });

  it('laat links met rust die geen CMS-pagina zijn', () => {
    // Die hebben geen publicatiestatus en mogen dus nooit verdwijnen.
    expect(cmsSlugForHref('/webshop')).toBeNull();
    expect(cmsSlugForHref('/winkelwagen')).toBeNull();
    expect(cmsSlugForHref('/adventskalender')).toBeNull();
  });
});

describe('zichtbaarheid van een menulink', () => {
  it('verbergt een pagina die op concept staat', () => {
    expect(isNavVisible('/over', { over: false })).toBe(false);
  });

  it('toont een pagina die gepubliceerd is', () => {
    expect(isNavVisible('/over', { over: true })).toBe(true);
  });

  it('toont wat niet in de index staat', () => {
    /*
     * Onbekend is zichtbaar. Een lege index betekent dat Firestore niet
     * bereikbaar was of dat er nog niets is opgeslagen — dan hoort het menu
     * gewoon te blijven staan en niet leeg te lopen.
     */
    expect(isNavVisible('/over', {})).toBe(true);
  });

  it('houdt de homepagina altijd zichtbaar', () => {
    expect(isNavVisible('/', { home: false })).toBe(true);
  });

  it('raakt de webshop nooit aan', () => {
    expect(isNavVisible('/webshop', { webshop: false })).toBe(true);
  });
});

describe('het hele menu filteren', () => {
  it('haalt alleen de conceptpagina eruit', () => {
    const result = visibleNav(MAIN_NAV, { community: false, over: true });
    const hrefs = result.map((item) => item.href);

    expect(hrefs).not.toContain('/community');
    expect(hrefs).toContain('/over');
    expect(hrefs).toContain('/webshop');
    expect(hrefs).toContain('/');
  });

  it('werkt net zo voor de footer', () => {
    const result = visibleNav(FOOTER_LINKS, { privacy: false });
    const hrefs = result.map((item) => item.href);

    expect(hrefs).not.toContain('/privacy');
    expect(hrefs).toContain('/algemene-voorwaarden');
    // De winkelwagen is geen CMS-pagina en blijft hoe dan ook staan.
    expect(hrefs).toContain('/winkelwagen');
  });

  it('laat alles staan bij een lege index', () => {
    expect(visibleNav(MAIN_NAV, {})).toHaveLength(MAIN_NAV.length);
  });
});
