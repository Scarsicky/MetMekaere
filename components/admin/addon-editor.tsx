'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { centsToInput, parseMoneyToCents } from '@/lib/money';
import { slugify } from '@/lib/utils';
import type { ProductAddon } from '@/types';

/**
 * De keuzes die een klant bij een product kan maken: 'met envelop',
 * 'postzegel erbij', of een keuze uit een groep.
 *
 * Add-ons zonder groep zijn losse vinkjes. Geef je twee add-ons dezelfde
 * groepsnaam, dan sluiten ze elkaar uit en wordt het een keuze uit die groep.
 * Dat staat er ook zo bij, want het is de enige regel die je moet weten.
 */

interface Draft extends Omit<ProductAddon, 'priceCents'> {
  priceInput: string;
}

function toDraft(addon: ProductAddon): Draft {
  const { priceCents, ...rest } = addon;
  return { ...rest, priceInput: centsToInput(priceCents) };
}

function toAddon(draft: Draft): ProductAddon {
  const { priceInput, ...rest } = draft;
  return {
    ...rest,
    priceCents: parseMoneyToCents(priceInput) ?? 0,
    group: rest.group?.trim() || null,
  };
}

export function AddonEditor({ name, initial }: { name: string; initial: ProductAddon[] }) {
  const [drafts, setDrafts] = useState<Draft[]>(() => initial.map(toDraft));

  function update(index: number, patch: Partial<Draft>) {
    setDrafts((current) => current.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function add() {
    setDrafts((current) => [
      ...current,
      {
        id: `optie-${current.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
        label: '',
        description: '',
        priceInput: '0,00',
        maxQty: 1,
        required: false,
        group: null,
      },
    ]);
  }

  function remove(index: number) {
    setDrafts((current) => current.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name={name} value={JSON.stringify(drafts.map(toAddon))} />

      {drafts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sand-400 px-4 py-6 text-center text-sm text-sand-600">
          Nog geen keuzes. Denk aan ‘met envelop’ of ‘postzegel erbij’.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {drafts.map((draft, index) => (
            <li key={draft.id} className="rounded-xl border border-sand-300 bg-white p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <Text
                  label="Wat de klant ziet"
                  value={draft.label}
                  onChange={(value) =>
                    update(index, {
                      label: value,
                      // Het id volgt de naam, maar alleen zolang het nog niet is opgeslagen.
                      id: draft.label === '' ? slugify(value) || draft.id : draft.id,
                    })
                  }
                  placeholder="Met envelop"
                />
                <Text
                  label="Meerprijs"
                  value={draft.priceInput}
                  onChange={(value) => update(index, { priceInput: value })}
                  placeholder="0,35"
                  inputMode="decimal"
                />
              </div>

              <div className="mt-3">
                <Text
                  label="Toelichting"
                  value={draft.description ?? ''}
                  onChange={(value) => update(index, { description: value })}
                  placeholder="Een bijpassende envelop, zodat de kaart zo op de bus kan."
                />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem]">
                <Text
                  label="Keuzegroep"
                  value={draft.group ?? ''}
                  onChange={(value) => update(index, { group: value })}
                  placeholder="Leeg laten voor een los vinkje"
                  hint="Zelfde groepsnaam = de klant kiest er precies één."
                />
                <Text
                  label="Max. aantal"
                  value={String(draft.maxQty)}
                  onChange={(value) => update(index, { maxQty: Math.max(1, Number(value) || 1) })}
                  inputMode="numeric"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-sand-800">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.required)}
                    onChange={(e) => update(index, { required: e.target.checked })}
                    className="size-4.5 accent-brand-700"
                  />
                  Verplicht kiezen
                </label>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-sm text-brand-700 underline underline-offset-2"
                >
                  Deze keuze verwijderen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <Button type="button" variant="secondary" onClick={add}>
          Keuze toevoegen
        </Button>
      </div>
    </div>
  );
}

function Text({
  label,
  value,
  onChange,
  placeholder,
  hint,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  inputMode?: 'text' | 'decimal' | 'numeric';
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-display font-semibold text-sand-800">{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-sand-300 px-3 py-2 focus:border-brand-400 focus:outline-none"
      />
      {hint ? <span className="text-xs text-sand-600">{hint}</span> : null}
    </label>
  );
}
