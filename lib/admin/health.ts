import 'server-only';

import { isMailConfigured } from '@/lib/mail';
import { isProviderConfigured } from '@/lib/newsletter/providers';
import { isMollieConfigured, isMollieTestMode } from '@/lib/shop/mollie';
import { siteUrl } from '@/lib/seo';

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

/**
 * Draait de site op het echte adres, of nog op een test- of voorbeeldadres?
 *
 * Dit onderscheid bepaalt hoe streng we zijn. Een testsleutel op een
 * oefenadres is precies de bedoeling; diezelfde testsleutel op metmekaere.nl
 * betekent dat bezoekers kunnen bestellen zonder te betalen.
 */
function onPublicDomain(): boolean {
  return !/localhost|127\.0\.0\.1|\.hosted\.app|\.run\.app|\.web\.app|\.firebaseapp\.com/.test(
    siteUrl(),
  );
}

export function runHealthChecks(): HealthCheck[] {
  const checks: HealthCheck[] = [];
  const live = onPublicDomain();

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
    checks.push({
      id: 'mollie',
      label: 'Betalen met iDEAL',
      status: 'ok',
      detail: 'Mollie is aangesloten en staat live.',
    });
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
          detail: 'Inschrijvingen gaan automatisch naar je mailinglijst.',
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
