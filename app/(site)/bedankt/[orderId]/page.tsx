import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CartCleared } from '@/components/shop/cart-cleared';
import { OrderStatusPoller } from '@/components/shop/order-status-poller';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/section';
import { getGeneralSettings } from '@/lib/data/settings';
import { formatCents } from '@/lib/money';
import { syncOrderWithPayment } from '@/lib/shop/payment-flow';
import { formatDateNL } from '@/lib/utils';
import type { Order } from '@/types';

export const metadata: Metadata = {
  title: 'Bedankt voor je bestelling',
  robots: { index: false, follow: false },
};

/**
 * De pagina waar de klant na het betalen terechtkomt.
 *
 * Hier wordt de betaalstatus nog een keer bij Mollie opgehaald. Dat is met
 * opzet dubbelop met de webhook: als die niet aankomt — lokaal, of bij een
 * storing — ziet de klant hier alsnog het goede antwoord en wordt de order
 * gewoon afgerond.
 */
export default async function ThankYouPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  const [result, general] = await Promise.all([syncOrderWithPayment(orderId), getGeneralSettings()]);
  if (result.outcome === 'unknown') notFound();

  const order = result.order;

  if (result.outcome === 'paid') {
    return (
      <Container prose className="py-14 md:py-20">
        <div className="text-center">
          <span
            aria-hidden
            className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-sage-200"
          >
            <svg viewBox="0 0 24 24" className="size-8 text-sage-700" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="text-3xl md:text-4xl">Bedankt voor je bestelling</h1>
          <p className="mt-4 text-lg text-sand-700">
            Je betaling is gelukt. We sturen een bevestiging naar{' '}
            <strong className="text-sand-900">{order.customer.email}</strong>.
          </p>
        </div>

        <CartCleared />
        <OrderCard order={order} />

        <p className="mt-8 text-center text-sand-700">
          Een vraag over je bestelling? Mail naar{' '}
          <a href={`mailto:${general.email}`} className="text-brand-700 underline underline-offset-2">
            {general.email}
          </a>{' '}
          en noem even je bestelnummer.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/webshop" variant="secondary">
            Verder kijken
          </ButtonLink>
          <ButtonLink href="/">Naar de homepagina</ButtonLink>
        </div>
      </Container>
    );
  }

  if (result.outcome === 'mismatch') {
    return (
      <Container prose className="py-14 md:py-20 text-center">
        <h1 className="text-3xl">We kijken er even naar</h1>
        <p className="mt-4 text-lg text-sand-700">
          Er klopt iets niet in het betaalde bedrag van bestelling{' '}
          <strong className="text-sand-900">{order.orderNumber}</strong>. We hebben er bericht van
          gekregen en nemen contact met je op. Je hoeft zelf niets te doen.
        </p>
        <p className="mt-6 text-sand-700">
          Liever meteen contact?{' '}
          <a href={`mailto:${general.email}`} className="text-brand-700 underline underline-offset-2">
            {general.email}
          </a>
        </p>
      </Container>
    );
  }

  if (result.outcome === 'failed') {
    /*
     * Twee heel verschillende gevallen komen hier samen. Is de betaling bij
     * Mollie gestrand, dan is er niets afgeschreven en kan de klant het gewoon
     * opnieuw proberen. Heeft de eigenaar de bestelling ingetrokken, dan is er
     * mogelijk wél betaald — dan is 'er is niets afgeschreven' onjuist en
     * 'probeer het nog eens' ongepast.
     */
    if (order.adminClosed) {
      return (
        <Container prose className="py-14 md:py-20 text-center">
          <h1 className="text-3xl">Deze bestelling is geannuleerd</h1>
          <p className="mt-4 text-lg text-sand-700">
            Bestelling <strong className="text-sand-900">{order.orderNumber}</strong> gaat niet door.
            Je hebt hier bericht over gekregen per mail.
            {order.status === 'refunded'
              ? ' Het betaalde bedrag krijg je terug.'
              : ''}
          </p>
          <p className="mt-6 text-sand-700">
            Klopt dit niet? Mail naar{' '}
            <a href={`mailto:${general.email}`} className="text-brand-700 underline underline-offset-2">
              {general.email}
            </a>{' '}
            en noem je bestelnummer.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/webshop">Naar de webshop</ButtonLink>
          </div>
        </Container>
      );
    }

    const reason =
      result.status === 'expired'
        ? 'De betaling is verlopen.'
        : result.status === 'canceled'
          ? 'De betaling is afgebroken.'
          : 'De betaling is niet gelukt.';

    return (
      <Container prose className="py-14 md:py-20 text-center">
        <h1 className="text-3xl">{reason}</h1>
        <p className="mt-4 text-lg text-sand-700">
          Er is niets afgeschreven. Je winkelwagen staat nog klaar, dus je kunt het gewoon nog een
          keer proberen.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/winkelwagen">Terug naar de winkelwagen</ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            Hulp nodig?
          </ButtonLink>
        </div>
      </Container>
    );
  }

  // Nog onderweg: sommige betaalmethodes hebben even nodig.
  return (
    <Container prose className="py-14 md:py-20 text-center">
      <h1 className="text-3xl">We wachten op je betaling</h1>
      <p className="mt-4 text-lg text-sand-700">
        Bestelling <strong className="text-sand-900">{order.orderNumber}</strong> staat klaar. Zodra de
        betaling binnen is, zie je dat hier vanzelf — deze pagina ververst zichzelf.
      </p>
      <p className="mt-6 text-sand-600">
        Je kunt dit venster gerust sluiten. Je krijgt sowieso een mail zodra alles rond is.
      </p>
      <OrderStatusPoller />
      <p className="mt-8">
        <Link href="/contact" className="text-brand-700 underline underline-offset-2">
          Duurt het te lang? Laat het weten.
        </Link>
      </p>
    </Container>
  );
}

