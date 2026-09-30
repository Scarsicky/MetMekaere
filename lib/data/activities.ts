import 'server-only';

import { cached, TAGS, TTL } from '@/lib/data/cache';
import { adminDb, isAdminUsable } from '@/lib/firebase/admin';
import { ADVENT_DAYS, type AdventActivity } from '@/types';

/**
 * De adventskalender.
 *
 * Deze collectie bestaat al en wordt door de bestaande advent-pwa gevuld:
 * documenten met id '1' t/m '24' en een numeriek veld `day`. Het schema blijft
 * daarom precies zoals het was, inclusief `costEUR` als euro's in plaats van
 * centen. Dat is hier onschuldig — er wordt niets mee afgerekend, het wordt
 * alleen getoond — en het betekent dat de oude app en deze site dezelfde data
 * blijven delen.
 */

export { ADVENT_DAYS };
export type { AdventActivity };

/**
 * De oude advent-app vulde nieuwe dagen met de plaatshouder `Dag 1`, `Dag 2`,
 * enzovoort. Die staan nog in de database. Zouden we ze als echte titel
 * behandelen, dan meldt de kalender 24 ingevulde dagen terwijl er niets in
 * staat, en zien bezoekers 'Dag 1' in plaats van 'Nog even geduld'.
 *
 * We negeren alleen de exacte plaatshouder van de bijbehorende dag, dus
 * `Dag 7` bij dag 7. Een echte titel die toevallig zo heet is ondenkbaar; een
 * titel als `Dag van de koffie` blijft gewoon staan.
 */
export function isPlaceholderTitle(title: string, day: number): boolean {
  return new RegExp(`^dag\\s*${day}$`, 'i').test(title.trim());
}

function normalizeActivity(id: string, raw: Record<string, unknown>): AdventActivity {
  const day = typeof raw.day === 'number' ? raw.day : Number(id);
  const rawTitle = typeof raw.title === 'string' ? raw.title : '';

  return {
    day: Number.isFinite(day) ? day : 0,
    title: isPlaceholderTitle(rawTitle, day) ? '' : rawTitle,
    body: typeof raw.body === 'string' ? raw.body : '',
    location: typeof raw.location === 'string' ? raw.location : '',
    time: typeof raw.time === 'string' ? raw.time : '',
    endTime: typeof raw.endTime === 'string' ? raw.endTime : '',
    costEUR: typeof raw.costEUR === 'number' ? raw.costEUR : Number(raw.costEUR) || 0,
    emoji: typeof raw.emoji === 'string' ? raw.emoji : '',
  };
}

/**
 * Alle 24 dagen, altijd compleet. Dagen die nog niet zijn ingevuld komen als
 * leeg vakje terug, zodat de kalender geen gaten heeft.
 */
export const getAdventActivities = cached(
  async (): Promise<AdventActivity[]> => {
    const empty = (day: number): AdventActivity => ({
      day,
      title: '',
      body: '',
      location: '',
      time: '',
      endTime: '',
      costEUR: 0,
      emoji: '',
    });

    if (!isAdminUsable()) return Array.from({ length: ADVENT_DAYS }, (_, i) => empty(i + 1));
    try {
      const snap = await adminDb().collection('activities').get();
      const byDay = new Map<number, AdventActivity>();
      for (const doc of snap.docs) {
        const activity = normalizeActivity(doc.id, doc.data() as Record<string, unknown>);
        if (activity.day >= 1 && activity.day <= ADVENT_DAYS) byDay.set(activity.day, activity);
      }
      return Array.from({ length: ADVENT_DAYS }, (_, i) => byDay.get(i + 1) ?? empty(i + 1));
    } catch (error) {
      console.warn('[advent] kon activiteiten niet lezen:', error);
      return Array.from({ length: ADVENT_DAYS }, (_, i) => empty(i + 1));
    }
  },
  ['advent', 'activities'],
  { tags: [TAGS.activities], revalidate: TTL.catalog },
);

/** Het aantal dagen dat daadwerkelijk is ingevuld — voor de admin. */
export function countFilledDays(activities: AdventActivity[]): number {
  return activities.filter((a) => a.title.trim().length > 0).length;
}
