/**
 * Kurumsal duyuru — Firestore: config/duyuru (alan: metin)
 */

import { getFirebaseFirestore } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PATH = 'config/duyuru';

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
    const db = getFirebaseFirestore();
    await setDoc(
      doc(db, 'config', 'duyuru'),
      { metin: metin.trim(), updated_at: new Date().toISOString() },
      { merge: true }
    );
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Duyuru kaydedilemedi' };
  }
}
