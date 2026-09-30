import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { cn, formatDayMonthNL } from '@/lib/utils';
import type { Happening } from '@/types';

/** Is dit al geweest? Bepaalt of we 'was' of 'wordt' tonen. */
function isPast(happening: Happening): boolean {
  if (!happening.date) return false;
  return happening.date < new Date().toISOString().slice(0, 10);
}

export function HappeningCard({ happening, className }: { happening: Happening; className?: string }) {
  const image = happening.images[0];
  const past = isPast(happening);

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-sand-300 bg-white shadow-soft transition-shadow hover:shadow-lift',
        className,
      )}
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-sage-100">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || happening.title}
            fill
            sizes="(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Image src="/logo.png" alt="" width={512} height={512} className="size-20 opacity-25" />
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge tone="neutral">{happening.theme}</Badge>
          {happening.membersOnly ? <Badge tone="brand">Voor leden</Badge> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {happening.date ? (
          <p
            className={cn(
              'font-display text-sm font-semibold',
              past ? 'text-sand-500' : 'text-brand-700',
            )}
          >
            {past ? 'Was op ' : ''}
            {formatDayMonthNL(happening.date)}
            {happening.startTime ? ` · ${happening.startTime}` : ''}
            {happening.endTime ? `–${happening.endTime}` : ''}
          </p>
        ) : null}

        <h3 className="mt-1 font-display text-lg leading-snug font-semibold text-sand-900">
          <Link href={`/doen-en-beleven/${happening.slug}`} className="after:absolute after:inset-0">
            {happening.title}
          </Link>
        </h3>

        {happening.summary ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-sand-600">{happening.summary}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm text-sand-600">
          {happening.location ? (
            <span className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                <path d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.4" />
              </svg>
              {happening.location}
            </span>
          ) : null}
          {happening.priceLabel ? <span>{happening.priceLabel}</span> : null}
        </div>
      </div>
    </article>
  );
}
