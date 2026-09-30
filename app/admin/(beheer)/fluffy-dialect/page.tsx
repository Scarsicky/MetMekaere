import { DialectEditor } from '@/app/admin/(beheer)/fluffy-dialect/dialect-editor';
import { AdminPage } from '@/components/admin/ui';
import { getAllDialectEntriesForAdmin } from '@/lib/data/content';

export const metadata = { title: 'Fluffy Dialect' };

export default async function AdminDialectPage() {
  const entries = await getAllDialectEntriesForAdmin();

  return (
    <AdminPage
      title="Fluffy Dialect"
      description="Woorden van hier, met hun betekenis. Ze staan op de pagina Fluffy Dialect en kunnen aan een kaart worden gekoppeld."
    >
      <DialectEditor entries={entries} />
    </AdminPage>
  );
}
