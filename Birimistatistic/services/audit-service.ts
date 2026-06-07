/**
 * Denetim günlüğü — kilit açma / kesinleştirme işlemleri.
 * Firestore: audit_log/{autoId}
 */

import { db } from '../db';

export type AuditAction =
  | 'lock_open'
  | 'lock_open_request'
  | 'lock_open_request_py_ok'
  | 'lock_open_request_py_reject'
  | 'lock_open_request_admin_reject'
  | 'lock_open_request_cancel'
  | 'lock_finalize'
  | 'lock_auto_finalize'
  | 'birim_onay'
  | 'kurum_onay'
  | 'ay_kapandi'
  | 'ay_acildi'
  | 'veri_devir'
  | 'veri_giris_adina'
  | 'izin_kaydi'
  | 'izin_sil';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actor_uid: string;
  actor_email: string;
  birim: string;
  kayit_tarihi: string;
  at: string;
  details?: Record<string, unknown>;
}

const COLLECTION = 'audit_log';

export async function writeAuditLog(params: {
  action: AuditAction;
  actorUid: string;
  actorEmail?: string;
  birim: string;
  kayit_tarihi: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.collection(COLLECTION).insertOne({
      action: params.action,
      actor_uid: params.actorUid,
      actor_email: params.actorEmail || '',
      birim: params.birim,
      kayit_tarihi: params.kayit_tarihi,
      at: new Date().toISOString(),
      details: params.details || {}
    });
  } catch (e) {
    console.error('writeAuditLog:', e);
  }
}

export async function listAuditLogs(max = 40): Promise<{ rows: AuditLogEntry[]; error: string | null }> {
  try {
    const { data, error } = await db.collection(COLLECTION).find({});
    if (error) throw new Error(error);
    const rows = (data || []).slice(0, max).map((row) => {
      const o = row as Record<string, unknown>;
      return {
        id: String(o.id || ''),
        action: o.action as AuditAction,
        actor_uid: (o.actor_uid as string) || '',
        actor_email: (o.actor_email as string) || '',
        birim: (o.birim as string) || '',
        kayit_tarihi: (o.kayit_tarihi as string) || '',
        at: (o.at as string) || '',
        details: (o.details as Record<string, unknown>) || {}
      };
    });
    return { rows, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Denetim kayıtları okunamadı';
    console.error('listAuditLogs:', e);
    return { rows: [], error: msg };
  }
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  lock_open: 'Kilit açıldı',
  lock_open_request: 'Kilit açma talebi',
  lock_open_request_py_ok: 'Kilit talebi — PY onayı',
  lock_open_request_py_reject: 'Kilit talebi — PY red',
  lock_open_request_admin_reject: 'Kilit talebi — admin red',
  lock_open_request_cancel: 'Kilit talebi — iptal',
  lock_finalize: 'Gün kesinleştirildi',
  lock_auto_finalize: 'Otomatik kesinleştirme',
  birim_onay: 'Birim onayı verildi',
  kurum_onay: 'Kurum onayı verildi',
  ay_kapandi: 'Ay kapanışı',
  ay_acildi: 'Ay kapanışı açıldı',
  veri_devir: 'Personel veri devri',
  veri_giris_adina: 'Admin adına veri girişi',
  izin_kaydi: 'Personel izin/rapor kaydı',
  izin_sil: 'Personel izin/rapor silindi'
};
