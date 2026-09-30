import { notFound } from 'next/navigation';

import { HappeningForm } from '@/app/admin/(beheer)/doen-en-beleven/[id]/happening-form';
import { AdminPage } from '@/components/admin/ui';
import { getAllHappeningsForAdmin } from '@/lib/data/content';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === 'nieuw') return { title: 'Nieuwe activiteit' };
  const happening = (await getAllHappeningsForAdmin()).find((h) => h.id === id);
  return { title: happening?.title ?? 'Activiteit' };
}

export default async function AdminHappeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'nieuw';

  const happening = isNew ? null : ((await getAllHappeningsForAdmin()).find((h) => h.id === id) ?? null);
  if (!isNew && !happening) notFound();

  return (
    <AdminPage
      title={isNew ? 'Nieuwe activiteit' : (happening?.title ?? 'Activiteit')}
      breadcrumb={{ label: 'Alle activiteiten', href: '/admin/doen-en-beleven' }}
    >
      <HappeningForm happening={happening} />
    </AdminPage>
  );
}
