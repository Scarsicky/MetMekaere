import type { Metadata } from 'next';

import { CartLineRow } from '@/components/shop/cart-line-row';
import { DiscountCodeForm } from '@/components/shop/discount-code-form';
import { OrderSummary, TierHint } from '@/components/shop/order-summary';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/section';
import { getShopSettings } from '@/lib/data/settings';
import { getPricedCart } from '@/lib/shop/cart';

export const metadata: Metadata = {
  title: 'Winkelwagen',
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const [cart, settings] = await Promise.all([getPricedCart(), getShopSettings()]);

  if (!cart.lines.length) {
    return (
      <Container className="py-16 text-center md:py-24">
        <h1 className="text-3xl md:text-4xl">Je winkelwagen is nog leeg</h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-sand-700">
          Zoek een kaart uit om te sturen. Hoe meer je er meeneemt, hoe voordeliger.
        </p>
        <ButtonLink href="/webshop" size="lg" className="mt-8">
          Naar de webshop
        </ButtonLink>
      </Container>
    );
  }

  const blocked = cart.hasStockIssues;

  return (
    <Container className="py-10 md:py-14">
      <h1 className="text-3xl md:text-4xl">Winkelwagen</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        <div className="min-w-0">
          <ul className="border-t border-sand-300">
            {cart.lines.map((line) => (
              <CartLineRow key={line.id} line={line} />
            ))}
          </ul>

          <TierHint cart={cart} className="mt-6" />

          <p className="mt-6">
            <a
              href="/webshop"
              className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-brand-700 underline decoration-brand-300 decoration-2 underline-offset-2 hover:decoration-brand-700"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M19 12H5m0 0 5-5m-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Verder winkelen
            </a>
          </p>
        </div>

        {/* Het overzicht blijft op desktop meescrollen. */}
        <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <div className="rounded-2xl border border-sand-300 bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Overzicht</h2>

            <div className="mt-5">
              <DiscountCodeForm
                currentCode={cart.discountCode}
                appliedLabel={cart.discountLabel}
                error={cart.discountError}
              />
            </div>

            <OrderSummary cart={cart} provisionalShipping className="mt-6 border-t border-sand-300 pt-5" />

            <ButtonLink href="/afrekenen" size="lg" fullWidth className="mt-6">
              Afrekenen
            </ButtonLink>

            {blocked ? (
              <p role="alert" className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
                Pas eerst de gemarkeerde regels aan; daarna kun je afrekenen.
              </p>
            ) : null}

            {settings.checkoutNote ? (
              <p className="mt-4 text-sm text-sand-600">{settings.checkoutNote}</p>
            ) : null}

            <ul className="mt-5 flex flex-col gap-2 border-t border-sand-300 pt-5 text-sm text-sand-600">
              <li className="flex items-center gap-2">
                <Check /> Veilig betalen met iDEAL
              </li>
              <li className="flex items-center gap-2">
                <Check /> Gratis verzending vanaf € 35,–
              </li>
              <li className="flex items-center gap-2">
                <Check /> Veertien dagen bedenktijd
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </Container>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-sage-600" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
