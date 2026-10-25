'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

import { resyncNewsletterAction } from '@/app/admin/actions/newsletter';
import { Button } from '@/components/ui/button';
import { ADMIN_INITIAL_STATE } from '@/lib/admin/action-state';
import { cn } from '@/lib/utils';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="secondary" disabled={pending}>
      {pending ? 'Bezig…' : label}
    </Button>
  );
}

/**
 * Opnieuw proberen wat nog niet in de mailinglijst staat.
 *
 * Staat bij de melding over mislukte inschrijvingen, want daar kijk je als er
 * iets aan de hand is.
 */
export function ResyncButton({ label }: { label: string }) {
  const [state, action] = useActionState(resyncNewsletterAction, ADMIN_INITIAL_STATE);
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'ok') router.refresh();
  }, [state, router]);

  return (
    <div>
      <form action={action}>
        <Submit label={label} />
      </form>

      {state.message ? (
        <p
          role={state.status === 'error' ? 'alert' : 'status'}
          className={cn(
            'mt-3 rounded-xl px-4 py-3 text-sm font-medium',
            state.status === 'error' ? 'bg-brand-50 text-brand-800' : 'bg-sage-100 text-sage-900',
          )}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
