'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import type { AdminActionState } from '@/lib/admin/action-state';
import { ADMIN_INITIAL_STATE } from '@/lib/admin/action-state';
import { cn } from '@/lib/utils';

function SaveBar({
  label,
  extra,
  dirtyHint,
}: {
  label: string;
  extra?: ReactNode;
  dirtyHint?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-sand-300 bg-sand-100/95 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-sand-600">{dirtyHint}</p>
        <div className="flex flex-wrap gap-2">
          {extra}
          <Button type="submit" disabled={pending}>
            {pending ? 'Opslaan…' : label}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Een beheerformulier met een vaste opslaanbalk onderaan.
 *
 * Na het opslaan verschijnt een bevestiging en wordt de pagina ververst, zodat
 * je ziet wat er daadwerkelijk is opgeslagen — niet alleen wat je hebt getypt.
 */
export function SaveForm({
  action,
  children,
  saveLabel = 'Opslaan',
  extraActions,
  dirtyHint,
  onSaved,
  className,
}: {
  action: (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  children: ReactNode;
  saveLabel?: string;
  extraActions?: ReactNode;
  dirtyHint?: string;
  /** Waar naartoe na opslaan; standaard blijft de pagina staan. */
  onSaved?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, ADMIN_INITIAL_STATE);
  const router = useRouter();

  useEffect(() => {
    if (state.status !== 'ok') return;
    if (onSaved) router.push(onSaved);
    else router.refresh();
  }, [state, onSaved, router]);

  useEffect(() => {
    if (state.status !== 'error') return;
    document.querySelector('[role="alert"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [state]);

  return (
    <form action={formAction} className={cn('flex flex-col gap-5', className)}>
      {state.message ? (
        <p
          role={state.status === 'error' ? 'alert' : 'status'}
          className={cn(
            'rounded-xl px-4 py-3 text-sm font-medium',
            state.status === 'error' ? 'bg-brand-50 text-brand-800' : 'bg-sage-100 text-sage-900',
          )}
        >
          {state.message}
        </p>
      ) : null}

      {children}

      <SaveBar label={saveLabel} extra={extraActions} dirtyHint={dirtyHint} />
    </form>
  );
}

/**
 * Losse actieknop met bevestiging — bijvoorbeeld 'verwijderen' of
 * 'markeer als verzonden'.
 */
export function ActionButton({
  action,
  label,
  pendingLabel,
  confirm,
  variant = 'secondary',
  fields,
}: {
  action: (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  label: string;
  pendingLabel?: string;
  /** Vraagt eerst om bevestiging met deze tekst. */
  confirm?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  fields?: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, ADMIN_INITIAL_STATE);
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'ok') {
      if (state.redirectTo) router.push(state.redirectTo);
      else router.refresh();
    }
  }, [state, router]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className="contents"
    >
      {Object.entries(fields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitOnly label={label} pendingLabel={pendingLabel} variant={variant} />
    </form>
  );
}

function SubmitOnly({
  label,
  pendingLabel,
  variant,
}: {
  label: string;
  pendingLabel?: string;
  variant: 'primary' | 'secondary' | 'danger';
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? (pendingLabel ?? 'Even geduld…') : label}
    </Button>
  );
}
