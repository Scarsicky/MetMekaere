'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { ADMIN_NAV } from '@/lib/admin/navigation';
import { cn } from '@/lib/utils';

function isActive(href: string, pathname: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Het kader van het adminpaneel: menu links, inhoud rechts.
 *
 * Op een telefoon schuift het menu open vanaf de bovenkant — handig om
 * onderweg even een bestelling te bekijken of een prijs aan te passen.
 */
export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch('/api/admin/session', { method: 'DELETE' });
    router.replace('/admin/login');
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-col gap-6" aria-label="Beheermenu">
      <Link
        href="/admin"
        onClick={() => setMenuOpen(false)}
        className={cn(
          'rounded-xl px-3 py-2 font-display font-semibold transition-colors',
          isActive('/admin', pathname) ? 'bg-sand-200 text-brand-700' : 'text-sand-800 hover:bg-sand-200',
        )}
      >
        Overzicht
      </Link>

      {ADMIN_NAV.map((group) => (
        <div key={group.title}>
          <h2 className="px-3 font-display text-xs font-bold tracking-[0.14em] text-sand-500 uppercase">
            {group.title}
          </h2>
          <ul className="mt-2 flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive(item.href, pathname) ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.95rem] transition-colors',
                    isActive(item.href, pathname)
                      ? 'bg-sand-200 font-semibold text-brand-700'
                      : 'text-sand-800 hover:bg-sand-200',
                  )}
                >
                  <span aria-hidden className="text-base">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-sand-100">
      {/* Bovenbalk: op mobiel het menu, op desktop alleen de accountregel. */}
      <header className="sticky top-0 z-40 border-b border-sand-300 bg-sand-100/95 backdrop-blur-md lg:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={512} height={512} className="size-9" />
            <span className="font-display font-semibold">Beheer</span>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Menu sluiten' : 'Menu openen'}
            className="inline-flex size-11 items-center justify-center rounded-full text-sand-800 hover:bg-sand-200"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen ? (
          <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-sand-300 px-4 py-5">
            {nav}
            <AccountBox email={email} onSignOut={signOut} busy={signingOut} className="mt-6" />
          </div>
        ) : null}
      </header>

      <div className="lg:flex">
        {/* Menu op desktop */}
        <aside className="hidden w-64 shrink-0 border-r border-sand-300 bg-white lg:block">
          <div className="sticky top-0 flex h-dvh flex-col overflow-y-auto px-4 py-6">
            <Link href="/admin" className="mb-8 flex items-center gap-3 px-2">
              <Image src="/logo.png" alt="" width={512} height={512} className="size-10" />
              <span>
                <span className="block font-display font-semibold text-sand-900">Met Mekaere</span>
                <span className="block text-xs tracking-wider text-sand-600 uppercase">Beheer</span>
              </span>
            </Link>

            {nav}

            <AccountBox email={email} onSignOut={signOut} busy={signingOut} className="mt-auto pt-6" />
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function AccountBox({
  email,
  onSignOut,
  busy,
  className,
}: {
  email: string;
  onSignOut: () => void;
  busy: boolean;
  className?: string;
}) {
  return (
    <div className={cn('border-t border-sand-300 pt-4', className)}>
      <p className="px-3 text-sm text-sand-600">Ingelogd als</p>
      <p className="truncate px-3 text-sm font-medium text-sand-900">{email}</p>
      <div className="mt-3 flex flex-col gap-1">
        <Link
          href="/"
          target="_blank"
          className="rounded-xl px-3 py-2 text-sm text-sand-700 transition-colors hover:bg-sand-200"
        >
          Bekijk de website ↗
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          disabled={busy}
          className="rounded-xl px-3 py-2 text-left text-sm text-sand-700 transition-colors hover:bg-sand-200 disabled:opacity-60"
        >
          {busy ? 'Uitloggen…' : 'Uitloggen'}
        </button>
      </div>
    </div>
  );
}
