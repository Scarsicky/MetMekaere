import 'server-only';

/**
 * Koppeling met de mailinglijst.
 *
 * De opzet is bewust een adapter: welke partij je ook kiest, de rest van de
 * site verandert niet. Schakelen doe je met één omgevingsvariabele
 * (`NEWSLETTER_PROVIDER`). Zolang die op `none` staat worden inschrijvingen
 * alleen in Firestore bewaard — de site werkt dan gewoon, je hebt de adressen,
 * en je kunt ze later in één keer synchroniseren.
 */

export type NewsletterProviderName = 'none' | 'mailerlite' | 'laposta';

export interface SubscribeInput {
  email: string;
  name?: string;
  source: string;
}

export type ProviderResult =
  | { status: 'skipped' }
  | { status: 'ok'; providerId: string | null }
  | { status: 'error'; message: string };

function providerName(): NewsletterProviderName {
  const raw = (process.env.NEWSLETTER_PROVIDER ?? 'none').toLowerCase();
  return raw === 'mailerlite' || raw === 'laposta' ? raw : 'none';
}

/** Voornaam/achternaam uit één naamveld — goed genoeg voor een nieuwsbrief. */
function splitName(name?: string): { first: string; last: string } {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

const TIMEOUT_MS = 8000;

async function postJson(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

/* ------------------------------------------------------------------ *
 * MailerLite
 * ------------------------------------------------------------------ */

async function subscribeMailerLite(input: SubscribeInput): Promise<ProviderResult> {
  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_GROUP_ID;
  if (!apiKey) return { status: 'error', message: 'MAILERLITE_API_KEY ontbreekt.' };

  const { first, last } = splitName(input.name);

  try {
    const res = await postJson('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email: input.email,
        fields: {
          name: first || undefined,
          last_name: last || undefined,
        },
        groups: groupId ? [groupId] : undefined,
        // MailerLite regelt de dubbele bevestiging zelf, als dat aanstaat.
        status: 'unconfirmed',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { status: 'error', message: `MailerLite gaf ${res.status}: ${body.slice(0, 300)}` };
    }

    const data = (await res.json()) as { data?: { id?: string } };
    return { status: 'ok', providerId: data.data?.id ?? null };
  } catch (error) {
    return { status: 'error', message: `MailerLite onbereikbaar: ${String(error)}` };
  }
}

/* ------------------------------------------------------------------ *
 * Laposta
 * ------------------------------------------------------------------ */

async function subscribeLaposta(input: SubscribeInput): Promise<ProviderResult> {
  const apiKey = process.env.LAPOSTA_API_KEY;
  const listId = process.env.LAPOSTA_LIST_ID;
  if (!apiKey || !listId) {
    return { status: 'error', message: 'LAPOSTA_API_KEY of LAPOSTA_LIST_ID ontbreekt.' };
  }

  const { first, last } = splitName(input.name);
  const body = new URLSearchParams({ list_id: listId, email: input.email });
  if (first) body.set('custom_fields[voornaam]', first);
  if (last) body.set('custom_fields[achternaam]', last);

  try {
    const res = await postJson('https://api.laposta.nl/v2/member', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Laposta gebruikt basic auth met de sleutel als gebruikersnaam.
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
      },
      body,
    });

    const data = (await res.json()) as { member?: { member_id?: string }; error?: { message?: string } };

    // Al ingeschreven is geen fout: het doel is bereikt.
    if (!res.ok && !/bestaat al|already exists/i.test(data.error?.message ?? '')) {
      return { status: 'error', message: `Laposta gaf ${res.status}: ${data.error?.message ?? ''}` };
    }
    return { status: 'ok', providerId: data.member?.member_id ?? null };
  } catch (error) {
    return { status: 'error', message: `Laposta onbereikbaar: ${String(error)}` };
  }
}

/* ------------------------------------------------------------------ *
 * Ingang
 * ------------------------------------------------------------------ */

export async function sendToProvider(input: SubscribeInput): Promise<ProviderResult> {
  switch (providerName()) {
    case 'mailerlite':
      return subscribeMailerLite(input);
    case 'laposta':
      return subscribeLaposta(input);
    default:
      return { status: 'skipped' };
  }
}

export function isProviderConfigured(): boolean {
  return providerName() !== 'none';
}
