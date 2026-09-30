'use client';

import { useState } from 'react';

import { saveDialectAction } from '@/app/admin/actions/content';
import { ListEditor, MiniCheckbox, MiniField, MiniInput } from '@/components/admin/list-editor';
import { SaveForm } from '@/components/admin/save-form';
import { slugify } from '@/lib/utils';
import type { DialectEntry } from '@/types';

interface Draft {
  key: string;
  id: string;
  word: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  kind: string;
  productSlug: string;
  featured: boolean;
  published: boolean;
}

export function DialectEditor({ entries }: { entries: DialectEntry[] }) {
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    entries.map((entry) => ({
      key: entry.id,
      id: entry.id,
      word: entry.word,
      meaning: entry.meaning,
      example: entry.example ?? '',
      exampleTranslation: entry.exampleTranslation ?? '',
      kind: entry.kind ?? '',
      productSlug: entry.productSlug ?? '',
      featured: entry.featured,
      published: entry.status === 'published',
    })),
  );

  return (
    <SaveForm action={saveDialectAction} saveLabel="Woorden opslaan" dirtyHint={`${drafts.length} woorden`}>
      <input
        type="hidden"
        name="entries"
        value={JSON.stringify(
          drafts.map(({ key: _key, ...rest }) => ({ ...rest, id: rest.id || slugify(rest.word) })),
        )}
      />

      <ListEditor
        items={drafts}
        setItems={setDrafts}
        itemKey={(item) => item.key}
        reorderable={false}
        addLabel="Woord toevoegen"
        emptyText="Nog geen woorden. Voeg er een toe — het woordenboek groeit vanzelf."
        makeNew={() => ({
          key: `nieuw-${Math.random().toString(36).slice(2, 7)}`,
          id: '',
          word: '',
          meaning: '',
          example: '',
          exampleTranslation: '',
          kind: '',
          productSlug: '',
          featured: false,
          published: true,
        })}
        renderItem={(item, _index, update) => (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem]">
              <MiniField label="Woord">
                <MiniInput
                  value={item.word}
                  onChange={(word) => update({ word })}
                  placeholder="mekaere"
                />
              </MiniField>

              <MiniField label="Betekenis">
                <MiniInput
                  value={item.meaning}
                  onChange={(meaning) => update({ meaning })}
                  placeholder="elkaar"
                />
              </MiniField>

              <MiniField label="Woordsoort" hint="Mag leeg.">
                <MiniInput
                  value={item.kind}
                  onChange={(kind) => update({ kind })}
                  placeholder="uitdrukking"
                />
              </MiniField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MiniField label="Voorbeeldzin" hint="Zoals jij het zou zeggen.">
                <MiniInput
                  value={item.example}
                  onChange={(example) => update({ example })}
                  placeholder="Veur wat meer aandacht veur mekaere."
                />
              </MiniField>

              <MiniField label="In het Nederlands">
                <MiniInput
                  value={item.exampleTranslation}
                  onChange={(exampleTranslation) => update({ exampleTranslation })}
                  placeholder="Voor wat meer aandacht voor elkaar."
                />
              </MiniField>
            </div>

            <MiniField
              label="Gekoppelde kaart"
              hint="De webadres-naam van het product met dit woord. Mag leeg."
            >
              <MiniInput
                value={item.productSlug}
                onChange={(productSlug) => update({ productSlug })}
                placeholder="kaart-veur-mekaere"
              />
            </MiniField>

            <div className="flex flex-wrap gap-5">
              <MiniCheckbox
                checked={item.published}
                onChange={(published) => update({ published })}
                label="Zichtbaar"
              />
              <MiniCheckbox
                checked={item.featured}
                onChange={(featured) => update({ featured })}
                label="Uitgelicht (staat vooraan)"
              />
            </div>
          </div>
        )}
      />
    </SaveForm>
  );
}
