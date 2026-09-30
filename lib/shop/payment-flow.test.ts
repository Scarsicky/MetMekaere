import { describe, expect, it } from 'vitest';

import { canSyncWithPayment } from '@/lib/shop/order-rules';
import type { Order } from '@/types';

/**
 * Deze tests bestaan naar aanleiding van een echte fout.
 *
 * Een bestelling die al op 'verzonden' stond werd door de beheerder
 * geannuleerd. Daarna kwam er nog een melding van Mollie binnen — en omdat de
 * controle alleen naar 'paid' en 'shipped' keek, telde die als een nieuwe
 * betaling. Gevolg: de order sprong terug op betaald, de voorraad werd opnieuw
 * afgeboekt, en de klant kreeg nog een bestelbevestiging.
 *
 * De regel die dat voorkomt: wat een mens besloot wint van wat Mollie later
 * nog meldt.
 */

function order(over: Partial<Order>): Pick<Order, 'status' | 'adminClosed'> {
  return { status: 'pending', ...over } as Pick<Order, 'status' | 'adminClosed'>;
}

describe('mag de betaalstatus nog worden bijgewerkt?', () => {
  it('ja, zolang er nog op betaling wordt gewacht', () => {
    expect(canSyncWithPayment(order({ status: 'pending' }))).toBe(true);
  });

  it('nee, als er al betaald of verstuurd is', () => {
    expect(canSyncWithPayment(order({ status: 'paid' }))).toBe(false);
    expect(canSyncWithPayment(order({ status: 'shipped' }))).toBe(false);
  });

  it('nee, als de beheerder de order zelf heeft afgesloten', () => {
    // Dit is het geval dat misging.
    expect(canSyncWithPayment(order({ status: 'canceled', adminClosed: true }))).toBe(false);
    expect(canSyncWithPayment(order({ status: 'refunded', adminClosed: true }))).toBe(false);

    // Ook wanneer de status er onschuldig uitziet: de markering telt.
    expect(canSyncWithPayment(order({ status: 'pending', adminClosed: true }))).toBe(false);
  });

  it('ja, als de klant zelf afbrak bij Mollie', () => {
    /*
     * 'Geannuleerd' kan twee dingen betekenen. Brak de klant af, dan mag een
     * latere poging alsnog doorkomen. Daarom kijken we naar `adminClosed` en
     * niet alleen naar de status.
     */
    expect(canSyncWithPayment(order({ status: 'canceled' }))).toBe(true);
    expect(canSyncWithPayment(order({ status: 'failed' }))).toBe(true);
    expect(canSyncWithPayment(order({ status: 'expired' }))).toBe(true);
  });

  it('nee, bij een terugbetaling — ook zonder markering', () => {
    // Terugbetaald is hoe dan ook een eindstation.
    expect(canSyncWithPayment(order({ status: 'refunded' }))).toBe(false);
  });
});
