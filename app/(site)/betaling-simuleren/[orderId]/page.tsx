import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/section';
import { formatCents } from '@/lib/money';
import { emptyCartById } from '@/lib/shop/cart';
import { useSimulatedPayments } from '@/lib/shop/mollie';
import { getOrder, markOrderPaid, markOrderStatus } from '@/lib/shop/orders';
import { sendOrderMails } from '@/lib/shop/payment-flow';

export const metadata: Metadata = {
  title: 'Testbetaling',
  robots: { index: false, follow: false },
};

/**
 * Nagebootste betaalpagina, in plaats van Mollie.
 *
 * Hiermee is het hele bestelproces lokaal te doorlopen — inclusief het
 * afboeken van voorraad en het versturen van de bevestigingsmail — zonder dat
 * er een Mollie-account nodig is.
 *
 * Deze pagina bestaat alléén zolang er geen Mollie-sleutel is én we niet in
 * productie draaien. Zodra er een sleutel is, of zodra de site live staat,
 * geeft dit adres gewoon 'niet gevonden'. Er kan dus nooit per ongeluk gratis
 * besteld worden.
 */
export default async function SimulatePaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  if (!useSimulatedPayments()) notFound();

  const { orderId } = await params;
  const order = await getOrder(orderId);
  if (!order) notFound();

  async function markPaid() {
    'use server';
    if (!useSimulatedPayments()) return;

    const result = await markOrderPaid(orderId, { id: `sim_${orderId}`, method: 'ideal' });
    if (result?.firstTime) {
      const current = await getOrder(orderId);
      const cartId = (current as unknown as { cartId?: string } | null)?.cartId;
      if (cartId) await emptyCartById(cartId).catch(() => {});
      if (result.order) await sendOrderMails(result.order);
    }
    redirect(`/bedankt/${orderId}`);
  }

  async function markFailed() {
    'use server';
    if (!useSimulatedPayments()) return;
    await markOrderStatus(orderId, 'failed');
    redirect(`/bedankt/${orderId}`);
  }

  return (
    <Container prose className="py-16 md:py-24">
      <div className="rounded-2xl border-2 border-dashed border-ochre-400 bg-ochre-100 p-7 text-center">
        <p className="font-display text-sm font-bold tracking-[0.14em] text-ochre-700 uppercase">
          Testomgeving
        </p>
        <h1 className="mt-3 text-2xl">Nagebootste betaling</h1>
        <p className="mt-3 text-sand-800">
          Er is nog geen Mollie-sleutel ingesteld, dus dit scherm staat in de plaats van de echte
          betaalpagina. Er wordt niets afgeschreven.
        </p>

        <dl className="mx-auto mt-7 max-w-xs text-left text-sm">
          <div className="flex justify-between border-b border-ochre-300 py-2">
            <dt className="text-sand-700">Bestelling</dt>
            <dd className="font-semibold">{order.orderNumber}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-sand-700">Bedrag</dt>
            <dd className="font-display text-lg font-bold tabular">{formatCents(order.totalCents)}</dd>
          </div>
        </dl>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <form action={markPaid}>
            <Button type="submit" size="lg">
              Betaling laten slagen
            </Button>
          </form>
          <form action={markFailed}>
            <Button type="submit" size="lg" variant="secondary">
              Betaling laten mislukken
            </Button>
          </form>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-sand-600">
        Zet <code className="rounded bg-sand-200 px-1.5 py-0.5">MOLLIE_API_KEY</code> in{' '}
        <code className="rounded bg-sand-200 px-1.5 py-0.5">.env.local</code> om met de echte
        testomgeving van Mollie te werken.
      </p>
    </Container>
  );
}
