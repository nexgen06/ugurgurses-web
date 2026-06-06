import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db';
import { IslemKaydi, Birim } from '../types';
import { TAVIM_BASLANGIC_TARIH, TAVIM_BASLANGIC_AY } from '../constants';
import { defaultRaporBaslangic, isRaporTarihiGecerli } from '../lib/date-policy';
import { useBreadcrumb } from '../contexts/BreadcrumbContext';
import { useBirimler } from '../contexts/BirimlerContext';
import { useKategoriler } from '../contexts/KategorilerContext';
import { useUser, getAllowedBirimler, canViewNamedReports } from '../contexts/UserContext';
import { getUserEmailMap } from '../services/users-service';
import { FileSpreadsheet, FileText, Search, Database, Calendar, CalendarDays, Users, Building2 } from 'lucide-react';
import { downloadBirimKartiPDF } from '../lib/birim-karti-pdf';
import { monthBounds, prevMonth } from '../lib/report-stats';
import { displayKategoriAdi, isKaldirilanKategori } from '../lib/kategori-aliases';
import BirimSecici, { resolveInitialBirim } from './BirimSecici';
import { trackRecentBirim } from '../lib/birim-prefs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { pdfTurkce } from '../utils/pdfTurkish';
applyPlugin(jsPDF);

const AY_ISIMLERI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Tavim: Aylık rapor dropdown — 1 Haziran 2026 ve sonrası
const getAylarOptions = () => {
  const now = new Date();
  const list: { value: string; label: string }[] = [];
  for (let i = 0; i < 48; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (value < TAVIM_BASLANGIC_AY) break;
    list.push({ value, label: `${AY_ISIMLERI[d.getMonth()]} ${d.getFullYear()}` });
  }
  return list.filter((opt) => opt.value >= TAVIM_BASLANGIC_AY);
};

const BASLANGIC_YILI = 2026;

const getYillarOptions = () => {
  const yil = new Date().getFullYear();
  const list = [];
  for (let y = yil; y >= BASLANGIC_YILI; y--) {
    list.push(y);
  }
  return list;
};

