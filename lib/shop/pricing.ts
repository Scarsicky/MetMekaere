import { buildVatBreakdown, distributeProportionally } from '@/lib/money';
import type {
  Cart,
  CartLine,
  Cents,
  DiscountCode,
  PricedAddon,
  PricedCart,
  PricedLine,
  Product,
  ShippingClass,
  ShippingOption,
  ShippingRate,
  StockIssue,
  TierProgress,
  TierRule,
  TierStep,
} from '@/types';

/**
 * De rekenkern van de shop. Bewust vrij van I/O: alles komt binnen als
 * argument, er gaat één doorgerekende winkelwagen uit. Daardoor is dit
 * bestand te testen zonder Firestore, en kan de browser er niets aan
 * veranderen — de server rekent, altijd.
 *
 * Spelregels, op één plek vastgelegd:
 *  - Prijzen zijn inclusief btw (consumentenshop).
 *  - Staffelvoordeel telt aantallen samen per `tierGroup`, dus over
 *    verschillende producten heen.
 *  - Add-ons krijgen géén staffelkorting: het zijn extra's tegen kostprijs.
 *  - Een kortingscode rekent over het bedrag ná staffelvoordeel.
 *  - Verzendkosten worden nooit meegenomen in een procentuele korting.
 */

/* ------------------------------------------------------------------ *
 * Regel-identiteit
 * ------------------------------------------------------------------ */

/**
 * Bouwt een stabiel regel-id uit product + gekozen add-ons. Twee keer
 * dezelfde keuze levert hetzelfde id, zodat 'nog een keer toevoegen' het
 * aantal verhoogt in plaats van een tweede regel te maken.
 */
export function makeLineId(productId: string, addons: { addonId: string; qty: number }[]): string {
  const normalized = addons
    .filter((a) => a.qty > 0)
    .map((a) => `${a.addonId}x${a.qty}`)
    .sort()
    .join('|');
  return normalized ? `${productId}__${normalized}` : productId;
}

/* ------------------------------------------------------------------ *
 * Staffelvoordeel
 * ------------------------------------------------------------------ */

/** De hoogste staffelstap die bij dit aantal hoort, of null onder de eerste drempel. */
export function findTierStep(rule: TierRule, qty: number): TierStep | null {
  let match: TierStep | null = null;
  for (const step of [...rule.steps].sort((a, b) => a.minQty - b.minQty)) {
    if (qty >= step.minQty) match = step;
  }
  return match;
}

/** De volgende, nog niet bereikte staffelstap. */
export function findNextTierStep(rule: TierRule, qty: number): TierStep | null {
  const sorted = [...rule.steps].sort((a, b) => a.minQty - b.minQty);
  return sorted.find((s) => s.minQty > qty) ?? null;
}

/**
 * Past een staffelstap toe op een stuksprijs.
 *
 * Een stap mag een percentage of een vaste stuksprijs geven. Bij een vaste
 * stuksprijs nemen we het minimum met de normale prijs: in een groep met
 * verschillende prijzen mag de staffel een goedkoop product nooit duurder
 * maken.
 */
export function applyTierStep(basePriceCents: Cents, step: TierStep | null): Cents {
  if (!step) return basePriceCents;

  if (typeof step.unitPriceCents === 'number') {
    return Math.max(0, Math.min(step.unitPriceCents, basePriceCents));
  }
  if (typeof step.discountPercent === 'number' && step.discountPercent > 0) {
    const pct = Math.min(step.discountPercent, 100);
    return Math.max(0, Math.round(basePriceCents * (1 - pct / 100)));
  }
  return basePriceCents;
}

/** Het effectieve kortingspercentage van een stap, voor weergave. */
function effectivePercent(basePriceCents: Cents, tierPriceCents: Cents): number {
  if (basePriceCents <= 0) return 0;
  return Math.round(((basePriceCents - tierPriceCents) / basePriceCents) * 100);
}

/* ------------------------------------------------------------------ *
 * Verzending
 * ------------------------------------------------------------------ */

/** Kan deze methode alle verzendklassen in de wagen aan? */
function rateCoversClasses(rate: ShippingRate, needed: Set<ShippingClass>): boolean {
  for (const cls of needed) {
    if (cls === 'digital') continue; // downloads leggen geen beslag op verzending
    if (!rate.shippingClasses.includes(cls)) return false;
  }
  return true;
}

