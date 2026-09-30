import Link from 'next/link';

import { AdventEditor } from '@/app/admin/(beheer)/adventskalender/advent-editor';
import { AdminPage } from '@/components/admin/ui';
import { getAdventActivities } from '@/lib/data/activities';
import { getAdventSettings, isAdventInSeason } from '@/lib/data/settings';

export const metadata = { title: 'Adventskalender' };

export default async function AdminAdventPage() {
  const [activities, settings] = await Promise.all([getAdventActivities(), getAdventSettings()]);
  const inSeason = isAdventInSeason(settings);

  return (
    <AdminPage
      title="Adventskalender"
      description={
        inSeason
          ? 'De kalender staat nu op de website.'
          : `De kalender is op dit moment niet zichtbaar op de site. Hij verschijnt vanzelf tussen ${settings.visibleFrom} en ${settings.visibleUntil}.`
      }
      actions={
        <Link
          href="/admin/instellingen"
          className="inline-flex min-h-11 items-center rounded-full border border-sand-300 bg-white px-5 font-display text-[0.95rem] font-semibold text-sand-800 transition-colors hover:border-sand-400"
        >
          Seizoen instellen
        </Link>
      }
    >
      <AdventEditor activities={activities} />
    </AdminPage>
  );
}
