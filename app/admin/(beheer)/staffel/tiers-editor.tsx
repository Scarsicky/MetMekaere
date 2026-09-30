'use client';

import { useState } from 'react';

import { saveTierRulesAction } from '@/app/admin/actions/shop-config';
import { ListEditor, MiniCheckbox, MiniField, MiniInput } from '@/components/admin/list-editor';
import { SaveForm } from '@/components/admin/save-form';
import { Button } from '@/components/ui/button';
import { centsToInput } from '@/lib/money';
import { slugify } from '@/lib/utils';
import type { TierRule } from '@/types';

interface StepDraft {
  minQty: number;
  unitPrice: string;
}

interface Draft {
  key: string;
  group: string;
  name: string;
  description: string;
  active: boolean;
  steps: StepDraft[];
}

/**
 * Het staffelvoordeel instellen.
 *
 * De kern in één zin, die ook boven het scherm staat: producten met dezelfde
 * groep tellen hun aantallen bij elkaar op. Drie van de ene kaart en vier van
 * de andere zijn samen zeven kaarten, en krijgen dus allebei de prijs vanaf
 * vijf stuks.
 */
export function TiersEditor({
  rules,
  productCounts,
}: {
  rules: TierRule[];
  productCounts: Record<string, number>;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    rules.map((rule) => ({
      key: rule.group,
      group: rule.group,
      name: rule.name,
      description: rule.description ?? '',
      active: rule.active,
      steps: rule.steps.map((step) => ({
        minQty: step.minQty,
        unitPrice: centsToInput(step.unitPriceCents ?? 0),
      })),
    })),
  );

  return (
    <SaveForm action={saveTierRulesAction} saveLabel="Staffelvoordeel opslaan">
      <input
        type="hidden"
        name="tiers"
        value={JSON.stringify(
          drafts.map(({ key: _key, ...rest }) => ({
            ...rest,
            group: rest.group || slugify(rest.name),
          })),
        )}
      />

      <ListEditor
        items={drafts}
        setItems={setDrafts}
        itemKey={(item) => item.key}
        reorderable={false}
        addLabel="Staffel toevoegen"
        emptyText="Nog geen staffelvoordeel. Voeg er een toe om ‘hoe meer, hoe voordeliger’ aan te zetten."
        makeNew={() => ({
          key: `nieuw-${Math.random().toString(36).slice(2, 7)}`,
          group: '',
          name: '',
          description: '',
          active: true,
          steps: [{ minQty: 5, unitPrice: '' }],
        })}
        renderItem={(item, _index, update) => {
          const group = item.group || slugify(item.name);

          return (
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniField label="Naam" hint="Wat de klant in de webshop ziet staan.">
                  <MiniInput
                    value={item.name}
                    onChange={(name) => update({ name })}
                    placeholder="Kaartenvoordeel"
                  />
                </MiniField>

                <MiniField
                  label="Groepsnaam"
                  hint="Kies deze groep bij de producten die samen mogen tellen."
                >
                  <MiniInput value={group} onChange={(value) => update({ group: value })} />
                </MiniField>
              </div>

              <MiniField label="Toelichting" hint="Eén zin, zichtbaar bij het product.">
                <MiniInput
                  value={item.description}
                  onChange={(description) => update({ description })}
                  placeholder="Geldt over alle kaarten samen — ook als je verschillende ontwerpen kiest."
                />
              </MiniField>

              <div>
                <p className="mb-2 font-display text-sm font-semibold text-sand-800">Stappen</p>
                <ul className="flex flex-col gap-2">
                  {item.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex flex-wrap items-end gap-2">
                      <MiniField label="Vanaf" className="w-24">
                        <MiniInput
                          value={String(step.minQty)}
                          inputMode="numeric"
                          onChange={(value) =>
                            update({
                              steps: item.steps.map((s, i) =>
                                i === stepIndex ? { ...s, minQty: Number(value) || 0 } : s,
                              ),
                            })
                          }
                        />
                      </MiniField>
                      <span className="pb-2.5 text-sm text-sand-600">stuks kost per stuk</span>
                      <MiniField label="Stuksprijs" className="w-28">
                        <MiniInput
                          value={step.unitPrice}
                          inputMode="decimal"
                          placeholder="3,00"
                          onChange={(value) =>
                            update({
                              steps: item.steps.map((s, i) =>
                                i === stepIndex ? { ...s, unitPrice: value } : s,
                              ),
                            })
                          }
                        />
                      </MiniField>
                      <button
                        type="button"
                        onClick={() =>
                          update({ steps: item.steps.filter((_, i) => i !== stepIndex) })
                        }
                        className="pb-2.5 text-sm text-brand-700 underline underline-offset-2"
                      >
                        Weg
                      </button>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    update({
                      steps: [
                        ...item.steps,
                        {
                          minQty: (item.steps.at(-1)?.minQty ?? 4) + 5,
                          unitPrice: '',
                        },
                      ],
                    })
                  }
                >
                  Stap toevoegen
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <MiniCheckbox
                  checked={item.active}
                  onChange={(active) => update({ active })}
                  label="Actief"
                />
                <span className="text-sm text-sand-600">
                  {productCounts[group] ?? 0}{' '}
                  {(productCounts[group] ?? 0) === 1 ? 'product gebruikt' : 'producten gebruiken'} deze
                  groep
                </span>
              </div>
            </div>
          );
        }}
      />
    </SaveForm>
  );
}
