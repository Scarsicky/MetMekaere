'use client';

import { useState } from 'react';

import { saveCategoriesAction } from '@/app/admin/actions/shop-config';
import {
  ListEditor,
  MiniCheckbox,
  MiniField,
  MiniInput,
} from '@/components/admin/list-editor';
import { SaveForm } from '@/components/admin/save-form';
import { slugify } from '@/lib/utils';
import type { Category } from '@/types';

interface Draft {
  key: string;
  slug: string;
  name: string;
  description: string;
  active: boolean;
  seoTitle: string;
  seoDescription: string;
}

export function CategoriesEditor({
  categories,
  counts,
}: {
  categories: Category[];
  counts: Record<string, number>;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    categories.map((category) => ({
      key: category.slug,
      slug: category.slug,
      name: category.name,
      description: category.description ?? '',
      active: category.active,
      seoTitle: category.seo?.title ?? '',
      seoDescription: category.seo?.description ?? '',
    })),
  );

  return (
    <SaveForm action={saveCategoriesAction} saveLabel="Categorieën opslaan">
      <input
        type="hidden"
        name="categories"
        value={JSON.stringify(
          drafts.map(({ key: _key, ...rest }) => ({ ...rest, slug: rest.slug || slugify(rest.name) })),
        )}
      />

      <ListEditor
        items={drafts}
        setItems={setDrafts}
        itemKey={(item) => item.key}
        addLabel="Categorie toevoegen"
        emptyText="Nog geen categorieën. Voeg er minstens één toe, bijvoorbeeld ‘Kaarten’."
        makeNew={() => ({
          key: `nieuw-${Math.random().toString(36).slice(2, 7)}`,
          slug: '',
          name: '',
          description: '',
          active: true,
          seoTitle: '',
          seoDescription: '',
        })}
        renderItem={(item, _index, update) => (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniField label="Naam">
                <MiniInput
                  value={item.name}
                  onChange={(name) =>
                    update({ name, slug: item.slug || '' })
                  }
                  placeholder="Kaarten"
                />
              </MiniField>

              <MiniField
                label="Webadres"
                hint={`De pagina komt op /webshop/${item.slug || slugify(item.name) || '…'}`}
              >
                <MiniInput
                  value={item.slug || slugify(item.name)}
                  onChange={(slug) => update({ slug })}
                />
              </MiniField>
            </div>

            <MiniField label="Omschrijving" hint="Staat bovenaan de categoriepagina.">
              <MiniInput
                value={item.description}
                onChange={(description) => update({ description })}
                placeholder="Om zomaar te sturen, of juist omdat er iets te zeggen valt."
              />
            </MiniField>

            <details className="text-sm">
              <summary className="cursor-pointer text-sand-600 marker:hidden">
                Vindbaarheid in Google ▾
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <MiniField label="Titel in Google">
                  <MiniInput value={item.seoTitle} onChange={(seoTitle) => update({ seoTitle })} />
                </MiniField>
                <MiniField label="Omschrijving in Google">
                  <MiniInput
                    value={item.seoDescription}
                    onChange={(seoDescription) => update({ seoDescription })}
                  />
                </MiniField>
              </div>
            </details>

            <div className="flex flex-wrap items-center gap-4">
              <MiniCheckbox
                checked={item.active}
                onChange={(active) => update({ active })}
                label="Zichtbaar in de webshop"
              />
              {counts[item.slug] !== undefined ? (
                <span className="text-sm text-sand-600">
                  {counts[item.slug]} {counts[item.slug] === 1 ? 'product' : 'producten'}
                </span>
              ) : null}
            </div>
          </div>
        )}
      />
    </SaveForm>
  );
}
