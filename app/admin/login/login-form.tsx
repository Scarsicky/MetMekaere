'use client';

import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import Image from 'next/image';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { clientAuth, isClientFirebaseConfigured } from '@/lib/firebase/client';

/**
 * Inloggen op de admin.
 *
 * Firebase doet het inloggen in de browser; het token dat daaruit komt gaat
 * één keer naar de server, die er een sessiecookie van maakt. Daarna zit er
 * geen token meer in de browser.
 */
export function LoginForm({ next, notice }: { next: string; notice?: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailId = useId();
  const passwordId = useId();

  const configured = isClientFirebaseConfigured();

  /**
   * Van 'Firebase kent je' naar 'de server kent je'.
   *
   * Beide inlogmanieren komen hier uit: het token gaat één keer naar de server,
   * die controleert of dit account beheerder is en er een sessiecookie van
   * maakt. Daarna zit er geen token meer in de browser.
   */
  async function completeSignIn(user: User): Promise<void> {
    const idToken = await user.getIdToken();

    const response = await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      credentials: 'same-origin',
    });
    const result = (await response.json()) as { ok: boolean; error?: string };

    if (!result.ok) {
      /*
       * Firebase kent je wel, maar je mag niet in het beheer. Dan ook bij
       * Firebase weer uitloggen — anders blijf je half ingelogd achter en
       * gebeurt er bij een volgende poging iets onverwachts.
       */
      await signOut(clientAuth()).catch(() => {});
      setError(result.error ?? 'Inloggen is niet gelukt.');
      setBusy(false);
      return;
    }

    /*
     * Met opzet een volledige paginalading en geen navigatie binnen de app.
     *
     * De sessiecookie is net gezet in het antwoord op bovenstaand verzoek.
     * Navigeert de app zelf door, dan gaat het volgende verzoek er soms
     * vandoor voordat de browser die cookie heeft vastgelegd — en dan kom je
     * zonder sessie aan en sta je zo weer op dit scherm. Browsers verschillen
     * daarin. Een echte paginalading kent die wedloop niet.
     */
    window.location.assign(next);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');

    try {
      const credential = await signInWithEmailAndPassword(clientAuth(), email, password);
      await completeSignIn(credential.user);
    } catch (caught) {
      const code = (caught as { code?: string }).code ?? '';
      setError(
        code === 'auth/invalid-credential' ||
          code === 'auth/wrong-password' ||
          code === 'auth/user-not-found'
          ? 'E-mailadres of wachtwoord klopt niet.'
          : code === 'auth/too-many-requests'
            ? 'Te veel pogingen. Wacht even en probeer het opnieuw.'
            : 'Inloggen is niet gelukt. Probeer het nog eens.',
      );
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setBusy(true);

    try {
      const credential = await signInWithPopup(clientAuth(), new GoogleAuthProvider());
      await completeSignIn(credential.user);
    } catch (caught) {
      const code = (caught as { code?: string }).code ?? '';

      // Het venster zelf wegklikken is geen fout; dan gebeurt er gewoon niets.
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setBusy(false);
        return;
      }

      setError(
        code === 'auth/popup-blocked'
          ? 'Je browser blokkeerde het inlogvenster. Sta vensters van deze site toe en probeer het nog eens.'
          : code === 'auth/account-exists-with-different-credential'
            ? 'Dit e-mailadres hoort al bij een andere manier van inloggen. Log in met je wachtwoord.'
            : code === 'auth/unauthorized-domain'
              ? 'Dit webadres staat niet in de lijst met toegestane domeinen in Firebase.'
              : 'Inloggen met Google is niet gelukt. Probeer het nog eens.',
      );
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="text-center">
        <Image src="/logo.png" alt="" width={512} height={512} className="mx-auto size-16" />
        <h1 className="mt-4 text-2xl">Beheer</h1>
        <p className="mt-1.5 text-sand-600">Log in om de website bij te werken.</p>
      </div>

      {notice ? (
        <p role="status" className="mt-6 rounded-xl bg-sand-200 px-4 py-3 text-sm text-sand-800">
          {notice}
        </p>
      ) : null}

      {!configured ? (
        <p role="alert" className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
          De Firebase-instellingen ontbreken. Zet de <code>NEXT_PUBLIC_FIREBASE_*</code> variabelen in{' '}
          <code>.env.local</code>.
        </p>
      ) : (
        <>
          {/* Eén plek voor fouten, want ze kunnen uit beide manieren komen. */}
          {error ? (
            <p
              role="alert"
              className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800"
            >
              {error}
            </p>
          ) : null}

          {/*
            Google staat bovenaan: dat is de manier met een tweede factor erop,
            en daar willen we dat mensen naar grijpen.
          */}
          <Button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            variant="secondary"
            size="lg"
            fullWidth
            className="mt-8"
          >
            <svg viewBox="0 0 18 18" className="size-5" aria-hidden>
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
              />
              <path
                fill="#FBBC05"
                d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
              />
            </svg>
            Inloggen met Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-sm text-sand-500">
            <span className="h-px flex-1 bg-sand-300" />
            of met een wachtwoord
            <span className="h-px flex-1 bg-sand-300" />
          </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="E-mailadres" htmlFor={emailId} required>
            <Input
              id={emailId}
              name="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
            />
          </Field>

          <Field label="Wachtwoord" htmlFor={passwordId} required>
            <Input
              id={passwordId}
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>

          <Button type="submit" size="lg" fullWidth disabled={busy}>
            {busy ? 'Even geduld…' : 'Inloggen'}
          </Button>
        </form>
        </>
      )}

      <p className="mt-8 text-center text-sm text-sand-600">
        Nog geen toegang? Vraag of je account beheerrechten krijgt met{' '}
        <code className="rounded bg-sand-200 px-1.5 py-0.5">npm run admin:grant</code>.
      </p>
    </div>
  );
}
