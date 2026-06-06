/**
 * Tek Firebase uygulaması — Auth ve Firestore aynı projeyi kullanır.
 * index.html (js/auth.js) ile aynı proje kullanıldığında giriş durumu paylaşılır.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const env = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) ? (import.meta as any).env : {};
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || ''
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
    throw new Error('Firebase yapılandırması eksik. .env dosyasında VITE_FIREBASE_* değişkenlerini ayarlayın.');
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
