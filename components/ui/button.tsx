import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'sage' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold ' +
  'transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out-soft)] ' +
  'disabled:pointer-events-none disabled:opacity-55 active:translate-y-px ' +
  // Ruime raakvlakken: de checkout moet op een telefoon prettig werken.
  'min-h-11 touch-manipulation';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-sand-50 shadow-soft hover:bg-brand-800',
  secondary: 'bg-white text-sand-900 border border-sand-300 hover:border-sand-400 hover:bg-sand-50',
  ghost: 'text-brand-700 hover:bg-brand-50',
  sage: 'bg-sage-300 text-sage-900 hover:bg-sage-400',
  danger: 'bg-white text-brand-700 border border-brand-200 hover:bg-brand-50',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-[0.95rem]',
  lg: 'px-7 py-3.5 text-base',
};

function classes(variant: ButtonVariant, size: ButtonSize, fullWidth?: boolean, className?: string) {
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className);
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<'button'>) {
  return (
    <button className={classes(variant, size, fullWidth, className)} {...rest}>
      {children}
    </button>
  );
}

/**
 * Knop die navigeert. Externe links krijgen automatisch `rel="noreferrer"`,
 * zodat een link naar een andere site niets over deze site doorgeeft.
 */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...rest
}: CommonProps & { href: string } & Omit<ComponentProps<typeof Link>, 'href' | 'children'>) {
  const external = /^https?:\/\//.test(href);

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={classes(variant, size, fullWidth, className)}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes(variant, size, fullWidth, className)} {...rest}>
      {children}
    </Link>
  );
}
