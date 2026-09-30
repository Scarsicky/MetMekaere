/**
 * Geeft een account beheerrechten voor de admin.
 *
 *   npm run admin:grant -- jouw@email.nl
 *   npm run admin:grant -- jouw@email.nl --wachtwoord Geheim123
 *   npm run admin:grant -- jouw@email.nl --intrekken
 *
 * Bestaat het account nog niet, dan wordt het aangemaakt — geef dan een
 * wachtwoord mee. Beheerder ben je door de custom claim `admin: true`; alleen
 * een account hebben is niet genoeg. Er staat dus nergens een open registratie
 * waarmee iemand zichzelf toegang kan geven.
 *
 * Draait tegen de emulator als FIRESTORE_EMULATOR_HOST is gezet, en anders
 * tegen het echte project.
 */

import { adminAuth, adminDb } from '@/lib/firebase/admin';

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith('--'))?.trim().toLowerCase();
const revoke = args.includes('--intrekken') || args.includes('--revoke');

function flagValue(name: string): string | undefined {
  const index = args.findIndex((a) => a === `--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  if (!email || !email.includes('@')) {
    console.error('Geef een e-mailadres mee:\n  npm run admin:grant -- jouw@email.nl');
    process.exit(1);
  }

  const target = process.env.FIREBASE_AUTH_EMULATOR_HOST
    ? `de emulator op ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`
    : `project ${process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`;
  console.log(`Werkt op ${target}\n`);

  const auth = adminAuth();
  let user;

  try {
    user = await auth.getUserByEmail(email);
    console.log(`Account gevonden: ${email}`);
  } catch {
    if (revoke) {
      console.error(`Geen account gevonden voor ${email}.`);
      process.exit(1);
    }

    const password = flagValue('wachtwoord') ?? flagValue('password');
    if (!password) {
      console.error(
        `Er is nog geen account voor ${email}.\n` +
          `Maak het aan met een wachtwoord:\n  npm run admin:grant -- ${email} --wachtwoord EenGoedWachtwoord`,
      );
      process.exit(1);
    }
    if (password.length < 8) {
      console.error('Kies een wachtwoord van minstens 8 tekens.');
      process.exit(1);
    }

    user = await auth.createUser({ email, password, emailVerified: true });
    console.log(`Account aangemaakt: ${email}`);
  }

  await auth.setCustomUserClaims(user.uid, revoke ? {} : { admin: true });

  // Een spiegeldocument, zodat je in de Firestore-console kunt zien wie
  // beheerder is zonder de Auth-claims uit te hoeven lezen.
  const ref = adminDb().collection('admins').doc(user.uid);
  if (revoke) {
    await ref.delete().catch(() => {});
  } else {
    await ref.set({ email, grantedAt: Date.now() }, { merge: true });
  }

  // Lopende sessies vervallen, zodat het intrekken meteen effect heeft.
  await auth.revokeRefreshTokens(user.uid);

  console.log(
    revoke
      ? `\nBeheerrechten ingetrokken voor ${email}. Bestaande sessies zijn beëindigd.`
      : `\n${email} is nu beheerder. Log in op /admin.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nMislukt:', error);
    process.exit(1);
  });
