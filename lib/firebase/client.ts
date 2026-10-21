'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';

/**
 * Browser-Firebase. Uitsluitend om de beheerder te laten inloggen.
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

/*
 * Hier stond `clientDb()`: Firestore in de browser, bedoeld om live mee te
 * kijken met de adventskalender. Die functie werd nergens aangeroepen, maar
 * trok wel de hele Firestore-bibliotheek de browserbundel in — code die
 * meegeleverd wordt aan elke bezoeker en die niets doet.
 *
 * Heeft de site ooit tóch live-meekijken nodig, dan komt hij terug. Tot die
 * tijd praat de browser alleen met Firebase om in te loggen.
 */
