import type { Metadata } from 'next';

import { AdminShell } from '@/components/admin/admin-shell';
import { requireAdmin } from '@/lib/admin/auth';

export const metadata: Metadata = {
  title: { default: 'Beheer', template: '%s · Beheer' },
  robots: { index: false, follow: false },
};

/**
 * Elke pagina onder deze groep is afgeschermd. `requireAdmin` stuurt door naar
 * het inlogscherm als er geen geldige sessie is; de server rendert dan niets
 * van de inhoud, dus er lekt ook niets.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