function OrderCard({ order }: { order: Order }) {
  return (
    <div className="mt-10 rounded-2xl border border-sand-300 bg-white p-6 text-left shadow-soft">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-sand-300 pb-4">
        <p className="font-display text-lg font-semibold">{order.orderNumber}</p>
        <p className="text-sm text-sand-600">{formatDateNL(order.createdAt)}</p>
      </div>

      <ul className="divide-y divide-sand-200">
        {order.lines.map((line) => (
          <li key={`${line.productId}-${line.addons.map((a) => a.addonId).join('-')}`} className="flex gap-3 py-3">
            <span className="font-display font-semibold tabular">{line.qty}×</span>
            <span className="flex-1">
              <span className="block text-sand-900">{line.title}</span>
              {line.addons.length ? (
                <span className="block text-sm text-sand-600">
                  {line.addons.map((a) => a.label).join(', ')}
                </span>
              ) : null}
            </span>
            <span className="font-semibold whitespace-nowrap tabular">
              {formatCents(line.lineTotalCents)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 flex flex-col gap-2 border-t border-sand-300 pt-4 text-sm">
        {order.tierDiscountCents > 0 ? (
          <div className="flex justify-between">
            <dt className="text-sand-700">Staffelvoordeel</dt>
            <dd className="font-semibold text-ochre-700 tabular">
              − {formatCents(order.tierDiscountCents)}
            </dd>
          </div>
        ) : null}
        {order.discountCents > 0 ? (
          <div className="flex justify-between">
            <dt className="text-sand-700">Korting {order.discountCode}</dt>
            <dd className="font-semibold text-ochre-700 tabular">− {formatCents(order.discountCents)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-sand-700">Verzending · {order.shippingMethod}</dt>
          <dd className="tabular">
            {order.shippingCents === 0 ? 'Gratis' : formatCents(order.shippingCents)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-sand-300 pt-3">
          <dt className="font-display text-base font-bold">Betaald</dt>
          <dd className="font-display text-base font-bold tabular">{formatCents(order.totalCents)}</dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-sand-300 pt-4 text-sm text-sand-700">
        <p className="font-display font-semibold text-sand-900">Bezorgadres</p>
        <p className="mt-1 leading-relaxed">
          {order.shipping.name}
          <br />
          {order.shipping.street} {order.shipping.houseNumber}
          {order.shipping.houseNumberAddition}
          <br />
          {order.shipping.postalCode} {order.shipping.city}
        </p>
      </div>
    </div>
  );
}
