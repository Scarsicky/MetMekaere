'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import { setShippingAction } from '@/app/actions/cart';
import { checkoutAction } from '@/app/actions/checkout';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Radio, Select, Textarea } from '@/components/ui/field';
import { formatCents } from '@/lib/money';
import { CHECKOUT_INITIAL_STATE } from '@/lib/shop/action-state';
import { cn } from '@/lib/utils';
import type { PricedCart } from '@/types';

function PayButton({ total, simulated }: { total: string; simulated: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth disabled={pending}>
      {pending ? 'Je wordt doorgestuurd…' : simulated ? `Testbetaling ${total}` : `Betalen ${total}`}
    </Button>
  );
}

/** Een adresblok. Twee keer gebruikt: bezorgen en, zo nodig, factuur. */
function AddressFields({
  prefix,
  countries,
  errors,
  defaultCountry,
  onCountryChange,
  legend,
}: {
  prefix: 'shipping' | 'billing';
  countries: { code: string; label: string }[];
  errors: Record<string, string>;
  defaultCountry: string;
  onCountryChange?: (country: string) => void;
  legend: string;
}) {
  const err = (field: string) => errors[`${prefix}.${field}`];

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="sr-only">{legend}</legend>

      <Field label="Naam" htmlFor={`${prefix}-name`} required error={err('name')}>
        <Input
          id={`${prefix}-name`}
          name={`${prefix}.name`}
          autoComplete={prefix === 'shipping' ? 'name' : 'billing name'}
          required
          aria-invalid={Boolean(err('name')) || undefined}
        />
      </Field>

      <Field label="Land" htmlFor={`${prefix}-country`} required error={err('country')}>
        <Select
          id={`${prefix}-country`}
          name={`${prefix}.country`}
          defaultValue={defaultCountry}
          onChange={(e) => onCountryChange?.(e.target.value)}
          autoComplete={prefix === 'shipping' ? 'country' : 'billing country'}
        >
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.label}
            </option>
          ))}
        </Select>
      </Field>

      {/* Postcode en huisnummer eerst: zo vult een Nederlander het adres in. */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Postcode" htmlFor={`${prefix}-postalCode`} required error={err('postalCode')}>
          <Input
            id={`${prefix}-postalCode`}
            name={`${prefix}.postalCode`}
            autoComplete={prefix === 'shipping' ? 'postal-code' : 'billing postal-code'}
            inputMode="text"
            autoCapitalize="characters"
            placeholder="1234 AB"
            required
            aria-invalid={Boolean(err('postalCode')) || undefined}
          />
        </Field>

        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <Field label="Huisnr." htmlFor={`${prefix}-houseNumber`} required error={err('houseNumber')}>
            <Input
              id={`${prefix}-houseNumber`}
              name={`${prefix}.houseNumber`}
              inputMode="numeric"
              required
              aria-invalid={Boolean(err('houseNumber')) || undefined}
            />
          </Field>
          <Field label="Toev." htmlFor={`${prefix}-houseNumberAddition`}>
            <Input id={`${prefix}-houseNumberAddition`} name={`${prefix}.houseNumberAddition`} />
          </Field>
        </div>
      </div>

      <Field label="Straat" htmlFor={`${prefix}-street`} required error={err('street')}>
        <Input
          id={`${prefix}-street`}
          name={`${prefix}.street`}
          autoComplete={prefix === 'shipping' ? 'address-line1' : 'billing address-line1'}
          required
          aria-invalid={Boolean(err('street')) || undefined}
        />
      </Field>

      <Field label="Woonplaats" htmlFor={`${prefix}-city`} required error={err('city')}>
        <Input
          id={`${prefix}-city`}
          name={`${prefix}.city`}
          autoComplete={prefix === 'shipping' ? 'address-level2' : 'billing address-level2'}
          required
          aria-invalid={Boolean(err('city')) || undefined}
        />
      </Field>
    </fieldset>
  );
}

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <h2 className="flex items-center gap-3 font-display text-xl font-semibold">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sage-200 text-base text-sage-900">
        {step}
      </span>
      {title}
    </h2>
  );
}

/**
 * Het afrekenscherm.
 *
 * Eén kolom, in stappen, met grote velden — het grootste deel van de
 * bestellingen komt van een telefoon. Wisselt de klant van land of
 * verzendmethode, dan rekent de server de verzendkosten opnieuw door en
 * verandert het totaal meteen mee.
 */
