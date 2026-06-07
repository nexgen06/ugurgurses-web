/**
 * Ekip hub Supabase (Hizmet Girişi + Telefon Rehberi verisi)
 * Auth oturumu portfolyo oturumundan ayrı storage key kullanır.
 */

export const EKIP_SUPABASE_URL = 'https://mmahcxmfnuoovgqgvjag.supabase.co';
export const EKIP_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tYWhjeG1mbnVvb3ZncWd2amFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMDg2OTIsImV4cCI6MjA3ODg4NDY5Mn0.twxgZyCYvITgFkkpJQwpDX4TgC6NpA1-Rm57QdcZVh8';

export const EKIP_AUTH_STORAGE_KEY = 'ekip-supabase-auth';

export function isEkipSupabaseReady() {
  return Boolean(
    EKIP_SUPABASE_URL &&
    EKIP_SUPABASE_ANON_KEY &&
    EKIP_SUPABASE_URL.startsWith('https://') &&
    EKIP_SUPABASE_ANON_KEY.length > 20
  );
}
