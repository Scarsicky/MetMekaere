import 'server-only';

import { adminBucket } from '@/lib/firebase/admin';

/**
 * Foto's opruimen die niet meer gebruikt worden.
 *
 * Twee problemen die hiermee worden opgelost. De fotobeheerder gooide een
 * bestand meteen weg zodra je op het kruisje klikte — klikte je daarna weg
 * zonder op te slaan, dan wees het product naar een foto die niet meer bestond.
 * En omgekeerd: verwijderde je een hele activiteit, dan bleven haar foto's voor
 * altijd in de opslag staan zonder dat iets er nog naar verwees.
 *
 * De regel is nu: **weggooien gebeurt pas bij het opslaan, en alleen van wat er
 * daarna echt niet meer bij hoort.** De server bepaalt dat zelf door de oude en
 * de nieuwe toestand te vergelijken, en gelooft dus niet een lijstje dat de
 * browser meestuurt.
 */

/**
 * Alle opslagpaden die ergens in dit document voorkomen.
 *
 * Loopt het hele document door in plaats van te weten waar foto's zitten.
 * Blokken op een pagina kunnen willekeurig diep genest zijn, en een veld dat
 * er later bij komt wordt zo vanzelf meegenomen.
 */
export function collectImagePaths(value: unknown): string[] {
  const found = new Set<string>();

  function walk(node: unknown): void {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (!node || typeof node !== 'object') return;

    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      // Alleen een `path` dat in onze eigen publieke map staat telt mee.
      if (key === 'path' && typeof child === 'string' && child.startsWith('public/')) {
        found.add(child);
      } else {
        walk(child);
      }
    }
  }

  walk(value);
  return [...found];
}

/**
 * Verwijdert de paden die wel in `before` zaten maar niet meer in `after`.
 *
 * Mislukken mag nooit het opslaan raken: de wijziging van de beheerder is
 * belangrijker dan een bestand dat blijft liggen. Een achtergebleven foto kost
 * opslagruimte; een mislukte opslag kost werk.
 */
export async function deleteUnusedImages(before: string[], after: string[]): Promise<void> {
  if (!before.length) return;

  const keep = new Set(after);
  const gone = before.filter((path) => !keep.has(path) && path.startsWith('public/'));
  if (!gone.length) return;

  try {
    const bucket = adminBucket();
    await Promise.all(
      gone.map((path) =>
        bucket
          .file(path)
          .delete({ ignoreNotFound: true })
          .catch((error) => {
            console.warn(`[opruimen] kon ${path} niet verwijderen:`, error);
          }),
      ),
    );
  } catch (error) {
    console.error('[opruimen] verwijderen van ongebruikte foto’s mislukte:', error);
  }
}
