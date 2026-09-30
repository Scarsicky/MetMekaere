import { NextResponse } from 'next/server';

import { getCartItemCount } from '@/lib/shop/cart';

/**
 * Het aantal artikelen in de winkelwagen, voor het bolletje in de header.
 * Klein en apart gehouden zodat de rest van de site statisch kan blijven —
 * zie lib/shop/cart-count-store.ts voor de afweging.
 */
export async function GET() {
  try {
    const itemCount = await getCartItemCount();
    return NextResponse.json({ itemCount }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[cart] kon het aantal artikelen niet bepalen:', error);
    return NextResponse.json({ itemCount: 0 }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
