/**
 * Veritabanı katmanı — Firestore + Firebase Authentication.
 */

import { firestoreDb, isFirestoreConfigured } from './firestore-db';
import { FirebaseAuthAdapter } from './firebase-auth';

export const DATA_CHANGE_EVENT = 'firestore_data_change';

class DBClient {
  auth = FirebaseAuthAdapter;

  collection(name: string) {
    if (!isFirestoreConfigured()) {
      throw new Error('Firestore yapılandırılmamış. .env içinde VITE_USE_FIRESTORE=true ve VITE_FIREBASE_* ayarlayın.');
    }
    return firestoreDb.collection(name);
  }

  subscribe(callback: () => void) {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(DATA_CHANGE_EVENT, callback);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, callback);
  }
}

export const db = new DBClient();
