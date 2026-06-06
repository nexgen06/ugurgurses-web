/**
 * Kilit açma talepleri — editör talep → proje yetkilisi onay → admin kilidi açar.
 * Firestore: kilit_acma_talepleri/{tarih}__{birim}
 */

import { getFirebaseFirestore } from './firebase';
import { doc, getDoc, setDoc, getDocs, collection, query, where, limit } from 'firebase/firestore';
import { lockDocId } from './firestore-db';
import { writeAuditLog } from './audit-service';

export type KilitAcmaDurum = 'bekliyor_py' | 'bekliyor_admin' | 'tamamlandi' | 'reddedildi' | 'iptal';

export interface KilitAcmaTalep {
  kayit_tarihi: string;
  birim: string;
  durum: KilitAcmaDurum;
  gerekce: string;
  talep_eden_uid: string;
  talep_eden_email: string;
  talep_at: string;
  py_onay_uid?: string;
  py_onay_email?: string;
  py_onay_at?: string;
  py_red_nedeni?: string;
  admin_islem_uid?: string;
  admin_islem_email?: string;
  admin_islem_at?: string;
  admin_red_nedeni?: string;
}

const COLLECTION = 'kilit_acma_talepleri';

export const KILIT_TALEP_DURUM_LABELS: Record<KilitAcmaDurum, string> = {
  bekliyor_py: 'Proje yetkilisi onayı bekleniyor',
  bekliyor_admin: 'Admin onayı bekleniyor (kilit açılabilir)',
  tamamlandi: 'Kilit açıldı',
  reddedildi: 'Reddedildi',
  iptal: 'İptal edildi'
};

export function isOpenTalep(t: KilitAcmaTalep | null): boolean {
  return t?.durum === 'bekliyor_py' || t?.durum === 'bekliyor_admin';
}

export async function getKilitAcmaTalep(
  kayit_tarihi: string,
  birim: string
): Promise<KilitAcmaTalep | null> {
  try {
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, COLLECTION, lockDocId(kayit_tarihi, birim)));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      kayit_tarihi: (d.kayit_tarihi as string) || kayit_tarihi,
      birim: (d.birim as string) || birim,
      durum: d.durum as KilitAcmaDurum,
      gerekce: (d.gerekce as string) || '',
      talep_eden_uid: (d.talep_eden_uid as string) || '',
      talep_eden_email: (d.talep_eden_email as string) || '',
      talep_at: (d.talep_at as string) || '',
      py_onay_uid: d.py_onay_uid as string | undefined,
      py_onay_email: d.py_onay_email as string | undefined,
      py_onay_at: d.py_onay_at as string | undefined,
      py_red_nedeni: d.py_red_nedeni as string | undefined,
      admin_islem_uid: d.admin_islem_uid as string | undefined,
      admin_islem_email: d.admin_islem_email as string | undefined,
      admin_islem_at: d.admin_islem_at as string | undefined,
      admin_red_nedeni: d.admin_red_nedeni as string | undefined
    };
  } catch {
    return null;
  }
}

