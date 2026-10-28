import type { Order } from '@/types';

/**
 * Regels over de toestand van een bestelling.
 *
 * Bewust zonder `server-only`: zowel de server als het beheerscherm in de
 * browser moeten hier bij kunnen. Zou dit in een servermodule staan, dan trekt
 * één import vanuit een clientcomponent de halve serverkant de browserbundel
 * in en klapt de build.
 */

/**
 * Mag de betaalstatus van deze order nog worden bijgewerkt?
 *
 * Twee gevallen liggen vast:
 *  - de order is al betaald of verstuurd: niets meer op te halen;
 *  - de beheerder heeft de order zelf ingetrokken of terugbetaald: dat is een
 *    besluit van een mens en wint van wat Mollie er later nog over meldt.
 *
 * Een order die bij Mollie strandde — mislukt, verlopen, of door de klant
 * afgebroken — mag wél opnieuw gecontroleerd worden. Mollie stuurt de klant na
 * zo'n poging terug naar het keuzescherm in plaats van naar ons, dus soms komt
 * een betaling alsnog binnen met een andere methode.
 */
export function canSyncWithPayment(order: Pick<Order, 'status' | 'adminClosed'>): boolean {
  if (order.adminClosed) return false;
  return order.status !== 'paid' && order.status !== 'shipped' && order.status !== 'refunded';
}

/* ------------------------------------------------------------------ *
 * Verzenden of ophalen
 * ------------------------------------------------------------------ */

/**
 * Haalt de klant deze bestelling zelf op?
 *
 * Een bestelling legt dat sinds 28 oktober 2026 zelf vast. Voor de
 * bestellingen van daarvóór blijft alleen de naam van de gekozen
 * verzendmethode over, en die vergelijken we met de methodes die als ophalen
 * zijn ingesteld.
 *
 * Die terugval kan één kant op misgaan: is zo'n methode later hernoemd, dan
 * geldt een oude ophaalbestelling als verzonden. Dat is de minst erge kant.
 * Andersom zou een klant die op een pakketje wacht te horen krijgen dat hij
 * zijn bestelling heeft opgehaald, en dat is onzin die hij niet kan plaatsen.
 */
export function isPickupOrder(
  order: Pick<Order, 'shippingIsPickup' | 'shippingMethod'>,
  pickupMethodNames: string[] = [],
): boolean {
  if (typeof order.shippingIsPickup === 'boolean') return order.shippingIsPickup;

  const name = order.shippingMethod?.trim().toLowerCase();
  if (!name) return false;
  return pickupMethodNames.some((known) => known.trim().toLowerCase() === name);
}

export interface FulfilmentWords {
  /** Het statuslabel zodra de bestelling is afgehandeld. */
  done: string;
  /** De knop die dat doet. */
  action: string;
  /** De knop als de bestelling al is afgehandeld. */
  again: string;
  /** Waar het vinkje voor de mail naast staat. */
  mailHint: string;
}

/**
 * De woorden voor één bestelling, op één plek.
 *
 * Verzenden en ophalen zijn dezelfde stap in de administratie, maar niet in
 * het Nederlands. Stonden deze woorden los door het scherm verspreid, dan gaat
 * er vroeg of laat eentje uit de pas lopen — en precies dat was de aanleiding:
 * een klant die zijn bestelling in de winkel ophaalde en per mail te horen
 * kreeg dat hij onderweg was.
 */
export function fulfilmentWords(pickup: boolean): FulfilmentWords {
  return pickup
    ? {
        done: 'Opgehaald',
        action: 'Markeer als opgehaald',
        again: 'Gegevens bijwerken',
        mailHint: '‘Je bestelling is opgehaald’ — de bevestiging achteraf.',
      }
    : {
        done: 'Verstuurd',
        action: 'Markeer als verstuurd',
        again: 'Gegevens bijwerken',
        mailHint: '‘Je bestelling is onderweg’, met de code erbij.',
      };
}

/**
 * Hoe de regel met de verzendkosten heet, in de mail en op het scherm.
 *
 * Bij ophalen is 'Verzending' gewoon onwaar, en de naam van de methode zegt
 * het al — 'Verzending · Ophalen in de winkel' leest als een vergissing.
 */
export function shippingLineLabel(
  order: Pick<Order, 'shippingIsPickup' | 'shippingMethod'>,
  pickupMethodNames: string[] = [],
): string {
  return isPickupOrder(order, pickupMethodNames)
    ? order.shippingMethod
    : `Verzending · ${order.shippingMethod}`;
}

/**
 * Het kopje boven het adres.
 *
 * 'Bezorgadres' klopt niet als de klant zijn bestelling komt halen — er wordt
 * niets bezorgd. Voor de eigenaar staat er wat anders dan voor de klant: die
 * leest het in zijn eigen bestelmelding en moet eruit kunnen opmaken dat er
 * niets verstuurd hoeft te worden.
 */
export function addressHeading(pickup: boolean, forOwner = false): string {
  if (!pickup) return 'Bezorgadres';
  return forOwner ? 'Klantgegevens (haalt zelf op)' : 'Je gegevens';
}

/** Hoe een orderstatus eruitziet in het overzicht. */
export const ORDER_STATUS_LABELS: Record<
  Order['status'],
  { label: string; tone: 'green' | 'amber' | 'red' | 'grey' | 'blue' }
> = {
  pending: { label: 'Wacht op betaling', tone: 'amber' },
  paid: { label: 'Betaald', tone: 'green' },
  shipped: { label: 'Verstuurd', tone: 'blue' },
  failed: { label: 'Mislukt', tone: 'red' },
  expired: { label: 'Verlopen', tone: 'grey' },
  canceled: { label: 'Geannuleerd', tone: 'grey' },
  refunded: { label: 'Terugbetaald', tone: 'grey' },
};

/**
 * Het statuslabel voor één bestelling.
 *
 * Alleen de afgehandelde stand verschilt: 'verstuurd' of 'opgehaald'. De
 * status in de database is voor allebei dezelfde, want het ís dezelfde stap.
 */
export function orderStatusLabel(
  order: Pick<Order, 'status' | 'shippingIsPickup' | 'shippingMethod'>,
  pickupMethodNames: string[] = [],
): { label: string; tone: 'green' | 'amber' | 'red' | 'grey' | 'blue' } {
  const base = ORDER_STATUS_LABELS[order.status];
  if (order.status !== 'shipped') return base;
  return { ...base, label: fulfilmentWords(isPickupOrder(order, pickupMethodNames)).done };
}
