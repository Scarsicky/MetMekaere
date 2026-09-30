import type {
  Category,
  DialectEntry,
  DiscountCode,
  Happening,
  Product,
  ShippingRate,
  TierRule,
} from '@/types';

/**
 * Startinhoud voor de webshop.
 *
 * Alles hier is bedoeld om meteen aan te passen of weg te gooien: het laat
 * zien hoe de onderdelen samenwerken (staffel, add-ons, voorraad, verzending)
 * en geeft de site iets om te tonen zolang de echte producten er nog niet zijn.
 *
 * De teksten gebruiken bewust alleen woorden uit de eigen merktaal. Er is
 * geen dialect verzonnen — op één woord na, dat uit de naam zelf komt.
 */

const now = Date.now();

/* ------------------------------------------------------------------ *
 * Categorieën
 * ------------------------------------------------------------------ */

export const seedCategories: Category[] = [
  {
    id: 'kaarten',
    slug: 'kaarten',
    name: 'Kaarten',
    description: 'Om zomaar te sturen, of juist omdat er iets te zeggen valt.',
    sortOrder: 1,
    active: true,
    seo: {
      title: 'Kaarten om te sturen',
      description:
        'Kaarten van Met Mekaere: om zomaar te sturen, of juist omdat er iets te zeggen valt. Hoe meer je er stuurt, hoe voordeliger.',
    },
  },
  {
    id: 'dialect',
    slug: 'dialect',
    name: 'Dialectkaarten',
    description: 'Een woord van hier, op de mat bij iemand die het begrijpt.',
    sortOrder: 2,
    active: true,
    seo: {
      title: 'Dialectkaarten',
      description: 'Kaarten met een woord van hier. Stuur iemand iets dat alleen wij begrijpen.',
    },
  },
  {
    id: 'cadeaus',
    slug: 'cadeaus',
    name: 'Kleine cadeaus',
    description: 'Iets kleins om mee te geven of achter te laten.',
    sortOrder: 3,
    active: true,
  },
];

/* ------------------------------------------------------------------ *
 * Staffelvoordeel
 *
 * Dit is de regel die de kernwens invult: kaarten uit verschillende
 * ontwerpen tellen bij elkaar op. 3 van de een + 4 van de ander = 7 kaarten,
 * dus allemaal voor het 5+-tarief.
 * ------------------------------------------------------------------ */

