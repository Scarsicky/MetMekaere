import 'server-only';

import { cookies } from 'next/headers';

import { getDiscountCode, getProductsByIds, getShippingRates, getTierRules } from '@/lib/data/catalog';
import { getShopSettings } from '@/lib/data/settings';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { makeLineId, priceCart } from '@/lib/shop/pricing';
import { clamp, randomId } from '@/lib/utils';
import type { Cart, CartLine, PricedCart } from '@/types';

/**
 * De winkelwagen staat op de server, in Firestore. De browser kent alleen een
 * id in een httpOnly-cookie. Dat betekent dat een klant geen prijs, korting of
 * voorraad kan meesturen: de server rekent alles opnieuw door bij elke stap,
 * ook bij het afrekenen.
 *
 * Belangrijk voor Next.js: een cookie mag alleen worden gezet in een Server
 * Action of Route Handler, niet tijdens het renderen van een pagina. Daarom
 * twee functies: `readCartId` (veilig tijdens renderen) en `ensureCartId`
 * (maakt zo nodig een wagen aan, alleen in acties).
 */

const COOKIE = 'mm_cart';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dagen
const CART_TTL_DAYS = 60;

/** Hoeveel stuks van één regel maximaal. Voorkomt typefouten met 999 kaarten. */
export const MAX_LINE_QTY = 99;
/** Hoeveel verschillende regels maximaal in één wagen. */
export const MAX_CART_LINES = 50;

const COLLECTION = 'carts';

/* ------------------------------------------------------------------ *
 * Cookie
 * ------------------------------------------------------------------ */

/** Alleen lezen — veilig tijdens het renderen van een pagina. */
export async function readCartId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(COOKIE)?.value;
  return value && /^[a-z0-9]{16,32}$/.test(value) ? value : null;
}

/**
 * Geeft het wagen-id en zet zo nodig de cookie. Alleen te gebruiken in een
 * Server Action of Route Handler.
 */
export async function ensureCartId(): Promise<string> {
  const existing = await readCartId();
  if (existing) return existing;

  const id = randomId(24);
  const store = await cookies();
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return id;
}

export async function clearCartCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/* ------------------------------------------------------------------ *
 * Opslag
 * ------------------------------------------------------------------ */

function emptyCart(id: string, country: string): Cart {
  const now = Date.now();
  return {
    id,
    lines: [],
    discountCode: null,
    shippingCountry: country,
    shippingRateId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    const productId = typeof r.productId === 'string' ? r.productId : '';
    if (!productId) continue;

    const addons = Array.isArray(r.addons)
      ? r.addons
          .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null)
          .map((a) => ({
            addonId: typeof a.addonId === 'string' ? a.addonId : '',
            qty: clamp(Math.round(Number(a.qty) || 0), 0, MAX_LINE_QTY),
          }))
          .filter((a) => a.addonId && a.qty > 0)
      : [];

    out.push({
      id: typeof r.id === 'string' && r.id ? r.id : makeLineId(productId, addons),
      productId,
      qty: clamp(Math.round(Number(r.qty) || 1), 1, MAX_LINE_QTY),
      addons,
    });
  }

  return out.slice(0, MAX_CART_LINES);
}

