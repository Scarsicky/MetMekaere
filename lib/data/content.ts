import 'server-only';

import { cached, TAGS, TTL } from '@/lib/data/cache';
import {
  normalizeBlocks,
  normalizeDialectEntry,
  normalizeHappening,
  normalizeSeo,
} from '@/lib/data/normalize';
import { adminDb, isAdminUsable } from '@/lib/firebase/admin';
import { HAPPENING_THEMES, type CmsPage, type DialectEntry, type Happening } from '@/types';

/**
 * Redactionele inhoud: CMS-pagina's, 'Doen en Beleven' en Fluffy Dialect.
 *
 * Pagina's worden op slug opgezocht (`pages/{slug}` als document-id), zodat
 * de admin een pagina kan aanmaken zonder dat er code bij hoeft.
 */

const PAGES = 'pages';
const HAPPENINGS = 'happenings';
const DIALECT = 'dialect';

export const getPage = cached(
  async (slug: string): Promise<CmsPage | null> => {
    if (!isAdminUsable()) return null;
    try {
      const snap = await adminDb().collection(PAGES).doc(slug).get();
      if (!snap.exists) return null;
      const raw = snap.data() as Record<string, unknown>;
      const page: CmsPage = {
        id: snap.id,
        slug: typeof raw.slug === 'string' ? raw.slug : snap.id,
        title: typeof raw.title === 'string' ? raw.title : snap.id,
        seo: normalizeSeo(raw.seo),
        blocks: normalizeBlocks(raw.blocks),
        published: raw.published !== false,
        updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
      };
      return page.published ? page : null;
    } catch (error) {
      console.warn(`[content] kon pagina ${slug} niet lezen:`, error);
      return null;
    }
  },
  ['content', 'page'],
  { tags: [TAGS.pages], revalidate: TTL.content },
);

export async function getPageForAdmin(slug: string): Promise<CmsPage | null> {
  const snap = await adminDb().collection(PAGES).doc(slug).get();
  if (!snap.exists) return null;
  const raw = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    slug: typeof raw.slug === 'string' ? raw.slug : snap.id,
    title: typeof raw.title === 'string' ? raw.title : snap.id,
    seo: normalizeSeo(raw.seo),
    blocks: normalizeBlocks(raw.blocks),
    published: raw.published !== false,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
  };
}

export async function listPagesForAdmin(): Promise<{ slug: string; title: string; published: boolean }[]> {
  const snap = await adminDb().collection(PAGES).get();
  return snap.docs
    .map((d) => {
      const raw = d.data() as Record<string, unknown>;
      return {
        slug: d.id,
        title: typeof raw.title === 'string' ? raw.title : d.id,
        published: raw.published !== false,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'nl'));
}

/* ------------------------------------------------------------------ *
 * Doen en Beleven
 * ------------------------------------------------------------------ */

export const getHappenings = cached(
  async (): Promise<Happening[]> => {
    if (!isAdminUsable()) return [];
    try {
      const snap = await adminDb().collection(HAPPENINGS).where('status', '==', 'published').get();
      return sortHappenings(snap.docs.map((d) => normalizeHappening(d.id, d.data())));
    } catch (error) {
      console.warn('[content] kon activiteiten niet lezen:', error);
      return [];
    }
  },
  ['content', 'happenings'],
  { tags: [TAGS.happenings], revalidate: TTL.content },
);

/**
 * Wat nog komt staat vooraan, op datum. Daarna het verleden, nieuwste eerst.
 * Doorlopende projecten (zonder datum) staan tussenin op hun eigen volgorde.
 */
function sortHappenings(items: Happening[], now = new Date()): Happening[] {
  const today = now.toISOString().slice(0, 10);

  const upcoming = items
    .filter((h) => h.date && h.date >= today)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const undated = items
    .filter((h) => !h.date)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder);
  const past = items
    .filter((h) => h.date && h.date < today)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  return [...upcoming, ...undated, ...past];
}

export const getHappeningBySlug = cached(
  async (slug: string): Promise<Happening | null> => {
    if (!isAdminUsable()) return null;
    try {
      const snap = await adminDb().collection(HAPPENINGS).where('slug', '==', slug).limit(1).get();
      if (snap.empty) return null;
      const doc = snap.docs[0];
      const happening = normalizeHappening(doc.id, doc.data());
      return happening.status === 'published' ? happening : null;
    } catch (error) {
      console.warn(`[content] kon activiteit ${slug} niet lezen:`, error);
      return null;
    }
  },
  ['content', 'happening', 'bySlug'],
  { tags: [TAGS.happenings], revalidate: TTL.content },
);

export async function getAllHappeningsForAdmin(): Promise<Happening[]> {
  const snap = await adminDb().collection(HAPPENINGS).get();
  return snap.docs
    .map((d) => normalizeHappening(d.id, d.data()))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.sortOrder - b.sortOrder);
}

export { HAPPENING_THEMES };

/* ------------------------------------------------------------------ *
 * Fluffy Dialect
 * ------------------------------------------------------------------ */

export const getDialectEntries = cached(
  async (): Promise<DialectEntry[]> => {
    if (!isAdminUsable()) return [];
    try {
      const snap = await adminDb().collection(DIALECT).where('status', '==', 'published').get();
      return snap.docs
        .map((d) => normalizeDialectEntry(d.id, d.data()))
        .filter((e) => e.word && e.meaning)
        .sort((a, b) => a.word.localeCompare(b.word, 'nl'));
    } catch (error) {
      console.warn('[content] kon dialectwoorden niet lezen:', error);
      return [];
    }
  },
  ['content', 'dialect'],
  { tags: [TAGS.dialect], revalidate: TTL.content },
);

export async function getAllDialectEntriesForAdmin(): Promise<DialectEntry[]> {
  const snap = await adminDb().collection(DIALECT).get();
  return snap.docs
    .map((d) => normalizeDialectEntry(d.id, d.data()))
    .sort((a, b) => a.word.localeCompare(b.word, 'nl'));
}
