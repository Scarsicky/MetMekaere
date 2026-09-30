import { CategoriesEditor } from '@/app/admin/(beheer)/categorieen/categories-editor';
import { AdminPage } from '@/components/admin/ui';
import { getAllCategoriesForAdmin, getAllProductsForAdmin } from '@/lib/data/catalog';

export const metadata = { title: 'Categorieën' };

export default async function AdminCategoriesPage() {
  const [categories, products] = await Promise.all([
    getAllCategoriesForAdmin(),
    getAllProductsForAdmin(),
  ]);

  const counts = Object.fromEntries(
    categories.map((category) => [
      category.slug,
      products.filter((p) => p.categorySlug === category.slug && p.status !== 'archived').length,
    ]),
  );

  return (
    <AdminPage
      title="Categorieën"
      description="De indeling van de webshop. De volgorde hier is ook de volgorde in het filter."
    >
      <CategoriesEditor categories={categories} counts={counts} />
    </AdminPage>
  );
}
