import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ORDER_STATUS_LABELS } from '@/app/admin/(beheer)/page';
import { OrderActions } from '@/app/admin/(beheer)/bestellingen/[id]/ship-form';
import { AdminCard, AdminPage, StatusPill } from '@/components/admin/ui';
import { formatCents } from '@/lib/money';
import { getOrder } from '@/lib/shop/orders';
import { formatDateNL } from '@/lib/utils';
import type { Address } from '@/types';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  return { title: order?.orderNumber ?? 'Bestelling' };
}

function AddressBlock({ address, title }: { address: Address; title: string }) {
  return (
    <div>
      <h3 className="font-display text-sm font-bold tracking-wide text-sand-600 uppercase">{title}</h3>
      <p className="mt-2 leading-relaxed text-sand-900">
        {address.name}
        {address.company ? (
          <>
            <br />
            {address.company}
          </>
        ) : null}
        <br />
        {address.street} {address.houseNumber}
        {address.houseNumberAddition}
        <br />
        {address.postalCode} {address.city}
        {address.country !== 'NL' ? (
          <>
            <br />
            {address.country}
          </>
        ) : null}
      </p>
    </div>
  );
}

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const status = ORDER_STATUS_LABELS[order.status];
  const oversold = (order as unknown as { oversold?: { title: string; shortBy: number }[] }).oversold;

  return (
    <AdminPage
      title={order.orderNumber}
      breadcrumb={{ label: 'Alle bestellingen', href: '/admin/bestellingen' }}
      description={`Besteld op ${formatDateNL(order.createdAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      actions={<StatusPill tone={status.tone}>{status.label}</StatusPill>}
    >
      {oversold?.length ? (
        <p role="alert" className="mb-5 rounded-xl bg-brand-50 px-4 py-3.5 text-sm text-brand-800">
          <strong className="font-display">Let op:</strong> deze bestelling is betaald terwijl er niet
          genoeg voorraad was van{' '}
          {oversold.map((item) => `${item.title} (${item.shortBy} tekort)`).join(', ')}. Neem even
          contact op met de klant over de levertijd.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-6">
          <AdminCard title="Wat er besteld is">
            <ul className="divide-y divide-sand-200">
              {order.lines.map((line) => (
                <li
                  key={`${line.productId}-${line.addons.map((a) => a.addonId).join('-')}`}
                  className="flex gap-3 py-3 first:pt-0"
                >
                  <span className="font-display font-semibold tabular">{line.qty}×</span>
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/admin/producten/${line.productId}`}
                      className="font-medium text-sand-900 hover:text-brand-700"
                    >
                      {line.title}
                    </Link>
                    {line.addons.length ? (
                      <span className="block text-sm text-sand-600">
                        {line.addons
                          .map((a) => (a.qty > 1 ? `${a.label} ×${a.qty}` : a.label))
                          .join(', ')}
                      </span>
                    ) : null}
                    <span className="block text-sm text-sand-500 tabular">
                      {formatCents(line.tierUnitPriceCents)} per stuk
                      {line.tierUnitPriceCents !== line.unitPriceCents
                        ? ` (normaal ${formatCents(line.unitPriceCents)})`
                        : ''}
                    </span>
                  </span>
                  <span className="font-semibold whitespace-nowrap tabular">
                    {formatCents(line.lineTotalCents)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 flex flex-col gap-2 border-t border-sand-300 pt-4 text-sm">
              <Row label="Subtotaal" value={formatCents(order.grossSubtotalCents)} />
              {order.tierDiscountCents > 0 ? (
                <Row label="Staffelvoordeel" value={`− ${formatCents(order.tierDiscountCents)}`} />
              ) : null}
              {order.discountCents > 0 ? (
                <Row
                  label={`Kortingscode ${order.discountCode ?? ''}`}
                  value={`− ${formatCents(order.discountCents)}`}
                />
              ) : null}
              <Row
                label={`Verzending · ${order.shippingMethod}`}
                value={order.shippingCents === 0 ? 'Gratis' : formatCents(order.shippingCents)}
              />
              <div className="flex justify-between border-t border-sand-300 pt-3">
                <dt className="font-display text-base font-bold">Totaal</dt>
                <dd className="font-display text-base font-bold tabular">
                  {formatCents(order.totalCents)}
                </dd>
              </div>
              {order.vatBreakdown.map((vat) => (
                <Row
                  key={vat.rate}
                  label={`Waarvan btw ${Math.round(vat.rate * 100)}%`}
                  value={formatCents(vat.vatCents)}
                  muted
                />
              ))}
            </dl>
          </AdminCard>

          {order.notes ? (
            <AdminCard title="Opmerking van de klant">
              <p className="whitespace-pre-line text-sand-800">{order.notes}</p>
            </AdminCard>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <AdminCard title="Afhandelen">
            <OrderActions order={order} />
          </AdminCard>

          <AdminCard title="Klant">
            <div className="flex flex-col gap-4 text-sm">
              <div>
                <p className="font-medium text-sand-900">{order.customer.name}</p>
                <a
                  href={`mailto:${order.customer.email}`}
                  className="text-brand-700 underline underline-offset-2"
                >
                  {order.customer.email}
                </a>
                {order.customer.phone ? (
                  <p className="text-sand-700">{order.customer.phone}</p>
                ) : null}
              </div>

              <AddressBlock address={order.shipping} title="Bezorgadres" />
              {order.billing ? <AddressBlock address={order.billing} title="Factuuradres" /> : null}

              <div className="border-t border-sand-200 pt-3 text-sand-600">
                <p>
                  Nieuwsbrief: {order.newsletterOptIn ? 'ja, aangemeld' : 'nee'}
                </p>
                {order.molliePaymentMethod ? (
                  <p>Betaald met {order.molliePaymentMethod}</p>
                ) : null}
                {order.paidAt ? <p>Betaald op {formatDateNL(order.paidAt)}</p> : null}
                {order.shippedAt ? <p>Verstuurd op {formatDateNL(order.shippedAt)}</p> : null}
                {order.trackingCode ? <p>Track &amp; Trace: {order.trackingCode}</p> : null}
                {order.molliePaymentId ? (
                  <p className="mt-1 font-mono text-xs break-all">{order.molliePaymentId}</p>
                ) : null}
              </div>
            </div>
          </AdminCard>
        </div>
      </div>
    </AdminPage>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={muted ? 'text-sand-500' : 'text-sand-700'}>{label}</dt>
      <dd className={muted ? 'text-sand-500 tabular' : 'text-sand-900 tabular'}>{value}</dd>
    </div>
  );
}
