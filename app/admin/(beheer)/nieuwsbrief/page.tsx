import { AdminCard, AdminEmpty, AdminPage, StatTile, StatusPill } from '@/components/admin/ui';
import { listSubscribers } from '@/lib/newsletter';
import { isProviderConfigured } from '@/lib/newsletter/providers';
import { formatDateNL } from '@/lib/utils';

export const metadata = { title: 'Nieuwsbrief' };

export default async function AdminNewsletterPage() {
  const subscribers = await listSubscribers();

  const subscribed = subscribers.filter((s) => s.status === 'subscribed');
  const pending = subscribers.filter((s) => s.status === 'pending');
  const failed = subscribers.filter((s) => s.syncError);

  return (
    <AdminPage
      title="Nieuwsbrief"
      description="Iedereen die zich heeft ingeschreven. De adressen staan altijd hier, ook als de koppeling met een mailinglijst nog niet aanstaat."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Ingeschreven" value={String(subscribed.length)} />
        <StatTile
          label="Nog niet doorgezet"
          value={String(pending.length)}
          hint={isProviderConfigured() ? undefined : 'Er is nog geen mailinglijst gekoppeld'}
          tone={pending.length ? 'attention' : 'plain'}
        />
        <StatTile label="Totaal" value={String(subscribers.length)} />
      </div>

      {failed.length > 0 ? (
        <AdminCard className="mb-6 border-brand-200 bg-brand-50">
          <p className="text-sand-800">
            Bij {failed.length} {failed.length === 1 ? 'adres' : 'adressen'} lukte het doorzetten naar
            de mailinglijst niet. De adressen zijn niet kwijt — controleer de instellingen van de
            koppeling en schrijf ze daarna opnieuw in.
          </p>
          <p className="mt-2 font-mono text-xs break-all text-sand-600">{failed[0].syncError}</p>
        </AdminCard>
      ) : null}

      {subscribers.length === 0 ? (
        <AdminEmpty
          title="Nog geen inschrijvingen"
          description="Onder aan elke pagina staat het formulier waarmee mensen zich kunnen aanmelden."
        />
      ) : (
        <AdminCard>
          <div className="-mx-5 overflow-x-auto md:-mx-6">
            <table className="w-full min-w-[38rem] text-sm">
              <thead>
                <tr className="border-b border-sand-300 text-left">
                  <th className="px-5 pb-2 font-display md:px-6">E-mailadres</th>
                  <th className="px-3 pb-2 font-display">Naam</th>
                  <th className="px-3 pb-2 font-display">Via</th>
                  <th className="px-3 pb-2 font-display">Sinds</th>
                  <th className="px-5 pb-2 font-display md:px-6">Status</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.email} className="border-b border-sand-200 last:border-0">
                    <td className="px-5 py-2.5 md:px-6">
                      <a
                        href={`mailto:${subscriber.email}`}
                        className="text-brand-700 underline underline-offset-2"
                      >
                        {subscriber.email}
                      </a>
                    </td>
                    <td className="px-3 py-2.5 text-sand-700">{subscriber.name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-sand-600">{subscriber.source}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sand-600">
                      {subscriber.createdAt
                        ? formatDateNL(subscriber.createdAt, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-5 py-2.5 md:px-6">
                      <StatusPill
                        tone={
                          subscriber.status === 'subscribed'
                            ? 'green'
                            : subscriber.status === 'unsubscribed'
                              ? 'grey'
                              : 'amber'
                        }
                      >
                        {subscriber.status === 'subscribed'
                          ? 'Ingeschreven'
                          : subscriber.status === 'unsubscribed'
                            ? 'Uitgeschreven'
                            : 'In afwachting'}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </AdminPage>
  );
}
