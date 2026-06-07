/**
 * Supabase oturumu açıkken Firestore için Firebase Auth oturumu senkronize eder.
 * Firestore kuralları request.auth.uid (Firebase) gerektirir.
 */

import { getFirebaseApp, getFirebaseAuth } from '../firebase';
import { isFirebaseEnabled } from './vite-env';
import { getDataProviderMode } from './data-provider';
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

export const FIREBASE_AUTH_READY_EVENT = 'firebase_auth_ready';

export function notifyFirebaseAuthReady() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(FIREBASE_AUTH_READY_EVENT));
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFirebaseUser(timeoutMs = 8000) {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;
  return new Promise<typeof auth.currentUser>((resolve, reject) => {
    const timer = setTimeout(() => {
      unsub();
      reject(new Error('Firebase oturumu zaman aşımına uğradı'));
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      clearTimeout(timer);
      unsub();
      resolve(user);
    });
  });
}

const FETCH_TIMEOUT_MS = 10_000;

async function fetchCustomTokenFromApi(
  accessToken: string
): Promise<{ token?: string; firebaseUid?: string } | null> {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/api/firebase-custom-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
      signal: controller.signal
    });
    const json = (await res.json()) as { token?: string; firebaseUid?: string; error?: string };
    if (!res.ok) {
      throw new Error(json.error || 'Köprü API hatası');
    }
    return json;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Firebase köprü API zaman aşımına uğradı');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

let bridgeInFlight: Promise<{ ok: boolean; error?: string }> | null = null;
let bridgeInFlightKey = '';

async function bridgeOnce(opts: {
  email: string;
  legacyFirebaseUid?: string | null;
  password?: string;
  supabaseAccessToken?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const auth = getFirebaseAuth();
  const targetUid = opts.legacyFirebaseUid || null;

  if (auth.currentUser) {
    if (!targetUid || auth.currentUser.uid === targetUid) {
      notifyFirebaseAuthReady();
      return { ok: true };
    }
    try {
      await signOut(auth);
    } catch {
      /* yeni oturum için eski oturumu kapat */
    }
  }

  if (opts.password) {
    try {
      await signInWithEmailAndPassword(auth, opts.email, opts.password);
      const user = await waitForFirebaseUser();
      if (user && (!targetUid || user.uid === targetUid)) {
        notifyFirebaseAuthReady();
        return { ok: true };
      }
    } catch {
      /* Livetable şifresi Firebase ile farklı olabilir */
    }
  }

  if (!opts.supabaseAccessToken) {
    return {
      ok: false,
      error: 'Firestore oturumu kurulamadı. Sayfayı yenileyin veya tekrar giriş yapın.'
    };
  }

  try {
    await getFirebaseApp();
    const bridge = await fetchCustomTokenFromApi(opts.supabaseAccessToken);
    const token = bridge?.token;
    const serverUid = bridge?.firebaseUid || null;
    if (!token) {
      return { ok: false, error: 'Firebase köprü token alınamadı.' };
    }
    await signInWithCustomToken(auth, token);
    const user = await waitForFirebaseUser();
    if (!user) {
      return { ok: false, error: 'Firebase oturumu açılamadı.' };
    }
    const expectedUid = serverUid || targetUid;
    if (expectedUid && user.uid !== expectedUid) {
      return { ok: false, error: 'Firebase kullanıcı eşlemesi uyuşmuyor.' };
    }
    notifyFirebaseAuthReady();
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('Firebase auth bridge:', msg);
    return {
      ok: false,
      error: `Firestore bağlantısı kurulamadı: ${msg}`
    };
  }
}

export async function ensureFirebaseAuthForFirestore(opts: {
  email: string;
  legacyFirebaseUid?: string | null;
  password?: string;
  supabaseAccessToken?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isFirebaseEnabled() || getDataProviderMode() === 'supabase') {
    return { ok: true };
  }

  const key = [
    opts.email,
    opts.legacyFirebaseUid || '',
    opts.supabaseAccessToken ? opts.supabaseAccessToken.slice(-12) : ''
  ].join('|');

  if (bridgeInFlight && bridgeInFlightKey === key) {
    return bridgeInFlight;
  }

  bridgeInFlightKey = key;
  bridgeInFlight = (async () => {
    let last: { ok: boolean; error?: string } = { ok: false, error: 'Köprü başarısız' };
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await sleep(400 * attempt);
      last = await bridgeOnce(opts);
      if (last.ok) return last;
    }
    return last;
  })().finally(() => {
    bridgeInFlight = null;
  });

  return bridgeInFlight;
}
