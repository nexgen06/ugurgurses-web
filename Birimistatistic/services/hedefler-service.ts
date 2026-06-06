/**
 * Aylık birim hedefleri — Firestore: config/hedefler
 * Yapı: { "2026-06": { "Birim Adı": { toplam: 500, kategoriler?: { "DYS": 200 } } } }
 */

import { getFirebaseFirestore } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PATH = 'config/hedefler';

export interface BirimHedef {
  toplam?: number;
  kategoriler?: Record<string, number>;
}

export type AyHedefMap = Record<string, BirimHedef>;

export type HedeflerStore = Record<string, AyHedefMap>;

function parseStore(data: Record<string, unknown> | undefined): HedeflerStore {
  if (!data) return {};
  const out: HedeflerStore = {};
  for (const [ay, val] of Object.entries(data)) {
    if (ay.startsWith('_') || typeof val !== 'object' || val === null) continue;
    const birimMap: AyHedefMap = {};
    for (const [birim, h] of Object.entries(val as Record<string, unknown>)) {
      if (typeof h !== 'object' || h === null) continue;
      const raw = h as Record<string, unknown>;
      const toplam = typeof raw.toplam === 'number' ? raw.toplam : undefined;
      const kategoriler: Record<string, number> = {};
      if (raw.kategoriler && typeof raw.kategoriler === 'object') {
        for (const [k, v] of Object.entries(raw.kategoriler as Record<string, unknown>)) {
          if (typeof v === 'number' && v > 0) kategoriler[k] = v;
        }
      }
      birimMap[birim] = {
        toplam,
        kategoriler: Object.keys(kategoriler).length ? kategoriler : undefined
      };
    }
    if (Object.keys(birimMap).length) out[ay] = birimMap;
  }
  return out;
}

export async function getHedefler(): Promise<HedeflerStore> {
  try {
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, 'config', 'hedefler'));
    return parseStore(snap.data() as Record<string, unknown> | undefined);
  } catch {
    return {};
  }
}

export async function getHedefForAyBirim(ay: string, birim: string): Promise<BirimHedef | null> {
  const all = await getHedefler();
  return all[ay]?.[birim] ?? null;
}

export async function saveAyHedefleri(ay: string, birimHedefleri: AyHedefMap): Promise<{ error: string | null }> {
  try {
    const db = getFirebaseFirestore();
    const existing = await getHedefler();
    await setDoc(
      doc(db, 'config', 'hedefler'),
      { ...existing, [ay]: birimHedefleri, updated_at: new Date().toISOString() },
      { merge: true }
    );
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Hedefler kaydedilemedi' };
  }
}
