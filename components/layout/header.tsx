import Image from 'next/image';
import Link from 'next/link';

import { CartButton } from '@/components/layout/cart-button';
import { DesktopNav } from '@/components/layout/desktop-nav';
import { MobileMenu } from '@/components/layout/mobile-menu';
import { getAdventSettings, isAdventInSeason } from '@/lib/data/settings';
import { ADVENT_NAV, MAIN_NAV, type NavItem } from '@/lib/navigation';

/**
 * De header. Blijft bij het scrollen bovenaan staan, want de winkelwagen moet
 * onderweg altijd bereikbaar zijn.
 *
 * De adventskalender verschijnt alleen in het menu wanneer hij in het seizoen
 * zit; de pagina zelf blijft het hele jaar bereikbaar met een tekst dat hij in
 * december terugkomt.
 */
export async function Header() {
  const advent = await getAdventSettings();
  const items: NavItem[] = isAdventInSeason(advent) ? [...MAIN_NAV, ADVENT_NAV] : MAIN_NAV;

  return (
    <header className="sticky top-0 z-50 border-b border-sand-300/80 bg-sand-100/90 backdrop-blur-md">
      <div className="container-page flex h-[var(--header-height)] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Met Mekaere, naar de homepagina">
          <Image
            src="/logo.png"
            alt=""
            width={512}
            height={512}
            priority
            className="size-11 shrink-0 md:size-12"
          />
          <span className="hidden sm:block">
            <span className="block font-display text-lg leading-none font-semibold tracking-wide text-sand-900">
              Met Mekaere
            </span>
            <span className="mt-0.5 block font-display text-[0.7rem] leading-none tracking-[0.18em] text-sand-600 uppercase">
              Samen verbinden
            </span>
          </span>
        </Link>

        <DesktopNav items={items} />

        <div className="flex items-center gap-1">
          <CartButton />
          <MobileMenu items={items} />
        </div>
      </div>
    </header>
  );
}
