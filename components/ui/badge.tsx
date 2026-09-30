import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type BadgeTone = 'sage' | 'ochre' | 'brand' | 'neutral' | 'muted';

const tones: Record<BadgeTone, string> = {
  sage: 'bg-sage-200 text-sage-900',
  ochre: 'bg-ochre-200 text-ochre-700',
  brand: 'bg-brand-700 text-sand-50',
  neutral: 'bg-white text-sand-800 border border-sand-300',
  muted: 'bg-sand-200 text-sand-700',
};

/** Klein label: 'Nieuw', 'Uitverkocht', '5+ voordeel', een thema. */
export function Badge({
  tone = 'sage',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-display text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
