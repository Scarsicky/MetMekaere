'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useId } from 'react';
import { useFormStatus } from 'react-dom';

import { applyDiscountAction } from '@/app/actions/cart';
import { CART_INITIAL_STATE } from '@/lib/shop/action-state';
import { cn } from '@/lib/utils';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-xl border border-sand-300 bg-white px-4 py-2.5 font-display text-sm font-semibold text-sand-900 transition-colors hover:border-sand-400 disabled:opacity-60"
    >
      {pending ? '…' : label}
    </button>
  );
}

/**
 * Kortingscode invoeren. De code wordt op de server gecontroleerd en
 * toegepast; de foutmelding die terugkomt is er een die de klant iets zegt
 * ('deze code is verlopen'), geen technische melding.
 */
export function DiscountCodeForm({
  currentCode,
  appliedLabel,
  error,
}: {
  currentCode?: string | null;
  appliedLabel?: string;
  error?: string;
}) {
  const [state, action] = useActionState(applyDiscountAction, CART_INITIAL_STATE);
  const router = useRouter();
  const id = useId();

  useEffect(() => {
    if (state.status !== 'idle') router.refresh();
  }, [state, router]);

  const applied = Boolean(currentCode && appliedLabel && !error);
  const message = state.status === 'error' ? state.message : error;

  if (applied) {
    return (
      <form action={action} className="flex items-center justify-between gap-3 rounded-xl bg-sage-100 px-4 py-3">
        <span className="text-sm">
          <span className="font-display font-semibold text-sage-900">{currentCode}</span>
          <span className="ml-2 text-sage-800">{appliedLabel}</span>
        </span>
        <input type="hidden" name="code" value="" />
        <button
          type="submit"
          className="text-sm text-sage-800 underline underline-offset-2 hover:text-brand-700"
        >
          Verwijderen
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor={id} className="font-display text-sm font-semibold text-sand-800">
        Kortingscode
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          name="code"
          type="text"
          defaultValue={currentCode ?? ''}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Heb je een code?"
          aria-invalid={Boolean(message) || undefined}
          aria-describedby={message ? `${id}-error` : undefined}
          className={cn(
            'w-full rounded-xl border bg-white px-3.5 py-2.5 text-base uppercase placeholder:normal-case placeholder:text-sand-500 focus:outline-none',
            message ? 'border-brand-500 bg-brand-50' : 'border-sand-300 focus:border-brand-400',
          )}
        />
        <Submit label="Toepassen" />
      </div>
      {message ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-brand-700">
          {message}
        </p>
      ) : null}
    </form>
  );
}
