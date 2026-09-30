'use server';

import { adminError, adminOk, type AdminActionState } from '@/lib/admin/action-state';
import { requireAdmin } from '@/lib/admin/auth';
import { revalidateCategories, revalidateShopRules } from '@/lib/admin/revalidate';
import { adminDb } from '@/lib/firebase/admin';
import { parseMoneyToCents } from '@/lib/money';
import { slugify } from '@/lib/utils';
import type { ShippingClass, TierStep } from '@/types';

/**
 * Categorieën, staffelvoordeel, kortingscodes en verzendtarieven.
 *
 * Deze vier schermen werken hetzelfde: je bewerkt de hele lijst in één
 * formulier en slaat hem in één keer op. Dat is voor kleine lijstjes prettiger
 * dan per regel opslaan — je ziet het geheel, en je kunt volgorde en waarden
 * in één beweging goed zetten.
 */

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
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

/** Vervangt een hele collectie: schrijft wat er is en haalt weg wat verdween. */
async function replaceCollection(
  collection: string,
  records: { id: string; data: Record<string, unknown> }[],
): Promise<void> {
  const db = adminDb();
  const existing = await db.collection(collection).get();
  const keep = new Set(records.map((r) => r.id));

  const batch = db.batch();
  for (const record of records) {
    batch.set(db.collection(collection).doc(record.id), record.data, { merge: true });
  }
  for (const doc of existing.docs) {
    if (!keep.has(doc.id)) batch.delete(doc.ref);
  }
  await batch.commit();
}

/* ------------------------------------------------------------------ *
 * Categorieën
 * ------------------------------------------------------------------ */

interface CategoryDraft {
  slug: string;
  name: string;
  description?: string;
  active: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export async function saveCategoriesAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const drafts = json<CategoryDraft[]>(formData, 'categories', []);
  const records: { id: string; data: Record<string, unknown> }[] = [];
  const seen = new Set<string>();

  for (const [index, draft] of drafts.entries()) {
    const name = draft.name?.trim();
    if (!name) continue;

    const slug = slugify(draft.slug || name);
    if (!slug) continue;
    if (seen.has(slug)) {
      return adminError(`De naam "${name}" levert hetzelfde webadres op als een andere categorie.`);
    }
    seen.add(slug);

    records.push({
      id: slug,
      data: {
        slug,
        name,
        description: draft.description?.trim() || null,
        active: draft.active !== false,
        sortOrder: index,
        seo: {
          title: draft.seoTitle?.trim() || null,
          description: draft.seoDescription?.trim() || null,
        },
      },
    });
  }

  if (records.length === 0) {
    return adminError('Er moet minstens één categorie overblijven.');
  }

  await replaceCollection('categories', records);
  revalidateCategories();
  return adminOk(`${records.length} categorieën opgeslagen.`);
}

/* ------------------------------------------------------------------ *
 * Staffelvoordeel
 * ------------------------------------------------------------------ */

interface TierDraft {
  group: string;
  name: string;
  description?: string;
  active: boolean;
  steps: { minQty: number; unitPrice: string }[];
}

export async function saveTierRulesAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const drafts = json<TierDraft[]>(formData, 'tiers', []);
  const records: { id: string; data: Record<string, unknown> }[] = [];

  for (const draft of drafts) {
    const group = slugify(draft.group || draft.name);
    if (!group) continue;

    const steps: TierStep[] = [];
    for (const step of draft.steps ?? []) {
      const minQty = Math.round(Number(step.minQty));
      const unitPriceCents = parseMoneyToCents(step.unitPrice);
      if (!Number.isFinite(minQty) || minQty < 2) continue;
      if (unitPriceCents === null || unitPriceCents < 0) continue;
      steps.push({ minQty, unitPriceCents });
    }

    steps.sort((a, b) => a.minQty - b.minQty);

    // Hogere aantallen moeten goedkoper zijn, anders klopt de staffel niet.
    for (let i = 1; i < steps.length; i++) {
      if ((steps[i].unitPriceCents ?? 0) > (steps[i - 1].unitPriceCents ?? 0)) {
        return adminError(
          `Bij "${draft.name}" is de prijs vanaf ${steps[i].minQty} stuks hoger dan die vanaf ${steps[i - 1].minQty}. Bij meer stuks hoort een lagere prijs.`,
        );
      }
    }

    records.push({
      id: group,
      data: {
        group,
        name: draft.name?.trim() || 'Staffelvoordeel',
        description: draft.description?.trim() || null,
        steps,
        active: draft.active !== false && steps.length > 0,
      },
    });
  }

  await replaceCollection('tierRules', records);
  revalidateShopRules();
  return adminOk(records.length ? 'Staffelvoordeel opgeslagen.' : 'Alle staffels verwijderd.');
}

