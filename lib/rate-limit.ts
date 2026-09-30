import 'server-only';

import { headers } from 'next/headers';

/**
 * Eenvoudige snelheidsbegrenzer voor formulieren (nieuwsbrief, kortingscodes,
 * afrekenen).
 *
 * Bewust in het geheugen van het draaiende proces: geen extra dienst, geen
 * kosten, en voor een site van deze omvang precies genoeg om een losgeslagen
 * script af te remmen. Bij meerdere instanties telt elke instantie apart —
 * dat is een bewuste afweging, geen bescherming tegen een gerichte aanval.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function sweep(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconden tot het weer mag. */
  retryAfter: number;
}

export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

/**
 * Het IP-adres van de bezoeker. Achter Cloud Run staat `x-forwarded-for`; het
 * eerste adres daarin is de bezoeker.
 */
export async function clientIp(): Promise<string> {
  const store = await headers();
  const forwarded = store.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return store.get('x-real-ip') ?? 'onbekend';
}

/** Combineert IP en doel tot een sleutel. */
export async function limitByIp(
  scope: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const ip = await clientIp();
  return rateLimit(`${scope}:${ip}`, limit, windowSeconds);
}
