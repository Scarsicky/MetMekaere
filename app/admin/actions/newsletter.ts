'use server';

import { adminError, adminOk, type AdminActionState } from '@/lib/admin/action-state';
import { requireAdmin } from '@/lib/admin/auth';
import { resyncUnsynced } from '@/lib/newsletter';
import { configuredProviderLabel, isProviderConfigured } from '@/lib/newsletter/providers';

/**
 * Alsnog doorzetten wat nog niet in de mailinglijst staat.
 *
 * Tot nu toe kon dat alleen door de inschrijving te herhalen, en dat kan
 * alleen de persoon zelf — die van niets weet. Daarmee was een mislukte
 * koppeling in de praktijk onherstelbaar.
 */
export async function resyncNewsletterAction(
  _prev: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  if (!isProviderConfigured()) {
    return adminError(
      'Er is geen mailinglijst gekoppeld. De adressen staan hier, en zijn er later in één keer naartoe te sturen.',
    );
  }

  const label = configuredProviderLabel();

  try {
    const report = await resyncUnsynced();

    if (report.attempted === 0) {
      return adminOk(`Er stond niets klaar: alle adressen staan al in ${label}.`);
    }
    if (report.failed === 0) {
      return adminOk(
        `${report.synced} ${report.synced === 1 ? 'adres' : 'adressen'} alsnog doorgezet naar ${label}.`,
      );
    }

    const done = report.synced > 0 ? `${report.synced} doorgezet, ` : '';
    return adminError(
      `${done}${report.failed} ${report.failed === 1 ? 'adres' : 'adressen'} lukte nog niet. ${report.firstError ?? ''}`.trim(),
    );
  } catch (error) {
    console.error('[newsletter] opnieuw doorzetten mislukte:', error);
    return adminError('Het opnieuw doorzetten liep vast. Kijk in de logboeken wat er misging.');
  }
}
