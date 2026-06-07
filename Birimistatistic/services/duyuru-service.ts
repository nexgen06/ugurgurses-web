/**
 * Kurumsal duyuru — Firestore: config/duyuru (alan: metin)
 */

import { getFirebaseFirestore } from '../firebase';
import { getSupabaseClient } from '../lib/supabase';
import { getDataProviderMode } from '../lib/data-provider';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface DuyuruDoc {
  metin: string;
  updated_at?: string;
}

/** Modal tekrarını tetikleyen sürüm anahtarı */
export function duyuruVersionKey(doc: Pick<DuyuruDoc, 'metin' | 'updated_at'>): string {
  if (doc.updated_at) return doc.updated_at;
  const m = doc.metin.trim();
  return m ? `metin:${m}` : '';
}

export async function getDuyuru(): Promise<DuyuruDoc> {
  try {
    if (getDataProviderMode() === 'supabase') {
      const { data, error } = await getSupabaseClient()
        .from('bi_config_duyuru')
        .select('metin, updated_at')
        .eq('id', 'duyuru')
        .maybeSingle();
      if (error) throw error;
      const metin = typeof data?.metin === 'string' ? data.metin.trim() : '';
      return {
        metin,
        updated_at: typeof data?.updated_at === 'string' ? data.updated_at : undefined
      };
    }
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, 'config', 'duyuru'));
    const data = snap.data();
    const metin = typeof data?.metin === 'string' ? data.metin.trim() : '';
    return { metin, updated_at: typeof data?.updated_at === 'string' ? data.updated_at : undefined };
  } catch {
    return { metin: '' };
  }
}

export async function setDuyuru(metin: string): Promise<{ error: string | null }> {
  try {
    const payload = { metin: metin.trim(), updated_at: new Date().toISOString() };
    if (getDataProviderMode() === 'supabase') {
      const { error } = await getSupabaseClient()
        .from('bi_config_duyuru')
        .upsert({ id: 'duyuru', ...payload });
      return { error: error?.message || null };
    }
    const db = getFirebaseFirestore();
    await setDoc(doc(db, 'config', 'duyuru'), payload, { merge: true });
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Duyuru kaydedilemedi' };
  }
}
