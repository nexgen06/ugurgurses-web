/**
 * Vite ortam değişkenleri — doğrudan import.meta.env ile build'e gömülür.
 * Canlıda runtime-env.js (window.__BI_ENV__) ile override edilebilir.
 */

declare global {
  interface Window {
    __BI_ENV__?: Record<string, string | undefined>;
  }
}

function runtime(): Record<string, string | undefined> {
  if (typeof window !== 'undefined' && window.__BI_ENV__) return window.__BI_ENV__;
  return {};
}

export function pickEnv(key: string, fallback = ''): string {
  const rt = runtime()[key];
  if (rt !== undefined && rt !== '') return rt;
  const vite = import.meta.env[key as keyof ImportMetaEnv];
  return typeof vite === 'string' ? vite : fallback;
}

function pick(key: string, fallback = ''): string {
  return pickEnv(key, fallback);
}

export function getAuthProviderMode(): 'firebase' | 'supabase' | 'dual' {
  const raw = pick('VITE_AUTH_PROVIDER', 'firebase').trim().toLowerCase();
  if (raw === 'supabase' || raw === 'dual') return raw;
  return 'firebase';
}

export function isFirebaseEnabled(): boolean {
  return pick('VITE_FIREBASE_ENABLED', 'true').trim().toLowerCase() !== 'false';
}

export const viteEnv = {
  get authProvider() {
    return getAuthProviderMode();
  },
  get firebaseEnabled() {
    return isFirebaseEnabled();
  },
  get useFirestore() {
    return isFirebaseEnabled() && pick('VITE_USE_FIRESTORE') === 'true';
  },
  get supabaseUrl() {
    return pick('VITE_SUPABASE_URL');
  },
  get supabaseAnonKey() {
    return pick('VITE_SUPABASE_ANON_KEY');
  },
  get firebaseApiKey() {
    return pick('VITE_FIREBASE_API_KEY');
  },
  get firebaseAuthDomain() {
    return pick('VITE_FIREBASE_AUTH_DOMAIN');
  },
  get firebaseProjectId() {
    return pick('VITE_FIREBASE_PROJECT_ID');
  },
  get firebaseStorageBucket() {
    return pick('VITE_FIREBASE_STORAGE_BUCKET');
  },
  get firebaseMessagingSenderId() {
    return pick('VITE_FIREBASE_MESSAGING_SENDER_ID');
  },
  get firebaseAppId() {
    return pick('VITE_FIREBASE_APP_ID');
  }
};
