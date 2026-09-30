/**
 * Domeinmodel Met Mekaere.
 *
 * Twee regels die overal gelden:
 *  1. Geld is ALTIJD een geheel aantal centen (`Cents`). Nooit floats.
 *  2. Datums zijn epoch-millis (`number`), zodat ze zonder conversie van een
 *     server- naar een clientcomponent kunnen. De datalaag zet Firestore
 *     Timestamps om.
 */

export type Cents = number;

/** Epoch millis. */
export type Millis = number;

export interface Seo {
  title?: string;
  description?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export interface StoredImage {
  /** Pad in Cloud Storage, bv. `products/kaart-mekaere/voorkant.jpg`. */
  path: string;
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

/* ------------------------------------------------------------------ *
 * Catalogus
 * ------------------------------------------------------------------ */

export type ProductStatus = 'draft' | 'active' | 'archived';

/**
 * Bepaalt met welke verzendmethode een product mee kan.
 * `letterbox` = past door de brievenbus (kaarten), `parcel` = pakket,
 * `digital` = geen verzending, `pickup_only` = alleen ophalen.
 */
export type ShippingClass = 'letterbox' | 'parcel' | 'digital' | 'pickup_only';

export interface ProductAddon {
  id: string;
  label: string;
  description?: string;
  priceCents: Cents;
  /** 1 = aan/uit-keuze. >1 = klant kiest een aantal. */
  maxQty: number;
  required?: boolean;
  /** Add-ons met dezelfde groep sluiten elkaar uit (radio in plaats van checkbox). */
  group?: string | null;
  /** Extra gewicht, bv. een envelop. Telt mee voor de verzendkosten. */
  weightGrams?: number;
}

export interface ProductStock {
  /** Uit = onbeperkt verkoopbaar (bv. print-on-demand). */
  tracked: boolean;
  quantity: number;
  /** Aan = doorverkopen terwijl de voorraad op nul staat. */
  allowBackorder: boolean;
  lowStockThreshold: number;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  /** Korte tekst op de productkaart in de lijst. */
  shortDescription?: string;
  /** Volledige beschrijving, markdown. */
  description: string;
  categorySlug: string;
  tags: string[];
  priceCents: Cents;
  /** Was-prijs; alleen tonen als hij hoger is dan `priceCents`. */
  compareAtPriceCents?: Cents | null;
  /** 0.21 | 0.09 | 0 */
  vatRate: number;
  images: StoredImage[];
  stock: ProductStock;
  weightGrams: number;
  shippingClass: ShippingClass;
  /**
   * Sleutel van de staffelgroep. Producten met dezelfde sleutel tellen hun
   * aantallen bij elkaar op voor het staffelvoordeel — zo levert 3 kaart A
   * + 4 kaart B samen de 5+-korting op.
   */
  tierGroup?: string | null;
  addons: ProductAddon[];
  /** Vrij in te richten filterfacetten, bv. thema: ["kerst"], formaat: ["A6"]. */
  attributes: Record<string, string[]>;
  seo?: Seo;
  status: ProductStatus;
  featured: boolean;
  sortOrder: number;
  createdAt: Millis;
  updatedAt: Millis;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image?: StoredImage | null;
  seo?: Seo;
  sortOrder: number;
  active: boolean;
}

/* ------------------------------------------------------------------ *
 * Staffelvoordeel
 * ------------------------------------------------------------------ */

export interface TierStep {
  minQty: number;
  /** Geef of een kortingspercentage, of een vaste stuksprijs. */
  discountPercent?: number;
  unitPriceCents?: Cents;
}

export interface TierRule {
  id: string;
  name: string;
  description?: string;
  /** Matcht `Product.tierGroup`. */
  group: string;
  /** Oplopend op `minQty`; de datalaag sorteert defensief. */
  steps: TierStep[];
  active: boolean;
}

/* ------------------------------------------------------------------ *
 * Kortingscodes
 * ------------------------------------------------------------------ */

export type DiscountType = 'percent' | 'fixed' | 'free_shipping';

export interface DiscountCode {
  /** Document-id en de code zelf, altijd uppercase. */
  code: string;
  description?: string;
  type: DiscountType;
  /** Percentage (0-100) bij percent, centen bij fixed, genegeerd bij free_shipping. */
  value: number;
  minOrderCents: Cents;
  /** null = ongelimiteerd. */
  maxUses: number | null;
  usedCount: number;
  validFrom?: Millis | null;
  validUntil?: Millis | null;
  /** Leeg = hele shop. */
  appliesToCategorySlugs: string[];
  active: boolean;
}

/* ------------------------------------------------------------------ *
 * Verzending
 * ------------------------------------------------------------------ */

export interface ShippingRate {
  id: string;
  name: string;
  description?: string;
  /** ISO-landcodes, bv. NL of BE/DE. */
  countries: string[];
  /** Welke verzendklassen deze methode kan vervoeren. */
  shippingClasses: ShippingClass[];
  /** null = geen gewichtslimiet. */
  maxWeightGrams: number | null;
  priceCents: Cents;
  /** Gratis vanaf dit orderbedrag; null = nooit gratis. */
  freeAboveCents: Cents | null;
  isPickup: boolean;
  sortOrder: number;
  active: boolean;
}

export interface ShippingOption {
  id: string;
  name: string;
  description?: string;
  priceCents: Cents;
  isPickup: boolean;
  /** Gezet als de prijs door `freeAboveCents` op nul is gezet. */
  freeBecauseOfThreshold?: boolean;
}

/* ------------------------------------------------------------------ *
 * Winkelwagen
 * ------------------------------------------------------------------ */

export interface CartLineAddon {
  addonId: string;
  qty: number;
}

export interface CartLine {
  /** Stabiel id: product + gekozen add-ons. Zelfde keuze = zelfde regel. */
  id: string;
  productId: string;
  qty: number;
  addons: CartLineAddon[];
}

export interface Cart {
  id: string;
  lines: CartLine[];
  discountCode?: string | null;
  shippingCountry: string;
  shippingRateId?: string | null;
  createdAt: Millis;
  updatedAt: Millis;
}

/* ------------------------------------------------------------------ *
 * Doorgerekende winkelwagen (altijd server-side berekend)
 * ------------------------------------------------------------------ */

export type StockIssue = 'out_of_stock' | 'insufficient' | 'unavailable';

export interface PricedAddon {
  addonId: string;
  label: string;
  qty: number;
  unitPriceCents: Cents;
  totalCents: Cents;
}

export interface PricedLine {
  id: string;
  productId: string;
  slug: string;
  title: string;
  imageUrl?: string;
  imageAlt?: string;
  qty: number;
  /** Normale stuksprijs. */
  unitPriceCents: Cents;
  /** Stuksprijs na staffelvoordeel. */
  tierUnitPriceCents: Cents;
  addons: PricedAddon[];
  addonsUnitTotalCents: Cents;
  /** (tierUnitPrice + addons) * qty */
  lineTotalCents: Cents;
  /** Wat deze regel scheelt door de staffel. */
  tierDiscountCents: Cents;
  vatRate: number;
  tierGroup?: string | null;
  stockIssue?: StockIssue;
  /** Maximaal te bestellen aantal, als de voorraad dat begrenst. */
  maxQty?: number;
}

/** Wat de klant nu heeft, en wat de volgende staffelstap zou opleveren. */
export interface TierProgress {
  group: string;
  ruleName: string;
  currentQty: number;
  currentDiscountPercent: number;
  next?: {
    minQty: number;
    qtyNeeded: number;
    discountPercent: number;
    extraSavingCents: Cents;
  };
}

export interface VatLine {
  rate: number;
  baseCents: Cents;
  vatCents: Cents;
}

export interface PricedCart {
  cartId: string;
  lines: PricedLine[];
  itemCount: number;
  /** Som van de regels voor staffelvoordeel. */
  grossSubtotalCents: Cents;
  tierDiscountCents: Cents;
  /** Na staffelvoordeel, voor kortingscode. */
  subtotalCents: Cents;
  tierProgress: TierProgress[];
  discountCode?: string | null;
  discountLabel?: string;
  discountCents: Cents;
  discountError?: string;
  shippingCountry: string;
  shippingOptions: ShippingOption[];
  shippingRateId?: string | null;
  shippingName?: string;
  shippingCents: Cents;
  totalWeightGrams: number;
  totalCents: Cents;
  vatBreakdown: VatLine[];
  hasStockIssues: boolean;
}

/* ------------------------------------------------------------------ *
 * Orders
 * ------------------------------------------------------------------ */

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'canceled'
  | 'shipped'
  | 'refunded';

export interface Address {
  name: string;
  company?: string;
  street: string;
  houseNumber: string;
  houseNumberAddition?: string;
  postalCode: string;
  city: string;
  country: string;
}

export interface OrderLine {
  productId: string;
  slug: string;
  title: string;
  imageUrl?: string;
  qty: number;
  unitPriceCents: Cents;
  tierUnitPriceCents: Cents;
  addons: PricedAddon[];
  lineTotalCents: Cents;
  vatRate: number;
}

export interface Order {
  id: string;
  /** Menselijk ordernummer, bv. MM-2026-0042. */
  orderNumber: string;
  status: OrderStatus;
  customer: { name: string; email: string; phone?: string };
  shipping: Address;
  billing?: Address | null;
  lines: OrderLine[];
  grossSubtotalCents: Cents;
  tierDiscountCents: Cents;
  subtotalCents: Cents;
  discountCode?: string | null;
  discountCents: Cents;
  shippingMethod: string;
  shippingCents: Cents;
  totalCents: Cents;
  vatBreakdown: VatLine[];
  newsletterOptIn: boolean;
  notes?: string;
  molliePaymentId?: string | null;
  molliePaymentMethod?: string | null;
  /** Idempotentie-vlag: voorraad is al afgeboekt voor deze order. */
  stockApplied: boolean;
  /** Idempotentie-vlag: kortingscode is al als gebruikt geteld. */
  discountApplied: boolean;
  createdAt: Millis;
  paidAt?: Millis | null;
  shippedAt?: Millis | null;
  trackingCode?: string | null;
}

/* ------------------------------------------------------------------ *
 * Nieuwsbrief
 * ------------------------------------------------------------------ */

export type NewsletterStatus = 'pending' | 'subscribed' | 'unsubscribed' | 'error';

export interface NewsletterSubscriber {
  /** Document-id is de e-mail, lowercase. */
  email: string;
  name?: string;
  status: NewsletterStatus;
  /** Waar de inschrijving vandaan kwam: footer | checkout | community | ... */
  source: string;
  providerId?: string | null;
  syncedAt?: Millis | null;
  syncError?: string | null;
  createdAt: Millis;
}

/* ------------------------------------------------------------------ *
 * Redactionele inhoud (CMS)
 * ------------------------------------------------------------------ */

export interface CtaLink {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export type Block =
  | {
      type: 'hero';
      title: string;
      subtitle?: string;
      body?: string;
      image?: StoredImage | null;
      ctas?: CtaLink[];
      align?: 'left' | 'center';
    }
  | { type: 'text'; title?: string; body: string; narrow?: boolean }
  | { type: 'image'; image: StoredImage; caption?: string; full?: boolean }
  | { type: 'gallery'; title?: string; images: StoredImage[] }
  | {
      type: 'cards';
      title?: string;
      intro?: string;
      columns?: 2 | 3 | 4;
      items: { title: string; body?: string; icon?: string; href?: string; image?: StoredImage | null }[];
    }
  | {
      type: 'products';
      title?: string;
      intro?: string;
      source: 'featured' | 'category' | 'slugs';
      categorySlug?: string;
      slugs?: string[];
      limit?: number;
      cta?: CtaLink;
    }
  | { type: 'cta'; title: string; body?: string; button: CtaLink; tone?: 'brand' | 'sage' | 'cream' }
  | { type: 'quote'; text: string; author?: string }
  | { type: 'faq'; title?: string; items: { q: string; a: string }[] }
  | { type: 'newsletter'; title?: string; body?: string }
  | { type: 'activities'; title?: string; intro?: string; limit?: number }
  | { type: 'dialect'; title?: string; intro?: string; limit?: number }
  | {
      type: 'membership';
      title: string;
      priceLabel: string;
      body?: string;
      perks: string[];
      button?: CtaLink;
      footnote?: string;
    }
  | { type: 'steps'; title?: string; intro?: string; items: { title: string; body?: string }[] }
  | { type: 'spacer'; size?: 'sm' | 'md' | 'lg' };

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  seo?: Seo;
  blocks: Block[];
  published: boolean;
  updatedAt: Millis;
}

/* ------------------------------------------------------------------ *
 * Doen en Beleven
 * ------------------------------------------------------------------ */

export interface Happening {
  id: string;
  slug: string;
  title: string;
  summary: string;
  /** Volledig verhaal, markdown. */
  body: string;
  images: StoredImage[];
  /** Maken & Leren, Eten & Drinken, Muziek & Cultuur, Buiten & Natuur, Gek & Onverwacht. */
  theme: string;
  location?: string;
  /** ISO-datum (yyyy-mm-dd) of leeg voor doorlopende projecten. */
  date?: string | null;
  startTime?: string;
  endTime?: string;
  priceLabel?: string;
  /** Aanmeldlink of externe pagina. */
  signupUrl?: string | null;
  membersOnly: boolean;
  status: 'draft' | 'published';
  featured: boolean;
  sortOrder: number;
  seo?: Seo;
  createdAt: Millis;
  updatedAt: Millis;
}

/* ------------------------------------------------------------------ *
 * Fluffy Dialect
 * ------------------------------------------------------------------ */

export interface DialectEntry {
  id: string;
  /** Het woord of de uitdrukking. */
  word: string;
  /** Nederlandse betekenis. */
  meaning: string;
  /** Voorbeeldzin in dialect. */
  example?: string;
  exampleTranslation?: string;
  /** Woordsoort of categorie, bv. 'uitdrukking'. */
  kind?: string;
  /** Optionele audio in Cloud Storage. */
  audioPath?: string | null;
  audioUrl?: string | null;
  /** Gekoppeld product, bv. de kaart met dit woord. */
  productSlug?: string | null;
  featured: boolean;
  status: 'draft' | 'published';
  createdAt: Millis;
  updatedAt: Millis;
}

/* ------------------------------------------------------------------ *
 * Instellingen
 * ------------------------------------------------------------------ */

export interface GeneralSettings {
  siteName: string;
  tagline: string;
  description: string;
  email: string;
  phone?: string;
  kvk?: string;
  vatNumber?: string;
  address?: Partial<Address>;
  socials: { label: string; href: string }[];
  /** Wordt in de footer en in e-mails gebruikt. */
  signature?: string;
}

export interface ShopSettings {
  currency: 'EUR';
  /** Landen waar naartoe verzonden wordt. */
  shippingCountries: { code: string; label: string }[];
  /** Welke attribuutsleutels als filter in de shop verschijnen. */
  facets: { key: string; label: string }[];
  /** Naar welk adres ordermeldingen gaan. */
  orderNotificationEmail: string;
  /** Vrije tekst onder de checkout, bv. levertijd. */
  checkoutNote?: string;
  /** Tekst bij het staffelvoordeel in de winkelwagen. */
  tierNote?: string;
  /** Shop tijdelijk dicht zetten. */
  closed: boolean;
  closedMessage?: string;
}

export interface AdventSettings {
  /** Hoofdschakelaar voor de adventskalender. */
  enabled: boolean;
  year: number;
  /** Vanaf wanneer het menu-item zichtbaar is (yyyy-mm-dd). */
  visibleFrom: string;
  /** Tot wanneer (yyyy-mm-dd, inclusief). */
  visibleUntil: string;
  title: string;
  subtitle: string;
  /** Tekst buiten het seizoen. */
  offSeasonMessage: string;
}

export interface CommunitySettings {
  /** Aan = lidmaatschap is te koop. */
  membershipEnabled: boolean;
  membershipPriceCents: Cents;
  membershipProductSlug?: string | null;
  /** Tekst op de wachtlijst wanneer lidmaatschap nog niet open is. */
  waitlistEnabled: boolean;
}

/* ------------------------------------------------------------------ *
 * Adventskalender
 *
 * Staat hier en niet bij de datalaag, omdat de kalendercomponenten in de
 * browser draaien: een type importeren uit een servermodule trekt die module
 * mee de browserbundel in.
 * ------------------------------------------------------------------ */

export const ADVENT_DAYS = 24;

export interface AdventActivity {
  day: number;
  title: string;
  body: string;
  location: string;
  /** 24-uursnotatie 'HH:mm'. */
  time: string;
  endTime: string;
  /** Bedrag in euro's, zoals de bestaande advent-app het opslaat. 0 = gratis. */
  costEUR: number;
  emoji: string;
}

/* ------------------------------------------------------------------ *
 * Filters in de webshop
 * ------------------------------------------------------------------ */

export interface Facet {
  key: string;
  label: string;
  values: { value: string; count: number }[];
}

/** De thema's van de Community, in vaste volgorde. */
export const HAPPENING_THEMES = [
  'Maken & Leren',
  'Eten & Drinken',
  'Muziek & Cultuur',
  'Buiten & Natuur',
  'Gek & Onverwacht',
] as const;
