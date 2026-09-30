import 'server-only';

import { DEFAULT_PAGES } from '@/lib/cms/default-content';
import {
  DEFAULT_ADVENT,
  DEFAULT_COMMUNITY,
  DEFAULT_GENERAL,
  DEFAULT_SHOP,
} from '@/lib/data/normalize';
import { adminDb } from '@/lib/firebase/admin';
import {
  seedCategories,
  seedDialect,
  seedDiscountCodes,
  seedHappenings,
  seedProducts,
  seedShippingRates,
  seedTierRules,
} from '@/lib/seed/starter-content';
import { ADVENT_DAYS } from '@/types';

/**
 * De startinhoud plaatsen.
 *
 * Gedeeld door `npm run seed` en de knop in de admin. Die knop bestaat omdat
 * de live database anders alleen te vullen is met een service-account-sleutel
 * op je eigen laptop — en zo'n sleutel wil je daar liever niet hebben liggen.
 * De server heeft de rechten al.
 *
 * Bestaande documenten worden standaard met rust gelaten. Je kunt dit dus
 * veilig nog eens draaien nadat je teksten hebt aangepast: jouw werk blijft
 * staan, alleen wat ontbreekt komt erbij.
 */

export interface SeedReport {
  written: number;
  skipped: number;
  adventCreated: number;
  perCollection: { label: string; written: number; skipped: number }[];
}

export async function applyStarterContent(options: { force?: boolean } = {}): Promise<SeedReport> {
  const force = options.force ?? false;
  const db = adminDb();

  let written = 0;
  let skipped = 0;
  const perCollection: SeedReport['perCollection'] = [];

  async function put(collection: string, id: string, data: Record<string, unknown>): Promise<boolean> {
    const ref = db.collection(collection).doc(id);

    if (!force) {
      const existing = await ref.get();
      if (existing.exists) {
        skipped += 1;
        return false;
      }
    }

    await ref.set(data, { merge: true });
    written += 1;
    return true;
  }

  /** Plaatst een groepje en houdt bij hoeveel er nieuw was. */
  async function group(
    label: string,
    collection: string,
    records: { id: string; data: Record<string, unknown> }[],
  ) {
    let groupWritten = 0;
    for (const record of records) {
      if (await put(collection, record.id, record.data)) groupWritten += 1;
    }
    perCollection.push({
      label,
      written: groupWritten,
      skipped: records.length - groupWritten,
    });
  }

  /* Instellingen */
  await group('Instellingen', 'settings', [
    { id: 'general', data: { ...DEFAULT_GENERAL } },
    { id: 'shop', data: { ...DEFAULT_SHOP } },
    { id: 'advent', data: { ...DEFAULT_ADVENT } },
    { id: 'community', data: { ...DEFAULT_COMMUNITY } },
  ]);

  /* Redactionele pagina's */
  await group(
    'Pagina’s',
    'pages',
    Object.values(DEFAULT_PAGES).map((page) => ({
      id: page.slug,
      data: {
        slug: page.slug,
        title: page.title,
        seo: page.seo ?? null,
        blocks: page.blocks,
        published: page.published,
        updatedAt: Date.now(),
      },
    })),
  );

  /* Catalogus */
  await group(
    'Categorieën',
    'categories',
    seedCategories.map(({ id, ...rest }) => ({ id, data: rest })),
  );
  await group(
    'Producten',
    'products',
    seedProducts.map(({ id, ...rest }) => ({ id, data: rest })),
  );
  await group(
    'Staffelvoordeel',
    'tierRules',
    seedTierRules.map(({ id, ...rest }) => ({ id, data: rest })),
  );
  await group(
    'Verzendtarieven',
    'shippingRates',
    seedShippingRates.map(({ id, ...rest }) => ({ id, data: rest })),
  );
  await group(
    'Kortingscodes',
    'discountCodes',
    seedDiscountCodes.map((code) => ({ id: code.code, data: { ...code } })),
  );

  /* Doen en Beleven + Fluffy Dialect */
  await group(
    'Activiteiten',
    'happenings',
    seedHappenings.map(({ id, ...rest }) => ({ id, data: rest })),
  );
  await group(
    'Dialectwoorden',
    'dialect',
    seedDialect.map(({ id, ...rest }) => ({ id, data: rest })),
  );

  /*
   * De adventskalender: 24 lege dagen zodat de kalender compleet is. Hier
   * nooit overschrijven, ook niet met --force — deze collectie wordt gedeeld
   * met de bestaande advent-app en daar staat mogelijk al inhoud in.
   */
  let adventCreated = 0;
  for (let day = 1; day <= ADVENT_DAYS; day++) {
    const ref = db.collection('activities').doc(String(day));
    if ((await ref.get()).exists) continue;
    await ref.set({ day, title: '', body: '', location: '', time: '', endTime: '', costEUR: 0, emoji: '' });
    adventCreated += 1;
  }

  return { written, skipped, adventCreated, perCollection };
}

/** Hoeveel er al staat, per collectie. Voor het opstartscherm. */
export async function countExistingContent(): Promise<Record<string, number>> {
  const db = adminDb();
  const collections = [
    'settings',
    'pages',
    'categories',
    'products',
    'tierRules',
    'shippingRates',
    'discountCodes',
    'happenings',
    'dialect',
    'activities',
    'orders',
  ];

  const entries = await Promise.all(
    collections.map(async (name) => {
      try {
        const snap = await db.collection(name).count().get();
        return [name, snap.data().count] as const;
      } catch {
        return [name, 0] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}
