import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/app/admin/login/login-form';
import { currentAdmin } from '@/lib/admin/auth';

export const metadata: Metadata = {
  title: 'Inloggen',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const admin = await currentAdmin();
  if (admin) redirect('/admin');

  const { next } = await searchParams;
  // Alleen doorsturen binnen de admin; een externe URL zou een open doorstuur
  // opleveren waarmee een phishinglink betrouwbaar lijkt.
  const target = next && /^\/admin(\/|$)/.test(next) ? next : '/admin';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-sand-100 px-5 py-16">
      <LoginForm next={target} />
    </div>
  );
}
