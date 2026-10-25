import 'server-only';

import { adminDb } from '@/lib/firebase/admin';
import { sendToProvider, type ProviderResult } from '@/lib/newsletter/providers';
import { isValidEmail } from '@/lib/utils';
import type { NewsletterSubscriber } from '@/types';

/**
 * Inschrijven op de nieuwsbrief.
 *
 * Volgorde is met opzet: eerst vastleggen in Firestore, dan pas de mailinglijst
 * aanroepen. Valt die partij uit, dan is het adres niet kwijt — het staat met
 * `status: 'pending'` en een foutmelding klaar om opnieuw te versturen.
 */

const COLLECTION = 'newsletter';

export type SubscribeResult =
  | { ok: true; alreadySubscribed: boolean }
  | { ok: false; error: string };

export async function subscribeToNewsletter(args: {
  email: string;
  name?: string;
  source: string;
  /**
   * Het IP-adres van de inschrijver. Laposta eist het. Het wordt bewust
   * meegegeven en hier niet zelf opgehaald: bij het afrekenen loopt deze
   * functie door nadat het antwoord al verstuurd is, en dan zijn de headers
   * van het verzoek niet meer te lezen.
   */
  ip?: string;
}): Promise<SubscribeResult> {
  const email = args.email.trim().toLowerCase();

  if (!isValidEmail(email)) {
    return { ok: false, error: 'Dit e-mailadres ziet er niet goed uit. Kun je het nog even nakijken?' };
  }
  if (email.length > 254) {
    return { ok: false, error: 'Dit e-mailadres is te lang.' };
  }

  const name = args.name?.trim().slice(0, 120) || undefined;
  const ref = adminDb().collection(COLLECTION).doc(email);

  let alreadySubscribed = false;
  try {
    const existing = await ref.get();
    alreadySubscribed = existing.exists && existing.data()?.status === 'subscribed';

    const record: Omit<NewsletterSubscriber, 'createdAt'> & { createdAt?: number } = {
      email,
      name,
      status: 'pending',
      source: args.source.slice(0, 40),
      syncError: null,
      /*
       * Het IP-adres bewaren we, om twee redenen. Het is de onderbouwing van de
       * toestemming — daarom eist Laposta het ook — en het is nodig om een
       * inschrijving later alsnog door te kunnen zetten: Laposta weigert een
       * verzoek zonder.
       */
      ip: args.ip && args.ip !== 'onbekend' ? args.ip : null,
    };
    if (!existing.exists) record.createdAt = Date.now();

    await ref.set(record, { merge: true });
  } catch (error) {
    console.error('[newsletter] kon inschrijving niet opslaan:', error);
    return { ok: false, error: 'Het lukte even niet om je in te schrijven. Probeer het straks nog eens.' };
  }

  // De mailinglijst is stap twee. Een storing daar mag de bezoeker niet raken.
  const result = await sendToProvider({ email, name, source: args.source, ip: args.ip });
  await applyProviderResult(ref, result);

  return { ok: true, alreadySubscribed };
}

/**
 * De uitkomst van de mailinglijst vastleggen bij het adres.
 *
 * Eén plek, want dit gebeurt op twee momenten: bij het inschrijven en bij het
 * opnieuw doorzetten vanuit het beheer. Liepen die uit elkaar, dan zou een
 * handmatige poging iets anders opleveren dan een gewone inschrijving.
 */
async function applyProviderResult(
  ref: FirebaseFirestore.DocumentReference,
  result: ProviderResult,
): Promise<void> {
  try {
    if (result.status === 'ok') {
      await ref.set(
        {
          status: 'subscribed',
          providerId: result.providerId,
          syncedAt: Date.now(),
          syncError: null,
          syncNote: result.note ?? null,
        },
        { merge: true },
      );
    } else if (result.status === 'error') {
      console.error('[newsletter] koppeling met de mailinglijst mislukte:', result.message);
      await ref.set({ status: 'pending', syncError: result.message }, { merge: true });
    } else {
      // Geen partij ingesteld: het adres staat in Firestore en dat is genoeg.
      await ref.set({ status: 'subscribed', syncedAt: Date.now() }, { merge: true });
    }
  } catch (error) {
    console.error('[newsletter] kon de status niet bijwerken:', error);
  }
}

export interface ResyncReport {
  attempted: number;
  synced: number;
  failed: number;
  firstError: string | null;
}

/**
 * Alsnog doorzetten wat nog niet in de mailinglijst staat.
 *
 * Nodig omdat een inschrijving bij de mailinglijst mis kan gaan terwijl het
 * adres hier wél staat. Opnieuw inschrijven via de footer kan alleen de
 * persoon zelf, en die weet van niets — dus moet het ook van deze kant kunnen.
 *
 * Wie zich heeft uitgeschreven blijft met rust: die hoort nergens meer heen.
 * Eén voor één, niet tegelijk: het gaat om een handvol adressen en een
 * mailinglijst hoeft daar niet van te schrikken.
 */
export async function resyncUnsynced(limit = 50): Promise<ResyncReport> {
  const all = await listSubscribers();
  const todo = all.filter((s) => s.status !== 'unsubscribed' && !s.providerId).slice(0, limit);

  const report: ResyncReport = { attempted: todo.length, synced: 0, failed: 0, firstError: null };

  for (const subscriber of todo) {
    const result = await sendToProvider({
      email: subscriber.email,
      name: subscriber.name,
      source: subscriber.source,
      ip: subscriber.ip ?? undefined,
    });

    await applyProviderResult(adminDb().collection(COLLECTION).doc(subscriber.email), result);

    if (result.status === 'error') {
      report.failed += 1;
      report.firstError ??= result.message;
    } else if (result.status === 'ok' && result.providerId) {
      report.synced += 1;
    } else if (result.status === 'ok') {
      /*
       * Doorgezet, maar zonder id terug. Dan staat het adres er waarschijnlijk
       * wel, maar is dat hier niet te zien — en komt het bij een volgende
       * poging opnieuw langs. Dus niet als gelukt tellen.
       */
      report.failed += 1;
      report.firstError ??= 'De mailinglijst gaf geen id terug.';
    }
  }

  return report;
}

export async function listSubscribers(): Promise<NewsletterSubscriber[]> {
  const snap = await adminDb().collection(COLLECTION).get();
  return snap.docs
    .map((d) => {
      const raw = d.data() as Record<string, unknown>;
      return {
        email: d.id,
        name: typeof raw.name === 'string' ? raw.name : undefined,
        status: (raw.status as NewsletterSubscriber['status']) ?? 'pending',
        source: typeof raw.source === 'string' ? raw.source : 'onbekend',
        providerId: typeof raw.providerId === 'string' ? raw.providerId : null,
        syncedAt: typeof raw.syncedAt === 'number' ? raw.syncedAt : null,
        syncError: typeof raw.syncError === 'string' ? raw.syncError : null,
        syncNote: typeof raw.syncNote === 'string' ? raw.syncNote : null,
        ip: typeof raw.ip === 'string' ? raw.ip : null,
        createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0,
      } satisfies NewsletterSubscriber;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function unsubscribe(email: string): Promise<void> {
  await adminDb()
    .collection(COLLECTION)
    .doc(email.trim().toLowerCase())
    .set({ status: 'unsubscribed', unsubscribedAt: Date.now() }, { merge: true });
}
