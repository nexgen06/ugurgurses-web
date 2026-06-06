/**
 * Kesinleştirme akış ayarları — config/akis
 */

import { getFirebaseFirestore } from '../firebase';
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
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, 'config', 'akis'));
    const d = snap.data();
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
    const db = getFirebaseFirestore();
    await setDoc(doc(db, 'config', 'akis'), config, { merge: true });
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Ayar kaydedilemedi' };
  }
}
