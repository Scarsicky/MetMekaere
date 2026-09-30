import { TiersEditor } from '@/app/admin/(beheer)/staffel/tiers-editor';
import { AdminCard, AdminPage } from '@/components/admin/ui';
import { getAllProductsForAdmin, getTierRules } from '@/lib/data/catalog';

export const metadata = { title: 'Staffelvoordeel' };

export default async function AdminTiersPage() {
  const [rules, products] = await Promise.all([getTierRules(), getAllProductsForAdmin()]);

  const productCounts: Record<string, number> = {};
  for (const product of products) {
    if (!product.tierGroup || product.status === 'archived') continue;
    productCounts[product.tierGroup] = (productCounts[product.tierGroup] ?? 0) + 1;
  }

  return (
    <AdminPage
      title="Staffelvoordeel"
      description="Hoe meer stuks, hoe voordeliger. Je stelt per groep in vanaf welk aantal welke stuksprijs geldt."
    >
      <AdminCard className="mb-6 border-sage-300 bg-sage-50">
        <p className="text-sand-800">
          <strong className="font-display">Het belangrijkste in één zin:</strong> producten die dezelfde
          groep hebben, tellen hun aantallen bij elkaar op. Drie van de ene kaart en vier van de andere
          zijn samen zeven kaarten — en krijgen dus allebei de prijs die vanaf vijf stuks geldt.
        </p>
        <p className="mt-2 text-sm text-sand-700">
          Bij elk product kies je onder ‘Prijs’ welke groep erbij hoort. Producten zonder groep doen
          niet mee aan de staffel.
        </p>
      </AdminCard>

      <TiersEditor rules={rules} productCounts={productCounts} />
    </AdminPage>
  );
}
