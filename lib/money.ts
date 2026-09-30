import type { Cents, VatLine } from '@/types';

const nlEuro = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `1250` -> `"€ 12,50"`. De enige plek waar centen tekst worden. */
export function formatCents(cents: Cents): string {
  return nlEuro.format((cents ?? 0) / 100);
}

/** `1250` -> `"12,50"` — zonder euroteken, voor invoervelden in de admin. */
export function centsToInput(cents: Cents): string {
  return ((cents ?? 0) / 100).toFixed(2).replace('.', ',');
}

/**
 * Leest een door een mens getypt bedrag ("12,50", "€ 12.50", "12") als centen.
 * Geeft `null` bij onleesbare invoer, zodat de admin een nette fout kan tonen.
 */
export function parseMoneyToCents(input: string | number | null | undefined): Cents | null {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'number') {
    return Number.isFinite(input) ? Math.round(input * 100) : null;
  }

  const cleaned = input
    .replace(/[€\s ]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '') // duizendscheiding: 1.250,00
    .replace(',', '.');

  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/**
 * Verdeelt een korting over regels naar rato van hun bedrag, zonder dat er
 * centen verdwijnen of bijkomen. De laatste regel vangt het afrondingsrestje.
 *
 * Nodig voor een kloppende btw-opgave: een kortingscode van 10% over een order
 * met 21%- en 9%-regels moet per btw-tarief juist landen.
 */
export function distributeProportionally(totalToDistribute: Cents, weights: Cents[]): Cents[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || totalToDistribute === 0) return weights.map(() => 0);

  const out: Cents[] = [];
  let assigned = 0;

  for (let i = 0; i < weights.length; i++) {
    if (i === weights.length - 1) {
      out.push(totalToDistribute - assigned);
    } else {
      const share = Math.round((totalToDistribute * weights[i]) / sum);
      out.push(share);
      assigned += share;
    }
  }
  return out;
}

/**
 * Rekent uit welk deel van een bedrag btw is. Onze prijzen zijn inclusief btw
 * (consumentenwebshop), dus de btw wordt eruit gehaald, niet erbij opgeteld.
 */
export function vatFromGross(grossCents: Cents, rate: number): Cents {
  if (rate <= 0) return 0;
  return Math.round(grossCents - grossCents / (1 + rate));
}

/**
 * Bouwt de btw-specificatie voor een order. `items` zijn bruto bedragen
 * inclusief btw, per tarief. Verzendkosten volgen het hoogste tarief in de
 * order (gangbare praktijk: verzending deelt het tarief van de goederen).
 */
export function buildVatBreakdown(
  items: { grossCents: Cents; rate: number }[],
  shippingCents: Cents = 0,
): VatLine[] {
  const byRate = new Map<number, Cents>();
  for (const item of items) {
    byRate.set(item.rate, (byRate.get(item.rate) ?? 0) + item.grossCents);
  }

  if (shippingCents > 0 && byRate.size > 0) {
    const highest = Math.max(...byRate.keys());
    byRate.set(highest, (byRate.get(highest) ?? 0) + shippingCents);
  } else if (shippingCents > 0) {
    byRate.set(0.21, shippingCents);
  }

  return [...byRate.entries()]
    .filter(([, gross]) => gross !== 0)
    .sort((a, b) => b[0] - a[0])
    .map(([rate, gross]) => ({
      rate,
      baseCents: gross - vatFromGross(gross, rate),
      vatCents: vatFromGross(gross, rate),
    }));
}
