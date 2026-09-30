import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CheckoutForm } from '@/components/shop/checkout-form';
import { OrderSummary, TierHint } from '@/components/shop/order-summary';
import { Container } from '@/components/ui/section';
import { getShopSettings } from '@/lib/data/settings';
import { formatCents } from '@/lib/money';
import { getPricedCart } from '@/lib/shop/cart';
import { isMollieTestMode, useSimulatedPayments } from '@/lib/shop/mollie';

export const metadata: Metadata = {
  title: 'Afrekenen',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [cart, settings] = await Promise.all([getPricedCart(), getShopSettings()]);

  // Lege wagen of iets wat niet kan: terug naar de winkelwagen, waar de klant
  // ziet wat er aan de hand is.
  if (!cart.lines.length || cart.hasStockIssues) {
    redirect('/winkelwagen');
  }

  return (
    <Container className="py-8 md:py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl">Afrekenen</h1>
        <Link
          href="/winkelwagen"
          className="text-sm text-sand-600 underline underline-offset-2 hover:text-brand-700"
        >
          Terug naar winkelwagen
        </Link>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        {/* Op een telefoon staat het overzicht ingeklapt bovenaan, zodat het
            formulier meteen begint maar het bedrag wel te zien is. */}
        <details className="rounded-2xl border border-sand-300 bg-white lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:hidden">
            <span className="font-display font-semibold">
              Je bestelling
              <span className="ml-2 font-normal text-sand-600">
                ({cart.itemCount} {cart.itemCount === 1 ? 'artikel' : 'artikelen'})
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="font-display font-bold tabular">{formatCents(cart.totalCents)}</span>
              <svg
                viewBox="0 0 24 24"
                className="size-5 text-brand-700 transition-transform"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </summary>
          <div className="border-t border-sand-300 px-5 py-5">
            <CartLines cart={cart} />
            <OrderSummary cart={cart} className="mt-5 border-t border-sand-300 pt-5" />
          </div>
        </details>

        <div className="min-w-0 lg:order-1">
          <CheckoutForm
            cart={cart}
            countries={settings.shippingCountries}
            simulatedPayment={useSimulatedPayments()}
            testMode={isMollieTestMode()}
          />
        </div>

        <aside className="hidden lg:order-2 lg:block">
          <div className="sticky top-[calc(var(--header-height)+1.5rem)] rounded-2xl border border-sand-300 bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Je bestelling</h2>
            <CartLines cart={cart} className="mt-5" />
            <OrderSummary cart={cart} className="mt-5 border-t border-sand-300 pt-5" />
            <TierHint cart={cart} className="mt-5" />
            {settings.checkoutNote ? (
              <p className="mt-5 text-sm text-sand-600">{settings.checkoutNote}</p>
            ) : null}
          </div>
        </aside>
      </div>
    </Container>
  );
}

/** Compacte regels in het overzicht: alleen wat je nodig hebt om te herkennen. */
function CartLines({ cart, className }: { cart: Awaited<ReturnType<typeof getPricedCart>>; className?: string }) {
  return (
    <ul className={className}>
      {cart.lines.map((line) => (
        <li key={line.id} className="flex gap-3 py-2.5">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-sand-300 bg-white">
            {line.imageUrl ? (
              <Image src={line.imageUrl} alt="" fill sizes="3.5rem" className="object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center bg-sand-200">
                <Image src="/logo.png" alt="" width={512} height={512} className="size-8 opacity-25" />
              </div>
            )}
            <span className="absolute -top-1.5 -right-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-sand-800 px-1.5 text-xs font-semibold text-sand-50 tabular">
              {line.qty}
            </span>
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-sand-900">{line.title}</p>
            {line.addons.length ? (
              <p className="text-sand-600">{line.addons.map((a) => a.label).join(', ')}</p>
            ) : null}
          </div>
          <p className="text-sm font-semibold whitespace-nowrap tabular">
            {formatCents(line.lineTotalCents)}
          </p>
        </li>
      ))}
    </ul>
  );
}
