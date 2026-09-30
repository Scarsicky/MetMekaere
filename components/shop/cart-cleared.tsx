'use client';

import { useEffect } from 'react';

import { setCartCount } from '@/lib/shop/cart-count-store';

/**
 * Zet het bolletje in de header op nul.
 *
 * Na het betalen komt de klant via een navigatie binnen de app op de
 * bedanktpagina. Het aantal in de header is dan nog het oude getal uit het
 * geheugen van de browser. De winkelwagen is op de server allang leeg; dit
 * laat dat ook zien.
 */
export function CartCleared() {
  useEffect(() => {
    setCartCount(0);
  }, []);

  return null;
}
