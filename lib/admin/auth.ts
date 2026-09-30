import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { adminAuth } from '@/lib/firebase/admin';

/**
 * Toegang tot de admin.
 *
 * Inloggen gebeurt met Firebase Auth in de browser. Het token dat daaruit komt
 * wordt één keer naar de server gestuurd, daar gecontroleerd, en omgezet in een
 * sessiecookie die JavaScript niet kan lezen. Daarna doet de browser niets meer
 * met tokens.
 *
 * Beheerder ben je alleen met de custom claim `admin: true`. Die zet je met
 * `npm run admin:grant -- jouw@email.nl`. Een account aanmaken is dus niet
 * genoeg — dat voorkomt dat iemand zich via een openstaande registratie
 * toegang verschaft.
 */

const SESSION_COOKIE = 'mm_admin';
const SESSION_DAYS = 5;

export interface AdminUser {
  uid: string;
  email: string;
  name?: string;
}

/**
 * Wisselt een Firebase ID-token in voor een sessiecookie.
 * Geeft `null` als het token niet deugt of de gebruiker geen beheerder is.
 */
export async function createAdminSession(idToken: string): Promise<AdminUser | null> {
  try {
    // checkRevoked: een ingetrokken account krijgt meteen geen sessie meer.
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    if (decoded.admin !== true) return null;

    const expiresIn = SESSION_DAYS * 24 * 60 * 60 * 1000;
    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn });

    const store = await cookies();
    store.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expiresIn / 1000,
    });

    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
      name: typeof decoded.name === 'string' ? decoded.name : undefined,
    };
  } catch (error) {
    console.warn('[admin] inloggen mislukt:', error);
    return null;
  }
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** De ingelogde beheerder, of `null`. Veilig tijdens renderen. */
export async function currentAdmin(): Promise<AdminUser | null> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  if (!session) return null;

  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    if (decoded.admin !== true) return null;
    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
      name: typeof decoded.name === 'string' ? decoded.name : undefined,
    };
  } catch {
    // Verlopen of ingetrokken: gewoon uitgelogd.
    return null;
  }
}

/**
 * Voor admin-pagina's en -acties: geeft de beheerder terug, of stuurt door
 * naar het inlogscherm. Elke server action in de admin begint hiermee, zodat
 * een actie niet alsnog los te gebruiken is zonder sessie.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
