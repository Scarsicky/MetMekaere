import { describe, expect, it } from 'vitest';

import { collectImagePaths } from '@/lib/admin/image-cleanup';

/**
 * Deze tests bewaken een opruimactie die bestanden wist. Een fout hier is
 * onomkeerbaar: een pad dat ten onrechte niet wordt gevonden, telt straks als
 * 'niet meer in gebruik' en wordt weggegooid terwijl de site er nog naar wijst.
 */

describe('opslagpaden uit een document halen', () => {
  it('vindt foto’s in een lijst, zoals bij een product', () => {
    const product = {
      title: 'Kaart',
      images: [
        { path: 'public/kaarten/een.webp', url: 'https://…', alt: '' },
        { path: 'public/kaarten/twee.webp', url: 'https://…', alt: '' },
      ],
    };
    expect(collectImagePaths(product).sort()).toEqual([
      'public/kaarten/een.webp',
      'public/kaarten/twee.webp',
    ]);
  });

  it('vindt een losse foto, zoals bij een activiteit', () => {
    expect(collectImagePaths({ title: 'Koffie', image: { path: 'public/doen/koffie.webp' } })).toEqual(
      ['public/doen/koffie.webp'],
    );
  });

  it('vindt foto’s diep in geneste blokken', () => {
    // Een pagina kan blokken bevatten met daarin weer lijstjes met beelden.
    const page = {
      blocks: [
        { type: 'tekst', body: 'geen foto hier' },
        {
          type: 'uitgelicht',
          items: [{ image: { path: 'public/paginas/een.webp' } }, { image: null }],
        },
      ],
    };
    expect(collectImagePaths(page)).toEqual(['public/paginas/een.webp']);
  });

  it('negeert paden buiten de publieke map', () => {
    // Zo kan een onverwacht veld nooit tot het wissen van iets anders leiden.
    expect(collectImagePaths({ image: { path: '../geheim.txt' } })).toEqual([]);
    expect(collectImagePaths({ image: { path: 'backups/alles.zip' } })).toEqual([]);
  });

  it('telt een pad dat twee keer voorkomt maar één keer', () => {
    const doc = {
      images: [{ path: 'public/a.webp' }],
      cover: { path: 'public/a.webp' },
    };
    expect(collectImagePaths(doc)).toEqual(['public/a.webp']);
  });

  it('valt niet over lege of rare inhoud', () => {
    expect(collectImagePaths(null)).toEqual([]);
    expect(collectImagePaths(undefined)).toEqual([]);
    expect(collectImagePaths('tekst')).toEqual([]);
    expect(collectImagePaths({ path: 42 })).toEqual([]);
  });
});
