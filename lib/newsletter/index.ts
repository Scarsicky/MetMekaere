import 'server-only';

import { adminDb } from '@/lib/firebase/admin';
import { sendToProvider } from '@/lib/newsletter/providers';
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
    };
    if (!existing.exists) record.createdAt = Date.now();

    await ref.set(record, { merge: true });
  } catch (error) {
    console.error('[newsletter] kon inschrijving niet opslaan:', error);
    return { ok: false, error: 'Het lukte even niet om je in te schrijven. Probeer het straks nog eens.' };
  }

  // De mailinglijst is stap twee. Een storing daar mag de bezoeker niet raken.
  const result = await sendToProvider({ email, name, source: args.source });

  try {
    if (result.status === 'ok') {
      await ref.set(
        { status: 'subscribed', providerId: result.providerId, syncedAt: Date.now(), syncError: null },
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

  return { ok: true, alreadySubscribed };
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
