/**
 * Tek Firebase uygulaması — Auth ve Firestore aynı projeyi kullanır.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { viteEnv } from './lib/vite-env';

export const firebaseConfig = {
  apiKey: viteEnv.firebaseApiKey,
  authDomain: viteEnv.firebaseAuthDomain,
  projectId: viteEnv.firebaseProjectId,
  storageBucket: viteEnv.firebaseStorageBucket,
  messagingSenderId: viteEnv.firebaseMessagingSenderId,
  appId: viteEnv.firebaseAppId
};

let app: FirebaseApp | null = null;

function getAppInstance(): FirebaseApp {
  if (app) return app;
  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0] as FirebaseApp;
    return app;
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Firebase yapılandırması eksik. .env veya runtime-env.js içinde VITE_FIREBASE_* ayarlayın.');
  }
  app = initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseApp(): FirebaseApp {
  return getAppInstance();
}

export function getFirebaseAuth(): Auth {
  return getAuth(getAppInstance());
}

export function getFirebaseFirestore(): Firestore {
  return getFirestore(getAppInstance());
}
