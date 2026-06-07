/**
 * Personel izin / rapor kayıtları — personel_izinleri
 * Türler: yillik_izin, rapor, diger
 */

import { db } from '../db';

export type PersonelIzinTuru = 'yillik_izin' | 'rapor' | 'diger';

export const IZIN_TUR_LABELS: Record<PersonelIzinTuru, string> = {
  yillik_izin: 'Yıllık izin',
  rapor: 'Rapor',
  diger: 'Diğer'
};

export interface PersonelIzin {
  id: string;
  user_id: string;
  birim: string;
  baslangic: string;
  bitis: string;
  tur: PersonelIzinTuru;
  aciklama?: string;
  created_at: string;
  created_by_uid: string;
}

const COLLECTION = 'personel_izinleri';

export function parseIzinTuru(v: unknown): PersonelIzinTuru {
  if (v === 'yillik_izin' || v === 'rapor' || v === 'diger') return v;
  return 'diger';
}

export function dateInIzinRange(tarih: string, baslangic: string, bitis: string): boolean {
  return tarih >= baslangic && tarih <= bitis;
}

export function izinCoversDate(izin: Pick<PersonelIzin, 'baslangic' | 'bitis'>, tarih: string): boolean {
  return dateInIzinRange(tarih, izin.baslangic, izin.bitis);
}

function mapDoc(row: Record<string, unknown>): PersonelIzin {
  return {
    id: String(row.id || ''),
    user_id: (row.user_id as string) || '',
    birim: (row.birim as string) || '',
    baslangic: (row.baslangic as string) || '',
    bitis: (row.bitis as string) || '',
    tur: parseIzinTuru(row.tur),
    aciklama: (row.aciklama as string) || undefined,
    created_at: (row.created_at as string) || '',
    created_by_uid: (row.created_by_uid as string) || ''
  };
}

export async function listPersonelIzins(): Promise<{ data: PersonelIzin[]; error: string | null }> {
  try {
    const { data, error } = await db.collection(COLLECTION).find({});
    if (error) throw new Error(error);
    return { data: (data || []).map((row) => mapDoc(row as Record<string, unknown>)), error: null };
  } catch (e: unknown) {
    return { data: [], error: e instanceof Error ? e.message : 'İzin kayıtları okunamadı' };
  }
}

/** Belirli tarih aralığıyla kesişen izinler */
export function filterIzinsInRange(rows: PersonelIzin[], start: string, end: string): PersonelIzin[] {
  return rows.filter((i) => i.baslangic <= end && i.bitis >= start);
}

export function isUserOnLeaveOnDate(
  userId: string,
  tarih: string,
  izinler: PersonelIzin[]
): PersonelIzin | null {
  const hit = izinler.find((i) => i.user_id === userId && izinCoversDate(i, tarih));
  return hit ?? null;
}

export async function createPersonelIzin(params: {
  user_id: string;
  birim: string;
  baslangic: string;
  bitis: string;
  tur: PersonelIzinTuru;
  aciklama?: string;
  created_by_uid: string;
}): Promise<{ id: string | null; error: string | null }> {
  if (!params.user_id || !params.birim) {
    return { id: null, error: 'Personel ve birim seçin' };
  }
  if (params.baslangic > params.bitis) {
    return { id: null, error: 'Başlangıç bitişten sonra olamaz' };
  }
  try {
    const { data, error } = await db.collection(COLLECTION).insertOne({
      user_id: params.user_id,
      birim: params.birim,
      baslangic: params.baslangic,
      bitis: params.bitis,
      tur: params.tur,
      aciklama: (params.aciklama || '').trim(),
      created_at: new Date().toISOString(),
      created_by_uid: params.created_by_uid
    });
    if (error) return { id: null, error };
    const inserted = data as { insertedId?: string; id?: string } | null;
    return { id: inserted?.insertedId || inserted?.id || null, error: null };
  } catch (e: unknown) {
    return { id: null, error: e instanceof Error ? e.message : 'İzin kaydedilemedi' };
  }
}

export async function deletePersonelIzin(id: string): Promise<{ error: string | null }> {
  try {
    const { success, error } = await db.collection(COLLECTION).deleteById(id);
    return { error: success ? null : error || 'İzin silinemedi' };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'İzin silinemedi' };
  }
}
