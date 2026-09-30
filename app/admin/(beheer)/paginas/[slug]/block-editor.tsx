'use client';

import { useState } from 'react';

import { ImageManager } from '@/components/admin/image-manager';
import { MiniField, MiniInput, MiniSelect } from '@/components/admin/list-editor';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Block } from '@/types';

/**
 * De blokkeneditor.
 *
 * Een pagina is een stapel blokken. Elk bloktype heeft zijn eigen velden; je
 * zet ze in de volgorde die je wilt en de vormgeving regelt zichzelf — de
 * achtergrondkleuren wisselen automatisch af, zodat een pagina altijd ritme
 * houdt zonder dat je daarover hoeft na te denken.
 */

type BlockType = Block['type'];

const BLOCK_LABELS: Record<BlockType, { label: string; hint: string }> = {
  hero: { label: 'Kop van de pagina', hint: 'Grote titel met een inleiding en knoppen.' },
  text: { label: 'Tekst', hint: 'Een stuk lopende tekst, eventueel met een kop.' },
  image: { label: 'Afbeelding', hint: 'Eén foto, met een onderschrift.' },
  gallery: { label: 'Fotoreeks', hint: 'Meerdere foto’s naast elkaar.' },
  cards: { label: 'Kaartjes', hint: 'Een rij blokjes met een titel en tekst.' },
  products: { label: 'Producten', hint: 'Een selectie uit de webshop.' },
  cta: { label: 'Oproep', hint: 'Gekleurde band met één duidelijke knop.' },
  quote: { label: 'Citaat', hint: 'Eén zin die eruit springt.' },
  faq: { label: 'Veelgestelde vragen', hint: 'Vragen die opengeklapt kunnen worden.' },
  newsletter: { label: 'Nieuwsbrief', hint: 'Inschrijfformulier.' },
  activities: { label: 'Activiteiten', hint: 'De eerstvolgende dingen uit Doen en Beleven.' },
  dialect: { label: 'Dialectwoorden', hint: 'Woorden uit Fluffy Dialect.' },
  membership: { label: 'Lidmaatschap', hint: 'Het blok met de contributie en wat je ervoor krijgt.' },
  steps: { label: 'Stappen', hint: 'Genummerde stappen onder elkaar.' },
  spacer: { label: 'Witruimte', hint: 'Extra lucht tussen twee blokken.' },
};

const NEW_BLOCK: Record<BlockType, () => Block> = {
  hero: () => ({ type: 'hero', title: '', subtitle: '', body: '', align: 'center', ctas: [] }),
  text: () => ({ type: 'text', title: '', body: '', narrow: true }),
  image: () => ({ type: 'image', image: { path: '', url: '', alt: '' }, caption: '' }),
  gallery: () => ({ type: 'gallery', title: '', images: [] }),
  cards: () => ({ type: 'cards', title: '', intro: '', columns: 3, items: [{ title: '', body: '' }] }),
  products: () => ({ type: 'products', source: 'featured', title: '', intro: '', limit: 4 }),
  cta: () => ({ type: 'cta', title: '', body: '', button: { label: '', href: '' }, tone: 'brand' }),
  quote: () => ({ type: 'quote', text: '', author: '' }),
  faq: () => ({ type: 'faq', title: '', items: [{ q: '', a: '' }] }),
  newsletter: () => ({ type: 'newsletter', title: '', body: '' }),
  activities: () => ({ type: 'activities', title: '', intro: '', limit: 3 }),
  dialect: () => ({ type: 'dialect', title: '', intro: '', limit: 6 }),
  membership: () => ({ type: 'membership', title: '', priceLabel: '', body: '', perks: [] }),
  steps: () => ({ type: 'steps', title: '', intro: '', items: [{ title: '', body: '' }] }),
  spacer: () => ({ type: 'spacer', size: 'md' }),
};

interface Keyed {
  key: string;
  block: Block;
}

