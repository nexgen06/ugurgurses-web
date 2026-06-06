/**
 * Veri kalitesi uyarıları: eksik gün, kategori anomalisi.
 */

import { db } from '../db';
import { lockDocId } from '../firestore-db';
import { TAVIM_BASLANGIC_TARIH } from '../constants';
import { isHaftasonuTarihi } from '../lib/date-policy';
import { isAyKapali, monthKeyFromDate } from './ay-kapanis-service';
import {
  getAllowedBirimler,
  canEnterData,
  canFinalize,
  type SessionUser
} from '../contexts/UserContext';
import { listUserProfiles, type UserProfile } from './users-service';
import { listPersonelIzins, isUserOnLeaveOnDate, type PersonelIzin } from './personel-izin-service';

export type AlertSeverity = 'warning' | 'info';

export interface OperationalAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
}

const ANOMALY_MULTIPLIER = 10;
const BASELINE_MIN = 3;
const LOOKBACK_DAYS = 35;

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoDate(d);
}

/** Salı–Perşembe: dün veri hatırlatıcısı */
function isReminderWeekday(): boolean {
  const day = new Date().getDay();
  return day >= 2 && day <= 4;
}

/** En az bir atanmış birimde o gün hâlâ giriş/kesinleştirme bekleniyorsa true */
function hasOpenBirimForDate(
  date: string,
  allowed: string[],
  lockedKeys: Set<string>
): boolean {
  if (isHaftasonuTarihi(date)) return false;
  return allowed.some((b) => !lockedKeys.has(lockDocId(date, b)));
}

