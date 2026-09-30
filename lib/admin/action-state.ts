/**
 * Wat een beheeractie teruggeeft.
 *
 * Los bestand, want een `'use server'`-bestand mag alleen async functies
 * exporteren — een type of constante erbij breekt de hele actie.
 */

export interface AdminActionState {
  status: 'idle' | 'ok' | 'error';
  message?: string;
  /** Foutmelding per veld, op de naam uit het formulier. */
  fieldErrors?: Record<string, string>;
  /** Waar naartoe na een gelukte actie (bijvoorbeeld na verwijderen). */
  redirectTo?: string;
}

export const ADMIN_INITIAL_STATE: AdminActionState = { status: 'idle' };

export function adminError(message: string, fieldErrors?: Record<string, string>): AdminActionState {
  return { status: 'error', message, fieldErrors };
}

export function adminOk(message = 'Opgeslagen.', redirectTo?: string): AdminActionState {
  return { status: 'ok', message, redirectTo };
}
