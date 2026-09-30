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
