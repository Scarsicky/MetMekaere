/**
 * Hoe lang een beheersessie meegaat.
 *
 * Bewust zonder `server-only`: de server handhaaft deze grenzen, en het
 * beheerscherm in de browser telt mee zodat je niet op een dood scherm blijft
 * zitten typen. Eén plek met de getallen voorkomt dat die twee gaan afwijken.
 *
 * Twee grenzen, die elk iets anders afvangen:
 *
 *  - de harde grens geldt altijd, ook als je blijft doorwerken. Een sessie die
 *    's ochtends begint, is 's avonds hoe dan ook voorbij.
 *  - de stilte-grens vangt de laptop af die open blijft staan terwijl je weg
 *    bent. Dit is de grens die je in de praktijk merkt.
 */

/** Maximale levensduur van een sessie, hoeveel je ook doet. */
export const SESSION_MAX_HOURS = 12;

/** Hoe lang er niets mag gebeuren voordat de sessie vervalt. */
export const IDLE_TIMEOUT_MINUTES = 30;

export const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000;

/**
 * Niet vaker dan dit een teken van leven naar de server sturen. Zonder deze rem
 * zou elke muisbeweging een schrijfactie worden.
 */
export const ACTIVITY_PING_MS = 2 * 60 * 1000;

/** Hoe vaak de browser zelf nakijkt of de stilte te lang duurt. */
export const IDLE_CHECK_MS = 30 * 1000;
