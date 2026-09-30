'use server';

import { adminError, adminOk, type AdminActionState } from '@/lib/admin/action-state';
import { requireAdmin } from '@/lib/admin/auth';
import {
  revalidateActivities,
  revalidateContent,
  revalidateDialect,
  revalidateHappenings,
} from '@/lib/admin/revalidate';
import { normalizeBlocks } from '@/lib/data/normalize';
import { adminDb } from '@/lib/firebase/admin';
import { randomId, slugify } from '@/lib/utils';

/** Pagina's, activiteiten, dialectwoorden en de adventskalender. */

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function checkbox(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

function json<T>(formData: FormData, key: string, fallback: T): T {
  const raw = text(formData, key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ *
 * CMS-pagina's
 * ------------------------------------------------------------------ */

export async function savePageAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const slug = slugify(text(formData, 'slug'));
  if (!slug) return adminError('Deze pagina heeft geen webadres.');

  const title = text(formData, 'title');
  if (!title) {
    return adminError('Geef de pagina een titel.', { title: 'Dit veld is verplicht.' });
  }

  /*
   * De blokken gaan door dezelfde controle als bij het uitlezen. Een blok dat
   * daar niet doorheen komt — bijvoorbeeld een tekstblok zonder tekst — wordt
   * weggelaten. Dat melden we, zodat je niet denkt dat het is opgeslagen.
   */
  const submitted = json<unknown[]>(formData, 'blocks', []);
  const blocks = normalizeBlocks(submitted);
  const dropped = submitted.length - blocks.length;

  await adminDb()
    .collection('pages')
    .doc(slug)
    .set(
      {
        slug,
        title,
        seo: {
          title: text(formData, 'seoTitle') || null,
          description: text(formData, 'seoDescription') || null,
        },
        blocks,
        published: checkbox(formData, 'published'),
        updatedAt: Date.now(),
      },
      { merge: true },
    );

  revalidateContent();

  if (dropped > 0) {
    return adminOk(
      `Opgeslagen. ${dropped} ${dropped === 1 ? 'blok is' : 'blokken zijn'} weggelaten omdat er nog iets ontbrak — controleer of alles is ingevuld.`,
    );
  }
  return adminOk(
    checkbox(formData, 'published') ? 'Opgeslagen en zichtbaar.' : 'Opgeslagen als concept.',
  );
}

/* ------------------------------------------------------------------ *
 * Doen en Beleven
 * ------------------------------------------------------------------ */

export async function saveHappeningAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const title = text(formData, 'title');
  if (!title) return adminError('Geef de activiteit een naam.', { title: 'Dit veld is verplicht.' });

  const id = text(formData, 'id') || null;
  const slug = slugify(text(formData, 'slug') || title) || randomId(8);

  const date = text(formData, 'date');
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return adminError('De datum klopt niet.', { date: 'Kies een datum uit de kalender.' });
  }

  const data = {
    slug,
    title,
    summary: text(formData, 'summary'),
    body: text(formData, 'body'),
    images: json(formData, 'images', []),
    theme: text(formData, 'theme') || 'Gek & Onverwacht',
    location: text(formData, 'location') || null,
    date: date || null,
    startTime: text(formData, 'startTime') || null,
    endTime: text(formData, 'endTime') || null,
    priceLabel: text(formData, 'priceLabel') || null,
    signupUrl: text(formData, 'signupUrl') || null,
    membersOnly: checkbox(formData, 'membersOnly'),
    status: checkbox(formData, 'published') ? 'published' : 'draft',
    featured: checkbox(formData, 'featured'),
    sortOrder: Number(text(formData, 'sortOrder')) || 0,
    seo: {
      title: text(formData, 'seoTitle') || null,
      description: text(formData, 'seoDescription') || null,
    },
    updatedAt: Date.now(),
  };

  const docId = id ?? slug;
  const ref = adminDb().collection('happenings').doc(docId);
  const existing = await ref.get();

  await ref.set(existing.exists ? data : { ...data, createdAt: Date.now() }, { merge: true });

  revalidateHappenings();
  return existing.exists
    ? adminOk(data.status === 'published' ? 'Opgeslagen en zichtbaar.' : 'Opgeslagen als concept.')
    : adminOk('Activiteit aangemaakt.', `/admin/doen-en-beleven/${docId}`);
}

