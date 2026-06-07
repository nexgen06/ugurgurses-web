/**
 * Veri katmanı seçimi — firestore (geçiş) | supabase (cutover sonrası)
 */

import { firestoreDb, isFirestoreConfigured } from '../firestore-db';
import { supabaseDb, isSupabaseDataConfigured } from '../supabase-db';
import { pickEnv } from './vite-env';

export type DataProviderMode = 'firebase' | 'supabase';

export function getDataProviderMode(): DataProviderMode {
  const raw = pickEnv('VITE_DATA_PROVIDER', 'firebase').trim().toLowerCase();
  return raw === 'supabase' ? 'supabase' : 'firebase';
}

export function isDataLayerConfigured(): boolean {
  if (getDataProviderMode() === 'supabase') return isSupabaseDataConfigured();
  return isFirestoreConfigured();
}

export function getDataDb() {
  if (getDataProviderMode() === 'supabase') return supabaseDb;
  return firestoreDb;
}
