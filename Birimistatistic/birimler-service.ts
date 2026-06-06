/**
 * Birim listesi yönetimi — Firestore: config/birimler (alan: birimler, string dizisi).
 * Doküman yoksa veya boşsa constants.tsx'teki varsayılan liste kullanılır.
 */

import { getFirebaseFirestore } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { BIRIMLER as DEFAULT_BIRIMLER } from './constants';

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
    const db = getFirebaseFirestore();
    await setDoc(doc(db, 'config', 'birimler'), { birimler: cleanList(list) }, { merge: true });
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Birimler kaydedilemedi' };
  }
}
