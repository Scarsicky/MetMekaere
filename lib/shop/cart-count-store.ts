'use client';

import { useSyncExternalStore } from 'react';

/**
 * Het aantal artikelen in de winkelwagen, voor het bolletje in de header.
 *
 * Waarom niet gewoon op de server renderen? Omdat de header in de root-layout
 * staat: zou hij de winkelwagen-cookie lezen, dan wordt élke pagina dynamisch
 * en verliezen we het statisch uitserveren van de gewone pagina's. Dit getal
 * is geen inhoud die een zoekmachine hoeft te zien, dus het wordt na het laden
 * opgehaald en daarna direct bijgewerkt door 'in winkelwagen'.
 */

let count: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): number | null {
  return count;
}

/** Op de server weten we het nog niet; `null` zorgt dat er niets flikkert. */
function getServerSnapshot(): number | null {
  return null;
}

/** Zet het aantal, bijvoorbeeld na het toevoegen van een product. */
export function setCartCount(next: number) {
  if (count === next) return;
  count = next;
  emit();
}

export function useCartCount(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

let fetched = false;

/** Haalt het aantal één keer per paginabezoek op. */
export async function loadCartCountOnce() {
  if (fetched) return;
  fetched = true;
  try {
    const res = await fetch('/api/cart/summary', { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as { itemCount?: number };
    if (typeof data.itemCount === 'number') setCartCount(data.itemCount);
  } catch {
    // Geen bolletje is beter dan een foutmelding voor iets kleins als dit.
  }
}
