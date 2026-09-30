'use server';

import { requireAdmin } from '@/lib/admin/auth';
import { adminError, adminOk, type AdminActionState } from '@/lib/admin/action-state';
import { revalidateProducts } from '@/lib/admin/revalidate';
import { getProductById } from '@/lib/data/catalog';
import { adminDb } from '@/lib/firebase/admin';
import { parseMoneyToCents } from '@/lib/money';
import { randomId, slugify } from '@/lib/utils';
import type { ProductAddon, ProductStatus, ShippingClass, StoredImage } from '@/types';

/**
 * Producten opslaan, dupliceren en verwijderen.
 *
 * Elke actie begint met `requireAdmin()`. Een server action is namelijk een
 * gewoon adres op de server: zonder die controle zou iemand die het adres kent
 * hem los kunnen aanroepen.
 */

const COLLECTION = 'products';

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function checkbox(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

function integer(formData: FormData, key: string, fallback = 0): number {
  const value = Number(text(formData, key));
  return Number.isFinite(value) ? Math.round(value) : fallback;
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

/** Is deze slug al door een ánder product in gebruik? */
async function slugTaken(slug: string, exceptId: string | null): Promise<boolean> {
  const snap = await adminDb().collection(COLLECTION).where('slug', '==', slug).limit(2).get();
  return snap.docs.some((doc) => doc.id !== exceptId);
}

export async function saveProductAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = text(formData, 'id') || null;
  const title = text(formData, 'title');
  if (!title) {
    return adminError('Geef het product een naam.', { title: 'Dit veld is verplicht.' });
  }

  const priceCents = parseMoneyToCents(text(formData, 'price'));
  if (priceCents === null || priceCents < 0) {
    return adminError('De prijs is niet gelukt om te lezen.', {
      price: 'Vul een bedrag in, bijvoorbeeld 3,50.',
    });
  }

  const compareRaw = text(formData, 'compareAtPrice');
  const compareAtPriceCents = compareRaw ? parseMoneyToCents(compareRaw) : null;

  let slug = slugify(text(formData, 'slug') || title);
  if (!slug) {
    return adminError('De webadres-naam kon niet worden bepaald.', {
      slug: 'Vul zelf een korte naam in, bijvoorbeeld kaart-veur-mekaere.',
    });
  }
  if (await slugTaken(slug, id)) {
    return adminError('Dit webadres is al in gebruik bij een ander product.', {
      slug: 'Kies een andere naam.',
    });
  }

  const status = (text(formData, 'status') || 'draft') as ProductStatus;
  const shippingClass = (text(formData, 'shippingClass') || 'letterbox') as ShippingClass;

  const data = {
    slug,
    title,
    subtitle: text(formData, 'subtitle') || null,
    shortDescription: text(formData, 'shortDescription') || null,
    description: text(formData, 'description'),
    categorySlug: text(formData, 'categorySlug') || 'overig',
    tags: text(formData, 'tags')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    priceCents,
    compareAtPriceCents: compareAtPriceCents && compareAtPriceCents > priceCents ? compareAtPriceCents : null,
    vatRate: Number(text(formData, 'vatRate')) || 0.21,
    images: json<StoredImage[]>(formData, 'images', []),
    stock: {
      tracked: checkbox(formData, 'stockTracked'),
      quantity: integer(formData, 'stockQuantity', 0),
      allowBackorder: checkbox(formData, 'allowBackorder'),
      lowStockThreshold: integer(formData, 'lowStockThreshold', 3),
    },
    weightGrams: Math.max(0, integer(formData, 'weightGrams', 0)),
    shippingClass,
    tierGroup: text(formData, 'tierGroup') || null,
    addons: json<ProductAddon[]>(formData, 'addons', []),
    attributes: json<Record<string, string[]>>(formData, 'attributes', {}),
    seo: {
      title: text(formData, 'seoTitle') || null,
      description: text(formData, 'seoDescription') || null,
    },
    status,
    featured: checkbox(formData, 'featured'),
    sortOrder: integer(formData, 'sortOrder', 0),
    updatedAt: Date.now(),
  };

  try {
    if (id) {
      await adminDb().collection(COLLECTION).doc(id).set(data, { merge: true });
    } else {
      const newId = slug;
      // Als de slug al als document-id bestaat, plakken we er iets achter.
      const existing = await adminDb().collection(COLLECTION).doc(newId).get();
      const docId = existing.exists ? `${newId}-${randomId(5)}` : newId;
      await adminDb()
        .collection(COLLECTION)
        .doc(docId)
        .set({ ...data, createdAt: Date.now() });

      revalidateProducts();
      return adminOk('Product aangemaakt.', `/admin/producten/${docId}`);
    }
  } catch (error) {
    console.error('[admin] product opslaan mislukte:', error);
    return adminError('Het opslaan lukte niet. Probeer het nog eens.');
  }

  revalidateProducts();
  return adminOk(
    status === 'active' ? 'Opgeslagen en zichtbaar in de webshop.' : 'Opgeslagen als concept.',
  );
}

export async function duplicateProductAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = text(formData, 'id');
  const source = await getProductById(id);
  if (!source) return adminError('Dit product bestaat niet meer.');

  const copySlug = `${source.slug}-kopie-${randomId(4)}`;
  const { id: _ignored, ...rest } = source;

  await adminDb()
    .collection(COLLECTION)
    .doc(copySlug)
    .set({
      ...rest,
      slug: copySlug,
      title: `${source.title} (kopie)`,
      status: 'draft',
      featured: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

  revalidateProducts();
  return adminOk('Kopie gemaakt als concept.', `/admin/producten/${copySlug}`);
}

export async function deleteProductAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = text(formData, 'id');
  if (!id) return adminError('Onbekend product.');

  /*
   * Producten worden niet echt verwijderd maar gearchiveerd. Ze staan in
   * bestaande bestellingen, en die moeten leesbaar blijven. Gearchiveerde
   * producten verdwijnen wel uit de webshop.
   */
  await adminDb()
    .collection(COLLECTION)
    .doc(id)
    .set({ status: 'archived', featured: false, updatedAt: Date.now() }, { merge: true });

  revalidateProducts();
  return adminOk('Product gearchiveerd. Het is uit de webshop verdwenen.', '/admin/producten');
}

/** Snel aan- of uitzetten vanuit de lijst. */
export async function toggleProductStatusAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = text(formData, 'id');
  const product = await getProductById(id);
  if (!product) return adminError('Dit product bestaat niet meer.');

  const next: ProductStatus = product.status === 'active' ? 'draft' : 'active';
  await adminDb()
    .collection(COLLECTION)
    .doc(id)
    .set({ status: next, updatedAt: Date.now() }, { merge: true });

  revalidateProducts();
  return adminOk(next === 'active' ? 'Staat nu in de webshop.' : 'Staat nu op concept.');
}
