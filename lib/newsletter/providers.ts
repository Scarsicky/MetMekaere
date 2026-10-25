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
  /**
   * Het IP-adres van de inschrijver. Laposta eist dit veld; zonder wordt elke
   * inschrijving geweigerd. Wordt doorgegeven vanaf de plek waar het verzoek
   * binnenkomt, want daar zijn de headers nog beschikbaar.
   */
  ip?: string;
}

export type ProviderResult =
  | { status: 'skipped' }
  /**
   * Gelukt. `note` is een korte toelichting voor in het beheer, voor de
   * gevallen waarin 'gelukt' niet het hele verhaal is: het adres stond er al,
   * of het staat er wel maar krijgt toch geen mail.
   */
  | { status: 'ok'; providerId: string | null; note?: string }
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

async function apiFetch(url: string, init: RequestInit): Promise<Response> {
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
    const res = await apiFetch('https://connect.mailerlite.com/api/subscribers', {
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

/**
 * De velden in de Laposta-lijst waar een naam in zou passen.
 *
 * Standaard leeg, en dat is een keuze: het inschrijfformulier vraagt alleen om
 * een e-mailadres, dus er is meestal geen naam om te versturen. Alleen bij het
 * afrekenen is er wél een naam bekend — die is dan al voor de bezorging
 * opgegeven.
 *
 * Wil je die alsnog doorgeven, zet deze dan op de relatievariabelen van je
 * lijst (bij Met Mekaere: `voornaam` en `achternaam`). Klopt een naam niet met
 * de lijst, dan weigert Laposta het hele verzoek — daarom wordt het dan zonder
 * naam opnieuw geprobeerd.
 */
const LAPOSTA_FIRSTNAME_FIELD = process.env.LAPOSTA_FIRSTNAME_FIELD ?? '';
const LAPOSTA_LASTNAME_FIELD = process.env.LAPOSTA_LASTNAME_FIELD ?? '';

/** De toestanden die Laposta aan een adres kan geven. */
type LapostaState = 'active' | 'unsubscribed' | 'unconfirmed' | 'cleaned';

interface LapostaMember {
  member_id?: string;
  state?: LapostaState | string;
}

interface LapostaResponse {
  member?: LapostaMember;
  error?: { message?: string; code?: number; parameter?: string };
}

/**
 * Staat dit adres al in de lijst?
 *
 * Laposta meldt dat met code 204 — 'de parameter komt al voor' — bij de
 * parameter `email`. Op de tekst afgaan bleek onbetrouwbaar: die luidt
 * `Email address exists`, zonder het woord 'already' waar de eerste versie van
 * deze code naar zocht. Daardoor gold een adres dat er gewoon al stond als een
 * mislukte inschrijving. Nu eerst de code, en de tekst alleen als vangnet.
 */
export function isLapostaDuplicate(data: LapostaResponse): boolean {
  if (data.error?.code === 204) return true;
  return /exist|bestaat al|komt al voor|al ingeschreven/i.test(data.error?.message ?? '');
}

/**
 * Wat er in het beheer bij het adres komt te staan.
 *
 * 'Doorgezet' en 'krijgt mail' zijn niet hetzelfde. Iemand kan in Laposta
 * staan en zich daar hebben uitgeschreven, of nog op de bevestigingsmail
 * wachten. Dat hoort zichtbaar te zijn, want anders wacht je op een mailing
 * die bij deze persoon nooit aankomt.
 */
export function lapostaNote(state: string | undefined, existed: boolean): string | undefined {
  switch (state) {
    case 'unsubscribed':
      return 'Staat in Laposta, maar heeft zich daar uitgeschreven. Alleen in Laposta zelf is dat terug te zetten.';
    case 'cleaned':
      return 'Staat in Laposta als onbestelbaar. Mail aan dit adres komt niet aan.';
    case 'unconfirmed':
      return 'Staat in Laposta en wacht nog op de bevestigingsmail.';
    case 'active':
      return existed ? 'Stond al in Laposta.' : undefined;
    default:
      return existed ? 'Stond al in Laposta.' : undefined;
  }
}

async function subscribeLaposta(input: SubscribeInput): Promise<ProviderResult> {
  const apiKey = process.env.LAPOSTA_API_KEY;
  const listId = process.env.LAPOSTA_LIST_ID;
  if (!apiKey || !listId) {
    return { status: 'error', message: 'LAPOSTA_API_KEY of LAPOSTA_LIST_ID ontbreekt.' };
  }

  const authorization = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;

  function body(withName: boolean): URLSearchParams {
    const form = new URLSearchParams({
      list_id: listId!,
      email: input.email,
      /*
       * Verplicht bij Laposta. Hebben we geen adres — lokaal draaien,
       * bijvoorbeeld — dan sturen we een leeg adres mee in plaats van niets,
       * want een ontbrekend veld laat het hele verzoek stuklopen.
       */
      ip: input.ip && input.ip !== 'onbekend' ? input.ip : '0.0.0.0',
    });
    if (withName) {
      const { first, last } = splitName(input.name);
      if (LAPOSTA_FIRSTNAME_FIELD && first) {
        form.set(`custom_fields[${LAPOSTA_FIRSTNAME_FIELD}]`, first);
      }
      if (LAPOSTA_LASTNAME_FIELD && last) {
        form.set(`custom_fields[${LAPOSTA_LASTNAME_FIELD}]`, last);
      }
    }
    return form;
  }

  async function send(withName: boolean): Promise<{ res: Response; data: LapostaResponse }> {
    const res = await apiFetch('https://api.laposta.nl/v2/member', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Laposta gebruikt basic auth met de sleutel als gebruikersnaam en
        // een leeg wachtwoord.
        Authorization: authorization,
      },
      body: body(withName),
    });
    const data = (await res.json().catch(() => ({}))) as LapostaResponse;
    return { res, data };
  }

  /**
   * Het adres opzoeken in de lijst.
   *
   * Nodig na 'bestaat al': dat antwoord bevat geen id, en zonder id blijft het
   * adres in het beheer op *nog niet doorgezet* staan. Een plus-teken in een
   * adres hoort hier dubbel gecodeerd (`%252B`) — zo staat het in de
   * handleiding van Laposta, en `encodeURIComponent` laat een plus met rust.
   */
  async function lookupMember(): Promise<LapostaMember | null> {
    try {
      const path = encodeURIComponent(input.email).replace(/\+/g, '%252B');
      const res = await apiFetch(
        `https://api.laposta.nl/v2/member/${path}?list_id=${encodeURIComponent(listId!)}`,
        { method: 'GET', headers: { Authorization: authorization } },
      );
      if (!res.ok) return null;
      const data = (await res.json().catch(() => ({}))) as LapostaResponse;
      return data.member ?? null;
    } catch {
      // Het opzoeken is een extraatje; mislukt het, dan is dat geen reden om
      // de inschrijving alsnog als mislukt te boeken.
      return null;
    }
  }

  const withName = Boolean(input.name && (LAPOSTA_FIRSTNAME_FIELD || LAPOSTA_LASTNAME_FIELD));

  try {
    let { res, data } = await send(withName);

    /*
     * Mislukt het en stuurden we een naam mee, dan is een onbekende veldnaam
     * de waarschijnlijkste oorzaak. Het adres is belangrijker dan de naam, dus
     * dan liever één keer opnieuw zonder. Bij 'bestaat al' heeft dat geen zin:
     * dan ligt het niet aan de velden.
     */
    if (!res.ok && withName && !isLapostaDuplicate(data)) {
      console.warn(
        `[newsletter] Laposta weigerde de inschrijving mét naam (${data.error?.message ?? res.status}); ` +
          'opnieuw geprobeerd zonder. Kloppen LAPOSTA_FIRSTNAME_FIELD en ' +
          'LAPOSTA_LASTNAME_FIELD met de velden in de lijst?',
      );
      ({ res, data } = await send(false));
    }

    if (!res.ok) {
      if (!isLapostaDuplicate(data)) {
        return {
          status: 'error',
          message: `Laposta gaf ${res.status}: ${data.error?.message ?? 'geen toelichting'}`,
        };
      }

      // Al ingeschreven is geen fout: het doel is bereikt. Alleen het id moet
      // er dan apart bij.
      const member = await lookupMember();
      return {
        status: 'ok',
        providerId: member?.member_id ?? null,
        note: member
          ? lapostaNote(member.state, true)
          : 'Stond al in Laposta; het id was daar niet op te halen.',
      };
    }

    return {
      status: 'ok',
      providerId: data.member?.member_id ?? null,
      note: lapostaNote(data.member?.state, false),
    };
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

/** Welke partij er is ingesteld, voor op het scherm. */
export function configuredProviderLabel(): string {
  switch (providerName()) {
    case 'mailerlite':
      return 'MailerLite';
    case 'laposta':
      return 'Laposta';
    default:
      return 'geen mailinglijst';
  }
}
