import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** De kop van een beheerscherm: waar ben ik, en wat kan ik hier doen. */
export function AdminPage({
  title,
  description,
  actions,
  breadcrumb,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <div className="px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        {breadcrumb ? (
          <Link
            href={breadcrumb.href}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-sand-600 hover:text-brand-700"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M19 12H5m0 0 5-5m-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {breadcrumb.label}
          </Link>
        ) : null}

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sand-700">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>

        {children}
      </div>
    </div>
  );
}

export function AdminCard({
  title,
  description,
  className,
  children,
}: {
  title?: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('rounded-2xl border border-sand-300 bg-white p-5 md:p-6', className)}>
      {title ? (
        <div className="mb-5">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-sand-600">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Lege staat met een duidelijke volgende stap. */
export function AdminEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-400 bg-white/60 px-6 py-14 text-center">
      <p className="font-display text-lg font-semibold text-sand-900">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sand-600">{description}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export type PillTone = 'green' | 'amber' | 'red' | 'grey' | 'blue';

const pillTones: Record<PillTone, string> = {
  green: 'bg-sage-200 text-sage-900',
  amber: 'bg-ochre-200 text-ochre-700',
  red: 'bg-brand-100 text-brand-800',
  grey: 'bg-sand-200 text-sand-700',
  blue: 'bg-sand-300 text-sand-900',
};

export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 font-display text-xs font-semibold whitespace-nowrap',
        pillTones[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Een lijst die op een telefoon kaarten wordt en op een scherm een tabel. */
export function AdminList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul className={cn('flex flex-col gap-2', className)}>
      {children}
    </ul>
  );
}

export function AdminListRow({
  href,
  children,
  className,
}: {
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  const inner = (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-sand-300 bg-white px-4 py-3.5',
        href && 'transition-colors hover:border-sand-400 hover:bg-sand-50',
        className,
      )}
    >
      {children}
    </div>
  );

  return <li>{href ? <Link href={href}>{inner}</Link> : inner}</li>;
}

/** Kort blok met een getal, voor het overzichtsscherm. */
export function StatTile({
  label,
  value,
  hint,
  href,
  tone = 'plain',
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: 'plain' | 'attention';
}) {
  const inner = (
    <div
      className={cn(
        'rounded-2xl border px-5 py-4',
        tone === 'attention' ? 'border-ochre-400 bg-ochre-100' : 'border-sand-300 bg-white',
        href && 'transition-colors hover:border-sand-400',
      )}
    >
      <p className="text-sm text-sand-600">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-sand-900 tabular">{value}</p>
      {hint ? <p className="mt-1 text-sm text-sand-600">{hint}</p> : null}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
