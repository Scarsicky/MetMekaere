import 'server-only';

import { adminDb, isAdminUsable } from '@/lib/firebase/admin';
import { cached, TAGS, TTL } from '@/lib/data/cache';
import {
  DEFAULT_ADVENT,
  DEFAULT_COMMUNITY,
  DEFAULT_GENERAL,
  DEFAULT_SHOP,
  normalizeAdventSettings,
  normalizeCommunitySettings,
  normalizeGeneralSettings,
  normalizeShopSettings,
} from '@/lib/data/normalize';
import type { AdventSettings, CommunitySettings, GeneralSettings, ShopSettings } from '@/types';

/**
 * Instellingen uit `settings/{general,shop,advent,community}`.
 *
 * Als Firestore niets teruggeeft — leeg project, nog geen seed, of even
 * onbereikbaar — vallen we terug op de standaarden. De site hoort dan een
 * nette pagina te tonen, geen foutmelding.
 */

async function readSettingsDoc(id: string): Promise<Record<string, unknown> | null> {
  if (!isAdminUsable()) return null;
  try {
    const snap = await adminDb().collection('settings').doc(id).get();
    return snap.exists ? (snap.data() as Record<string, unknown>) : null;
  } catch (error) {
    console.warn(`[settings] kon settings/${id} niet lezen, standaarden worden gebruikt:`, error);
    return null;
  }
}

export const getGeneralSettings = cached(
  async (): Promise<GeneralSettings> => normalizeGeneralSettings(await readSettingsDoc('general')),
  ['settings', 'general'],
  { tags: [TAGS.settings], revalidate: TTL.settings },
);

export const getShopSettings = cached(
  async (): Promise<ShopSettings> => normalizeShopSettings(await readSettingsDoc('shop')),
  ['settings', 'shop'],
  { tags: [TAGS.settings], revalidate: TTL.settings },
);

export const getAdventSettings = cached(
  async (): Promise<AdventSettings> => normalizeAdventSettings(await readSettingsDoc('advent')),
  ['settings', 'advent'],
  { tags: [TAGS.settings], revalidate: TTL.settings },
);

export const getCommunitySettings = cached(
  async (): Promise<CommunitySettings> => normalizeCommunitySettings(await readSettingsDoc('community')),
  ['settings', 'community'],
  { tags: [TAGS.settings], revalidate: TTL.settings },
);

export { DEFAULT_ADVENT, DEFAULT_COMMUNITY, DEFAULT_GENERAL, DEFAULT_SHOP };

/* ------------------------------------------------------------------ *
 * Seizoen van de adventskalender
 * ------------------------------------------------------------------ */

/**
 * Bepaalt of de adventskalender nu in het seizoen zit.
 *
 * `visibleFrom` en `visibleUntil` zijn dag-in-het-jaar ('MM-DD'), zodat de
 * admin het niet elk jaar hoeft aan te passen. Een venster dat over de
 * jaargrens loopt (15 november t/m 7 januari) wordt correct behandeld.
 */
export function isAdventInSeason(settings: AdventSettings, now = new Date()): boolean {
  if (!settings.enabled) return false;

  const today = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const from = settings.visibleFrom;
  const until = settings.visibleUntil;

  if (!/^\d{2}-\d{2}$/.test(from) || !/^\d{2}-\d{2}$/.test(until)) return true;

  // Venster binnen één kalenderjaar.
  if (from <= until) return today >= from && today <= until;
  // Venster over de jaarwissel heen.
  return today >= from || today <= until;
}
