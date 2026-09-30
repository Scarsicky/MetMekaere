'use client';

import { useActionState, useEffect, useId } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

import { seedStarterContentAction, testMailAction } from '@/app/admin/actions/setup';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input } from '@/components/ui/field';
import { ADMIN_INITIAL_STATE } from '@/lib/admin/action-state';
import { cn } from '@/lib/utils';

function Result({ state }: { state: { status: string; message?: string } }) {
  if (!state.message) return null;
  return (
    <p
      role={state.status === 'error' ? 'alert' : 'status'}
      className={cn(
        'mt-4 rounded-xl px-4 py-3 text-sm font-medium',
        state.status === 'error' ? 'bg-brand-50 text-brand-800' : 'bg-sage-100 text-sage-900',
      )}
    >
      {state.message}
    </p>
  );
}

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

/**
 * De startinhoud plaatsen.
 *
 * Bestaande documenten blijven met rust, tenzij je het vinkje zet. Dat vinkje
 * staat er niet voor de sier: ermee overschrijf je teksten die je zelf hebt
 * aangepast, dus het vraagt om een bevestiging.
 */
export function SeedButton({ hasContent }: { hasContent: boolean }) {
  const [state, action] = useActionState(seedStarterContentAction, ADMIN_INITIAL_STATE);
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'ok') router.refresh();
  }, [state, router]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        const form = event.currentTarget;
        const force = (form.elements.namedItem('force') as HTMLInputElement | null)?.checked;
        if (
          force &&
          !window.confirm(
            'Weet je het zeker? Hiermee worden teksten, producten en instellingen teruggezet naar de meegeleverde versie. Eigen aanpassingen gaan verloren.',
          )
        ) {
          event.preventDefault();
        }
      }}
      className="flex flex-col gap-4"
    >
      {hasContent ? (
        <Checkbox
          name="force"
          value="ja"
          label="Ook bestaande inhoud overschrijven"
          description="Zet alles terug naar de meegeleverde versie. Je eigen teksten en prijzen raak je dan kwijt."
        />
      ) : null}

      <div>
        <Submit
          label={hasContent ? 'Ontbrekende inhoud aanvullen' : 'Startinhoud plaatsen'}
          pendingLabel="Bezig…"
        />
      </div>

      <Result state={state} />
    </form>
  );
}

/** Controleert de mailinstellingen, en stuurt desgewenst een testmail. */
export function MailTestForm({ defaultTo }: { defaultTo: string }) {
  const [state, action] = useActionState(testMailAction, ADMIN_INITIAL_STATE);
  const id = useId();

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        label="Testmail sturen naar"
        htmlFor={id}
        optional
        hint="Laat leeg om alleen de verbinding te controleren."
      >
        <Input id={id} name="to" type="email" defaultValue={defaultTo} />
      </Field>

      <div>
        <Submit label="Mail controleren" pendingLabel="Verbinden…" />
      </div>

      <Result state={state} />
    </form>
  );
}
