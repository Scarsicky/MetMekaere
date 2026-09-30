'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useId, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { addToCartAction } from '@/app/actions/cart';
import { CART_INITIAL_STATE } from '@/lib/shop/action-state';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/money';
import { applyTierStep, findNextTierStep, findTierStep } from '@/lib/shop/pricing';
import { setCartCount } from '@/lib/shop/cart-count-store';
import { cn } from '@/lib/utils';
import type { Product, TierRule } from '@/types';

function SubmitButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth disabled={disabled || pending}>
      {pending ? 'Momentje…' : label}
    </Button>
  );
}

/** Plus/min-knoppen; op een telefoon prettiger dan een getalveld. */
function QuantityStepper({
  value,
  onChange,
  max,
  name,
}: {
  value: number;
  onChange: (next: number) => void;
  max: number;
  name: string;
}) {
  const id = useId();
  const step = (delta: number) => onChange(Math.min(max, Math.max(1, value + delta)));

  return (
    <div className="flex items-center gap-1 rounded-full border border-sand-300 bg-white p-1">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={value <= 1}
        aria-label="Eén minder"
        className="inline-flex size-10 items-center justify-center rounded-full text-sand-800 transition-colors hover:bg-sand-200 disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      <label htmlFor={id} className="sr-only">
        Aantal
      </label>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          onChange(Number.isFinite(next) ? Math.min(max, Math.max(1, next)) : 1);
        }}
        className="w-12 border-0 bg-transparent text-center font-display text-lg font-semibold tabular focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <button
        type="button"
        onClick={() => step(1)}
        disabled={value >= max}
        aria-label="Eén meer"
        className="inline-flex size-10 items-center justify-center rounded-full text-sand-800 transition-colors hover:bg-sand-200 disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Het bestelblok op de productpagina: aantal, keuzes en 'in winkelwagen'.
 *
 * Add-ons zonder groep zijn losse aanvinkvakjes. Add-ons mét een groep sluiten
 * elkaar uit en worden keuzerondjes — zo kun je bijvoorbeeld één formaat of
 * één kleur laten kiezen.
 */
