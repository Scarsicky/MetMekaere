import 'server-only';

import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/**
 * Server-side Firebase. Dit is de enige plek met schrijfrechten op Firestore:
 * prijzen, voorraad en orders worden nooit vanuit de browser aangepast.
 *
 * Inloggen gebeurt op drie manieren, in deze volgorde:
 *  1. `FIREBASE_SERVICE_ACCOUNT` — de hele service-account-JSON als string
 *     (zo zet Secret Manager hem op App Hosting neer).
 *  2. `GOOGLE_APPLICATION_CREDENTIALS` — pad naar een keyfile (lokaal).
 *  3. Application Default Credentials — automatisch op Cloud Run.
 */

const APP_NAME = 'metmekaere-admin';

function resolveProjectId(): string | undefined {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT
  );
}

function resolveStorageBucket(): string | undefined {
  const explicit = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (explicit) return explicit;
  const projectId = resolveProjectId();
  return projectId ? `${projectId}.firebasestorage.app` : undefined;
}

/** Draaien we tegen de lokale emulator? Dan zijn er geen sleutels nodig. */
function usingEmulator(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

function createApp(): App {
  const projectId = resolveProjectId();
  const storageBucket = resolveStorageBucket();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

  // De emulator vraagt niet om credentials; alleen een projectId is genoeg.
  if (usingEmulator()) {
    return initializeApp({ projectId: projectId ?? 'metmekaere', storageBucket }, APP_NAME);
  }

  if (raw) {
    let parsed: { project_id?: string; client_email?: string; private_key?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT is geen geldige JSON. Zet de volledige service-account-sleutel als één string in de omgeving.',
      );
    }
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT mist client_email of private_key.');
    }
    return initializeApp(
      {
        credential: cert({
          projectId: parsed.project_id ?? projectId,
          clientEmail: parsed.client_email,
          // In omgevingsvariabelen staan newlines vaak als \n.
          privateKey: parsed.private_key.replace(/\\n/g, '\n'),
        }),
        projectId: parsed.project_id ?? projectId,
        storageBucket,
      },
      APP_NAME,
    );
  }

  // Keyfile of Application Default Credentials.
  return initializeApp({ projectId, storageBucket }, APP_NAME);
}

function adminApp(): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return getApp(APP_NAME);
  return createApp();
}

/**
 * Firestore-client. Lazy, zodat het importeren van dit bestand nog geen
 * verbinding opzet — anders klapt `next build` zonder credentials.
 *
 * De instantie hangt aan `globalThis` en niet aan een variabele in deze
 * module. Next laadt dit bestand namelijk in meerdere contexten tegelijk
 * (pagina's, server actions, route handlers, en bij elke hot reload). Elke
 * kopie zou dan zijn eigen 'nog niet geconfigureerd' denken, terwijl ze
 * dezelfde onderliggende Firestore delen — en `settings()` mag maar één keer.
 */
const DB_KEY = Symbol.for('metmekaere.firestore');

type GlobalWithDb = typeof globalThis & {
  [DB_KEY]?: ReturnType<typeof getFirestore>;
};

export function adminDb() {
  const scope = globalThis as GlobalWithDb;

  if (!scope[DB_KEY]) {
    const db = getFirestore(adminApp());
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Al geconfigureerd; dat is precies wat we willen bereiken.
    }
    scope[DB_KEY] = db;
  }

  return scope[DB_KEY];
}

export function adminAuth() {
  return getAuth(adminApp());
}

export function adminStorage() {
  return getStorage(adminApp());
}

export function adminBucket() {
  const bucket = resolveStorageBucket();
  return bucket ? adminStorage().bucket(bucket) : adminStorage().bucket();
}

export { FieldValue, Timestamp };

/**
 * Kunnen we überhaupt bij Firestore?
 *
 * Wordt vóór elke lezing gecontroleerd. Zonder deze check probeert de Admin
 * SDK alsnog in te loggen, faalt dat ergens diep in gRPC, en krijg je naast de
 * nette terugval ook een stroom onafgehandelde promise-fouten in het log. Zo
 * blijft een omgeving zonder sleutels rustig: de site toont gewoon de
 * standaardinhoud.
 */
export function isAdminUsable(): boolean {
  if (usingEmulator()) return true;
  return Boolean(
    resolveProjectId() &&
      (process.env.FIREBASE_SERVICE_ACCOUNT ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.K_SERVICE || // draait op Cloud Run (App Hosting)
        process.env.GOOGLE_CLOUD_PROJECT_NUMBER),
  );
}

/** Duidelijke uitleg voor in de admin en de gezondheidscheck. */
export function adminConfigHint(): string {
  if (isAdminUsable()) return '';
  return (
    'Firestore is niet bereikbaar vanaf de server. Start lokaal de emulator met ' +
    '`npm run emulators`, of zet GOOGLE_APPLICATION_CREDENTIALS naar een service-account-sleutel.'
  );
}