async function loadLocksForDate(
  date: string,
  allowed: string[]
): Promise<Set<string>> {
  const keys = new Set<string>();
  const ayKapali = await isAyKapali(monthKeyFromDate(date));
  if (ayKapali) {
    for (const b of allowed) keys.add(lockDocId(date, b));
    return keys;
  }
  const kesinCol = db.collection('kesinlesen_gunler') as {
    find: (q: object) => Promise<{ data: { kayit_tarihi?: string; birim?: string }[] }>;
  };
  const { data: locks } = await kesinCol.find({ kayit_tarihi: date });
  for (const l of locks || []) {
    const b = l.birim?.trim();
    if (b && allowed.includes(b)) keys.add(lockDocId(date, b));
  }
  return keys;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export async function fetchOperationalAlerts(
  user: SessionUser | null,
  allBirimler: string[]
): Promise<OperationalAlert[]> {
  if (!user) return [];

  const allowed = getAllowedBirimler(user, allBirimler);
  if (allowed.length === 0) return [];

  const yesterday = yesterdayISO();
  if (yesterday < TAVIM_BASLANGIC_TARIH) return [];

  const today = isoDate(new Date());
  const start = new Date();
  start.setDate(start.getDate() - LOOKBACK_DAYS);
  let startIso = isoDate(start);
  if (startIso < TAVIM_BASLANGIC_TARIH) startIso = TAVIM_BASLANGIC_TARIH;

  const col = db.collection('islem_kayitlari') as any;
  const [{ data: records, error }, { data: izinler }, { data: profiles }, lockedYesterday] =
    await Promise.all([
      col.find({ kayit_tarihi: { $gte: startIso, $lte: today } }),
      listPersonelIzins(),
      listUserProfiles(),
      isReminderWeekday() ? loadLocksForDate(yesterday, allowed) : Promise.resolve(new Set<string>())
    ]);

  const izinRows: PersonelIzin[] = izinler || [];
  const profileRows: UserProfile[] = profiles || [];

  if (error || !records?.length) {
    return buildMissingOnly(user, allowed, yesterday, [], izinRows, profileRows, lockedYesterday);
  }

  const filtered = records.filter(
    (r: any) => r.birim && allowed.includes(r.birim) && r.kayit_tarihi >= TAVIM_BASLANGIC_TARIH
  );

  const alerts: OperationalAlert[] = [];

  if (isReminderWeekday() && hasOpenBirimForDate(yesterday, allowed, lockedYesterday)) {
    if (canEnterData(user) && user.role === 'editor') {
      const onLeave = isUserOnLeaveOnDate(user.id, yesterday, izinRows);
      const hasMine = filtered.some(
        (r: any) => r.kayit_tarihi === yesterday && r.user_id === user.id
      );
      if (!hasMine && !onLeave) {
        alerts.push({
          id: 'missing-entry-self',
          severity: 'warning',
          title: 'Dün veri girişi yapılmadı',
          message: `${yesterday} tarihinde size atanmış birimlerde sizin adınıza kayıt bulunmuyor. Giriş İşlemleri ekranından gecikmeli giriş yapabilirsiniz.`
        });
      }
    }

    if (canFinalize(user)) {
      for (const birim of allowed) {
        if (lockedYesterday.has(lockDocId(yesterday, birim))) continue;
        const hasBirim = filtered.some(
          (r: any) => r.kayit_tarihi === yesterday && r.birim === birim
        );
        if (hasBirim) continue;
        const editors = profileRows.filter(
          (p) =>
            (p.role === 'editor' || p.role === 'proje_yetkilisi') &&
            p.birimler.includes(birim)
        );
        const allOnLeave =
          editors.length > 0 &&
          editors.every((p) => isUserOnLeaveOnDate(p.uid, yesterday, izinRows));
        if (!allOnLeave) {
          alerts.push({
            id: `missing-entry-birim-${birim}`,
            severity: 'warning',
            title: 'Birimde dün veri yok',
            message: `${birim} — ${yesterday} tarihinde işlem kaydı yok (izinli personel hariç tutuldu).`
          });
        }
      }
    }
  }

  if (canFinalize(user)) {
    const checkDates = [yesterday, today].filter((d) => d >= TAVIM_BASLANGIC_TARIH);
    const totals: Record<string, Record<string, Record<string, number>>> = {};
    for (const r of filtered) {
      const t = r.kayit_tarihi as string;
      const b = r.birim as string;
      const c = r.islem_turu as string;
      if (!totals[t]) totals[t] = {};
      if (!totals[t][b]) totals[t][b] = {};
      totals[t][b][c] = (totals[t][b][c] || 0) + (r.islem_sayisi || 0);
    }

    const seenAnomaly = new Set<string>();
    for (const checkDate of checkDates) {
      for (const birim of allowed) {
        const byCat = totals[checkDate]?.[birim];
        if (!byCat) continue;
        for (const [kat, checkVal] of Object.entries(byCat)) {
          if (checkVal === 0) continue;
          const history: number[] = [];
          for (const [t, birimMap] of Object.entries(totals)) {
            if (t === checkDate) continue;
            const v = birimMap[birim]?.[kat];
            if (v != null && v > 0) history.push(v);
          }
          const base = median(history);
          if (base >= BASELINE_MIN && checkVal >= base * ANOMALY_MULTIPLIER) {
            const sig = `${birim}::${kat}::${checkDate}`;
            if (seenAnomaly.has(sig)) continue;
            seenAnomaly.add(sig);
            alerts.push({
              id: `anomaly-${sig}`,
              severity: 'warning',
              title: 'Olağandışı işlem artışı',
              message: `${birim} / ${kat} — ${checkDate}: ${checkVal} adet (son dönem tipik ~${Math.round(base)}; ${ANOMALY_MULTIPLIER}× üzeri). Hatalı giriş veya gerçek yoğunluk olabilir, kontrol edin.`
            });
          }
        }
      }
    }
  }

  return alerts;
}

function buildMissingOnly(
  user: SessionUser | null,
  allowed: string[],
  yesterday: string,
  alerts: OperationalAlert[],
  izinRows: PersonelIzin[],
  profileRows: UserProfile[],
  lockedYesterday: Set<string>
): OperationalAlert[] {
  if (!user || !isReminderWeekday() || !hasOpenBirimForDate(yesterday, allowed, lockedYesterday)) {
    return alerts;
  }
  if (canEnterData(user) && user.role === 'editor') {
    if (!isUserOnLeaveOnDate(user.id, yesterday, izinRows)) {
      alerts.push({
        id: 'missing-entry-self',
        severity: 'warning',
        title: 'Dün veri girişi yapılmadı',
        message: `${yesterday} tarihinde kayıt bulunmuyor. Giriş İşlemleri ekranından gecikmeli giriş yapabilirsiniz.`
      });
    }
  }
  if (canFinalize(user)) {
    for (const birim of allowed) {
      if (lockedYesterday.has(lockDocId(yesterday, birim))) continue;
      const editors = profileRows.filter(
        (p) =>
          (p.role === 'editor' || p.role === 'proje_yetkilisi') &&
          p.birimler.includes(birim)
      );
      const allOnLeave =
        editors.length > 0 &&
        editors.every((p) => isUserOnLeaveOnDate(p.uid, yesterday, izinRows));
      if (!allOnLeave) {
        alerts.push({
          id: `missing-entry-birim-${birim}`,
          severity: 'warning',
          title: 'Birimde dün veri yok',
          message: `${birim} — ${yesterday} tarihinde işlem kaydı girilmemiş.`
        });
      }
    }
  }
  return alerts;
}
