/**
 * Otomatik kesinleştirme: oturum açılışında, kesinleştirme yetkisi olan
 * kullanıcı için (admin/proje_yetkilisi) atanmış birimlerde, bugünden önceki
 * açık (kilitlenmemiş) günleri kilitler. Spark planında zamanlanmış fonksiyon
 * olmadığı için açılış-tetikli çalışır.
 */

import { db } from './db';
import { lockDocId } from './firestore-db';
import { writeAuditLog } from './audit-service';
import { TAVIM_BASLANGIC_TARIH } from './constants';
import { getBirimler } from './birimler-service';
import { getAllowedBirimler, canFinalize } from './contexts/UserContext';
import type { SessionUser } from './types';

const KESINLESEN_GUNLER_COLLECTION = 'kesinlesen_gunler';

export async function autoFinalizePastDays(user: SessionUser | null): Promise<number> {
  try {
    if (!canFinalize(user)) return 0;

    const today = new Date().toISOString().split('T')[0];
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = y.toISOString().split('T')[0];
    if (yesterday < TAVIM_BASLANGIC_TARIH) return 0;

    const allBirimler = await getBirimler();
    const allowed = getAllowedBirimler(user, allBirimler);
    const col = db.collection('islem_kayitlari') as any;
    const kesinCol = db.collection(KESINLESEN_GUNLER_COLLECTION) as any;

    const { data: records } = await col.find({
      kayit_tarihi: { $gte: TAVIM_BASLANGIC_TARIH, $lte: yesterday }
    });
    if (!records || records.length === 0) return 0;

    // Geçmişteki (tarih < bugün) ve atanmış birimlere ait benzersiz (gün, birim) çiftleri
    const pairs = new Map<string, { tarih: string; birim: string }>();
    records.forEach((r: any) => {
      if (!r.kayit_tarihi || r.kayit_tarihi >= today) return;
      if (!r.birim || !allowed.includes(r.birim)) return;
      const id = lockDocId(r.kayit_tarihi, r.birim);
      if (!pairs.has(id)) pairs.set(id, { tarih: r.kayit_tarihi, birim: r.birim });
    });

    let locked = 0;
    for (const [id, p] of pairs) {
      const exists = await kesinCol.existsById(id);
      if (!exists) {
        const { error } = await kesinCol.setById(id, {
          kayit_tarihi: p.tarih,
          birim: p.birim,
          finalized_by: user?.id || null,
          finalized_at: new Date().toISOString(),
          auto: true
        });
        if (!error) {
          locked++;
          await writeAuditLog({
            action: 'lock_auto_finalize',
            actorUid: user?.id || '',
            actorEmail: user?.email,
            birim: p.birim,
            kayit_tarihi: p.tarih,
            details: { auto: true }
          });
        }
      }
    }
    return locked;
  } catch (e) {
    console.error('autoFinalizePastDays error:', e);
    return 0;
  }
}
