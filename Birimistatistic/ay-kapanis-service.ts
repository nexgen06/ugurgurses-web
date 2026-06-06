/**
 * Ay kapanışı — ay_kapanislari/{yyyy-MM}
 * Kapalı ayda veri girişi engellenir; tüm günler toplu kilitlenir. Yalnızca admin açar.
 */

import { getFirebaseFirestore } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './db';
import { lockDocId } from './firestore-db';
import { writeAuditLog } from './audit-service';
import { TAVIM_BASLANGIC_TARIH } from './constants';
import { getBirimler } from './birimler-service';
import type { SessionUser } from './types';
import { canFinalize, canAdmin } from './contexts/UserContext';

const COLLECTION = 'ay_kapanislari';

export interface AyKapanis {
  ay: string;
  kapandi_at: string;
  kapandi_by?: string;
  otomatik?: boolean;
}

export function monthKeyFromDate(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export async function isAyKapali(yyyyMm: string): Promise<boolean> {
  try {
    const dbf = getFirebaseFirestore();
    const snap = await getDoc(doc(dbf, COLLECTION, yyyyMm));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function getAyKapanis(yyyyMm: string): Promise<AyKapanis | null> {
  try {
    const dbf = getFirebaseFirestore();
    const snap = await getDoc(doc(dbf, COLLECTION, yyyyMm));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      ay: yyyyMm,
      kapandi_at: (d.kapandi_at as string) || '',
      kapandi_by: d.kapandi_by as string | undefined,
      otomatik: d.otomatik === true
    };
  } catch {
    return null;
  }
}

/** Ay içindeki tüm (gün, birim) çiftlerini kilitle */
async function lockAllDaysInMonth(yyyyMm: string, actorUid: string, actorEmail?: string): Promise<number> {
  const [y, m] = yyyyMm.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const start = `${yyyyMm}-01`;
  const end = `${yyyyMm}-${String(lastDay).padStart(2, '0')}`;
  const birimler = await getBirimler();
  const col = db.collection('islem_kayitlari') as { find: (q: object) => Promise<{ data: { kayit_tarihi?: string; birim?: string }[] }> };
  const kesinCol = db.collection('kesinlesen_gunler') as {
    existsById: (id: string) => Promise<boolean>;
    setById: (id: string, doc: object) => Promise<{ error: string | null }>;
  };

  const { data: records } = await col.find({ kayit_tarihi: { $gte: start, $lte: end } });
  const pairs = new Map<string, { tarih: string; birim: string }>();
  (records || []).forEach((r) => {
    if (!r.kayit_tarihi || !r.birim) return;
    if (!birimler.includes(r.birim)) return;
    const id = lockDocId(r.kayit_tarihi, r.birim);
    pairs.set(id, { tarih: r.kayit_tarihi, birim: r.birim });
  });

  let n = 0;
  for (const [id, p] of pairs) {
    if (!(await kesinCol.existsById(id))) {
      const { error } = await kesinCol.setById(id, {
        kayit_tarihi: p.tarih,
        birim: p.birim,
        finalized_by: actorUid,
        finalized_at: new Date().toISOString(),
        auto: true,
        ay_kapanis: true
      });
      if (!error) {
        n++;
        await writeAuditLog({
          action: 'lock_auto_finalize',
          actorUid,
          actorEmail,
          birim: p.birim,
          kayit_tarihi: p.tarih,
          details: { ay_kapanis: yyyyMm }
        });
      }
    }
  }
  return n;
}

export async function closeAy(
  yyyyMm: string,
  actorUid: string,
  actorEmail?: string,
  otomatik = false
): Promise<{ error: string | null; lockedDays: number }> {
  try {
    if (yyyyMm < TAVIM_BASLANGIC_TARIH.slice(0, 7)) {
      return { error: 'Geçersiz ay', lockedDays: 0 };
    }
    const dbf = getFirebaseFirestore();
    await setDoc(doc(dbf, COLLECTION, yyyyMm), {
      ay: yyyyMm,
      kapandi_at: new Date().toISOString(),
      kapandi_by: actorUid,
      otomatik
    });
    const lockedDays = await lockAllDaysInMonth(yyyyMm, actorUid, actorEmail);
    await writeAuditLog({
      action: 'ay_kapandi',
      actorUid,
      actorEmail,
      birim: '*',
      kayit_tarihi: `${yyyyMm}-01`,
      details: { ay: yyyyMm, otomatik, lockedDays }
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('firestore_data_change'));
    return { error: null, lockedDays };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Ay kapatılamadı', lockedDays: 0 };
  }
}

export async function openAy(yyyyMm: string, actorUid: string, actorEmail?: string): Promise<{ error: string | null }> {
  try {
    const dbf = getFirebaseFirestore();
    await deleteDoc(doc(dbf, COLLECTION, yyyyMm));
    await writeAuditLog({
      action: 'ay_acildi',
      actorUid,
      actorEmail,
      birim: '*',
      kayit_tarihi: `${yyyyMm}-01`,
      details: { ay: yyyyMm }
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('firestore_data_change'));
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Ay açılamadı' };
  }
}

/** Yeni ay başında önceki ayı otomatik kapat (proje yetkilisi / admin oturumunda) */
export async function autoClosePreviousMonthIfNeeded(user: SessionUser | null): Promise<string | null> {
  if (!user || (!canFinalize(user) && !canAdmin(user))) return null;
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yyyyMm = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  if (yyyyMm < TAVIM_BASLANGIC_TARIH.slice(0, 7)) return null;
  if (await isAyKapali(yyyyMm)) return null;
  // Ayın en az 1. günündeyiz → önceki ay kapanabilir
  const { error } = await closeAy(yyyyMm, user.id, user.email, true);
  return error ? null : yyyyMm;
}