export const seedTierRules: TierRule[] = [
  {
    id: 'kaarten',
    name: 'Kaartenvoordeel',
    description: 'Geldt over alle kaarten samen — ook als je verschillende ontwerpen kiest.',
    group: 'kaarten',
    active: true,
    steps: [
      { minQty: 5, unitPriceCents: 300 },
      { minQty: 10, unitPriceCents: 275 },
      { minQty: 20, unitPriceCents: 250 },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Verzending
 * ------------------------------------------------------------------ */

export const seedShippingRates: ShippingRate[] = [
  {
    id: 'brievenbus-nl',
    name: 'Brievenbuspost',
    description: 'Past door de brievenbus, je hoeft er niet voor thuis te zijn.',
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
    id: 'pakket-nl',
    name: 'Pakketpost',
    description: 'Met Track & Trace, meestal de volgende werkdag in huis.',
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
    id: 'brievenbus-be',
    name: 'Brievenbuspost België',
    countries: ['BE'],
    shippingClasses: ['letterbox'],
    maxWeightGrams: 350,
    priceCents: 425,
    freeAboveCents: null,
    isPickup: false,
    sortOrder: 3,
    active: true,
  },
  {
    id: 'pakket-be',
    name: 'Pakketpost België',
    countries: ['BE'],
    shippingClasses: ['letterbox', 'parcel'],
    maxWeightGrams: 10000,
    priceCents: 895,
    freeAboveCents: null,
    isPickup: false,
    sortOrder: 4,
    active: true,
  },
  {
    id: 'ophalen',
    name: 'Zelf ophalen',
    description: 'Gratis. Je krijgt een mailtje zodra je bestelling klaarligt.',
    countries: ['NL', 'BE'],
    shippingClasses: ['letterbox', 'parcel', 'pickup_only'],
    maxWeightGrams: null,
    priceCents: 0,
    freeAboveCents: null,
    isPickup: true,
    sortOrder: 5,
    active: true,
  },
];

/* ------------------------------------------------------------------ *
 * Producten
 * ------------------------------------------------------------------ */

/** Elke kaart krijgt dezelfde keuzes: envelop erbij, of meteen laten versturen. */
const kaartAddons = [
  {
    id: 'envelop',
    label: 'Met envelop',
    description: 'Een bijpassende envelop, zodat de kaart zo op de bus kan.',
    priceCents: 35,
    maxQty: 1,
    weightGrams: 6,
    group: null,
  },
  {
    id: 'blanco',
    label: 'Blanco laten',
    description: 'Wij schrijven niets; jij hebt de pen.',
    priceCents: 0,
    maxQty: 1,
    group: null,
  },
];

function kaart(over: Partial<Product> & { id: string; title: string }): Product {
  return {
    slug: over.id,
    subtitle: 'Dubbele kaart, A6',
    description: '',
    categorySlug: 'kaarten',
    tags: ['kaart'],
    priceCents: 350,
    vatRate: 0.21,
    images: [],
    stock: { tracked: true, quantity: 40, allowBackorder: false, lowStockThreshold: 5 },
    weightGrams: 14,
    shippingClass: 'letterbox',
    tierGroup: 'kaarten',
    addons: kaartAddons,
    attributes: { formaat: ['A6'] },
    status: 'active',
    featured: false,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

export const seedProducts: Product[] = [
  kaart({
    id: 'kaart-veur-mekaere',
    title: 'Veur mekaere',
    shortDescription: 'De zin waar alles mee begon, om door te sturen.',
    description:
      'Een kaart met de woorden waar Met Mekaere mee begon: **veur wat meer aandacht veur mekaere**.\n\n' +
      'Stuur hem naar iemand die wel wat aandacht kan gebruiken, of gewoon naar iemand aan wie je moest denken. ' +
      'Geen aanleiding nodig — dat is juist het leuke.\n\n' +
      '- Dubbele kaart, A6 (10,5 × 14,8 cm)\n' +
      '- Gedrukt op stevig, ongestreken papier\n' +
      '- Binnenkant blanco, ruimte genoeg voor je eigen woorden',
    categorySlug: 'dialect',
    tags: ['kaart', 'dialect', 'zomaar'],
    attributes: { formaat: ['A6'], thema: ['Zomaar'] },
    featured: true,
    sortOrder: 1,
  }),
  kaart({
    id: 'kaart-samen-verbinden',
    title: 'Samen verbinden',
    shortDescription: 'Voor iemand die je even dichterbij wilt halen.',
    description:
      'Soms is het genoeg om te laten weten dat je aan iemand denkt. Deze kaart doet precies dat.\n\n' +
      '- Dubbele kaart, A6 (10,5 × 14,8 cm)\n' +
      '- Binnenkant blanco',
    tags: ['kaart', 'zomaar'],
    attributes: { formaat: ['A6'], thema: ['Zomaar'] },
    featured: true,
    sortOrder: 2,
  }),
  kaart({
    id: 'kaart-gewoon-effe-denken-aan-jou',
    title: 'Gewoon even aan je gedacht',
    shortDescription: 'Zonder aanleiding, en juist daarom leuk om te krijgen.',
    description:
      'De kaart die je stuurt zonder dat er iets te vieren valt. Precies daarom komt hij aan.\n\n' +
      '- Dubbele kaart, A6\n' +
      '- Binnenkant blanco',
    tags: ['kaart', 'zomaar'],
    attributes: { formaat: ['A6'], thema: ['Zomaar'] },
    featured: true,
    sortOrder: 3,
  }),
  kaart({
    id: 'kaart-sterkte',
    title: 'Sterkte',
    shortDescription: 'Voor als er even geen woorden zijn.',
    description:
      'Voor die momenten waarop je niet goed weet wat je moet zeggen, maar wél iets wilt laten horen.\n\n' +
      '- Dubbele kaart, A6\n' +
      '- Binnenkant blanco',
    tags: ['kaart', 'sterkte'],
    attributes: { formaat: ['A6'], thema: ['Sterkte'] },
    featured: true,
    sortOrder: 4,
  }),
  kaart({
    id: 'kaart-gefeliciteerd',
    title: 'Gefeliciteerd',
    shortDescription: 'Voor de verjaardagen die je niet wilt vergeten.',
    description: 'Een verjaardagskaart zonder toeters, met ruimte voor je eigen woorden.\n\n- Dubbele kaart, A6',
    tags: ['kaart', 'verjaardag'],
    attributes: { formaat: ['A6'], thema: ['Verjaardag'] },
    sortOrder: 5,
  }),
  kaart({
    id: 'kaart-bedankt',
    title: 'Bedankt',
    shortDescription: 'Omdat iemand iets deed wat niet vanzelfsprekend was.',
    description: 'Voor de buurvrouw, de vrijwilliger, of wie dan ook die iets deed zonder dat het hoefde.\n\n- Dubbele kaart, A6',
    tags: ['kaart', 'bedankt'],
    attributes: { formaat: ['A6'], thema: ['Bedankt'] },
    sortOrder: 6,
  }),
  {
    id: 'kaartenset-vijf',
    slug: 'kaartenset-vijf',
    title: 'Kaartenset — vijf kaarten',
    subtitle: 'Vijf kaarten met enveloppen',
    shortDescription: 'Een setje om in de la te leggen, zodat je altijd iets bij de hand hebt.',
    description:
      'Vijf kaarten met enveloppen, klaar om te sturen. Handig om in huis te hebben: dan hoef je nooit meer ' +
      'op het laatste moment iets te zoeken.\n\n' +
      '- Vijf verschillende ontwerpen\n' +
      '- Inclusief vijf enveloppen\n' +
      '- Geleverd in een omslag',
    categorySlug: 'kaarten',
    tags: ['kaart', 'set', 'cadeau'],
    priceCents: 1450,
    compareAtPriceCents: 1925,
    vatRate: 0.21,
    images: [],
    stock: { tracked: true, quantity: 25, allowBackorder: false, lowStockThreshold: 3 },
    weightGrams: 105,
    shippingClass: 'letterbox',
    // Een set telt niet mee in de kaartenstaffel: het voordeel zit er al in.
    tierGroup: null,
    addons: [],
    attributes: { formaat: ['A6'], thema: ['Cadeau'] },
    status: 'active',
    featured: true,
    sortOrder: 7,
    createdAt: now,
    updatedAt: now,
  },
];

/* ------------------------------------------------------------------ *
 * Kortingscodes
 * ------------------------------------------------------------------ */

export const seedDiscountCodes: DiscountCode[] = [
  {
    code: 'WELKOM10',
    description: '10% welkomstkorting',
    type: 'percent',
    value: 10,
    minOrderCents: 1000,
    maxUses: null,
    usedCount: 0,
    validFrom: null,
    validUntil: null,
    appliesToCategorySlugs: [],
    active: true,
  },
  {
    code: 'GRATISVERZENDING',
    description: 'Gratis verzending',
    type: 'free_shipping',
    value: 0,
    minOrderCents: 2000,
    maxUses: 100,
    usedCount: 0,
    validFrom: null,
    validUntil: null,
    appliesToCategorySlugs: [],
    active: true,
  },
];

/* ------------------------------------------------------------------ *
 * Fluffy Dialect
 *
 * Eén woord, en dat is met opzet: 'mekaere' komt uit de naam zelf en staat
 * dus vast. De rest van het woordenboek vul je zelf aan in de admin — dat
 * zijn jouw woorden, die wil je niet door een computer laten verzinnen.
 * ------------------------------------------------------------------ */

export const seedDialect: DialectEntry[] = [
  {
    id: 'mekaere',
    word: 'mekaere',
    meaning: 'elkaar',
    example: 'Veur wat meer aandacht veur mekaere.',
    exampleTranslation: 'Voor wat meer aandacht voor elkaar.',
    kind: 'voornaamwoord',
    audioPath: null,
    audioUrl: null,
    productSlug: 'kaart-veur-mekaere',
    featured: true,
    status: 'published',
    createdAt: now,
    updatedAt: now,
  },
];

/* ------------------------------------------------------------------ *
 * Doen en Beleven
 *
 * Drie voorbeelden in de stijl van wat er in de eerste Dorpse Adventskalender
 * gebeurde. Pas ze aan of gooi ze weg zodra je eigen activiteiten er staan.
 * ------------------------------------------------------------------ */

function inDays(days: number): string {
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const seedHappenings: Happening[] = [
  {
    id: 'samen-koffie',
    slug: 'samen-koffie',
    title: 'Koffie-uurtje: gewoon binnenlopen',
    summary:
      'Een uurtje koffie waar je zonder afspraak binnen kunt lopen. Niemand hoeft iets, iedereen mag aanschuiven.',
    body:
      'Je hoeft je niet op te geven en je hoeft niemand te kennen. Er staat koffie, er is thee, en er zit ' +
      'altijd wel iemand aan tafel.\n\n' +
      'Kom je alleen? Prima. De kans is groot dat je niet alleen weer naar buiten gaat.',
    images: [],
    theme: 'Eten & Drinken',
    location: 'Het dorpshuis',
    date: inDays(12),
    startTime: '10:00',
    endTime: '11:30',
    priceLabel: 'Gratis, koffie voor eigen rekening',
    signupUrl: null,
    membersOnly: false,
    status: 'published',
    featured: true,
    sortOrder: 1,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'samen-iets-maken',
    slug: 'samen-iets-maken',
    title: 'Samen iets maken',
    summary: 'Een avond met je handen bezig zijn, en ondertussen praten met wie er naast je zit.',
    body:
      'Materialen staan klaar, iemand laat zien hoe het werkt en verder zoek je het lekker zelf uit.\n\n' +
      'Het gaat niet om het resultaat. Het gaat om de twee uur ertussen.',
    images: [],
    theme: 'Maken & Leren',
    location: 'Wordt bekendgemaakt',
    date: inDays(34),
    startTime: '19:30',
    endTime: '22:00',
    priceLabel: 'Bijdrage voor materialen',
    signupUrl: null,
    membersOnly: false,
    status: 'published',
    featured: false,
    sortOrder: 2,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'ommetje-door-het-veld',
    slug: 'ommetje-door-het-veld',
    title: 'Ommetje door het veld',
    summary: 'Een wandeling van een uur of anderhalf, in het tempo van wie het langzaamst loopt.',
    body:
      'Naar buiten, het seizoen achterna. We lopen een rondje en onderweg ontstaan de gesprekken vanzelf.\n\n' +
      'Stevige schoenen aan, de rest komt goed.',
    images: [],
    theme: 'Buiten & Natuur',
    location: 'Vertrek vanaf de kerk',
    date: inDays(48),
    startTime: '14:00',
    endTime: '15:30',
    priceLabel: 'Gratis',
    signupUrl: null,
    membersOnly: false,
    status: 'published',
    featured: false,
    sortOrder: 3,
    createdAt: now,
    updatedAt: now,
  },
];
