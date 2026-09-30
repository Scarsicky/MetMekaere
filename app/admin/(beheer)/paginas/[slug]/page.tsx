import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BlockEditor } from '@/app/admin/(beheer)/paginas/[slug]/block-editor';
import { savePageAction } from '@/app/admin/actions/content';
import { SaveForm } from '@/components/admin/save-form';
import { AdminCard, AdminPage } from '@/components/admin/ui';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/field';
import { defaultPage } from '@/lib/cms/default-content';
import { getPageForAdmin } from '@/lib/data/content';

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = (await getPageForAdmin(slug)) ?? defaultPage(slug);
  return { title: page?.title ?? 'Pagina' };
}

export default async function AdminPageEditor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const saved = await getPageForAdmin(slug);
  const page = saved ?? defaultPage(slug);
  if (!page) notFound();

  const path = PATHS[slug] ?? `/${slug}`;

  return (
    <AdminPage
      title={page.title}
      breadcrumb={{ label: 'Alle pagina’s', href: '/admin/paginas' }}
      actions={
        <Link
          href={path}
          target="_blank"
          className="inline-flex min-h-11 items-center rounded-full border border-sand-300 bg-white px-5 font-display text-[0.95rem] font-semibold text-sand-800 transition-colors hover:border-sand-400"
        >
          Bekijk de pagina ↗
        </Link>
      }
    >
      {!saved ? (
        <AdminCard className="mb-6 border-ochre-300 bg-ochre-100">
          <p className="text-sand-800">
            Deze pagina draait nog op de tekst die bij de site is meegeleverd. Zodra je opslaat, staat
            jouw versie erin en wordt de meegeleverde tekst niet meer gebruikt.
          </p>
        </AdminCard>
      ) : null}

      <SaveForm action={savePageAction} saveLabel="Pagina opslaan">
        <input type="hidden" name="slug" value={page.slug} />

        <AdminCard title="Over deze pagina">
          <div className="flex flex-col gap-4">
            <Field label="Titel" htmlFor="title" required hint="Voor in het overzicht en het tabblad.">
              <Input id="title" name="title" defaultValue={page.title} required />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Titel in Google" htmlFor="seoTitle" optional>
                <Input id="seoTitle" name="seoTitle" defaultValue={page.seo?.title ?? ''} />
              </Field>
              <Field
                label="Omschrijving in Google"
                htmlFor="seoDescription"
                optional
                hint="Het zinnetje onder de link. Ongeveer 155 tekens."
              >
                <Textarea
                  id="seoDescription"
                  name="seoDescription"
                  rows={2}
                  defaultValue={page.seo?.description ?? ''}
                />
              </Field>
            </div>

            <Checkbox
              name="published"
              label="Zichtbaar op de website"
              defaultChecked={page.published}
            />
          </div>
        </AdminCard>

        <div>
          <h2 className="mb-1 font-display text-lg font-semibold">Blokken</h2>
          <p className="mb-4 text-sm text-sand-600">
            Van boven naar beneden, zoals ze op de pagina komen te staan.
          </p>
          <BlockEditor name="blocks" initial={page.blocks} />
        </div>
      </SaveForm>
    </AdminPage>
  );
}
