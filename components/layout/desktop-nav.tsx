'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { isActivePath, type NavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export function DesktopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden md:block" aria-label="Hoofdmenu">
      <ul className="flex items-center gap-0.5 lg:gap-1">
        {items.map((item) => {
          const active = isActivePath(item.href, pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative block rounded-full px-3 py-2 font-display text-[0.9rem] font-semibold whitespace-nowrap transition-colors',
                  active ? 'text-brand-700' : 'text-sand-800 hover:text-brand-700',
                )}
              >
                {item.label}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-700"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
