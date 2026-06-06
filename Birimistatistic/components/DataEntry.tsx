import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { db } from '../db';
import { lockDocId } from '../firestore-db';
import { TAVIM_BASLANGIC_TARIH } from '../constants';
import { IslemTuru, Birim } from '../types';
import { kategoriKaynak } from '../services/kategoriler-service';
import { useBreadcrumb } from '../contexts/BreadcrumbContext';
import { useBirimler } from '../contexts/BirimlerContext';
import { useKategoriler } from '../contexts/KategorilerContext';
import {
  useUser,
  getAllowedBirimler,
  canEnterData,
  canFinalize,
  canUnlock,
  canAdmin,
  canRequestUnlock,
  canProxyDataEntry,
  canEnterDataOnDate,
  isKayitTarihiEditorIcinKapali
} from '../contexts/UserContext';
import { listUserProfiles, type UserProfile } from '../services/users-service';
import { displayUserName } from '../lib/user-display';
import { writeAuditLog } from '../services/audit-service';
import {
  getKilitAcmaTalep,
  createKilitAcmaTalep,
  pyOnaylaKilitTalep,
  pyReddetKilitTalep,
  adminReddetKilitTalep,
  tamamlaKilitAcmaTalep,
  iptalKilitAcmaTalep,
  isOpenTalep,
  KILIT_TALEP_DURUM_LABELS,
  type KilitAcmaTalep
} from '../services/kilit-acma-talep-service';
import {
  getGunOnay,
  setKurumOnay,
  hasKurumOnay,
  type GunOnay
} from '../services/gun-onay-service';
import { getAkisConfig } from '../services/akis-config-service';
import { isAyKapali, monthKeyFromDate } from '../services/ay-kapanis-service';
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Database,
  ListChecks,
  Lock,
  LockKeyhole,
  LockOpen,
  Unlock,
  X,
  LayoutGrid,
  FileSpreadsheet,
  ShieldCheck
} from 'lucide-react';
import { KategoriGirisBaslik, KategoriGirisSatiri } from './KategoriGirisSatiri';
import Son7GunSecici from './Son7GunSecici';
import KayitTarihiSecici from './KayitTarihiSecici';
import BirimSecici, { resolveInitialBirim } from './BirimSecici';
import { trackRecentBirim } from '../lib/birim-prefs';
import {
  loadEntryPrefs,
  saveEntryPrefs,
  todayIso,
  type EntryViewMode
} from '../lib/user-prefs';
import { clampKayitTarihi, minKayitTarihi } from '../lib/entry-date-utils';
import { normalizeKategoriAdi, isKaldirilanKategori } from '../lib/kategori-aliases';
import {
  VERI_BASLANGIC_TARIH,
  ADMIN_PROXY_BITIS_TARIH,
  EDITOR_GIRIS_BASLANGIC_TARIH,
  defaultKayitTarihi,
  isAdminGeriDonukAralik,
  isHaftaSonuGirisKapali
} from '../lib/date-policy';
import { useIsMobile } from '../hooks/use-mobile';
import {
  listPersonelIzins,
  isUserOnLeaveOnDate,
  IZIN_TUR_LABELS,
  type PersonelIzin
} from '../services/personel-izin-service';

const KESINLESEN_GUNLER_COLLECTION = 'kesinlesen_gunler';

interface DataEntryProps {
  onComplete: () => void;
}