export async function createKilitAcmaTalep(
  kayit_tarihi: string,
  birim: string,
  gerekce: string,
  actorUid: string,
  actorEmail?: string
): Promise<{ error: string | null }> {
  const trimmed = gerekce.trim();
  if (trimmed.length < 10) {
    return { error: 'Gerekçe en az 10 karakter olmalıdır.' };
  }
  try {
    const db = getFirebaseFirestore();
    const id = lockDocId(kayit_tarihi, birim);
    const existing = await getKilitAcmaTalep(kayit_tarihi, birim);
    if (existing && isOpenTalep(existing)) {
      return { error: 'Bu gün/birim için zaten açık bir talep var.' };
    }
    const now = new Date().toISOString();
    await setDoc(doc(db, COLLECTION, id), {
      kayit_tarihi,
      birim,
      durum: 'bekliyor_py' as KilitAcmaDurum,
      gerekce: trimmed,
      talep_eden_uid: actorUid,
      talep_eden_email: actorEmail || '',
      talep_at: now,
      py_onay_uid: null,
      py_onay_email: null,
      py_onay_at: null,
      py_red_nedeni: null,
      admin_islem_uid: null,
      admin_islem_email: null,
      admin_islem_at: null,
      admin_red_nedeni: null
    });
    await writeAuditLog({
      action: 'lock_open_request',
      actorUid,
      actorEmail,
      birim,
      kayit_tarihi,
      details: { gerekce: trimmed.slice(0, 200) }
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('firestore_data_change'));
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Talep oluşturulamadı' };
  }
}

export async function pyOnaylaKilitTalep(
  kayit_tarihi: string,
  birim: string,
  actorUid: string,
  actorEmail?: string
): Promise<{ error: string | null }> {
  try {
    const db = getFirebaseFirestore();
    const id = lockDocId(kayit_tarihi, birim);
    const existing = await getKilitAcmaTalep(kayit_tarihi, birim);
    if (!existing || existing.durum !== 'bekliyor_py') {
      return { error: 'Onaylanacak talep bulunamadı.' };
    }
    await setDoc(
      doc(db, COLLECTION, id),
      {
        durum: 'bekliyor_admin',
        py_onay_uid: actorUid,
        py_onay_email: actorEmail || '',
        py_onay_at: new Date().toISOString()
      },
      { merge: true }
    );
    await writeAuditLog({
      action: 'lock_open_request_py_ok',
      actorUid,
      actorEmail,
      birim,
      kayit_tarihi,
      details: { talep_eden_uid: existing.talep_eden_uid }
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('firestore_data_change'));
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Onay kaydedilemedi' };
  }
}

export async function pyReddetKilitTalep(
  kayit_tarihi: string,
  birim: string,
  nedeni: string,
  actorUid: string,
  actorEmail?: string
): Promise<{ error: string | null }> {
  const trimmed = nedeni.trim();
  if (trimmed.length < 5) return { error: 'Red gerekçesi en az 5 karakter olmalıdır.' };
  try {
    const db = getFirebaseFirestore();
    const id = lockDocId(kayit_tarihi, birim);
    const existing = await getKilitAcmaTalep(kayit_tarihi, birim);
    if (!existing || existing.durum !== 'bekliyor_py') {
      return { error: 'Reddedilecek talep bulunamadı.' };
    }
    await setDoc(
      doc(db, COLLECTION, id),
      {
        durum: 'reddedildi',
        py_onay_uid: actorUid,
        py_onay_email: actorEmail || '',
        py_onay_at: new Date().toISOString(),
        py_red_nedeni: trimmed
      },
      { merge: true }
    );
    await writeAuditLog({
      action: 'lock_open_request_py_reject',
      actorUid,
      actorEmail,
      birim,
      kayit_tarihi,
      details: { nedeni: trimmed.slice(0, 200) }
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('firestore_data_change'));
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Red kaydedilemedi' };
  }
}

export async function adminReddetKilitTalep(
  kayit_tarihi: string,
  birim: string,
  nedeni: string,
  actorUid: string,
  actorEmail?: string
): Promise<{ error: string | null }> {
  const trimmed = nedeni.trim();
  if (trimmed.length < 5) return { error: 'Red gerekçesi en az 5 karakter olmalıdır.' };
  try {
    const db = getFirebaseFirestore();
    const id = lockDocId(kayit_tarihi, birim);
    const existing = await getKilitAcmaTalep(kayit_tarihi, birim);
    if (!existing || existing.durum !== 'bekliyor_admin') {
      return { error: 'Reddedilecek talep bulunamadı.' };
    }
    await setDoc(
      doc(db, COLLECTION, id),
      {
        durum: 'reddedildi',
        admin_islem_uid: actorUid,
        admin_islem_email: actorEmail || '',
        admin_islem_at: new Date().toISOString(),
        admin_red_nedeni: trimmed
      },
      { merge: true }
    );
    await writeAuditLog({
      action: 'lock_open_request_admin_reject',
      actorUid,
      actorEmail,
      birim,
      kayit_tarihi,
      details: { nedeni: trimmed.slice(0, 200) }
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('firestore_data_change'));
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Red kaydedilemedi' };
  }
}

export async function tamamlaKilitAcmaTalep(
  kayit_tarihi: string,
  birim: string,
  actorUid: string,
  actorEmail?: string
): Promise<{ error: string | null }> {
  try {
    const db = getFirebaseFirestore();
    const id = lockDocId(kayit_tarihi, birim);
    const existing = await getKilitAcmaTalep(kayit_tarihi, birim);
    if (!existing || existing.durum !== 'bekliyor_admin') {
      return { error: 'Tamamlanacak onaylı talep bulunamadı.' };
    }
    await setDoc(
      doc(db, COLLECTION, id),
      {
        durum: 'tamamlandi',
        admin_islem_uid: actorUid,
        admin_islem_email: actorEmail || '',
        admin_islem_at: new Date().toISOString()
      },
      { merge: true }
    );
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('firestore_data_change'));
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Talep güncellenemedi' };
  }
}

export async function iptalKilitAcmaTalep(
  kayit_tarihi: string,
  birim: string,
  actorUid: string,
  actorEmail?: string
): Promise<{ error: string | null }> {
  try {
    const db = getFirebaseFirestore();
    const id = lockDocId(kayit_tarihi, birim);
    const existing = await getKilitAcmaTalep(kayit_tarihi, birim);
    if (!existing || existing.durum !== 'bekliyor_py' || existing.talep_eden_uid !== actorUid) {
      return { error: 'İptal edilecek talep bulunamadı.' };
    }
    await setDoc(
      doc(db, COLLECTION, id),
      { durum: 'iptal', admin_islem_at: new Date().toISOString() },
      { merge: true }
    );
    await writeAuditLog({
      action: 'lock_open_request_cancel',
      actorUid,
      actorEmail,
      birim,
      kayit_tarihi
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('firestore_data_change'));
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'İptal edilemedi' };
  }
}

export async function listKilitAcmaTalepleriByDurum(
  durum: KilitAcmaDurum,
  max = 50
): Promise<{ rows: KilitAcmaTalep[]; error: string | null }> {
  try {
    const db = getFirebaseFirestore();
    const q = query(collection(db, COLLECTION), where('durum', '==', durum), limit(max));
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => {
      const o = d.data();
      return {
        kayit_tarihi: (o.kayit_tarihi as string) || '',
        birim: (o.birim as string) || '',
        durum: o.durum as KilitAcmaDurum,
        gerekce: (o.gerekce as string) || '',
        talep_eden_uid: (o.talep_eden_uid as string) || '',
        talep_eden_email: (o.talep_eden_email as string) || '',
        talep_at: (o.talep_at as string) || '',
        py_onay_uid: o.py_onay_uid as string | undefined,
        py_onay_email: o.py_onay_email as string | undefined,
        py_onay_at: o.py_onay_at as string | undefined,
        py_red_nedeni: o.py_red_nedeni as string | undefined,
        admin_islem_uid: o.admin_islem_uid as string | undefined,
        admin_islem_email: o.admin_islem_email as string | undefined,
        admin_islem_at: o.admin_islem_at as string | undefined,
        admin_red_nedeni: o.admin_red_nedeni as string | undefined
      };
    });
    rows.sort((a, b) => (b.talep_at || '').localeCompare(a.talep_at || ''));
    return { rows, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Talepler okunamadı';
    return { rows: [], error: msg };
  }
}