async function readCart(id: string): Promise<Cart> {
  const settings = await getShopSettings();
  const defaultCountry = settings.shippingCountries[0]?.code ?? 'NL';

  const snap = await adminDb().collection(COLLECTION).doc(id).get();
  if (!snap.exists) return emptyCart(id, defaultCountry);

  const raw = snap.data() as Record<string, unknown>;
  const country = typeof raw.shippingCountry === 'string' ? raw.shippingCountry : defaultCountry;

  return {
    id,
    lines: normalizeLines(raw.lines),
    discountCode: typeof raw.discountCode === 'string' ? raw.discountCode : null,
    // Een land dat niet meer wordt bezorgd valt terug op het eerste land.
    shippingCountry: settings.shippingCountries.some((c) => c.code === country) ? country : defaultCountry,
    shippingRateId: typeof raw.shippingRateId === 'string' ? raw.shippingRateId : null,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

async function writeCart(cart: Cart): Promise<void> {
  const now = Date.now();
  await adminDb()
    .collection(COLLECTION)
    .doc(cart.id)
    .set(
      {
        lines: cart.lines,
        discountCode: cart.discountCode ?? null,
        shippingCountry: cart.shippingCountry,
        shippingRateId: cart.shippingRateId ?? null,
        createdAt: cart.createdAt || now,
        updatedAt: now,
        // Firestore ruimt oude wagens zelf op via een TTL-beleid op dit veld.
        expiresAt: new Date(now + CART_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
      { merge: true },
    );
}

/* ------------------------------------------------------------------ *
 * Doorrekenen
 * ------------------------------------------------------------------ */

/** De doorgerekende wagen voor de huidige bezoeker. Veilig tijdens renderen. */
export async function getPricedCart(): Promise<PricedCart> {
  const id = await readCartId();
  if (!id) {
    const settings = await getShopSettings();
    return priceCartFor(emptyCart('leeg', settings.shippingCountries[0]?.code ?? 'NL'));
  }
  return priceCartFor(await readCart(id));
}

async function priceCartFor(cart: Cart): Promise<PricedCart> {
  const [products, tierRules, shippingRates, discount] = await Promise.all([
    getProductsByIds(cart.lines.map((l) => l.productId)),
    getTierRules(),
    getShippingRates(),
    cart.discountCode ? getDiscountCode(cart.discountCode) : Promise.resolve(null),
  ]);

  return priceCart({ cart, products, tierRules, shippingRates, discount });
}

/** Alleen het aantal artikelen — voor het bolletje bij het winkelwagentje. */
export async function getCartItemCount(): Promise<number> {
  const id = await readCartId();
  if (!id) return 0;
  const cart = await readCart(id);
  return cart.lines.reduce((sum, l) => sum + l.qty, 0);
}

/* ------------------------------------------------------------------ *
 * Mutaties — alleen vanuit Server Actions of Route Handlers
 * ------------------------------------------------------------------ */

export type CartMutationResult =
  | { ok: true; cart: PricedCart; message?: string }
  | { ok: false; error: string };

export async function addToCart(args: {
  productId: string;
  qty: number;
  addons: { addonId: string; qty: number }[];
}): Promise<CartMutationResult> {
  const settings = await getShopSettings();
  if (settings.closed) {
    return { ok: false, error: settings.closedMessage || 'De shop is tijdelijk gesloten.' };
  }

  const products = await getProductsByIds([args.productId]);
  const product = products.get(args.productId);
  if (!product || product.status !== 'active') {
    return { ok: false, error: 'Dit product is niet beschikbaar.' };
  }

  // Alleen add-ons die bij dit product horen, binnen hun maximum.
  const allowed = new Map(product.addons.map((a) => [a.id, a]));
  const addons = args.addons
    .map((a) => {
      const def = allowed.get(a.addonId);
      if (!def) return null;
      return { addonId: a.addonId, qty: clamp(Math.round(a.qty), 0, Math.max(1, def.maxQty)) };
    })
    .filter((a): a is { addonId: string; qty: number } => a !== null && a.qty > 0);

  // Verplichte add-ons met een groep: de klant moet één keuze maken.
  for (const group of new Set(product.addons.filter((a) => a.required && a.group).map((a) => a.group))) {
    const inGroup = product.addons.filter((a) => a.group === group).map((a) => a.id);
    if (!addons.some((a) => inGroup.includes(a.addonId))) {
      const label = product.addons.find((a) => a.group === group)?.group ?? 'een optie';
      return { ok: false, error: `Maak eerst een keuze bij ${label}.` };
    }
  }

  // Binnen een groep mag maar één add-on gekozen zijn.
  const seenGroups = new Set<string>();
  for (const chosen of addons) {
    const group = allowed.get(chosen.addonId)?.group;
    if (!group) continue;
    if (seenGroups.has(group)) {
      return { ok: false, error: 'Er zijn twee opties gekozen die elkaar uitsluiten.' };
    }
    seenGroups.add(group);
  }

  const id = await ensureCartId();
  const cart = await readCart(id);

  const lineId = makeLineId(args.productId, addons);
  const existing = cart.lines.find((l) => l.id === lineId);
  const requested = clamp(Math.round(args.qty) || 1, 1, MAX_LINE_QTY);

  if (existing) {
    existing.qty = clamp(existing.qty + requested, 1, MAX_LINE_QTY);
  } else {
    if (cart.lines.length >= MAX_CART_LINES) {
      return { ok: false, error: 'Je winkelwagen zit vol. Reken eerst af of haal iets weg.' };
    }
    cart.lines.push({ id: lineId, productId: args.productId, qty: requested, addons });
  }

  await writeCart(cart);
  return {
    ok: true,
    cart: await priceCartFor(cart),
    message: `${product.title} is toegevoegd.`,
  };
}

export async function setLineQty(lineId: string, qty: number): Promise<CartMutationResult> {
  const id = await readCartId();
  if (!id) return { ok: false, error: 'Je winkelwagen is leeg.' };

  const cart = await readCart(id);
  const line = cart.lines.find((l) => l.id === lineId);
  if (!line) return { ok: false, error: 'Deze regel staat niet meer in je winkelwagen.' };

  const next = Math.round(qty);
  if (next <= 0) {
    cart.lines = cart.lines.filter((l) => l.id !== lineId);
  } else {
    line.qty = clamp(next, 1, MAX_LINE_QTY);
  }

  await writeCart(cart);
  return { ok: true, cart: await priceCartFor(cart) };
}

export async function removeLine(lineId: string): Promise<CartMutationResult> {
  return setLineQty(lineId, 0);
}

export async function applyDiscountCode(code: string): Promise<CartMutationResult> {
  const id = await ensureCartId();
  const cart = await readCart(id);

  const normalized = code.trim().toUpperCase().slice(0, 40);
  cart.discountCode = normalized || null;
  await writeCart(cart);

  const priced = await priceCartFor(cart);
  if (normalized && priced.discountError) {
    // De code blijft staan zodat de klant hem kan aanpassen; de fout is zichtbaar.
    return { ok: false, error: priced.discountError };
  }
  return {
    ok: true,
    cart: priced,
    message: normalized ? `Kortingscode ${normalized} is toegepast.` : 'Kortingscode verwijderd.',
  };
}

export async function setShippingChoice(args: {
  country?: string;
  shippingRateId?: string | null;
}): Promise<CartMutationResult> {
  const id = await ensureCartId();
  const cart = await readCart(id);
  const settings = await getShopSettings();

  if (args.country) {
    const country = args.country.toUpperCase();
    if (!settings.shippingCountries.some((c) => c.code === country)) {
      return { ok: false, error: 'We bezorgen (nog) niet in dit land.' };
    }
    if (country !== cart.shippingCountry) {
      cart.shippingCountry = country;
      // Een tarief van het oude land geldt niet meer.
      cart.shippingRateId = null;
    }
  }

  if (args.shippingRateId !== undefined) {
    const rates = await getShippingRates();
    if (args.shippingRateId === null || rates.some((r) => r.id === args.shippingRateId)) {
      cart.shippingRateId = args.shippingRateId;
    }
  }

  await writeCart(cart);
  return { ok: true, cart: await priceCartFor(cart) };
}

/** Leegt de wagen. Gebruikt na een gelukte betaling. */
export async function emptyCurrentCart(): Promise<void> {
  const id = await readCartId();
  if (!id) return;
  await adminDb()
    .collection(COLLECTION)
    .doc(id)
    .set({ lines: [], discountCode: null, updatedAt: Date.now(), emptiedAt: FieldValue.serverTimestamp() }, { merge: true });
}

/**
 * Leegt een specifieke wagen. Gebruikt nadat een order betaald is: het
 * order-document bewaart het wagen-id, zodat dit ook vanuit de webhook kan —
 * daar is geen cookie beschikbaar.
 */
export async function emptyCartById(cartId: string): Promise<void> {
  if (!cartId) return;
  await adminDb()
    .collection(COLLECTION)
    .doc(cartId)
    .set(
      { lines: [], discountCode: null, shippingRateId: null, updatedAt: Date.now(), emptiedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
}

/** De ruwe wagen bij een id — nodig in het afrekenproces en de webhook. */
export async function readCartById(id: string): Promise<Cart> {
  return readCart(id);
}

export async function priceCartById(id: string): Promise<PricedCart> {
  return priceCartFor(await readCart(id));
}
