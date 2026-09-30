import { describe, expect, it } from 'vitest';

import { buildVatBreakdown, distributeProportionally, parseMoneyToCents, vatFromGross } from '@/lib/money';
import { makeLineId, priceCart, tierPreviewForProduct } from '@/lib/shop/pricing';
import type { CartLine, DiscountCode, Product, ShippingRate, TierRule } from '@/types';

/* ------------------------------------------------------------------ *
 * Bouwstenen voor de tests
 * ------------------------------------------------------------------ */

function product(over: Partial<Product> & { id: string }): Product {
  return {
    slug: over.id,
    title: over.id,
    description: '',
    categorySlug: 'kaarten',
    tags: [],
    priceCents: 350,
    vatRate: 0.21,
    images: [],
    stock: { tracked: false, quantity: 0, allowBackorder: false, lowStockThreshold: 3 },
    weightGrams: 20,
    shippingClass: 'letterbox',
    tierGroup: 'kaarten',
    addons: [],
    attributes: {},
    status: 'active',
    featured: false,
    sortOrder: 0,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

/** Kaarten: 1-4 vol tarief, 5-9 een tientje eraf, 10+ ruim 28% eraf. */
const kaartenTier: TierRule = {
  id: 'kaarten',
  name: 'Kaartenvoordeel',
  group: 'kaarten',
  active: true,
  steps: [
    { minQty: 5, unitPriceCents: 300 },
    { minQty: 10, unitPriceCents: 250 },
  ],
};

const rates: ShippingRate[] = [
  {
    id: 'brievenbus',
    name: 'Brievenbuspost',
    countries: ['NL'],
    shippingClasses: ['letterbox'],
    maxWeightGrams: 350,
    priceCents: 210,
    freeAboveCents: 3500,
    isPickup: false,
    sortOrder: 1,
    active: true,
  },
  {
    id: 'pakket',
    name: 'Pakketpost',
    countries: ['NL'],
    shippingClasses: ['letterbox', 'parcel'],
    maxWeightGrams: 10000,
    priceCents: 495,
    freeAboveCents: 5000,
    isPickup: false,
    sortOrder: 2,
    active: true,
  },
  {
    id: 'ophalen',
    name: 'Ophalen in Hardenberg',
    countries: ['NL'],
    shippingClasses: ['letterbox', 'parcel', 'pickup_only'],
    maxWeightGrams: null,
    priceCents: 0,
    freeAboveCents: null,
    isPickup: true,
    sortOrder: 3,
    active: true,
  },
];

function line(productId: string, qty: number, addons: { addonId: string; qty: number }[] = []): CartLine {
  return { id: makeLineId(productId, addons), productId, qty, addons };
}

function run(args: {
  lines: CartLine[];
  products: Product[];
  tierRules?: TierRule[];
  discountCode?: string | null;
  discount?: DiscountCode | null;
  shippingRateId?: string | null;
  country?: string;
  shippingRates?: ShippingRate[];
}) {
  return priceCart({
    cart: {
      id: 'cart1',
      lines: args.lines,
      discountCode: args.discountCode ?? null,
      shippingCountry: args.country ?? 'NL',
      shippingRateId: args.shippingRateId ?? null,
    },
    products: new Map(args.products.map((p) => [p.id, p])),
    tierRules: args.tierRules ?? [kaartenTier],
    shippingRates: args.shippingRates ?? rates,
    discount: args.discount ?? null,
    now: Date.UTC(2026, 8, 13),
  });
}

/* ------------------------------------------------------------------ *
 * Basis
 * ------------------------------------------------------------------ */

describe('winkelwagen doorrekenen', () => {
  it('rekent één kaart met brievenbuspost', () => {
    const a = product({ id: 'a' });
    const res = run({ lines: [line('a', 1)], products: [a] });

    expect(res.subtotalCents).toBe(350);
    expect(res.tierDiscountCents).toBe(0);
    expect(res.shippingRateId).toBe('brievenbus');
    expect(res.shippingCents).toBe(210);
    expect(res.totalCents).toBe(560);
    expect(res.itemCount).toBe(1);
  });

  it('kiest bezorgen als standaard, niet het gratis ophalen', () => {
    const res = run({ lines: [line('a', 1)], products: [product({ id: 'a' })] });
    expect(res.shippingRateId).toBe('brievenbus');
    // Ophalen staat wel als keuze in de lijst, maar onderaan.
    expect(res.shippingOptions.map((o) => o.id)).toEqual(['brievenbus', 'pakket', 'ophalen']);
  });

  it('respecteert een door de klant gekozen verzendmethode', () => {
    const res = run({
      lines: [line('a', 1)],
      products: [product({ id: 'a' })],
      shippingRateId: 'ophalen',
    });
    expect(res.shippingRateId).toBe('ophalen');
    expect(res.shippingCents).toBe(0);
    expect(res.totalCents).toBe(350);
  });
});

/* ------------------------------------------------------------------ *
 * Staffelvoordeel — de kernwens: over producten heen combineren
 * ------------------------------------------------------------------ */

describe('staffelvoordeel', () => {
  it('telt verschillende producten samen voor de staffel', () => {
    const a = product({ id: 'a' });
    const b = product({ id: 'b' });

    // 3 + 4 = 7 kaarten, dus de 5+-staffel van 3,00 geldt voor allebei.
    const res = run({ lines: [line('a', 3), line('b', 4)], products: [a, b] });

    expect(res.grossSubtotalCents).toBe(7 * 350);
    expect(res.subtotalCents).toBe(7 * 300);
    expect(res.tierDiscountCents).toBe(7 * 50);
    for (const l of res.lines) {
      expect(l.tierUnitPriceCents).toBe(300);
    }
  });

  it('geeft géén staffel onder de eerste drempel', () => {
    const res = run({
      lines: [line('a', 2), line('b', 2)],
      products: [product({ id: 'a' }), product({ id: 'b' })],
    });
    expect(res.tierDiscountCents).toBe(0);
    expect(res.subtotalCents).toBe(4 * 350);
  });

  it('schakelt naar de hoogste bereikte staffelstap', () => {
    const res = run({
      lines: [line('a', 6), line('b', 6)],
      products: [product({ id: 'a' }), product({ id: 'b' })],
    });
    expect(res.subtotalCents).toBe(12 * 250);
  });

  it('houdt staffelgroepen gescheiden', () => {
    const kaart = product({ id: 'kaart', tierGroup: 'kaarten' });
    const mok = product({ id: 'mok', tierGroup: 'mokken', priceCents: 1250, shippingClass: 'parcel' });

    const res = run({ lines: [line('kaart', 4), line('mok', 4)], products: [kaart, mok] });

    // 4 kaarten halen de staffel niet, de mokken hebben geen regel.
    expect(res.tierDiscountCents).toBe(0);
  });

  it('maakt een goedkoper product nooit duurder via een vaste staffelprijs', () => {
    const goedkoop = product({ id: 'goedkoop', priceCents: 275 });
    const normaal = product({ id: 'normaal', priceCents: 350 });

    const res = run({ lines: [line('goedkoop', 3), line('normaal', 3)], products: [goedkoop, normaal] });

    const cheapLine = res.lines.find((l) => l.productId === 'goedkoop')!;
    // Staffelprijs is 3,00; die mag de prijs van 2,75 niet verhogen.
    expect(cheapLine.tierUnitPriceCents).toBe(275);
    expect(cheapLine.tierDiscountCents).toBe(0);
  });

  it('werkt ook met een kortingspercentage in plaats van een vaste prijs', () => {
    const rule: TierRule = {
      ...kaartenTier,
      steps: [{ minQty: 5, discountPercent: 10 }],
    };
    const res = run({ lines: [line('a', 5)], products: [product({ id: 'a' })], tierRules: [rule] });
    expect(res.lines[0].tierUnitPriceCents).toBe(315);
    expect(res.subtotalCents).toBe(5 * 315);
  });

  it('vertelt hoeveel de volgende staffelstap oplevert', () => {
    const res = run({
      lines: [line('a', 2), line('b', 1)],
      products: [product({ id: 'a' }), product({ id: 'b' })],
    });

    const progress = res.tierProgress.find((p) => p.group === 'kaarten')!;
    expect(progress.currentQty).toBe(3);
    expect(progress.currentDiscountPercent).toBe(0);
    expect(progress.next?.minQty).toBe(5);
    expect(progress.next?.qtyNeeded).toBe(2);
    // De 3 huidige kaarten zouden 50 cent per stuk goedkoper worden.
    expect(progress.next?.extraSavingCents).toBe(150);
  });

  it('toont de staffeltabel op de productpagina', () => {
    const rows = tierPreviewForProduct(product({ id: 'a' }), kaartenTier);
    expect(rows).toEqual([
      { minQty: 5, unitPriceCents: 300, discountPercent: 14 },
      { minQty: 10, unitPriceCents: 250, discountPercent: 29 },
    ]);
  });
});

/* ------------------------------------------------------------------ *
 * Add-ons
 * ------------------------------------------------------------------ */

describe('add-ons', () => {
  const metEnvelop = product({
    id: 'kaart',
    addons: [
      { id: 'envelop', label: 'Met envelop', priceCents: 35, maxQty: 1, weightGrams: 6 },
      { id: 'postzegel', label: 'Postzegel erbij', priceCents: 115, maxQty: 5 },
    ],
  });

  it('rekent add-ons per stuk product', () => {
    const res = run({
      lines: [line('kaart', 2, [{ addonId: 'envelop', qty: 1 }])],
      products: [metEnvelop],
    });
    const l = res.lines[0];
    expect(l.addonsUnitTotalCents).toBe(35);
    expect(l.lineTotalCents).toBe((350 + 35) * 2);
  });

  it('geeft geen staffelkorting op add-ons', () => {
    const res = run({
      lines: [line('kaart', 5, [{ addonId: 'envelop', qty: 1 }])],
      products: [metEnvelop],
    });
    const l = res.lines[0];
    expect(l.tierUnitPriceCents).toBe(300);
    // 5 x (3,00 kaart + 0,35 envelop) — de envelop blijft 0,35.
    expect(l.lineTotalCents).toBe(5 * 335);
    expect(l.tierDiscountCents).toBe(5 * 50);
  });

  it('begrenst een add-on op zijn maximum', () => {
    const res = run({
      lines: [line('kaart', 1, [{ addonId: 'postzegel', qty: 99 }])],
      products: [metEnvelop],
    });
    expect(res.lines[0].addons[0].qty).toBe(5);
  });

  it('negeert een add-on die niet bij het product hoort', () => {
    const res = run({
      lines: [line('kaart', 1, [{ addonId: 'bestaatniet', qty: 1 }])],
      products: [metEnvelop],
    });
    expect(res.lines[0].addons).toHaveLength(0);
    expect(res.lines[0].lineTotalCents).toBe(350);
  });

  it('laat het gewicht van add-ons meewegen in de verzendkeuze', () => {
    // 20g kaart + 6g envelop = 26g per stuk. 14 stuks = 364g, boven de 350g
    // van de brievenbus, dus alleen pakketpost blijft over.
    const res = run({
      lines: [line('kaart', 14, [{ addonId: 'envelop', qty: 1 }])],
      products: [metEnvelop],
    });
    expect(res.totalWeightGrams).toBe(364);
    expect(res.shippingOptions.map((o) => o.id)).not.toContain('brievenbus');
    expect(res.shippingRateId).toBe('pakket');
  });

  it('geeft dezelfde keuze hetzelfde regel-id, en een andere keuze een nieuwe regel', () => {
    expect(makeLineId('k', [{ addonId: 'envelop', qty: 1 }])).toBe(
      makeLineId('k', [{ addonId: 'envelop', qty: 1 }]),
    );
    expect(makeLineId('k', [{ addonId: 'a', qty: 1 }, { addonId: 'b', qty: 2 }])).toBe(
      makeLineId('k', [{ addonId: 'b', qty: 2 }, { addonId: 'a', qty: 1 }]),
    );
    expect(makeLineId('k', [{ addonId: 'envelop', qty: 1 }])).not.toBe(makeLineId('k', []));
    expect(makeLineId('k', [{ addonId: 'envelop', qty: 0 }])).toBe(makeLineId('k', []));
  });
});

/* ------------------------------------------------------------------ *
 * Verzendkosten
 * ------------------------------------------------------------------ */

describe('verzendkosten', () => {
  it('sluit brievenbuspost uit zodra er een pakketproduct in de wagen zit', () => {
    const kaart = product({ id: 'kaart' });
    const mok = product({ id: 'mok', shippingClass: 'parcel', weightGrams: 400, tierGroup: null });

    const res = run({ lines: [line('kaart', 1), line('mok', 1)], products: [kaart, mok] });
    expect(res.shippingOptions.map((o) => o.id)).toEqual(['pakket', 'ophalen']);
  });

  it('laat alleen ophalen over bij een product dat niet verzonden kan worden', () => {
    const groot = product({ id: 'groot', shippingClass: 'pickup_only', tierGroup: null });
    const res = run({ lines: [line('groot', 1)], products: [groot] });
    expect(res.shippingOptions.map((o) => o.id)).toEqual(['ophalen']);
    expect(res.shippingCents).toBe(0);
  });

  it('rekent geen verzending voor een puur digitale bestelling', () => {
    const digitaal = product({ id: 'pdf', shippingClass: 'digital', weightGrams: 0, tierGroup: null });
    const res = run({ lines: [line('pdf', 1)], products: [digitaal] });
    expect(res.shippingOptions).toHaveLength(0);
    expect(res.shippingCents).toBe(0);
    expect(res.totalCents).toBe(350);
  });

  it('maakt verzending gratis boven de drempel', () => {
    // 12 kaarten x 2,50 = 30,00 ... nog niet boven de 35,00 van de brievenbus.
    const onder = run({ lines: [line('a', 12)], products: [product({ id: 'a', weightGrams: 20 })] });
    expect(onder.shippingCents).toBe(210);

    // 14 kaarten x 2,50 = 35,00 — precies op de drempel, dus gratis.
    const op = run({ lines: [line('a', 14)], products: [product({ id: 'a', weightGrams: 20 })] });
    expect(op.subtotalCents).toBe(3500);
    expect(op.shippingCents).toBe(0);
    expect(op.shippingOptions.find((o) => o.id === 'brievenbus')?.freeBecauseOfThreshold).toBe(true);
  });

  it('kijkt voor de gratis-drempel naar het bedrag ná kortingscode', () => {
    const code: DiscountCode = {
      code: 'TIEN',
      type: 'percent',
      value: 10,
      minOrderCents: 0,
      maxUses: null,
      usedCount: 0,
      appliesToCategorySlugs: [],
      active: true,
    };
    // 14 kaarten = 35,00, met 10% korting 31,50 — dus onder de drempel.
    const res = run({
      lines: [line('a', 14)],
      products: [product({ id: 'a' })],
      discountCode: 'TIEN',
      discount: code,
    });
    expect(res.discountCents).toBe(350);
    expect(res.shippingCents).toBe(210);
  });

  it('valt terug op een geldige methode als de gekozen methode niet meer kan', () => {
    const mok = product({ id: 'mok', shippingClass: 'parcel', tierGroup: null, weightGrams: 400 });
    const res = run({ lines: [line('mok', 1)], products: [mok], shippingRateId: 'brievenbus' });
    expect(res.shippingRateId).toBe('pakket');
  });

  it('biedt geen verzending naar een land zonder tarief', () => {
    const res = run({ lines: [line('a', 1)], products: [product({ id: 'a' })], country: 'DE' });
    expect(res.shippingOptions).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ *
 * Kortingscodes
 * ------------------------------------------------------------------ */

describe('kortingscodes', () => {
  const base: DiscountCode = {
    code: 'X',
    type: 'percent',
    value: 10,
    minOrderCents: 0,
    maxUses: null,
    usedCount: 0,
    appliesToCategorySlugs: [],
    active: true,
  };

  it('rekent een percentage over het bedrag ná staffelvoordeel', () => {
    const res = run({
      lines: [line('a', 5)],
      products: [product({ id: 'a' })],
      discountCode: 'X',
      discount: base,
    });
    // 5 x 3,00 = 15,00 -> 10% = 1,50
    expect(res.subtotalCents).toBe(1500);
    expect(res.discountCents).toBe(150);
    expect(res.totalCents).toBe(1500 - 150 + 210);
  });

  it('trekt een vast bedrag af, maar nooit meer dan het bestelbedrag', () => {
    const res = run({
      lines: [line('a', 1)],
      products: [product({ id: 'a' })],
      discountCode: 'X',
      discount: { ...base, type: 'fixed', value: 1000 },
    });
    expect(res.discountCents).toBe(350);
    expect(res.totalCents).toBe(210); // alleen nog verzendkosten
  });

  it('weigert onder het minimumbedrag en legt uit waarom', () => {
    const res = run({
      lines: [line('a', 1)],
      products: [product({ id: 'a' })],
      discountCode: 'X',
      discount: { ...base, minOrderCents: 2000 },
    });
    expect(res.discountCents).toBe(0);
    expect(res.discountError).toContain('20,00');
  });

  it('weigert een verlopen code', () => {
    const res = run({
      lines: [line('a', 1)],
      products: [product({ id: 'a' })],
      discountCode: 'X',
      discount: { ...base, validUntil: Date.UTC(2026, 0, 1) },
    });
    expect(res.discountError).toContain('verlopen');
  });

  it('weigert een code die zijn maximum aantal keer is gebruikt', () => {
    const res = run({
      lines: [line('a', 1)],
      products: [product({ id: 'a' })],
      discountCode: 'X',
      discount: { ...base, maxUses: 5, usedCount: 5 },
    });
    expect(res.discountError).toContain('al gebruikt');
  });

  it('rekent een categoriegebonden code alleen over die categorie', () => {
    const kaart = product({ id: 'kaart', categorySlug: 'kaarten' });
    const mok = product({ id: 'mok', categorySlug: 'cadeaus', priceCents: 1000, tierGroup: null });

    const res = run({
      lines: [line('kaart', 1), line('mok', 1)],
      products: [kaart, mok],
      discountCode: 'X',
      discount: { ...base, value: 50, appliesToCategorySlugs: ['cadeaus'] },
    });
    // 50% over alleen de mok van 10,00.
    expect(res.discountCents).toBe(500);
  });

  it('meldt het als een code niets in de wagen raakt', () => {
    const res = run({
      lines: [line('a', 1)],
      products: [product({ id: 'a', categorySlug: 'kaarten' })],
      discountCode: 'X',
      discount: { ...base, appliesToCategorySlugs: ['cadeaus'] },
    });
    expect(res.discountCents).toBe(0);
    expect(res.discountError).toContain('geldt niet voor de producten');
  });

  it('maakt verzending gratis met een free_shipping-code', () => {
    const res = run({
      lines: [line('a', 1)],
      products: [product({ id: 'a' })],
      discountCode: 'X',
      discount: { ...base, type: 'free_shipping', value: 0 },
    });
    expect(res.discountCents).toBe(0);
    expect(res.shippingCents).toBe(0);
    expect(res.totalCents).toBe(350);
  });

  it('meldt een onbekende code', () => {
    const res = run({
      lines: [line('a', 1)],
      products: [product({ id: 'a' })],
      discountCode: 'ONZIN',
      discount: null,
    });
    expect(res.discountError).toContain('kennen we niet');
  });
});

/* ------------------------------------------------------------------ *
 * Voorraad
 * ------------------------------------------------------------------ */

describe('voorraad', () => {
  it('meldt uitverkocht', () => {
    const p = product({
      id: 'a',
      stock: { tracked: true, quantity: 0, allowBackorder: false, lowStockThreshold: 3 },
    });
    const res = run({ lines: [line('a', 1)], products: [p] });
    expect(res.lines[0].stockIssue).toBe('out_of_stock');
    expect(res.hasStockIssues).toBe(true);
  });

  it('meldt te weinig voorraad en noemt het maximum', () => {
    const p = product({
      id: 'a',
      stock: { tracked: true, quantity: 3, allowBackorder: false, lowStockThreshold: 3 },
    });
    const res = run({ lines: [line('a', 5)], products: [p] });
    expect(res.lines[0].stockIssue).toBe('insufficient');
    expect(res.lines[0].maxQty).toBe(3);
  });

  it('telt twee regels van hetzelfde product samen tegen de voorraad', () => {
    const p = product({
      id: 'a',
      stock: { tracked: true, quantity: 4, allowBackorder: false, lowStockThreshold: 3 },
      addons: [{ id: 'envelop', label: 'Met envelop', priceCents: 35, maxQty: 1 }],
    });
    // 3 zonder envelop + 3 met envelop = 6 stuks uit een voorraad van 4.
    const res = run({
      lines: [line('a', 3), line('a', 3, [{ addonId: 'envelop', qty: 1 }])],
      products: [p],
    });
    expect(res.lines.every((l) => l.stockIssue === 'insufficient')).toBe(true);
    expect(res.lines[0].maxQty).toBe(4);
  });

  it('laat doorverkopen toe als backorder aanstaat', () => {
    const p = product({
      id: 'a',
      stock: { tracked: true, quantity: 0, allowBackorder: true, lowStockThreshold: 3 },
    });
    const res = run({ lines: [line('a', 5)], products: [p] });
    expect(res.lines[0].stockIssue).toBeUndefined();
    expect(res.hasStockIssues).toBe(false);
  });

  it('houdt een verdwenen product zichtbaar maar rekent het niet mee', () => {
    const res = run({ lines: [line('weg', 2), line('a', 1)], products: [product({ id: 'a' })] });
    const weg = res.lines.find((l) => l.productId === 'weg')!;
    expect(weg.stockIssue).toBe('unavailable');
    expect(weg.lineTotalCents).toBe(0);
    expect(res.subtotalCents).toBe(350);
    expect(res.itemCount).toBe(1);
  });

  it('behandelt een product op concept als niet beschikbaar', () => {
    const res = run({ lines: [line('a', 1)], products: [product({ id: 'a', status: 'draft' })] });
    expect(res.lines[0].stockIssue).toBe('unavailable');
  });
});

/* ------------------------------------------------------------------ *
 * Btw en afronding
 * ------------------------------------------------------------------ */

describe('btw en afronding', () => {
  it('haalt de btw uit een brutobedrag', () => {
    expect(vatFromGross(12100, 0.21)).toBe(2100);
    expect(vatFromGross(10900, 0.09)).toBe(900);
    expect(vatFromGross(5000, 0)).toBe(0);
  });

  it('splitst de btw per tarief en telt de verzendkosten bij het hoogste tarief', () => {
    const rows = buildVatBreakdown(
      [
        { grossCents: 12100, rate: 0.21 },
        { grossCents: 10900, rate: 0.09 },
      ],
      495,
    );
    expect(rows.map((r) => r.rate)).toEqual([0.21, 0.09]);
    expect(rows[0].baseCents + rows[0].vatCents).toBe(12100 + 495);
    expect(rows[1].baseCents + rows[1].vatCents).toBe(10900);
  });

  it('verdeelt een korting tot op de cent, zonder verlies', () => {
    const shares = distributeProportionally(100, [333, 333, 334]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);

    const awkward = distributeProportionally(1, [1, 1, 1]);
    expect(awkward.reduce((a, b) => a + b, 0)).toBe(1);

    expect(distributeProportionally(500, [0, 0])).toEqual([0, 0]);
  });

  it('laat de btw-specificatie kloppen met het ordertotaal', () => {
    const kaart = product({ id: 'kaart', vatRate: 0.21 });
    const boek = product({ id: 'boek', vatRate: 0.09, priceCents: 1995, tierGroup: null, shippingClass: 'parcel' });
    const code: DiscountCode = {
      code: 'X',
      type: 'percent',
      value: 15,
      minOrderCents: 0,
      maxUses: null,
      usedCount: 0,
      appliesToCategorySlugs: [],
      active: true,
    };

    const res = run({
      lines: [line('kaart', 6), line('boek', 1)],
      products: [kaart, boek],
      discountCode: 'X',
      discount: code,
    });

    const vatSum = res.vatBreakdown.reduce((s, r) => s + r.baseCents + r.vatCents, 0);
    expect(vatSum).toBe(res.totalCents);
  });

  it('leest door mensen getypte bedragen', () => {
    expect(parseMoneyToCents('12,50')).toBe(1250);
    expect(parseMoneyToCents('€ 12,50')).toBe(1250);
    expect(parseMoneyToCents('12.50')).toBe(1250);
    expect(parseMoneyToCents('1.250,00')).toBe(125000);
    expect(parseMoneyToCents('3')).toBe(300);
    expect(parseMoneyToCents('')).toBeNull();
    expect(parseMoneyToCents('appel')).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * Lege wagen
 * ------------------------------------------------------------------ */

describe('lege winkelwagen', () => {
  it('geeft nette nullen terug', () => {
    const res = run({ lines: [], products: [] });
    expect(res.itemCount).toBe(0);
    expect(res.subtotalCents).toBe(0);
    expect(res.totalCents).toBe(0);
    expect(res.shippingOptions).toHaveLength(0);
    expect(res.vatBreakdown).toHaveLength(0);
    expect(res.hasStockIssues).toBe(false);
  });
});
