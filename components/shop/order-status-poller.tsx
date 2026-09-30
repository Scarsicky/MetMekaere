'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Ververst de bedanktpagina zolang de betaling nog onderweg is.
 *
 * Sommige betaalmethodes (bankoverschrijving, soms iDEAL bij een trage bank)
 * hebben even nodig. In plaats van de klant te laten raden of op F5 te laten
 * drukken, halen we zelf elke paar tellen de stand op — steeds iets rustiger,
 * en na een paar minuten stoppen we, want dan is een mail het juiste kanaal.
 */
export function OrderStatusPoller({ maxAttempts = 20 }: { maxAttempts?: number }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (attempt >= maxAttempts) return;

    // 3, 4, 5 … tot maximaal 15 seconden.
    const delay = Math.min(3000 + attempt * 1000, 15000);
    const timer = setTimeout(() => {
      router.refresh();
      setAttempt((n) => n + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [attempt, maxAttempts, router]);

  if (attempt >= maxAttempts) {
    return (
      <p className="mt-8 rounded-xl bg-sand-200 px-4 py-3 text-sm text-sand-700">
        De betaling is nog niet binnen. Je krijgt een mail zodra dat wel zo is — je hoeft hier niet te
        blijven wachten.
      </p>
    );
  }

  return (
    <p className="mt-8 flex items-center justify-center gap-2.5 text-sm text-sand-600" role="status">
      <span
        aria-hidden
        className="inline-block size-3.5 animate-spin rounded-full border-2 border-sand-400 border-t-brand-700"
      />
      Even kijken of de betaling binnen is…
    </p>
  );
}