export function CheckoutForm({
  cart,
  countries,
  simulatedPayment,
  testMode,
}: {
  cart: PricedCart;
  countries: { code: string; label: string }[];
  simulatedPayment: boolean;
  testMode: boolean;
}) {
  const [state, action] = useActionState(checkoutAction, CHECKOUT_INITIAL_STATE);
  const [billingDifferent, setBillingDifferent] = useState(false);
  const [, shippingAction] = useActionState(setShippingAction, { status: 'idle' as const });
  const [pendingShipping, startShipping] = useTransition();
  const router = useRouter();

  const errors = state.fieldErrors ?? {};

  // Bij een fout naar de eerste melding springen, zodat hij niet onder de
  // vouw blijft hangen op een telefoon.
  useEffect(() => {
    if (state.status !== 'error') return;
    const firstError = document.querySelector('[aria-invalid="true"], [role="alert"]');
    firstError?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    (firstError as HTMLElement | null)?.focus?.();
  }, [state]);

  function updateShipping(fields: { country?: string; shippingRateId?: string }) {
    const data = new FormData();
    if (fields.country) data.set('country', fields.country);
    if (fields.shippingRateId !== undefined) data.set('shippingRateId', fields.shippingRateId);
    startShipping(() => {
      shippingAction(data);
      router.refresh();
    });
  }

  return (
    <form action={action} className="flex flex-col gap-10">
      {testMode || simulatedPayment ? (
        <p className="rounded-xl bg-ochre-100 px-4 py-3 text-sm font-medium text-ochre-700">
          {simulatedPayment
            ? 'Testomgeving: er wordt geen echte betaling gedaan. Je kunt het hele proces gewoon doorlopen.'
            : 'Mollie staat in testmodus. Er wordt geen geld afgeschreven.'}
        </p>
      ) : null}

      {/* 1. Contact */}
      <section className="flex flex-col gap-5">
        <StepHeading step={1} title="Contact" />
        <Field
          label="E-mailadres"
          htmlFor="email"
          required
          hint="Hier sturen we de bevestiging naartoe."
          error={errors.email}
        >
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(errors.email) || undefined}
          />
        </Field>
        <Field label="Telefoonnummer" htmlFor="phone" optional hint="Alleen als er iets is met de bezorging.">
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" />
        </Field>
      </section>

      {/* 2. Bezorgadres */}
      <section className="flex flex-col gap-5">
        <StepHeading step={2} title="Bezorgadres" />
        <AddressFields
          prefix="shipping"
          legend="Bezorgadres"
          countries={countries}
          errors={errors}
          defaultCountry={cart.shippingCountry}
          onCountryChange={(country) => updateShipping({ country })}
        />

        <Checkbox
          label="Mijn factuuradres is anders"
          name="billingDifferent"
          checked={billingDifferent}
          onChange={(e) => setBillingDifferent(e.target.checked)}
        />

        {billingDifferent ? (
          <div className="rounded-2xl border border-sand-300 bg-sand-50 p-5">
            <h3 className="mb-4 font-display font-semibold">Factuuradres</h3>
            <AddressFields
              prefix="billing"
              legend="Factuuradres"
              countries={countries}
              errors={errors}
              defaultCountry={cart.shippingCountry}
            />
          </div>
        ) : null}
      </section>

      {/* 3. Bezorging */}
      <section className="flex flex-col gap-5">
        <StepHeading step={3} title="Bezorgen" />

        {cart.shippingOptions.length === 0 ? (
          <p className="rounded-xl bg-sand-200 px-4 py-3 text-sm text-sand-700">
            Voor dit land kunnen we op dit moment niet bezorgen. Kies een ander land of neem contact
            op.
          </p>
        ) : (
          <div className={cn('flex flex-col gap-2', pendingShipping && 'opacity-60')}>
            {cart.shippingOptions.map((option) => (
              <Radio
                key={option.id}
                name="shippingRateId"
                value={option.id}
                defaultChecked={option.id === cart.shippingRateId}
                onChange={() => updateShipping({ shippingRateId: option.id })}
                label={option.name}
                description={option.description}
                trailing={
                  option.priceCents === 0
                    ? option.freeBecauseOfThreshold
                      ? 'Gratis'
                      : option.isPickup
                        ? 'Gratis'
                        : 'Gratis'
                    : formatCents(option.priceCents)
                }
              />
            ))}
          </div>
        )}

        <Field label="Opmerking bij de bestelling" htmlFor="notes" optional>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Bijvoorbeeld: laat het pakket bij de buren."
          />
        </Field>
      </section>

      {/* 4. Afronden */}
      <section className="flex flex-col gap-4">
        <StepHeading step={4} title="Afronden" />

        <Checkbox
          name="newsletterOptIn"
          label="Hou me op de hoogte"
          description="Af en toe een mail over nieuwe kaarten en activiteiten. Uitschrijven kan altijd."
        />

        <div>
          <Checkbox
            name="acceptTerms"
            required
            label={
              <>
                Ik ga akkoord met de{' '}
                <Link href="/algemene-voorwaarden" target="_blank" className="underline underline-offset-2">
                  algemene voorwaarden
                </Link>{' '}
                en de{' '}
                <Link href="/privacy" target="_blank" className="underline underline-offset-2">
                  privacyverklaring
                </Link>
                .
              </>
            }
            aria-invalid={Boolean(errors.acceptTerms) || undefined}
          />
          {errors.acceptTerms ? (
            <p role="alert" className="mt-1.5 text-sm font-medium text-brand-700">
              {errors.acceptTerms}
            </p>
          ) : null}
        </div>

        {state.status === 'error' && state.message ? (
          <p
            role="alert"
            tabIndex={-1}
            className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800"
          >
            {state.message}
          </p>
        ) : null}

        <PayButton total={formatCents(cart.totalCents)} simulated={simulatedPayment} />

        <p className="text-center text-sm text-sand-600">
          Je betaalt veilig via Mollie met iDEAL, Bancontact, creditcard of PayPal.
        </p>
      </section>
    </form>
  );
}
