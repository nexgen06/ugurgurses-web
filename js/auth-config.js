/**
 * Portfolyo auth yapılandırması.
 * Livetable / Birim İstatistik Supabase projesi: lgvhlldqdczrnimeetct
 *
 * AUTH_MODE: supabase (Firebase giriş kaldırıldı)
 * FIREBASE_BRIDGE_ENABLED: ekip/phone uygulamaları hâlâ Firebase JWT ile
 *   Supabase RLS kullanır; Supabase girişinden sonra köprü sessiz Firebase oturumu açar.
 */

export const AUTH_MODE = 'supabase';

export const FIREBASE_BRIDGE_ENABLED = true;

export const SUPABASE_URL = 'https://lgvhlldqdczrnimeetct.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndmhsbGRxZGN6cm5pbWVldGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTIwOTcsImV4cCI6MjA4NTYyODA5N30.9Y5gNcUeaNdBHjefjYkHKuAFGPqmx67GNdrhbPahCJM';

/** Köprü API için Firebase yapılandırması (yalnızca custom token oturumu) */
export const firebaseConfig = {
  apiKey: 'AIzaSyDkEVYHW6isG3Ga_ZixMNW8KUQfLefSeyM',
  authDomain: 'mulakat-takip-sistemi.firebaseapp.com',
  projectId: 'mulakat-takip-sistemi',
  storageBucket: 'mulakat-takip-sistemi.firebasestorage.app',
  messagingSenderId: '1050671861081',
  appId: '1:1050671861081:web:1e41fc9305731961809048'
};

export function isSupabaseReady() {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_ANON_KEY.length > 20
  );
}