export function AddToCartForm({
  product,
  maxQty,
  soldOut,
  tierRule,
}: {
  product: Product;
  maxQty: number;
  soldOut: boolean;
  /** De staffelregel van dit product, als die er is. */
  tierRule?: TierRule | null;
}) {
  const [state, action] = useActionState(addToCartAction, CART_INITIAL_STATE);
  const [qty, setQty] = useState(1);
  const [chosen, setChosen] = useState<Record<string, boolean>>(() => {
    // Een verplichte keuzegroep begint op de eerste optie.
    const initial: Record<string, boolean> = {};
    const groups = new Set(product.addons.filter((a) => a.required && a.group).map((a) => a.group));
    for (const group of groups) {
      const first = product.addons.find((a) => a.group === group);
      if (first) initial[first.id] = true;
    }
    return initial;
  });
  const router = useRouter();

  // Na een gelukte toevoeging: bolletje bijwerken en de pagina verversen,
  // zodat een gewijzigde voorraad meteen klopt.
  useEffect(() => {
    if (state.status === 'ok' && typeof state.itemCount === 'number') {
      setCartCount(state.itemCount);
      router.refresh();
    }
  }, [state, router]);

  const groups = new Map<string, typeof product.addons>();
  const loose: typeof product.addons = [];
  for (const addon of product.addons) {
    if (addon.group) {
      const list = groups.get(addon.group) ?? [];
      list.push(addon);
      groups.set(addon.group, list);
    } else {
      loose.push(addon);
    }
  }

  const extraCents = product.addons
    .filter((a) => chosen[a.id])
    .reduce((sum, a) => sum + a.priceCents, 0);

  /*
   * Wat dit aantal op zichzelf kost, met en zonder staffelvoordeel. Add-ons
   * krijgen geen korting — dat zijn extra's tegen kostprijs.
   */
  const step = tierRule?.active ? findTierStep(tierRule, qty) : null;
  const nextStep = tierRule?.active ? findNextTierStep(tierRule, qty) : null;
  const fullTotal = (product.priceCents + extraCents) * qty;
  const tierTotal = (applyTierStep(product.priceCents, step) + extraCents) * qty;
  const tierPriced = tierTotal < fullTotal;
  const tierNote = tierRule?.description ?? null;

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="productId" value={product.id} />

      {/* Keuzegroepen: precies één optie */}
      {[...groups.entries()].map(([group, addons]) => (
        <fieldset key={group}>
          <legend className="font-display text-sm font-bold tracking-wide text-sand-900 uppercase">
            {group}
          </legend>
          <div className="mt-3 flex flex-col gap-2">
            {addons.map((addon) => (
              <label
                key={addon.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand-300 bg-white p-3.5 transition-colors has-checked:border-sage-400 has-checked:bg-sage-50"
              >
                <input
                  type="radio"
                  name="addon"
                  value={addon.id}
                  checked={Boolean(chosen[addon.id])}
                  onChange={() => {
                    setChosen((prev) => {
                      const next = { ...prev };
                      for (const a of addons) next[a.id] = false;
                      next[addon.id] = true;
                      return next;
                    });
                  }}
                  className="mt-0.5 size-5 shrink-0 accent-brand-700"
                />
                <span className="flex-1 text-sm leading-snug">
                  <span className="block font-medium text-sand-900">{addon.label}</span>
                  {addon.description ? (
                    <span className="mt-0.5 block text-sand-600">{addon.description}</span>
                  ) : null}
                </span>
                {addon.priceCents > 0 ? (
                  <span className="font-display text-sm font-semibold tabular">
                    + {formatCents(addon.priceCents)}
                  </span>
                ) : null}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {/* Losse keuzes */}
      {loose.length ? (
        <fieldset>
          <legend className="font-display text-sm font-bold tracking-wide text-sand-900 uppercase">
            Erbij
          </legend>
          <div className="mt-3 flex flex-col gap-2">
            {loose.map((addon) => (
              <label
                key={addon.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand-300 bg-white p-3.5 transition-colors has-checked:border-sage-400 has-checked:bg-sage-50"
              >
                <input
                  type="checkbox"
                  name="addon"
                  value={addon.id}
                  checked={Boolean(chosen[addon.id])}
                  onChange={(e) => setChosen((prev) => ({ ...prev, [addon.id]: e.target.checked }))}
                  className="mt-0.5 size-5 shrink-0 accent-brand-700"
                />
                <span className="flex-1 text-sm leading-snug">
                  <span className="block font-medium text-sand-900">{addon.label}</span>
                  {addon.description ? (
                    <span className="mt-0.5 block text-sand-600">{addon.description}</span>
                  ) : null}
                </span>
                {addon.priceCents > 0 ? (
                  <span className="font-display text-sm font-semibold tabular">
                    + {formatCents(addon.priceCents)}
                  </span>
                ) : null}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, maxQty)} name="qty" />

          <p className="flex items-baseline gap-2">
            {tierPriced ? (
              <span className="text-sand-500 line-through tabular">{formatCents(fullTotal)}</span>
            ) : null}
            <span className="font-display text-lg font-semibold tabular">
              {formatCents(tierTotal)}
            </span>
          </p>
        </div>

        {/*
          De staffel rekent over álle producten in dezelfde groep samen. Wie hier
          zes kaarten kiest haalt het voordeel al, maar iemand die er drie neemt
          en er in de winkelwagen nog vier bij doet ook. Dat tweede geval kunnen
          we hier niet weten, dus we tonen wat dit aantal op zichzelf oplevert en
          vertellen erbij dat het kan meevallen.
        */}
        {tierPriced ? (
          <p className="rounded-lg bg-ochre-100 px-3 py-2 text-sm text-ochre-700">
            <strong className="font-display font-semibold">
              Staffelvoordeel: je bespaart {formatCents(fullTotal - tierTotal)}
            </strong>
            {tierNote ? <> — {tierNote}</> : null}
          </p>
        ) : nextStep ? (
          <p className="rounded-lg bg-sand-200 px-3 py-2 text-sm text-sand-700">
            Neem er {nextStep.minQty - qty} meer en betaal{' '}
            <strong className="font-display font-semibold">
              {formatCents(applyTierStep(product.priceCents, nextStep))} per stuk
            </strong>
            {tierNote ? <> — {tierNote}</> : null}
          </p>
        ) : null}
      </div>

      <SubmitButton disabled={soldOut} label={soldOut ? 'Uitverkocht' : 'In winkelwagen'} />

      {state.message ? (
        <p
          role={state.status === 'error' ? 'alert' : 'status'}
          className={cn(
            'rounded-xl px-4 py-3 text-sm font-medium',
            state.status === 'error' ? 'bg-brand-50 text-brand-800' : 'bg-sage-100 text-sage-900',
          )}
        >
          {state.message}
          {state.status === 'ok' ? (
            <>
              {' '}
              <a href="/winkelwagen" className="underline underline-offset-2">
                Naar de winkelwagen
              </a>
            </>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}
