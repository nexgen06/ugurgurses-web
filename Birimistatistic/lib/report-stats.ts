import type { IslemKaydi } from '../types';
import { lockDocId } from '../firestore-db';
import { displayKategoriAdi, isKaldirilanKategori } from '../lib/kategori-aliases';

export const AY_ISIMLERI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export function monthBounds(yyyyMm: string): { start: string; end: string; label: string } {
  const [y, m] = yyyyMm.split('-');
  const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
  const start = `${y}-${m}-01`;
  const end = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
  const label = `${AY_ISIMLERI[parseInt(m, 10) - 1]} ${y}`;
  return { start, end, label };
}

export function prevMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function filterByMonth(records: IslemKaydi[], yyyyMm: string): IslemKaydi[] {
  return records.filter((r) => r.kayit_tarihi?.startsWith(yyyyMm));
}

export function aggregateByCategory(records: IslemKaydi[]): Record<string, number> {
  const acc: Record<string, number> = {};
  records.forEach((r) => {
    if (isKaldirilanKategori(r.islem_turu || '')) return;
    const k = displayKategoriAdi(r.islem_turu || '') || 'Diğer';
    acc[k] = (acc[k] || 0) + (r.islem_sayisi || 0);
  });
  return acc;
}

export function totalOps(records: IslemKaydi[]): number {
  return records.reduce((s, r) => s + (r.islem_sayisi || 0), 0);
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

/** Geçmiş günlerde veri var ama kesinleşmemiş tarihler (birim bazlı) */
export function unfinalizedDaysWithData(
  records: IslemKaydi[],
  lockedDocIds: Set<string>,
  birim: string,
  yyyyMm: string,
  today = new Date().toISOString().split('T')[0]
): string[] {
  const days = new Set<string>();
  records
    .filter((r) => (r.birim || '').trim() === birim.trim() && r.kayit_tarihi?.startsWith(yyyyMm))
    .forEach((r) => {
      if (r.kayit_tarihi && r.kayit_tarihi < today) days.add(r.kayit_tarihi);
    });
  return [...days]
    .filter((d) => !lockedDocIds.has(lockDocId(d, birim)))
    .sort();
}

export type PerformanceBand = 'dusuk' | 'orta' | 'yuksek';

const BAND_LABELS: Record<PerformanceBand, string> = {
  dusuk: 'Düşük',
  orta: 'Orta',
  yuksek: 'Yüksek'
};

/** Editör için KVKK dostu birim ortalaması kıyası (isim yok) */
export function editorAnonimKiyas(
  myTotal: number,
  birimRecords: IslemKaydi[],
  myUserId: string
): { pctVsAvg: number; band: PerformanceBand; bandLabel: string; message: string } | null {
  const byUser: Record<string, number> = {};
  birimRecords.forEach((r) => {
    const uid = (r as { user_id?: string }).user_id || 'bilinmeyen';
    byUser[uid] = (byUser[uid] || 0) + (r.islem_sayisi || 0);
  });
  const others = Object.entries(byUser).filter(([uid]) => uid !== myUserId);
  if (others.length === 0) return null;
  const otherAvg = others.reduce((s, [, v]) => s + v, 0) / others.length;
  if (otherAvg <= 0) {
    return {
      pctVsAvg: myTotal > 0 ? 100 : 0,
      band: myTotal > 0 ? 'yuksek' : 'orta',
      bandLabel: myTotal > 0 ? BAND_LABELS.yuksek : BAND_LABELS.orta,
      message: myTotal > 0 ? 'Birim ortalamasının üzerindesiniz.' : 'Birim ortalamasıyla uyumlu görünüyorsunuz.'
    };
  }
  const pctVsAvg = ((myTotal - otherAvg) / otherAvg) * 100;
  let band: PerformanceBand = 'orta';
  if (pctVsAvg > 15) band = 'yuksek';
  else if (pctVsAvg < -15) band = 'dusuk';

  const abs = Math.abs(Math.round(pctVsAvg));
  let message: string;
  if (Math.abs(pctVsAvg) <= 5) {
    message = 'Birim ortalamasıyla uyumlu görünüyorsunuz.';
  } else if (pctVsAvg > 0) {
    message = `Birim ortalamasının yaklaşık %${abs} üstündesiniz.`;
  } else {
    message = `Birim ortalamasının yaklaşık %${abs} altındasınız.`;
  }

  return { pctVsAvg, band, bandLabel: BAND_LABELS[band], message };
}

export type HedefDurum = 'yesil' | 'sari' | 'kirmizi' | 'yok';

export function hedefDurumu(gercek: number, hedef: number | undefined): HedefDurum {
  if (hedef == null || hedef <= 0) return 'yok';
  const oran = (gercek / hedef) * 100;
  if (oran >= 100) return 'yesil';
  if (oran >= 80) return 'sari';
  return 'kirmizi';
}
