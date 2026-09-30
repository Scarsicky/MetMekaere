import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

const control =
  'w-full rounded-xl border border-sand-300 bg-white px-3.5 py-3 text-base text-sand-900 ' +
  'placeholder:text-sand-500 transition-colors ' +
  'focus:border-brand-400 focus:outline-none focus-visible:outline-2 focus-visible:outline-brand-700 focus-visible:outline-offset-1 ' +
  'disabled:bg-sand-100 disabled:text-sand-600 ' +
  'aria-[invalid=true]:border-brand-500 aria-[invalid=true]:bg-brand-50';

/**
 * Veld met label, hulptekst en foutmelding. De foutmelding wordt via
 * `aria-describedby` aan het veld gekoppeld en krijgt `role="alert"`, zodat
 * een schermlezer hem voorleest zodra hij verschijnt — belangrijk in de checkout.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /**
   * Zet '(optioneel)' achter het label. Bewust niet automatisch bij alles wat
   * niet verplicht is: een keuzelijst die altijd een waarde heeft is niet
   * 'optioneel', en dat woord overal neerzetten maakt een formulier onrustig.
   * Gebruik het waar een bezoeker zich anders zou afvragen of hij iets mist.
   */
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="font-display text-sm font-semibold text-sand-800">
        {label}
        {required ? <span className="ml-1 text-brand-700">*</span> : null}
        {optional && !required ? (
          <span className="ml-1.5 font-normal text-sand-600">(optioneel)</span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-sand-600">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm font-medium text-brand-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<'input'>) {
  return <input className={cn(control, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-28 resize-y leading-relaxed', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<'select'>) {
  return (
    <select className={cn(control, 'appearance-none bg-white pr-10', className)} {...rest}>
      {children}
    </select>
  );
}

/** Aanvinkvakje met tekst ernaast; het hele blok is aanklikbaar. */
export function Checkbox({
  label,
  description,
  className,
  ...rest
}: { label: ReactNode; description?: string } & ComponentProps<'input'>) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border border-sand-300 bg-white p-3.5',
        'transition-colors hover:border-sand-400 has-checked:border-sage-400 has-checked:bg-sage-50',
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 accent-brand-700"
        {...rest}
      />
      <span className="text-sm leading-snug">
        <span className="block font-medium text-sand-900">{label}</span>
        {description ? <span className="mt-0.5 block text-sand-600">{description}</span> : null}
      </span>
    </label>
  );
}

/** Keuzerondje, dezelfde vormgeving als het aanvinkvakje. */
export function Radio({
  label,
  description,
  trailing,
  className,
  ...rest
}: { label: ReactNode; description?: ReactNode; trailing?: ReactNode } & ComponentProps<'input'>) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border border-sand-300 bg-white p-3.5',
        'transition-colors hover:border-sand-400 has-checked:border-sage-400 has-checked:bg-sage-50',
        className,
      )}
    >
      <input type="radio" className="mt-0.5 size-5 shrink-0 accent-brand-700" {...rest} />
      <span className="flex-1 text-sm leading-snug">
        <span className="block font-medium text-sand-900">{label}</span>
        {description ? <span className="mt-0.5 block text-sand-600">{description}</span> : null}
      </span>
      {trailing ? <span className="font-display text-sm font-semibold tabular">{trailing}</span> : null}
    </label>
  );
}
