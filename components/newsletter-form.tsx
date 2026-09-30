'use client';

import { useActionState, useId } from 'react';
import { useFormStatus } from 'react-dom';

import { subscribeAction } from '@/app/actions/newsletter';
import { NEWSLETTER_INITIAL_STATE } from '@/lib/shop/action-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { cn } from '@/lib/utils';

function SubmitButton({ variant }: { variant: 'primary' | 'secondary' }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className="shrink-0">
      {pending ? 'Momentje…' : 'Hou me op de hoogte'}
    </Button>
  );
}

/**
 * Inschrijven op de nieuwsbrief. Werkt ook zonder JavaScript: het is een echt
 * formulier dat naar een server action gaat.
 *
 * `source` vertelt later waar iemand is binnengekomen — footer, checkout of
 * de Community-pagina.
 */
export function NewsletterForm({
  source,
  tone = 'light',
  withName = false,
  className,
}: {
  source: string;
  tone?: 'light' | 'dark';
  withName?: boolean;
  className?: string;
}) {
  const [state, action] = useActionState(subscribeAction, NEWSLETTER_INITIAL_STATE);
  const emailId = useId();
  const nameId = useId();

  if (state.status === 'ok') {
    return (
      <p
        role="status"
        className={cn(
          'rounded-2xl px-4 py-3.5 font-display font-semibold',
          tone === 'dark' ? 'bg-white/15 text-sand-50' : 'bg-sage-200 text-sage-900',
          className,
        )}
      >
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-3 sm:flex-row">
        {withName ? (
          <>
            <label htmlFor={nameId} className="sr-only">
              Je naam
            </label>
            <Input
              id={nameId}
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Je naam"
              className="sm:max-w-48"
            />
          </>
        ) : null}

        <label htmlFor={emailId} className="sr-only">
          Je e-mailadres
        </label>
        <Input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="jouw@email.nl"
          aria-invalid={state.status === 'error' || undefined}
          aria-describedby={state.status === 'error' ? `${emailId}-error` : undefined}
        />

        <SubmitButton variant={tone === 'dark' ? 'secondary' : 'primary'} />
      </div>

      {/* Honeypot: verborgen voor mensen, zichtbaar voor bots. */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden">
        <label htmlFor={`${emailId}-website`}>Laat dit veld leeg</label>
        <input id={`${emailId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <input type="hidden" name="source" value={source} />

      {state.status === 'error' ? (
        <p
          id={`${emailId}-error`}
          role="alert"
          className={cn('text-sm font-medium', tone === 'dark' ? 'text-brand-100' : 'text-brand-700')}
        >
          {state.message}
        </p>
      ) : null}

      <p className={cn('text-xs', tone === 'dark' ? 'text-sand-200/80' : 'text-sand-600')}>
        Af en toe een mail over nieuwe kaarten en activiteiten. Uitschrijven kan altijd.
      </p>
    </form>
  );
}
