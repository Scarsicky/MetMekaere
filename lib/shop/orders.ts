import 'server-only';

import { getProductsByIds } from '@/lib/data/catalog';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { priceCartById, readCartById } from '@/lib/shop/cart';
import type { Address, Order, OrderLine, OrderStatus, PricedCart } from '@/types';

/**
 * Orders: aanmaken, betaald melden en voorraad afboeken.
 *
 * Drie dingen die hier bewust zo zijn opgelost:
 *
 *  1. De bedragen komen uit `priceCartById`, dus uit dezelfde rekenkern als de
 *     winkelwagen. Er wordt nooit een bedrag overgenomen dat de browser heeft
 *     meegestuurd.
 *
 *  2. Voorraad wordt pas afgeboekt als de betaling gelukt is, niet bij het
 *     aanmaken van de order. Anders houdt iedere afgebroken checkout voorraad
 *     bezet. Het gevolg is dat er in theorie iets dubbel verkocht kan worden
 *     tussen bestellen en betalen; bij deze schaal is dat de betere afweging,
 *     en de order wordt zichtbaar gemarkeerd als het gebeurt.
 *
 *  3. Een webhook kan meerdere keren binnenkomen. Daarom draait het afboeken
 *     in een transactie met de vlaggen `stockApplied` en `discountApplied`:
 *     twee keer dezelfde melding boekt niet twee keer af.
 */

const ORDERS = 'orders';
const COUNTERS = 'counters';

/* ------------------------------------------------------------------ *
 * Ordernummer
 * ------------------------------------------------------------------ */

/** Oplopend nummer per jaar: MM-2026-0001. */
async function nextOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const ref = adminDb().collection(COUNTERS).doc(`orders-${year}`);

  const value = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number(snap.data()?.value ?? 0) : 0;
    const next = current + 1;
    tx.set(ref, { value: next, year }, { merge: true });
    return next;
  });

  return `MM-${year}-${String(value).padStart(4, '0')}`;
}

/* ------------------------------------------------------------------ *
 * Order aanmaken
 * ------------------------------------------------------------------ */

export interface CheckoutDetails {
  customer: { name: string; email: string; phone?: string };
  shipping: Address;
  billing?: Address | null;
  newsletterOptIn: boolean;
  notes?: string;
}

export type CreateOrderResult =
  | { ok: true; order: Order }
  | { ok: false; error: string; code: 'empty' | 'stock' | 'shipping' | 'closed' | 'unknown' };

function toOrderLines(cart: PricedCart): OrderLine[] {
  return cart.lines
    .filter((line) => !line.stockIssue)
    .map((line) => ({
      productId: line.productId,
      slug: line.slug,
      title: line.title,
      imageUrl: line.imageUrl,
      qty: line.qty,
      unitPriceCents: line.unitPriceCents,
      tierUnitPriceCents: line.tierUnitPriceCents,
      addons: line.addons,
      lineTotalCents: line.lineTotalCents,
      vatRate: line.vatRate,
    }));
}

export async function createPendingOrder(
  cartId: string,
  details: CheckoutDetails,
): Promise<CreateOrderResult> {
  const cart = await priceCartById(cartId);

  if (!cart.lines.length) {
    return { ok: false, error: 'Je winkelwagen is leeg.', code: 'empty' };
  }
  if (cart.hasStockIssues) {
    return {
      ok: false,
      error: 'Er is iets veranderd aan de beschikbaarheid. Kijk je winkelwagen even na.',
      code: 'stock',
    };
  }
  if (cart.shippingOptions.length > 0 && !cart.shippingRateId) {
    return { ok: false, error: 'Kies eerst hoe je de bestelling wilt ontvangen.', code: 'shipping' };
  }

  const orderNumber = await nextOrderNumber();
  const ref = adminDb().collection(ORDERS).doc();

  const order: Order = {
    id: ref.id,
    orderNumber,
    status: 'pending',
    customer: details.customer,
    shipping: details.shipping,
    billing: details.billing ?? null,
    lines: toOrderLines(cart),
    grossSubtotalCents: cart.grossSubtotalCents,
    tierDiscountCents: cart.tierDiscountCents,
    subtotalCents: cart.subtotalCents,
    discountCode: cart.discountCode ?? null,
    discountCents: cart.discountCents,
    shippingMethod: cart.shippingName ?? 'Geen verzending',
    shippingCents: cart.shippingCents,
    totalCents: cart.totalCents,
    vatBreakdown: cart.vatBreakdown,
    newsletterOptIn: details.newsletterOptIn,
    notes: details.notes,
    molliePaymentId: null,
    molliePaymentMethod: null,
    stockApplied: false,
    discountApplied: false,
    createdAt: Date.now(),
    paidAt: null,
    shippedAt: null,
    trackingCode: null,
  };

  // De winkelwagen blijft aan de order hangen: handig bij het uitzoeken van
  // een betaling die halverwege is blijven steken.
  await ref.set({ ...order, cartId });

  return { ok: true, order };
}

/* ------------------------------------------------------------------ *
 * Lezen
 * ------------------------------------------------------------------ */

function normalizeOrder(id: string, raw: Record<string, unknown>): Order {
  return { ...(raw as unknown as Order), id };
}

export async function getOrder(id: string): Promise<Order | null> {
  const snap = await adminDb().collection(ORDERS).doc(id).get();
  return snap.exists ? normalizeOrder(snap.id, snap.data() as Record<string, unknown>) : null;
}

