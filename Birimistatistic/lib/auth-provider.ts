/**
 * Auth sağlayıcı seçimi — geçiş döneminde dual mod desteklenir.
 */

import { FirebaseAuthAdapter } from '../firebase-auth';
import { SupabaseAuthAdapter } from '../supabase-auth';
import { isSupabaseConfigured } from './supabase';
import { getAuthProviderMode } from './vite-env';

type AuthAdapter = typeof FirebaseAuthAdapter;

function dualAuthAdapter(): AuthAdapter {
  return {
    async getSession() {
      if (isSupabaseConfigured()) {
        const sb = await SupabaseAuthAdapter.getSession();
        if (sb.data?.session) return sb;
      }
      return FirebaseAuthAdapter.getSession();
    },

    async signInWithPassword(creds: { email: string; password: string }) {
      let supabaseError: string | null = null;
      if (isSupabaseConfigured()) {
        const sb = await SupabaseAuthAdapter.signInWithPassword(creds);
        if (sb.data?.session) return sb;
        supabaseError = sb.error || null;
      }
      const fb = await FirebaseAuthAdapter.signInWithPassword(creds);
      if (fb.data?.session) return fb;
      return {
        data: null,
        error: supabaseError || fb.error || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.'
      };
    },

    async signOut() {
      const errors: string[] = [];
      if (isSupabaseConfigured()) {
        const r = await SupabaseAuthAdapter.signOut();
        if (r.error) errors.push(r.error);
      }
      const r2 = await FirebaseAuthAdapter.signOut();
      if (r2.error) errors.push(r2.error);
      return { error: errors[0] || null };
    },

    onAuthStateChange(callback: (event: string, session: unknown) => void) {
      const unsubs: Array<() => void> = [];
      let supabaseSessionActive = false;

      if (isSupabaseConfigured()) {
        const sb = SupabaseAuthAdapter.onAuthStateChange((_event, session) => {
          supabaseSessionActive = Boolean(session);
          callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
        });
        unsubs.push(() => sb.data.subscription.unsubscribe());
      }

      const fb = FirebaseAuthAdapter.onAuthStateChange((event, session) => {
        if (isSupabaseConfigured()) {
          if (supabaseSessionActive) return;
          callback(session ? event : 'SIGNED_OUT', session);
          return;
        }
        callback(event, session);
      });
      unsubs.push(() => fb.data.subscription.unsubscribe());

      return {
        data: {
          subscription: {
            unsubscribe: () => unsubs.forEach((u) => u())
          }
        }
      };
    },

    async getUser() {
      if (isSupabaseConfigured()) {
        const sb = await SupabaseAuthAdapter.getUser();
        if (sb.data?.user) return sb;
      }
      return FirebaseAuthAdapter.getUser();
    },

    async sendPasswordResetEmail(email: string) {
      if (isSupabaseConfigured()) {
        const sb = await SupabaseAuthAdapter.sendPasswordResetEmail(email);
        if (!sb.error) return sb;
      }
      return FirebaseAuthAdapter.sendPasswordResetEmail(email);
    }
  };
}

export function getAuthAdapter(): AuthAdapter {
  const mode = getAuthProviderMode();
  if (mode === 'supabase') return SupabaseAuthAdapter;
  if (mode === 'dual') return dualAuthAdapter();
  return FirebaseAuthAdapter;
}
