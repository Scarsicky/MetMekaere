import { MailTestForm, SeedButton } from '@/app/admin/(beheer)/opstarten/setup-actions';
import { AdminCard, AdminPage, StatusPill } from '@/components/admin/ui';
import { countTodo, runHealthChecks } from '@/lib/admin/health';
import { getGeneralSettings } from '@/lib/data/settings';
import { countExistingContent } from '@/lib/seed/apply';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Opstarten' };

/** De collecties die iets zeggen over 'is de site al ingericht'. */
const CONTENT_LABELS: Record<string, string> = {
  pages: 'Pagina’s',
  products: 'Producten',
  categories: 'Categorieën',
  shippingRates: 'Verzendtarieven',
  tierRules: 'Staffelvoordeel',
  discountCodes: 'Kortingscodes',
  happenings: 'Activiteiten',
  dialect: 'Dialectwoorden',
  activities: 'Kalenderdagen',
};

export default async function AdminSetupPage() {
  const [counts, general] = await Promise.all([countExistingContent(), getGeneralSettings()]);
  const checks = runHealthChecks();
  const todo = countTodo(checks);

  const contentTotal = Object.keys(CONTENT_LABELS).reduce(
    (sum, key) => sum + (counts[key] ?? 0),
    0,
  );
  const hasContent = contentTotal > 0;

  return (
    <AdminPage
      title="Opstarten"
      description="Wat er nog geregeld moet worden voordat de shop open kan. Dit scherm mag je vergeten zodra alles klopt."
    >
      <div className="flex flex-col gap-6">
        {/* ---------------- Startinhoud ---------------- */}
        <AdminCard
          title="1. Startinhoud"
          description={
            hasContent
              ? 'Er staat al inhoud in de database. Je kunt aanvullen wat ontbreekt.'
              : 'De database is nog leeg. Plaats de meegeleverde teksten, producten en instellingen om te beginnen.'
          }
        >
          <ul className="mb-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
            {Object.entries(CONTENT_LABELS).map(([key, label]) => (
              <li key={key} className="flex items-baseline justify-between gap-2">
                <span className="text-sand-700">{label}</span>
                <span
                  className={cn(
                    'font-display font-semibold tabular',
                    (counts[key] ?? 0) > 0 ? 'text-sage-700' : 'text-sand-400',
                  )}
                >
                  {counts[key] ?? 0}
                </span>
              </li>
            ))}
          </ul>

          <SeedButton hasContent={hasContent} />
        </AdminCard>

        {/* ---------------- Koppelingen ---------------- */}
        <AdminCard
          title="2. Koppelingen"
          description="Betalen, mailen en de nieuwsbrief. Deze instellingen komen uit de omgeving, niet uit dit scherm."
        >
          <ul className="flex flex-col gap-3">
            {checks.map((check) => (
              <li
                key={check.id}
                className={cn(
                  'rounded-xl border px-4 py-3.5',
                  check.status === 'ok'
                    ? 'border-sand-300 bg-white'
                    : check.status === 'todo'
                      ? 'border-brand-200 bg-brand-50'
                      : 'border-ochre-300 bg-ochre-100',
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill
                    tone={check.status === 'ok' ? 'green' : check.status === 'todo' ? 'red' : 'amber'}
                  >
                    {check.status === 'ok' ? 'In orde' : check.status === 'todo' ? 'Nog doen' : 'Let op'}
                  </StatusPill>
                  <span className="font-display font-semibold">{check.label}</span>
                </div>
                <p className="mt-1.5 text-sm text-sand-800">{check.detail}</p>
                {check.action ? <p className="mt-1 text-sm text-sand-600">{check.action}</p> : null}
              </li>
            ))}
          </ul>
        </AdminCard>

        {/* ---------------- Mail uitproberen ---------------- */}
        <AdminCard
          title="3. Mail uitproberen"
          description="Een klant die geen bevestiging krijgt, merk je anders pas als het te laat is."
        >
          <MailTestForm defaultTo={general.email} />
        </AdminCard>

        {/* ---------------- Nalopen ---------------- */}
        <AdminCard title="4. Zelf nalopen voordat je opengaat">
          <ul className="flex flex-col gap-2.5 text-sand-800">
            {[
              'Algemene voorwaarden en privacyverklaring: het zijn werkbare opzetten, geen juridisch advies. Vul je bedrijfsgegevens aan.',
              'Bedrijfsgegevens invullen bij Instellingen — KvK, btw-nummer en adres komen op de site en op de factuur.',
              'De voorbeeldproducten en -activiteiten aanpassen of weggooien.',
              'Productfoto’s uploaden. Zonder foto staat er een plaatshouder.',
              'Het dialect-woordenboek vullen met je eigen woorden.',
              'Een bestelling plaatsen met de Mollie-testsleutel en controleren of de bevestiging aankomt.',
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden className="mt-1 text-sand-400">
                  ○
                </span>
                {item}
              </li>
            ))}
          </ul>
        </AdminCard>

        {todo === 0 ? (
          <p className="rounded-xl bg-sage-100 px-4 py-3.5 font-display font-semibold text-sage-900">
            Alle koppelingen staan. Wat overblijft is jouw eigen inhoud.
          </p>
        ) : null}
      </div>
    </AdminPage>
  );
}
