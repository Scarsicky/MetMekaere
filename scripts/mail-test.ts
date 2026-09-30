/**
 * Controleert of het versturen van e-mail werkt.
 *
 *   npm run mail:test                      — alleen verbinding en wachtwoord
 *   npm run mail:test -- jij@voorbeeld.nl  — en stuurt een echte testmail
 *
 * Handig vóór de eerste bestelling: een klant die geen bevestiging krijgt,
 * merk je anders pas als het te laat is.
 *
 * Het wachtwoord komt uit de omgeving (.env.local of Secret Manager) en wordt
 * nergens getoond.
 */

import { DEFAULT_GENERAL } from '@/lib/data/normalize';
import { sendTestMail, verifySmtp } from '@/lib/mail';

const to = process.argv.slice(2).find((arg) => arg.includes('@'));

async function main() {
  const host = process.env.SMTP_HOST ?? '(niet ingesteld)';
  const port = process.env.SMTP_PORT ?? '587';
  const user = process.env.SMTP_USER ?? '(niet ingesteld)';

  console.log(`Mailserver : ${host}:${port}`);
  console.log(`Gebruiker  : ${user}`);
  console.log(`Wachtwoord : ${process.env.SMTP_PASSWORD ? 'ingesteld' : 'ONTBREEKT'}\n`);

  console.log('Verbinding maken…');
  const check = await verifySmtp();

  if (!check.ok) {
    console.error('\nMislukt:', check.error);
    console.error(
      '\nVeelvoorkomende oorzaken:\n' +
        '  · wachtwoord klopt niet — dat is bij Hostnet het wachtwoord van de mailbox zelf\n' +
        '  · gebruikersnaam moet het volledige e-mailadres zijn\n' +
        '  · poort 587 wordt geblokkeerd door je netwerk',
    );
    process.exit(1);
  }

  console.log('Verbinding en wachtwoord zijn in orde.\n');

  if (!to) {
    console.log('Wil je ook een echte testmail? Geef een adres mee:');
    console.log('  npm run mail:test -- jij@voorbeeld.nl');
    return;
  }

  console.log(`Testmail sturen naar ${to}…`);
  const result = await sendTestMail(to, DEFAULT_GENERAL);

  if (result.sent) {
    console.log('Verstuurd. Kijk in je inbox (en even in de map ongewenste mail).');
  } else {
    console.error('Versturen mislukte:', result.reason);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nOnverwachte fout:', error);
    process.exit(1);
  });