const DataEntry: React.FC<DataEntryProps> = ({ onComplete }) => {
  const { setSuffix } = useBreadcrumb();
  const user = useUser();
  const { birimler, loading: birimlerLoading } = useBirimler();
  const { getPartsForBirim, loading: katLoading } = useKategoriler();
  const allowedBirimler = getAllowedBirimler(user, birimler);
  const bugunIso = todayIso();
  const isAdminUser = canAdmin(user);
  const tarihMin = minKayitTarihi(isAdminUser);
  const isMobile = useIsMobile();
  const [birim, setBirim] = useState<Birim>(() =>
    user?.id
      ? (resolveInitialBirim(user.id, allowedBirimler, allowedBirimler[0] || '') as Birim)
      : ((allowedBirimler[0] as Birim) ?? '')
  );
  const [viewMode, setViewMode] = useState<EntryViewMode>('form');
  const [prefsReady, setPrefsReady] = useState(false);
  const [kayit_tarihi, setKayitTarihi] = useState(() => clampKayitTarihi(defaultKayitTarihi(), isAdminUser));
  const katParts = getPartsForBirim(birim);
  const formKategoriler = katParts.birlesik;

  useEffect(() => {
    if (!user?.id || allowedBirimler.length === 0) return;
    const prefs = loadEntryPrefs(user.id);
    const resolved = resolveInitialBirim(user.id, allowedBirimler, prefs?.birim || allowedBirimler[0] || '');
    setBirim(resolved as Birim);
    if (prefs?.kayit_tarihi) {
      setKayitTarihi(clampKayitTarihi(prefs.kayit_tarihi, isAdminUser));
    }
    if (prefs?.viewMode) {
      setViewMode(prefs.viewMode);
    } else if (typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches) {
      setViewMode('bugun_tablo');
    }
    setPrefsReady(true);
  }, [user?.id, allowedBirimler.join('|')]);

  useEffect(() => {
    if (allowedBirimler.length && !allowedBirimler.includes(birim)) setBirim(allowedBirimler[0] as Birim);
  }, [allowedBirimler, birim]);

  useEffect(() => {
    if (!user?.id || !prefsReady || !birim) return;
    saveEntryPrefs(user.id, { birim, kayit_tarihi, viewMode });
  }, [user?.id, birim, kayit_tarihi, viewMode, prefsReady]);

  useEffect(() => {
    setSuffix(null);
  }, [setSuffix]);

  // Tarayıcı veya elle giriş 2026-01-01 öncesi bırakmasın diye state’i sürekli düzelt
  useEffect(() => {
    const clamped = clampKayitTarihi(kayit_tarihi, isAdminUser);
    if (clamped !== kayit_tarihi) setKayitTarihi(clamped);
  }, [kayit_tarihi, isAdminUser]);
  const [kategoriDegerleri, setKategoriDegerleri] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [loadingForm, setLoadingForm] = useState(true);
  const [isFinalized, setIsFinalized] = useState(false);
  const [gunOnay, setGunOnay] = useState<GunOnay | null>(null);
  const [ayKapali, setAyKapali] = useState(false);
  const [kurumOnayZorunlu, setKurumOnayZorunlu] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [ekleMiktar, setEkleMiktar] = useState<Record<string, string>>({});
  const [ekleBusy, setEkleBusy] = useState<string | null>(null);
  const [flashKat, setFlashKat] = useState<string | null>(null);
  const [gunIzin, setGunIzin] = useState<PersonelIzin | null>(null);
  const [kilitTalep, setKilitTalep] = useState<KilitAcmaTalep | null>(null);
  const [talepGerekce, setTalepGerekce] = useState('');
  const [talepModalOpen, setTalepModalOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [entryForUid, setEntryForUid] = useState<string>(() => user?.id || '');

  const kullanilacakTarih = kayit_tarihi < TAVIM_BASLANGIC_TARIH ? TAVIM_BASLANGIC_TARIH : kayit_tarihi;
  const haftasonu = isHaftaSonuGirisKapali(kullanilacakTarih);
  const editorKapali = isKayitTarihiEditorIcinKapali(kullanilacakTarih, user);
  const canEditForm =
    canEnterDataOnDate(user, kullanilacakTarih) &&
    !isFinalized &&
    !haftasonu &&
    !(ayKapali && !isAdminUser) &&
    !loadingForm;
  const ayKapaliMesaj = ayKapali ? `${monthKeyFromDate(kullanilacakTarih)} ayı kapanmış; yalnızca admin düzenleme açabilir.` : null;

  if (!canEnterData(user)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
        <LockKeyhole className="text-slate-400 dark:text-slate-500 mb-4" size={48} />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Giriş İşlemleri</h2>
        <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
          Bu bölüm için veri girişi yetkiniz yok (sadece görüntüleme rolü). Yönetim bölümünden rol atanabilir.
        </p>
      </div>
    );
  }

  useEffect(() => {
    getAkisConfig().then((c) => setKurumOnayZorunlu(c.kurum_onay_zorunlu));
  }, []);

  useEffect(() => {
    if (!canAdmin(user)) return;
    listUserProfiles().then(({ data }) => setAllProfiles(data || []));
  }, [user?.id, user?.role]);

  const proxyEntryActive = canProxyDataEntry(user, kullanilacakTarih);
  const entryTargets = useMemo(() => {
    if (!proxyEntryActive) return [];
    return allProfiles
      .filter(
        (p) =>
          (p.role === 'editor' || p.role === 'proje_yetkilisi') &&
          (p.birimler || []).includes(birim)
      )
      .sort((a, b) => displayUserName(a).localeCompare(displayUserName(b), 'tr'));
  }, [proxyEntryActive, allProfiles, birim]);

  useEffect(() => {
    if (!proxyEntryActive) {
      if (user?.id) setEntryForUid(user.id);
      return;
    }
    if (entryTargets.length && !entryTargets.some((p) => p.uid === entryForUid)) {
      setEntryForUid(entryTargets[0].uid);
    }
  }, [proxyEntryActive, entryTargets, entryForUid, user?.id]);

  const activeEntryUid = proxyEntryActive && entryForUid ? entryForUid : user?.id || '';

  const loadFormData = useCallback(async () => {
    setLoadingForm(true);
    setIsFinalized(false);
    setGunOnay(null);
    setGunIzin(null);
    setKilitTalep(null);
    const col = db.collection('islem_kayitlari') as any;
    const kesinCol = db.collection(KESINLESEN_GUNLER_COLLECTION) as any;
    const [kapali, onay, izinRes, talep] = await Promise.all([
      isAyKapali(monthKeyFromDate(kullanilacakTarih)),
      getGunOnay(kullanilacakTarih, birim),
      listPersonelIzins(),
      getKilitAcmaTalep(kullanilacakTarih, birim)
    ]);
    setKilitTalep(talep);
    setAyKapali(kapali);
    setGunOnay(onay);
    const targetUid = canProxyDataEntry(user, kullanilacakTarih) && entryForUid ? entryForUid : user?.id;
    if (targetUid && izinRes.data) {
      setGunIzin(isUserOnLeaveOnDate(targetUid, kullanilacakTarih, izinRes.data));
    }
    const { data: records } = await col.find({ kayit_tarihi: kullanilacakTarih, birim });
    const myId = targetUid;
    // Seçili kullanıcının satırları (admin geri dönük girişte başka kişi adına)
    const parts = getPartsForBirim(birim);
    const aggregated: Record<string, number> = parts.birlesik.reduce(
      (acc, t) => ({ ...acc, [t]: 0 }),
      {} as Record<string, number>
    );
    if (records && records.length > 0) {
      records
        .filter((r: any) => !myId || r.user_id === myId)
        .filter((r: { islem_turu?: string }) => !isKaldirilanKategori(r.islem_turu || ''))
        .forEach((r: { islem_turu?: string; islem_sayisi?: number }) => {
          const t = normalizeKategoriAdi(r.islem_turu || '');
          if (!t) return;
          aggregated[t] = (aggregated[t] || 0) + (r.islem_sayisi || 0);
        });
    }
    setKategoriDegerleri(aggregated);

    if (typeof kesinCol.existsById === 'function') {
      const locked = await kesinCol.existsById(lockDocId(kullanilacakTarih, birim));
      setIsFinalized(!!locked);
    }
    setLoadingForm(false);
  }, [kullanilacakTarih, birim, user?.id, user?.role, entryForUid, getPartsForBirim]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  useEffect(() => {
    const unsub = db.subscribe(() => loadFormData());
    return unsub;
  }, [loadFormData]);

  const updateKategori = (islem_turu: IslemTuru, value: number) => {
    if (isFinalized || haftasonu || (ayKapali && !canAdmin(user))) return;
    setKategoriDegerleri((prev) => ({ ...prev, [islem_turu]: Math.max(0, value) }));
  };

  const setBirimAndSave = (b: Birim) => {
    setBirim(b);
    if (user?.id) trackRecentBirim(user.id, b);
  };

  const setTarihAndSave = (iso: string) => {
    setKayitTarihi(clampKayitTarihi(iso, isAdminUser));
  };

  const openBugunkuTablo = () => {
    setViewMode('bugun_tablo');
    setKayitTarihi(clampKayitTarihi(bugunIso, isAdminUser));
  };

  const entryAreaRef = useRef<HTMLDivElement>(null);

  const scrollToEntryArea = useCallback(() => {
    requestAnimationFrame(() => {
      entryAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  useEffect(() => {
    if (!prefsReady || loadingForm) return;
    scrollToEntryArea();
  }, [viewMode, prefsReady, loadingForm, scrollToEntryArea]);

  /** Bu kullanıcının o gün/birim kategori toplamlarını Firestore'a yazar */
  const persistTotals = async (
    degerler: Record<string, number>
  ): Promise<{ ok: boolean; message: string; deletedCount: number }> => {
    const { data: { user: authUser } } = await db.auth.getUser();
    if (!authUser) {
      return { ok: false, message: 'Oturum bulunamadı', deletedCount: 0 };
    }
    if (isHaftaSonuGirisKapali(kullanilacakTarih)) {
      return { ok: false, message: 'Haftasonu günlerinde veri girişi yapılamaz.', deletedCount: 0 };
    }
    const targetUid =
      canProxyDataEntry(user, kullanilacakTarih) && entryForUid ? entryForUid : authUser.id;
    const parts = getPartsForBirim(birim);
    const now = new Date().toISOString();
    const kayitlar = (Object.entries(degerler) as [IslemTuru, number][])
      .filter(([, sayi]) => sayi > 0)
      .map(([islem_turu, islem_sayisi]) => ({
        birim,
        islem_turu,
        islem_sayisi,
        kayit_tarihi: kullanilacakTarih,
        user_id: targetUid,
        kategori_kaynak: kategoriKaynak(islem_turu, parts.ortak, parts.birimOzel),
        updated_at: now
      }));

    const bugun = new Date().toISOString().split('T')[0];
    if (kullanilacakTarih > bugun) {
      return { ok: false, message: 'İleri tarihe kayıt yapılamaz.', deletedCount: 0 };
    }

    const col = db.collection('islem_kayitlari');
    const { deletedCount, error: deleteErr } = await col.deleteMany({
      kayit_tarihi: kullanilacakTarih,
      birim,
      user_id: targetUid
    });
    if (deleteErr) {
      return { ok: false, message: `Kayıt silinirken hata: ${deleteErr}`, deletedCount: 0 };
    }

    if (kayitlar.length === 0) {
      return { ok: true, message: 'Kayıtlar temizlendi (tüm kategoriler 0).', deletedCount };
    }

    let hataSayisi = 0;
    for (const doc of kayitlar) {
      const { error } = await col.insertOne(doc);
      if (error) hataSayisi++;
    }
    if (hataSayisi > 0) {
      return { ok: false, message: `${hataSayisi} satır yazılamadı`, deletedCount };
    }
    if (targetUid !== authUser.id) {
      const hedef = entryTargets.find((p) => p.uid === targetUid);
      await writeAuditLog({
        action: 'veri_giris_adina',
        actorUid: authUser.id,
        actorEmail: authUser.email,
        birim,
        kayit_tarihi: kullanilacakTarih,
        details: {
          hedef_uid: targetUid,
          hedef_email: hedef?.email || '',
          toplam_kategori: kayitlar.length
        }
      });
    }
    return {
      ok: true,
      message:
        targetUid !== authUser.id
          ? `${displayUserName(entryTargets.find((p) => p.uid === targetUid) || { ad: '', soyad: '', email: targetUid })} adına kaydedildi`
          : deletedCount > 0
            ? 'Güncellendi'
            : 'Kaydedildi',
      deletedCount
    };
  };

  /** Ekle: önce ekranda toplam artar, ardından sizin kaydınız kaydedilir */
  const ekleKategori = async (turu: IslemTuru, delta: number) => {
    if (!canEditForm || delta <= 0) return;
    const onceki = kategoriDegerleri[turu] || 0;
    const yeniToplam = onceki + delta;
    const sonraki = { ...kategoriDegerleri, [turu]: yeniToplam };
    setKategoriDegerleri(sonraki);
    setEkleBusy(turu);
    setStatus(null);

    const { ok, message } = await persistTotals(sonraki);
    setEkleBusy(null);

    if (ok) {
      setFlashKat(turu);
      setTimeout(() => setFlashKat(null), 1200);
      setEkleMiktar((prev) => ({ ...prev, [turu]: '' }));
      setStatus({
        type: 'success',
        message: `${turu}: +${delta} eklendi → bugünkü toplamınız ${yeniToplam}`
      });
      await loadFormData();
    } else {
      setKategoriDegerleri((prev) => ({ ...prev, [turu]: onceki }));
      setStatus({ type: 'error', message });
    }
  };

  const parseEkleMiktar = (turu: string): number => {
    const n = parseInt(ekleMiktar[turu] || '0', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ayKapali && !canAdmin(user)) {
      setStatus({ type: 'error', message: ayKapaliMesaj || 'Ay kapalı.' });
      return;
    }
    if (!canEnterDataOnDate(user, kullanilacakTarih)) {
      setStatus({
        type: 'error',
        message: `${VERI_BASLANGIC_TARIH} – ${ADMIN_PROXY_BITIS_TARIH} arası yalnızca admin personel adına giriş yapabilir. Normal giriş ${EDITOR_GIRIS_BASLANGIC_TARIH} tarihinden itibaren.`
      });
      return;
    }
    if (haftasonu) {
      setStatus({ type: 'error', message: 'Haftasonu günlerinde veri girişi yapılamaz.' });
      return;
    }
    if (isFinalized) {
      setStatus({ type: 'error', message: 'Bu gün/birim verileri kesinleşmiş; güncelleme yapılamaz.' });
      return;
    }
    const toplam = Object.values(kategoriDegerleri).reduce((a, b) => a + b, 0);
    if (toplam === 0) {
      setStatus({ type: 'error', message: 'En az bir kategoriye adet girin veya Ekle kullanın.' });
      return;
    }
    setLoading(true);
    setStatus(null);
    const { ok, message, deletedCount } = await persistTotals(kategoriDegerleri);
    setLoading(false);
    if (ok) {
      setStatus({
        type: 'success',
        message:
          deletedCount > 0
            ? `Kayıtlarınız güncellendi. Toplam ${toplam} işlem (sadece sizin veriniz).`
            : `Kayıtlarınız kaydedildi. Toplam ${toplam} işlem.`
      });
      await loadFormData();
    } else {
      setStatus({ type: 'error', message });
    }
  };

  const handleKurumOnay = async () => {
    if (!canAdmin(user)) return;
    setLoading(true);
    const { data: { user: authUser } } = await db.auth.getUser();
    const { error } = await setKurumOnay(kullanilacakTarih, birim, authUser?.id || '', authUser?.email);
    if (error) setStatus({ type: 'error', message: error });
    else {
      await writeAuditLog({
        action: 'kurum_onay',
        actorUid: authUser?.id || '',
        actorEmail: authUser?.email,
        birim,
        kayit_tarihi: kullanilacakTarih
      });
      setGunOnay(await getGunOnay(kullanilacakTarih, birim));
      setStatus({ type: 'success', message: 'Kurum onayı kaydedildi.' });
    }
    setLoading(false);
  };

  const handleKesinlestir = async () => {
    if (isFinalized) return;
    if (!canFinalize(user)) {
      setStatus({ type: 'error', message: 'Kesinleştirme yetkiniz yok. (Sadece proje yetkilisi ve admin)' });
      return;
    }
    if (kurumOnayZorunlu && !hasKurumOnay(gunOnay)) {
      setStatus({ type: 'error', message: 'Kurum onayı zorunlu; admin kurum onayı vermeli.' });
      return;
    }
    if (!window.confirm(`${kullanilacakTarih} / ${birim} için bu gün kesinleştirilecek. Bu birimde o güne ait TÜM kullanıcıların verileri kilitlenir ve artık değiştirilemez. Onaylıyor musunuz?`)) {
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const kesinCol = db.collection(KESINLESEN_GUNLER_COLLECTION) as any;
      const { data: { user: authUser } } = await db.auth.getUser();
      const { error } = await kesinCol.setById(lockDocId(kullanilacakTarih, birim), {
        kayit_tarihi: kullanilacakTarih,
        birim,
        finalized_by: authUser?.id || null,
        finalized_at: new Date().toISOString(),
        auto: false
      });
      if (error) {
        setStatus({ type: 'error', message: `Kesinleştirme hatası: ${error}` });
      } else {
        await writeAuditLog({
          action: 'lock_finalize',
          actorUid: authUser?.id || '',
          actorEmail: authUser?.email,
          birim,
          kayit_tarihi: kullanilacakTarih,
          details: { manual: true }
        });
        setIsFinalized(true);
        setStatus({ type: 'success', message: 'Bu gün/birim verileri kesinleştirildi; artık güncelleme yapılamaz.' });
      }
    } catch (e: any) {
      setStatus({ type: 'error', message: e?.message || 'Kesinleştirme hatası' });
    }
    setLoading(false);
  };

  const kesimOncesiDirect = isAdminGeriDonukAralik(kullanilacakTarih);
  const talepliAcma = kilitTalep?.durum === 'bekliyor_admin';

  const handleUnlock = async () => {
    if (!canUnlock(user) || !isFinalized) return;
    if (!kesimOncesiDirect && !talepliAcma) {
      setStatus({
        type: 'error',
        message: 'Kilit yalnızca proje yetkilisi onaylı talepten açılabilir (Yönetim → Kilit talepleri).'
      });
      return;
    }
    if (
      !window.confirm(
        kesimOncesiDirect
          ? `${kullanilacakTarih} / ${birim} kilidi açılacak (sistem başlangıcı öncesi — geri dönük giriş). Denetim günlüğüne yazılır. Devam?`
          : `${kullanilacakTarih} / ${birim} kilidi açılacak (onaylı talep). Denetim günlüğüne yazılır. Devam?`
      )
    ) {
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const kesinCol = db.collection(KESINLESEN_GUNLER_COLLECTION) as any;
      const { data: { user: authUser } } = await db.auth.getUser();
      const { success, error } = await kesinCol.deleteById(lockDocId(kullanilacakTarih, birim));
      if (!success || error) {
        setStatus({ type: 'error', message: `Kilit açma hatası: ${error || 'İşlem başarısız'}` });
      } else {
        let tamErr: string | null = null;
        if (talepliAcma) {
          const res = await tamamlaKilitAcmaTalep(
            kullanilacakTarih,
            birim,
            authUser?.id || '',
            authUser?.email
          );
          tamErr = res.error;
        }
        await writeAuditLog({
          action: 'lock_open',
          actorUid: authUser?.id || '',
          actorEmail: authUser?.email,
          birim,
          kayit_tarihi: kullanilacakTarih,
          details: kesimOncesiDirect
            ? { kesim_oncesi_geri_giris: true, proxy_aralik: `${VERI_BASLANGIC_TARIH}–${ADMIN_PROXY_BITIS_TARIH}` }
            : { talep_eden_uid: kilitTalep?.talep_eden_uid }
        });
        setIsFinalized(false);
        if (talepliAcma && kilitTalep) {
          setKilitTalep(tamErr ? kilitTalep : { ...kilitTalep, durum: 'tamamlandi' });
        }
        setStatus({
          type: tamErr ? 'error' : 'success',
          message: tamErr
            ? `Kilit açıldı; talep kaydı güncellenemedi: ${tamErr}`
            : 'Kilit açıldı; veriler tekrar düzenlenebilir.'
        });
        if (!tamErr) await loadFormData();
      }
    } catch (e: any) {
      setStatus({ type: 'error', message: e?.message || 'Kilit açma hatası' });
    }
    setLoading(false);
  };

  const handleTalepOlustur = async () => {
    if (!canRequestUnlock(user) || !isFinalized) return;
    setLoading(true);
    setStatus(null);
    const { data: { user: authUser } } = await db.auth.getUser();
    const { error } = await createKilitAcmaTalep(
      kullanilacakTarih,
      birim,
      talepGerekce,
      authUser?.id || '',
      authUser?.email
    );
    if (error) {
      setStatus({ type: 'error', message: error });
    } else {
      setTalepGerekce('');
      setTalepModalOpen(false);
      setKilitTalep(await getKilitAcmaTalep(kullanilacakTarih, birim));
      setStatus({ type: 'success', message: 'Kilit açma talebi oluşturuldu; proje yetkilisi onayı bekleniyor.' });
    }
    setLoading(false);
  };

  const handleTalepIptal = async () => {
    if (!kilitTalep || kilitTalep.durum !== 'bekliyor_py') return;
    setLoading(true);
    const { data: { user: authUser } } = await db.auth.getUser();
    const { error } = await iptalKilitAcmaTalep(kullanilacakTarih, birim, authUser?.id || '', authUser?.email);
    setKilitTalep(await getKilitAcmaTalep(kullanilacakTarih, birim));
    setStatus(error ? { type: 'error', message: error } : { type: 'success', message: 'Talep iptal edildi.' });
    setLoading(false);
  };

  const handlePyOnayTalep = async () => {
    if (!canFinalize(user) || kilitTalep?.durum !== 'bekliyor_py') return;
    if (!window.confirm('Kilit açma talebini onaylayıp admin onayına ileteceksiniz. Devam?')) return;
    setLoading(true);
    const { data: { user: authUser } } = await db.auth.getUser();
    const { error } = await pyOnaylaKilitTalep(kullanilacakTarih, birim, authUser?.id || '', authUser?.email);
    setKilitTalep(await getKilitAcmaTalep(kullanilacakTarih, birim));
    setStatus(error ? { type: 'error', message: error } : { type: 'success', message: 'Talep admin onayına iletildi.' });
    setLoading(false);
  };

  const handlePyRedTalep = async () => {
    if (!canFinalize(user) || kilitTalep?.durum !== 'bekliyor_py') return;
    const nedeni = window.prompt('Red gerekçesi (en az 5 karakter):');
    if (!nedeni) return;
    setLoading(true);
    const { data: { user: authUser } } = await db.auth.getUser();
    const { error } = await pyReddetKilitTalep(kullanilacakTarih, birim, nedeni, authUser?.id || '', authUser?.email);
    setKilitTalep(await getKilitAcmaTalep(kullanilacakTarih, birim));
    setStatus(error ? { type: 'error', message: error } : { type: 'success', message: 'Talep reddedildi.' });
    setLoading(false);
  };

  const handleAdminRedTalep = async () => {
    if (!canUnlock(user) || kilitTalep?.durum !== 'bekliyor_admin') return;
    const nedeni = window.prompt('Red gerekçesi (en az 5 karakter):');
    if (!nedeni) return;
    setLoading(true);
    const { data: { user: authUser } } = await db.auth.getUser();
    const { error } = await adminReddetKilitTalep(
      kullanilacakTarih,
      birim,
      nedeni,
      authUser?.id || '',
      authUser?.email
    );
    setKilitTalep(await getKilitAcmaTalep(kullanilacakTarih, birim));
    setStatus(error ? { type: 'error', message: error } : { type: 'success', message: 'Talep reddedildi.' });
    setLoading(false);
  };

  const pyCanActOnTalep =
    canFinalize(user) &&
    kilitTalep?.durum === 'bekliyor_py' &&
    (user?.role === 'admin' || allowedBirimler.includes(birim));

  const toplamGirilen = Object.values(kategoriDegerleri).reduce((a, b) => a + b, 0);

  if (!birimlerLoading && allowedBirimler.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
        <LockKeyhole className="text-slate-400 dark:text-slate-500 mb-4" size={48} />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Birim atanmamış</h2>
        <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
          Size henüz bir birim atanmadığı için veri girişi yapamazsınız. Lütfen yöneticinizden (admin) hesabınıza birim atamasını isteyin.
        </p>
      </div>
    );
  }

  const kategoriGrid = (
    <>
      {(katLoading || birimlerLoading) && (
        <div className="col-span-full py-8 text-center text-slate-400 text-sm">Kategoriler yükleniyor…</div>
      )}
      {!katLoading && formKategoriler.length === 0 && (
        <div className="col-span-full py-6 text-center text-amber-600 text-sm">
          Bu birim için tanımlı kategori yok. Yönetimden ortak veya birim kategorisi ekleyin.
        </div>
      )}
      {viewMode === 'form' && formKategoriler.length > 0 && <KategoriGirisBaslik />}
      {formKategoriler.map((turu) => (
        <KategoriGirisSatiri
          key={turu}
          turu={turu}
          birimOzel={katParts.birimOzel.includes(turu)}
          toplam={kategoriDegerleri[turu] || 0}
          canEdit={canEditForm}
          busy={ekleBusy === turu}
          loading={loading}
          flashed={flashKat === turu}
          ekleMiktar={ekleMiktar[turu] ?? ''}
          onEkleMiktarChange={(v) => setEkleMiktar((p) => ({ ...p, [turu]: v }))}
          onToplamChange={(n) => updateKategori(turu, n)}
          onEkle={(d) => ekleKategori(turu, d)}
          variant={viewMode === 'bugun_tablo' ? 'kart' : 'liste'}
        />
      ))}
    </>
  );

  const compactAlerts = (
    <>
      {loadingForm && (
        <div className="py-1.5 px-2 rounded-lg flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-bold">Kayıtlar yükleniyor…</span>
        </div>
      )}
      {ayKapali && (
        <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-900/30">
          {ayKapaliMesaj}
        </p>
      )}
      {gunIzin && (
        <p className="text-[10px] font-bold text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
          İzinli: {IZIN_TUR_LABELS[gunIzin.tur]}
        </p>
      )}
      {haftasonu && !isFinalized && (
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-2 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-600">
          Haftasonu — tatil günü; veri girişi kapalı.
        </p>
      )}
      {editorKapali && (
        <p className="text-[10px] font-bold text-amber-900 dark:text-amber-200 px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200/80 dark:border-amber-700">
          {kullanilacakTarih < VERI_BASLANGIC_TARIH
            ? `${VERI_BASLANGIC_TARIH} öncesi tarihler kilitlidir.`
            : `${VERI_BASLANGIC_TARIH} – ${ADMIN_PROXY_BITIS_TARIH}: geçici olarak yalnızca admin personel adına giriş yapabilir. Normal giriş ${EDITOR_GIRIS_BASLANGIC_TARIH} tarihinden itibaren.`}
        </p>
      )}
      {!editorKapali && !isAdminUser && bugunIso < EDITOR_GIRIS_BASLANGIC_TARIH && (
        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50">
          Kendi adınıza veri girişi {EDITOR_GIRIS_BASLANGIC_TARIH} tarihinden itibaren açılır.
        </p>
      )}
      {!isFinalized && kurumOnayZorunlu && (
        <span
          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg ${
            hasKurumOnay(gunOnay) ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {hasKurumOnay(gunOnay) ? '✓ Kurum onayı' : '○ Kurum onayı gerekli'}
        </span>
      )}
      {isFinalized && (
        <div className="flex items-start gap-2 py-1.5 px-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-700">
          <Lock size={14} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-[10px] font-bold leading-snug">
            Kesinleşmiş — güncelleme kapalı.
            {kilitTalep && (
              <span className="block font-semibold mt-0.5">
                {KILIT_TALEP_DURUM_LABELS[kilitTalep.durum]}
              </span>
            )}
            {canRequestUnlock(user) && kilitTalep?.durum === 'bekliyor_py' && kilitTalep.talep_eden_uid === user?.id && (
              <button
                type="button"
                onClick={handleTalepIptal}
                disabled={loading || loadingForm}
                className="mt-0.5 text-violet-700 dark:text-violet-300 underline disabled:opacity-50"
              >
                Talebi iptal
              </button>
            )}
          </div>
          {canRequestUnlock(user) && !isOpenTalep(kilitTalep) && (
            <button
              type="button"
              onClick={() => {
                setTalepGerekce('');
                setTalepModalOpen(true);
              }}
              disabled={loading || loadingForm}
              title="Kilit kaldırma talebi"
              className="shrink-0 flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg border border-violet-300/80 bg-violet-100/80 text-violet-800 disabled:opacity-50"
            >
              <Unlock size={14} />
              <span className="text-[7px] font-black leading-tight text-center max-w-[2.75rem]">Kilit talebi</span>
            </button>
          )}
        </div>
      )}
      {isFinalized && pyCanActOnTalep && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePyOnayTalep}
            disabled={loading || loadingForm}
            className="flex-1 min-h-[36px] bg-emerald-600 text-white font-black text-[10px] rounded-lg disabled:opacity-50"
          >
            Talebi onayla
          </button>
          <button
            type="button"
            onClick={handlePyRedTalep}
            disabled={loading || loadingForm}
            className="flex-1 min-h-[36px] bg-slate-200 dark:bg-slate-700 font-black text-[10px] rounded-lg disabled:opacity-50"
          >
            Reddet
          </button>
        </div>
      )}
      {status && (
        <div
          className={`py-1.5 px-2 rounded-lg flex items-center gap-1.5 text-[10px] font-bold ${
            status.type === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {status.message}
        </div>
      )}
    </>
  );

  return (
    <div className="w-full max-w-4xl mx-auto animate-in zoom-in-95 duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 transition-colors">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-3 sm:px-5 py-2.5 sm:py-3 text-white relative shrink-0">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none hidden sm:block">
            <Database size={64} />
          </div>
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                {viewMode === 'bugun_tablo' ? 'Bugünkü tablo' : 'Veri Kayıt Formu'}
              </h2>
              <p className="text-emerald-100/90 text-[10px] sm:text-xs mt-0.5 font-medium leading-snug hidden sm:block">
                {viewMode === 'bugun_tablo'
                  ? 'Tüm kategoriler kart halinde; kayıt sonrası alttaki butonla toplam kaydedebilirsiniz.'
                  : 'Kategoriler liste halinde; +1 / +5 veya adet ile Ekle.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setViewMode('form');
                  scrollToEntryArea();
                }}
                className={`flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all touch-manipulation ${
                  viewMode === 'form' ? 'bg-white text-emerald-800' : 'bg-white/15 text-white active:bg-white/25'
                }`}
              >
                <FileSpreadsheet size={16} />
                Form
              </button>
              <button
                type="button"
                onClick={() => {
                  openBugunkuTablo();
                  scrollToEntryArea();
                }}
                className={`flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all touch-manipulation ${
                  viewMode === 'bugun_tablo' ? 'bg-white text-emerald-800' : 'bg-white/15 text-white active:bg-white/25'
                }`}
              >
                <LayoutGrid size={16} />
                <span className="sm:hidden">Tablo</span>
                <span className="hidden sm:inline">Bugünkü tablo</span>
              </button>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col px-3 sm:px-4 py-2 sm:py-3 gap-2"
        >
          <div className="shrink-0 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
              <div className="space-y-0.5 min-w-0">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Birim</label>
                <BirimSecici
                  userId={user?.id}
                  allowedBirimler={allowedBirimler}
                  value={birim}
                  onChange={(b) => b !== 'Tümü' && setBirimAndSave(b as Birim)}
                  disabled={loadingForm}
                />
              </div>
              {viewMode === 'form' && (
                <div className="space-y-0.5 sm:w-[13.5rem]">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tarih</label>
                  <KayitTarihiSecici
                    value={kullanilacakTarih}
                    onChange={setTarihAndSave}
                    min={tarihMin}
                    max={bugunIso}
                    disabled={loadingForm || bugunIso < tarihMin}
                  />
                </div>
              )}
            </div>
            <Son7GunSecici
              value={kullanilacakTarih}
              onChange={setTarihAndSave}
              disabled={loadingForm}
              compact
              minIso={tarihMin}
            />
            {proxyEntryActive && entryTargets.length > 0 && (
              <div className="space-y-0.5">
                <label className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                  Personel adına giriş (admin — {VERI_BASLANGIC_TARIH} – {ADMIN_PROXY_BITIS_TARIH})
                </label>
                <select
                  value={entryForUid}
                  onChange={(e) => setEntryForUid(e.target.value)}
                  disabled={loadingForm}
                  className="w-full px-2 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 font-bold text-sm text-amber-950 dark:text-amber-100"
                >
                  {entryTargets.map((p) => (
                    <option key={p.uid} value={p.uid}>
                      {displayUserName(p)} ({p.email || p.uid.slice(0, 8)})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-amber-800/90 dark:text-amber-200/80">
                  Fiziksel kayıtlardaki adetleri ilgili personel seçilerek girin; kayıt o kişiye yazılır.
                </p>
              </div>
            )}
            {proxyEntryActive && entryTargets.length === 0 && (
              <p className="text-[10px] font-bold text-amber-800 dark:text-amber-200 px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                Bu birimde veri girişi yapabilecek (editör / proje yetkilisi) kullanıcı yok.
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">{compactAlerts}</div>
          </div>

          <div
            ref={entryAreaRef}
            className="scroll-mt-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden relative"
          >
            {haftasonu && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
                aria-hidden
              >
                <span className="text-4xl sm:text-6xl font-black uppercase tracking-[0.2em] text-slate-300/35 dark:text-slate-500/25 select-none -rotate-6">
                  Haftasonu
                </span>
              </div>
            )}
            <div
              className={`bg-slate-50 dark:bg-slate-700/50 px-3 py-2 border-b border-slate-200 dark:border-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${
                haftasonu ? 'opacity-50' : ''
              }`}
            >
              <ListChecks size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                {kullanilacakTarih === bugunIso ? 'Bugün' : kullanilacakTarih} — kategoriler
              </span>
              {toplamGirilen > 0 && (
                <span className="ml-auto text-emerald-600 font-black text-xs tabular-nums">Σ {toplamGirilen}</span>
              )}
            </div>
            <div
              className={`${
                viewMode === 'bugun_tablo'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-2 sm:p-3'
                  : 'flex flex-col gap-0'
              } ${haftasonu ? 'opacity-40 pointer-events-none' : ''}`}
            >
              {kategoriGrid}
              {Object.keys(kategoriDegerleri)
                .filter((k) => !formKategoriler.includes(k) && (kategoriDegerleri[k] || 0) > 0)
                .map((turu) => (
                  <div
                    key={`legacy-${turu}`}
                    className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 p-4 mb-0 sm:px-4 sm:py-3 sm:rounded-none sm:border-0 sm:border-b bg-amber-50/80 dark:bg-amber-900/15"
                  >
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200 leading-snug">
                      {turu} <span className="text-[9px] font-black uppercase">(pasif)</span>
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700/80 dark:text-amber-400/80 mt-2 mb-1.5">
                      Toplam
                    </p>
                    <input
                      type="number"
                      min="0"
                      value={kategoriDegerleri[turu] || 0}
                      onChange={(e) => updateKategori(turu, parseInt(e.target.value) || 0)}
                      readOnly={isFinalized || haftasonu}
                      disabled={isFinalized || haftasonu || loadingForm}
                      className="w-full h-14 sm:h-11 sm:w-24 px-2 border-2 border-amber-300 dark:border-amber-700 rounded-xl text-center font-black text-2xl sm:text-lg tabular-nums touch-manipulation"
                    />
                  </div>
                ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 dark:border-slate-700 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            type="submit"
            disabled={
              loading ||
              toplamGirilen === 0 ||
              isFinalized ||
              haftasonu ||
              editorKapali ||
              !canEnterDataOnDate(user, kullanilacakTarih) ||
              loadingForm ||
              katLoading ||
              (ayKapali && !isAdminUser)
            }
            className="w-full min-h-[44px] bg-slate-900 dark:bg-slate-700 hover:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-sm"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={22} className="shrink-0" />
                <span className="text-center leading-tight">
                  {haftasonu ? (
                    'Haftasonu — giriş kapalı'
                  ) : isFinalized ? (
                    'Kesinleşmiş'
                  ) : editorKapali ? (
                    'Giriş kapalı'
                  ) : toplamGirilen > 0 ? (
                    <>
                      <span className="sm:hidden">Toplamları kaydet ({toplamGirilen})</span>
                      <span className="hidden sm:inline">Toplamları kaydet ({toplamGirilen} — manuel düzeltme)</span>
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden">Önce Ekle ile kayıt</span>
                      <span className="hidden sm:inline">Ekle ile kayıt veya toplam girin</span>
                    </>
                  )}
                </span>
              </>
            )}
          </button>

          {!isFinalized && canAdmin(user) && kurumOnayZorunlu && !hasKurumOnay(gunOnay) && (
            <button
              type="button"
              onClick={handleKurumOnay}
              disabled={loading || loadingForm}
              className="w-full min-h-[48px] bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation"
            >
              <ShieldCheck size={18} />
              Kurum onayı ver (admin, isteğe bağlı)
            </button>
          )}
          {!isFinalized && !editorKapali && canFinalize(user) && (
            <button
              type="button"
              onClick={handleKesinlestir}
              disabled={loading || loadingForm || (kurumOnayZorunlu && !hasKurumOnay(gunOnay))}
              className="w-full min-h-[48px] bg-amber-600 hover:bg-amber-500 text-white font-black py-3 rounded-xl border-2 border-amber-500 flex items-center justify-center gap-2 transition-all disabled:opacity-50 touch-manipulation"
            >
              <Lock size={18} />
              Günü kesinleştir (kilit)
            </button>
          )}

          {isFinalized && canUnlock(user) && (kesimOncesiDirect || talepliAcma) && (
            <>
              <button
                type="button"
                onClick={handleUnlock}
                disabled={loading || loadingForm}
                className={`w-full min-h-[48px] text-white font-black py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all disabled:opacity-50 touch-manipulation ${
                  kesimOncesiDirect && !talepliAcma
                    ? 'bg-amber-600 hover:bg-amber-500 border-amber-400'
                    : 'bg-rose-600 hover:bg-rose-500 border-rose-400'
                }`}
              >
                <LockOpen size={18} />
                {kesimOncesiDirect && !talepliAcma
                  ? 'Kilidi aç (geri dönük giriş — admin)'
                  : 'Onaylı talep — kilidi aç'}
              </button>
              {talepliAcma && (
                <button
                  type="button"
                  onClick={handleAdminRedTalep}
                  disabled={loading || loadingForm}
                  className="w-full min-h-[40px] text-xs font-bold text-slate-600 dark:text-slate-400 disabled:opacity-50"
                >
                  Talebi reddet
                </button>
              )}
            </>
          )}
          {isFinalized && canUnlock(user) && !kesimOncesiDirect && !talepliAcma && (
            <p className="text-[10px] text-center text-slate-500 font-medium px-2">
              {EDITOR_GIRIS_BASLANGIC_TARIH} ve sonrası için onaylı talep gerekir (Yönetim → Kilit talepleri).
            </p>
          )}
          </div>
        </form>
      </div>

      {talepModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={() => !loading && setTalepModalOpen(false)}
          role="presentation"
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-600"
            role="dialog"
            aria-labelledby="kilit-talep-baslik"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-2 mb-3">
              <h3
                id="kilit-talep-baslik"
                className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"
              >
                <Unlock size={20} className="text-violet-600 dark:text-violet-400 shrink-0" />
                Kilit kaldırma talebi
              </h3>
              <button
                type="button"
                onClick={() => setTalepModalOpen(false)}
                disabled={loading}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {kullanilacakTarih} · {birim} — Proje yetkilisi onayından sonra admin kilidi açar.
            </p>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gerekçe</label>
            <textarea
              value={talepGerekce}
              onChange={(e) => setTalepGerekce(e.target.value)}
              rows={4}
              maxLength={500}
              autoFocus
              placeholder="Neden kilit kaldırılmalı? (en az 10 karakter)"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200"
            />
            <p className="text-[10px] text-slate-400 mt-1 tabular-nums">{talepGerekce.trim().length}/500</p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setTalepModalOpen(false)}
                disabled={loading}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-bold text-slate-600 dark:text-slate-300 disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleTalepOlustur}
                disabled={loading || loadingForm || talepGerekce.trim().length < 10}
                className="flex-1 min-h-[44px] rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-black disabled:opacity-50"
              >
                {loading ? 'Gönderiliyor…' : 'Talebi gönder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataEntry;
