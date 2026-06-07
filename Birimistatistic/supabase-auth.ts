/**
 * Supabase Auth adapter — db.auth arayüzü ile uyumlu.
 * Rol/birim: Firestore users/{legacy_uid} + bi_profiles + config/admins.
 */

import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase';
import {
  fetchBiProfile,
  ensureBiProfile,
  biProfileToRoleFields,
  mergeProfileFields
} from './services/bi-profiles-service';
import {
  fetchUserProfile,
  ensureUserDoc,
  getAdminUids,
  type UserProfileRoleFields
} from './services/users-service';
import type { SessionUser } from './types';
import { ensureFirebaseAuthForFirestore } from './lib/firebase-auth-bridge';
import { withTimeout } from './lib/async-timeout';
import { isFirebaseEnabled } from './lib/vite-env';
import { getDataProviderMode } from './lib/data-provider';

const SESSION_LOOKUP_MS = 6_000;

function supabaseUserToSessionUser(
  authUserId: string,
  email: string,
  profile: UserProfileRoleFields,
  legacyFirebaseUid?: string | null,
  authMeta?: Record<string, unknown>
): SessionUser {
  const fullName =
    profile.ad && profile.soyad ? `${profile.ad} ${profile.soyad}` : undefined;
  return {
    id: legacyFirebaseUid || authUserId,
    email,
    user_metadata: {
      full_name: fullName,
      auth_id: authUserId,
      legacy_firebase_uid: legacyFirebaseUid || undefined,
      ...(authMeta?.default_password === true ? { default_password: true } : {})
    },
    role: profile.role,
    birimler: profile.birimler,
    ad: profile.ad,
    soyad: profile.soyad,
    profil_tamamlandi: profile.profil_tamamlandi
  };
}

/** Hızlı oturum — yalnızca bi_profiles; Firestore/köprü arka planda. */
async function resolveSessionUserFast(
  authUserId: string,
  email: string,
  opts?: { password?: string; supabaseAccessToken?: string | null; authMeta?: Record<string, unknown> }
): Promise<SessionUser> {
  void ensureBiProfile(authUserId, email);
  let biRow: Awaited<ReturnType<typeof fetchBiProfile>> = null;
  try {
    biRow = await withTimeout(fetchBiProfile(authUserId), SESSION_LOOKUP_MS, 'Profil');
  } catch (e) {
    console.warn('fetchBiProfile:', e);
  }
  const legacyUid = biRow?.legacy_firebase_uid || null;
  const biFields = biProfileToRoleFields(biRow) || { role: 'viewer' as const, birimler: [] };

  const skipFirebase = !isFirebaseEnabled() || getDataProviderMode() === 'supabase';
  if (!skipFirebase) {
    void ensureFirebaseAuthForFirestore({
      email,
      legacyFirebaseUid: legacyUid,
      password: opts?.password,
      supabaseAccessToken: opts?.supabaseAccessToken
    }).then((bridge) => {
      if (!bridge.ok) console.warn('Firebase bridge:', bridge.error);
    });
    void enrichSessionUserFromFirestore(authUserId, email, legacyUid, biFields);
  }

  return supabaseUserToSessionUser(authUserId, email, biFields, legacyUid, opts?.authMeta);
}

/** Firestore + admin listesi ile profili zenginleştir (oturum açılışını bloklamaz). */
function enrichSessionUserFromFirestore(
  authUserId: string,
  email: string,
  legacyUid: string | null,
  biFields: UserProfileRoleFields
): void {
  void (async () => {
    try {
      const { getFirebaseAuth } = await import('./firebase');
      const auth = getFirebaseAuth();
      if (!auth.currentUser) return;
      const effectiveFirestoreUid = legacyUid || authUserId;
      if (legacyUid && auth.currentUser.uid !== legacyUid) return;

      await ensureUserDoc(effectiveFirestoreUid, email);
      const firestoreProfile = await fetchUserProfile(effectiveFirestoreUid);
      const merged = mergeProfileFields(biFields, firestoreProfile);
      let adminUids: string[] = [];
      try {
        adminUids = await getAdminUids();
      } catch (e) {
        console.warn('getAdminUids:', e);
      }
      const isAdmin =
        adminUids.includes(authUserId) ||
        adminUids.includes(effectiveFirestoreUid) ||
        merged.role === 'admin';
      if (isAdmin && merged.role !== 'admin') {
        console.info('Profil güncellendi: admin rolü Firestore/config üzerinden');
      }
    } catch (e) {
      console.warn('Firestore profil zenginleştirme:', e);
    }
  })();
}

