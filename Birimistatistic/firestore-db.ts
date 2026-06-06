/**
 * Firestore veri katmanı — firebase.ts ile aynı projeyi kullanır (Auth ile uyumlu).
 */

import { getFirebaseFirestore } from './firebase';
import { collection, addDoc, getDocs, getDoc, setDoc, query, where, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';

function getDb() {
  return getFirebaseFirestore();
}

/** Kesinleşen gün kilidi için deterministik doküman id (kurallarda exists() ile kontrol edilebilsin diye). */
export function lockDocId(kayit_tarihi: string, birim: string): string {
  return `${kayit_tarihi}__${birim}`;
}

/**
 * Firestore koleksiyonu — db.ts üzerinden kullanılan arayüz (find, insertOne, deleteOne)
 */
class FirestoreCollectionAdapter {
  constructor(private collectionName: string) {}

  async find(queryFilter: any = {}): Promise<{ data: any[]; error: string | null }> {
    try {
      const db = getDb();
      const colRef = collection(db, this.collectionName);

      const hasBirim = queryFilter.birim && typeof queryFilter.birim === 'string' && queryFilter.birim.trim() !== '';
      const kayitTarihi = queryFilter.kayit_tarihi;
      const hasDateRange = kayitTarihi && typeof kayitTarihi === 'object' && (kayitTarihi.$gte || kayitTarihi.$lte);
      const exactDate = kayitTarihi && typeof kayitTarihi === 'string';

      // Tam tarih (exact) veya tarih aralığı; birim her zaman bellek içinde filtrelenir
      // ve “Yardımcı Sağlık Personeli Birimi” + tarih aralığı gibi sorgular index hatası vermeden çalışır.
      const constraints: any[] = [];
      if (exactDate) {
        constraints.push(where('kayit_tarihi', '==', kayitTarihi));
      } else if (hasDateRange) {
        if (kayitTarihi.$gte) constraints.push(where('kayit_tarihi', '>=', kayitTarihi.$gte));
        if (kayitTarihi.$lte) constraints.push(where('kayit_tarihi', '<=', kayitTarihi.$lte));
      }

      const q = constraints.length > 0
        ? query(colRef, ...constraints, orderBy('kayit_tarihi', 'desc'), limit(500))
        : query(colRef, orderBy('kayit_tarihi', 'desc'), limit(500));

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map((d) => {
        const o = d.data();
        return {
          ...o,
          id: d.id,
          _id: d.id
        };
      });

      if (queryFilter.islem_turu && typeof queryFilter.islem_turu === 'string' && queryFilter.islem_turu !== '') {
        const lower = queryFilter.islem_turu.toLowerCase();
        data = data.filter((item: any) => (item.islem_turu || '').toLowerCase().includes(lower));
      }
      if (hasBirim) {
        const birim = queryFilter.birim.trim();
        data = data.filter((item: any) => (item.birim || '').trim() === birim);
      }

      return { data, error: null };
    } catch (e: any) {
      console.error('Firestore find error:', e);
      return { data: [], error: e?.message || 'Firestore okuma hatası' };
    }
  }

  async insertOne(document: any): Promise<{ data: any; error: string | null }> {
    try {
      if (this.collectionName === 'islem_kayitlari' && document?.kayit_tarihi != null && String(document.kayit_tarihi) < '2026-01-01') {
        return { data: null, error: 'Kayıt tarihi 1 Ocak 2026 veya sonrası olmalıdır.' };
      }
      const db = getDb();
      const colRef = collection(db, this.collectionName);
      const docToAdd = {
        ...document,
        created_at: new Date().toISOString()
      };
      const ref = await addDoc(colRef, docToAdd);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('firestore_data_change'));
      }
      return {
        data: { insertedId: ref.id, ...docToAdd, id: ref.id },
        error: null
      };
    } catch (e: any) {
      console.error('Firestore insertOne error:', e);
      return { data: null, error: e?.message || 'Firestore yazma hatası' };
    }
  }

  async deleteOne(filter: { _id?: string; id?: string }): Promise<{ success: boolean; error?: string }> {
    try {
      const id = filter._id || filter.id;
      if (!id) {
        return { success: false, error: 'Silinecek doküman id gerekli' };
      }
      const db = getDb();
      const docRef = doc(db, this.collectionName, String(id));
      await deleteDoc(docRef);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('firestore_data_change'));
      }
      return { success: true };
    } catch (e: any) {
      console.error('Firestore deleteOne error:', e);
      return { success: false, error: e?.message || 'Firestore silme hatası' };
    }
  }

  /** O tarih+birimdeki kayıtları siler. user_id verilirse yalnızca o kullanıcının satırlarını siler. */
  async deleteMany(filter: { kayit_tarihi: string; birim: string; user_id?: string }): Promise<{ deletedCount: number; error: string | null }> {
    try {
      const db = getDb();
      const colRef = collection(db, this.collectionName);
      const q = query(
        colRef,
        where('kayit_tarihi', '==', filter.kayit_tarihi),
        where('birim', '==', filter.birim)
      );
      const snapshot = await getDocs(q);
      // user_id verildiyse bellek içinde filtrele (ek composite index gerektirmemek için)
      const docs = filter.user_id
        ? snapshot.docs.filter((d) => (d.data() as any).user_id === filter.user_id)
        : snapshot.docs;
      for (const d of docs) {
        await deleteDoc(doc(db, this.collectionName, d.id));
      }
      if (docs.length > 0 && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('firestore_data_change'));
      }
      return { deletedCount: docs.length, error: null };
    } catch (e: any) {
      console.error('Firestore deleteMany error:', e);
      return { deletedCount: 0, error: e?.message || 'Firestore silme hatası' };
    }
  }

  /** Belirli (deterministik) id ile doküman oluştur/üzerine yaz (ör. kesinleşen gün kilidi). */
  async setById(id: string, document: any): Promise<{ data: any; error: string | null }> {
    try {
      const db = getDb();
      const docToSet = { ...document, created_at: new Date().toISOString() };
      await setDoc(doc(db, this.collectionName, String(id)), docToSet);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('firestore_data_change'));
      }
      return { data: { id, ...docToSet }, error: null };
    } catch (e: any) {
      console.error('Firestore setById error:', e);
      return { data: null, error: e?.message || 'Firestore yazma hatası' };
    }
  }

  /** Deterministik id ile dokümanın var olup olmadığını döndürür. */
  async existsById(id: string): Promise<boolean> {
    try {
      const db = getDb();
      const snap = await getDoc(doc(db, this.collectionName, String(id)));
      return snap.exists();
    } catch (e) {
      console.error('Firestore existsById error:', e);
      return false;
    }
  }

  /** Deterministik id ile dokümanı siler (ör. kilit açma). */
  async deleteById(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const db = getDb();
      await deleteDoc(doc(db, this.collectionName, String(id)));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('firestore_data_change'));
      }
      return { success: true };
    } catch (e: any) {
      console.error('Firestore deleteById error:', e);
      return { success: false, error: e?.message || 'Firestore silme hatası' };
    }
  }

  /** Koleksiyondaki tüm belgeleri siler (veritabanı sıfırlama) */
  async deleteAll(): Promise<{ deletedCount: number; error: string | null }> {
    try {
      const db = getDb();
      const colRef = collection(db, this.collectionName);
      const BATCH = 500;
      let totalDeleted = 0;
      let hasMore = true;
      while (hasMore) {
        const q = query(colRef, limit(BATCH));
        const snapshot = await getDocs(q);
        if (snapshot.empty) break;
        for (const d of snapshot.docs) {
          await deleteDoc(doc(db, this.collectionName, d.id));
          totalDeleted++;
        }
        hasMore = snapshot.docs.length === BATCH;
      }
      if (totalDeleted > 0 && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('firestore_data_change'));
      }
      return { deletedCount: totalDeleted, error: null };
    } catch (e: any) {
      console.error('Firestore deleteAll error:', e);
      return { deletedCount: 0, error: e?.message || 'Firestore silme hatası' };
    }
  }
}

