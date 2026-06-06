/**
 * Haftalık kesinleştirme özeti — proje yetkilisi / admin
 */

import { db } from '../db';
import { lockDocId } from '../firestore-db';
import { TAVIM_BASLANGIC_TARIH } from '../constants';
import { displayKategoriAdi } from '../lib/kategori-aliases';

export interface WeeklyFinalizeSummary {
  weekStart: string;
  weekEnd: string;
  kilitlenenGun: number;
  bekleyenGun: number;
  enYuksekKategori: string;
  enYuksekKategoriAdet: number;
  birimOzet: { birim: string; kilit: number; bekleyen: number }[];
}

function weekRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  const s = start.toISOString().split('T')[0];
  const e = end.toISOString().split('T')[0];
  return {
    start: s < TAVIM_BASLANGIC_TARIH ? TAVIM_BASLANGIC_TARIH : s,
    end: e
  };
}

export async function buildWeeklyFinalizeSummary(allowedBirimler: string[]): Promise<WeeklyFinalizeSummary> {
  const { start, end } = weekRange();
  const today = new Date().toISOString().split('T')[0];

  const col = db.collection('islem_kayitlari') as { find: (q: object) => Promise<{ data: { kayit_tarihi?: string; birim?: string; islem_turu?: string; islem_sayisi?: number }[] }> };
  const kesinCol = db.collection('kesinlesen_gunler') as { find: (q: object) => Promise<{ data: { kayit_tarihi?: string; birim?: string }[] }> };

  const [{ data: records }, { data: locks }] = await Promise.all([
    col.find({ kayit_tarihi: { $gte: start, $lte: end } }),
    kesinCol.find({ kayit_tarihi: { $gte: start, $lte: end } })
  ]);

  const lockedIds = new Set((locks || []).map((l) => lockDocId(l.kayit_tarihi || '', l.birim || '')));
  const pairs = new Map<string, { tarih: string; birim: string }>();
  const catTotals: Record<string, number> = {};
  const birimStats: Record<string, { kilit: number; bekleyen: number }> = {};

  (records || []).forEach((r) => {
    if (!r.kayit_tarihi || !r.birim || !allowedBirimler.includes(r.birim)) return;
    const id = lockDocId(r.kayit_tarihi, r.birim);
    if (!pairs.has(id)) pairs.set(id, { tarih: r.kayit_tarihi, birim: r.birim });
    const k = displayKategoriAdi(r.islem_turu || '') || 'Diğer';
    catTotals[k] = (catTotals[k] || 0) + (r.islem_sayisi || 0);
    if (!birimStats[r.birim]) birimStats[r.birim] = { kilit: 0, bekleyen: 0 };
  });

  let kilitlenenGun = 0;
  let bekleyenGun = 0;
  pairs.forEach((p, id) => {
    if (!birimStats[p.birim]) birimStats[p.birim] = { kilit: 0, bekleyen: 0 };
    if (lockedIds.has(id)) {
      kilitlenenGun++;
      birimStats[p.birim].kilit++;
    } else if (p.tarih < today) {
      bekleyenGun++;
      birimStats[p.birim].bekleyen++;
    }
  });

  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

  return {
    weekStart: start,
    weekEnd: end,
    kilitlenenGun,
    bekleyenGun,
    enYuksekKategori: topCat?.[0] || '—',
    enYuksekKategoriAdet: topCat?.[1] || 0,
    birimOzet: Object.entries(birimStats).map(([birim, s]) => ({ birim, ...s }))
  };
}

export function formatWeeklySummaryText(s: WeeklyFinalizeSummary): string {
  const lines = [
    `Haftalik kesinlestirme ozeti (${s.weekStart} - ${s.weekEnd})`,
    '',
    `Bu hafta ${s.kilitlenenGun} gun kilitlendi, ${s.bekleyenGun} gun bekliyor.`,
    `En yuksek kategori: ${s.enYuksekKategori} (${s.enYuksekKategoriAdet} islem).`,
    ''
  ];
  if (s.birimOzet.length) {
    lines.push('Birim bazinda:');
    s.birimOzet.forEach((b) => {
      lines.push(`- ${b.birim}: ${b.kilit} kilitli, ${b.bekleyen} bekleyen`);
    });
  }
  lines.push('', 'Birim Istatistik — resmi gun takibi');
  return lines.join('\n');
}

export function weeklySummaryMailto(s: WeeklyFinalizeSummary, toEmail: string): string {
  const subject = encodeURIComponent(`Kesinlestirme ozeti ${s.weekStart} - ${s.weekEnd}`);
  const body = encodeURIComponent(formatWeeklySummaryText(s));
  return `mailto:${encodeURIComponent(toEmail)}?subject=${subject}&body=${body}`;
}

export function getWeekId(): string {
  const { start } = weekRange();
  return `w_${start}`;
}
