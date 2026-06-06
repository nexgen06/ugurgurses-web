
import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, LabelList,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { pdfTurkce } from '../utils/pdfTurkish';
import { db } from '../db';
import { IslemKaydi, ChartData, LineChartData, Birim } from '../types';
import { COLORS, TAVIM_BASLANGIC_TARIH, TAVIM_BASLANGIC_AY } from '../constants';
import { isRaporTarihiGecerli } from '../lib/date-policy';
import { displayKategoriAdi, isKaldirilanKategori } from '../lib/kategori-aliases';

applyPlugin(jsPDF);
import { useBirimler } from '../contexts/BirimlerContext';
import { useKategoriler } from '../contexts/KategorilerContext';
import { useBreadcrumb } from '../contexts/BreadcrumbContext';
import { useUser, getAllowedBirimler, canViewNamedReports, canEnterData, canFinalize } from '../contexts/UserContext';
import DashboardHedefGerceklesen from './DashboardHedefGerceklesen';
import DashboardAnonimKiyas from './DashboardAnonimKiyas';
import DashboardDonemKiyas from './DashboardDonemKiyas';
import BirimSecici, { resolveInitialBirim } from './BirimSecici';
import { useTheme } from '../contexts/ThemeContext';
import { getChartTheme, chartTooltipStyle } from '../utils/chart-theme';
import { trackRecentBirim } from '../lib/birim-prefs';
import { getUserEmailMap } from '../services/users-service';
import {
  Calendar, Filter, TrendingUp, Users, Activity, BarChart3, PieChart as PieIcon,
  Trophy, Layers, Lock, AlertTriangle, Percent, Award, CalendarCheck,
  ArrowUpRight, ArrowDownRight, Minus, UserCircle, Flame, Eye,
  GitCompare, Building2, Table2, Radar as RadarIcon,
  FileSpreadsheet, FileText, Target
} from 'lucide-react';

const AY_ISIMLERI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const getAylarListesi = () => {
  const list = [];
  const now = new Date();
  for (let i = 0; i < 120; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const value = `${yyyy}-${mm}`;
    if (value < TAVIM_BASLANGIC_AY) break;
    list.push({
      value,
      label: `${AY_ISIMLERI[d.getMonth()]} ${yyyy}`
    });
  }
  return list;
};

const AYLAR_OPTIONS = getAylarListesi();

