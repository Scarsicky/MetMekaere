import 'server-only';

import { revalidateTag } from 'next/cache';

import { TAGS } from '@/lib/data/cache';

/**
 * Na een wijziging in de admin: de betrokken cache vernieuwen.
 *
 * In Next 16 wil `revalidateTag` naast het label ook een profiel. Wij gebruiken
 * overal `'max'`: de bewaarde versie vervalt, en de eerstvolgende bezoeker
 * krijgt de nieuwe inhoud. Dat is precies wat je wilt na 'opslaan' — je wilt
 * je wijziging zien, niet een halfuur later.
 */
const PROFILE = 'max';

export function revalidateProducts(): void {
  revalidateTag(TAGS.products, PROFILE);
  revalidateTag(TAGS.categories, PROFILE);
}

export function revalidateCategories(): void {
  revalidateTag(TAGS.categories, PROFILE);
  revalidateTag(TAGS.products, PROFILE);
}

export function revalidateShopRules(): void {
  revalidateTag(TAGS.tiers, PROFILE);
  revalidateTag(TAGS.shipping, PROFILE);
  revalidateTag(TAGS.products, PROFILE);
}

export function revalidateContent(): void {
  revalidateTag(TAGS.pages, PROFILE);
}

export function revalidateHappenings(): void {
  revalidateTag(TAGS.happenings, PROFILE);
  revalidateTag(TAGS.pages, PROFILE);
}

export function revalidateDialect(): void {
  revalidateTag(TAGS.dialect, PROFILE);
  revalidateTag(TAGS.pages, PROFILE);
}

export function revalidateActivities(): void {
  revalidateTag(TAGS.activities, PROFILE);
}

export function revalidateSettings(): void {
  revalidateTag(TAGS.settings, PROFILE);
}

/** Alles, voor het geval een wijziging breed doorwerkt. */
export function revalidateEverything(): void {
  for (const tag of [
    TAGS.settings,
    TAGS.products,
    TAGS.categories,
    TAGS.tiers,
    TAGS.shipping,
    TAGS.pages,
    TAGS.happenings,
    TAGS.dialect,
    TAGS.activities,
  ]) {
    revalidateTag(tag, PROFILE);
  }
}
