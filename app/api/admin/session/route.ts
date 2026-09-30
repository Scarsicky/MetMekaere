import { NextResponse } from 'next/server';

import { createAdminSession, destroyAdminSession } from '@/lib/admin/auth';
import { limitByIp } from '@/lib/rate-limit';

/**
 * Inloggen en uitloggen van de admin.
 *
 * De browser stuurt hier één keer een Firebase ID-token naartoe; de server
 * controleert dat en zet een sessiecookie terug. Het token zelf wordt nergens
 * bewaard.
 */
export async function POST(request: Request) {
  const limit = await limitByIp('admin-login', 10, 300);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Te veel pogingen. Probeer het over een paar minuten opnieuw.' },
      { status: 429 },
    );
  }

  let idToken: string | null = null;
  try {
    const body = (await request.json()) as { idToken?: string };
    idToken = typeof body.idToken === 'string' ? body.idToken : null;
  } catch {
    idToken = null;
  }

  if (!idToken) {
    return NextResponse.json({ ok: false, error: 'Geen inloggegevens ontvangen.' }, { status: 400 });
  }

  const admin = await createAdminSession(idToken);
  if (!admin) {
    // Bewust vaag: of het account niet bestaat of geen beheerrechten heeft,
    // hoeft iemand die dit probeert niet te weten.
    return NextResponse.json(
      { ok: false, error: 'Dit account heeft geen toegang tot de admin.' },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true, email: admin.email });
}

export async function DELETE() {
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}
