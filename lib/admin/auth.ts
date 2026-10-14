import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { IDLE_TIMEOUT_MS, SESSION_MAX_HOURS } from '@/lib/admin/session-policy';
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

/**
 * Waar de laatste activiteit per beheerder wordt bijgehouden. Een eigen
 * collectie, zodat de beheerderslijst in `admins` puur over rechten gaat.
 */
const ACTIVITY_COLLECTION = 'adminSessions';

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

    const expiresIn = SESSION_MAX_HOURS * 60 * 60 * 1000;
    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn });

    // Meteen een beginpunt zetten, anders zou de eerste pagina al als 'te lang
    // stil' kunnen gelden.
    await touchActivity(decoded.uid);

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

/**
 * Vastleggen dat deze beheerder er nog is.
 *
 * Wordt aangeroepen vanuit `/api/admin/activity`, dat het beheerscherm hooguit
 * eens per paar minuten aantikt. Mislukken mag: dan blijft de vorige tijd
 * staan en val je hooguit eerder uit de sessie.
 */
/**
 * Rem op het bijwerken: zonder deze zou elke pagina in het beheer een
 * schrijfactie worden. Per draaiend exemplaar; meer is hier niet nodig, want
 * te vaak schrijven is hooguit verspilling en nooit fout.
 */
const lastTouched = new Map<string, number>();
const TOUCH_THROTTLE_MS = 60 * 1000;

function shouldTouchActivity(uid: string): boolean {
  const previous = lastTouched.get(uid) ?? 0;
  if (Date.now() - previous < TOUCH_THROTTLE_MS) return false;
  lastTouched.set(uid, Date.now());
  return true;
}

export async function touchActivity(uid: string): Promise<void> {
  try {
    await adminDb()
      .collection(ACTIVITY_COLLECTION)
      .doc(uid)
      .set({ lastSeen: Date.now() }, { merge: true });
  } catch (error) {
    console.warn('[admin] kon de laatste activiteit niet opslaan:', error);
  }
}

/**
 * Is het te lang stil geweest?
 *
 * Bij twijfel níet uitsluiten. Staat er nog niets — een sessie van vóór deze
 * functie — of doet Firestore het even niet, dan blijft de sessie geldig. De
 * harde grens van {@link SESSION_MAX_HOURS} uur loopt dan nog steeds af, dus
 * een storing kan een sessie niet eindeloos oprekken.
 */
async function isIdleTooLong(uid: string): Promise<boolean> {
  try {
    const snap = await adminDb().collection(ACTIVITY_COLLECTION).doc(uid).get();
    const lastSeen = snap.data()?.lastSeen;
    if (typeof lastSeen !== 'number') return false;
    return Date.now() - lastSeen > IDLE_TIMEOUT_MS;
  } catch (error) {
    console.error('[admin] kon de laatste activiteit niet lezen:', error);
    return false;
  }
}

/** De ingelogde beheerder, of `null`. Veilig tijdens renderen. */
/**
 * Waarom iemand niet binnen mag. Deze reden gaat mee naar het inlogscherm.
 *
 * Zonder dit is een geweigerde sessie stil: je komt terug op het inlogformulier
 * zonder dat iemand — ook ik niet — kan zien wat er misging. En de vier
 * oorzaken hieronder vragen om heel verschillende oplossingen.
 */
export type AdminDenialReason =
  /** Er kwam helemaal geen sessiecookie mee met het verzoek. */
  | 'geen-cookie'
  /** Er was een cookie, maar Firebase keurde hem af. */
  | 'ongeldig'
  /** Geldige sessie, maar dit account is geen beheerder. */
  | 'geen-rechten'
  /** Te lang niets gedaan. */
  | 'te-lang-stil';

export type AdminCheck = { admin: AdminUser } | { admin: null; reason: AdminDenialReason };

export async function checkAdmin(): Promise<AdminCheck> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  if (!session) return { admin: null, reason: 'geen-cookie' };

  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    if (!(await hasAdminAccess(decoded.uid, decoded.admin === true))) {
      return { admin: null, reason: 'geen-rechten' };
    }
    if (await isIdleTooLong(decoded.uid)) {
      return { admin: null, reason: 'te-lang-stil' };
    }
    return {
      admin: {
        uid: decoded.uid,
        email: decoded.email ?? '',
        name: typeof decoded.name === 'string' ? decoded.name : undefined,
      },
    };
  } catch {
    // Verlopen of ingetrokken: gewoon uitgelogd.
    return { admin: null, reason: 'ongeldig' };
  }
}

/** De ingelogde beheerder, of `null`. Veilig tijdens renderen. */
export async function currentAdmin(): Promise<AdminUser | null> {
  return (await checkAdmin()).admin;
}

/**
 * Voor admin-pagina's en -acties: geeft de beheerder terug, of stuurt door
 * naar het inlogscherm. Elke server action in de admin begint hiermee, zodat
 * een actie niet alsnog los te gebruiken is zonder sessie.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const result = await checkAdmin();
  // De reden gaat mee, zodat het inlogscherm kan uitleggen wat er misging in
  // plaats van zwijgend het formulier opnieuw te tonen.
  if (!result.admin) redirect(`/admin/login?reden=${result.reason}`);
  const admin = result.admin;

  /*
   * Het beheer gebruiken telt als teken van leven.
   *
   * Dit hing eerst alleen aan een verzoekje dat de browser op de achtergrond
   * stuurt. Dat is te wankel: komt dat in een bepaalde browser niet aan, dan
   * vliegt iemand er na een half uur werken alsnog uit terwijl hij de hele tijd
   * bezig was. Elke pagina en elke handeling in het beheer komt hier langs, dus
   * dit is de eerlijkere maatstaf.
   *
   * Hooguit eens per minuut, en zonder erop te wachten: de pagina hoeft hier
   * niet voor stil te staan, en gaat het mis dan is de volgende klik er zo weer.
   */
  if (shouldTouchActivity(admin.uid)) {
    void touchActivity(admin.uid);
  }

  return admin;
}
