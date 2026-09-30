import { z } from 'zod';

import { isValidEmail, normalizePostalCode } from '@/lib/utils';

/**
 * Controle op de gegevens uit de checkout.
 *
 * De foutmeldingen zijn in gewone taal: iemand die zijn huisnummer vergeet
 * moet lezen wat er mist, niet welk veld ongeldig is.
 */

const required = (veld: string) => `Vul je ${veld} in.`;

const addressSchema = z.object({
  name: z.string().trim().min(2, required('naam')).max(120),
  company: z.string().trim().max(120).optional(),
  street: z.string().trim().min(2, required('straatnaam')).max(120),
  houseNumber: z.string().trim().min(1, required('huisnummer')).max(12),
  houseNumberAddition: z.string().trim().max(12).optional(),
  postalCode: z.string().trim().min(4, required('postcode')).max(12),
  city: z.string().trim().min(2, required('woonplaats')).max(80),
  country: z.string().trim().length(2, 'Kies een land.'),
});

export const checkoutSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Vul je e-mailadres in, dan kunnen we je een bevestiging sturen.')
      .max(254)
      .refine(isValidEmail, 'Dit e-mailadres ziet er niet goed uit.'),
    phone: z.string().trim().max(30).optional(),
    shipping: addressSchema,
    billingSameAsShipping: z.boolean(),
    billing: addressSchema.optional(),
    shippingRateId: z.string().trim().max(60).optional(),
    notes: z.string().trim().max(1000).optional(),
    newsletterOptIn: z.boolean(),
    acceptTerms: z.literal(true, {
      error: 'Vink even aan dat je akkoord gaat met de voorwaarden.',
    }),
  })
  .superRefine((value, ctx) => {
    // Een afwijkend factuuradres moet ook compleet zijn.
    if (!value.billingSameAsShipping && !value.billing) {
      ctx.addIssue({
        code: 'custom',
        path: ['billing'],
        message: 'Vul het factuuradres in, of vink aan dat het hetzelfde is.',
      });
    }

    // Nederlandse postcode: 1234 AB.
    if (value.shipping.country === 'NL') {
      const normalized = normalizePostalCode(value.shipping.postalCode, 'NL');
      if (!/^\d{4} [A-Z]{2}$/.test(normalized)) {
        ctx.addIssue({
          code: 'custom',
          path: ['shipping', 'postalCode'],
          message: 'Een Nederlandse postcode ziet eruit als 1234 AB.',
        });
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Zet een FormData om naar de vorm die het schema verwacht. */
export function checkoutFromFormData(formData: FormData): unknown {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value : '';
  };
  const checked = (key: string) => formData.get(key) === 'on' || formData.get(key) === 'true';

  const billingSameAsShipping = !checked('billingDifferent');

  return {
    email: text('email'),
    phone: text('phone') || undefined,
    shipping: {
      name: text('shipping.name'),
      company: text('shipping.company') || undefined,
      street: text('shipping.street'),
      houseNumber: text('shipping.houseNumber'),
      houseNumberAddition: text('shipping.houseNumberAddition') || undefined,
      postalCode: text('shipping.postalCode'),
      city: text('shipping.city'),
      country: text('shipping.country') || 'NL',
    },
    billingSameAsShipping,
    billing: billingSameAsShipping
      ? undefined
      : {
          name: text('billing.name'),
          company: text('billing.company') || undefined,
          street: text('billing.street'),
          houseNumber: text('billing.houseNumber'),
          houseNumberAddition: text('billing.houseNumberAddition') || undefined,
          postalCode: text('billing.postalCode'),
          city: text('billing.city'),
          country: text('billing.country') || 'NL',
        },
    shippingRateId: text('shippingRateId') || undefined,
    notes: text('notes') || undefined,
    newsletterOptIn: checked('newsletterOptIn'),
    acceptTerms: checked('acceptTerms'),
  };
}

/** Platte foutenlijst op veldnaam, zodat het formulier ze kan tonen. */
export function flattenIssues(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