/* ------------------------------------------------------------------ *
 * Kortingscodes
 * ------------------------------------------------------------------ */

interface DiscountDraft {
  code: string;
  description?: string;
  type: 'percent' | 'fixed' | 'free_shipping';
  value: string;
  minOrder: string;
  maxUses: string;
  validUntil?: string;
  categorySlugs?: string;
  active: boolean;
  usedCount?: number;
}

export async function saveDiscountCodesAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const drafts = json<DiscountDraft[]>(formData, 'codes', []);
  const records: { id: string; data: Record<string, unknown> }[] = [];
  const seen = new Set<string>();

  for (const draft of drafts) {
    const code = draft.code?.trim().toUpperCase().replace(/\s+/g, '');
    if (!code) continue;
    if (seen.has(code)) return adminError(`De code ${code} staat er twee keer in.`);
    seen.add(code);

    const type = draft.type === 'fixed' || draft.type === 'free_shipping' ? draft.type : 'percent';

    let value = 0;
    if (type === 'percent') {
      value = Math.min(100, Math.max(0, Number(draft.value) || 0));
      if (value <= 0) {
        return adminError(`Vul bij ${code} een kortingspercentage in.`);
      }
    } else if (type === 'fixed') {
      const cents = parseMoneyToCents(draft.value);
      if (cents === null || cents <= 0) {
        return adminError(`Vul bij ${code} een kortingsbedrag in, bijvoorbeeld 5,00.`);
      }
      value = cents;
    }

    const validUntil = draft.validUntil?.trim()
      ? // Tot en met die dag: einde van de dag.
        new Date(`${draft.validUntil}T23:59:59`).getTime()
      : null;

    records.push({
      id: code,
      data: {
        code,
        description: draft.description?.trim() || null,
        type,
        value,
        minOrderCents: parseMoneyToCents(draft.minOrder) ?? 0,
        maxUses: draft.maxUses?.trim() ? Math.max(1, Number(draft.maxUses) || 1) : null,
        // Het gebruiksaantal nooit overschrijven met wat er in het formulier staat.
        usedCount: Math.max(0, Number(draft.usedCount) || 0),
        validFrom: null,
        validUntil: Number.isFinite(validUntil) ? validUntil : null,
        appliesToCategorySlugs: (draft.categorySlugs ?? '')
          .split(',')
          .map((s) => slugify(s))
          .filter(Boolean),
        active: draft.active !== false,
      },
    });
  }

  await replaceCollection('discountCodes', records);
  return adminOk(records.length ? `${records.length} kortingscodes opgeslagen.` : 'Alle codes verwijderd.');
}

/* ------------------------------------------------------------------ *
 * Verzendtarieven
 * ------------------------------------------------------------------ */

interface ShippingDraft {
  id?: string;
  name: string;
  description?: string;
  countries: string;
  shippingClasses: ShippingClass[];
  maxWeight: string;
  price: string;
  freeAbove: string;
  isPickup: boolean;
  active: boolean;
}

export async function saveShippingRatesAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const drafts = json<ShippingDraft[]>(formData, 'rates', []);
  const records: { id: string; data: Record<string, unknown> }[] = [];

  for (const [index, draft] of drafts.entries()) {
    const name = draft.name?.trim();
    if (!name) continue;

    const id = slugify(draft.id || name) || `tarief-${index + 1}`;
    const priceCents = parseMoneyToCents(draft.price);
    if (priceCents === null || priceCents < 0) {
      return adminError(`Vul bij "${name}" een geldig tarief in, bijvoorbeeld 2,10.`);
    }

    const countries = draft.countries
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter((c) => /^[A-Z]{2}$/.test(c));

    if (countries.length === 0) {
      return adminError(`Vul bij "${name}" minstens één land in, bijvoorbeeld NL.`);
    }

    const freeAboveCents = draft.freeAbove?.trim() ? parseMoneyToCents(draft.freeAbove) : null;
    const maxWeightGrams = draft.maxWeight?.trim() ? Math.max(0, Number(draft.maxWeight) || 0) : null;

    records.push({
      id,
      data: {
        name,
        description: draft.description?.trim() || null,
        countries,
        shippingClasses: draft.shippingClasses?.length ? draft.shippingClasses : ['letterbox', 'parcel'],
        maxWeightGrams,
        priceCents,
        freeAboveCents,
        isPickup: Boolean(draft.isPickup),
        sortOrder: index,
        active: draft.active !== false,
      },
    });
  }

  if (records.length === 0) {
    return adminError('Er moet minstens één verzendmethode zijn, anders kan niemand afrekenen.');
  }

  await replaceCollection('shippingRates', records);
  revalidateShopRules();
  return adminOk(`${records.length} verzendmethoden opgeslagen.`);
}
