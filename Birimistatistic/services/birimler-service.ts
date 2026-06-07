/**
 * Birim listesi yönetimi — Firestore: config/birimler (alan: birimler, string dizisi).
 * Doküman yoksa veya boşsa constants.tsx'teki varsayılan liste kullanılır.
 */

import { getFirebaseFirestore } from '../firebase';
import { getSupabaseClient } from '../lib/supabase';
import { getDataProviderMode } from '../lib/data-provider';
import { waitForFirestoreAuth } from '../lib/firestore-auth-gate';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { BIRIMLER as DEFAULT_BIRIMLER } from '../constants';

function cleanList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return Array.from(
    new Set(
      list
        .filter((b): b is string => typeof b === 'string')
        .map((b) => b.trim())
        .filter((b) => b !== '')
    )
  );
}

/** config/birimler dokümanından birim listesini al; yoksa varsayılanı döndür. */
export async function getBirimler(): Promise<string[]> {
  try {
    const authed = await waitForFirestoreAuth();
    if (!authed) return [...DEFAULT_BIRIMLER];
    if (getDataProviderMode() === 'supabase') {
      const { data, error } = await getSupabaseClient()
        .from('bi_config_birimler')
        .select('birimler')
        .eq('id', 'birimler')
        .maybeSingle();
      if (error) throw error;
      const list = cleanList(data?.birimler);
      return list.length > 0 ? list : [...DEFAULT_BIRIMLER];
    }
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, 'config', 'birimler'));
    const data = snap.data();
    const list = cleanList(data?.birimler);
    return list.length > 0 ? list : [...DEFAULT_BIRIMLER];
  } catch {
    return [...DEFAULT_BIRIMLER];
  }
}

/** Birim listesini güncelle (yalnızca admin yetkisiyle çalışır). */
export async function setBirimler(list: string[]): Promise<{ error: string | null }> {
  try {
    if (getDataProviderMode() === 'supabase') {
      const { error } = await getSupabaseClient()
        .from('bi_config_birimler')
        .upsert({
          id: 'birimler',
          birimler: cleanList(list),
          updated_at: new Date().toISOString()
        });
      return { error: error?.message || null };
    }
    const db = getFirebaseFirestore();
    await setDoc(doc(db, 'config', 'birimler'), { birimler: cleanList(list) }, { merge: true });
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Birimler kaydedilemedi' };
  }
}
