'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

/**
 * De kenmerken waarop bezoekers in de webshop kunnen filteren: thema,
 * formaat, of wat je zelf bedenkt.
 *
 * Een kenmerk dat je hier invult verschijnt automatisch als filter in de shop,
 * zodra het bij minstens één product staat. Je hoeft dus nergens anders een
 * lijstje bij te houden. Welke kenmerken als filter meedoen, staat bij
 * Instellingen.
 */

interface Row {
  key: string;
  values: string;
}

function toRows(attributes: Record<string, string[]>): Row[] {
  return Object.entries(attributes).map(([key, values]) => ({ key, values: values.join(', ') }));
}

function toAttributes(rows: Row[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const row of rows) {
    const key = row.key.trim().toLowerCase();
    if (!key) continue;
    const values = row.values
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length) out[key] = values;
  }
  return out;
}

export function AttributeEditor({
  name,
  initial,
  suggestions = [],
}: {
  name: string;
  initial: Record<string, string[]>;
  /** Kenmerken die al als filter zijn ingesteld. */
  suggestions?: { key: string; label: string }[];
}) {
  const [rows, setRows] = useState<Row[]>(() => {
    const existing = toRows(initial);
    // Begin met de ingestelde filters, zodat je ziet wat er te vullen valt.
    for (const suggestion of suggestions) {
      if (!existing.some((r) => r.key === suggestion.key)) {
        existing.push({ key: suggestion.key, values: '' });
      }
    }
    return existing.length ? existing : [{ key: '', values: '' }];
  });

  function update(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={JSON.stringify(toAttributes(rows))} />

      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <li key={index} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-display font-semibold text-sand-800">Kenmerk</span>
              <input
                type="text"
                value={row.key}
                onChange={(e) => update(index, { key: e.target.value })}
                placeholder="thema"
                className="rounded-lg border border-sand-300 px-3 py-2 focus:border-brand-400 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-display font-semibold text-sand-800">Waarden</span>
              <input
                type="text"
                value={row.values}
                onChange={(e) => update(index, { values: e.target.value })}
                placeholder="Zomaar, Sterkte"
                className="rounded-lg border border-sand-300 px-3 py-2 focus:border-brand-400 focus:outline-none"
              />
            </label>

            <button
              type="button"
              onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
              className="h-10 rounded-lg px-3 text-sm text-brand-700 underline underline-offset-2"
            >
              Weg
            </button>
          </li>
        ))}
      </ul>

      <p className="text-sm text-sand-600">
        Meerdere waarden scheid je met een komma. Elk kenmerk dat als filter is ingesteld verschijnt
        vanzelf in de webshop.
      </p>

      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setRows((current) => [...current, { key: '', values: '' }])}
        >
          Kenmerk toevoegen
        </Button>
      </div>
    </div>
  );
}
