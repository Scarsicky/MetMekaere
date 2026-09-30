import Link from 'next/link';

import { ORDER_STATUS_LABELS } from '@/app/admin/(beheer)/page';
import { AdminEmpty, AdminList, AdminListRow, AdminPage, StatusPill } from '@/components/admin/ui';
import { formatCents } from '@/lib/money';
import { listOrders } from '@/lib/shop/orders';
import { formatDateNL } from '@/lib/utils';
import type { OrderStatus } from '@/types';

export const metadata = { title: 'Bestellingen' };

const FILTERS: { value: string; label: string; matches: (status: OrderStatus) => boolean }[] = [
  { value: '', label: 'Alles', matches: () => true },
  { value: 'paid', label: 'Te versturen', matches: (s) => s === 'paid' },
  { value: 'shipped', label: 'Verstuurd', matches: (s) => s === 'shipped' },
  { value: 'pending', label: 'Wacht op betaling', matches: (s) => s === 'pending' },
  {
    value: 'niet-gelukt',
    label: 'Niet doorgegaan',
    matches: (s) => s === 'failed' || s === 'expired' || s === 'canceled' || s === 'refunded',
  },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [orders, params] = await Promise.all([listOrders(300), searchParams]);

  const active = FILTERS.find((f) => f.value === (params.status ?? '')) ?? FILTERS[0];
  const visible = orders.filter((order) => active.matches(order.status));

  const counts = Object.fromEntries(
    FILTERS.map((filter) => [filter.value, orders.filter((o) => filter.matches(o.status)).length]),
  );

  return (
    <AdminPage
      title="Bestellingen"
      description="Betaalde bestellingen staan bovenaan bij ‘te versturen’. Klik er een aan om het adres te zien en hem af te melden."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `/admin/bestellingen?status=${filter.value}` : '/admin/bestellingen'}
            className={
              active.value === filter.value
                ? 'rounded-full bg-sand-800 px-3.5 py-1.5 font-display text-sm font-semibold text-sand-50'
                : 'rounded-full border border-sand-300 bg-white px-3.5 py-1.5 font-display text-sm font-semibold text-sand-700 transition-colors hover:border-sand-400'
            }
          >
            {filter.label} ({counts[filter.value] ?? 0})
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <AdminEmpty
          title={orders.length ? 'Niets in deze lijst' : 'Nog geen bestellingen'}
          description={
            orders.length
              ? 'Kies een ander filter om meer te zien.'
              : 'Zodra de eerste bestelling binnenkomt, staat hij hier — en krijg je er een mail van.'
          }
        />
      ) : (
        <AdminList>
          {visible.map((order) => {
            const status = ORDER_STATUS_LABELS[order.status];
            const itemCount = order.lines.reduce((sum, line) => sum + line.qty, 0);

            return (
              <AdminListRow key={order.id} href={`/admin/bestellingen/${order.id}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-sand-900">
                    {order.orderNumber}
                    <span className="ml-2 font-normal text-sand-600">{order.customer.name}</span>
                  </p>
                  <p className="truncate text-sm text-sand-600">
                    {itemCount} {itemCount === 1 ? 'artikel' : 'artikelen'} · {order.shippingMethod}
                    {order.shipping.city ? ` naar ${order.shipping.city}` : ''}
                  </p>
                </div>

                <StatusPill tone={status.tone}>{status.label}</StatusPill>

                <span className="font-semibold whitespace-nowrap tabular">
                  {formatCents(order.totalCents)}
                </span>

                <span className="w-full text-sm text-sand-500 sm:w-auto sm:text-right">
                  {formatDateNL(order.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </AdminListRow>
            );
          })}
        </AdminList>
      )}
    </AdminPage>
  );
}