export function computeShippingOptions(args: {
  rates: ShippingRate[];
  country: string;
  neededClasses: Set<ShippingClass>;
  totalWeightGrams: number;
  /** Bedrag na staffelvoordeel en kortingscode; bepaalt 'gratis vanaf'. */
  orderValueCents: Cents;
  freeShippingFromCode: boolean;
}): ShippingOption[] {
  const { rates, country, neededClasses, totalWeightGrams, orderValueCents, freeShippingFromCode } = args;

  const physical = [...neededClasses].filter((c) => c !== 'digital');
  if (physical.length === 0) return [];

  const usable = rates.filter(
    (rate) =>
      rate.active &&
      rate.countries.includes(country) &&
      rateCoversClasses(rate, neededClasses) &&
      (rate.maxWeightGrams === null || totalWeightGrams <= rate.maxWeightGrams),
  );

  const options: ShippingOption[] = usable.map((rate) => {
    const freeByThreshold = rate.freeAboveCents !== null && orderValueCents >= rate.freeAboveCents;
    const free = freeByThreshold || freeShippingFromCode || rate.isPickup;
    return {
      id: rate.id,
      name: rate.name,
      description: rate.description,
      priceCents: free ? 0 : rate.priceCents,
      isPickup: rate.isPickup,
      freeBecauseOfThreshold: freeByThreshold && !rate.isPickup ? true : undefined,
    };
  });

  /*
   * Bezorgen staat boven ophalen, ook als ophalen gratis is: wie online
   * bestelt verwacht bezorging als standaardkeuze. Daarna de goedkoopste, en
   * bij gelijke prijs de volgorde die de admin heeft ingesteld.
   */
  const order = new Map(rates.map((r, i) => [r.id, r.sortOrder ?? i]));
  return options.sort(
    (a, b) =>
      Number(a.isPickup) - Number(b.isPickup) ||
      a.priceCents - b.priceCents ||
      (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
}

/* ------------------------------------------------------------------ *
 * Kortingscodes
 * ------------------------------------------------------------------ */

export type DiscountValidation =
  | { ok: true; code: DiscountCode }
  | { ok: false; reason: string };

export function validateDiscountCode(
  code: DiscountCode | null | undefined,
  subtotalCents: Cents,
  now = Date.now(),
): DiscountValidation {
  if (!code) return { ok: false, reason: 'Deze kortingscode kennen we niet.' };
  if (!code.active) return { ok: false, reason: 'Deze kortingscode is niet meer geldig.' };
  if (code.validFrom && now < code.validFrom) {
    return { ok: false, reason: 'Deze kortingscode is nog niet geldig.' };
  }
  if (code.validUntil && now > code.validUntil) {
    return { ok: false, reason: 'Deze kortingscode is verlopen.' };
  }
  if (code.maxUses !== null && code.usedCount >= code.maxUses) {
    return { ok: false, reason: 'Deze kortingscode is al gebruikt.' };
  }
  if (subtotalCents < code.minOrderCents) {
    return { ok: false, reason: 'MIN_ORDER' };
  }
  return { ok: true, code };
}

/* ------------------------------------------------------------------ *
 * De hoofdberekening
 * ------------------------------------------------------------------ */

export interface PriceCartInput {
  cart: Pick<Cart, 'id' | 'lines' | 'discountCode' | 'shippingCountry' | 'shippingRateId'>;
  /** Alleen de producten die in de wagen zitten; op id. */
  products: Map<string, Product>;
  tierRules: TierRule[];
  shippingRates: ShippingRate[];
  discount?: DiscountCode | null;
  now?: number;
}

export function priceCart(input: PriceCartInput): PricedCart {
  const { cart, products, tierRules, shippingRates } = input;
  const now = input.now ?? Date.now();

  const activeRules = tierRules.filter((r) => r.active && r.group);
  const ruleByGroup = new Map(activeRules.map((r) => [r.group, r]));

  /* 1. Regels koppelen aan producten, ongeldige regels apart houden. */
  type Resolved = { line: CartLine; product: Product | null };
  const resolved: Resolved[] = cart.lines.map((line) => {
    const product = products.get(line.productId) ?? null;
    return { line, product: product && product.status === 'active' ? product : null };
  });

  /* 2. Aantallen per staffelgroep optellen — hier zit het 'combineren'. */
  const qtyByGroup = new Map<string, number>();
  for (const { line, product } of resolved) {
    if (!product?.tierGroup) continue;
    if (!ruleByGroup.has(product.tierGroup)) continue;
    qtyByGroup.set(product.tierGroup, (qtyByGroup.get(product.tierGroup) ?? 0) + line.qty);
  }

  /* 3. Voorraad: aantallen per product over álle regels bij elkaar.
   *    Twee regels van dezelfde kaart (met en zonder envelop) trekken samen
   *    uit dezelfde voorraad. */
  const qtyByProduct = new Map<string, number>();
  for (const { line, product } of resolved) {
    if (!product) continue;
    qtyByProduct.set(product.id, (qtyByProduct.get(product.id) ?? 0) + line.qty);
  }

  /* 4. Regel voor regel doorrekenen. */
  const lines: PricedLine[] = [];
  const neededClasses = new Set<ShippingClass>();
  let grossSubtotalCents = 0;
  let tierDiscountCents = 0;
  let totalWeightGrams = 0;
  let hasStockIssues = false;

  for (const { line, product } of resolved) {
    if (!product) {
      lines.push({
        id: line.id,
        productId: line.productId,
        slug: '',
        title: 'Niet meer beschikbaar',
        qty: line.qty,
        unitPriceCents: 0,
        tierUnitPriceCents: 0,
        addons: [],
        addonsUnitTotalCents: 0,
        lineTotalCents: 0,
        tierDiscountCents: 0,
        vatRate: 0,
        stockIssue: 'unavailable',
        maxQty: 0,
      });
      hasStockIssues = true;
      continue;
    }

    const addonById = new Map(product.addons.map((a) => [a.id, a]));
    const addons: PricedAddon[] = [];
    let addonsUnitTotalCents = 0;
    let addonWeightGrams = 0;

    for (const chosen of line.addons) {
      const addon = addonById.get(chosen.addonId);
      if (!addon || chosen.qty <= 0) continue;
      const qty = Math.min(chosen.qty, Math.max(1, addon.maxQty));
      const totalCents = addon.priceCents * qty;
      addons.push({
        addonId: addon.id,
        label: addon.label,
        qty,
        unitPriceCents: addon.priceCents,
        totalCents,
      });
      addonsUnitTotalCents += totalCents;
      addonWeightGrams += (addon.weightGrams ?? 0) * qty;
    }

    const rule = product.tierGroup ? ruleByGroup.get(product.tierGroup) : undefined;
    const groupQty = product.tierGroup ? (qtyByGroup.get(product.tierGroup) ?? 0) : 0;
    const step = rule ? findTierStep(rule, groupQty) : null;
    const tierUnitPriceCents = applyTierStep(product.priceCents, step);

    const grossLineTotal = (product.priceCents + addonsUnitTotalCents) * line.qty;
    const lineTotalCents = (tierUnitPriceCents + addonsUnitTotalCents) * line.qty;
    const lineTierDiscount = grossLineTotal - lineTotalCents;

    /* Voorraad. */
    let stockIssue: StockIssue | undefined;
    let maxQty: number | undefined;
    if (product.stock.tracked && !product.stock.allowBackorder) {
      const available = Math.max(0, product.stock.quantity);
      const requested = qtyByProduct.get(product.id) ?? line.qty;
      if (available <= 0) {
        stockIssue = 'out_of_stock';
        maxQty = 0;
      } else if (requested > available) {
        stockIssue = 'insufficient';
        maxQty = available;
      }
    }
    if (stockIssue) hasStockIssues = true;

    grossSubtotalCents += grossLineTotal;
    tierDiscountCents += lineTierDiscount;
    totalWeightGrams += (product.weightGrams + addonWeightGrams) * line.qty;
    neededClasses.add(product.shippingClass);

    const image = product.images[0];
    lines.push({
      id: line.id,
      productId: product.id,
      slug: product.slug,
      title: product.title,
      imageUrl: image?.url,
      imageAlt: image?.alt,
      qty: line.qty,
      unitPriceCents: product.priceCents,
      tierUnitPriceCents,
      addons,
      addonsUnitTotalCents,
      lineTotalCents,
      tierDiscountCents: lineTierDiscount,
      vatRate: product.vatRate,
      tierGroup: product.tierGroup ?? null,
      stockIssue,
      maxQty,
    });
  }

  const subtotalCents = grossSubtotalCents - tierDiscountCents;

  /* 5. Staffel-voortgang: wat levert de volgende stap op? */
  const tierProgress: TierProgress[] = [];
  for (const [group, currentQty] of qtyByGroup) {
    const rule = ruleByGroup.get(group);
    if (!rule) continue;

    const currentStep = findTierStep(rule, currentQty);
    const nextStep = findNextTierStep(rule, currentQty);
    const groupLines = lines.filter((l) => l.tierGroup === group && !l.stockIssue);

    // Referentieprijs voor het weergegeven percentage: de duurste in de groep.
    const refPrice = Math.max(0, ...groupLines.map((l) => l.unitPriceCents));

    let next: TierProgress['next'];
    if (nextStep) {
      // Wat de huidige artikelen extra zouden opleveren bij de volgende stap.
      let extraSavingCents = 0;
      for (const l of groupLines) {
        const atNext = applyTierStep(l.unitPriceCents, nextStep);
        extraSavingCents += Math.max(0, l.tierUnitPriceCents - atNext) * l.qty;
      }
      next = {
        minQty: nextStep.minQty,
        qtyNeeded: Math.max(1, nextStep.minQty - currentQty),
        discountPercent: effectivePercent(refPrice, applyTierStep(refPrice, nextStep)),
        extraSavingCents,
      };
    }

    tierProgress.push({
      group,
      ruleName: rule.name,
      currentQty,
      currentDiscountPercent: effectivePercent(refPrice, applyTierStep(refPrice, currentStep)),
      next,
    });
  }

  /* 6. Kortingscode. */
  let discountCents = 0;
  let discountLabel: string | undefined;
  let discountError: string | undefined;
  let freeShippingFromCode = false;
  const requestedCode = cart.discountCode ?? null;

  if (requestedCode) {
    const validation = validateDiscountCode(input.discount, subtotalCents, now);
    if (!validation.ok) {
      discountError =
        validation.reason === 'MIN_ORDER'
          ? `Deze code geldt vanaf een bestelbedrag van ${((input.discount?.minOrderCents ?? 0) / 100)
              .toFixed(2)
              .replace('.', ',')} euro.`
          : validation.reason;
    } else {
      const code = validation.code;

      // Bepaal waar de code over rekent.
      const inScope =
        code.appliesToCategorySlugs.length === 0
          ? lines.filter((l) => !l.stockIssue)
          : lines.filter((l) => {
              if (l.stockIssue) return false;
              const p = products.get(l.productId);
              return p ? code.appliesToCategorySlugs.includes(p.categorySlug) : false;
            });
      const base = inScope.reduce((sum, l) => sum + l.lineTotalCents, 0);

      if (base <= 0) {
        discountError = 'Deze code geldt niet voor de producten in je winkelwagen.';
      } else if (code.type === 'free_shipping') {
        freeShippingFromCode = true;
        discountLabel = code.description || 'Gratis verzending';
      } else if (code.type === 'percent') {
        discountCents = Math.min(base, Math.round((base * Math.min(code.value, 100)) / 100));
        discountLabel = code.description || `${code.value}% korting`;
      } else {
        discountCents = Math.min(base, Math.max(0, Math.round(code.value)));
        discountLabel = code.description || 'Korting';
      }
    }
  }

  /* 7. Verzendkosten. De 'gratis vanaf'-drempel kijkt naar het bedrag dat de
   *    klant daadwerkelijk betaalt voor de producten. */
  const orderValueCents = Math.max(0, subtotalCents - discountCents);
  const shippingOptions = computeShippingOptions({
    rates: shippingRates,
    country: cart.shippingCountry,
    neededClasses,
    totalWeightGrams,
    orderValueCents,
    freeShippingFromCode,
  });

  const requestedOption = shippingOptions.find((o) => o.id === cart.shippingRateId);
  const chosen = requestedOption ?? shippingOptions[0] ?? null;
  const shippingCents = chosen?.priceCents ?? 0;

  /* 8. Btw-specificatie over de daadwerkelijk te betalen bedragen. */
  const payableLines = lines.filter((l) => !l.stockIssue);
  const discountShares = distributeProportionally(
    discountCents,
    payableLines.map((l) => l.lineTotalCents),
  );
  const vatBreakdown = buildVatBreakdown(
    payableLines.map((l, i) => ({
      grossCents: l.lineTotalCents - (discountShares[i] ?? 0),
      rate: l.vatRate,
    })),
    shippingCents,
  );

  const totalCents = Math.max(0, subtotalCents - discountCents + shippingCents);

  return {
    cartId: cart.id,
    lines,
    itemCount: lines.reduce((sum, l) => sum + (l.stockIssue === 'unavailable' ? 0 : l.qty), 0),
    grossSubtotalCents,
    tierDiscountCents,
    subtotalCents,
    tierProgress,
    discountCode: requestedCode,
    discountLabel,
    discountCents,
    discountError,
    shippingCountry: cart.shippingCountry,
    shippingOptions,
    shippingRateId: chosen?.id ?? null,
    shippingName: chosen?.name,
    shippingCents,
    totalWeightGrams,
    totalCents,
    vatBreakdown,
    hasStockIssues,
  };
}

/**
 * Alleen de staffelprijs van één product bij een gegeven groepsaantal.
 * Gebruikt op de productpagina om de staffeltabel te tonen.
 */
export function tierPreviewForProduct(
  product: Product,
  rule: TierRule | null | undefined,
): { minQty: number; unitPriceCents: Cents; discountPercent: number }[] {
  if (!rule || !rule.active) return [];
  return [...rule.steps]
    .sort((a, b) => a.minQty - b.minQty)
    .map((step) => {
      const unitPriceCents = applyTierStep(product.priceCents, step);
      return {
        minQty: step.minQty,
        unitPriceCents,
        discountPercent: effectivePercent(product.priceCents, unitPriceCents),
      };
    })
    .filter((row) => row.unitPriceCents < product.priceCents);
}