export async function deleteHappeningAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = text(formData, 'id');
  if (!id) return adminError('Onbekende activiteit.');

  await adminDb().collection('happenings').doc(id).delete();
  revalidateHappenings();
  return adminOk('Activiteit verwijderd.', '/admin/doen-en-beleven');
}

/* ------------------------------------------------------------------ *
 * Fluffy Dialect
 * ------------------------------------------------------------------ */

interface DialectDraft {
  id: string;
  word: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  kind: string;
  productSlug: string;
  featured: boolean;
  published: boolean;
}

export async function saveDialectAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const drafts = json<DialectDraft[]>(formData, 'entries', []);
  const db = adminDb();
  const existing = await db.collection('dialect').get();
  const keep = new Set<string>();
  const batch = db.batch();
  let saved = 0;

  for (const draft of drafts) {
    const word = draft.word?.trim();
    const meaning = draft.meaning?.trim();
    if (!word || !meaning) continue;

    const id = draft.id?.trim() || slugify(word) || randomId(8);
    keep.add(id);
    saved += 1;

    batch.set(
      db.collection('dialect').doc(id),
      {
        word,
        meaning,
        example: draft.example?.trim() || null,
        exampleTranslation: draft.exampleTranslation?.trim() || null,
        kind: draft.kind?.trim() || null,
        productSlug: draft.productSlug?.trim() ? slugify(draft.productSlug) : null,
        featured: Boolean(draft.featured),
        status: draft.published === false ? 'draft' : 'published',
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  }

  for (const doc of existing.docs) {
    if (!keep.has(doc.id)) batch.delete(doc.ref);
  }

  await batch.commit();
  revalidateDialect();
  return adminOk(
    saved === 1 ? '1 woord opgeslagen.' : `${saved} woorden opgeslagen.`,
  );
}

/* ------------------------------------------------------------------ *
 * Adventskalender
 * ------------------------------------------------------------------ */

interface AdventDraft {
  day: number;
  title: string;
  body: string;
  location: string;
  time: string;
  endTime: string;
  cost: string;
  emoji: string;
}

export async function saveAdventDaysAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const drafts = json<AdventDraft[]>(formData, 'days', []);
  const db = adminDb();
  const batch = db.batch();
  let filled = 0;

  for (const draft of drafts) {
    const day = Math.round(Number(draft.day));
    if (!Number.isFinite(day) || day < 1 || day > 24) continue;

    const title = draft.title?.trim() ?? '';
    if (title) filled += 1;

    /*
     * Let op: `costEUR` staat in euro's, niet in centen. Dat is bewust — de
     * bestaande advent-app schrijft het zo, en die moet dezelfde data kunnen
     * blijven lezen. Er wordt niets mee afgerekend, het wordt alleen getoond.
     */
    const cost = Number(String(draft.cost ?? '').replace(',', '.'));

    batch.set(
      db.collection('activities').doc(String(day)),
      {
        day,
        title,
        body: draft.body?.trim() ?? '',
        location: draft.location?.trim() ?? '',
        time: draft.time?.trim() ?? '',
        endTime: draft.endTime?.trim() ?? '',
        costEUR: Number.isFinite(cost) ? cost : 0,
        emoji: draft.emoji?.trim() ?? '',
      },
      { merge: true },
    );
  }

  await batch.commit();
  revalidateActivities();
  return adminOk(`Opgeslagen. ${filled} van de 24 dagen zijn ingevuld.`);
}
