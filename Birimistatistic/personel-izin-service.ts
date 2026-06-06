/**
 * Personel izin / rapor kayıtları — personel_izinleri
 * Türler: yillik_izin, rapor, diger
 */

import { getFirebaseFirestore } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

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
const FETCH_LIMIT = 800;

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

function mapDoc(id: string, d: Record<string, unknown>): PersonelIzin {
  return {
    id,
    user_id: (d.user_id as string) || '',
    birim: (d.birim as string) || '',
    baslangic: (d.baslangic as string) || '',
    bitis: (d.bitis as string) || '',
    tur: parseIzinTuru(d.tur),
    aciklama: (d.aciklama as string) || undefined,
    created_at: (d.created_at as string) || '',
    created_by_uid: (d.created_by_uid as string) || ''
  };
}

export async function listPersonelIzins(): Promise<{ data: PersonelIzin[]; error: string | null }> {
  try {
    const db = getFirebaseFirestore();
    const q = query(collection(db, COLLECTION), orderBy('baslangic', 'desc'), limit(FETCH_LIMIT));
    const snap = await getDocs(q);
    const data = snap.docs.map((x) => mapDoc(x.id, x.data() as Record<string, unknown>));
    return { data, error: null };
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
    const db = getFirebaseFirestore();
    const ref = await addDoc(collection(db, COLLECTION), {
      user_id: params.user_id,
      birim: params.birim,
      baslangic: params.baslangic,
      bitis: params.bitis,
      tur: params.tur,
      aciklama: (params.aciklama || '').trim(),
      created_at: new Date().toISOString(),
      created_by_uid: params.created_by_uid
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('firestore_data_change'));
    return { id: ref.id, error: null };
  } catch (e: unknown) {
    return { id: null, error: e instanceof Error ? e.message : 'İzin kaydedilemedi' };
  }
}

export async function deletePersonelIzin(id: string): Promise<{ error: string | null }> {
  try {
    const db = getFirebaseFirestore();
    await deleteDoc(doc(db, COLLECTION, id));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('firestore_data_change'));
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'İzin silinemedi' };
  }
}
