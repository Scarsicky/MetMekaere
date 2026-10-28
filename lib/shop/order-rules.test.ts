import { describe, expect, it } from 'vitest';

import {
  addressHeading,
  fulfilmentWords,
  isPickupOrder,
  orderStatusLabel,
  shippingLineLabel,
} from '@/lib/shop/order-rules';
import type { Order } from '@/types';

type Bestelling = Pick<Order, 'status' | 'shippingMethod' | 'shippingIsPickup'>;

function order(extra: Partial<Bestelling> = {}): Bestelling {
  return { status: 'shipped', shippingMethod: 'Brievenbuspost', ...extra };
}

describe('isPickupOrder', () => {
  it('gelooft de bestelling zelf', () => {
    expect(isPickupOrder(order({ shippingIsPickup: true }))).toBe(true);
    expect(isPickupOrder(order({ shippingIsPickup: false }))).toBe(false);
  });

  it('laat de naam van de methode niet winnen van wat er is vastgelegd', () => {
    /*
     * Zou dit andersom gaan, dan verandert het verleden mee met elke keer dat
     * een verzendmethode wordt hernoemd.
     */
    const vastgelegd = order({ shippingIsPickup: false, shippingMethod: 'Ophalen in de winkel' });
    expect(isPickupOrder(vastgelegd, ['Ophalen in de winkel'])).toBe(false);
  });

  it('valt voor oude bestellingen terug op de naam van de methode', () => {
    const oud = order({ shippingMethod: 'Ophalen in de winkel' });
    expect(isPickupOrder(oud, ['Ophalen in de winkel'])).toBe(true);
    expect(isPickupOrder(oud, ['ophalen in de winkel'])).toBe(true);
    expect(isPickupOrder(oud, ['Brievenbuspost'])).toBe(false);
  });

  it('gaat bij twijfel uit van verzenden', () => {
    /*
     * De veilige kant. Een ophaalbestelling die 'verstuurd' heet is vervelend;
     * een klant die op een pakketje wacht en hoort dat hij het heeft opgehaald,
     * is onbegrijpelijk.
     */
    expect(isPickupOrder(order())).toBe(false);
    expect(isPickupOrder(order({ shippingMethod: '' }))).toBe(false);
    expect(isPickupOrder(order({ shippingMethod: 'Ophalen in de winkel' }), [])).toBe(false);
  });
});

describe('orderStatusLabel', () => {
  it('noemt een afgehandelde ophaalbestelling opgehaald', () => {
    expect(orderStatusLabel(order({ shippingIsPickup: true })).label).toBe('Opgehaald');
  });

  it('noemt een afgehandelde verzending verstuurd', () => {
    expect(orderStatusLabel(order({ shippingIsPickup: false })).label).toBe('Verstuurd');
  });

  it('raakt de andere standen niet aan', () => {
    expect(orderStatusLabel(order({ status: 'paid', shippingIsPickup: true })).label).toBe(
      'Betaald',
    );
    expect(orderStatusLabel(order({ status: 'pending', shippingIsPickup: true })).label).toBe(
      'Wacht op betaling',
    );
    expect(orderStatusLabel(order({ status: 'refunded' })).tone).toBe('grey');
  });
});

describe('shippingLineLabel', () => {
  it('zet er geen "Verzending" voor als er niets verzonden wordt', () => {
    const halen = order({ shippingIsPickup: true, shippingMethod: 'Ophalen in de winkel' });
    expect(shippingLineLabel(halen)).toBe('Ophalen in de winkel');
  });

  it('noemt verzending bij naam', () => {
    const sturen = order({ shippingIsPickup: false, shippingMethod: 'Brievenbuspost' });
    expect(shippingLineLabel(sturen)).toBe('Verzending · Brievenbuspost');
  });
});

describe('addressHeading', () => {
  it('bezorgt niets bij een ophaalbestelling', () => {
    expect(addressHeading(true)).not.toMatch(/bezorg/i);
    expect(addressHeading(true, true)).toMatch(/haalt zelf op/i);
  });

  it('heet gewoon bezorgadres als er wel bezorgd wordt', () => {
    expect(addressHeading(false)).toBe('Bezorgadres');
    expect(addressHeading(false, true)).toBe('Bezorgadres');
  });
});

describe('fulfilmentWords', () => {
  it('spreekt over ophalen of over versturen, nooit door elkaar', () => {
    expect(fulfilmentWords(true).action).toMatch(/opgehaald/i);
    expect(fulfilmentWords(true).mailHint).not.toMatch(/onderweg/i);
    expect(fulfilmentWords(false).action).toMatch(/verstuurd/i);
    expect(fulfilmentWords(false).mailHint).toMatch(/onderweg/i);
  });
});
