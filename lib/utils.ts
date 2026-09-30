import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Maakt van vrije tekst een URL-veilige slug, inclusief Nederlandse diakrieten. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Kort een tekst af op een woordgrens. */
export function truncate(text: string, maxChars: number): string {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).replace(/\s+\S*$/, '') + '…';
}

/**
 * Haalt de platte tekst uit markdown, voor meta-descriptions en previews.
 * Bewust simpel: genoeg voor koppen, nadruk, links en lijsten.
 */
export function markdownToPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDateNL(value: number | string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('nl-NL', opts ?? { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/** 'zaterdag 6 december' — voor activiteiten waar het jaar niet hoeft. */
export function formatDayMonthNL(value: number | string | Date): string {
  return formatDateNL(value, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Groepeert een lijst op een sleutel, met behoud van de oorspronkelijke volgorde. */
export function groupBy<T, K extends string>(items: T[], keyOf: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keyOf(item);
    (out[key] ??= []).push(item);
  }
  return out;
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

/** Klemt een getal tussen min en max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Korte, URL-veilige, willekeurige id. Voor winkelwagens en regel-ids. */
export function randomId(length = 20): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/** Normaliseert een Nederlandse postcode naar '1234 AB'. */
export function normalizePostalCode(input: string, country = 'NL'): string {
  const raw = input.replace(/\s+/g, '').toUpperCase();
  if (country === 'NL' && /^\d{4}[A-Z]{2}$/.test(raw)) {
    return `${raw.slice(0, 4)} ${raw.slice(4)}`;
  }
  return input.trim().toUpperCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
