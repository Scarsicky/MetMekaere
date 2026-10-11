import { AdminCard, AdminEmpty, AdminPage, StatTile, StatusPill } from '@/components/admin/ui';
import { listSubscribers } from '@/lib/newsletter';
import { configuredProviderLabel, isProviderConfigured } from '@/lib/newsletter/providers';
import { formatDateNL } from '@/lib/utils';

export const metadata = { title: 'Nieuwsbrief' };

export default async function AdminNewsletterPage() {
  const subscribers = await listSubscribers();

  const providerConfigured = isProviderConfigured();
  const providerLabel = configuredProviderLabel();

  const subscribed = subscribers.filter((s) => s.status === 'subscribed');
  const failed = subscribers.filter((s) => s.syncError);

  /*
   * 'Nog niet doorgezet' gaat over de mailinglijst, niet over de status hier.
   *
   * Die twee zijn niet hetzelfde, en dat verschil heeft ons al een avond
   * gekost. Een adres krijgt de status 'pending' alleen wanneer de
   * mailinglijst een fóut teruggaf. Ging er nooit iets heen — omdat er destijds
   * geen koppeling aanstond — dan staat het adres gewoon op 'subscribed' en
   * leek er niets aan de hand, terwijl het nergens in een lijst stond.
   *
   * Wat telt is dus of er een id van de mailinglijst terugkwam.
   */
  const notForwarded = subscribers.filter((s) => s.status !== 'unsubscribed' && !s.providerId);

  return (
    <AdminPage
      title="Nieuwsbrief"
      description="Iedereen die zich heeft ingeschreven. De adressen staan altijd hier, ook als de koppeling met een mailinglijst nog niet aanstaat."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Ingeschreven" value={String(subscribed.length)} />
        <StatTile
          label={providerConfigured ? `Nog niet in ${providerLabel}` : 'Nog niet doorgezet'}
          value={String(notForwarded.length)}
          hint={providerConfigured ? undefined : 'Er is nog geen mailinglijst gekoppeld'}
          // Alleen opvallend als er een koppeling ís: zonder koppeling staat
          // alles hier, en dat is dan geen probleem maar een keuze.
          tone={providerConfigured && notForwarded.length ? 'attention' : 'plain'}
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

                      {/*
                        'Ingeschreven' zei tot nu toe niets over de mailinglijst:
                        een adres dat hier bleef staan zag er hetzelfde uit als
                        een adres dat echt was doorgezet. Vandaar deze regel —
                        zonder die had je het verschil nergens kunnen zien.
                      */}
                      {subscriber.status !== 'unsubscribed' ? (
                        <span className="mt-1 block text-xs text-sand-600">
                          {subscriber.providerId
                            ? `In ${providerLabel}`
                            : providerConfigured
                              ? `Nog niet in ${providerLabel}`
                              : 'Alleen hier bewaard'}
                        </span>
                      ) : null}
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
