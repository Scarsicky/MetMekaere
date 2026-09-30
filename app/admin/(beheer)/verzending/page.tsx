import { RatesEditor } from '@/app/admin/(beheer)/verzending/rates-editor';
import { AdminPage } from '@/components/admin/ui';
import { getShippingRates } from '@/lib/data/catalog';

export const metadata = { title: 'Verzendkosten' };

export default async function AdminShippingPage() {
  const rates = await getShippingRates();

  return (
    <AdminPage
      title="Verzendkosten"
      description="De site kiest bij het afrekenen zelf welke methoden mogelijk zijn, op basis van het land, het gewicht en wat er in de winkelwagen zit."
    >
      <RatesEditor rates={rates} />
    </AdminPage>
  );
}
