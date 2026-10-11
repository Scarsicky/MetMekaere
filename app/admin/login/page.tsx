import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/app/admin/login/login-form';
import { currentAdmin } from '@/lib/admin/auth';
import { IDLE_TIMEOUT_MINUTES } from '@/lib/admin/session-policy';

export const metadata: Metadata = {
  title: 'Inloggen',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reden?: string }>;
}) {
  const admin = await currentAdmin();
  if (admin) redirect('/admin');

  const { next, reden } = await searchParams;
  // Alleen doorsturen binnen de admin; een externe URL zou een open doorstuur
  // opleveren waarmee een phishinglink betrouwbaar lijkt.
  const target = next && /^\/admin(\/|$)/.test(next) ? next : '/admin';

  // Zonder uitleg lijkt een plots inlogscherm op een storing.
  const notice =
    reden === 'inactief'
      ? `Je bent uitgelogd omdat het ${IDLE_TIMEOUT_MINUTES} minuten stil bleef.`
      : reden === 'verlopen'
        ? 'Je sessie is verlopen. Log opnieuw in om verder te gaan.'
        : null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-sand-100 px-5 py-16">
      <LoginForm next={target} notice={notice} />
    </div>
  );
}
