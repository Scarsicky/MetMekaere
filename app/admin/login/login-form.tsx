'use client';

import { signInWithEmailAndPassword } from 'firebase/auth';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();

  const configured = isClientFirebaseConfigured();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');

    try {
      const credential = await signInWithEmailAndPassword(clientAuth(), email, password);
      const idToken = await credential.user.getIdToken();

      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };

      if (!result.ok) {
        setError(result.error ?? 'Inloggen is niet gelukt.');
        setBusy(false);
        return;
      }

      router.replace(next);
      router.refresh();
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

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="text-center">
        <Image src="/logo.png" alt="" width={512} height={512} className="mx-auto size-16" />
        <h1 className="mt-4 text-2xl">Beheer</h1>
        <p className="mt-1.5 text-sand-600">Log in om de website bij te werken.</p>
      </div>

      {!configured ? (
        <p role="alert" className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
          De Firebase-instellingen ontbreken. Zet de <code>NEXT_PUBLIC_FIREBASE_*</code> variabelen in{' '}
          <code>.env.local</code>.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
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

          {error ? (
            <p role="alert" className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" fullWidth disabled={busy}>
            {busy ? 'Even geduld…' : 'Inloggen'}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-sand-600">
        Nog geen toegang? Vraag of je account beheerrechten krijgt met{' '}
        <code className="rounded bg-sand-200 px-1.5 py-0.5">npm run admin:grant</code>.
      </p>
    </div>
  );
}
