import 'server-only';

import createMollieClient, { Locale, type MollieClient, type Payment } from '@mollie/api-client';

import { formatCents } from '@/lib/money';
import { absoluteUrl } from '@/lib/seo';
import type { Order } from '@/types';

/**
 * Betalen via Mollie.
 *
 * Twee dingen die belangrijk zijn voor de veiligheid:
 *
 *  - De webhook wordt nooit op zijn woord geloofd. Mollie stuurt alleen een
 *    betaal-id; wij halen daarmee zélf de status op. Iemand die de webhook
 *    nabootst krijgt dus niets voor elkaar.
 *  - Het bedrag komt uit de order in Firestore, die op zijn beurt door de
 *    rekenkern is berekend. Nooit uit de browser.
 *
 * Zolang er geen sleutel is ingesteld werkt lokaal een nagebootste betaling,
 * zodat het hele proces te testen is zonder Mollie-account. In productie is
 * dat uitgeschakeld: daar weigert de checkout met een duidelijke melding.
 */

export type MollieStatus = 'open' | 'canceled' | 'pending' | 'authorized' | 'expired' | 'failed' | 'paid';

let clientCache: MollieClient | null = null;

function apiKey(): string | null {
  return process.env.MOLLIE_API_KEY?.trim() || null;
}

export function isMollieConfigured(): boolean {
  return apiKey() !== null;
}

/** Draait deze sleutel in testmodus? Dan tonen we dat duidelijk in de checkout. */
export function isMollieTestMode(): boolean {
  return apiKey()?.startsWith('test_') ?? false;
}

/**
 * Mag de checkout een nagebootste betaling gebruiken? Alleen lokaal, en alleen
 * als er geen sleutel is. Zo kan er nooit per ongeluk 'gratis' besteld worden
 * op de live site.
 */
export function useSimulatedPayments(): boolean {
  return !isMollieConfigured() && process.env.NODE_ENV !== 'production';
}

function client(): MollieClient {
  const key = apiKey();
  if (!key) throw new Error('MOLLIE_API_KEY ontbreekt.');
  if (!clientCache) clientCache = createMollieClient({ apiKey: key });
  return clientCache;
}

/** Mollie wil het bedrag als string met twee decimalen: '23.10'. */
function toMollieAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

export interface StartPaymentResult {
  paymentId: string;
  checkoutUrl: string;
  /** Aan bij een nagebootste betaling, zodat de UI dat kan tonen. */
  simulated: boolean;
}

export async function startPayment(order: Order): Promise<StartPaymentResult> {
  const redirectUrl = absoluteUrl(`/bedankt/${order.id}`);

  if (useSimulatedPayments()) {
    return {
      paymentId: `sim_${order.id}`,
      checkoutUrl: absoluteUrl(`/betaling-simuleren/${order.id}`),
      simulated: true,
    };
  }

  // De overload met callback maakt het retourtype Promise<Payment> & void;
  // met deze annotatie weet TypeScript weer waar het aan toe is.
  const payment: Payment = await client().payments.create({
    amount: { currency: 'EUR', value: toMollieAmount(order.totalCents) },
    description: `Met Mekaere ${order.orderNumber}`,
    redirectUrl,
    // Mollie kan localhost niet bereiken; dan laten we de webhook weg en
    // haalt de bedanktpagina de status zelf op.
    webhookUrl: webhookUrlOrUndefined(),
    locale: Locale.nl_NL,
    metadata: { orderId: order.id, orderNumber: order.orderNumber },
    billingAddress: {
      streetAndNumber: `${order.shipping.street} ${order.shipping.houseNumber}${order.shipping.houseNumberAddition ?? ''}`.trim(),
      postalCode: order.shipping.postalCode,
      city: order.shipping.city,
      country: order.shipping.country,
      givenName: order.customer.name.split(' ')[0],
      familyName: order.customer.name.split(' ').slice(1).join(' ') || order.customer.name,
      email: order.customer.email,
    },
  });

  const checkoutUrl = payment.getCheckoutUrl();
  if (!checkoutUrl) {
    throw new Error(`Mollie gaf geen betaallink terug voor ${order.orderNumber}.`);
  }

  return { paymentId: payment.id, checkoutUrl, simulated: false };
}

function webhookUrlOrUndefined(): string | undefined {
  const url = absoluteUrl('/api/mollie/webhook');
  // Mollie weigert localhost-webhooks; lokaal dus overslaan.
  return /localhost|127\.0\.0\.1/.test(url) ? undefined : url;
}

export interface PaymentSnapshot {
  id: string;
  status: MollieStatus;
  method: string | null;
  amountCents: number;
  orderId: string | null;
}

/**
 * Haalt de actuele status op bij Mollie. Dit is de enige bron van waarheid
 * over of er betaald is.
 */
export async function fetchPayment(paymentId: string): Promise<PaymentSnapshot | null> {
  if (useSimulatedPayments() && paymentId.startsWith('sim_')) {
    return null; // nagebootste betalingen lopen via hun eigen pagina
  }

  try {
    const payment: Payment = await client().payments.get(paymentId);
    const metadata = (payment.metadata ?? {}) as { orderId?: string };

    return {
      id: payment.id,
      status: payment.status as MollieStatus,
      method: (payment.method as string | null) ?? null,
      amountCents: Math.round(Number(payment.amount.value) * 100),
      orderId: metadata.orderId ?? null,
    };
  } catch (error) {
    console.error(`[mollie] kon betaling ${paymentId} niet ophalen:`, error);
    return null;
  }
}

/**
 * Klopt het betaalde bedrag met de order? Een verschil betekent dat er iets
 * niet in de haak is; de order gaat dan niet automatisch op 'betaald'.
 */
export function amountMatches(order: Order, snapshot: PaymentSnapshot): boolean {
  return snapshot.amountCents === order.totalCents;
}

export function describeAmountMismatch(order: Order, snapshot: PaymentSnapshot): string {
  return `Betaald ${formatCents(snapshot.amountCents)}, verwacht ${formatCents(order.totalCents)}.`;
}
