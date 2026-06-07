/**
 * Kesinleştirme akış ayarları — config/akis
 */

import { getFirebaseFirestore } from '../firebase';
import { getSupabaseClient } from '../lib/supabase';
import { getDataProviderMode } from '../lib/data-provider';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface AkisConfig {
  /** true ise kesinleştirme için admin kurum onayı da gerekir */
  kurum_onay_zorunlu: boolean;
  /** true ise ay kapanışında birim onayı gerekir (günlük girişte kullanılmaz; varsayılan kapalı) */
  birim_onay_aktif: boolean;
  /** true ise proje yetkilisi/admin girişinde haftalık kesinleştirme özeti kartı gösterilir (varsayılan kapalı) */
  haftalik_ozet_aktif: boolean;
}

const DEFAULTS: AkisConfig = {
  kurum_onay_zorunlu: false,
  birim_onay_aktif: false,
  haftalik_ozet_aktif: false
};

export async function getAkisConfig(): Promise<AkisConfig> {
  try {
    let d: Record<string, unknown> | undefined;
    if (getDataProviderMode() === 'supabase') {
      const { data, error } = await getSupabaseClient()
        .from('bi_config_akis')
        .select('data')
        .eq('id', 'akis')
        .maybeSingle();
      if (error) throw error;
      d = (data?.data as Record<string, unknown>) || undefined;
    } else {
      const db = getFirebaseFirestore();
      const snap = await getDoc(doc(db, 'config', 'akis'));
      d = snap.data();
    }
    return {
      kurum_onay_zorunlu: d?.kurum_onay_zorunlu === true,
      birim_onay_aktif: d?.birim_onay_aktif === true,
      haftalik_ozet_aktif: d?.haftalik_ozet_aktif === true
    };
  } catch {
    return DEFAULTS;
  }
}

export async function setAkisConfig(config: AkisConfig): Promise<{ error: string | null }> {
  try {
    if (getDataProviderMode() === 'supabase') {
      const { error } = await getSupabaseClient()
        .from('bi_config_akis')
        .upsert({
          id: 'akis',
          data: config,
          updated_at: new Date().toISOString()
        });
      return { error: error?.message || null };
    }
    const db = getFirebaseFirestore();
    await setDoc(doc(db, 'config', 'akis'), config, { merge: true });
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Ayar kaydedilemedi' };
  }
}
