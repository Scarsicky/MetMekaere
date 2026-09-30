'use server';

import { redirect } from 'next/navigation';

import { getGeneralSettings, getShopSettings } from '@/lib/data/settings';
import { subscribeToNewsletter } from '@/lib/newsletter';
import { limitByIp } from '@/lib/rate-limit';
import { readCartId, setShippingChoice } from '@/lib/shop/cart';
import { checkoutFromFormData, checkoutSchema, flattenIssues } from '@/lib/shop/checkout-schema';
import { isMollieConfigured, startPayment, useSimulatedPayments } from '@/lib/shop/mollie';
import { attachPayment, createPendingOrder } from '@/lib/shop/orders';
import { normalizePostalCode } from '@/lib/utils';
import type { CheckoutActionState } from '@/lib/shop/action-state';

/**
 * Afrekenen.
 *
 * De volgorde is bewust: eerst alles controleren, dan pas een order aanmaken,
 * en pas daarna naar de betaalpagina. Zo blijven er geen half aangemaakte
 * orders achter als er iets niet klopt aan de invoer.
 */
export async function checkoutAction(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const limit = await limitByIp('checkout', 10, 300);
  if (!limit.allowed) {
    return {
      status: 'error',
      message: 'Je hebt dit net al een paar keer geprobeerd. Wacht even en probeer het opnieuw.',
    };
  }

  const shopSettings = await getShopSettings();
  if (shopSettings.closed) {
    return {
      status: 'error',
      message: shopSettings.closedMessage || 'De shop is tijdelijk gesloten.',
    };
  }

  const parsed = checkoutSchema.safeParse(checkoutFromFormData(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Er ontbreekt nog iets. Kijk de rood gemarkeerde velden even na.',
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  const input = parsed.data;

  const cartId = await readCartId();
  if (!cartId) {
    return { status: 'error', message: 'Je winkelwagen is leeg.' };
  }

  if (!isMollieConfigured() && !useSimulatedPayments()) {
    console.error('[checkout] MOLLIE_API_KEY ontbreekt in productie.');
    return {
      status: 'error',
      message:
        'Betalen is op dit moment niet mogelijk. Probeer het later nog eens of neem even contact op.',
    };
  }

  // Land en verzendmethode vastleggen, zodat de order met de juiste
  // verzendkosten wordt doorgerekend.
  const shippingChoice = await setShippingChoice({
    country: input.shipping.country,
    shippingRateId: input.shippingRateId ?? null,
  });
  if (!shippingChoice.ok) {
    return { status: 'error', message: shippingChoice.error };
  }

  const order = await createPendingOrder(cartId, {
    customer: {
      name: input.shipping.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
    },
    shipping: {
      ...input.shipping,
      postalCode: normalizePostalCode(input.shipping.postalCode, input.shipping.country),
    },
    billing: input.billingSameAsShipping
      ? null
      : input.billing
        ? {
            ...input.billing,
            postalCode: normalizePostalCode(input.billing.postalCode, input.billing.country),
          }
        : null,
    newsletterOptIn: input.newsletterOptIn,
    notes: input.notes,
  });

  if (!order.ok) {
    return { status: 'error', message: order.error };
  }

  // De nieuwsbrief mag het afrekenen nooit ophouden.
  if (input.newsletterOptIn) {
    void subscribeToNewsletter({
      email: input.email,
      name: input.shipping.name,
      source: 'checkout',
    }).catch((error) => console.error('[checkout] nieuwsbriefinschrijving mislukte:', error));
  }

  let checkoutUrl: string;
  try {
    const payment = await startPayment(order.order);
    await attachPayment(order.order.id, payment.paymentId);
    checkoutUrl = payment.checkoutUrl;
  } catch (error) {
    console.error('[checkout] kon de betaling niet starten:', error);
    const general = await getGeneralSettings();
    return {
      status: 'error',
      message: `Het lukte niet om de betaling te starten. Probeer het nog eens, of mail naar ${general.email} — je bestelnummer is ${order.order.orderNumber}.`,
    };
  }

  // redirect() gooit intern een speciale fout; die moet buiten de try staan.
  redirect(checkoutUrl);
}
