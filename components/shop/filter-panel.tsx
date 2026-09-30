'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { SORT_OPTIONS } from '@/lib/shop/filters';
import type { Category, Facet } from '@/types';
import { cn } from '@/lib/utils';

/**
 * De filters van de webshop.
 *
 * Het is één gewoon `<form method="get">`. Zonder JavaScript filter je met de
 * knop onderaan; mét JavaScript versturen we bij elke wijziging meteen, zodat
 * het aanvoelt als een normale webshop. De waarden staan in de URL, dus een
 * filterselectie is te delen en de terugknop werkt.
 */
export function FilterPanel({
  basePath,
  categories,
  activeCategory,
  facets,
  active,
  priceBounds,
  resultCount,
}: {
  basePath: string;
  categories: Category[];
  activeCategory?: string;
  facets: Facet[];
  active: {
    attributes: Record<string, string[]>;
    search: string;
    sort: string;
    minInput: string;
    maxInput: string;
    inStockOnly: boolean;
    activeCount: number;
  };
  priceBounds: { minCents: number; maxCents: number };
  resultCount: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  /** Verstuurt het formulier zonder de pagina te herladen. */
  function submitNow() {
    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      const text = String(value).trim();
      if (!text) continue;
      const existing = params.get(key);
      params.set(key, existing ? `${existing},${text}` : text);
    }
    // De standaardsortering hoeft niet in de URL.
    if (params.get('sorteer') === 'aanbevolen') params.delete('sorteer');

    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <form
      ref={formRef}
      method="get"
      action={basePath}
      onChange={submitNow}
      className={cn('flex flex-col gap-6', pending && 'opacity-70')}
      aria-busy={pending}
    >
      {/* Zoeken */}
      <div>
        <label htmlFor="filter-q" className="font-display text-sm font-bold tracking-wide text-sand-900 uppercase">
          Zoeken
        </label>
        <div className="mt-3 flex gap-2">
          <input
            id="filter-q"
            name="q"
            type="search"
            defaultValue={active.search}
            placeholder="Waar zoek je naar?"
            className="w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-base placeholder:text-sand-500 focus:border-brand-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Categorieën — links, want een categorie is een eigen pagina met
          eigen titel en omschrijving voor zoekmachines. */}
      {categories.length ? (
        <fieldset>
          <legend className="font-display text-sm font-bold tracking-wide text-sand-900 uppercase">
            Categorie
          </legend>
          <ul className="mt-3 flex flex-col gap-1">
            <li>
              <Link
                href="/webshop"
                className={cn(
                  'block rounded-lg px-3 py-2 text-[0.95rem] transition-colors',
                  !activeCategory ? 'bg-sage-200 font-semibold text-sage-900' : 'text-sand-700 hover:bg-sand-200',
                )}
              >
                Alles
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/webshop/${category.slug}`}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-[0.95rem] transition-colors',
                    activeCategory === category.slug
                      ? 'bg-sage-200 font-semibold text-sage-900'
                      : 'text-sand-700 hover:bg-sand-200',
                  )}
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      {/* Facetten uit de producten zelf */}
      {facets.map((facet) => (
        <fieldset key={facet.key}>
          <legend className="font-display text-sm font-bold tracking-wide text-sand-900 uppercase">
            {facet.label}
          </legend>
          <ul className="mt-3 flex flex-col gap-2">
            {facet.values.map(({ value, count }) => (
              <li key={value}>
                <label className="flex cursor-pointer items-center gap-2.5 text-[0.95rem] text-sand-800">
                  <input
                    type="checkbox"
                    name={facet.key}
                    value={value}
                    defaultChecked={active.attributes[facet.key]?.includes(value)}
                    className="size-4.5 accent-brand-700"
                  />
                  <span className="flex-1">{value}</span>
                  <span className="text-sm text-sand-500 tabular">{count}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}

      {/* Prijs */}
      {priceBounds.maxCents > priceBounds.minCents ? (
        <fieldset>
          <legend className="font-display text-sm font-bold tracking-wide text-sand-900 uppercase">
            Prijs
          </legend>
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="filter-min" className="sr-only">
              Vanaf
            </label>
            <input
              id="filter-min"
              name="min"
              type="text"
              inputMode="decimal"
              defaultValue={active.minInput}
              placeholder={(priceBounds.minCents / 100).toFixed(2).replace('.', ',')}
              className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-base tabular"
            />
            <span aria-hidden className="text-sand-500">
              –
            </span>
            <label htmlFor="filter-max" className="sr-only">
              Tot
            </label>
            <input
              id="filter-max"
              name="max"
              type="text"
              inputMode="decimal"
              defaultValue={active.maxInput}
              placeholder={(priceBounds.maxCents / 100).toFixed(2).replace('.', ',')}
              className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-base tabular"
            />
          </div>
        </fieldset>
      ) : null}

      {/* Voorraad */}
      <label className="flex cursor-pointer items-center gap-2.5 text-[0.95rem] text-sand-800">
        <input
          type="checkbox"
          name="voorraad"
          value="1"
          defaultChecked={active.inStockOnly}
          className="size-4.5 accent-brand-700"
        />
        Alleen wat direct leverbaar is
      </label>

      {/* De sortering staat boven de lijst, maar hoort wel bij dit formulier. */}
      <input type="hidden" name="sorteer" value={active.sort} />

      <div className="flex flex-col gap-2 border-t border-sand-300 pt-5">
        {/* Zonder JavaScript is dit de knop die filtert. */}
        <Button type="submit" variant="secondary" fullWidth>
          {resultCount === 1 ? 'Toon 1 product' : `Toon ${resultCount} producten`}
        </Button>
        {active.activeCount > 0 ? (
          <Link
            href={basePath}
            className="text-center text-sm text-sand-600 underline underline-offset-2 hover:text-brand-700"
          >
            Filters wissen
          </Link>
        ) : null}
      </div>
    </form>
  );
}

/**
 * De sorteerkeuze boven de lijst. Los van het filterformulier, omdat hij
 * ergens anders op de pagina staat.
 */
export function SortSelect({ value, className }: { value: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className={cn('flex items-center gap-2 text-sm text-sand-700', className)}>
      <span className="whitespace-nowrap">Sorteer op</span>
      <select
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams(window.location.search);
          if (e.target.value === 'aanbevolen') params.delete('sorteer');
          else params.set('sorteer', e.target.value);
          const qs = params.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }}
        className="rounded-xl border border-sand-300 bg-white px-3 py-2 font-display text-sm font-semibold text-sand-900 focus:border-brand-400 focus:outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
