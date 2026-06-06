/**
 * Personel devri — islem_kayitlari user_id toplu güncelleme (yalnızca admin).
 */

import { getFirebaseFirestore } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { writeAuditLog } from './audit-service';

const COLLECTION = 'islem_kayitlari';
const BATCH_SIZE = 400;

export async function transferUserRecords(
  fromUid: string,
  toUid: string,
  actorUid: string,
  actorEmail?: string
): Promise<{ count: number; error: string | null }> {
  if (!fromUid || !toUid || fromUid === toUid) {
    return { count: 0, error: 'Geçersiz kullanıcı seçimi' };
  }
  try {
    const db = getFirebaseFirestore();
    const q = query(collection(db, COLLECTION), where('user_id', '==', fromUid));
    const snap = await getDocs(q);
    if (snap.empty) return { count: 0, error: null };

    const docs = snap.docs;
    let updated = 0;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + BATCH_SIZE);
      chunk.forEach((d) => {
        batch.update(doc(db, COLLECTION, d.id), {
          user_id: toUid,
          devir_from_uid: fromUid,
          devir_at: new Date().toISOString()
        });
      });
      await batch.commit();
      updated += chunk.length;
    }

    await writeAuditLog({
      action: 'veri_devir',
      actorUid,
      actorEmail,
      birim: '*',
      kayit_tarihi: new Date().toISOString().split('T')[0],
      details: { from_uid: fromUid, to_uid: toUid, count: updated }
    });

    if (typeof window !== 'undefined') window.dispatchEvent(new Event('firestore_data_change'));
    return { count: updated, error: null };
  } catch (e: unknown) {
    return { count: 0, error: e instanceof Error ? e.message : 'Veri devri başarısız' };
  }
}
