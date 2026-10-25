import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isLapostaDuplicate, lapostaNote, sendToProvider } from '@/lib/newsletter/providers';

/*
 * Deze koppeling is twee keer stukgelopen op een geraden detail: eerst op de
 * namen van de extra velden, daarna op de tekst waarmee Laposta meldt dat een
 * adres al bestaat ('Email address exists', zonder 'already'). Beide keren
 * gebeurde dat pas in productie, want zonder sleutel wordt deze code nergens
 * uitgevoerd.
 *
 * Vandaar deze tests: ze zetten een nep-Laposta neer en leggen de antwoorden
 * vast zoals die er echt uitzien.
 */

const OK_MEMBER = {
  member: { member_id: 'abc123', state: 'active', email: 'ans@example.nl' },
};

const BESTAAT_AL = {
  error: { type: 'invalid_input', message: 'Email address exists', code: 204, parameter: 'email' },
};

function antwoord(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('isLapostaDuplicate', () => {
  it('herkent de foutcode, ook zonder leesbare tekst', () => {
    expect(isLapostaDuplicate({ error: { code: 204 } })).toBe(true);
  });

  it('herkent de echte tekst van Laposta', () => {
    expect(isLapostaDuplicate({ error: { message: 'Email address exists' } })).toBe(true);
  });

  it('houdt een gewone fout een fout', () => {
    expect(isLapostaDuplicate({ error: { message: 'Invalid email address', code: 201 } })).toBe(
      false,
    );
    expect(isLapostaDuplicate({})).toBe(false);
  });
});

describe('lapostaNote', () => {
  it('zegt niets als er niets te melden valt', () => {
    expect(lapostaNote('active', false)).toBeUndefined();
  });

  it('waarschuwt als iemand zich in Laposta heeft uitgeschreven', () => {
    expect(lapostaNote('unsubscribed', true)).toMatch(/uitgeschreven/i);
  });

  it('meldt dat een adres er al stond', () => {
    expect(lapostaNote('active', true)).toMatch(/stond al/i);
  });
});

describe('sendToProvider met Laposta', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('NEWSLETTER_PROVIDER', 'laposta');
    vi.stubEnv('LAPOSTA_API_KEY', 'sleutel');
    vi.stubEnv('LAPOSTA_LIST_ID', 'lijst123');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('schrijft een nieuw adres in', async () => {
    fetchMock.mockResolvedValueOnce(antwoord(OK_MEMBER, 201));

    const result = await sendToProvider({ email: 'ans@example.nl', source: 'footer', ip: '1.2.3.4' });

    expect(result).toEqual({ status: 'ok', providerId: 'abc123', note: undefined });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.laposta.nl/v2/member');
    const verstuurd = new URLSearchParams(String(init.body));
    expect(verstuurd.get('email')).toBe('ans@example.nl');
    expect(verstuurd.get('list_id')).toBe('lijst123');
    // Laposta weigert elk verzoek zonder IP-adres.
    expect(verstuurd.get('ip')).toBe('1.2.3.4');
  });

  it('ziet een bestaand adres als gelukt en haalt het id erbij', async () => {
    fetchMock
      .mockResolvedValueOnce(antwoord(BESTAAT_AL, 400))
      .mockResolvedValueOnce(antwoord({ member: { member_id: 'bestond-al', state: 'active' } }));

    const result = await sendToProvider({ email: 'ans@example.nl', source: 'checkout' });

    expect(result).toEqual({ status: 'ok', providerId: 'bestond-al', note: 'Stond al in Laposta.' });
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.laposta.nl/v2/member/ans%40example.nl?list_id=lijst123',
    );
  });

  it('meldt het als dat bestaande adres zich daar had uitgeschreven', async () => {
    fetchMock
      .mockResolvedValueOnce(antwoord(BESTAAT_AL, 400))
      .mockResolvedValueOnce(antwoord({ member: { member_id: 'weg', state: 'unsubscribed' } }));

    const result = await sendToProvider({ email: 'ans@example.nl', source: 'footer' });

    expect(result.status).toBe('ok');
    expect(result).toMatchObject({ providerId: 'weg' });
    expect('note' in result && result.note).toMatch(/uitgeschreven/i);
  });

  it('blijft gelukt als het opzoeken van het id misgaat', async () => {
    fetchMock
      .mockResolvedValueOnce(antwoord(BESTAAT_AL, 400))
      .mockResolvedValueOnce(antwoord({ error: { message: 'Not found' } }, 404));

    const result = await sendToProvider({ email: 'ans@example.nl', source: 'footer' });

    expect(result.status).toBe('ok');
  });

  it('houdt een echte fout een fout', async () => {
    fetchMock.mockResolvedValueOnce(
      antwoord({ error: { message: 'Invalid email address', code: 201 } }, 400),
    );

    const result = await sendToProvider({ email: 'kapot', source: 'footer' });

    expect(result.status).toBe('error');
    expect(result).toMatchObject({ message: expect.stringContaining('Invalid email address') });
    // Geen tweede poging: er valt niets op te zoeken.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('zegt het als de sleutel ontbreekt, in plaats van stilletjes niets te doen', async () => {
    vi.stubEnv('LAPOSTA_API_KEY', '');

    const result = await sendToProvider({ email: 'ans@example.nl', source: 'footer' });

    expect(result).toEqual({
      status: 'error',
      message: 'LAPOSTA_API_KEY of LAPOSTA_LIST_ID ontbreekt.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