const Dashboard: React.FC = () => {
  const { setSuffix } = useBreadcrumb();
  const { theme } = useTheme();
  const chartTheme = getChartTheme(theme === 'dark');
  const user = useUser();
  const { birimler } = useBirimler();
  const { ortak, getForBirim } = useKategoriler();
  const [compareCatMode, setCompareCatMode] = useState<'ortak' | 'tam'>('ortak');
  const allowedBirimler = getAllowedBirimler(user, birimler);
  const isAdmin = user?.role === 'admin';
  const canPersonal = canEnterData(user); // admin/proje_yetkilisi/editor — kendi verisi olabilir
  const canFin = canFinalize(user); // admin/proje_yetkilisi — kilit durumunu görür
  const [data, setData] = useState<IslemKaydi[]>([]);
  const [lockKeys, setLockKeys] = useState<Set<string>>(new Set());
  // Görünüm kapsamı: kendi verisi olan kullanıcılar için "self"/"birim" arası geçiş
  const [scope, setScope] = useState<'self' | 'birim'>(user?.role === 'editor' ? 'self' : 'birim');
  // Birim karşılaştırma metriği + baz (referans) birim
  const [compareMetric, setCompareMetric] = useState<'total' | 'avg' | 'perUser' | 'records'>('total');
  const [baseBirim, setBaseBirim] = useState<string>(''); // '' = kapalı (mutlak değer)
  const [pdfBusy, setPdfBusy] = useState(false);
  const cmpBarRef = useRef<HTMLDivElement>(null);
  const cmpRadarRef = useRef<HTMLDivElement>(null);
  const cmpStackedRef = useRef<HTMLDivElement>(null);
  const cmpTrendRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAy, setSelectedAy] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [kategoriGrafikTipi, setKategoriGrafikTipi] = useState<'pie' | 'bar'>('pie');
  const [dateRange, setDateRange] = useState({
    start: TAVIM_BASLANGIC_AY + '-01',
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedBirim, setSelectedBirim] = useState<Birim | 'Tümü'>('Tümü');
  const [birimInit, setBirimInit] = useState(false);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const named = canViewNamedReports(user);
  const myId = user?.id;
  useEffect(() => {
    getUserEmailMap().then(setEmailMap);
  }, []);
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

  const fetchData = async () => {
    setLoading(true);
    const query: Record<string, unknown> = {
      kayit_tarihi: { $gte: dateRange.start, $lte: dateRange.end }
    };
    if (selectedBirim !== 'Tümü') query.birim = selectedBirim;
    const { data: records, error } = await db.collection('islem_kayitlari').find(query);

    if (!error && records) {
      // admin dışındaki kullanıcılar yalnızca kendilerine atanmış birimleri görür
      let scoped = isAdmin
        ? records
        : records.filter((item: IslemKaydi) => {
            const b = (item.birim || '').trim();
            if (allowedBirimler.includes(b)) return true;
            if (user?.role === 'editor' && (item as { user_id?: string }).user_id === user.id) return true;
            return false;
          });
      scoped = scoped.filter((item: IslemKaydi) => isRaporTarihiGecerli(item.kayit_tarihi || ''));
      setData(scoped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = db.subscribe(() => fetchData());
    return () => unsubscribe();
  }, [dateRange, selectedBirim, birimler]);

  // Kilit (kesinleşen gün) durumu — yalnızca kesinleştirme yetkisi olanlar için
  useEffect(() => {
    if (!canFin) {
      setLockKeys(new Set());
      return;
    }
    let active = true;
    const loadLocks = async () => {
      const { data: locks, error } = await db.collection('kesinlesen_gunler').find({});
      if (!active || error || !locks) return;
      const keys = new Set<string>();
      locks.forEach((l: any) => {
        if (!l.kayit_tarihi || !l.birim) return;
        if (l.kayit_tarihi < dateRange.start || l.kayit_tarihi > dateRange.end) return;
        if (!isAdmin && !allowedBirimler.includes(l.birim)) return;
        keys.add(`${l.kayit_tarihi}__${l.birim}`);
      });
      setLockKeys(keys);
    };
    loadLocks();
    const unsub = db.subscribe(() => loadLocks());
    return () => {
      active = false;
      unsub();
    };
  }, [canFin, dateRange, birimler, isAdmin]);

  useEffect(() => {
    const label = AYLAR_OPTIONS.find(o => o.value === selectedAy)?.label ?? selectedAy;
    setSuffix(label);
  }, [selectedAy, setSuffix]);

  // Görünüm kapsamına göre veri seti: "self" yalnızca kullanıcının kendi kayıtları,
  // "birim" tüm (erişilen) birim verisi. Kendi verisi olmayan roller daima birim görür.
  const effectiveScope: 'self' | 'birim' = canPersonal ? scope : 'birim';
  const viewData = useMemo(
    () => (effectiveScope === 'self' ? data.filter((r) => (r as any).user_id === myId) : data),
    [data, effectiveScope, myId]
  );

  // Kategori dağılımı — seçilen ay, işlem türüne göre toplam
  const pieData: ChartData[] = useMemo(() => {
    const acc: ChartData[] = [];
    for (const curr of viewData) {
      if (!curr.kayit_tarihi?.startsWith(selectedAy)) continue;
      if (isKaldirilanKategori(curr.islem_turu || '')) continue;
      const tur = displayKategoriAdi((curr.islem_turu || '').trim()) || 'Diğer';
      const existing = acc.find((item) => item.name === tur);
      if (existing) {
        existing.value += curr.islem_sayisi || 0;
      } else {
        acc.push({ name: tur, value: curr.islem_sayisi || 0 });
      }
    }
    return acc.sort((a, b) => b.value - a.value);
  }, [viewData, selectedAy]);

  // Aggregate for Line Chart (by date)
  const lineData: LineChartData[] = viewData.reduce((acc: LineChartData[], curr) => {
    const existing = acc.find(item => item.date === curr.kayit_tarihi);
    if (existing) {
      existing.count += curr.islem_sayisi;
    } else {
      acc.push({ date: curr.kayit_tarihi, count: curr.islem_sayisi });
    }
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date));

  // ---------------------------------------------------------------------
  //  Rol/policy duyarlı KPI hesaplamaları
  // ---------------------------------------------------------------------
  const today = new Date().toISOString().split('T')[0];
  const kpis = useMemo(() => {
    const sum = (arr: IslemKaydi[]) => arr.reduce((s, r) => s + (r.islem_sayisi || 0), 0);
    const distinctDays = (arr: IslemKaydi[]) => new Set(arr.map((r) => r.kayit_tarihi)).size;

    // Kapsam (viewData) tabanlı temel metrikler
    const total = sum(viewData);
    const aktifGun = distinctDays(viewData);
    const gunlukOrt = aktifGun > 0 ? total / aktifGun : 0;

    // Dönem ivmesi: tarih aralığını ikiye böl, ikinci yarı vs ilk yarı
    let momentum: number | null = null;
    if (dateRange.start && dateRange.end && dateRange.start < dateRange.end) {
      const s = new Date(dateRange.start).getTime();
      const e = new Date(dateRange.end).getTime();
      const mid = new Date(s + (e - s) / 2).toISOString().split('T')[0];
      const firstHalf = sum(viewData.filter((r) => r.kayit_tarihi <= mid));
      const secondHalf = sum(viewData.filter((r) => r.kayit_tarihi > mid));
      if (firstHalf > 0) momentum = ((secondHalf - firstHalf) / firstHalf) * 100;
      else if (secondHalf > 0) momentum = 100;
      else momentum = 0;
    }

    // Öne çıkan kategori (kapsam tabanlı)
    const byCat: Record<string, number> = {};
    viewData.forEach((r) => {
      if (isKaldirilanKategori(r.islem_turu || '')) return;
      const k = displayKategoriAdi(r.islem_turu || '') || 'Diğer';
      byCat[k] = (byCat[k] || 0) + (r.islem_sayisi || 0);
    });
    const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

    // Birim geneli kullanıcı bazlı toplamlar (sıralama/pay/en verimli için DAİMA tüm birim verisi)
    const byUser: Record<string, number> = {};
    data.forEach((r) => {
      const uid = (r as any).user_id || 'bilinmeyen';
      byUser[uid] = (byUser[uid] || 0) + (r.islem_sayisi || 0);
    });
    const userTotals = Object.entries(byUser).sort((a, b) => b[1] - a[1]);
    const birimTotal = userTotals.reduce((s, [, v]) => s + v, 0);
    const userCount = userTotals.length;

    // Kişisel metrikler (kendi verisi olan roller)
    const myTotal = byUser[myId || ''] || 0;
    const myRecords = data.filter((r) => (r as any).user_id === myId);
    const myAktifGun = distinctDays(myRecords);
    const myGunlukOrt = myAktifGun > 0 ? myTotal / myAktifGun : 0;
    const myShare = birimTotal > 0 ? (myTotal / birimTotal) * 100 : 0;
    const myRank = myId ? userTotals.findIndex(([uid]) => uid === myId) + 1 : 0;
    // Kişisel en verimli gün
    const myByDay: Record<string, number> = {};
    myRecords.forEach((r) => { myByDay[r.kayit_tarihi] = (myByDay[r.kayit_tarihi] || 0) + (r.islem_sayisi || 0); });
    const myBestDay = Object.entries(myByDay).sort((a, b) => b[1] - a[1])[0];

    // En verimli personel (yalnızca isimli roller anlamlı)
    const topUser = userTotals[0];

    // Kilit durumu (canFin): aralıktaki geçmiş (gün, birim) çiftleri kilitli mi?
    const pastPairs = new Set<string>();
    data.forEach((r) => {
      if (!r.kayit_tarihi || r.kayit_tarihi >= today || !r.birim) return;
      pastPairs.add(`${r.kayit_tarihi}__${r.birim}`);
    });
    let bekleyenGun = 0;
    pastPairs.forEach((k) => { if (!lockKeys.has(k)) bekleyenGun++; });
    const kesinlesenGun = lockKeys.size;

    return {
      total, aktifGun, gunlukOrt, momentum, topCat,
      userCount, birimTotal,
      myTotal, myGunlukOrt, myShare, myRank, myBestDay, myAktifGun,
      topUser, kesinlesenGun, bekleyenGun
    };
  }, [viewData, data, dateRange, myId, lockKeys, today]);

  const emailFor = (uid: string) => emailMap[uid] || uid;

  // Kullanıcı bazında toplam işlem (editör: kendisi adlı + diğerleri anonim)
  const userBarData = useMemo(() => {
    const byUser: Record<string, number> = {};
    data.forEach((r) => {
      const uid = (r as any).user_id || 'bilinmeyen';
      byUser[uid] = (byUser[uid] || 0) + (r.islem_sayisi || 0);
    });
    if (named) {
      return Object.entries(byUser)
        .map(([uid, value]) => ({ name: emailMap[uid] || uid, value }))
        .sort((a, b) => b.value - a.value);
    }
    const own = byUser[myId || ''] || 0;
    let others = 0;
    Object.entries(byUser).forEach(([uid, v]) => { if (uid !== myId) others += v; });
    const res = [{ name: `${emailMap[myId || ''] || 'Siz'} (siz)`, value: own }];
    if (others > 0) res.push({ name: 'Diğer (anonim)', value: others });
    return res;
  }, [data, emailMap, named, myId]);

  // ---------------------------------------------------------------------
  //  Birim karşılaştırma (yalnızca "Tümü" + birim görünümü + ≥2 birim)
  // ---------------------------------------------------------------------
  const birimCompare = useMemo(() => {
    const map: Record<string, {
      birim: string; total: number; days: Set<string>; users: Set<string>;
      byCat: Record<string, number>; records: number;
    }> = {};
    data.forEach((r) => {
      const b = (r.birim || '').trim();
      if (!b) return;
      if (!map[b]) map[b] = { birim: b, total: 0, days: new Set(), users: new Set(), byCat: {}, records: 0 };
      const m = map[b];
      m.total += r.islem_sayisi || 0;
      if (r.kayit_tarihi) m.days.add(r.kayit_tarihi);
      m.users.add((r as any).user_id || 'bilinmeyen');
      if (!isKaldirilanKategori(r.islem_turu || '')) {
        const k = displayKategoriAdi(r.islem_turu || '') || 'Diğer';
        m.byCat[k] = (m.byCat[k] || 0) + (r.islem_sayisi || 0);
      }
      m.records += 1;
    });
    return Object.values(map).map((m) => {
      const aktifGun = m.days.size;
      const userCount = m.users.size;
      let kesinlesen = 0;
      let bekleyen = 0;
      if (canFin) {
        lockKeys.forEach((k) => { if (k.endsWith('__' + m.birim)) kesinlesen++; });
        const pastDays = new Set<string>();
        m.days.forEach((d) => { if (d < today) pastDays.add(d); });
        pastDays.forEach((d) => { if (!lockKeys.has(`${d}__${m.birim}`)) bekleyen++; });
      }
      return {
        birim: m.birim, total: m.total, aktifGun, userCount, records: m.records,
        gunlukOrt: aktifGun > 0 ? m.total / aktifGun : 0,
        kisiBasi: userCount > 0 ? m.total / userCount : 0,
        byCat: m.byCat, kesinlesen, bekleyen
      };
    }).sort((a, b) => b.total - a.total);
  }, [data, canFin, lockKeys, today]);

  const showCompare = effectiveScope === 'birim' && selectedBirim === 'Tümü' && birimCompare.length >= 2;

  const compareKategoriler = useMemo(() => {
    if (compareCatMode === 'ortak') return ortak;
    const keys = new Set<string>();
    birimCompare.forEach((b) => getForBirim(b.birim).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [compareCatMode, ortak, birimCompare, getForBirim]);

  const raporKategoriler = useMemo(
    () => (selectedBirim !== 'Tümü' ? getForBirim(selectedBirim) : ortak),
    [selectedBirim, ortak, getForBirim]
  );

  const metricMeta: Record<typeof compareMetric, { label: string; get: (b: typeof birimCompare[number]) => number; fixed?: boolean }> = {
    total: { label: 'Toplam İşlem', get: (b) => b.total },
    avg: { label: 'Günlük Ortalama', get: (b) => b.gunlukOrt, fixed: true },
    perUser: { label: 'Kişi Başı İşlem', get: (b) => b.kisiBasi, fixed: true },
    records: { label: 'Kayıt Adedi', get: (b) => b.records }
  };

  const baseRow = baseBirim ? birimCompare.find((b) => b.birim === baseBirim) : undefined;
  const baseValue = baseRow ? metricMeta[compareMetric].get(baseRow) : null;
  const usePct = !!baseBirim && baseValue != null && baseValue !== 0;

  const metricBarData = birimCompare.map((b) => {
    const raw = metricMeta[compareMetric].get(b);
    const value = metricMeta[compareMetric].fixed ? Number(raw.toFixed(1)) : raw;
    const pct = usePct ? Number((((raw - (baseValue as number)) / (baseValue as number)) * 100).toFixed(1)) : 0;
    return { name: b.birim, value, pct, isBase: b.birim === baseBirim };
  });

  const stackedCatData = birimCompare.map((b) => {
    const row: Record<string, number | string> = { name: b.birim };
    compareKategoriler.forEach((c) => { row[c] = b.byCat[c] || 0; });
    return row;
  });

  const radarData = compareKategoriler.map((c) => {
    const row: Record<string, number | string> = { kategori: c };
    birimCompare.forEach((b) => { row[b.birim] = b.byCat[c] || 0; });
    return row;
  });

  const compareTrendData = useMemo(() => {
    const byDate: Record<string, Record<string, number | string>> = {};
    data.forEach((r) => {
      const b = (r.birim || '').trim();
      if (!b || !r.kayit_tarihi) return;
      if (!byDate[r.kayit_tarihi]) byDate[r.kayit_tarihi] = { date: r.kayit_tarihi };
      byDate[r.kayit_tarihi][b] = ((byDate[r.kayit_tarihi][b] as number) || 0) + (r.islem_sayisi || 0);
    });
    return Object.values(byDate).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [data]);

  // Tablo için her kritere göre en iyi birim (vurgu)
  const compareBest = useMemo(() => {
    const best = (sel: (b: typeof birimCompare[number]) => number) =>
      birimCompare.reduce((mx, b) => Math.max(mx, sel(b)), -Infinity);
    return {
      total: best((b) => b.total),
      gunlukOrt: best((b) => b.gunlukOrt),
      kisiBasi: best((b) => b.kisiBasi),
      userCount: best((b) => b.userCount),
      aktifGun: best((b) => b.aktifGun)
    };
  }, [birimCompare]);

  const topCatOf = (byCat: Record<string, number>) =>
    Object.entries(byCat).sort((x, y) => Number(y[1]) - Number(x[1]))[0];

  // Birim karşılaştırmasını Excel olarak dışa aktar
  const exportCompareExcel = () => {
    const rows = birimCompare.map((b) => {
      const tc = topCatOf(b.byCat);
      const row: Record<string, string | number> = {
        'Birim': b.birim,
        'Toplam İşlem': b.total,
        'Günlük Ortalama': Number(b.gunlukOrt.toFixed(2)),
        'Aktif Gün': b.aktifGun,
        'Kullanıcı': b.userCount,
        'Kişi Başı': Number(b.kisiBasi.toFixed(2)),
        'Öne Çıkan Kategori': tc ? `${tc[0]} (${tc[1]})` : '-'
      };
      compareKategoriler.forEach((c) => { row[c] = b.byCat[c] || 0; });
      if (canFin) {
        row['Kesinleşen Gün'] = b.kesinlesen;
        row['Bekleyen Kesinleştirme'] = b.bekleyen;
      }
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Birim_Karsilastirma');

    // 2. sayfa: Kategori matrisi (birim × kategori + toplam satır/sütun)
    const header = ['Birim', ...compareKategoriler, 'Toplam'];
    const matrix = birimCompare.map((b) => [
      b.birim,
      ...compareKategoriler.map((c) => b.byCat[c] || 0),
      b.total
    ]);
    const totalsRow: (string | number)[] = [
      'TOPLAM',
      ...compareKategoriler.map((c) => birimCompare.reduce((s, b) => s + (b.byCat[c] || 0), 0)),
      birimCompare.reduce((s, b) => s + b.total, 0)
    ];
    const ws2 = XLSX.utils.aoa_to_sheet([header, ...matrix, totalsRow]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Kategori_Matrisi');

    XLSX.writeFile(wb, `birim_karsilastirma_${dateRange.start}_${dateRange.end}.xlsx`);
  };

  // Birim karşılaştırmasını PDF olarak dışa aktar (grafik görselleri + kriter tablosu)
  const exportComparePDF = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const t = pdfTurkce;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 12;
      doc.setFontSize(15);
      doc.text(t('Birim Karşılaştırma'), margin, 16);
      doc.setFontSize(10);
      doc.text(t(`Tarih Aralığı: ${dateRange.start} — ${dateRange.end}`), margin, 23);

      // Grafik kartlarını görsel olarak yakala ve göm (sayfa başına ~2 grafik)
      const chartRefs = [cmpBarRef, cmpRadarRef, cmpStackedRef, cmpTrendRef];
      let y = 30;
      const usableW = pageW - margin * 2;
      const maxH = 84;
      for (const ref of chartRefs) {
        const el = ref.current;
        if (!el) continue;
        const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
        let drawW = usableW;
        let drawH = (canvas.height * drawW) / canvas.width;
        if (drawH > maxH) { drawH = maxH; drawW = (canvas.width * drawH) / canvas.height; }
        if (y + drawH > pageH - margin) { doc.addPage(); y = margin; }
        const x = margin + (usableW - drawW) / 2;
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, drawW, drawH);
        y += drawH + 6;
      }

      // Kriter tablosu yeni sayfada
      doc.addPage();
      doc.setFontSize(13);
      doc.text(t('Kriter Tablosu'), margin, 16);

      const head = [[
        'Birim', 'Toplam', 'Günlük Ort.', 'Aktif Gün', 'Kullanıcı', 'Kişi Başı', 'Öne Çıkan',
        ...(canFin ? ['Kesinleşen', 'Bekleyen'] : [])
      ].map((h) => t(h))];

      const body = birimCompare.map((b) => {
        const tc = topCatOf(b.byCat);
        const row = [
          t(b.birim), String(b.total), b.gunlukOrt.toFixed(1), String(b.aktifGun),
          String(b.userCount), b.kisiBasi.toFixed(1), tc ? t(`${tc[0]} (${tc[1]})`) : '-'
        ];
        if (canFin) row.push(String(b.kesinlesen), String(b.bekleyen));
        return row;
      });

      (doc as any).autoTable({
        startY: 22,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [0, 104, 74] },
        styles: { fontSize: 8 }
      });
      doc.save(`birim_karsilastirma_${dateRange.start}_${dateRange.end}.pdf`);
    } catch (err) {
      console.error('Birim karşılaştırma PDF hatası:', err);
    } finally {
      setPdfBusy(false);
    }
  };

  // Her çubuk için farklı renk (tema paleti + ek varyasyon)
  const BAR_COLORS = [
    '#00ED64', '#00684A', '#116149', '#589636', '#10b981', '#059669',
    '#FFE01B', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#06b6d4',
    '#ec4899', '#84cc16', '#f97316', '#6366f1'
  ];

  // ---------------------------------------------------------------------
  //  Rol/policy duyarlı KPI kart listesi
  // ---------------------------------------------------------------------
  const fmt = (n: number) => (Number.isInteger(n) ? n.toString() : n.toFixed(1));

  type Kpi = { key: string; icon: React.ReactNode; label: string; value: string; sub?: string; accent: string; small?: boolean };
  const kpiCards: Kpi[] = [];

  // Temel (kapsam) kartları — herkes
  kpiCards.push({
    key: 'total', icon: <Activity size={22} />,
    label: effectiveScope === 'self' ? 'Toplam İşleminiz' : 'Toplam İşlem',
    value: kpis.total.toString(),
    sub: effectiveScope === 'self' ? 'sizin girdiğiniz' : 'birim toplamı', accent: 'emerald'
  });
  kpiCards.push({
    key: 'avg', icon: <TrendingUp size={22} />, label: 'Günlük Ortalama',
    value: fmt(kpis.gunlukOrt), sub: `${kpis.aktifGun} aktif gün`, accent: 'green'
  });
  if (kpis.momentum !== null) {
    const up = kpis.momentum >= 0;
    kpiCards.push({
      key: 'mom', icon: up ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />,
      label: 'Dönem İvmesi', value: `${up ? '+' : ''}${kpis.momentum.toFixed(0)}%`,
      sub: '2. yarı / 1. yarı', accent: up ? 'emerald' : 'rose'
    });
  }
  if (kpis.topCat) {
    kpiCards.push({
      key: 'cat', icon: <Flame size={22} />, label: 'Öne Çıkan Kategori',
      value: kpis.topCat[0], sub: `${kpis.topCat[1]} işlem`, accent: 'amber', small: true
    });
  }

  // Kişisel performans — kendi verisi olan roller (admin/proje/editör), verisi varsa
  if (canPersonal && kpis.myTotal > 0) {
    kpiCards.push({
      key: 'mine', icon: <UserCircle size={22} />, label: 'Sizin Toplamınız',
      value: kpis.myTotal.toString(), sub: `günlük ort. ${fmt(kpis.myGunlukOrt)}`, accent: 'indigo'
    });
    kpiCards.push({
      key: 'share', icon: <Percent size={22} />, label: 'Birimdeki Payınız',
      value: `%${kpis.myShare.toFixed(0)}`, sub: 'birim toplamına oranla', accent: 'cyan'
    });
    if (kpis.userCount > 1) {
      kpiCards.push({
        key: 'rank', icon: <Trophy size={22} />, label: 'Sıralamanız',
        value: `${kpis.myRank} / ${kpis.userCount}`, sub: 'birim içinde (anonim)', accent: 'violet'
      });
    }
    if (kpis.myBestDay) {
      kpiCards.push({
        key: 'best', icon: <Award size={22} />, label: 'En Verimli Gününüz',
        value: kpis.myBestDay[1].toString(), sub: kpis.myBestDay[0], accent: 'fuchsia'
      });
    }
  }

  // İsimli roller (admin/proje/viewer): kullanıcı sayısı + en verimli personel (isimle)
  if (named && kpis.userCount > 0) {
    kpiCards.push({
      key: 'users', icon: <Users size={22} />, label: 'Aktif Kullanıcı',
      value: kpis.userCount.toString(), sub: 'veri giren personel', accent: 'sky'
    });
    if (kpis.topUser) {
      kpiCards.push({
        key: 'top', icon: <Trophy size={22} />, label: 'En Verimli Personel',
        value: emailFor(kpis.topUser[0]), sub: `${kpis.topUser[1]} işlem`, accent: 'amber', small: true
      });
    }
  }

  // Kesinleştirme yetkisi (admin/proje): kilit durumu
  if (canFin) {
    kpiCards.push({
      key: 'locked', icon: <Lock size={22} />, label: 'Kesinleşen Gün',
      value: kpis.kesinlesenGun.toString(), sub: 'kilitli (gün × birim)', accent: 'emerald'
    });
    kpiCards.push({
      key: 'pending', icon: kpis.bekleyenGun > 0 ? <AlertTriangle size={22} /> : <CalendarCheck size={22} />,
      label: 'Bekleyen Kesinleştirme', value: kpis.bekleyenGun.toString(),
      sub: 'geçmiş, kilitlenmemiş', accent: kpis.bekleyenGun > 0 ? 'rose' : 'green'
    });
  }

  const ACCENTS: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', ring: 'hover:border-emerald-200 dark:hover:border-emerald-600' },
    green: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', ring: 'hover:border-green-200 dark:hover:border-green-600' },
    slate: { bg: 'bg-slate-50 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300', ring: 'hover:border-slate-300 dark:hover:border-slate-500' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', ring: 'hover:border-amber-200 dark:hover:border-amber-600' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', ring: 'hover:border-indigo-200 dark:hover:border-indigo-600' },
    cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', ring: 'hover:border-cyan-200 dark:hover:border-cyan-600' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', ring: 'hover:border-violet-200 dark:hover:border-violet-600' },
    fuchsia: { bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/30', text: 'text-fuchsia-600 dark:text-fuchsia-400', ring: 'hover:border-fuchsia-200 dark:hover:border-fuchsia-600' },
    sky: { bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', ring: 'hover:border-sky-200 dark:hover:border-sky-600' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', ring: 'hover:border-rose-200 dark:hover:border-rose-600' }
  };

  // Kapsam/policy rozeti — kullanıcının ne gördüğünü açıkça belirtir
  const roleLabel =
    user?.role === 'admin' ? 'Admin' :
    user?.role === 'proje_yetkilisi' ? 'Proje Yetkilisi' :
    user?.role === 'editor' ? 'Editör' : 'Görüntüleyici';
  const scopeBadge =
    isAdmin ? { icon: <Eye size={14} />, text: 'Tüm birimler — tam görünüm', cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' } :
    effectiveScope === 'self' ? { icon: <UserCircle size={14} />, text: 'Kendi verileriniz', cls: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' } :
    named ? { icon: <Layers size={14} />, text: 'Atanmış birimler — isimli görünüm', cls: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300' } :
    { icon: <Layers size={14} />, text: 'Birim görünümü (diğer kişiler anonim)', cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-4 transition-colors">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
          <Filter size={16} className="text-emerald-500" />
          <span>Filtrele</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Birim</label>
            <BirimSecici
              userId={user?.id}
              allowedBirimler={allowedBirimler}
              value={selectedBirim}
              allowTumu={isAdmin || allowedBirimler.length > 1}
              onChange={(b) => {
                setSelectedBirim(b);
                if (user?.id && b !== 'Tümü') trackRecentBirim(user.id, b);
              }}
              className="min-w-[200px]"
            />
          </div>
          <input 
            type="date" 
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            min={TAVIM_BASLANGIC_TARIH}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium text-slate-800 dark:text-slate-200"
          />
          <span className="text-slate-400 dark:text-slate-500">/</span>
          <input 
            type="date" 
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            min={TAVIM_BASLANGIC_TARIH}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium text-slate-800 dark:text-slate-200"
          />
        </div>
        {canPersonal && (
          <div className="flex items-center gap-2 sm:ml-auto">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Görünüm</label>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
              <button
                type="button"
                onClick={() => setScope('self')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${scope === 'self' ? 'bg-white dark:bg-slate-600 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                <UserCircle size={14} /> Benim
              </button>
              <button
                type="button"
                onClick={() => setScope('birim')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${scope === 'birim' ? 'bg-white dark:bg-slate-600 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                <Layers size={14} /> Birim
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Kapsam / policy rozeti */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${scopeBadge.cls}`}>
          {scopeBadge.icon}
          {scopeBadge.text}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          {roleLabel}
        </span>
        {!isAdmin && allowedBirimler.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {allowedBirimler.join(', ')}
          </span>
        )}
      </div>

      {/* Rol/policy duyarlı KPI kartları */}
      {kpiCards.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400">
          Seçilen aralıkta görüntülenecek veri yok.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((c) => {
            const a = ACCENTS[c.accent] ?? ACCENTS.slate;
            return (
              <div
                key={c.key}
                className={`bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 group transition-all ${a.ring}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-xl shrink-0 group-hover:scale-110 transition-transform ${a.bg} ${a.text}`}>
                    {c.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{c.label}</p>
                    <h3
                      className={`font-black text-slate-800 dark:text-slate-100 tracking-tight truncate ${c.small ? 'text-base mt-1' : 'text-2xl'}`}
                      title={c.value}
                    >
                      {c.value}
                    </h3>
                    {c.sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{c.sub}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardHedefGerceklesen selectedAy={selectedAy} selectedBirim={selectedBirim} data={data} />
        <DashboardDonemKiyas data={data} selectedBirim={selectedBirim} defaultAy={selectedAy} />
      </div>

      {user?.role === 'editor' && selectedBirim !== 'Tümü' && (
        <DashboardAnonimKiyas
          userId={myId}
          selectedBirim={selectedBirim}
          data={data}
          selectedAy={selectedAy}
        />
      )}

      {/* ===================== BİRİM KARŞILAŞTIRMA ===================== */}
      {showCompare && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <GitCompare size={20} className="text-emerald-600" />
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Birim Karşılaştırma</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
              <Building2 size={13} /> {birimCompare.length} birim
            </span>
            <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCompareCatMode('ortak')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${compareCatMode === 'ortak' ? 'bg-white dark:bg-slate-600 text-emerald-700 shadow-sm' : 'text-slate-500'}`}
                >
                  Ortak KPI
                </button>
                <button
                  type="button"
                  onClick={() => setCompareCatMode('tam')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${compareCatMode === 'tam' ? 'bg-white dark:bg-slate-600 text-emerald-700 shadow-sm' : 'text-slate-500'}`}
                >
                  Tüm kategoriler
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <Target size={14} className="text-slate-400" />
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Taban</label>
                <select
                  value={baseBirim}
                  onChange={(e) => setBaseBirim(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Kapalı (mutlak)</option>
                  {birimCompare.map((b) => (
                    <option key={b.birim} value={b.birim}>{b.birim}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={exportCompareExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                <FileSpreadsheet size={14} /> Excel
              </button>
              <button
                type="button"
                onClick={exportComparePDF}
                disabled={pdfBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors disabled:opacity-60"
              >
                {pdfBusy ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText size={14} />
                )}
                {pdfBusy ? 'Hazırlanıyor…' : 'PDF'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metrik-seçmeli karşılaştırma çubuğu */}
            <div ref={cmpBarRef} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                  {usePct ? `${metricMeta[compareMetric].label} — ${baseBirim} tabanına göre %` : `Performans: ${metricMeta[compareMetric].label}`}
                </h3>
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
                  {([
                    ['total', 'Toplam'],
                    ['avg', 'Günlük Ort.'],
                    ['perUser', 'Kişi Başı'],
                    ['records', 'Kayıt']
                  ] as const).map(([key, lbl]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCompareMetric(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${compareMetric === key ? 'bg-white dark:bg-slate-600 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricBarData} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} tickMargin={10} tickFormatter={(v) => (usePct ? `${v}%` : `${v}`)} />
                    <YAxis type="category" dataKey="name" width={150} stroke="#94a3b8" fontSize={10} tickMargin={8} />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#fff' }}
                      formatter={(val: number) => (usePct ? [`${val > 0 ? '+' : ''}${val}%`, 'Baz farkı'] : [val, metricMeta[compareMetric].label])}
                    />
                    <Bar dataKey={usePct ? 'pct' : 'value'} radius={[0, 6, 6, 0]} name={usePct ? 'Baz farkı (%)' : metricMeta[compareMetric].label}>
                      {metricBarData.map((d, i) => (
                        <Cell
                          key={`mb-${i}`}
                          fill={usePct ? (d.isBase ? '#94a3b8' : d.pct >= 0 ? '#10b981' : '#ef4444') : BAR_COLORS[i % BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Kategori radarı */}
            <div ref={cmpRadarRef} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                <RadarIcon size={18} className="text-emerald-600" />
                Kategori Radarı (birim profili)
              </h3>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="kategori" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <PolarRadiusAxis tick={{ fontSize: 9, fill: '#cbd5e1' }} />
                    {birimCompare.map((b, i) => (
                      <Radar
                        key={b.birim}
                        name={b.birim}
                        dataKey={b.birim}
                        stroke={BAR_COLORS[i % BAR_COLORS.length]}
                        fill={BAR_COLORS[i % BAR_COLORS.length]}
                        fillOpacity={0.18}
                      />
                    ))}
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#fff' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Kategori dağılımı — yığılmış birim kıyası */}
          <div ref={cmpStackedRef} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
              <BarChart3 size={18} className="text-emerald-600" />
              Kategori Dağılımı — Birim Kıyası
            </h3>
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedCatData} margin={{ left: 10, right: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickMargin={10} interval={0} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickMargin={10} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#fff' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  {compareKategoriler.map((c, i) => (
                    <Bar key={c} dataKey={c} stackId="cat" fill={BAR_COLORS[i % BAR_COLORS.length]} radius={i === compareKategoriler.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Çok çizgili birim trendi */}
          <div ref={cmpTrendRef} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-600" />
              Birim Trendi (günlük)
            </h3>
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={compareTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickMargin={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickMargin={10} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#fff' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  {birimCompare.map((b, i) => (
                    <Line
                      key={b.birim}
                      type="monotone"
                      dataKey={b.birim}
                      stroke={BAR_COLORS[i % BAR_COLORS.length]}
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Kriter tablosu */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Table2 size={18} className="text-emerald-600" />
              Kriter Tablosu
              <span className="text-xs font-normal text-slate-400">(en yüksek değer vurgulu)</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-600 text-left">
                    <th className="py-2.5 px-2 font-bold text-slate-600 dark:text-slate-400">Birim</th>
                    <th className="py-2.5 px-2 font-bold text-slate-600 dark:text-slate-400 text-right">Toplam</th>
                    <th className="py-2.5 px-2 font-bold text-slate-600 dark:text-slate-400 text-right">Günlük Ort.</th>
                    <th className="py-2.5 px-2 font-bold text-slate-600 dark:text-slate-400 text-right">Aktif Gün</th>
                    <th className="py-2.5 px-2 font-bold text-slate-600 dark:text-slate-400 text-right">Kullanıcı</th>
                    <th className="py-2.5 px-2 font-bold text-slate-600 dark:text-slate-400 text-right">Kişi Başı</th>
                    <th className="py-2.5 px-2 font-bold text-slate-600 dark:text-slate-400">Öne Çıkan</th>
                    {usePct && <th className="py-2.5 px-2 font-bold text-slate-600 dark:text-slate-400 text-right">Baz Farkı</th>}
                    {canFin && <th className="py-2.5 px-2 font-bold text-slate-600 dark:text-slate-400 text-right">Kesinleşen</th>}
                    {canFin && <th className="py-2.5 px-2 font-bold text-slate-600 dark:text-slate-400 text-right">Bekleyen</th>}
                  </tr>
                </thead>
                <tbody>
                  {birimCompare.map((b, i) => {
                    const topCat = Object.entries(b.byCat).sort((x, y) => Number(y[1]) - Number(x[1]))[0];
                    const mb = metricBarData.find((m) => m.name === b.birim);
                    const hi = 'text-emerald-600 dark:text-emerald-400 font-black';
                    return (
                      <tr key={b.birim} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-2.5 px-2 font-bold text-slate-800 dark:text-slate-200">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                            {b.birim}
                          </span>
                        </td>
                        <td className={`py-2.5 px-2 text-right ${b.total === compareBest.total ? hi : 'text-slate-700 dark:text-slate-300'}`}>{b.total}</td>
                        <td className={`py-2.5 px-2 text-right ${b.gunlukOrt === compareBest.gunlukOrt ? hi : 'text-slate-700 dark:text-slate-300'}`}>{b.gunlukOrt.toFixed(1)}</td>
                        <td className={`py-2.5 px-2 text-right ${b.aktifGun === compareBest.aktifGun ? hi : 'text-slate-700 dark:text-slate-300'}`}>{b.aktifGun}</td>
                        <td className={`py-2.5 px-2 text-right ${b.userCount === compareBest.userCount ? hi : 'text-slate-700 dark:text-slate-300'}`}>{b.userCount}</td>
                        <td className={`py-2.5 px-2 text-right ${b.kisiBasi === compareBest.kisiBasi ? hi : 'text-slate-700 dark:text-slate-300'}`}>{b.kisiBasi.toFixed(1)}</td>
                        <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400">{topCat ? `${topCat[0]} (${topCat[1]})` : '—'}</td>
                        {usePct && (
                          <td className={`py-2.5 px-2 text-right font-bold ${mb?.isBase ? 'text-slate-400' : (mb && mb.pct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}`}>
                            {mb?.isBase ? 'baz' : `${mb && mb.pct > 0 ? '+' : ''}${mb?.pct ?? 0}%`}
                          </td>
                        )}
                        {canFin && <td className="py-2.5 px-2 text-right text-slate-700 dark:text-slate-300">{b.kesinlesen}</td>}
                        {canFin && <td className={`py-2.5 px-2 text-right ${b.bekleyen > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-400'}`}>{b.bekleyen}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
            İşlem Trendi
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickMargin={10} />
                <YAxis stroke="#94a3b8" fontSize={10} tickMargin={10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#fff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8, fill: '#059669' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <div className="w-2 h-6 bg-emerald-700 rounded-full"></div>
              Kategori Dağılımı
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
                <button
                  type="button"
                  onClick={() => setKategoriGrafikTipi('pie')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${kategoriGrafikTipi === 'pie' ? 'bg-white dark:bg-slate-600 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  <PieIcon size={14} />
                  Pasta
                </button>
                <button
                  type="button"
                  onClick={() => setKategoriGrafikTipi('bar')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${kategoriGrafikTipi === 'bar' ? 'bg-white dark:bg-slate-600 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  <BarChart3 size={14} />
                  Çubuk
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aylar</label>
                <select
                  value={selectedAy}
                  onChange={(e) => setSelectedAy(e.target.value)}
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  {AYLAR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="h-[350px]">
            {pieData.length === 0 ? (
              <p className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                Seçilen ay için kategori verisi yok.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {kategoriGrafikTipi === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={pieData.length > 1 ? 4 : 0}
                      dataKey="value"
                      cornerRadius={6}
                      label={({ name, value, percent }) =>
                        (percent ?? 0) >= 0.06 && value != null
                          ? `${name} · ${Number(value).toLocaleString('tr-TR')}`
                          : ''
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${entry.name}-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={chartTooltipStyle(chartTheme)}
                      labelStyle={{ color: chartTheme.tooltipText }}
                      itemStyle={{ color: chartTheme.tooltipText }}
                      formatter={(v: number) => [v.toLocaleString('tr-TR'), 'Adet']}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: chartTheme.axis }} />
                  </PieChart>
                ) : (
                  <BarChart data={pieData} margin={{ top: 20, right: 16, left: 8, bottom: 56 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-28}
                      textAnchor="end"
                      height={56}
                      tick={{ fill: chartTheme.axis, fontSize: 10 }}
                      tickMargin={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: chartTheme.axis, fontSize: 10 }}
                      stroke={chartTheme.axis}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle(chartTheme)}
                      labelStyle={{ color: chartTheme.tooltipText }}
                      itemStyle={{ color: chartTheme.tooltipText }}
                      formatter={(v: number) => [v.toLocaleString('tr-TR'), 'Adet']}
                    />
                    <Bar dataKey="value" name="Adet" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {pieData.map((entry, index) => (
                        <Cell key={`bar-${entry.name}-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="top"
                        formatter={(v: number) => (v != null ? Number(v).toLocaleString('tr-TR') : '')}
                        style={{ fill: chartTheme.axis, fontSize: 11, fontWeight: 700 }}
                      />
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Kullanıcı Bazında Toplam İşlem — yalnızca birim görünümünde anlamlı */}
      {effectiveScope === 'birim' && (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
        <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
          <Users size={18} className="text-emerald-600" />
          Kullanıcı Bazında Toplam İşlem
        </h3>
        {!named && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Kendi toplamınız adınızla; diğer kullanıcılar anonim toplam olarak gösterilir.</p>
        )}
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={userBarData} layout="vertical" margin={{ left: 40, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" stroke="#94a3b8" fontSize={10} tickMargin={10} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={180} stroke="#94a3b8" fontSize={10} tickMargin={10} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#fff' }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Toplam işlem">
                {userBarData.map((entry, index) => (
                  <Cell key={`u-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}
    </div>
  );
};

export default Dashboard;
