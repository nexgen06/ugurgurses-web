/**
 * Supabase istemcisi — Livetable (görev yönetimi) hub projesi.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { viteEnv } from './vite-env';

export const supabaseConfig = {
  url: viteEnv.supabaseUrl,
  anonKey: viteEnv.supabaseAnonKey
};

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseConfig.url &&
    supabaseConfig.anonKey &&
    supabaseConfig.url.startsWith('https://') &&
    supabaseConfig.anonKey.length > 20
  );
}

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase yapılandırması eksik. .env veya runtime-env.js içinde VITE_SUPABASE_* ayarlayın.');
  }
  if (!client) {
    client = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return client;
}
