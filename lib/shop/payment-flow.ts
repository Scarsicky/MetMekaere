import 'server-only';

import { getGeneralSettings, getShopSettings } from '@/lib/data/settings';
import { sendOrderConfirmation, sendOrderNotification } from '@/lib/mail';
import { emptyCartById } from '@/lib/shop/cart';
import { amountMatches, describeAmountMismatch, fetchPayment } from '@/lib/shop/mollie';
import { getOrder, markOrderPaid, markOrderStatus } from '@/lib/shop/orders';
import type { Order } from '@/types';

/**
 * Wat er moet gebeuren als de betaalstatus van een order verandert.
 *
 * Deze functie wordt vanaf twee kanten aangeroepen:
 *  - de webhook van Mollie (de gewone weg);
 *  - de bedanktpagina (voor het geval de webhook niet aankomt, bijvoorbeeld
 *    lokaal of bij een storing).
 *
 * Beide wegen leiden naar hetzelfde resultaat, en twee keer uitvoeren doet
 * niets dubbel — dat wordt afgevangen in `markOrderPaid`.
 */

export type SyncResult =
  | { outcome: 'paid'; order: Order; firstTime: boolean }
  | { outcome: 'pending'; order: Order }
  | { outcome: 'failed'; order: Order; status: Order['status'] }
  | { outcome: 'mismatch'; order: Order; detail: string }
  | { outcome: 'unknown' };

/**
 * Mag de betaalstatus van deze order nog worden bijgewerkt?
 *
 * Apart en puur, zodat het te testen is zonder Firestore — dit is precies de
 * plek waar een fout duur uitpakt.
 *
 * Twee gevallen liggen vast:
 *  - de order is al betaald of verstuurd: niets meer op te halen;
 *  - de beheerder heeft de order zelf ingetrokken of terugbetaald: dat is een
 *    besluit van een mens en wint van wat Mollie later nog meldt.
 *
 * Een order die bij Mollie strandde ('failed', 'expired', of afgebroken door de
 * klant) mag wél opnieuw gecontroleerd worden: soms komt een betaling alsnog
 * binnen.
 */
export function canSyncWithPayment(order: Pick<Order, 'status' | 'adminClosed'>): boolean {
  if (order.adminClosed) return false;
  return order.status !== 'paid' && order.status !== 'shipped' && order.status !== 'refunded';
}

export async function syncOrderWithPayment(orderId: string): Promise<SyncResult> {
  const order = await getOrder(orderId);
  if (!order) return { outcome: 'unknown' };

  /*
   * Door de beheerder afgesloten: niet aankomen. Anders draait een late
   * webhook de annulering terug, boekt de voorraad opnieuw af en krijgt de
   * klant nog een bevestiging.
   */
  if (order.adminClosed) {
    return { outcome: 'failed', order, status: order.status };
  }

  // Al afgehandeld: niets meer ophalen.
  if (!canSyncWithPayment(order)) {
    return { outcome: 'paid', order, firstTime: false };
  }
  if (!order.molliePaymentId) {
    return { outcome: 'pending', order };
  }

  const payment = await fetchPayment(order.molliePaymentId);
  if (!payment) return { outcome: 'pending', order };

  switch (payment.status) {
    case 'paid':
    case 'authorized': {
      /*
       * Betaald bedrag moet kloppen met de order. Wijkt het af, dan gaat de
       * order niet automatisch door: er wordt geen voorraad afgeboekt en geen
       * bevestiging gestuurd. Dit hoort met de hand bekeken te worden.
       */
      if (!amountMatches(order, payment)) {
        const detail = describeAmountMismatch(order, payment);
        console.error(`[betaling] bedrag wijkt af bij ${order.orderNumber}: ${detail}`);
        return { outcome: 'mismatch', order, detail };
      }

      const result = await markOrderPaid(order.id, { id: payment.id, method: payment.method });
      if (!result) return { outcome: 'unknown' };

      if (result.oversold.length) {
        console.error(
          `[voorraad] ${order.orderNumber} is betaald terwijl de voorraad ontoereikend was:`,
          result.oversold,
        );
      }

      if (result.firstTime) {
        // De winkelwagen mag leeg: er is betaald. Het wagen-id staat bij de
        // order, zodat dit ook vanuit de webhook werkt (daar is geen cookie).
        const cartId = (order as unknown as { cartId?: string }).cartId;
        if (cartId) await emptyCartById(cartId).catch(() => {});

        await sendOrderMails(result.order);
      }

      return { outcome: 'paid', order: result.order, firstTime: result.firstTime };
    }

    case 'canceled':
      await markOrderStatus(order.id, 'canceled');
      return { outcome: 'failed', order, status: 'canceled' };

    case 'expired':
      await markOrderStatus(order.id, 'expired');
      return { outcome: 'failed', order, status: 'expired' };

    case 'failed':
      await markOrderStatus(order.id, 'failed');
      return { outcome: 'failed', order, status: 'failed' };

    default:
      // 'open' of 'pending': de klant is nog bezig.
      return { outcome: 'pending', order };
  }
}

/**
 * De bevestiging aan de klant en de melding aan de eigenaar. Fouten worden
 * gelogd maar nooit doorgegeven: een betaalde bestelling mag niet alsnog
 * stuklopen omdat de mailserver het even niet doet.
 */
export async function sendOrderMails(order: Order): Promise<void> {
  try {
    const [general, shop] = await Promise.all([getGeneralSettings(), getShopSettings()]);

    const results = await Promise.allSettled([
      sendOrderConfirmation(order, general),
      sendOrderNotification(order, general, shop.orderNotificationEmail || general.email),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error(`[mail] mislukt bij ${order.orderNumber}:`, result.reason);
      } else if (!result.value.sent) {
        console.warn(`[mail] niet verstuurd bij ${order.orderNumber}: ${result.value.reason}`);
      }
    }
  } catch (error) {
    console.error(`[mail] onverwacht probleem bij ${order.orderNumber}:`, error);
  }
}
