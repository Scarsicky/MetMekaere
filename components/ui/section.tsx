import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type SectionTone = 'plain' | 'white' | 'sage' | 'brand' | 'cream';

const tones: Record<SectionTone, string> = {
  plain: '',
  white: 'bg-white',
  sage: 'bg-sage-100',
  brand: 'bg-brand-700 text-sand-50',
  cream: 'bg-sand-200',
};

/**
 * Een pagina-band. De afwisseling van tonen geeft de pagina's rust en ritme:
 * zand als basis, wit voor inhoud die naar voren moet komen, salie voor de
 * rustige tussenstukken en baksteenrood voor één duidelijke oproep.
 */
export function Section({
  tone = 'plain',
  size = 'md',
  className,
  children,
  id,
}: {
  tone?: SectionTone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  const padding = size === 'sm' ? 'py-10 md:py-12' : size === 'lg' ? 'py-16 md:py-24' : 'py-12 md:py-16';
  return (
    <section id={id} className={cn(tones[tone], padding, className)}>
      {children}
    </section>
  );
}

export function Container({
  prose = false,
  className,
  children,
}: {
  prose?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn(prose ? 'container-prose' : 'container-page', className)}>{children}</div>;
}

/** Kop boven een sectie, met optioneel een korte inleiding. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow ? (
        <p className="font-display text-sm font-semibold tracking-[0.14em] text-brand-700 uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-2xl leading-tight text-balance md:text-3xl">{title}</h2>
      {intro ? <p className="mt-3 text-[1.0625rem] leading-relaxed text-sand-700">{intro}</p> : null}
    </div>
  );
}