/**
 * Firestore kullanıldığında aynı db arayüzü
 */
class FirestoreClient {
  collection(name: string) {
    return new FirestoreCollectionAdapter(name);
  }
}

export const firestoreDb = new FirestoreClient();
export function isFirestoreConfigured(): boolean {
  const env = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) ? (import.meta as any).env : {};
  const use = env.VITE_USE_FIRESTORE === 'true';
  const hasConfig = !!(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID);
  return !!(use && hasConfig);
}

/** Hata ayıklama: Firestore neden aktif değil / hangi proje kullanılıyor */
export function getFirestoreDebugInfo(): {
  active: boolean;
  reason: string;
  projectId?: string;
  hasApiKey: boolean;
  hasProjectId: boolean;
  useFlag: boolean;
} {
  const env = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) ? (import.meta as any).env : {};
  const useFlag = env.VITE_USE_FIRESTORE === 'true';
  const hasApiKey = !!(env.VITE_FIREBASE_API_KEY && String(env.VITE_FIREBASE_API_KEY).length > 5);
  const hasProjectId = !!(env.VITE_FIREBASE_PROJECT_ID && String(env.VITE_FIREBASE_PROJECT_ID).length > 0);
  const projectId = env.VITE_FIREBASE_PROJECT_ID as string | undefined;

  if (!useFlag) {
    return { active: false, reason: 'VITE_USE_FIRESTORE=true yok veya farklı değer', hasApiKey, hasProjectId, useFlag };
  }
  if (!hasApiKey) {
    return { active: false, reason: 'VITE_FIREBASE_API_KEY eksik veya boş', hasApiKey, hasProjectId, useFlag };
  }
  if (!hasProjectId) {
    return { active: false, reason: 'VITE_FIREBASE_PROJECT_ID eksik veya boş', hasApiKey, hasProjectId, useFlag };
  }
  return { active: true, reason: 'Firestore kullanılıyor', projectId, hasApiKey, hasProjectId, useFlag };
}
