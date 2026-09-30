import 'server-only';

import type {
  AdventSettings,
  Block,
  Category,
  CommunitySettings,
  DialectEntry,
  DiscountCode,
  GeneralSettings,
  Happening,
  Millis,
  Product,
  ProductAddon,
  ShippingClass,
  ShippingRate,
  ShopSettings,
  StoredImage,
  TierRule,
} from '@/types';

/**
 * Firestore-documenten omzetten naar het domeinmodel.
 *
 * Deze laag is bewust vergevingsgezind: een document dat de admin half heeft
 * ingevuld, of dat uit een oudere versie van het schema komt, mag geen pagina
 * laten klappen. Alles krijgt een verdedigbare standaardwaarde.
 */

type Raw = Record<string, unknown>;

/* ------------------------------------------------------------------ *
 * Primitieven
 * ------------------------------------------------------------------ */

/** Firestore Timestamp, Date, millis of ISO-string -> millis. */
export function toMillis(value: unknown, fallback: Millis = 0): Millis {
  if (value == null) return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function optionalStr(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/** Geldbedragen moeten hele centen zijn, wat er ook in het document staat. */
function cents(value: unknown, fallback = 0): number {
  return Math.round(num(value, fallback));
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

function array(value: unknown): Raw[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is Raw => typeof v === 'object' && v !== null);
}

function nullableMillis(value: unknown): Millis | null {
  if (value == null) return null;
  const millis = toMillis(value, 0);
  return millis === 0 ? null : millis;
}

/* ------------------------------------------------------------------ *
 * Samengestelde velden
 * ------------------------------------------------------------------ */

export function normalizeImage(raw: unknown): StoredImage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Raw;
  const url = str(r.url);
  if (!url) return null;
  return {
    path: str(r.path),
    url,
    alt: str(r.alt),
    width: typeof r.width === 'number' ? r.width : undefined,
    height: typeof r.height === 'number' ? r.height : undefined,
  };
}

function normalizeImages(raw: unknown): StoredImage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeImage).filter((i): i is StoredImage => i !== null);
}

export function normalizeSeo(raw: unknown) {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as Raw;
  const seo = {
    title: optionalStr(r.title),
    description: optionalStr(r.description),
    ogImage: optionalStr(r.ogImage),
    noIndex: bool(r.noIndex, false) || undefined,
  };
  return Object.values(seo).some((v) => v !== undefined) ? seo : undefined;
}

const SHIPPING_CLASSES: ShippingClass[] = ['letterbox', 'parcel', 'digital', 'pickup_only'];

function normalizeShippingClass(raw: unknown, fallback: ShippingClass = 'parcel'): ShippingClass {
  return SHIPPING_CLASSES.includes(raw as ShippingClass) ? (raw as ShippingClass) : fallback;
}

function normalizeAddons(raw: unknown): ProductAddon[] {
  return array(raw)
    .map((a, i) => ({
      id: str(a.id) || `addon-${i + 1}`,
      label: str(a.label, 'Extra'),
      description: optionalStr(a.description),
      priceCents: cents(a.priceCents),
      maxQty: Math.max(1, Math.round(num(a.maxQty, 1))),
      required: bool(a.required, false) || undefined,
      group: optionalStr(a.group) ?? null,
      weightGrams: typeof a.weightGrams === 'number' ? a.weightGrams : undefined,
    }))
    .filter((a) => a.label.length > 0);
}