export async function getOrderByPaymentId(paymentId: string): Promise<Order | null> {
  const snap = await adminDb()
    .collection(ORDERS)
    .where('molliePaymentId', '==', paymentId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return normalizeOrder(snap.docs[0].id, snap.docs[0].data());
}

export async function listOrders(limit = 100): Promise<Order[]> {
  const snap = await adminDb().collection(ORDERS).orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => normalizeOrder(d.id, d.data()));
}

export async function attachPayment(
  orderId: string,
  paymentId: string,
  method?: string | null,
): Promise<void> {
  await adminDb()
    .collection(ORDERS)
    .doc(orderId)
    .set({ molliePaymentId: paymentId, molliePaymentMethod: method ?? null }, { merge: true });
}

/* ------------------------------------------------------------------ *
 * Betaald: voorraad afboeken en code bijtellen
 * ------------------------------------------------------------------ */

export interface MarkPaidResult {
  /** Was dit de eerste keer dat deze order op betaald ging? */
  firstTime: boolean;
  order: Order;
  /** Producten waarvan de voorraad negatief werd — dan is er dubbel verkocht. */
  oversold: { productId: string; title: string; shortBy: number }[];
}

export async function markOrderPaid(
  orderId: string,
  payment: { id: string; method?: string | null },
): Promise<MarkPaidResult | null> {
  const db = adminDb();
  const orderRef = db.collection(ORDERS).doc(orderId);
  const oversold: MarkPaidResult['oversold'] = [];

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return null;

    const order = normalizeOrder(snap.id, snap.data() as Record<string, unknown>);
    const alreadyPaid = order.status === 'paid' || order.status === 'shipped';

    /* Voorraad afboeken — alleen de eerste keer. Alle leesacties moeten in een
       Firestore-transactie vóór alle schrijfacties gebeuren. */
    if (!order.stockApplied) {
      const productRefs = order.lines.map((l) => db.collection('products').doc(l.productId));
      const productSnaps = productRefs.length ? await tx.getAll(...productRefs) : [];

      const decrements: { ref: FirebaseFirestore.DocumentReference; qty: number }[] = [];
      for (let i = 0; i < order.lines.length; i++) {
        const line = order.lines[i];
        const productSnap = productSnaps[i];
        if (!productSnap?.exists) continue;

        const data = productSnap.data() as Record<string, unknown>;
        const stock = (data.stock ?? {}) as Record<string, unknown>;
        if (stock.tracked !== true) continue;

        const available = Number(stock.quantity ?? 0);
        if (available < line.qty && stock.allowBackorder !== true) {
          oversold.push({
            productId: line.productId,
            title: line.title,
            shortBy: line.qty - Math.max(0, available),
          });
        }
        decrements.push({ ref: productRefs[i], qty: line.qty });
      }

      for (const dec of decrements) {
        tx.set(dec.ref, { stock: { quantity: FieldValue.increment(-dec.qty) } }, { merge: true });
      }
    }

    /* Kortingscode één keer als gebruikt tellen. */
    if (order.discountCode && !order.discountApplied) {
      tx.set(
        db.collection('discountCodes').doc(order.discountCode),
        { usedCount: FieldValue.increment(1) },
        { merge: true },
      );
    }

    const update: Partial<Order> & Record<string, unknown> = {
      status: 'paid' as OrderStatus,
      molliePaymentId: payment.id,
      molliePaymentMethod: payment.method ?? null,
      stockApplied: true,
      discountApplied: true,
    };
    if (!alreadyPaid) update.paidAt = Date.now();
    if (oversold.length) update.oversold = oversold;

    tx.set(orderRef, update, { merge: true });

    return { firstTime: !alreadyPaid, order: { ...order, ...update } as Order, oversold };
  });

  return result;
}

/** Voor mislukt, verlopen of geannuleerd: alleen de status bijwerken. */
export async function markOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  await adminDb().collection(ORDERS).doc(orderId).set({ status }, { merge: true });
}

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

export async function markOrderShipped(orderId: string, trackingCode?: string): Promise<void> {
  await adminDb()
    .collection(ORDERS)
    .doc(orderId)
    .set(
      { status: 'shipped', shippedAt: Date.now(), trackingCode: trackingCode?.trim() || null },
      { merge: true },
    );
}

/**
 * Zet de voorraad van een order terug. Gebruikt bij annuleren of terugbetalen,
 * zodat de artikelen weer verkoopbaar zijn.
 */
export async function restockOrder(orderId: string): Promise<void> {
  const db = adminDb();
  const orderRef = db.collection(ORDERS).doc(orderId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return;
    const order = normalizeOrder(snap.id, snap.data() as Record<string, unknown>);
    if (!order.stockApplied) return;

    for (const line of order.lines) {
      tx.set(
        db.collection('products').doc(line.productId),
        { stock: { quantity: FieldValue.increment(line.qty) } },
        { merge: true },
      );
    }
    tx.set(orderRef, { stockApplied: false }, { merge: true });
  });
}

/** Controleert of alles in de wagen nog op voorraad is, vlak voor het betalen. */
export async function cartStillAvailable(cartId: string): Promise<boolean> {
  const cart = await readCartById(cartId);
  if (!cart.lines.length) return false;

  const products = await getProductsByIds(cart.lines.map((l) => l.productId));
  for (const line of cart.lines) {
    const product = products.get(line.productId);
    if (!product || product.status !== 'active') return false;
    if (product.stock.tracked && !product.stock.allowBackorder && product.stock.quantity < line.qty) {
      return false;
    }
  }
  return true;
}
