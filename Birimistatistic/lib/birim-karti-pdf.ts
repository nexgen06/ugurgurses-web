/**
 * Birim özeti — tek sayfa PDF (üst yönetim sunumu)
 */

import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { pdfTurkce } from '../utils/pdfTurkish';
import type { IslemKaydi } from '../types';
import {
  aggregateByCategory,
  totalOps,
  pctChange,
  unfinalizedDaysWithData,
  monthBounds
} from '../lib/report-stats';
import { lockDocId } from '../firestore-db';

applyPlugin(jsPDF);

export interface BirimKartiPdfInput {
  birim: string;
  yyyyMm: string;
  records: IslemKaydi[];
  prevRecords: IslemKaydi[];
  locksInMonth: { kayit_tarihi: string; birim: string }[];
}

export function downloadBirimKartiPDF(input: BirimKartiPdfInput): void {
  const t = pdfTurkce;
  const { birim, yyyyMm, records, prevRecords, locksInMonth } = input;
  const { label: ayLabel } = monthBounds(yyyyMm);
  const monthRecs = records.filter((r) => (r.birim || '').trim() === birim.trim() && r.kayit_tarihi?.startsWith(yyyyMm));
  const prevMonthRecs = prevRecords.filter((r) => (r.birim || '').trim() === birim.trim());

  const toplam = totalOps(monthRecs);
  const onceki = totalOps(prevMonthRecs);
  const degisim = pctChange(toplam, onceki);
  const byCat = aggregateByCategory(monthRecs);
  const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const lockedIds = new Set(locksInMonth.map((l) => lockDocId(l.kayit_tarihi, l.birim)));
  const acikGunler = unfinalizedDaysWithData(records, lockedIds, birim, yyyyMm);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  let y = 14;

  doc.setFillColor(0, 104, 74);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(t('BIRIM PERFORMANS OZETI'), 14, 12);
  doc.setFontSize(18);
  doc.text(t(birim), 14, 22);

  doc.setTextColor(30, 41, 59);
  y = 36;
  doc.setFontSize(10);
  doc.text(t(`Donem: ${ayLabel}`), 14, y);
  doc.text(t(`Rapor tarihi: ${new Date().toLocaleDateString('tr-TR')}`), 120, y);
  y += 10;

  doc.setFillColor(236, 253, 245);
  doc.roundedRect(14, y, 182, 22, 3, 3, 'F');
  doc.setFontSize(22);
  doc.setTextColor(0, 104, 74);
  doc.text(String(toplam), 20, y + 14);
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(t('Toplam islem (adet)'), 20, y + 20);

  if (degisim != null) {
    const sign = degisim >= 0 ? '+' : '';
    const renk = degisim >= 0 ? [0, 120, 80] : [180, 50, 50];
    doc.setTextColor(renk[0], renk[1], renk[2]);
    doc.setFontSize(14);
    doc.text(t(`${sign}${degisim.toFixed(1)}%`), 100, y + 14);
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(t('Gecen aya gore'), 100, y + 20);
  } else {
    doc.setFontSize(9);
    doc.text(t('Gecen ay kiyas verisi yok'), 100, y + 16);
  }
  y += 30;

  if (acikGunler.length > 0) {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(14, y, 182, 10 + Math.min(acikGunler.length, 4) * 4, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.text(t(`UYARI: ${acikGunler.length} gun kesinlestirilmemis (veri girilmis)`), 18, y + 6);
    const list = acikGunler.slice(0, 8).join(', ') + (acikGunler.length > 8 ? '...' : '');
    doc.setFontSize(8);
    doc.text(t(list), 18, y + 11);
    y += 14 + Math.min(acikGunler.length, 4) * 2;
  }

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(t('Kategori dagilimi'), 14, y);
  y += 4;

  const tableBody = catEntries.map(([k, v]) => {
    const pct = toplam > 0 ? ((v / toplam) * 100).toFixed(1) : '0';
    return [t(k), String(v), `${pct}%`];
  });

  doc.autoTable({
    startY: y,
    head: [[t('Kategori'), t('Adet'), t('Pay')]],
    body: tableBody.length ? tableBody : [[t('Kayit yok'), '0', '-']],
    theme: 'striped',
    headStyles: { fillColor: [0, 104, 74], fontSize: 9 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    t('Bu belge Birim Istatistik sisteminden otomatik uretilmistir. Ust yonetim sunumu icindir.'),
    14,
    Math.min(finalY + 10, 285)
  );

  const safeBirim = birim.replace(/[^\w\u00C0-\u024F]+/g, '_').slice(0, 40);
  doc.save(`birim_karti_${safeBirim}_${yyyyMm}.pdf`);
}
