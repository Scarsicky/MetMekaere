import 'server-only';

import { isMailConfigured } from '@/lib/mail';
import { configuredProviderLabel, isProviderConfigured } from '@/lib/newsletter/providers';
import { checkMollieConnection, isMollieConfigured, isMollieTestMode } from '@/lib/shop/mollie';
import { isTemporaryDomain, siteUrl } from '@/lib/seo';

/**
 * De opstartlijst voor de admin.
 *
 * Laat in gewone taal zien wat er nog geregeld moet worden voordat de shop
 * echt open kan. Zo hoeft niemand te onthouden welke omgevingsvariabele waar
 * hoort — het scherm vertelt het.
 */

export interface HealthCheck {
  id: string;
  label: string;
  /** 'ok' = geregeld, 'todo' = nog doen, 'warn' = werkt, maar let op. */
  status: 'ok' | 'todo' | 'warn';
  detail: string;
  /** Wat je moet doen als het nog niet klopt. */
  action?: string;
}

export async function runHealthChecks(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  const live = !isTemporaryDomain();

  /* Betalen */
  if (!isMollieConfigured()) {
    checks.push({
      id: 'mollie',
      label: 'Betalen met iDEAL',
      status: 'todo',
      detail: 'Er is nog geen Mollie-sleutel ingesteld, dus er kan niet echt betaald worden.',
      action:
        'Maak een account op mollie.com, kopieer de API-sleutel en zet die als MOLLIE_API_KEY in de omgeving.',
    });
  } else if (isMollieTestMode()) {
    checks.push({
      id: 'mollie',
      label: 'Betalen met iDEAL',
      // Op het echte adres is dit geen aandachtspuntje maar een lek.
      status: live ? 'todo' : 'warn',
      detail: live
        ? 'De shop staat op het echte adres, maar Mollie draait nog in testmodus. Bezoekers kunnen nu bestellen zonder dat er geld wordt afgeschreven.'
        : 'Mollie staat in testmodus. Bestellingen worden niet echt afgerekend — precies goed om mee te oefenen.',
      action: live
        ? 'Vervang de sleutel nú: firebase apphosting:secrets:set mollie-api-key — en rol daarna opnieuw uit.'
        : 'Vervang de test-sleutel door de live-sleutel zodra je opengaat.',
    });
  } else {
    /*
     * Hier stond alleen 'Mollie is aangesloten en staat live', puur omdat er
     * een sleutel was. Dat bleek te weinig: een live-sleutel van een account
     * dat nog niet is goedgekeurd ziet er precies zo uit, en dan loopt de
     * klant bij het afrekenen vast terwijl dit scherm groen blijft.
     *
     * We vragen het nu aan Mollie zelf.
     */
    const connection = await checkMollieConnection();

    if (!connection.ok) {
      checks.push({
        id: 'mollie',
        label: 'Betalen met iDEAL',
        status: 'todo',
        detail: `Mollie weigert de verbinding: ${connection.message}`,
        action:
          'Controleer in je Mollie-dashboard of het account volledig is goedgekeurd en of de sleutel nog klopt.',
      });
    } else if (connection.methods.length === 0) {
      checks.push({
        id: 'mollie',
        label: 'Betalen met iDEAL',
        status: 'todo',
        detail:
          'De sleutel werkt, maar er staat geen enkele betaalmethode klaar. Afrekenen mislukt dan met een melding aan de klant.',
        action:
          'Zet in je Mollie-dashboard de gewenste methoden aan. In live-modus moet je account daarvoor eerst zijn goedgekeurd.',
      });
    } else {
      checks.push({
        id: 'mollie',
        label: 'Betalen met iDEAL',
        status: 'ok',
        detail: `Mollie staat live en klaar: ${connection.methods.join(', ')}.`,
      });
    }
  }

  /* E-mail */
  checks.push(
    isMailConfigured()
      ? {
          id: 'mail',
          label: 'Bevestigingsmails',
          status: 'ok',
          detail: 'Bestelbevestigingen worden verstuurd.',
        }
      : {
          id: 'mail',
          label: 'Bevestigingsmails',
          status: 'todo',
          detail: 'Er is geen mailserver ingesteld, dus klanten krijgen geen bevestiging.',
          action:
            'Zet SMTP_HOST, SMTP_USER, SMTP_PASSWORD en SMTP_FROM in de omgeving. Dat kan bij je eigen mailprovider of bij een verzenddienst.',
        },
  );

  /* Nieuwsbrief */
  checks.push(
    isProviderConfigured()
      ? {
          id: 'newsletter',
          label: 'Nieuwsbrieflijst',
          status: 'ok',
          // De naam erbij: anders is van buitenaf niet te zien welke instelling
          // de draaiende site werkelijk heeft, en lijkt een stille
          // inschrijving op een fout die er niet is.
          detail: `Inschrijvingen gaan automatisch naar ${configuredProviderLabel()}.`,
        }
      : {
          id: 'newsletter',
          label: 'Nieuwsbrieflijst',
          status: 'warn',
          detail:
            'Inschrijvingen worden bewaard, maar nog niet doorgezet naar een mailinglijst. Je raakt niets kwijt.',
          action:
            'Kies een partij (MailerLite of Laposta) en zet NEWSLETTER_PROVIDER plus de sleutel in de omgeving.',
        },
  );

  /* Adres van de site */
  const url = siteUrl();
  checks.push(
    live
      ? { id: 'url', label: 'Webadres', status: 'ok', detail: url }
      : {
          id: 'url',
          label: 'Webadres',
          status: 'warn',
          detail: url.includes('localhost')
            ? `De site denkt dat hij op ${url} draait.`
            : `De site staat op een tijdelijk adres (${url}), nog niet op het eigen domein.`,
          action:
            'Zet NEXT_PUBLIC_SITE_URL in apphosting.yaml op het echte adres zodra het domein staat — anders wijzen de sitemap en de deellinks naar het verkeerde adres.',
        },
  );

  return checks;
}

export function countTodo(checks: HealthCheck[]): number {
  return checks.filter((c) => c.status === 'todo').length;
}
