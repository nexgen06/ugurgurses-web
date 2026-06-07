/**
 * Supabase oturumu açıkken ekip/phone için Firebase oturumu senkronize eder.
 * Köprü: POST /api/firebase-custom-token (Railway web servisi)
 */

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { firebaseConfig, FIREBASE_BRIDGE_ENABLED } from './auth-config.js';

let firebaseAuth = null;
let bridgeInFlight = null;
let bridgeInFlightKey = '';

function getFirebaseAuth() {
  if (!FIREBASE_BRIDGE_ENABLED) return null;
  if (!firebaseAuth) {
    const existing = getApps();
    const app = existing.length ? existing[0] : initializeApp(firebaseConfig);
    firebaseAuth = getAuth(app);
  }
  return firebaseAuth;
}

function waitForFirebaseUser(timeoutMs = 8000) {
  const auth = getFirebaseAuth();
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try { unsub(); } catch { /* */ }
      reject(new Error('Firebase oturumu zaman aşımı'));
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      clearTimeout(timer);
      try { unsub(); } catch { /* */ }
      resolve(user);
    });
  });
}

async function fetchCustomToken(accessToken) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${window.location.origin}/api/firebase-custom-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
      signal: controller.signal
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Köprü API hatası');
    return json;
  } finally {
    clearTimeout(timer);
  }
}

async function bridgeOnce(accessToken) {
  const auth = getFirebaseAuth();
  if (!auth || !accessToken) return { ok: false, error: 'Köprü yapılandırılmamış' };

  if (auth.currentUser) return { ok: true };

  try {
    const { token } = await fetchCustomToken(accessToken);
    if (!token) return { ok: false, error: 'Firebase token alınamadı' };
    await signInWithCustomToken(auth, token);
    await waitForFirebaseUser();
    return { ok: true };
  } catch (e) {
    console.warn('Firebase köprü:', e);
    return { ok: false, error: e?.message || 'Firebase köprü başarısız' };
  }
}

export async function ensureFirebaseBridge(accessToken) {
  if (!FIREBASE_BRIDGE_ENABLED || !accessToken) return { ok: true };

  const key = accessToken.slice(-16);
  if (bridgeInFlight && bridgeInFlightKey === key) return bridgeInFlight;

  bridgeInFlightKey = key;
  bridgeInFlight = (async () => {
    for (let i = 0; i < 3; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 400 * i));
      const result = await bridgeOnce(accessToken);
      if (result.ok) return result;
      if (i === 2) return result;
    }
    return { ok: false, error: 'Köprü başarısız' };
  })().finally(() => {
    bridgeInFlight = null;
  });

  return bridgeInFlight;
}

export async function signOutFirebase() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Firebase çıkış:', e);
  }
}

export function getBridgedFirebaseAuth() {
  return getFirebaseAuth();
}