/** `{ thema: ['kerst'] }` — losse strings worden een lijst van één. */
function normalizeAttributes(raw: unknown): Record<string, string[]> {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw as Raw)) {
    if (typeof value === 'string' && value) out[key] = [value];
    else if (Array.isArray(value)) {
      const list = strArray(value);
      if (list.length) out[key] = list;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Catalogus
 * ------------------------------------------------------------------ */

export function normalizeProduct(id: string, raw: Raw): Product {
  const priceCents = cents(raw.priceCents);
  const compareAt = raw.compareAtPriceCents == null ? null : cents(raw.compareAtPriceCents);
  const stock = (typeof raw.stock === 'object' && raw.stock !== null ? raw.stock : {}) as Raw;

  return {
    id,
    slug: str(raw.slug, id),
    title: str(raw.title, 'Zonder titel'),
    subtitle: optionalStr(raw.subtitle),
    shortDescription: optionalStr(raw.shortDescription),
    description: str(raw.description),
    categorySlug: str(raw.categorySlug, 'overig'),
    tags: strArray(raw.tags),
    priceCents,
    // Een was-prijs die niet hoger is dan de prijs zegt niets; laat hem weg.
    compareAtPriceCents: compareAt !== null && compareAt > priceCents ? compareAt : null,
    vatRate: num(raw.vatRate, 0.21),
    images: normalizeImages(raw.images),
    stock: {
      tracked: bool(stock.tracked, false),
      quantity: Math.round(num(stock.quantity, 0)),
      allowBackorder: bool(stock.allowBackorder, false),
      lowStockThreshold: Math.round(num(stock.lowStockThreshold, 3)),
    },
    weightGrams: Math.max(0, Math.round(num(raw.weightGrams, 0))),
    shippingClass: normalizeShippingClass(raw.shippingClass),
    tierGroup: optionalStr(raw.tierGroup) ?? null,
    addons: normalizeAddons(raw.addons),
    attributes: normalizeAttributes(raw.attributes),
    seo: normalizeSeo(raw.seo),
    status:
      raw.status === 'draft' || raw.status === 'archived' || raw.status === 'active'
        ? raw.status
        : 'draft',
    featured: bool(raw.featured, false),
    sortOrder: num(raw.sortOrder, 0),
    createdAt: toMillis(raw.createdAt),
    updatedAt: toMillis(raw.updatedAt),
  };
}

export function normalizeCategory(id: string, raw: Raw): Category {
  return {
    id,
    slug: str(raw.slug, id),
    name: str(raw.name, 'Zonder naam'),
    description: optionalStr(raw.description),
    image: normalizeImage(raw.image),
    seo: normalizeSeo(raw.seo),
    sortOrder: num(raw.sortOrder, 0),
    active: bool(raw.active, true),
  };
}

export function normalizeTierRule(id: string, raw: Raw): TierRule {
  const steps = array(raw.steps)
    .map((s) => ({
      minQty: Math.max(1, Math.round(num(s.minQty, 1))),
      discountPercent: typeof s.discountPercent === 'number' ? s.discountPercent : undefined,
      unitPriceCents: s.unitPriceCents == null ? undefined : cents(s.unitPriceCents),
    }))
    .filter((s) => s.discountPercent !== undefined || s.unitPriceCents !== undefined)
    .sort((a, b) => a.minQty - b.minQty);

  return {
    id,
    name: str(raw.name, 'Staffelvoordeel'),
    description: optionalStr(raw.description),
    group: str(raw.group, id),
    steps,
    active: bool(raw.active, true) && steps.length > 0,
  };
}

export function normalizeDiscountCode(id: string, raw: Raw): DiscountCode {
  const type =
    raw.type === 'fixed' || raw.type === 'free_shipping' || raw.type === 'percent'
      ? raw.type
      : 'percent';

  return {
    code: str(raw.code, id).toUpperCase(),
    description: optionalStr(raw.description),
    type,
    value: type === 'fixed' ? cents(raw.value) : num(raw.value, 0),
    minOrderCents: cents(raw.minOrderCents, 0),
    maxUses: raw.maxUses == null ? null : Math.max(0, Math.round(num(raw.maxUses, 0))),
    usedCount: Math.max(0, Math.round(num(raw.usedCount, 0))),
    validFrom: nullableMillis(raw.validFrom),
    validUntil: nullableMillis(raw.validUntil),
    appliesToCategorySlugs: strArray(raw.appliesToCategorySlugs),
    active: bool(raw.active, true),
  };
}

export function normalizeShippingRate(id: string, raw: Raw): ShippingRate {
  const classes = strArray(raw.shippingClasses).filter((c): c is ShippingClass =>
    SHIPPING_CLASSES.includes(c as ShippingClass),
  );

  return {
    id,
    name: str(raw.name, 'Verzending'),
    description: optionalStr(raw.description),
    countries: strArray(raw.countries).map((c) => c.toUpperCase()),
    shippingClasses: classes.length ? classes : ['letterbox', 'parcel'],
    maxWeightGrams: raw.maxWeightGrams == null ? null : Math.max(0, Math.round(num(raw.maxWeightGrams, 0))),
    priceCents: cents(raw.priceCents),
    freeAboveCents: raw.freeAboveCents == null ? null : cents(raw.freeAboveCents),
    isPickup: bool(raw.isPickup, false),
    sortOrder: num(raw.sortOrder, 0),
    active: bool(raw.active, true),
  };
}

/* ------------------------------------------------------------------ *
 * Redactionele inhoud
 * ------------------------------------------------------------------ */

/**
 * Blokken worden licht gecontroleerd: een blok met een onbekend `type` of
 * zonder de verplichte velden wordt weggelaten in plaats van dat de pagina
 * stukloopt.
 */
export function normalizeBlocks(raw: unknown): Block[] {
  const out: Block[] = [];

  for (const b of array(raw)) {
    const type = str(b.type);
    switch (type) {
      case 'hero':
        if (!str(b.title)) break;
        out.push({
          type: 'hero',
          title: str(b.title),
          subtitle: optionalStr(b.subtitle),
          body: optionalStr(b.body),
          image: normalizeImage(b.image),
          ctas: array(b.ctas)
            .map((c) => ({
              label: str(c.label),
              href: str(c.href),
              variant: (c.variant === 'secondary' || c.variant === 'ghost' ? c.variant : 'primary') as
                | 'primary'
                | 'secondary'
                | 'ghost',
            }))
            .filter((c) => c.label && c.href),
          align: b.align === 'center' ? 'center' : 'left',
        });
        break;

      case 'text':
        if (!str(b.body)) break;
        out.push({
          type: 'text',
          title: optionalStr(b.title),
          body: str(b.body),
          narrow: bool(b.narrow, true),
        });
        break;

      case 'image': {
        const image = normalizeImage(b.image);
        if (!image) break;
        out.push({ type: 'image', image, caption: optionalStr(b.caption), full: bool(b.full, false) });
        break;
      }

      case 'gallery': {
        const images = normalizeImages(b.images);
        if (!images.length) break;
        out.push({ type: 'gallery', title: optionalStr(b.title), images });
        break;
      }

      case 'cards': {
        const items = array(b.items)
          .map((i) => ({
            title: str(i.title),
            body: optionalStr(i.body),
            icon: optionalStr(i.icon),
            href: optionalStr(i.href),
            image: normalizeImage(i.image),
          }))
          .filter((i) => i.title);
        if (!items.length) break;
        const columns = [2, 3, 4].includes(num(b.columns, 3)) ? (num(b.columns, 3) as 2 | 3 | 4) : 3;
        out.push({
          type: 'cards',
          title: optionalStr(b.title),
          intro: optionalStr(b.intro),
          columns,
          items,
        });
        break;
      }

      case 'products': {
        const source =
          b.source === 'category' || b.source === 'slugs' || b.source === 'featured'
            ? b.source
            : 'featured';
        out.push({
          type: 'products',
          title: optionalStr(b.title),
          intro: optionalStr(b.intro),
          source,
          categorySlug: optionalStr(b.categorySlug),
          slugs: strArray(b.slugs),
          limit: Math.max(1, Math.round(num(b.limit, 4))),
          cta:
            typeof b.cta === 'object' && b.cta !== null && str((b.cta as Raw).label)
              ? { label: str((b.cta as Raw).label), href: str((b.cta as Raw).href) }
              : undefined,
        });
        break;
      }

      case 'cta': {
        const button = typeof b.button === 'object' && b.button !== null ? (b.button as Raw) : null;
        if (!str(b.title) || !button || !str(button.label) || !str(button.href)) break;
        out.push({
          type: 'cta',
          title: str(b.title),
          body: optionalStr(b.body),
          button: { label: str(button.label), href: str(button.href) },
          tone: b.tone === 'sage' || b.tone === 'cream' ? b.tone : 'brand',
        });
        break;
      }

      case 'quote':
        if (!str(b.text)) break;
        out.push({ type: 'quote', text: str(b.text), author: optionalStr(b.author) });
        break;

      case 'faq': {
        const items = array(b.items)
          .map((i) => ({ q: str(i.q), a: str(i.a) }))
          .filter((i) => i.q && i.a);
        if (!items.length) break;
        out.push({ type: 'faq', title: optionalStr(b.title), items });
        break;
      }

      case 'newsletter':
        out.push({ type: 'newsletter', title: optionalStr(b.title), body: optionalStr(b.body) });
        break;

      case 'activities':
        out.push({
          type: 'activities',
          title: optionalStr(b.title),
          intro: optionalStr(b.intro),
          limit: Math.max(1, Math.round(num(b.limit, 3))),
        });
        break;

      case 'dialect':
        out.push({
          type: 'dialect',
          title: optionalStr(b.title),
          intro: optionalStr(b.intro),
          limit: Math.max(1, Math.round(num(b.limit, 6))),
        });
        break;

      case 'membership': {
        if (!str(b.title)) break;
        const button = typeof b.button === 'object' && b.button !== null ? (b.button as Raw) : null;
        out.push({
          type: 'membership',
          title: str(b.title),
          priceLabel: str(b.priceLabel, ''),
          body: optionalStr(b.body),
          perks: strArray(b.perks),
          button:
            button && str(button.label) && str(button.href)
              ? { label: str(button.label), href: str(button.href) }
              : undefined,
          footnote: optionalStr(b.footnote),
        });
        break;
      }

      case 'steps': {
        const items = array(b.items)
          .map((i) => ({ title: str(i.title), body: optionalStr(i.body) }))
          .filter((i) => i.title);
        if (!items.length) break;
        out.push({ type: 'steps', title: optionalStr(b.title), intro: optionalStr(b.intro), items });
        break;
      }

      case 'spacer':
        out.push({
          type: 'spacer',
          size: b.size === 'sm' || b.size === 'lg' ? b.size : 'md',
        });
        break;

      default:
        // Onbekend bloktype: overslaan, niet crashen.
        break;
    }
  }

  return out;
}

export function normalizeHappening(id: string, raw: Raw): Happening {
  return {
    id,
    slug: str(raw.slug, id),
    title: str(raw.title, 'Zonder titel'),
    summary: str(raw.summary),
    body: str(raw.body),
    images: normalizeImages(raw.images),
    theme: str(raw.theme, 'Gek & Onverwacht'),
    location: optionalStr(raw.location),
    date: optionalStr(raw.date) ?? null,
    startTime: optionalStr(raw.startTime),
    endTime: optionalStr(raw.endTime),
    priceLabel: optionalStr(raw.priceLabel),
    signupUrl: optionalStr(raw.signupUrl) ?? null,
    membersOnly: bool(raw.membersOnly, false),
    status: raw.status === 'published' ? 'published' : 'draft',
    featured: bool(raw.featured, false),
    sortOrder: num(raw.sortOrder, 0),
    seo: normalizeSeo(raw.seo),
    createdAt: toMillis(raw.createdAt),
    updatedAt: toMillis(raw.updatedAt),
  };
}

export function normalizeDialectEntry(id: string, raw: Raw): DialectEntry {
  return {
    id,
    word: str(raw.word, ''),
    meaning: str(raw.meaning, ''),
    example: optionalStr(raw.example),
    exampleTranslation: optionalStr(raw.exampleTranslation),
    kind: optionalStr(raw.kind),
    audioPath: optionalStr(raw.audioPath) ?? null,
    audioUrl: optionalStr(raw.audioUrl) ?? null,
    productSlug: optionalStr(raw.productSlug) ?? null,
    featured: bool(raw.featured, false),
    status: raw.status === 'published' ? 'published' : 'draft',
    createdAt: toMillis(raw.createdAt),
    updatedAt: toMillis(raw.updatedAt),
  };
}

/* ------------------------------------------------------------------ *
 * Instellingen — met standaarden, zodat een lege database toch werkt
 * ------------------------------------------------------------------ */

export const DEFAULT_GENERAL: GeneralSettings = {
  siteName: 'Met Mekaere',
  tagline: 'Veur wat meer aandacht veur mekaere',
  description:
    'Met Mekaere is er voor wat meer aandacht voor elkaar: kaarten om te sturen, aandacht voor ons dialect en activiteiten waar je mensen tegenkomt die je anders misschien nooit had gesproken.',
  email: 'info@metmekaere.nl',
  socials: [],
};

export const DEFAULT_SHOP: ShopSettings = {
  currency: 'EUR',
  shippingCountries: [
    { code: 'NL', label: 'Nederland' },
    { code: 'BE', label: 'België' },
  ],
  facets: [
    { key: 'thema', label: 'Thema' },
    { key: 'formaat', label: 'Formaat' },
  ],
  orderNotificationEmail: 'info@metmekaere.nl',
  closed: false,
};

export const DEFAULT_ADVENT: AdventSettings = {
  enabled: true,
  year: new Date().getFullYear(),
  visibleFrom: '11-15',
  visibleUntil: '01-07',
  title: 'Dorpse Adventskalender',
  subtitle: 'Elke dag in december iets om samen te doen',
  offSeasonMessage:
    'De Dorpse Adventskalender komt in december weer terug. Wil je meedoen met een activiteit? Laat het weten.',
};

export const DEFAULT_COMMUNITY: CommunitySettings = {
  membershipEnabled: false,
  membershipPriceCents: 2400,
  membershipProductSlug: null,
  waitlistEnabled: true,
};

export function normalizeGeneralSettings(raw: Raw | null): GeneralSettings {
  if (!raw) return DEFAULT_GENERAL;
  const address = (typeof raw.address === 'object' && raw.address !== null ? raw.address : {}) as Raw;
  return {
    siteName: str(raw.siteName, DEFAULT_GENERAL.siteName),
    tagline: str(raw.tagline, DEFAULT_GENERAL.tagline),
    description: str(raw.description, DEFAULT_GENERAL.description),
    email: str(raw.email, DEFAULT_GENERAL.email),
    phone: optionalStr(raw.phone),
    kvk: optionalStr(raw.kvk),
    vatNumber: optionalStr(raw.vatNumber),
    address: {
      street: optionalStr(address.street),
      houseNumber: optionalStr(address.houseNumber),
      postalCode: optionalStr(address.postalCode),
      city: optionalStr(address.city),
      country: optionalStr(address.country) ?? 'NL',
    },
    socials: array(raw.socials)
      .map((s) => ({ label: str(s.label), href: str(s.href) }))
      .filter((s) => s.label && s.href),
    signature: optionalStr(raw.signature),
  };
}

export function normalizeShopSettings(raw: Raw | null): ShopSettings {
  if (!raw) return DEFAULT_SHOP;
  const countries = array(raw.shippingCountries)
    .map((c) => ({ code: str(c.code).toUpperCase(), label: str(c.label) }))
    .filter((c) => c.code && c.label);
  const facets = array(raw.facets)
    .map((f) => ({ key: str(f.key), label: str(f.label) }))
    .filter((f) => f.key && f.label);

  return {
    currency: 'EUR',
    shippingCountries: countries.length ? countries : DEFAULT_SHOP.shippingCountries,
    facets: facets.length ? facets : DEFAULT_SHOP.facets,
    orderNotificationEmail: str(raw.orderNotificationEmail, DEFAULT_SHOP.orderNotificationEmail),
    checkoutNote: optionalStr(raw.checkoutNote),
    tierNote: optionalStr(raw.tierNote),
    closed: bool(raw.closed, false),
    closedMessage: optionalStr(raw.closedMessage),
  };
}

export function normalizeAdventSettings(raw: Raw | null): AdventSettings {
  if (!raw) return DEFAULT_ADVENT;
  return {
    enabled: bool(raw.enabled, DEFAULT_ADVENT.enabled),
    year: Math.round(num(raw.year, DEFAULT_ADVENT.year)),
    visibleFrom: str(raw.visibleFrom, DEFAULT_ADVENT.visibleFrom),
    visibleUntil: str(raw.visibleUntil, DEFAULT_ADVENT.visibleUntil),
    title: str(raw.title, DEFAULT_ADVENT.title),
    subtitle: str(raw.subtitle, DEFAULT_ADVENT.subtitle),
    offSeasonMessage: str(raw.offSeasonMessage, DEFAULT_ADVENT.offSeasonMessage),
  };
}

export function normalizeCommunitySettings(raw: Raw | null): CommunitySettings {
  if (!raw) return DEFAULT_COMMUNITY;
  return {
    membershipEnabled: bool(raw.membershipEnabled, false),
    membershipPriceCents: cents(raw.membershipPriceCents, DEFAULT_COMMUNITY.membershipPriceCents),
    membershipProductSlug: optionalStr(raw.membershipProductSlug) ?? null,
    waitlistEnabled: bool(raw.waitlistEnabled, true),
  };
}
