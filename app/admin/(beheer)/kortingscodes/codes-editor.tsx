'use client';

import { useState } from 'react';

import { saveDiscountCodesAction } from '@/app/admin/actions/shop-config';
import {
  ListEditor,
  MiniCheckbox,
  MiniField,
  MiniInput,
  MiniSelect,
} from '@/components/admin/list-editor';
import { SaveForm } from '@/components/admin/save-form';
import { StatusPill } from '@/components/admin/ui';
import { centsToInput } from '@/lib/money';
import type { Category, DiscountCode } from '@/types';

interface Draft {
  key: string;
  code: string;
  description: string;
  type: 'percent' | 'fixed' | 'free_shipping';
  value: string;
  minOrder: string;
  maxUses: string;
  validUntil: string;
  categorySlugs: string;
  active: boolean;
  usedCount: number;
}

function toDateInput(millis: number | null | undefined): string {
  if (!millis) return '';
  return new Date(millis).toISOString().slice(0, 10);
}

export function CodesEditor({
  codes,
  categories,
}: {
  codes: DiscountCode[];
  categories: Category[];
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    codes.map((code) => ({
      key: code.code,
      code: code.code,
      description: code.description ?? '',
      type: code.type,
      value: code.type === 'fixed' ? centsToInput(code.value) : String(code.value),
      minOrder: code.minOrderCents ? centsToInput(code.minOrderCents) : '',
      maxUses: code.maxUses === null ? '' : String(code.maxUses),
      validUntil: toDateInput(code.validUntil),
      categorySlugs: code.appliesToCategorySlugs.join(', '),
      active: code.active,
      usedCount: code.usedCount,
    })),
  );

  return (
    <SaveForm action={saveDiscountCodesAction} saveLabel="Kortingscodes opslaan">
      <input
        type="hidden"
        name="codes"
        value={JSON.stringify(drafts.map(({ key: _key, ...rest }) => rest))}
      />

      <ListEditor
        items={drafts}
        setItems={setDrafts}
        itemKey={(item) => item.key}
        reorderable={false}
        addLabel="Kortingscode toevoegen"
        emptyText="Nog geen kortingscodes."
        makeNew={() => ({
          key: `nieuw-${Math.random().toString(36).slice(2, 7)}`,
          code: '',
          description: '',
          type: 'percent' as const,
          value: '10',
          minOrder: '',
          maxUses: '',
          validUntil: '',
          categorySlugs: '',
          active: true,
          usedCount: 0,
        })}
        renderItem={(item, _index, update) => (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniField label="Code" hint="Hoofdletters, zonder spaties.">
                <MiniInput
                  value={item.code}
                  onChange={(code) => update({ code: code.toUpperCase().replace(/\s+/g, '') })}
                  placeholder="WELKOM10"
                  autoCapitalize="characters"
                />
              </MiniField>

              <MiniField label="Wat de klant ziet" hint="Staat in het overzicht bij de korting.">
                <MiniInput
                  value={item.description}
                  onChange={(description) => update({ description })}
                  placeholder="10% welkomstkorting"
                />
              </MiniField>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MiniField label="Soort korting">
                <MiniSelect
                  value={item.type}
                  onChange={(type) => update({ type: type as Draft['type'] })}
                >
                  <option value="percent">Percentage</option>
                  <option value="fixed">Vast bedrag</option>
                  <option value="free_shipping">Gratis verzending</option>
                </MiniSelect>
              </MiniField>

              {item.type !== 'free_shipping' ? (
                <MiniField
                  label={item.type === 'percent' ? 'Percentage' : 'Bedrag'}
                  hint={item.type === 'percent' ? 'Bijv. 10' : 'Bijv. 5,00'}
                >
                  <MiniInput
                    value={item.value}
                    inputMode="decimal"
                    onChange={(value) => update({ value })}
                  />
                </MiniField>
              ) : (
                <div />
              )}

              <MiniField label="Vanaf bestelbedrag" hint="Leeg = altijd geldig.">
                <MiniInput
                  value={item.minOrder}
                  inputMode="decimal"
                  placeholder="0,00"
                  onChange={(minOrder) => update({ minOrder })}
                />
              </MiniField>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MiniField label="Maximaal aantal keer" hint="Leeg = ongelimiteerd.">
                <MiniInput
                  value={item.maxUses}
                  inputMode="numeric"
                  onChange={(maxUses) => update({ maxUses })}
                />
              </MiniField>

              <MiniField label="Geldig tot en met" hint="Leeg = geen einddatum.">
                <MiniInput
                  value={item.validUntil}
                  type="date"
                  onChange={(validUntil) => update({ validUntil })}
                />
              </MiniField>

              <MiniField
                label="Alleen voor categorieën"
                hint={`Leeg = hele shop. Kies uit: ${categories.map((c) => c.slug).join(', ') || '—'}`}
              >
                <MiniInput
                  value={item.categorySlugs}
                  onChange={(categorySlugs) => update({ categorySlugs })}
                  placeholder="kaarten, dialect"
                />
              </MiniField>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <MiniCheckbox
                checked={item.active}
                onChange={(active) => update({ active })}
                label="Actief"
              />
              <StatusPill tone={item.usedCount > 0 ? 'blue' : 'grey'}>
                {item.usedCount === 0
                  ? 'Nog niet gebruikt'
                  : `${item.usedCount}× gebruikt`}
              </StatusPill>
            </div>
          </div>
        )}
      />
    </SaveForm>
  );
}
