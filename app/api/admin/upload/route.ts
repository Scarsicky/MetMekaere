import { NextResponse } from 'next/server';

import { currentAdmin } from '@/lib/admin/auth';
import { adminBucket } from '@/lib/firebase/admin';
import { randomId, slugify } from '@/lib/utils';

/**
 * Foto's uploaden vanuit de admin.
 *
 * Het bestand gaat naar Cloud Storage onder `public/…` en wordt publiek
 * leesbaar gemaakt — het staat immers straks gewoon op de website. Alleen een
 * ingelogde beheerder kan hier iets naartoe sturen.
 *
 * Het bestandstype wordt niet uit de naam afgeleid maar uit de eerste bytes
 * van het bestand: een `.jpg` die eigenlijk iets anders is, komt er niet door.
 */

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/** Toegestane typen, met hun 'magic bytes' en extensie. */
const ALLOWED = [
  { type: 'image/jpeg', ext: 'jpg', magic: [0xff, 0xd8, 0xff] },
  { type: 'image/png', ext: 'png', magic: [0x89, 0x50, 0x4e, 0x47] },
  { type: 'image/webp', ext: 'webp', magic: [0x52, 0x49, 0x46, 0x46] }, // 'RIFF'
  { type: 'image/gif', ext: 'gif', magic: [0x47, 0x49, 0x46, 0x38] },
] as const;

function detectType(bytes: Uint8Array): (typeof ALLOWED)[number] | null {
  for (const candidate of ALLOWED) {
    if (candidate.magic.every((byte, index) => bytes[index] === byte)) {
      // WebP heeft naast 'RIFF' ook 'WEBP' op positie 8.
      if (candidate.ext === 'webp') {
        const tag = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
        if (tag !== 'WEBP') continue;
      }
      return candidate;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const admin = await currentAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Niet ingelogd.' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'Geen bestand ontvangen.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Geen bestand ontvangen.' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: 'Dit bestand is leeg.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'Deze foto is groter dan 8 MB. Maak hem wat kleiner en probeer opnieuw.' },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectType(new Uint8Array(buffer.subarray(0, 12)));
  if (!detected) {
    return NextResponse.json(
      { ok: false, error: 'Dit lijkt geen foto te zijn. Gebruik een JPG, PNG, WebP of GIF.' },
      { status: 400 },
    );
  }

  const folder = slugify(String(form.get('folder') ?? 'algemeen')) || 'algemeen';
  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'foto';
  const path = `public/${folder}/${base}-${randomId(8)}.${detected.ext}`;

  try {
    const bucket = adminBucket();
    const object = bucket.file(path);

    await object.save(buffer, {
      contentType: detected.type,
      metadata: {
        // Beelden veranderen niet meer nadat ze zijn geüpload; een lange
        // cachetijd scheelt laadtijd en kosten.
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
    await object.makePublic().catch(() => {
      // Op de emulator bestaat makePublic niet; daar is alles toch open.
    });

    const url = process.env.FIREBASE_STORAGE_EMULATOR_HOST
      ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media`
      : `https://storage.googleapis.com/${bucket.name}/${path}`;

    return NextResponse.json({ ok: true, path, url, contentType: detected.type });
  } catch (error) {
    console.error('[upload] opslaan mislukte:', error);
    return NextResponse.json(
      { ok: false, error: 'Het opslaan van de foto lukte niet. Probeer het nog eens.' },
      { status: 500 },
    );
  }
}

/** Een foto weghalen uit Cloud Storage. */
export async function DELETE(request: Request) {
  const admin = await currentAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Niet ingelogd.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  // Alleen binnen de publieke map, en geen pad dat omhoog probeert te lopen.
  if (!path || !path.startsWith('public/') || path.includes('..')) {
    return NextResponse.json({ ok: false, error: 'Ongeldig pad.' }, { status: 400 });
  }

  try {
    await adminBucket().file(path).delete({ ignoreNotFound: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[upload] verwijderen mislukte:', error);
    return NextResponse.json({ ok: false, error: 'Verwijderen lukte niet.' }, { status: 500 });
  }
}
