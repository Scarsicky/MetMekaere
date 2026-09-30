import { AdminEmpty, AdminList, AdminListRow, AdminPage, StatusPill } from '@/components/admin/ui';
import { DEFAULT_PAGES } from '@/lib/cms/default-content';
import { listPagesForAdmin } from '@/lib/data/content';

export const metadata = { title: 'Pagina’s' };

/** Waar een pagina op de site staat. */
const PATHS: Record<string, string> = {
  home: '/',
  over: '/over',
  community: '/community',
  'fluffy-dialect': '/fluffy-dialect',
  'doen-en-beleven': '/doen-en-beleven',
  contact: '/contact',
  'verzenden-en-retour': '/verzenden-en-retour',
  'algemene-voorwaarden': '/algemene-voorwaarden',
  privacy: '/privacy',
};

export default async function AdminPagesPage() {
  const saved = await listPagesForAdmin();

  /*
   * Pagina's die nog niet in de database staan, tonen we toch: ze draaien dan
   * op de standaardinhoud uit de code. Zo zie je het geheel, en niet alleen
   * wat je toevallig al eens hebt aangepast.
   */
  const savedSlugs = new Set(saved.map((p) => p.slug));
  const pending = Object.values(DEFAULT_PAGES)
    .filter((page) => !savedSlugs.has(page.slug))
    .map((page) => ({ slug: page.slug, title: page.title, published: true, isDefault: true }));

  const all = [...saved.map((p) => ({ ...p, isDefault: false })), ...pending].sort((a, b) =>
    a.title.localeCompare(b.title, 'nl'),
  );

  return (
    <AdminPage
      title="Pagina’s"
      description="De teksten van de site. Een pagina bestaat uit blokken die je zelf op volgorde zet."
    >
      {all.length === 0 ? (
        <AdminEmpty title="Nog geen pagina’s" description="Draai eerst de seed om de standaardteksten te plaatsen." />
      ) : (
        <AdminList>
          {all.map((page) => (
            <AdminListRow key={page.slug} href={`/admin/paginas/${page.slug}`}>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-sand-900">{page.title}</p>
                <p className="truncate text-sm text-sand-600">{PATHS[page.slug] ?? `/${page.slug}`}</p>
              </div>

              {page.isDefault ? (
                <StatusPill tone="grey">Standaardtekst</StatusPill>
              ) : page.published ? (
                <StatusPill tone="green">Zichtbaar</StatusPill>
              ) : (
                <StatusPill tone="amber">Concept</StatusPill>
              )}
            </AdminListRow>
          ))}
        </AdminList>
      )}

      <p className="mt-6 text-sm text-sand-600">
        ‘Standaardtekst’ betekent dat de pagina nog draait op de tekst die bij de site is meegeleverd.
        Zodra je hem opslaat, staat jouw versie erin.
      </p>
    </AdminPage>
  );
}
