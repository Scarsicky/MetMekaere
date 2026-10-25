import { describe, expect, it } from 'vitest';

import { needsSync } from '@/lib/newsletter';
import type { NewsletterSubscriber } from '@/types';

function adres(extra: Partial<NewsletterSubscriber> = {}): NewsletterSubscriber {
  return {
    email: 'ans@example.nl',
    status: 'subscribed',
    source: 'footer',
    providerId: 'abc123',
    syncError: null,
    createdAt: 0,
    ...extra,
  };
}

describe('needsSync', () => {
  it('laat een adres dat gewoon goed staat met rust', () => {
    expect(needsSync(adres())).toBe(false);
  });

  it('pakt een adres zonder id van de mailinglijst op', () => {
    expect(needsSync(adres({ providerId: null }))).toBe(true);
  });

  it('pakt een adres met een foutmelding op, ook al is er een id', () => {
    /*
     * Dit is het geval waarop de eerste versie stukliep: iemand die zich
     * eerder met goed gevolg inschreef en dat later nog eens deed. Het id van
     * de eerste keer bleef staan, de tweede poging liep vast, en omdat er een
     * id was viel het adres buiten het net — zonder knop om het recht te
     * zetten.
     */
    expect(
      needsSync(adres({ status: 'pending', syncError: 'Laposta gaf 400: Email address exists' })),
    ).toBe(true);
  });

  it('pakt een adres op dat halverwege is blijven steken', () => {
    expect(needsSync(adres({ status: 'pending' }))).toBe(true);
  });

  it('laat iemand die zich heeft uitgeschreven staan', () => {
    expect(needsSync(adres({ status: 'unsubscribed', providerId: null }))).toBe(false);
    expect(needsSync(adres({ status: 'unsubscribed', syncError: 'wat dan ook' }))).toBe(false);
  });
});
