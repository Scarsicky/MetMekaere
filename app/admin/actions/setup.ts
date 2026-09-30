'use server';

import { adminError, adminOk, type AdminActionState } from '@/lib/admin/action-state';
import { requireAdmin } from '@/lib/admin/auth';
import { revalidateEverything } from '@/lib/admin/revalidate';
import { getGeneralSettings } from '@/lib/data/settings';
import { sendTestMail, verifySmtp } from '@/lib/mail';
import { applyStarterContent } from '@/lib/seed/apply';

/** Eenmalige handelingen om de site op te starten. */

export async function seedStarterContentAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  // Overschrijven is expliciet: standaard blijft bestaande inhoud staan.
  const force = formData.get('force') === 'ja';

  try {
    const report = await applyStarterContent({ force });
    revalidateEverything();

    if (report.written === 0 && report.adventCreated === 0) {
      return adminOk('Alles stond er al. Er is niets gewijzigd.');
    }

    const parts = [`${report.written} documenten geplaatst`];
    if (report.skipped > 0) parts.push(`${report.skipped} overgeslagen omdat ze al bestonden`);
    if (report.adventCreated > 0) parts.push(`${report.adventCreated} kalenderdagen aangemaakt`);

    return adminOk(`Klaar: ${parts.join(', ')}.`);
  } catch (error) {
    console.error('[setup] startinhoud plaatsen mislukte:', error);
    return adminError(
      'Het plaatsen lukte niet. Waarschijnlijk heeft de server geen schrijfrechten op Firestore — controleer de rollen van de service account.',
    );
  }
}

export async function testMailAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const check = await verifySmtp();
  if (!check.ok) {
    return adminError(`De mailserver reageert niet zoals verwacht. ${check.error ?? ''}`);
  }

  const to = String(formData.get('to') ?? '').trim();
  if (!to) {
    return adminOk('Verbinding met de mailserver is in orde.');
  }

  const general = await getGeneralSettings();
  const result = await sendTestMail(to, general);

  return result.sent
    ? adminOk(`Testmail verstuurd naar ${to}. Kijk ook even in de map ongewenste mail.`)
    : adminError(`Versturen mislukte: ${result.reason ?? 'onbekende reden'}`);
}
