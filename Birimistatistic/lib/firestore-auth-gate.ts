/**
 * Firestore kuralları request.auth (Firebase) gerektirir.
 * Supabase oturumunda köprü tamamlanana kadar okuma/yazma bekletilir.
 */

import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '../firebase';
import { getAuthProviderMode } from './vite-env';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { getDataProviderMode } from './data-provider';
import { FIREBASE_AUTH_READY_EVENT } from './firebase-auth-bridge';

const DEFAULT_WAIT_MS = 18_000;

export async function waitForFirestoreAuth(timeoutMs = DEFAULT_WAIT_MS): Promise<boolean> {
  if (getDataProviderMode() === 'supabase' && isSupabaseConfigured()) {
    const { data } = await getSupabaseClient().auth.getSession();
    return Boolean(data.session);
  }

  const auth = getFirebaseAuth();
  if (auth.currentUser) return true;

  const mode = getAuthProviderMode();
  if (mode === 'firebase' || !isSupabaseConfigured()) {
    return waitForFirebaseUser(auth, timeoutMs);
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener(FIREBASE_AUTH_READY_EVENT, onBridge);
      unsub();
      resolve(ok);
    };

    const timer = setTimeout(() => done(!!auth.currentUser), timeoutMs);
    const onBridge = () => done(!!auth.currentUser);
    window.addEventListener(FIREBASE_AUTH_READY_EVENT, onBridge);

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) done(true);
    });
  });
}

function waitForFirebaseUser(
  auth: ReturnType<typeof getFirebaseAuth>,
  timeoutMs: number
): Promise<boolean> {
  if (auth.currentUser) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsub();
      resolve(!!auth.currentUser);
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        clearTimeout(timer);
        unsub();
        resolve(true);
      }
    });
  });
}
