import { AdminEmpty, AdminList, AdminListRow, AdminPage, StatusPill } from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';
import { getAllHappeningsForAdmin } from '@/lib/data/content';
import { formatDateNL } from '@/lib/utils';

export const metadata = { title: 'Doen en Beleven' };

export default async function AdminHappeningsPage() {
  const happenings = await getAllHappeningsForAdmin();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AdminPage
      title="Doen en Beleven"
      description="Activiteiten die je aankondigt. Wat nog komt staat op de site vooraan."
      actions={<ButtonLink href="/admin/doen-en-beleven/nieuw">Nieuwe activiteit</ButtonLink>}
    >
      {happenings.length === 0 ? (
        <AdminEmpty
          title="Nog geen activiteiten"
          description="Kondig iets aan waar mensen bij kunnen aansluiten."
          action={<ButtonLink href="/admin/doen-en-beleven/nieuw">Nieuwe activiteit</ButtonLink>}
        />
      ) : (
        <AdminList>
          {happenings.map((happening) => {
            const past = Boolean(happening.date) && happening.date! < today;

            return (
              <AdminListRow key={happening.id} href={`/admin/doen-en-beleven/${happening.id}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-semibold text-sand-900">{happening.title}</p>
                  <p className="truncate text-sm text-sand-600">
                    {happening.theme}
                    {happening.location ? ` · ${happening.location}` : ''}
                  </p>
                </div>

                <span className="text-sm whitespace-nowrap text-sand-600">
                  {happening.date
                    ? formatDateNL(happening.date, { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Doorlopend'}
                </span>

                {past ? <StatusPill tone="grey">Geweest</StatusPill> : null}
                {happening.membersOnly ? <StatusPill tone="blue">Leden</StatusPill> : null}

                <StatusPill tone={happening.status === 'published' ? 'green' : 'amber'}>
                  {happening.status === 'published' ? 'Zichtbaar' : 'Concept'}
                </StatusPill>
              </AdminListRow>
            );
          })}
        </AdminList>
      )}
    </AdminPage>
  );
}
