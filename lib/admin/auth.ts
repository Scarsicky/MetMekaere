import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * Toegang tot de admin.
 *
 * Inloggen gebeurt met Firebase Auth in de browser. Het token dat daaruit komt
 * wordt één keer naar de server gestuurd, daar gecontroleerd, en omgezet in een
 * sessiecookie die JavaScript niet kan lezen. Daarna doet de browser niets meer
 * met tokens.
 *
 * Beheerder ben je op één van twee manieren:
 *
 *  1. de custom claim `admin: true` — gezet met `npm run admin:grant`;
 *  2. een document `admins/{uid}` in Firestore.
 *
 * Die tweede weg bestaat omdat custom claims alleen met de Admin SDK te zetten
 * zijn, en dus een service-account-sleutel op je eigen laptop vragen. Een
 * document aanmaken kan gewoon in de Firebase-console. Dat is even veilig: de
 * regels staan geen enkele schrijfactie vanuit een browser toe, dus alleen wie
 * bij de console kan — de eigenaar van het project — kan iemand toegang geven.
 *
 * Een account aanmaken is in beide gevallen niet genoeg. Dat voorkomt dat
 * iemand zich via een openstaande registratie toegang verschaft.
 */

const SESSION_COOKIE = 'mm_admin';
const SESSION_DAYS = 5;

export interface AdminUser {
  uid: string;
  email: string;
  name?: string;
}

/**
 * Mag deze gebruiker in het beheer?
 *
 * De claim wordt als eerste bekeken: die zit al in het token, dus dat kost
 * niets. Pas als hij ontbreekt gaan we in Firestore kijken.
 */
async function hasAdminAccess(uid: string, isClaimed: boolean): Promise<boolean> {
  if (isClaimed) return true;

  try {
    const snap = await adminDb().collection('admins').doc(uid).get();
    // `active: false` zet iemand tijdelijk buitenspel zonder het document weg
    // te gooien — handig als je iemand later weer wilt toelaten.
    return snap.exists && snap.data()?.active !== false;
  } catch (error) {
    // Bij twijfel geen toegang. Een storing in Firestore mag nooit betekenen
    // dat de admin per ongeluk voor iedereen opengaat.
    console.error('[admin] kon de beheerderslijst niet lezen:', error);
    return false;
  }
}

/**
 * Wisselt een Firebase ID-token in voor een sessiecookie.
 * Geeft `null` als het token niet deugt of de gebruiker geen beheerder is.
 */
export async function createAdminSession(idToken: string): Promise<AdminUser | null> {
  try {
    // checkRevoked: een ingetrokken account krijgt meteen geen sessie meer.
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    if (!(await hasAdminAccess(decoded.uid, decoded.admin === true))) return null;

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
    if (!(await hasAdminAccess(decoded.uid, decoded.admin === true))) return null;
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
