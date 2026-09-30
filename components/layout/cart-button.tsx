'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { loadCartCountOnce, useCartCount } from '@/lib/shop/cart-count-store';

/**
 * Het winkelwagentje in de header. Het aantal komt na het laden binnen (zie
 * cart-count-store) en verandert daarna meteen mee als er iets wordt
 * toegevoegd — zonder de pagina opnieuw op te halen.
 */
export function CartButton() {
  const count = useCartCount();

  useEffect(() => {
    void loadCartCountOnce();
  }, []);

  const label =
    count && count > 0
      ? `Winkelwagen, ${count} ${count === 1 ? 'artikel' : 'artikelen'}`
      : 'Winkelwagen, leeg';

  return (
    <Link
      href="/winkelwagen"
      aria-label={label}
      className="relative inline-flex size-11 items-center justify-center rounded-full text-sand-800 transition-colors hover:bg-sand-200 hover:text-brand-700"
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path
          d="M3.5 4h1.6a1 1 0 0 1 .98.8L6.5 7m0 0 1.6 7.6a1.5 1.5 0 0 0 1.47 1.2h7.2a1.5 1.5 0 0 0 1.47-1.18L20 7.8a.5.5 0 0 0-.49-.6H6.5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="19.5" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="17" cy="19.5" r="1.4" fill="currentColor" stroke="none" />
      </svg>

      {count && count > 0 ? (
        <span
          aria-hidden
          className="absolute top-1 right-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-700 px-1.5 py-0.5 font-display text-[0.68rem] leading-none font-bold text-sand-50 tabular"
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}
