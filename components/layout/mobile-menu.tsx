'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import { isActivePath, type NavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';

/**
 * Het menu op een telefoon. Bewust een paneel over de hele hoogte met ruime
 * regels: de site wordt vooral op een telefoon bekeken, en dan moet een
 * menu-item makkelijk te raken zijn.
 */
export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();

  // Bij navigeren sluit het menu vanzelf.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape sluit, en de pagina eronder mag niet meescrollen.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Menu sluiten' : 'Menu openen'}
        className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-sand-800 transition-colors hover:bg-sand-200 md:hidden"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          )}
        </svg>
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="fixed inset-x-0 top-[var(--header-height,4.5rem)] bottom-0 z-40 overflow-y-auto bg-sand-100 md:hidden"
      >
        <nav className="container-page flex flex-col gap-1 py-6" aria-label="Hoofdmenu">
          {items.map((item) => {
            const active = isActivePath(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-2xl px-4 py-3.5 transition-colors',
                  active ? 'bg-white shadow-soft' : 'hover:bg-white/70',
                )}
              >
                <span
                  className={cn(
                    'block font-display text-lg font-semibold',
                    active ? 'text-brand-700' : 'text-sand-900',
                  )}
                >
                  {item.label}
                </span>
                {item.description ? (
                  <span className="mt-0.5 block text-sm text-sand-600">{item.description}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
