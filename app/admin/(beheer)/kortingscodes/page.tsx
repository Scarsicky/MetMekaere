import { CodesEditor } from '@/app/admin/(beheer)/kortingscodes/codes-editor';
import { AdminPage } from '@/components/admin/ui';
import { getAllCategoriesForAdmin, getAllDiscountCodes } from '@/lib/data/catalog';

export const metadata = { title: 'Kortingscodes' };

export default async function AdminDiscountCodesPage() {
  const [codes, categories] = await Promise.all([getAllDiscountCodes(), getAllCategoriesForAdmin()]);

  return (
    <AdminPage
      title="Kortingscodes"
      description="Een code rekent over het bedrag ná het staffelvoordeel. Verzendkosten tellen niet mee in een percentage."
    >
      <CodesEditor codes={codes} categories={categories} />
    </AdminPage>
  );
}
