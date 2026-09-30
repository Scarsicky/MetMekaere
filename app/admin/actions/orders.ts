'use server';

import { adminError, adminOk, type AdminActionState } from '@/lib/admin/action-state';
import { requireAdmin } from '@/lib/admin/auth';
import { revalidateProducts } from '@/lib/admin/revalidate';
import { getGeneralSettings } from '@/lib/data/settings';
import { sendShippingNotice } from '@/lib/mail';
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

export async function markShippedAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = text(formData, 'id');
  const trackingCode = text(formData, 'trackingCode');
  const notify = formData.get('notify') !== 'nee';

  const order = await getOrder(id);
  if (!order) return adminError('Deze bestelling bestaat niet meer.');
  if (order.status !== 'paid' && order.status !== 'shipped') {
    return adminError('Deze bestelling is nog niet betaald.');
  }

  await markOrderShipped(id, trackingCode);

  if (notify) {
    const general = await getGeneralSettings();
    const updated = await getOrder(id);
    if (updated) {
      const result = await sendShippingNotice(updated, general);
      if (!result.sent) {
        return adminOk(
          `Gemarkeerd als verstuurd. De mail aan de klant ging niet weg (${result.reason ?? 'onbekende reden'}).`,
        );
      }
    }
  }

  return adminOk(notify ? 'Verstuurd. De klant heeft bericht gekregen.' : 'Gemarkeerd als verstuurd.');
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
  await markOrderStatus(id, 'canceled');

  revalidateProducts();
  return adminOk(
    order.stockApplied
      ? 'Geannuleerd. De voorraad is teruggezet.'
      : 'Geannuleerd.',
  );
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
  await markOrderStatus(id, 'refunded');

  revalidateProducts();
  /*
   * Het geld terugstorten doe je in het Mollie-dashboard. Dat bewust niet
   * automatiseren: terugbetalen is onomkeerbaar, en een verkeerde klik hier
   * zou echt geld kosten.
   */
  return adminOk(
    'Gemarkeerd als terugbetaald en voorraad teruggezet. Het bedrag stort je zelf terug in Mollie.',
  );
}
