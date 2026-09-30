'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';

import { removeLineAction, setLineQtyAction } from '@/app/actions/cart';
import { CART_INITIAL_STATE } from '@/lib/shop/action-state';
import { Badge } from '@/components/ui/badge';
import { formatCents } from '@/lib/money';
import { setCartCount } from '@/lib/shop/cart-count-store';
import { cn } from '@/lib/utils';
import type { PricedLine } from '@/types';

const STOCK_MESSAGES: Record<string, (line: PricedLine) => string> = {
  out_of_stock: () => 'Dit is uitverkocht. Haal het uit je winkelwagen om verder te gaan.',
  insufficient: (line) => `Hier zijn er nog ${line.maxQty} van. Pas het aantal aan om verder te gaan.`,
  unavailable: () => 'Dit product is niet meer beschikbaar. Haal het uit je winkelwagen.',
};

function QtyButton({
  lineId,
  qty,
  label,
  children,
  disabled,
}: {
  lineId: string;
  qty: number;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <input type="hidden" name="lineId" value={lineId} />
      <input type="hidden" name="qty" value={qty} />
      <button
        type="submit"
        aria-label={label}
        disabled={disabled || pending}
        className="inline-flex size-9 items-center justify-center rounded-full text-sand-800 transition-colors hover:bg-sand-200 disabled:opacity-40"
      >
        {children}
      </button>
    </>
  );
}

/**
 * Eén regel in de winkelwagen.
 *
 * Elke knop is een eigen formuliertje naar een server action. Daardoor werkt
 * de winkelwagen ook zonder JavaScript, en wordt het bedrag altijd op de
 * server opnieuw berekend.
 */
export function CartLineRow({ line }: { line: PricedLine }) {
  const router = useRouter();
  const [qtyState, qtyAction] = useActionState(setLineQtyAction, CART_INITIAL_STATE);
  const [removeState, removeAction] = useActionState(removeLineAction, CART_INITIAL_STATE);

  useEffect(() => {
    for (const state of [qtyState, removeState]) {
      if (state.status === 'ok' && typeof state.itemCount === 'number') {
        setCartCount(state.itemCount);
        router.refresh();
      }
    }
  }, [qtyState, removeState, router]);

  const hasTierDiscount = line.tierDiscountCents > 0;
  const stockMessage = line.stockIssue ? STOCK_MESSAGES[line.stockIssue]?.(line) : null;

  return (
    <li
      className={cn(
        'flex gap-4 border-b border-sand-300 py-5 last:border-0',
        line.stockIssue && 'opacity-90',
      )}
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-sand-300 bg-white sm:size-28">
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt={line.imageAlt || line.title}
            fill
            sizes="7rem"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-sand-200">
            <Image src="/logo.png" alt="" width={512} height={512} className="size-12 opacity-25" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <h3 className="font-display font-semibold text-sand-900">
            {line.slug ? (
              <Link href={`/product/${line.slug}`} className="hover:text-brand-700">
                {line.title}
              </Link>
            ) : (
              line.title
            )}
          </h3>
          <p className="font-display font-semibold whitespace-nowrap tabular">
            {formatCents(line.lineTotalCents)}
          </p>
        </div>

        {line.addons.length ? (
          <ul className="mt-1 text-sm text-sand-600">
            {line.addons.map((addon) => (
              <li key={addon.addonId}>
                {addon.label}
                {addon.qty > 1 ? ` ×${addon.qty}` : ''}
                {addon.unitPriceCents > 0 ? ` · ${formatCents(addon.unitPriceCents)} per stuk` : ''}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-1 text-sm text-sand-600 tabular">
          {hasTierDiscount ? (
            <>
              <span className="text-sand-500 line-through">{formatCents(line.unitPriceCents)}</span>{' '}
              <span className="font-semibold text-ochre-700">
                {formatCents(line.tierUnitPriceCents)}
              </span>{' '}
              per stuk
            </>
          ) : (
            <>{formatCents(line.unitPriceCents)} per stuk</>
          )}
        </p>

        {hasTierDiscount ? (
          <p className="mt-1.5">
            <Badge tone="ochre">Je bespaart {formatCents(line.tierDiscountCents)}</Badge>
          </p>
        ) : null}

        {stockMessage ? (
          <p role="alert" className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800">
            {stockMessage}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full border border-sand-300 bg-white p-0.5">
            <form action={qtyAction} className="contents">
              <QtyButton lineId={line.id} qty={line.qty - 1} label="Eén minder" disabled={line.qty <= 1}>
                <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <path d="M5 12h14" strokeLinecap="round" />
                </svg>
              </QtyButton>
            </form>

            <span aria-live="polite" className="w-9 text-center font-display font-semibold tabular">
              {line.qty}
            </span>

            <form action={qtyAction} className="contents">
              <QtyButton
                lineId={line.id}
                qty={line.qty + 1}
                label="Eén meer"
                disabled={line.maxQty !== undefined && line.qty >= line.maxQty}
              >
                <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </QtyButton>
            </form>
          </div>

          <form action={removeAction}>
            <input type="hidden" name="lineId" value={line.id} />
            <button
              type="submit"
              className="text-sm text-sand-600 underline underline-offset-2 transition-colors hover:text-brand-700"
            >
              Verwijderen
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}
