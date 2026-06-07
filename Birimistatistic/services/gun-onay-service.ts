/**
 * Kesinleştirme onay zinciri — gun_onaylari/{tarih__birim}
 * Günlük: editör girer → (isteğe bağlı) kurum onayı → kesinleştirme.
 * Birim onayı ay kapanışında (ay_birim_onaylari) — bkz. ay-birim-onay-service.ts
 */

import { db } from '../db';
import { lockDocId } from '../firestore-db';

const COLLECTION = 'gun_onaylari';

export interface GunOnay {
  kayit_tarihi: string;
  birim: string;
  birim_onay_uid?: string;
  birim_onay_email?: string;
  birim_onay_at?: string;
  kurum_onay_uid?: string;
  kurum_onay_email?: string;
  kurum_onay_at?: string;
}

function mapGunOnay(d: Record<string, unknown>, kayit_tarihi: string, birim: string): GunOnay {
  return {
    kayit_tarihi: (d.kayit_tarihi as string) || kayit_tarihi,
    birim: (d.birim as string) || birim,
    birim_onay_uid: d.birim_onay_uid as string | undefined,
    birim_onay_email: d.birim_onay_email as string | undefined,
    birim_onay_at: d.birim_onay_at as string | undefined,
    kurum_onay_uid: d.kurum_onay_uid as string | undefined,
    kurum_onay_email: d.kurum_onay_email as string | undefined,
    kurum_onay_at: d.kurum_onay_at as string | undefined
  };
}

export async function getGunOnay(kayit_tarihi: string, birim: string): Promise<GunOnay | null> {
  try {
    const id = lockDocId(kayit_tarihi, birim);
    const { data, error } = await db.collection(COLLECTION).getById(id);
    if (error || !data) return null;
    return mapGunOnay(data, kayit_tarihi, birim);
  } catch {
    return null;
  }
}

export async function setBirimOnay(
  kayit_tarihi: string,
  birim: string,
  actorUid: string,
  actorEmail?: string
): Promise<{ error: string | null }> {
  try {
    const id = lockDocId(kayit_tarihi, birim);
    const existing = await getGunOnay(kayit_tarihi, birim);
    const { error } = await db.collection(COLLECTION).mergeSetById(id, {
      kayit_tarihi,
      birim,
      birim_onay_uid: actorUid,
      birim_onay_email: actorEmail || '',
      birim_onay_at: new Date().toISOString(),
      kurum_onay_uid: existing?.kurum_onay_uid,
      kurum_onay_email: existing?.kurum_onay_email,
      kurum_onay_at: existing?.kurum_onay_at
    });
    return { error };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Birim onayı kaydedilemedi' };
  }
}

export async function setKurumOnay(
  kayit_tarihi: string,
  birim: string,
  actorUid: string,
  actorEmail?: string
): Promise<{ error: string | null }> {
  try {
    const id = lockDocId(kayit_tarihi, birim);
    const existing = await getGunOnay(kayit_tarihi, birim);
    const { error } = await db.collection(COLLECTION).mergeSetById(id, {
      kayit_tarihi,
      birim,
      birim_onay_uid: existing?.birim_onay_uid,
      birim_onay_email: existing?.birim_onay_email,
      birim_onay_at: existing?.birim_onay_at,
      kurum_onay_uid: actorUid,
      kurum_onay_email: actorEmail || '',
      kurum_onay_at: new Date().toISOString()
    });
    return { error };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Kurum onayı kaydedilemedi' };
  }
}

export function hasBirimOnay(onay: GunOnay | null): boolean {
  return Boolean(onay?.birim_onay_at);
}

export function hasKurumOnay(onay: GunOnay | null): boolean {
  return Boolean(onay?.kurum_onay_at);
}
