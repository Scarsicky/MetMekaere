'use client';

import { useActionState, useEffect, useId } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

import {
  cancelOrderAction,
  markShippedAction,
  refreshPaymentAction,
  refundOrderAction,
} from '@/app/admin/actions/orders';
import { ActionButton } from '@/components/admin/save-form';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input } from '@/components/ui/field';
import { ADMIN_INITIAL_STATE } from '@/lib/admin/action-state';
import { cn } from '@/lib/utils';
import type { Order } from '@/types';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Bezig…' : label}
    </Button>
  );
}

/**
 * De knoppen bij één bestelling.
 *
 * 'Verstuurd' is de handeling die je het vaakst doet, dus die staat vooraan met
 * een veld voor de Track & Trace-code erbij. De rest — opnieuw ophalen,
 * annuleren, terugbetalen — staat eronder en vraagt om bevestiging.
 */
export function OrderActions({ order }: { order: Order }) {
  const [state, action] = useActionState(markShippedAction, ADMIN_INITIAL_STATE);
  const router = useRouter();
  const trackingId = useId();

  useEffect(() => {
    if (state.status === 'ok') router.refresh();
  }, [state, router]);

  const canShip = order.status === 'paid' || order.status === 'shipped';
  const isDone = order.status === 'shipped';
  const isClosed =
    order.status === 'canceled' || order.status === 'refunded' || order.status === 'expired';

  return (
    <div className="flex flex-col gap-5">
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

      {canShip ? (
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={order.id} />

          <Field
            label="Track & Trace-code"
            htmlFor={trackingId}
            optional
            hint="Als je die hebt. De klant krijgt hem in de mail."
          >
            <Input id={trackingId} name="trackingCode" defaultValue={order.trackingCode ?? ''} />
          </Field>

          <Checkbox
            name="notify"
            value="ja"
            defaultChecked
            label="De klant een mailtje sturen"
            description="‘Je bestelling is onderweg’, met de code erbij."
          />

          <div>
            <Submit label={isDone ? 'Gegevens bijwerken' : 'Markeer als verstuurd'} />
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-sand-300 pt-5">
        {order.status === 'pending' ? (
          <ActionButton
            action={refreshPaymentAction}
            label="Betaalstatus ophalen"
            pendingLabel="Ophalen…"
            fields={{ id: order.id }}
          />
        ) : null}

        {!isClosed ? (
          <ActionButton
            action={cancelOrderAction}
            label="Annuleren"
            pendingLabel="Annuleren…"
            variant="danger"
            confirm="Deze bestelling annuleren? Als de voorraad al is afgeboekt, wordt die teruggezet."
            fields={{ id: order.id }}
          />
        ) : null}

        {(order.status === 'paid' || order.status === 'shipped') ? (
          <ActionButton
            action={refundOrderAction}
            label="Markeer als terugbetaald"
            pendingLabel="Bijwerken…"
            variant="danger"
            confirm="Weet je het zeker? Het geld stort je zelf terug in Mollie; hier wordt alleen de administratie bijgewerkt en de voorraad teruggezet."
            fields={{ id: order.id }}
          />
        ) : null}
      </div>
    </div>
  );
}