const Reports: React.FC = () => {
  const { setSuffix } = useBreadcrumb();
  const user = useUser();
  const { birimler } = useBirimler();
  const { ortak, getForBirim } = useKategoriler();
  const allowedBirimler = getAllowedBirimler(user, birimler);
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState<IslemKaydi[]>([]);
  useEffect(() => {
    setSuffix(null);
  }, [setSuffix]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(() => {
    const bugun = new Date().toISOString().split('T')[0];
    const start = defaultRaporBaslangic();
    const end = bugun < TAVIM_BASLANGIC_TARIH ? TAVIM_BASLANGIC_TARIH : bugun;
    return { start, end };
  });
  const [selectedBirim, setSelectedBirim] = useState<Birim | 'Tümü'>('Tümü');
  const [birimInit, setBirimInit] = useState(false);
  const tableKategoriler =
    selectedBirim !== 'Tümü' ? getForBirim(selectedBirim) : ortak;
  useEffect(() => {
    if (!user?.id || birimInit) return;
    if (allowedBirimler.length === 0) return;
    if (!isAdmin) {
      setSelectedBirim(resolveInitialBirim(user.id, allowedBirimler, allowedBirimler[0]) as Birim);
    }
    setBirimInit(true);
  }, [user?.id, allowedBirimler.join('|'), isAdmin, birimInit]);

  useEffect(() => {
    if (allowedBirimler.length && selectedBirim !== 'Tümü' && !allowedBirimler.includes(selectedBirim)) {
      setSelectedBirim(isAdmin ? 'Tümü' : (allowedBirimler[0] as Birim));
    }
  }, [allowedBirimler, selectedBirim, isAdmin]);
  const [raporAy, setRaporAy] = useState(() => {
    const d = new Date();
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return value < TAVIM_BASLANGIC_AY ? TAVIM_BASLANGIC_AY : value;
  });
  const [raporYil, setRaporYil] = useState(() => Math.max(new Date().getFullYear(), BASLANGIC_YILI));
  const [raporYukleniyor, setRaporYukleniyor] = useState(false);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [koleksiyonAcik, setKoleksiyonAcik] = useState(true);

  const named = canViewNamedReports(user);
  const myId = user?.id;

  useEffect(() => {
    getUserEmailMap().then(setEmailMap);
  }, []);

  // Editör yalnızca kendi satırlarını görür; diğer roller tüm satırları (adlı) görür
  const visibleData = useMemo(
    () => (named ? data : data.filter((r) => r.user_id === myId)),
    [data, named, myId]
  );

  // Kullanıcı bazında kategori toplamları (verimlilik özeti)
  const userRows = useMemo(() => {
    const byUser: Record<string, Record<string, number>> = {};
    data.forEach((r) => {
      if (isKaldirilanKategori(r.islem_turu || '')) return;
      const uid = (r as any).user_id || 'bilinmeyen';
      const kat = displayKategoriAdi(r.islem_turu || '');
      byUser[uid] = byUser[uid] || {};
      byUser[uid][kat] = (byUser[uid][kat] || 0) + (r.islem_sayisi || 0);
    });
    const rows: { key: string; label: string; perCat: Record<string, number>; total: number; anon?: boolean }[] = [];
    const totalOf = (perCat: Record<string, number>) => Object.values(perCat).reduce((a, b) => a + b, 0);

    if (named) {
      Object.entries(byUser).forEach(([uid, perCat]) => {
        rows.push({ key: uid, label: emailMap[uid] || uid, perCat, total: totalOf(perCat) });
      });
      rows.sort((a, b) => b.total - a.total);
    } else {
      const ownPerCat = byUser[myId || ''] || {};
      rows.push({ key: myId || 'me', label: `${emailMap[myId || ''] || 'Siz'} (siz)`, perCat: ownPerCat, total: totalOf(ownPerCat) });
      const otherPerCat: Record<string, number> = {};
      let otherCount = 0;
      Object.entries(byUser).forEach(([uid, perCat]) => {
        if (uid === myId) return;
        otherCount++;
        Object.entries(perCat).forEach(([k, v]) => { otherPerCat[k] = (otherPerCat[k] || 0) + v; });
      });
      if (otherCount > 0) {
        rows.push({ key: '__anon', label: `Diğer ${otherCount} kullanıcı (anonim)`, perCat: otherPerCat, total: totalOf(otherPerCat), anon: true });
      }
    }
    return rows;
  }, [data, emailMap, named, myId]);

  const setQuickRange = (period: 'gun' | 'hafta' | 'ay' | 'yil') => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let startDate = new Date(now);
    if (period === 'gun') startDate = now;
    else if (period === 'hafta') startDate.setDate(now.getDate() - 6);
    else if (period === 'ay') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'yil') startDate = new Date(now.getFullYear(), 0, 1);
    let start = startDate.toISOString().split('T')[0];
    if (start < TAVIM_BASLANGIC_TARIH) start = TAVIM_BASLANGIC_TARIH;
    setDateFilter({ start, end });
  };

  const fetchData = async () => {
    setLoading(true);
    const rangeStart =
      dateFilter.start < TAVIM_BASLANGIC_TARIH ? TAVIM_BASLANGIC_TARIH : dateFilter.start;
    const query: Record<string, unknown> = {
      kayit_tarihi: { $gte: rangeStart, $lte: dateFilter.end }
    };
    if (selectedBirim !== 'Tümü') query.birim = selectedBirim;
    if (searchTerm) query.islem_turu = searchTerm;
    const { data: records, error } = await db.collection('islem_kayitlari').find(query);

    if (!error && records) {
      // Birim seçiliyse sadece o birimin kayıtlarını göster
      let filtered =
        selectedBirim !== 'Tümü'
          ? records.filter((item: IslemKaydi) => (item.birim || '').trim() === selectedBirim.trim())
          : records;
      // admin dışındaki kullanıcılar yalnızca kendilerine atanmış birimleri görür
      if (!isAdmin) {
        filtered = filtered.filter((item: IslemKaydi) => {
          const b = (item.birim || '').trim();
          if (allowedBirimler.includes(b)) return true;
          if (user?.role === 'editor' && (item as { user_id?: string }).user_id === user?.id) return true;
          return false;
        });
      }
      filtered = filtered.filter((item: IslemKaydi) => isRaporTarihiGecerli(item.kayit_tarihi || ''));
      setData(filtered);
    } else {
      setData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = db.subscribe(() => fetchData());
    return () => unsubscribe();
  }, [dateFilter, searchTerm, selectedBirim, birimler]);

  const fetchRaporVerisi = async (start: string, end: string): Promise<IslemKaydi[]> => {
    const rangeStart = start < TAVIM_BASLANGIC_TARIH ? TAVIM_BASLANGIC_TARIH : start;
    const query: Record<string, unknown> = { kayit_tarihi: { $gte: rangeStart, $lte: end } };
    if (selectedBirim !== 'Tümü') query.birim = selectedBirim;
    const { data: records, error } = await db.collection('islem_kayitlari').find(query);
    if (error || !records) return [];
    let recs: IslemKaydi[] = selectedBirim !== 'Tümü'
      ? records.filter((item: IslemKaydi) => (item.birim || '').trim() === selectedBirim.trim())
      : records;
    // admin dışındaki kullanıcılar yalnızca kendilerine atanmış birimleri görür
    if (!isAdmin) {
      recs = recs.filter((item) => {
        const b = (item.birim || '').trim();
        if (allowedBirimler.includes(b)) return true;
        if (user?.role === 'editor' && (item as { user_id?: string }).user_id === myId) return true;
        return false;
      });
    }
    recs = recs.filter((item) => isRaporTarihiGecerli(item.kayit_tarihi || ''));
    // Editör yalnızca kendi verisini dışa aktarır
    if (!named) recs = recs.filter((item) => (item as any).user_id === myId);
    return recs;
  };

  const emailFor = (uid?: string) => (uid ? (emailMap[uid] || uid) : '-');

  const olusturPDF = (raporData: IslemKaydi[], baslik: string, tarihAraligi: string, dosyaAdi: string) => {
    try {
      const t = pdfTurkce;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFontSize(16);
      doc.text(t('Sicil İşlem Raporu'), 14, 16);
      doc.setFontSize(10);
      doc.text(t(baslik), 14, 22);
      doc.text(t(`Tarih Aralığı: ${tarihAraligi}`), 14, 28);
      doc.text(t(`Birim: ${selectedBirim}`), 14, 34);

      const toplamIslem = raporData.reduce((s, i) => s + (i.islem_sayisi || 0), 0);
      const kategoriOzet = raporData.reduce((acc: Record<string, number>, curr) => {
        if (isKaldirilanKategori(curr.islem_turu || '')) return acc;
        const k = displayKategoriAdi(curr.islem_turu || '');
        acc[k] = (acc[k] || 0) + (curr.islem_sayisi || 0);
        return acc;
      }, {});

      let y = 44;
      doc.setFontSize(11);
      doc.text(t(`Toplam İşlem: ${toplamIslem}`), 14, y);
      y += 8;

      if (Object.keys(kategoriOzet).length > 0) {
        doc.setFontSize(10);
        doc.text(t('Kategori Özeti:'), 14, y);
        y += 6;
        Object.entries(kategoriOzet).forEach(([k, v]) => {
          const txt = t(`${k}: ${v}`);
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(txt, 14, y);
          y += 5;
        });
        y += 4;
      }

      const tableData = raporData.map(item => [
        String(item.kayit_tarihi || ''),
        t(item.birim || '-'),
        t(emailFor((item as any).user_id)),
        t(displayKategoriAdi(item.islem_turu || '')),
        String(item.islem_sayisi ?? ''),
        item.created_at ? t(new Date(item.created_at).toLocaleDateString('tr-TR')) : ''
      ]);

      doc.autoTable({
        startY: y,
        head: [[t('Tarih'), t('Birim'), t('Kullanıcı'), t('Kategori'), t('Adet'), t('Giriş')]],
        body: tableData.length > 0 ? tableData : [['-', '-', '-', t('Kayıt yok'), '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [0, 104, 74] },
        styles: { fontSize: 8 }
      });

      doc.save(dosyaAdi);
    } catch (err) {
      console.error('PDF olusturma hatasi:', err);
      alert('PDF olusturulurken hata olustu. Konsolu kontrol edin.');
    }
  };

  const aylikRaporPDF = async () => {
    setRaporYukleniyor(true);
    const [y, m] = raporAy.split('-');
    const start = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    const end = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    const raporData = await fetchRaporVerisi(start, end);
    olusturPDF(raporData, `Aylik Rapor - ${AY_ISIMLERI[parseInt(m) - 1]} ${y}`, `${start} - ${end}`, `sicil_aylik_${y}_${m}.pdf`);
    setRaporYukleniyor(false);
  };

  const aylikRaporExcel = async () => {
    setRaporYukleniyor(true);
    const [y, m] = raporAy.split('-');
    const start = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    const end = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    const raporData = await fetchRaporVerisi(start, end);
    const ws = XLSX.utils.json_to_sheet(raporData.map(item => ({
      'Tarih': item.kayit_tarihi, 'Birim': item.birim || '-', 'Islem Turu': displayKategoriAdi(item.islem_turu || ''),
      'Adet': item.islem_sayisi, 'Giris': new Date(item.created_at).toLocaleString('tr-TR')
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Aylik_${y}_${m}`);
    XLSX.writeFile(wb, `sicil_aylik_${y}_${m}.xlsx`);
    setRaporYukleniyor(false);
  };

  const yillikRaporPDF = async () => {
    setRaporYukleniyor(true);
    const start = `${raporYil}-01-01`;
    const end = `${raporYil}-12-31`;
    const raporData = await fetchRaporVerisi(start, end);
    olusturPDF(raporData, `Yillik Rapor - ${raporYil}`, `${start} - ${end}`, `sicil_yillik_${raporYil}.pdf`);
    setRaporYukleniyor(false);
  };

  const yillikRaporExcel = async () => {
    setRaporYukleniyor(true);
    const start = `${raporYil}-01-01`;
    const end = `${raporYil}-12-31`;
    const raporData = await fetchRaporVerisi(start, end);
    const ws = XLSX.utils.json_to_sheet(raporData.map(item => ({
      'Tarih': item.kayit_tarihi, 'Birim': item.birim || '-', 'Islem Turu': displayKategoriAdi(item.islem_turu || ''),
      'Adet': item.islem_sayisi, 'Giris': new Date(item.created_at).toLocaleString('tr-TR')
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Yillik_${raporYil}`);
    XLSX.writeFile(wb, `sicil_yillik_${raporYil}.xlsx`);
    setRaporYukleniyor(false);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(visibleData.map(item => ({
      'Kayıt ID': item.id || (item as any)._id,
      'Birim': item.birim || '-',
      'Kullanıcı': emailFor((item as any).user_id),
      'Tarih': item.kayit_tarihi,
      'İşlem Türü': displayKategoriAdi(item.islem_turu || ''),
      'Adet': item.islem_sayisi,
      'Sistem Girişi': new Date(item.created_at).toLocaleString('tr-TR')
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Islem_Raporu");
    XLSX.writeFile(wb, `sicil_raporu_${Date.now()}.xlsx`);
  };

  const exportToPDF = () => {
    olusturPDF(visibleData, 'Filtrelenmis Rapor', `${dateFilter.start} - ${dateFilter.end}`, `sicil_raporu_${Date.now()}.pdf`);
  };

  const birimKartiPDF = async () => {
    if (selectedBirim === 'Tümü') {
      alert('Birim kartı için lütfen tek bir birim seçin.');
      return;
    }
    setRaporYukleniyor(true);
    try {
      const { start, end } = monthBounds(raporAy);
      const pAy = prevMonth(raporAy);
      const { start: pStart, end: pEnd } = monthBounds(pAy);
      const [monthRecs, prevRecs] = await Promise.all([
        fetchRaporVerisi(start, end),
        fetchRaporVerisi(pStart, pEnd)
      ]);
      const { data: locks } = await db.collection('kesinlesen_gunler').find({
        kayit_tarihi: { $gte: start, $lte: end }
      });
      const locksFiltered = (locks || []).filter(
        (l: { birim?: string }) => (l.birim || '').trim() === selectedBirim.trim()
      );
      downloadBirimKartiPDF({
        birim: selectedBirim,
        yyyyMm: raporAy,
        records: monthRecs,
        prevRecords: prevRecs,
        locksInMonth: locksFiltered
      });
    } catch (e) {
      console.error(e);
      alert('Birim kartı PDF oluşturulamadı.');
    }
    setRaporYukleniyor(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Hızlı Raporlar */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
          <CalendarDays size={20} className="text-emerald-600" />
          Hızlı Raporlar
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-bold text-sm">
              <Calendar size={16} />
              Aylık Rapor
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={raporAy}
                onChange={(e) => setRaporAy(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                {getAylarOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={aylikRaporPDF}
                disabled={raporYukleniyor}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-all font-bold text-xs disabled:opacity-50"
              >
                <FileText size={14} />
                PDF
              </button>
              <button
                onClick={aylikRaporExcel}
                disabled={raporYukleniyor}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all font-bold text-xs disabled:opacity-50"
              >
                <FileSpreadsheet size={14} />
                Excel
              </button>
            </div>
            <div className="flex flex-wrap items-end gap-3 p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/60">
              <div className="space-y-1 min-w-[12rem] flex-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Birim kartı — birim seçin
                </label>
                <BirimSecici
                  userId={user?.id}
                  allowedBirimler={allowedBirimler}
                  value={selectedBirim}
                  allowTumu={isAdmin || allowedBirimler.length > 1}
                  onChange={(b) => {
                    setSelectedBirim(b);
                    if (user?.id && b !== 'Tümü') trackRecentBirim(user.id, b);
                  }}
                />
              </div>
              <button
                onClick={birimKartiPDF}
                disabled={raporYukleniyor || selectedBirim === 'Tümü'}
                title={selectedBirim === 'Tümü' ? 'Tek bir birim seçin' : 'Üst yönetim sunumu — tek sayfa özet'}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all font-bold text-xs disabled:opacity-50 shrink-0"
              >
                <Building2 size={14} />
                Birim kartı PDF
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Birim kartı tek birime özeldir (Tümü seçiliyken pasif). Toplam işlem, kategori dağılımı, geçen aya göre % ve
              kesinleşmeyen gün uyarısı (tek sayfa).
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-bold text-sm">
              <CalendarDays size={16} />
              Yıllık Rapor
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={raporYil}
                onChange={(e) => setRaporYil(parseInt(e.target.value))}
                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                {getYillarOptions().map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={yillikRaporPDF}
                disabled={raporYukleniyor}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-all font-bold text-xs disabled:opacity-50"
              >
                <FileText size={14} />
                PDF
              </button>
              <button
                onClick={yillikRaporExcel}
                disabled={raporYukleniyor}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all font-bold text-xs disabled:opacity-50"
              >
                <FileSpreadsheet size={14} />
                Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Kullanıcı Bazında Toplam (verimlilik özeti) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users size={20} className="text-emerald-600" />
            Kullanıcı Bazında Toplam
            <span className="text-xs font-bold text-slate-400">({dateFilter.start} → {dateFilter.end})</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Dönem</span>
            {([['gun', 'Bugün'], ['hafta', 'Son 7 gün'], ['ay', 'Bu ay'], ['yil', 'Bu yıl']] as const).map(([p, label]) => (
              <button
                key={p}
                type="button"
                onClick={() => setQuickRange(p)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {!named && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Editör görünümü: kendi istatistiğiniz adınızla, diğer kullanıcılar anonim toplam olarak gösterilir.
          </p>
        )}
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 dark:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider">
                <th className="px-4 py-3">Kullanıcı</th>
                {tableKategoriler.map((t) => (
                  <th key={t} className="px-3 py-3 text-right whitespace-nowrap">{t}</th>
                ))}
                <th className="px-4 py-3 text-right">Toplam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {userRows.length === 0 ? (
                <tr>
                  <td colSpan={tableKategoriler.length + 2} className="px-4 py-8 text-center text-slate-400">
                    Seçili dönemde veri yok.
                  </td>
                </tr>
              ) : (
                userRows.map((row) => (
                  <tr key={row.key} className={`hover:bg-emerald-50/30 dark:hover:bg-slate-700/40 ${row.anon ? 'italic text-slate-400 dark:text-slate-500' : ''}`}>
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{row.label}</td>
                    {tableKategoriler.map((t) => (
                      <td key={t} className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">{row.perCat[t] || 0}</td>
                    ))}
                    <td className="px-4 py-3 text-right font-black text-emerald-700 dark:text-emerald-400">{row.total}</td>
                  </tr>
                ))
              )}
            </tbody>
            {userRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-700/40 font-black text-slate-700 dark:text-slate-200">
                  <td className="px-4 py-3">Birim Toplamı</td>
                  {tableKategoriler.map((t) => (
                    <td key={t} className="px-3 py-3 text-right">{userRows.reduce((s, r) => s + (r.perCat[t] || 0), 0)}</td>
                  ))}
                  <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400">{userRows.reduce((s, r) => s + r.total, 0)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 ${koleksiyonAcik ? 'mb-10' : 'mb-0'}`}>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setKoleksiyonAcik((v) => !v)}
              aria-expanded={koleksiyonAcik}
              aria-controls="koleksiyon-gezgini-panel"
              title={koleksiyonAcik ? 'Koleksiyon gezginini gizle' : 'Koleksiyon gezginini göster'}
              className={`p-3 rounded-2xl shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/30 ${
                koleksiyonAcik
                  ? 'bg-slate-900 dark:bg-slate-700 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                  : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Database size={24} className={`transition-transform duration-200 ${koleksiyonAcik ? 'scale-100' : 'scale-90 opacity-60'}`} />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Koleksiyon Gezgini</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">
                {koleksiyonAcik ? 'Firestore Rapor Motoru v1.0' : 'Gizli — görmek için ikona tıklayın'}
              </p>
            </div>
          </div>

          {koleksiyonAcik && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-2xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all font-bold text-xs"
              >
                <FileSpreadsheet size={16} />
                EXCEL ÇIKTISI
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-5 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-all font-bold text-xs"
              >
                <FileText size={16} />
                PDF RAPORU
              </button>
            </div>
          )}
        </div>

        {koleksiyonAcik && (
          <div id="koleksiyon-gezgini-panel">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 p-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-600 transition-colors">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Birim</label>
            <BirimSecici
              userId={user?.id}
              allowedBirimler={allowedBirimler}
              value={selectedBirim}
              allowTumu={isAdmin || allowedBirimler.length > 1}
              onChange={(b) => {
                setSelectedBirim(b);
                if (user?.id && b !== 'Tümü') trackRecentBirim(user.id, b);
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Ara</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input 
              type="text"
              placeholder="Dokümanlarda ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-medium text-slate-800 dark:text-slate-200 transition-all"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Başlangıç</label>
            <input 
              type="date" 
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              min={TAVIM_BASLANGIC_TARIH}
              className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-medium text-slate-800 dark:text-slate-200 transition-all"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Bitiş</label>
            <input 
              type="date" 
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              min={TAVIM_BASLANGIC_TARIH}
              className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-medium text-slate-800 dark:text-slate-200 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 dark:bg-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Tarih</th>
                <th className="px-8 py-5">Birim</th>
                <th className="px-8 py-5">Kullanıcı</th>
                <th className="px-8 py-5">Kategori</th>
                <th className="px-8 py-5 text-right">Adet</th>
                <th className="px-8 py-5 text-right">Oluşturulma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                      <span className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest">Veri seti okunuyor...</span>
                    </div>
                  </td>
                </tr>
              ) : visibleData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-500">
                      <Search size={48} className="opacity-20 mb-2" />
                      <span className="font-bold text-sm tracking-tight">Kriterlere uygun sonuç bulunamadı.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleData.map((item) => (
                  <tr key={(item as any)._id || item.id} className="hover:bg-emerald-50/30 dark:hover:bg-slate-700/50 transition-colors group cursor-default">
                    <td className="px-8 py-5">
                      <span className="text-slate-700 dark:text-slate-300 font-bold font-mono text-sm">{item.kayit_tarihi}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">{item.birim || '-'}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">{emailFor((item as any).user_id)}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase border border-slate-200 dark:border-slate-600">
                        {displayKategoriAdi(item.islem_turu || '')}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-emerald-700 dark:text-emerald-400 font-black text-lg">{item.islem_sayisi}</span>
                    </td>
                    <td className="px-8 py-5 text-right text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                      {new Date(item.created_at).toLocaleString('tr-TR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
