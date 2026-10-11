import Image from 'next/image';
import Link from 'next/link';

import { CartButton } from '@/components/layout/cart-button';
import { DesktopNav } from '@/components/layout/desktop-nav';
import { MobileMenu } from '@/components/layout/mobile-menu';
import { getPageIndex } from '@/lib/data/content';
import { getAdventSettings, isAdventInSeason } from '@/lib/data/settings';
import { ADVENT_NAV, MAIN_NAV, visibleNav, type NavItem } from '@/lib/navigation';

/**
 * De header. Blijft bij het scrollen bovenaan staan, want de winkelwagen moet
 * onderweg altijd bereikbaar zijn.
 *
 * De adventskalender verschijnt alleen in het menu wanneer hij in het seizoen
 * zit; de pagina zelf blijft het hele jaar bereikbaar met een tekst dat hij in
 * december terugkomt.
 */
export async function Header() {
  const [advent, pageIndex] = await Promise.all([getAdventSettings(), getPageIndex()]);
  const main = visibleNav(MAIN_NAV, pageIndex);
  const items: NavItem[] = isAdventInSeason(advent) ? [...main, ADVENT_NAV] : main;

  return (
    <header className="sticky top-0 z-50">
      {/*
        Het matglas zit op een laag ín de header, niet op de header zelf — en
        dat moet zo blijven. Een element met een `backdrop-filter` wordt het
        referentiekader voor alles met `position: fixed` daarbinnen. Stond de
        blur op de header, dan rekent het mobiele menupaneel zijn `top` en
        `bottom` af tegen een balk van 73 pixels en wordt het 0 pixels hoog:
        het menu opent dan wel, maar je ziet niets.
      */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 border-b border-sand-300/80 bg-sand-100/90 backdrop-blur-md"
      />

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
