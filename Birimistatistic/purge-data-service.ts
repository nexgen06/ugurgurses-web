/**
 * Demo ve başlangıç tarihinden önceki kayıtları siler (admin).
 * VERI_BASLANGIC ve sonrası kalır.
 */

import { getFirebaseFirestore } from './firebase';
import { collection, getDocs, deleteDoc, doc, query, limit } from 'firebase/firestore';
import { VERI_BASLANGIC_TARIH } from './date-policy';

export {
  VERI_BASLANGIC_TARIH,
  VERI_KESIM_TARIH,
  isKesimOncesiGeriGiris,
  isAdminGeriDonukAralik
} from './date-policy';

const SEED_TAG = 'birimistatistik-demo-v1';
const BATCH = 400;
const MAX_ROUNDS = 150;

export interface PurgeSummary {
  islemKayitlari: number;
  kesinlesenGunler: number;
  gunOnaylari: number;
  kilitTalepleri: number;
  demoUsers: number;
  error: string | null;
}

function tarihFromLockId(id: string): string | null {
  const sep = id.indexOf('__');
  if (sep <= 0) return null;
  return id.slice(0, sep);
}

function beforeBaslangic(tarih: string | null | undefined): boolean {
  return Boolean(tarih && tarih < VERI_BASLANGIC_TARIH);
}

function isDemoUserEmail(email: string): boolean {
  const e = email.toLowerCase();
  return e.endsWith('@birimistatistik.local') || e.startsWith('demo.');
}

async function purgeDocs(
  collectionName: string,
  shouldDelete: (id: string, data: Record<string, unknown>) => boolean
): Promise<number> {
  const db = getFirebaseFirestore();
  let deleted = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const snap = await getDocs(query(collection(db, collectionName), limit(BATCH)));
    if (snap.empty) break;
    let batch = 0;
    for (const d of snap.docs) {
      const data = d.data() as Record<string, unknown>;
      if (!shouldDelete(d.id, data)) continue;
      await deleteDoc(doc(db, collectionName, d.id));
      deleted++;
      batch++;
    }
    if (batch === 0 && snap.size < BATCH) break;
  }
  return deleted;
}

export async function purgeDemoAndOldData(): Promise<PurgeSummary> {
  const summary: PurgeSummary = {
    islemKayitlari: 0,
    kesinlesenGunler: 0,
    gunOnaylari: 0,
    kilitTalepleri: 0,
    demoUsers: 0,
    error: null
  };

  try {
    summary.islemKayitlari = await purgeDocs('islem_kayitlari', (_id, data) => {
      if (data.seed_tag === SEED_TAG) return true;
      const tarih = data.kayit_tarihi as string | undefined;
      if (beforeBaslangic(tarih)) return true;
      if (typeof tarih === 'string' && tarih.startsWith('2020-')) return true;
      return false;
    });

    summary.kesinlesenGunler = await purgeDocs('kesinlesen_gunler', (id, data) =>
      beforeBaslangic((data.kayit_tarihi as string) || tarihFromLockId(id))
    );

    summary.gunOnaylari = await purgeDocs('gun_onaylari', (id, data) =>
      beforeBaslangic((data.kayit_tarihi as string) || tarihFromLockId(id))
    );

    summary.kilitTalepleri = await purgeDocs('kilit_acma_talepleri', (id, data) =>
      beforeBaslangic((data.kayit_tarihi as string) || tarihFromLockId(id))
    );

    summary.demoUsers = await purgeDocs('users', (_id, data) =>
      isDemoUserEmail((data.email as string) || '')
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('firestore_data_change'));
    }
    return summary;
  } catch (e) {
    summary.error = e instanceof Error ? e.message : 'Temizlik hatası';
    return summary;
  }
}
