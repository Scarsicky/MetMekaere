'use server';

import { revalidatePath } from 'next/cache';

import {
  addToCart,
  applyDiscountCode,
  getPricedCart,
  removeLine,
  setLineQty,
  setShippingChoice,
} from '@/lib/shop/cart';
import { limitByIp } from '@/lib/rate-limit';
import type { CartActionState } from '@/lib/shop/action-state';

/**
 * De winkelwagen-acties.
 *
 * Alles wat hier binnenkomt wordt op de server opnieuw doorgerekend. De
 * browser stuurt hoogstens 'welk product' en 'hoeveel' — nooit een prijs.
 *
 * Elke actie geeft het nieuwe aantal artikelen terug, zodat het bolletje in
 * de header meteen klopt zonder extra verzoek.
 */

function parseAddons(formData: FormData): { addonId: string; qty: number }[] {
  const out: { addonId: string; qty: number }[] = [];

  // Aanvinkvakjes en keuzerondjes: 'addon' met de id als waarde.
  for (const value of formData.getAll('addon')) {
    const id = String(value).trim();
    if (id) out.push({ addonId: id, qty: 1 });
  }

  // Aantallen: 'addon-qty:<id>' met een getal.
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('addon-qty:')) continue;
    const id = key.slice('addon-qty:'.length);
    const qty = Number(value);
    if (id && Number.isFinite(qty) && qty > 0) {
      const existing = out.find((a) => a.addonId === id);
      if (existing) existing.qty = qty;
      else out.push({ addonId: id, qty });
    }
  }

  return out;
}

export async function addToCartAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const limit = await limitByIp('cart-add', 60, 60);
  if (!limit.allowed) {
    return { status: 'error', message: 'Even rustig aan — probeer het over een paar tellen opnieuw.' };
  }

  const productId = String(formData.get('productId') ?? '');
  const qty = Number(formData.get('qty') ?? 1);

  if (!productId) {
    return { status: 'error', message: 'Er ging iets mis. Ververs de pagina en probeer het opnieuw.' };
  }

  const result = await addToCart({
    productId,
    qty: Number.isFinite(qty) ? qty : 1,
    addons: parseAddons(formData),
  });

  if (!result.ok) return { status: 'error', message: result.error };

  revalidatePath('/winkelwagen');
  return { status: 'ok', message: result.message, itemCount: result.cart.itemCount };
}

export async function setLineQtyAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const lineId = String(formData.get('lineId') ?? '');
  const qty = Number(formData.get('qty') ?? 0);

  const result = await setLineQty(lineId, Number.isFinite(qty) ? qty : 0);
  if (!result.ok) return { status: 'error', message: result.error };

  revalidatePath('/winkelwagen');
  revalidatePath('/afrekenen');
  return { status: 'ok', itemCount: result.cart.itemCount };
}

export async function removeLineAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const lineId = String(formData.get('lineId') ?? '');

  const result = await removeLine(lineId);
  if (!result.ok) return { status: 'error', message: result.error };

  revalidatePath('/winkelwagen');
  revalidatePath('/afrekenen');
  return { status: 'ok', message: 'Verwijderd uit je winkelwagen.', itemCount: result.cart.itemCount };
}

export async function applyDiscountAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const limit = await limitByIp('discount', 15, 300);
  if (!limit.allowed) {
    return { status: 'error', message: 'Je hebt een paar codes achter elkaar geprobeerd. Wacht even.' };
  }

  const code = String(formData.get('code') ?? '');
  const result = await applyDiscountCode(code);

  revalidatePath('/winkelwagen');
  revalidatePath('/afrekenen');

  if (!result.ok) return { status: 'error', message: result.error };
  return { status: 'ok', message: result.message, itemCount: result.cart.itemCount };
}

export async function setShippingAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const country = formData.get('country');
  const rateId = formData.get('shippingRateId');

  const result = await setShippingChoice({
    country: country ? String(country) : undefined,
    shippingRateId: rateId === null ? undefined : String(rateId) || null,
  });

  revalidatePath('/winkelwagen');
  revalidatePath('/afrekenen');

  if (!result.ok) return { status: 'error', message: result.error };
  return { status: 'ok', itemCount: result.cart.itemCount };
}

/** Alleen het actuele aantal — gebruikt na het herstellen van een pagina. */
export async function refreshCartCount(): Promise<number> {
  const cart = await getPricedCart();
  return cart.itemCount;
}
