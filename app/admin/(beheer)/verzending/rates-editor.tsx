'use client';

import { useState } from 'react';

import { saveShippingRatesAction } from '@/app/admin/actions/shop-config';
import { ListEditor, MiniCheckbox, MiniField, MiniInput } from '@/components/admin/list-editor';
import { SaveForm } from '@/components/admin/save-form';
import { centsToInput } from '@/lib/money';
import { slugify } from '@/lib/utils';
import type { ShippingClass, ShippingRate } from '@/types';

const CLASSES: { value: ShippingClass; label: string }[] = [
  { value: 'letterbox', label: 'Brievenbus' },
  { value: 'parcel', label: 'Pakket' },
  { value: 'pickup_only', label: 'Alleen ophalen' },
];

interface Draft {
  key: string;
  id: string;
  name: string;
  description: string;
  countries: string;
  shippingClasses: ShippingClass[];
  maxWeight: string;
  price: string;
  freeAbove: string;
  isPickup: boolean;
  active: boolean;
}

/**
 * De verzendmethoden.
 *
 * De site kiest bij het afrekenen zelf welke methoden kunnen: hij kijkt naar
 * het land, het totale gewicht, en of alle producten in de wagen met die
 * methode mee kunnen. Een kaart past door de brievenbus, een mok niet — zit er
 * één mok bij, dan verdwijnt de brievenbusoptie vanzelf.
 */
export function RatesEditor({ rates }: { rates: ShippingRate[] }) {
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    rates.map((rate) => ({
      key: rate.id,
      id: rate.id,
      name: rate.name,
      description: rate.description ?? '',
      countries: rate.countries.join(', '),
      shippingClasses: rate.shippingClasses,
      maxWeight: rate.maxWeightGrams === null ? '' : String(rate.maxWeightGrams),
      price: centsToInput(rate.priceCents),
      freeAbove: rate.freeAboveCents === null ? '' : centsToInput(rate.freeAboveCents),
      isPickup: rate.isPickup,
      active: rate.active,
    })),
  );

  return (
    <SaveForm action={saveShippingRatesAction} saveLabel="Verzendkosten opslaan">
      <input
        type="hidden"
        name="rates"
        value={JSON.stringify(
          drafts.map(({ key: _key, ...rest }) => ({ ...rest, id: rest.id || slugify(rest.name) })),
        )}
      />

      <ListEditor
        items={drafts}
        setItems={setDrafts}
        itemKey={(item) => item.key}
        addLabel="Verzendmethode toevoegen"
        emptyText="Nog geen verzendmethoden. Zonder minstens één kan niemand afrekenen."
        makeNew={() => ({
          key: `nieuw-${Math.random().toString(36).slice(2, 7)}`,
          id: '',
          name: '',
          description: '',
          countries: 'NL',
          shippingClasses: ['letterbox'] as ShippingClass[],
          maxWeight: '',
          price: '',
          freeAbove: '',
          isPickup: false,
          active: true,
        })}
        renderItem={(item, _index, update) => (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniField label="Naam" hint="Wat de klant bij het afrekenen ziet.">
                <MiniInput
                  value={item.name}
                  onChange={(name) => update({ name })}
                  placeholder="Brievenbuspost"
                />
              </MiniField>

              <MiniField label="Toelichting">
                <MiniInput
                  value={item.description}
                  onChange={(description) => update({ description })}
                  placeholder="Past door de brievenbus, je hoeft er niet voor thuis te zijn."
                />
              </MiniField>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MiniField label="Tarief" hint="Bijv. 2,10">
                <MiniInput
                  value={item.price}
                  inputMode="decimal"
                  onChange={(price) => update({ price })}
                />
              </MiniField>

              <MiniField label="Gratis vanaf" hint="Leeg = nooit gratis.">
                <MiniInput
                  value={item.freeAbove}
                  inputMode="decimal"
                  placeholder="35,00"
                  onChange={(freeAbove) => update({ freeAbove })}
                />
              </MiniField>

              <MiniField label="Max. gewicht in gram" hint="Leeg = geen limiet.">
                <MiniInput
                  value={item.maxWeight}
                  inputMode="numeric"
                  placeholder="350"
                  onChange={(maxWeight) => update({ maxWeight })}
                />
              </MiniField>
            </div>

            <MiniField label="Landen" hint="Landcodes, gescheiden door komma’s. Bijv. NL, BE">
              <MiniInput
                value={item.countries}
                onChange={(countries) => update({ countries })}
              />
            </MiniField>

            <div>
              <p className="mb-2 font-display text-sm font-semibold text-sand-800">
                Wat er met deze methode mee kan
              </p>
              <div className="flex flex-wrap gap-4">
                {CLASSES.map((option) => (
                  <MiniCheckbox
                    key={option.value}
                    label={option.label}
                    checked={item.shippingClasses.includes(option.value)}
                    onChange={(checked) =>
                      update({
                        shippingClasses: checked
                          ? [...item.shippingClasses, option.value]
                          : item.shippingClasses.filter((c) => c !== option.value),
                      })
                    }
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-sand-600">
                Zit er iets in de winkelwagen dat deze methode niet aankan, dan verdwijnt hij vanzelf
                als keuze.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-sand-200 pt-3">
              <MiniCheckbox
                checked={item.isPickup}
                onChange={(isPickup) => update({ isPickup })}
                label="Dit is ophalen (altijd gratis, staat onderaan de keuzes)"
              />
              <MiniCheckbox
                checked={item.active}
                onChange={(active) => update({ active })}
                label="Actief"
              />
            </div>
          </div>
        )}
      />
    </SaveForm>
  );
}
