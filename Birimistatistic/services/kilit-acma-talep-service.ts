/**
 * Kilit açma talepleri — editör talep → proje yetkilisi onay → admin kilidi açar.
 * Firestore: kilit_acma_talepleri/{tarih}__{birim}
 */

import { db } from '../db';
import { lockDocId } from '../firestore-db';
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

function mapTalep(d: Record<string, unknown>, kayit_tarihi: string, birim: string): KilitAcmaTalep {
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
}

export async function getKilitAcmaTalep(
  kayit_tarihi: string,
  birim: string
): Promise<KilitAcmaTalep | null> {
  try {
    const id = lockDocId(kayit_tarihi, birim);
    const { data, error } = await db.collection(COLLECTION).getById(id);
    if (error || !data) return null;
    return mapTalep(data, kayit_tarihi, birim);
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
    const id = lockDocId(kayit_tarihi, birim);
    const existing = await getKilitAcmaTalep(kayit_tarihi, birim);
    if (existing && isOpenTalep(existing)) {
      return { error: 'Bu gün/birim için zaten açık bir talep var.' };
    }
    const now = new Date().toISOString();
    const { error } = await db.collection(COLLECTION).setById(id, {
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
    if (error) return { error };
    await writeAuditLog({
      action: 'lock_open_request',
      actorUid,
      actorEmail,
      birim,
      kayit_tarihi,
      details: { gerekce: trimmed.slice(0, 200) }
    });
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
    const id = lockDocId(kayit_tarihi, birim);
    const existing = await getKilitAcmaTalep(kayit_tarihi, birim);
    if (!existing || existing.durum !== 'bekliyor_py') {
      return { error: 'Onaylanacak talep bulunamadı.' };
    }
    const { error } = await db.collection(COLLECTION).mergeSetById(id, {
      durum: 'bekliyor_admin',
      py_onay_uid: actorUid,
      py_onay_email: actorEmail || '',
      py_onay_at: new Date().toISOString()
    });
    if (error) return { error };
    await writeAuditLog({
      action: 'lock_open_request_py_ok',
      actorUid,
      actorEmail,
      birim,
      kayit_tarihi,
      details: { talep_eden_uid: existing.talep_eden_uid }
    });
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
    const id = lockDocId(kayit_tarihi, birim);
    const existing = await getKilitAcmaTalep(kayit_tarihi, birim);
    if (!existing || existing.durum !== 'bekliyor_py') {
      return { error: 'Reddedilecek talep bulunamadı.' };
    }
    const { error } = await db.collection(COLLECTION).mergeSetById(id, {
      durum: 'reddedildi',
      py_onay_uid: actorUid,
      py_onay_email: actorEmail || '',
      py_onay_at: new Date().toISOString(),
      py_red_nedeni: trimmed
    });
    if (error) return { error };
    await writeAuditLog({
      action: 'lock_open_request_py_reject',
      actorUid,
      actorEmail,
      birim,
      kayit_tarihi,
      details: { nedeni: trimmed.slice(0, 200) }
    });
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
    const id = lockDocId(kayit_tarihi, birim);
    const existing = await getKilitAcmaTalep(kayit_tarihi, birim);
    if (!existing || existing.durum !== 'bekliyor_admin') {
      return { error: 'Reddedilecek talep bulunamadı.' };
    }
    const { error } = await db.collection(COLLECTION).mergeSetById(id, {
      durum: 'reddedildi',
      admin_islem_uid: actorUid,
      admin_islem_email: actorEmail || '',
      admin_islem_at: new Date().toISOString(),
      admin_red_nedeni: trimmed
    });
    if (error) return { error };
    await writeAuditLog({
      action: 'lock_open_request_admin_reject',
      actorUid,
      actorEmail,
      birim,
      kayit_tarihi,
      details: { nedeni: trimmed.slice(0, 200) }
    });
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
    const id = lockDocId(kayit_tarihi, birim);
    const existing = await getKilitAcmaTalep(kayit_tarihi, birim);
    if (!existing || existing.durum !== 'bekliyor_admin') {
      return { error: 'Tamamlanacak onaylı talep bulunamadı.' };
    }
    const { error } = await db.collection(COLLECTION).mergeSetById(id, {
      durum: 'tamamlandi',
      admin_islem_uid: actorUid,
      admin_islem_email: actorEmail || '',
      admin_islem_at: new Date().toISOString()
    });
    return { error };
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
    const id = lockDocId(kayit_tarihi, birim);
    const existing = await getKilitAcmaTalep(kayit_tarihi, birim);
    if (!existing || existing.durum !== 'bekliyor_py' || existing.talep_eden_uid !== actorUid) {
      return { error: 'İptal edilecek talep bulunamadı.' };
    }
    const { error } = await db.collection(COLLECTION).mergeSetById(id, {
      durum: 'iptal',
      admin_islem_at: new Date().toISOString()
    });
    if (error) return { error };
    await writeAuditLog({
      action: 'lock_open_request_cancel',
      actorUid,
      actorEmail,
      birim,
      kayit_tarihi
    });
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
    const { data, error } = await db.collection(COLLECTION).find({ durum });
    if (error) throw new Error(error);
    const rows = (data || []).map((row) => {
      const o = row as Record<string, unknown>;
      return mapTalep(o, (o.kayit_tarihi as string) || '', (o.birim as string) || '');
    });
    rows.sort((a, b) => (b.talep_at || '').localeCompare(a.talep_at || ''));
    return { rows: rows.slice(0, max), error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Talepler okunamadı';
    return { rows: [], error: msg };
  }
}
