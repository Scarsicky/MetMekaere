import { NextResponse } from 'next/server';

import { currentAdmin, touchActivity } from '@/lib/admin/auth';

/**
 * Een teken van leven uit het beheerscherm.
 *
 * Het scherm stuurt dit hooguit eens per paar minuten, en alleen wanneer er
 * echt iets gebeurt — een toetsaanslag, een klik, terugkomen op het tabblad.
 * Zo weet de server of iemand nog achter het scherm zit.
 *
 * Een 401 betekent dat de sessie voorbij is. Het scherm stuurt je dan zelf
 * naar het inlogscherm.
 */
export async function POST() {
  const admin = await currentAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await touchActivity(admin.uid);
  return NextResponse.json({ ok: true });
}
