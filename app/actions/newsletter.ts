'use server';

import { subscribeToNewsletter } from '@/lib/newsletter';
import { limitByIp } from '@/lib/rate-limit';
import type { NewsletterFormState } from '@/lib/shop/action-state';

export async function subscribeAction(
  _prev: NewsletterFormState,
  formData: FormData,
): Promise<NewsletterFormState> {
  // Honeypot: een veld dat mensen niet zien en bots wel invullen.
  if (String(formData.get('website') ?? '').trim()) {
    return { status: 'ok', message: 'Bedankt! Je staat op de lijst.' };
  }

  const limit = await limitByIp('newsletter', 5, 600);
  if (!limit.allowed) {
    return {
      status: 'error',
      message: 'Je hebt dit net al een paar keer geprobeerd. Wacht even en probeer het opnieuw.',
    };
  }

  const email = String(formData.get('email') ?? '');
  const name = String(formData.get('name') ?? '');
  const source = String(formData.get('source') ?? 'website').slice(0, 40);

  const result = await subscribeToNewsletter({ email, name, source });

  if (!result.ok) {
    return { status: 'error', message: result.error };
  }
  return {
    status: 'ok',
    message: result.alreadySubscribed
      ? 'Je stond al op de lijst — fijn dat je erbij bent.'
      : 'Bedankt! Je staat op de lijst.',
  };
}
