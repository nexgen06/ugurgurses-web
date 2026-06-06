/**
 * Ortak + birim özel işlem kategorileri.
 * - config/kategoriler_ortak (doküman)
 * - config/_kategoriler/birimler/{birimDocId} (alt koleksiyon)
 */

import { getFirebaseFirestore } from '../firebase';
import { doc, getDoc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { ISLEM_TURLERI as DEFAULT_ORTAK } from '../constants';
import { normalizeKategoriList } from '../lib/kategori-aliases';

const ORTAK_DOC = ['config', 'kategoriler_ortak'] as const;
const BIRIM_PARENT = ['config', '_kategoriler'] as const;
const BIRIM_SUB = 'birimler';

function cleanList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const raw = list
    .filter((k): k is string => typeof k === 'string')
    .map((k) => k.trim())
    .filter((k) => k !== '' && k.length <= 80);
  return normalizeKategoriList(Array.from(new Set(raw)));
}

/** Firestore doküman kimliği (birim adından; / içermez). */
export function birimDocId(birim: string): string {
  return birim.trim().replace(/\//g, '_');
}

export async function getOrtakKategoriler(): Promise<string[]> {
  try {
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, ...ORTAK_DOC));
    const list = cleanList(snap.data()?.kategoriler);
    return list.length > 0 ? list : [...DEFAULT_ORTAK];
  } catch {
    return [...DEFAULT_ORTAK];
  }
}

export async function setOrtakKategoriler(list: string[]): Promise<{ error: string | null }> {
  try {
    const db = getFirebaseFirestore();
    await setDoc(
      doc(db, ...ORTAK_DOC),
      { kategoriler: cleanList(list), guncelleme: new Date().toISOString() },
      { merge: true }
    );
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Ortak kategoriler kaydedilemedi' };
  }
}

export async function getBirimOzelKategoriler(birim: string): Promise<string[]> {
  if (!birim?.trim()) return [];
  try {
    const db = getFirebaseFirestore();
    const parent = doc(db, ...BIRIM_PARENT);
    const snap = await getDoc(doc(parent, BIRIM_SUB, birimDocId(birim)));
    return cleanList(snap.data()?.kategoriler);
  } catch {
    return [];
  }
}

export async function setBirimOzelKategoriler(
  birim: string,
  list: string[]
): Promise<{ error: string | null }> {
  if (!birim?.trim()) return { error: 'Birim adı gerekli' };
  try {
    const db = getFirebaseFirestore();
    const parent = doc(db, ...BIRIM_PARENT);
    await setDoc(parent, { init: true }, { merge: true });
    await setDoc(doc(parent, BIRIM_SUB, birimDocId(birim)), {
      birim: birim.trim(),
      kategoriler: cleanList(list),
      guncelleme: new Date().toISOString()
    });
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Birim kategorileri kaydedilemedi' };
  }
}

/** Tüm birim özel kategori dokümanlarını oku (yönetim / toplu). */
export async function getAllBirimOzelMap(): Promise<Record<string, string[]>> {
  const map: Record<string, string[]> = {};
  try {
    const db = getFirebaseFirestore();
    const parent = doc(db, ...BIRIM_PARENT);
    const snap = await getDocs(collection(parent, BIRIM_SUB));
    snap.docs.forEach((d) => {
      const data = d.data();
      const birim = (data.birim as string) || d.id;
      map[birim] = cleanList(data.kategoriler);
    });
  } catch {
    /* boş map */
  }
  return map;
}

export async function deleteBirimOzelKategoriler(birim: string): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const parent = doc(db, ...BIRIM_PARENT);
    await deleteDoc(doc(parent, BIRIM_SUB, birimDocId(birim)));
  } catch {
    /* yoksa sorun değil */
  }
}

/** Ortak + birim özel birleşik liste (çakışma yok; ortak önce). */
export function mergeKategoriler(ortak: string[], birimOzel: string[]): string[] {
  const ortakSet = new Set(ortak);
  const extra = birimOzel.filter((k) => !ortakSet.has(k));
  return [...ortak, ...extra];
}

export async function getKategorilerForBirim(birim: string): Promise<{
  ortak: string[];
  birimOzel: string[];
  birlesik: string[];
}> {
  const ortak = await getOrtakKategoriler();
  const birimOzel = await getBirimOzelKategoriler(birim);
  return { ortak, birimOzel, birlesik: mergeKategoriler(ortak, birimOzel) };
}

export function kategoriKaynak(
  islemTuru: string,
  ortak: string[],
  birimOzel: string[]
): 'ortak' | 'birim' {
  if (birimOzel.includes(islemTuru)) return 'birim';
  return 'ortak';
}
