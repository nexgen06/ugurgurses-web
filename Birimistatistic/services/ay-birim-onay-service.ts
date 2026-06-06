/**
 * Ay kapanışı birim onayı — ay_birim_onaylari/{yyyy-MM__birim}
 * Günlük girişte değil; yalnızca ay kapanışı sürecinde (Yönetim).
 */

import { getFirebaseFirestore } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { lockDocId } from '../firestore-db';

const COLLECTION = 'ay_birim_onaylari';

export interface AyBirimOnay {
  ay: string;
  birim: string;
  onay_uid?: string;
  onay_email?: string;
  onay_at?: string;
}

export function ayBirimOnayDocId(yyyyMm: string, birim: string): string {
  return lockDocId(yyyyMm, birim);
}

export async function getAyBirimOnay(yyyyMm: string, birim: string): Promise<AyBirimOnay | null> {
  try {
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, COLLECTION, ayBirimOnayDocId(yyyyMm, birim)));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      ay: (d.ay as string) || yyyyMm,
      birim: (d.birim as string) || birim,
      onay_uid: d.onay_uid as string | undefined,
      onay_email: d.onay_email as string | undefined,
      onay_at: d.onay_at as string | undefined
    };
  } catch {
    return null;
  }
}

export async function setAyBirimOnay(
  yyyyMm: string,
  birim: string,
  actorUid: string,
  actorEmail?: string
): Promise<{ error: string | null }> {
  try {
    const db = getFirebaseFirestore();
    await setDoc(
      doc(db, COLLECTION, ayBirimOnayDocId(yyyyMm, birim)),
      {
        ay: yyyyMm,
        birim,
        onay_uid: actorUid,
        onay_email: actorEmail || '',
        onay_at: new Date().toISOString()
      },
      { merge: true }
    );
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('firestore_data_change'));
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Ay birim onayı kaydedilemedi' };
  }
}

export function hasAyBirimOnay(onay: AyBirimOnay | null): boolean {
  return Boolean(onay?.onay_at);
}

/** Tüm birimler için ay onayı var mı (eksik birim adlarını döner) */
export async function eksikAyBirimOnaylari(yyyyMm: string, birimler: string[]): Promise<string[]> {
  const eksik: string[] = [];
  for (const b of birimler) {
    const o = await getAyBirimOnay(yyyyMm, b);
    if (!hasAyBirimOnay(o)) eksik.push(b);
  }
  return eksik;
}
