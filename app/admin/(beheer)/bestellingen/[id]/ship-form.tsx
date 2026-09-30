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
import { ADMIN_INITIAL_STATE, type AdminActionState } from '@/lib/admin/action-state';
import { canSyncWithPayment } from '@/lib/shop/order-rules';
import { cn } from '@/lib/utils';
import type { Order } from '@/types';

function Submit({
  label,
  pendingLabel = 'Bezig…',
  variant = 'primary',
}: {
  label: string;
  pendingLabel?: string;
  variant?: 'primary' | 'danger';
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? pendingLabel : label}
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
        {/*
          Ook bij een mislukte of afgebroken bestelling bruikbaar. Mollie stuurt
          de klant na zo'n poging terug naar het keuzescherm in plaats van naar
          ons, zodat hij een andere methode kan proberen — de status komt dan
          via de webhook binnen. Blijft die om wat voor reden ook uit, dan haal
          je hem hiermee zelf op.
        */}
        {canSyncWithPayment(order) && order.molliePaymentId ? (
          <ActionButton
            action={refreshPaymentAction}
            label="Betaalstatus ophalen"
            pendingLabel="Ophalen…"
            fields={{ id: order.id }}
          />
        ) : null}

        {!isClosed ? (
          <CloseOrderForm
            orderId={order.id}
            action={cancelOrderAction}
            label="Annuleren"
            pendingLabel="Annuleren…"
            summary="Bestelling annuleren"
            confirm="Deze bestelling annuleren? Als de voorraad al is afgeboekt, wordt die teruggezet."
            note="De klant krijgt bericht dat de bestelling niet doorgaat — geen nieuwe bestelbevestiging."
          />
        ) : null}

        {order.status === 'paid' || order.status === 'shipped' ? (
          <CloseOrderForm
            orderId={order.id}
            action={refundOrderAction}
            label="Markeer als terugbetaald"
            pendingLabel="Bijwerken…"
            summary="Terugbetaling vastleggen"
            confirm="Weet je het zeker? Het geld stort je zelf terug in Mollie; hier wordt alleen de administratie bijgewerkt en de voorraad teruggezet."
            note="Het bedrag stort je zelf terug in Mollie. Hier leg je alleen vast dát het gebeurt."
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Een bestelling afsluiten: annuleren of als terugbetaald markeren.
 *
 * Ingeklapt, want dit is niet wat je dagelijks doet. Openklappen geeft ruimte
 * voor een reden die de klant te zien krijgt, en de keuze om helemaal niet te
 * mailen — bijvoorbeeld bij een testbestelling of een dubbele order.
 */
function CloseOrderForm({
  orderId,
  action,
  label,
  pendingLabel,
  summary,
  confirm,
  note,
}: {
  orderId: string;
  action: (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  label: string;
  pendingLabel: string;
  summary: string;
  confirm: string;
  note: string;
}) {
  const [state, formAction] = useActionState(action, ADMIN_INITIAL_STATE);
  const router = useRouter();
  const reasonId = useId();

  useEffect(() => {
    if (state.status === 'ok') router.refresh();
  }, [state, router]);

  return (
    <details className="w-full rounded-xl border border-sand-300 bg-white">
      <summary className="cursor-pointer list-none px-4 py-3 font-display text-sm font-semibold text-brand-700 marker:hidden">
        {summary} ▾
      </summary>

      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm(confirm)) event.preventDefault();
        }}
        className="flex flex-col gap-4 border-t border-sand-200 px-4 py-4"
      >
        <input type="hidden" name="id" value={orderId} />

        <p className="text-sm text-sand-600">{note}</p>

        <Field
          label="Reden voor de klant"
          htmlFor={reasonId}
          optional
          hint="Komt in de mail te staan. Laat leeg als je niets wilt toelichten."
        >
          <Input id={reasonId} name="reason" placeholder="Helaas is dit ontwerp uitverkocht." />
        </Field>

        <Checkbox
          name="notify"
          value="ja"
          defaultChecked
          label="De klant een mailtje sturen"
          description="Uitvinken bij een testbestelling of een dubbele order."
        />

        <div>
          <Submit label={label} pendingLabel={pendingLabel} variant="danger" />
        </div>
      </form>
    </details>
  );
}

