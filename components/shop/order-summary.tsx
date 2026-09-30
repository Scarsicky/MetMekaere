import { formatCents } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { PricedCart } from '@/types';

/**
 * Het overzicht met de bedragen. Gedeeld door de winkelwagen en het
 * afrekenscherm, zodat de klant op beide plekken exact dezelfde opsomming
 * ziet — niets verandert nog tussen kijken en betalen.
 */
export function OrderSummary({
  cart,
  provisionalShipping = false,
  className,
}: {
  cart: PricedCart;
  /**
   * In de winkelwagen staat het bezorgadres nog niet vast. De verzendkosten
   * worden dan al wél getoond — ze zitten immers in het totaal — met een
   * zinnetje erbij dat ze bij het afrekenen nog kunnen wijzigen. Een totaal
   * tonen waar een ongenoemd bedrag in zit, is misleidend.
   */
  provisionalShipping?: boolean;
  className?: string;
}) {
  const shippingKnown = cart.shippingOptions.length > 0;
  const digitalOnly = cart.lines.length > 0 && cart.shippingOptions.length === 0;

  return (
    <dl className={cn('flex flex-col gap-2.5 text-[0.95rem]', className)}>
      <Row label="Subtotaal" value={formatCents(cart.grossSubtotalCents)} />

      {cart.tierDiscountCents > 0 ? (
        <Row
          label="Staffelvoordeel"
          value={`− ${formatCents(cart.tierDiscountCents)}`}
          tone="saving"
        />
      ) : null}

      {cart.discountCents > 0 ? (
        <Row
          label={cart.discountLabel ?? 'Korting'}
          value={`− ${formatCents(cart.discountCents)}`}
          tone="saving"
        />
      ) : null}

      {shippingKnown ? (
        <Row
          label={cart.shippingName ? `Verzending · ${cart.shippingName}` : 'Verzending'}
          value={cart.shippingCents === 0 ? 'Gratis' : formatCents(cart.shippingCents)}
          tone={cart.shippingCents === 0 ? 'saving' : 'normal'}
        />
      ) : null}

      {digitalOnly ? <Row label="Verzending" value="Niet nodig" tone="muted" /> : null}

      <div className="mt-1.5 flex items-baseline justify-between border-t border-sand-300 pt-3.5">
        <dt className="font-display text-lg font-bold text-sand-900">Totaal</dt>
        <dd className="font-display text-xl font-bold text-sand-900 tabular">
          {formatCents(cart.totalCents)}
        </dd>
      </div>

      {cart.vatBreakdown.length ? (
        <p className="text-sm text-sand-600">
          Inclusief{' '}
          {cart.vatBreakdown
            .map((row) => `${formatCents(row.vatCents)} btw (${Math.round(row.rate * 100)}%)`)
            .join(' en ')}
          .
        </p>
      ) : null}

      {provisionalShipping && shippingKnown ? (
        <p className="text-sm text-sand-600">
          Verzendkosten op basis van bezorging in Nederland. Bij het afrekenen kies je het land en de
          manier van bezorgen.
        </p>
      ) : null}
    </dl>
  );
}

function Row({
  label,
  value,
  tone = 'normal',
}: {
  label: string;
  value: string;
  tone?: 'normal' | 'saving' | 'muted';
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn(tone === 'muted' ? 'text-sand-600' : 'text-sand-700')}>{label}</dt>
      <dd
        className={cn(
          'whitespace-nowrap tabular',
          tone === 'saving' ? 'font-semibold text-ochre-700' : tone === 'muted' ? 'text-sand-600' : 'text-sand-900',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * 'Nog twee kaarten erbij en je bespaart € 1,50.'
 *
 * Dit is het staffelvoordeel in mensentaal. De klant hoeft niet te rekenen en
 * ziet precies wat de volgende stap oplevert op wat er nú in de wagen zit.
 */
export function TierHint({ cart, className }: { cart: PricedCart; className?: string }) {
  const withNext = cart.tierProgress.filter((p) => p.next && p.next.extraSavingCents > 0);
  if (!withNext.length) return null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {withNext.map((progress) => (
        <p
          key={progress.group}
          className="flex items-start gap-2.5 rounded-xl bg-ochre-100 px-4 py-3 text-sm text-ochre-700"
        >
          <svg viewBox="0 0 24 24" className="mt-0.5 size-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m13.5-6.5-2 2m-7 7-2 2m0-11 2 2m7 7 2 2" strokeLinecap="round" />
          </svg>
          <span>
            Nog {progress.next!.qtyNeeded}{' '}
            {progress.next!.qtyNeeded === 1 ? 'erbij' : 'erbij'} en je bespaart{' '}
            <strong className="font-semibold">{formatCents(progress.next!.extraSavingCents)}</strong> op
            wat er nu in je winkelwagen zit.
          </span>
        </p>
      ))}
    </div>
  );
}
