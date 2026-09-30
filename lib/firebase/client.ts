'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Browser-Firebase. Alleen voor twee dingen:
 *  - inloggen van de admin (Firebase Auth);
 *  - live meekijken met de adventskalender (Firestore onSnapshot).
 *
 * Alles wat met prijzen, voorraad of orders te maken heeft loopt via de server.
 * Deze sleutels zijn publiek; de beveiliging zit in de Firestore-regels.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isClientFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.authDomain);
}

let app: FirebaseApp | null = null;

function clientApp(): FirebaseApp {
  if (!isClientFirebaseConfigured()) {
    throw new Error(
      'Firebase-configuratie ontbreekt. Zet de NEXT_PUBLIC_FIREBASE_* variabelen in .env.local (zie .env.example).',
    );
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(config);
  }
  return app;
}

/**
 * Lokaal praat de browser met dezelfde emulator als de server, zodat je in de
 * admin inlogt met een testaccount en niet met een echt account uit productie.
 */
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === '1';

let authCache: Auth | null = null;
export function clientAuth(): Auth {
  if (!authCache) {
    authCache = getAuth(clientApp());
    if (useEmulators) {
      connectAuthEmulator(authCache, 'http://127.0.0.1:9099', { disableWarnings: true });
    }
  }
  return authCache;
}

let dbCache: Firestore | null = null;
export function clientDb(): Firestore {
  if (!dbCache) {
    dbCache = getFirestore(clientApp());
    if (useEmulators) {
      connectFirestoreEmulator(dbCache, '127.0.0.1', 8080);
    }
  }
  return dbCache;
}
