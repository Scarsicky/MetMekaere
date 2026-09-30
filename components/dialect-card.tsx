import Link from 'next/link';

import { cn } from '@/lib/utils';
import type { DialectEntry } from '@/types';

/**
 * Eén dialectwoord. Het woord staat groot, de betekenis eronder, en een
 * voorbeeldzin geeft het kleur — zo leest de pagina als een klein woordenboek
 * in plaats van een lijst.
 */
export function DialectCard({ entry, className }: { entry: DialectEntry; className?: string }) {
  return (
    <article
      className={cn(
        'relative flex flex-col rounded-2xl border border-sand-300 bg-white p-5 shadow-soft',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl leading-tight font-semibold text-brand-700">{entry.word}</h3>
        {entry.kind ? (
          <span className="mt-1 shrink-0 font-display text-xs tracking-wide text-sand-500 uppercase">
            {entry.kind}
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 leading-snug text-sand-800">{entry.meaning}</p>

      {entry.example ? (
        <blockquote className="mt-4 border-l-[3px] border-sage-300 pl-3.5">
          <p className="font-display text-[0.95rem] leading-snug text-sand-800 italic">
            “{entry.example}”
          </p>
          {entry.exampleTranslation ? (
            <footer className="mt-1 text-sm text-sand-600">{entry.exampleTranslation}</footer>
          ) : null}
        </blockquote>
      ) : null}

      {entry.productSlug ? (
        <Link
          href={`/product/${entry.productSlug}`}
          className="mt-4 inline-flex items-center gap-1.5 font-display text-sm font-semibold text-brand-700 underline decoration-brand-300 decoration-2 underline-offset-2 hover:decoration-brand-700"
        >
          Bekijk de kaart met dit woord
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M5 12h14m0 0-5-5m5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      ) : null}
    </article>
  );
}
