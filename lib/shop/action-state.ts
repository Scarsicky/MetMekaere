/**
 * De vorm van wat een winkelwagen-actie teruggeeft.
 *
 * Dit staat los van `app/actions/cart.ts` omdat een `'use server'`-bestand
 * uitsluitend async functies mag exporteren — een constante of een type erbij
 * laat de hele actie mislukken met 'A "use server" file can only export async
 * functions'. Types en beginwaarden horen dus hier.
 */

export interface CartActionState {
  status: 'idle' | 'ok' | 'error';
  message?: string;
  /** Het nieuwe aantal artikelen, voor het bolletje in de header. */
  itemCount?: number;
}

export const CART_INITIAL_STATE: CartActionState = { status: 'idle' };

export interface NewsletterFormState {
  status: 'idle' | 'ok' | 'error';
  message?: string;
}

export const NEWSLETTER_INITIAL_STATE: NewsletterFormState = { status: 'idle' };

export interface CheckoutActionState {
  status: 'idle' | 'error';
  message?: string;
  /** Foutmelding per veld, op de naam uit het formulier ('shipping.postalCode'). */
  fieldErrors?: Record<string, string>;
}

export const CHECKOUT_INITIAL_STATE: CheckoutActionState = { status: 'idle' };
