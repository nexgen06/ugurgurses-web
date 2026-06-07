/**
 * Firebase Auth adapter — db.auth arayüzü ile uyumlu.
 * Rol ve birimler Firestore users/{uid} dokümanından okunur; ilk girişte doküman oluşturulur.
 */

import { getFirebaseAuth, getFirebaseApp } from './firebase';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  type User
} from 'firebase/auth';
import { fetchUserProfile, ensureUserDoc, getAdminUids, type UserProfileRoleFields } from './services/users-service';
import type { SessionUser } from './types';

function auth() {
  return getFirebaseAuth();
}

function firebaseUserToSessionUser(user: User | null, profile: UserProfileRoleFields): SessionUser | null {
  if (!user) return null;
  const fullName =
    profile.ad && profile.soyad ? `${profile.ad} ${profile.soyad}` : user.displayName || undefined;
  return {
    id: user.uid,
    email: user.email || '',
    user_metadata: { full_name: fullName },
    role: profile.role,
    birimler: profile.birimler,
    ad: profile.ad,
    soyad: profile.soyad,
    profil_tamamlandi: profile.profil_tamamlandi
  };
}

async function getSessionUserWithProfile(user: User): Promise<SessionUser> {
  await ensureUserDoc(user.uid, user.email || '');
  const profile = await fetchUserProfile(user.uid);
  const adminUids = await getAdminUids();
  const role = adminUids.includes(user.uid) ? 'admin' : profile.role;
  return firebaseUserToSessionUser(user, { ...profile, role })!;
}

export const FirebaseAuthAdapter = {
  async getSession() {
    try {
      const user = auth().currentUser;
      if (!user) return { data: { session: null }, error: null };
      const sessionUser = await getSessionUserWithProfile(user);
      return { data: { session: { user: sessionUser } }, error: null };
    } catch (e) {
      console.error('getSession:', e);
      return { data: { session: null }, error: e instanceof Error ? e.message : 'Oturum alınamadı' };
    }
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    try {
      await getFirebaseApp();
      const cred = await signInWithEmailAndPassword(auth(), email, password);
      const sessionUser = await getSessionUserWithProfile(cred.user);
      return { data: { session: { user: sessionUser } }, error: null };
    } catch (e: any) {
      const code = e?.code || '';
      let message = 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
      if (code === 'auth/user-not-found') {
        message =
          'Bu e-posta ile kayıtlı hesap bulunamadı. Hesabınız sistem yöneticiniz tarafından oluşturulmalıdır.';
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        message = 'E-posta veya şifre hatalı.';
      } else if (code === 'auth/too-many-requests') {
        message = 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.';
      } else if (e?.message) {
        message = e.message;
      }
      return { data: null, error: message };
    }
  },

  async signOut() {
    try {
      await firebaseSignOut(auth());
      return { error: null };
    } catch (e) {
      return { error: (e as Error).message };
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    try {
      const unsubscribe = onAuthStateChanged(auth(), (user) => {
        if (!user) {
          callback('SIGNED_OUT', null);
          return;
        }
        void (async () => {
          try {
            const sessionUser = await getSessionUserWithProfile(user);
            callback('SIGNED_IN', { user: sessionUser });
          } catch (e) {
            console.error('onAuthStateChange profile:', e);
            callback('SIGNED_IN', {
              user: firebaseUserToSessionUser(user, { role: 'viewer', birimler: [] })
            });
          }
        })();
      });
      return { data: { subscription: { unsubscribe } } };
    } catch (e) {
      console.error('onAuthStateChange init:', e);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },

  async getUser() {
    const user = auth().currentUser;
    if (!user) return { data: { user: null }, error: null };
    try {
      const sessionUser = await getSessionUserWithProfile(user);
      return { data: { user: sessionUser }, error: null };
    } catch (e) {
      return { data: { user: firebaseUserToSessionUser(user, { role: 'viewer', birimler: [] }) }, error: null };
    }
  },

  async sendPasswordResetEmail(email: string): Promise<{ error: string | null }> {
    try {
      await getFirebaseApp();
      await firebaseSendPasswordResetEmail(auth(), email);
      return { error: null };
    } catch (e: any) {
      const code = e?.code || '';
      let message = 'Şifre sıfırlama isteği gönderilemedi.';
      if (code === 'auth/user-not-found') message = 'Bu e-posta adresi sistemde kayıtlı değil.';
      else if (code === 'auth/invalid-email') message = 'Geçerli bir e-posta adresi girin.';
      else if (code === 'auth/too-many-requests') message = 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.';
      else if (e?.message) message = e.message;
      return { error: message };
    }
  }
};
