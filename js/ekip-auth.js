import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm';
import {
  EKIP_SUPABASE_URL,
  EKIP_SUPABASE_ANON_KEY,
  EKIP_AUTH_STORAGE_KEY,
  isEkipSupabaseReady
} from './ekip-supabase-config.js';

let ekipClient = null;

export function getEkipSupabase() {
  if (!isEkipSupabaseReady()) return null;
  if (!ekipClient) {
    ekipClient = createClient(EKIP_SUPABASE_URL, EKIP_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: EKIP_AUTH_STORAGE_KEY
      }
    });
  }
  return ekipClient;
}

export async function signInEkip(email, password) {
  const sb = getEkipSupabase();
  if (!sb) return { ok: false, error: 'ekip_supabase_not_configured' };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, user: data.user };
}

export async function signOutEkip() {
  const sb = getEkipSupabase();
  if (sb) await sb.auth.signOut();
}
