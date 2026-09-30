'use client';

import { useEffect } from 'react';

/**
 * Het vangnet als er onverwacht iets misgaat.
 *
 * Wat er precies stuk is, laten we niet zien: daar heeft een bezoeker niets
 * aan, en een technische melding kan meer prijsgeven dan bedoeld. In het log
 * staat het wel, met de foutcode die Next meegeeft, zodat het terug te vinden is.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[site] onverwachte fout:', error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-sand-100 px-5 py-20 text-center">
      <h1 className="text-3xl md:text-4xl">Er ging even iets mis</h1>
      <p className="mt-4 max-w-md text-lg text-sand-700">
        Vervelend. Probeer het nog een keer — lukt het dan nog niet, laat het ons dan weten.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-full bg-brand-700 px-6 font-display font-semibold text-sand-50 transition-colors hover:bg-brand-800"
        >
          Opnieuw proberen
        </button>
        <a
          href="/"
          className="min-h-11 rounded-full border border-sand-300 bg-white px-6 py-2.5 font-display font-semibold text-sand-900 transition-colors hover:border-sand-400"
        >
          Naar de homepagina
        </a>
      </div>

      {error.digest ? (
        <p className="mt-10 text-sm text-sand-500">
          Foutcode <code className="rounded bg-sand-200 px-1.5 py-0.5">{error.digest}</code>
        </p>
      ) : null}
    </div>
  );
}
