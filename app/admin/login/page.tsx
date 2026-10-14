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

  /*
   * Zonder uitleg lijkt een plots inlogscherm op een storing — en bij het
   * uitzoeken van een inlogprobleem in Safari bleek dat ook voor mij: er was
   * geen enkel verschil te zien tussen 'de cookie kwam niet aan' en 'je sessie
   * is verlopen'. Die vier redenen vragen om vier verschillende oplossingen,
   * dus ze krijgen hier elk hun eigen zin.
   */
  const notice =
    reden === 'inactief'
      ? `Je bent uitgelogd omdat het ${IDLE_TIMEOUT_MINUTES} minuten stil bleef.`
      : reden === 'te-lang-stil'
        ? `Je sessie is afgesloten omdat het ${IDLE_TIMEOUT_MINUTES} minuten stil bleef.`
        : reden === 'geen-cookie'
          ? 'Je browser stuurde geen sessie mee. Dat gebeurt als cookies geblokkeerd zijn — kijk bij Instellingen → Privacy of cookies van deze site zijn toegestaan.'
          : reden === 'ongeldig'
            ? 'Je sessie was niet meer geldig. Log opnieuw in om verder te gaan.'
            : reden === 'geen-rechten'
              ? 'Dit account is ingelogd, maar heeft geen beheerrechten.'
              : null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-sand-100 px-5 py-16">
      <LoginForm next={target} notice={notice} />
    </div>
  );
}