function mapSignInError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return 'E-posta veya şifre hatalı.';
  }
  if (m.includes('email not confirmed')) {
    return 'E-posta adresiniz henüz doğrulanmamış.';
  }
  if (m.includes('too many requests')) {
    return 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.';
  }
  return message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
}

export const SupabaseAuthAdapter = {
  async getSession() {
    try {
      if (!isSupabaseConfigured()) {
        return { data: { session: null }, error: 'Supabase yapılandırılmamış' };
      }
      const supabase = getSupabaseClient();
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        SESSION_LOOKUP_MS,
        'Oturum kontrolü'
      );
      if (error) return { data: { session: null }, error: error.message };
      const session = data.session;
      const user = session?.user;
      if (!user) return { data: { session: null }, error: null };
      const sessionUser = await resolveSessionUserFast(user.id, user.email || '', {
        supabaseAccessToken: session.access_token,
        authMeta: user.user_metadata
      });
      return { data: { session: { user: sessionUser } }, error: null };
    } catch (e) {
      console.error('getSession:', e);
      return { data: { session: null }, error: e instanceof Error ? e.message : 'Oturum alınamadı' };
    }
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { data: null, error: mapSignInError(error.message) };
      }
      const user = data.user;
      const accessToken = data.session?.access_token;
      if (!user) return { data: null, error: 'Giriş başarısız.' };
      const sessionUser = await resolveSessionUserFast(user.id, user.email || email, {
        password,
        supabaseAccessToken: accessToken,
        authMeta: user.user_metadata
      });
      return { data: { session: { user: sessionUser } }, error: null };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Giriş başarısız.';
      return { data: null, error: mapSignInError(message) };
    }
  },

  async signOut() {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();
      return { error: error?.message || null };
    } catch (e) {
      return { error: (e as Error).message };
    }
  },

  onAuthStateChange(callback: (event: string, session: { user: SessionUser } | null) => void) {
    try {
      const supabase = getSupabaseClient();
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!session?.user) {
          callback(event === 'SIGNED_OUT' ? 'SIGNED_OUT' : event, null);
          return;
        }
        // await kullanma — Supabase auth kilidi getSession ile kilitlenir.
        void (async () => {
          try {
            const sessionUser = await resolveSessionUserFast(
              session.user.id,
              session.user.email || '',
              { supabaseAccessToken: session.access_token, authMeta: session.user.user_metadata }
            );
            callback('SIGNED_IN', { user: sessionUser });
          } catch (e) {
            console.error('onAuthStateChange profile:', e);
            callback('SIGNED_IN', {
              user: supabaseUserToSessionUser(session.user.id, session.user.email || '', {
                role: 'viewer',
                birimler: []
              })
            });
          }
        })();
      });
      return { data: { subscription: { unsubscribe: () => data.subscription.unsubscribe() } } };
    } catch (e) {
      console.error('onAuthStateChange init:', e);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },

  async getUser() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { data: { user: null }, error: error?.message || null };
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = await resolveSessionUserFast(data.user.id, data.user.email || '', {
        supabaseAccessToken: sessionData.session?.access_token,
        authMeta: data.user.user_metadata
      });
      return { data: { user: sessionUser }, error: null };
    } catch {
      return {
        data: {
          user: supabaseUserToSessionUser(data.user.id, data.user.email || '', {
            role: 'viewer',
            birimler: []
          })
        },
        error: null
      };
    }
  },

  async sendPasswordResetEmail(email: string): Promise<{ error: string | null }> {
    try {
      const supabase = getSupabaseClient();
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Şifre sıfırlama isteği gönderilemedi.' };
    }
  }
};
