import Link from 'next/link';

import { AdminCard, AdminPage, StatTile, StatusPill } from '@/components/admin/ui';
import { ADMIN_NAV } from '@/lib/admin/navigation';
import { countTodo, runHealthChecks } from '@/lib/admin/health';
import { getAllProductsForAdmin } from '@/lib/data/catalog';
import { formatCents } from '@/lib/money';
import { listOrders } from '@/lib/shop/orders';
import { cn, formatDateNL } from '@/lib/utils';
import type { Order } from '@/types';

export const metadata = { title: 'Overzicht' };

/** Hoe een orderstatus eruitziet in het overzicht. */
export const ORDER_STATUS_LABELS: Record<Order['status'], { label: string; tone: 'green' | 'amber' | 'red' | 'grey' | 'blue' }> = {
  pending: { label: 'Wacht op betaling', tone: 'amber' },
  paid: { label: 'Betaald', tone: 'green' },
  shipped: { label: 'Verstuurd', tone: 'blue' },
  failed: { label: 'Mislukt', tone: 'red' },
  expired: { label: 'Verlopen', tone: 'grey' },
  canceled: { label: 'Geannuleerd', tone: 'grey' },
  refunded: { label: 'Terugbetaald', tone: 'grey' },
};

export default async function AdminDashboard() {
  const [orders, products] = await Promise.all([listOrders(200), getAllProductsForAdmin()]);
  const checks = runHealthChecks();
  const todo = countTodo(checks);

  const toShip = orders.filter((o) => o.status === 'paid');
  const recent = orders.slice(0, 8);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const revenueThisMonth = orders
    .filter((o) => (o.status === 'paid' || o.status === 'shipped') && o.createdAt >= startOfMonth.getTime())
    .reduce((sum, o) => sum + o.totalCents, 0);

  const lowStock = products.filter(
    (p) =>
      p.status === 'active' &&
      p.stock.tracked &&
      !p.stock.allowBackorder &&
      p.stock.quantity <= p.stock.lowStockThreshold,
  );

  return (
    <AdminPage
      title="Overzicht"
      description="Wat er binnenkomt en wat er aandacht vraagt."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Klaar om te versturen"
          value={String(toShip.length)}
          hint={toShip.length ? 'Betaald, nog niet verstuurd' : 'Alles is de deur uit'}
          href="/admin/bestellingen?status=paid"
          tone={toShip.length ? 'attention' : 'plain'}
        />
        <StatTile
          label="Omzet deze maand"
          value={formatCents(revenueThisMonth)}
          hint="Betaalde bestellingen"
        />
        <StatTile
          label="Bijna op"
          value={String(lowStock.length)}
          hint={lowStock.length ? lowStock.map((p) => p.title).slice(0, 2).join(', ') : 'Voorraad is op orde'}
          href="/admin/producten"
          tone={lowStock.length ? 'attention' : 'plain'}
        />
        <StatTile
          label="Producten online"
          value={String(products.filter((p) => p.status === 'active').length)}
          hint={`${products.length} in totaal`}
          href="/admin/producten"
        />
      </div>

      {/* Opstartlijst: alleen tonen zolang er iets te doen is. */}
      {checks.some((c) => c.status !== 'ok') ? (
        <AdminCard
          className="mt-6"
          title={todo > 0 ? 'Nog te regelen' : 'Bijna klaar om open te gaan'}
          description="Zonder deze punten werkt de site wel, maar nog niet helemaal."
        >
          <ul className="flex flex-col gap-3">
            {checks
              .filter((check) => check.status !== 'ok')
              .map((check) => (
                <li
                  key={check.id}
                  className={cn(
                    'rounded-xl border px-4 py-3.5',
                    check.status === 'todo' ? 'border-brand-200 bg-brand-50' : 'border-ochre-300 bg-ochre-100',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={check.status === 'todo' ? 'red' : 'amber'}>
                      {check.status === 'todo' ? 'Nog doen' : 'Let op'}
                    </StatusPill>
                    <span className="font-display font-semibold">{check.label}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-sand-800">{check.detail}</p>
                  {check.action ? (
                    <p className="mt-1 text-sm text-sand-600">{check.action}</p>
                  ) : null}
                </li>
              ))}
          </ul>
        </AdminCard>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <AdminCard title="Laatste bestellingen">
          {recent.length ? (
            <ul className="flex flex-col gap-1">
              {recent.map((order) => {
                const status = ORDER_STATUS_LABELS[order.status];
                return (
                  <li key={order.id}>
                    <Link
                      href={`/admin/bestellingen/${order.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2.5 transition-colors hover:bg-sand-100"
                    >
                      <span className="font-display font-semibold">{order.orderNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-sand-700">
                        {order.customer.name}
                      </span>
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      <span className="font-semibold tabular">{formatCents(order.totalCents)}</span>
                      <span className="w-full text-xs text-sand-500 sm:w-auto">
                        {formatDateNL(order.createdAt, { day: 'numeric', month: 'short' })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sand-600">
              Er zijn nog geen bestellingen. Zodra de eerste binnenkomt, staat hij hier.
            </p>
          )}
        </AdminCard>

        <AdminCard title="Snel naar">
          <ul className="grid gap-1.5">
            {ADMIN_NAV.flatMap((group) => group.items).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-sand-100"
                >
                  <span aria-hidden className="text-lg">
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display font-semibold text-sand-900">{item.label}</span>
                    <span className="block text-sm text-sand-600">{item.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>
    </AdminPage>
  );
}
