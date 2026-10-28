'use server';

import { adminError, adminOk, type AdminActionState } from '@/lib/admin/action-state';
import { requireAdmin } from '@/lib/admin/auth';
import { revalidateProducts } from '@/lib/admin/revalidate';
import { getPickupMethodNames } from '@/lib/data/catalog';
import { getGeneralSettings } from '@/lib/data/settings';
import { sendCancellationNotice, sendPickupNotice, sendShippingNotice } from '@/lib/mail';
import { isPickupOrder } from '@/lib/shop/order-rules';
import {
  getOrder,
  markOrderShipped,
  markOrderStatus,
  restockOrder,
} from '@/lib/shop/orders';
import { syncOrderWithPayment } from '@/lib/shop/payment-flow';

/** Wat je met een binnengekomen bestelling kunt doen. */

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * De bestelling afhandelen: verstuurd of opgehaald.
 *
 * Eén handeling met twee gezichten. Wat het wordt, bepaalt de bestelling zelf
 * — niet een keuze van de beheerder, want de klant koos bij het afrekenen al
 * of hij hem kwam halen. Zou dat hier opnieuw te kiezen zijn, dan is dat een
 * kans om het verkeerd te doen zonder dat er iets mee gewonnen wordt.
 */
export async function markFulfilledAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = text(formData, 'id');
  const notify = formData.get('notify') !== 'nee';

  const order = await getOrder(id);
  if (!order) return adminError('Deze bestelling bestaat niet meer.');
  if (order.status !== 'paid' && order.status !== 'shipped') {
    return adminError('Deze bestelling is nog niet betaald.');
  }

  const pickup = isPickupOrder(order, await getPickupMethodNames());
  // Bij ophalen valt er niets te volgen, dus ook geen code om te bewaren.
  const trackingCode = pickup ? '' : text(formData, 'trackingCode');

  await markOrderShipped(id, trackingCode);

  const gedaan = pickup ? 'Gemarkeerd als opgehaald' : 'Gemarkeerd als verstuurd';

  if (notify) {
    const general = await getGeneralSettings();
    const updated = await getOrder(id);
    if (updated) {
      const result = pickup
        ? await sendPickupNotice(updated, general)
        : await sendShippingNotice(updated, general);
      if (!result.sent) {
        return adminOk(
          `${gedaan}. De mail aan de klant ging niet weg (${result.reason ?? 'onbekende reden'}).`,
        );
      }
    }
  }

  return adminOk(notify ? `${gedaan}. De klant heeft bericht gekregen.` : `${gedaan}.`);
}

/**
 * Betaalstatus opnieuw ophalen bij Mollie. Handig als een webhook is
 * blijven steken en een bestelling ten onrechte op 'wacht op betaling' staat.
 */
export async function refreshPaymentAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = text(formData, 'id');
  const result = await syncOrderWithPayment(id);

  switch (result.outcome) {
    case 'paid':
      revalidateProducts();
      return adminOk(
        result.firstTime
          ? 'De betaling is alsnog binnengekomen. Voorraad is afgeboekt en de klant heeft bericht.'
          : 'Deze bestelling was al betaald.',
      );
    case 'failed':
      return adminOk('De betaling is niet doorgegaan. Status bijgewerkt.');
    case 'mismatch':
      return adminError(`Het betaalde bedrag wijkt af. ${result.detail}`);
    case 'pending':
      return adminOk('Nog geen betaling binnen.');
    default:
      return adminError('Deze bestelling is niet gevonden.');
  }
}

export async function cancelOrderAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = text(formData, 'id');
  const order = await getOrder(id);
  if (!order) return adminError('Deze bestelling bestaat niet meer.');

  // Is de voorraad al afgeboekt, dan gaat hij terug — de artikelen zijn
  // immers weer verkoopbaar.
  if (order.stockApplied) await restockOrder(id);

  /*
   * `adminClosed` legt vast dat een mens dit besloot. Zonder die markering
   * draait een late webhook van Mollie de annulering terug: de order gaat weer
   * op betaald, de voorraad wordt opnieuw afgeboekt en de klant krijgt nog een
   * bevestiging.
   */
  await markOrderStatus(id, 'canceled', { adminClosed: true });

  const parts = ['Geannuleerd.'];
  if (order.stockApplied) parts.push('De voorraad is teruggezet.');

  if (formData.get('notify') !== 'nee') {
    const general = await getGeneralSettings();
    const updated = await getOrder(id);
    const result = updated
      ? await sendCancellationNotice(updated, general, text(formData, 'reason') || undefined)
      : { sent: false, reason: 'order niet gevonden' };
    parts.push(
      result.sent
        ? 'De klant heeft bericht gekregen.'
        : `De mail aan de klant ging niet weg (${result.reason ?? 'onbekende reden'}).`,
    );
  }

  revalidateProducts();
  return adminOk(parts.join(' '));
}

export async function refundOrderAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = text(formData, 'id');
  const order = await getOrder(id);
  if (!order) return adminError('Deze bestelling bestaat niet meer.');

  if (order.stockApplied) await restockOrder(id);
  await markOrderStatus(id, 'refunded', { adminClosed: true });

  const parts = ['Gemarkeerd als terugbetaald en voorraad teruggezet.'];

  if (formData.get('notify') !== 'nee') {
    const general = await getGeneralSettings();
    const updated = await getOrder(id);
    const result = updated
      ? await sendCancellationNotice(updated, general, text(formData, 'reason') || undefined)
      : { sent: false, reason: 'order niet gevonden' };
    parts.push(
      result.sent
        ? 'De klant heeft bericht gekregen.'
        : `De mail aan de klant ging niet weg (${result.reason ?? 'onbekende reden'}).`,
    );
  }

  revalidateProducts();
  /*
   * Het geld terugstorten doe je in het Mollie-dashboard. Dat bewust niet
   * automatiseren: terugbetalen is onomkeerbaar, en een verkeerde klik hier
   * zou echt geld kosten.
   */
  parts.push('Het bedrag stort je zelf terug in Mollie.');
  return adminOk(parts.join(' '));
}
