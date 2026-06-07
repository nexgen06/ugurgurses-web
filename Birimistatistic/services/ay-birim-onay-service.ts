/**
 * Ay kapanışı birim onayı — ay_birim_onaylari/{yyyy-MM__birim}
 * Günlük girişte değil; yalnızca ay kapanışı sürecinde (Yönetim).
 */

import { db } from '../db';
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

function mapAyBirimOnay(d: Record<string, unknown>, yyyyMm: string, birim: string): AyBirimOnay {
  return {
    ay: (d.ay as string) || yyyyMm,
    birim: (d.birim as string) || birim,
    onay_uid: d.onay_uid as string | undefined,
    onay_email: d.onay_email as string | undefined,
    onay_at: d.onay_at as string | undefined
  };
}

export async function getAyBirimOnay(yyyyMm: string, birim: string): Promise<AyBirimOnay | null> {
  try {
    const id = ayBirimOnayDocId(yyyyMm, birim);
    const { data, error } = await db.collection(COLLECTION).getById(id);
    if (error || !data) return null;
    return mapAyBirimOnay(data, yyyyMm, birim);
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
    const id = ayBirimOnayDocId(yyyyMm, birim);
    const { error } = await db.collection(COLLECTION).mergeSetById(id, {
      ay: yyyyMm,
      birim,
      onay_uid: actorUid,
      onay_email: actorEmail || '',
      onay_at: new Date().toISOString()
    });
    return { error };
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
