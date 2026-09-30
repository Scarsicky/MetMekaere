/**
 * Vult Firestore met de startinhoud.
 *
 * Gebruik:
 *   npm run seed            — schrijft alleen wat er nog niet is
 *   npm run seed -- --force — overschrijft ook bestaande documenten
 *
 * Standaard wordt niets overschreven. Zo kun je de seed veilig nog eens
 * draaien nadat je in de admin teksten hebt aangepast: je eigen werk blijft
 * staan, en alleen wat ontbreekt komt erbij.
 *
 * Draait tegen de emulator als FIRESTORE_EMULATOR_HOST is gezet, en anders
 * tegen het echte project.
 */

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

const force = process.argv.includes('--force');

let written = 0;
let skipped = 0;

async function put(collection: string, id: string, data: Record<string, unknown>) {
  const ref = adminDb().collection(collection).doc(id);

  if (!force) {
    const existing = await ref.get();
    if (existing.exists) {
      skipped += 1;
      return;
    }
  }

  await ref.set(data, { merge: true });
  written += 1;
}

async function main() {
  const target = process.env.FIRESTORE_EMULATOR_HOST
    ? `emulator op ${process.env.FIRESTORE_EMULATOR_HOST}`
    : `project ${process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`;

  console.log(`Seeden naar ${target}${force ? ' (met --force: bestaande documenten worden overschreven)' : ''}\n`);

  /* Instellingen */
  await put('settings', 'general', { ...DEFAULT_GENERAL });
  await put('settings', 'shop', { ...DEFAULT_SHOP });
  await put('settings', 'advent', { ...DEFAULT_ADVENT });
  await put('settings', 'community', { ...DEFAULT_COMMUNITY });
  console.log('· instellingen');

  /* Redactionele pagina's */
  for (const page of Object.values(DEFAULT_PAGES)) {
    await put('pages', page.slug, {
      slug: page.slug,
      title: page.title,
      seo: page.seo ?? null,
      blocks: page.blocks,
      published: page.published,
      updatedAt: Date.now(),
    });
  }
  console.log(`· ${Object.keys(DEFAULT_PAGES).length} pagina's`);

  /* Catalogus */
  for (const category of seedCategories) {
    const { id, ...rest } = category;
    await put('categories', id, rest);
  }
  console.log(`· ${seedCategories.length} categorieën`);

  for (const product of seedProducts) {
    const { id, ...rest } = product;
    await put('products', id, rest);
  }
  console.log(`· ${seedProducts.length} producten`);

  for (const rule of seedTierRules) {
    const { id, ...rest } = rule;
    await put('tierRules', id, rest);
  }
  console.log(`· ${seedTierRules.length} staffelregel(s)`);

  for (const rate of seedShippingRates) {
    const { id, ...rest } = rate;
    await put('shippingRates', id, rest);
  }
  console.log(`· ${seedShippingRates.length} verzendtarieven`);

  for (const code of seedDiscountCodes) {
    await put('discountCodes', code.code, { ...code });
  }
  console.log(`· ${seedDiscountCodes.length} kortingscodes`);

  /* Doen en Beleven + Fluffy Dialect */
  for (const happening of seedHappenings) {
    const { id, ...rest } = happening;
    await put('happenings', id, rest);
  }
  console.log(`· ${seedHappenings.length} activiteiten`);

  for (const entry of seedDialect) {
    const { id, ...rest } = entry;
    await put('dialect', id, rest);
  }
  console.log(`· ${seedDialect.length} dialectwoord(en)`);

  /* Adventskalender: 24 lege dagen, zodat de kalender compleet is.
     Bestaande dagen blijven staan, ook met --force. */
  const activities = adminDb().collection('activities');
  let adventCreated = 0;
  for (let day = 1; day <= 24; day++) {
    const ref = activities.doc(String(day));
    if ((await ref.get()).exists) continue;
    await ref.set({ day, title: '', body: '', location: '', time: '', endTime: '', costEUR: 0, emoji: '' });
    adventCreated += 1;
  }
  console.log(`· adventskalender: ${adventCreated} nieuwe dagen, ${24 - adventCreated} bestonden al`);

  console.log(`\nKlaar. ${written} documenten geschreven, ${skipped} overgeslagen omdat ze al bestonden.`);
  if (skipped > 0 && !force) {
    console.log('Wil je die tóch overschrijven, draai dan: npm run seed -- --force');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nSeeden mislukt:', error);
    process.exit(1);
  });