export function BlockEditor({ name, initial }: { name: string; initial: Block[] }) {
  const [blocks, setBlocks] = useState<Keyed[]>(() =>
    initial.map((block, index) => ({ key: `b${index}-${Math.random().toString(36).slice(2, 7)}`, block })),
  );
  const [adding, setAdding] = useState<BlockType>('text');

  function update(index: number, patch: Partial<Block>) {
    setBlocks((current) =>
      current.map((item, i) =>
        i === index ? { ...item, block: { ...item.block, ...patch } as Block } : item,
      ),
    );
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name={name} value={JSON.stringify(blocks.map((b) => b.block))} />

      {blocks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sand-400 px-4 py-10 text-center text-sand-600">
          Deze pagina heeft nog geen blokken. Kies er hieronder een om te beginnen.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {blocks.map((item, index) => (
            <li key={item.key} className="rounded-2xl border border-sand-300 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-200 px-5 py-3">
                <div>
                  <p className="font-display font-semibold text-sand-900">
                    {BLOCK_LABELS[item.block.type].label}
                  </p>
                  <p className="text-xs text-sand-600">{BLOCK_LABELS[item.block.type].hint}</p>
                </div>
                <div className="flex gap-1.5">
                  <SmallButton label="Omhoog" onClick={() => move(index, -1)} disabled={index === 0}>
                    ↑
                  </SmallButton>
                  <SmallButton
                    label="Omlaag"
                    onClick={() => move(index, 1)}
                    disabled={index === blocks.length - 1}
                  >
                    ↓
                  </SmallButton>
                  <button
                    type="button"
                    onClick={() => setBlocks((c) => c.filter((_, i) => i !== index))}
                    className="rounded-lg px-2.5 py-1 text-sm text-brand-700 hover:bg-brand-50"
                  >
                    Weg
                  </button>
                </div>
              </div>

              <div className="px-5 py-4">
                <BlockFields block={item.block} index={index} update={update} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-sand-300 bg-sand-50 p-4">
        <MiniField label="Blok toevoegen" className="min-w-56">
          <MiniSelect value={adding} onChange={(value) => setAdding(value as BlockType)}>
            {(Object.keys(BLOCK_LABELS) as BlockType[]).map((type) => (
              <option key={type} value={type}>
                {BLOCK_LABELS[type].label}
              </option>
            ))}
          </MiniSelect>
        </MiniField>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setBlocks((current) => [
              ...current,
              { key: `n${Math.random().toString(36).slice(2, 8)}`, block: NEW_BLOCK[adding]() },
            ])
          }
        >
          Toevoegen
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * De velden per bloktype
 * ------------------------------------------------------------------ */

function BlockFields({
  block,
  index,
  update,
}: {
  block: Block;
  index: number;
  update: (index: number, patch: Partial<Block>) => void;
}) {
  const set = (patch: Record<string, unknown>) => update(index, patch as Partial<Block>);

  switch (block.type) {
    case 'hero':
      return (
        <div className="flex flex-col gap-3">
          <MiniField label="Titel">
            <MiniInput value={block.title} onChange={(title) => set({ title })} />
          </MiniField>
          <MiniField label="Ondertitel">
            <MiniInput value={block.subtitle ?? ''} onChange={(subtitle) => set({ subtitle })} />
          </MiniField>
          <MiniField label="Inleiding">
            <Area value={block.body ?? ''} onChange={(body) => set({ body })} rows={4} />
          </MiniField>
          <MiniField label="Uitlijning">
            <MiniSelect value={block.align ?? 'center'} onChange={(align) => set({ align })}>
              <option value="center">Gecentreerd</option>
              <option value="left">Links, met foto ernaast</option>
            </MiniSelect>
          </MiniField>
          <LinkListField
            label="Knoppen"
            items={block.ctas ?? []}
            onChange={(ctas) => set({ ctas })}
          />
          {block.align === 'left' ? (
            <ImageManager
              folder="paginas"
              max={1}
              label="Foto ernaast"
              initial={block.image ? [block.image] : []}
              onChange={(images) => set({ image: images[0] ?? null })}
            />
          ) : null}
        </div>
      );

    case 'text':
      return (
        <div className="flex flex-col gap-3">
          <MiniField label="Kop" hint="Mag leeg blijven.">
            <MiniInput value={block.title ?? ''} onChange={(title) => set({ title })} />
          </MiniField>
          <MiniField
            label="Tekst"
            hint="Een lege regel maakt een nieuwe alinea. **Vet** met sterretjes, een opsomming met een streepje."
          >
            <Area value={block.body} onChange={(body) => set({ body })} rows={8} mono />
          </MiniField>
        </div>
      );

    case 'image':
      return (
        <div className="flex flex-col gap-3">
          <ImageManager
            folder="paginas"
            max={1}
            label="Foto"
            initial={block.image.url ? [block.image] : []}
            onChange={(images) => set({ image: images[0] ?? { path: '', url: '', alt: '' } })}
          />
          <MiniField label="Onderschrift">
            <MiniInput value={block.caption ?? ''} onChange={(caption) => set({ caption })} />
          </MiniField>
        </div>
      );

    case 'gallery':
      return (
        <div className="flex flex-col gap-3">
          <MiniField label="Kop">
            <MiniInput value={block.title ?? ''} onChange={(title) => set({ title })} />
          </MiniField>
          <ImageManager
            folder="paginas"
            max={12}
            label="Foto’s"
            initial={block.images}
            onChange={(images) => set({ images })}
          />
        </div>
      );

    case 'cards':
      return (
        <div className="flex flex-col gap-3">
          <MiniField label="Kop">
            <MiniInput value={block.title ?? ''} onChange={(title) => set({ title })} />
          </MiniField>
          <MiniField label="Inleiding">
            <Area value={block.intro ?? ''} onChange={(intro) => set({ intro })} rows={2} />
          </MiniField>
          <MiniField label="Aantal kolommen">
            <MiniSelect
              value={String(block.columns ?? 3)}
              onChange={(columns) => set({ columns: Number(columns) })}
            >
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </MiniSelect>
          </MiniField>

          <RepeatingItems
            label="Kaartjes"
            items={block.items}
            onChange={(items) => set({ items })}
            makeNew={() => ({ title: '', body: '', icon: '', href: '' })}
            render={(item, updateItem) => (
              <div className="grid gap-2 sm:grid-cols-[3rem_1fr]">
                <MiniField label="Icoon">
                  <MiniInput
                    value={item.icon ?? ''}
                    onChange={(icon) => updateItem({ icon })}
                    placeholder="💌"
                  />
                </MiniField>
                <MiniField label="Titel">
                  <MiniInput value={item.title} onChange={(title) => updateItem({ title })} />
                </MiniField>
                <MiniField label="Tekst" className="sm:col-span-2">
                  <Area value={item.body ?? ''} onChange={(body) => updateItem({ body })} rows={2} />
                </MiniField>
                <MiniField label="Link" className="sm:col-span-2" hint="Bijv. /webshop. Mag leeg.">
                  <MiniInput value={item.href ?? ''} onChange={(href) => updateItem({ href })} />
                </MiniField>
              </div>
            )}
          />
        </div>
      );

    case 'products':
      return (
        <div className="flex flex-col gap-3">
          <MiniField label="Kop">
            <MiniInput value={block.title ?? ''} onChange={(title) => set({ title })} />
          </MiniField>
          <MiniField label="Inleiding">
            <Area value={block.intro ?? ''} onChange={(intro) => set({ intro })} rows={2} />
          </MiniField>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniField label="Welke producten">
              <MiniSelect value={block.source} onChange={(source) => set({ source })}>
                <option value="featured">De uitgelichte producten</option>
                <option value="category">Alles uit één categorie</option>
                <option value="slugs">Zelf kiezen</option>
              </MiniSelect>
            </MiniField>
            <MiniField label="Hoeveel tonen">
              <MiniInput
                value={String(block.limit ?? 4)}
                inputMode="numeric"
                onChange={(limit) => set({ limit: Number(limit) || 4 })}
              />
            </MiniField>
          </div>

          {block.source === 'category' ? (
            <MiniField label="Categorie" hint="De webadres-naam, bijvoorbeeld kaarten.">
              <MiniInput
                value={block.categorySlug ?? ''}
                onChange={(categorySlug) => set({ categorySlug })}
              />
            </MiniField>
          ) : null}

          {block.source === 'slugs' ? (
            <MiniField label="Producten" hint="Webadres-namen, gescheiden door komma’s.">
              <MiniInput
                value={(block.slugs ?? []).join(', ')}
                onChange={(value) =>
                  set({ slugs: value.split(',').map((s) => s.trim()).filter(Boolean) })
                }
              />
            </MiniField>
          ) : null}

          <LinkListField
            label="Knop ernaast"
            items={block.cta ? [block.cta] : []}
            max={1}
            onChange={(items) => set({ cta: items[0] })}
          />
        </div>
      );

    case 'cta':
      return (
        <div className="flex flex-col gap-3">
          <MiniField label="Titel">
            <MiniInput value={block.title} onChange={(title) => set({ title })} />
          </MiniField>
          <MiniField label="Tekst">
            <Area value={block.body ?? ''} onChange={(body) => set({ body })} rows={2} />
          </MiniField>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniField label="Knoptekst">
              <MiniInput
                value={block.button.label}
                onChange={(label) => set({ button: { ...block.button, label } })}
              />
            </MiniField>
            <MiniField label="Knoplink">
              <MiniInput
                value={block.button.href}
                onChange={(href) => set({ button: { ...block.button, href } })}
                placeholder="/community"
              />
            </MiniField>
          </div>
          <MiniField label="Kleur">
            <MiniSelect value={block.tone ?? 'brand'} onChange={(tone) => set({ tone })}>
              <option value="brand">Rood</option>
              <option value="sage">Saliegroen</option>
              <option value="cream">Zand</option>
            </MiniSelect>
          </MiniField>
        </div>
      );

    case 'quote':
      return (
        <div className="flex flex-col gap-3">
          <MiniField label="Citaat">
            <Area value={block.text} onChange={(text) => set({ text })} rows={3} />
          </MiniField>
          <MiniField label="Van wie">
            <MiniInput value={block.author ?? ''} onChange={(author) => set({ author })} />
          </MiniField>
        </div>
      );

    case 'faq':
      return (
        <div className="flex flex-col gap-3">
          <MiniField label="Kop">
            <MiniInput value={block.title ?? ''} onChange={(title) => set({ title })} />
          </MiniField>
          <RepeatingItems
            label="Vragen"
            items={block.items}
            onChange={(items) => set({ items })}
            makeNew={() => ({ q: '', a: '' })}
            render={(item, updateItem) => (
              <div className="flex flex-col gap-2">
                <MiniField label="Vraag">
                  <MiniInput value={item.q} onChange={(q) => updateItem({ q })} />
                </MiniField>
                <MiniField label="Antwoord">
                  <Area value={item.a} onChange={(a) => updateItem({ a })} rows={3} />
                </MiniField>
              </div>
            )}
          />
        </div>
      );

    case 'newsletter':
      return (
        <div className="flex flex-col gap-3">
          <MiniField label="Kop">
            <MiniInput value={block.title ?? ''} onChange={(title) => set({ title })} />
          </MiniField>
          <MiniField label="Tekst">
            <Area value={block.body ?? ''} onChange={(body) => set({ body })} rows={2} />
          </MiniField>
        </div>
      );

    case 'activities':
    case 'dialect':
      return (
        <div className="flex flex-col gap-3">
          <MiniField label="Kop">
            <MiniInput value={block.title ?? ''} onChange={(title) => set({ title })} />
          </MiniField>
          <MiniField label="Inleiding">
            <Area value={block.intro ?? ''} onChange={(intro) => set({ intro })} rows={2} />
          </MiniField>
          <MiniField label="Hoeveel tonen">
            <MiniInput
              value={String(block.limit ?? 3)}
              inputMode="numeric"
              onChange={(limit) => set({ limit: Number(limit) || 3 })}
            />
          </MiniField>
        </div>
      );

    case 'membership':
      return (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniField label="Titel">
              <MiniInput value={block.title} onChange={(title) => set({ title })} />
            </MiniField>
            <MiniField label="Prijs" hint="Vrije tekst, bijv. € 24 per jaar.">
              <MiniInput value={block.priceLabel} onChange={(priceLabel) => set({ priceLabel })} />
            </MiniField>
          </div>
          <MiniField label="Tekst">
            <Area value={block.body ?? ''} onChange={(body) => set({ body })} rows={4} mono />
          </MiniField>
          <MiniField label="Wat je ervoor krijgt" hint="Eén per regel.">
            <Area
              value={block.perks.join('\n')}
              onChange={(value) => set({ perks: value.split('\n').map((p) => p.trim()).filter(Boolean) })}
              rows={4}
            />
          </MiniField>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniField label="Knoptekst">
              <MiniInput
                value={block.button?.label ?? ''}
                onChange={(label) =>
                  set({ button: { label, href: block.button?.href ?? '' } })
                }
              />
            </MiniField>
            <MiniField label="Knoplink">
              <MiniInput
                value={block.button?.href ?? ''}
                onChange={(href) => set({ button: { label: block.button?.label ?? '', href } })}
              />
            </MiniField>
          </div>
          <MiniField label="Voetnoot">
            <MiniInput value={block.footnote ?? ''} onChange={(footnote) => set({ footnote })} />
          </MiniField>
        </div>
      );

    case 'steps':
      return (
        <div className="flex flex-col gap-3">
          <MiniField label="Kop">
            <MiniInput value={block.title ?? ''} onChange={(title) => set({ title })} />
          </MiniField>
          <RepeatingItems
            label="Stappen"
            items={block.items}
            onChange={(items) => set({ items })}
            makeNew={() => ({ title: '', body: '' })}
            render={(item, updateItem) => (
              <div className="flex flex-col gap-2">
                <MiniField label="Titel">
                  <MiniInput value={item.title} onChange={(title) => updateItem({ title })} />
                </MiniField>
                <MiniField label="Tekst">
                  <Area value={item.body ?? ''} onChange={(body) => updateItem({ body })} rows={2} />
                </MiniField>
              </div>
            )}
          />
        </div>
      );

    case 'spacer':
      return (
        <MiniField label="Hoeveel ruimte">
          <MiniSelect value={block.size ?? 'md'} onChange={(size) => set({ size })}>
            <option value="sm">Weinig</option>
            <option value="md">Normaal</option>
            <option value="lg">Veel</option>
          </MiniSelect>
        </MiniField>
      );

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ *
 * Kleine hulpjes
 * ------------------------------------------------------------------ */

function Area({
  value,
  onChange,
  rows = 3,
  mono,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  mono?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className={cn(
        'rounded-lg border border-sand-300 px-3 py-2 text-sm leading-relaxed focus:border-brand-400 focus:outline-none',
        mono && 'font-mono',
      )}
    />
  );
}

function SmallButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-lg border border-sand-300 text-sand-800 transition-colors hover:bg-sand-100 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function RepeatingItems<T>({
  label,
  items,
  onChange,
  makeNew,
  render,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  makeNew: () => T;
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 font-display text-sm font-semibold text-sand-800">{label}</p>
      <ul className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={index} className="rounded-lg border border-sand-200 bg-sand-50 p-3">
            {render(item, (patch) =>
              onChange(items.map((current, i) => (i === index ? { ...current, ...patch } : current))),
            )}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="mt-2 text-sm text-brand-700 underline underline-offset-2"
            >
              Verwijderen
            </button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3"
        onClick={() => onChange([...items, makeNew()])}
      >
        Toevoegen
      </Button>
    </div>
  );
}

function LinkListField({
  label,
  items,
  onChange,
  max = 3,
}: {
  label: string;
  items: { label: string; href: string; variant?: string }[];
  onChange: (items: { label: string; href: string }[]) => void;
  max?: number;
}) {
  return (
    <div>
      <p className="mb-2 font-display text-sm font-semibold text-sand-800">{label}</p>
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <MiniField label="Tekst">
              <MiniInput
                value={item.label}
                onChange={(value) =>
                  onChange(items.map((c, i) => (i === index ? { ...c, label: value } : c)))
                }
              />
            </MiniField>
            <MiniField label="Link">
              <MiniInput
                value={item.href}
                onChange={(value) =>
                  onChange(items.map((c, i) => (i === index ? { ...c, href: value } : c)))
                }
                placeholder="/webshop"
              />
            </MiniField>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="h-10 px-2 text-sm text-brand-700 underline underline-offset-2"
            >
              Weg
            </button>
          </li>
        ))}
      </ul>
      {items.length < max ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={() => onChange([...items, { label: '', href: '' }])}
        >
          Knop toevoegen
        </Button>
      ) : null}
    </div>
  );
}

