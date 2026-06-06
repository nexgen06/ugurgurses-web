import React, { useState, useEffect, useMemo } from 'react';
import { listUserProfiles, updateUserProfile, deleteUserProfile, type UserProfile } from '../users-service';
import { useUser, canViewAudit, canAdmin, canFinalize, getAllowedBirimler } from '../contexts/UserContext';
import { getDuyuru, setDuyuru } from '../duyuru-service';
import { getHedefler, saveAyHedefleri, type AyHedefMap } from '../hedefler-service';
import { TAVIM_BASLANGIC_AY } from '../constants';
import { getAkisConfig, setAkisConfig } from '../akis-config-service';
import { closeAy, openAy, isAyKapali } from '../ay-kapanis-service';
import {
  getAyBirimOnay,
  setAyBirimOnay,
  hasAyBirimOnay,
  eksikAyBirimOnaylari
} from '../ay-birim-onay-service';
import { listAuditLogs, writeAuditLog, AUDIT_ACTION_LABELS, type AuditLogEntry } from '../audit-service';
import { setBirimler as saveBirimler } from '../birimler-service';
import {
  setOrtakKategoriler,
  setBirimOzelKategoriler,
  deleteBirimOzelKategoriler
} from '../kategoriler-service';
import { useBirimler } from '../contexts/BirimlerContext';
import { useKategoriler } from '../contexts/KategorilerContext';
import type { UserRole } from '../types';
import { Settings, Save, Users, Shield, AlertCircle, Building2, Plus, Trash2, Tags, Layers, ScrollText, Megaphone, Target, Calendar, ArrowRightLeft, Database, Filter } from 'lucide-react';
import { db } from '../db';
import { applyBirimSablon, BIRIM_SABLON_OZEL_KATEGORILER } from '../birim-sablon-service';
import VeriDevriModal from './VeriDevriModal';
import PersonelIzinPanel from './PersonelIzinPanel';
import KilitAcmaTalepleriPanel from './KilitAcmaTalepleriPanel';
import { purgeDemoAndOldData, VERI_KESIM_TARIH } from '../purge-data-service';
import { backfillIslemKayitlariBirim } from '../birim-backfill-service';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'viewer', label: 'Sadece görüntüleme (viewer)' },
  { value: 'editor', label: 'Veri girişi + kendi raporu (editör)' },
  { value: 'proje_yetkilisi', label: 'Veri girişi + kesinleştirme + tüm raporlar (proje yetkilisi)' },
  { value: 'admin', label: 'Tüm yetkiler + yönetim + onaylı kilit açma (admin)' }
];

const Management: React.FC = () => {
  const currentUser = useUser();
  const { birimler, reload: reloadBirimler } = useBirimler();
  const { ortak, birimOzelMap, reload: reloadKat } = useKategoriler();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, { role: UserRole; birimler: string[] }>>({});
  const [yeniBirim, setYeniBirim] = useState('');
  const [birimSaving, setBirimSaving] = useState(false);
  const [yeniOrtakKat, setYeniOrtakKat] = useState('');
  const [ortakKatDraft, setOrtakKatDraft] = useState<string[]>([]);
  const [katBirimSec, setKatBirimSec] = useState('');
  const [yeniBirimKat, setYeniBirimKat] = useState('');
  const [birimKatDraft, setBirimKatDraft] = useState<string[]>([]);
  const [katSaving, setKatSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const showAudit = canViewAudit(currentUser);
  const isAdmin = canAdmin(currentUser);
  const canAyKapanis = canFinalize(currentUser);
  const onayBirimler = getAllowedBirimler(currentUser, birimler);
  const [duyuruMetin, setDuyuruMetin] = useState('');
  const [duyuruSaving, setDuyuruSaving] = useState(false);
  const [hedefAy, setHedefAy] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [hedefDraft, setHedefDraft] = useState<Record<string, string>>({});
  const [hedefSaving, setHedefSaving] = useState(false);
  const [kurumOnayZorunlu, setKurumOnayZorunlu] = useState(false);
  const [birimOnayAktif, setBirimOnayAktif] = useState(false);
  const [haftalikOzetAktif, setHaftalikOzetAktif] = useState(false);
  const [akisSaving, setAkisSaving] = useState(false);
  const [ayBirimOnayBusy, setAyBirimOnayBusy] = useState<string | null>(null);
  const [ayBirimOnayMap, setAyBirimOnayMap] = useState<Record<string, boolean>>({});
  const [kapanisAy, setKapanisAy] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [ayKapaliDurum, setAyKapaliDurum] = useState(false);
  const [kapanisBusy, setKapanisBusy] = useState(false);
  const [uygulaSablon, setUygulaSablon] = useState(true);
  const [devriFrom, setDevriFrom] = useState<UserProfile | null>(null);
  const [sifirlaLoading, setSifirlaLoading] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [kullaniciBirimFiltre, setKullaniciBirimFiltre] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    getDuyuru().then((d) => setDuyuruMetin(d.metin));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin && !canAyKapanis) return;
    getAkisConfig().then((c) => {
      setKurumOnayZorunlu(c.kurum_onay_zorunlu);
      setBirimOnayAktif(c.birim_onay_aktif);
      setHaftalikOzetAktif(c.haftalik_ozet_aktif);
    });
  }, [isAdmin, canAyKapanis]);

  useEffect(() => {
    if (!canAyKapanis || !birimOnayAktif || onayBirimler.length === 0) {
      setAyBirimOnayMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      const map: Record<string, boolean> = {};
      for (const b of onayBirimler) {
        const o = await getAyBirimOnay(kapanisAy, b);
        map[b] = hasAyBirimOnay(o);
      }
      if (!cancelled) setAyBirimOnayMap(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [canAyKapanis, birimOnayAktif, kapanisAy, onayBirimler.join('|')]);

  useEffect(() => {
    if (!isAdmin && !canAyKapanis) return;
    isAyKapali(kapanisAy).then(setAyKapaliDurum);
  }, [isAdmin, canAyKapanis, kapanisAy]);

  useEffect(() => {
    if (!isAdmin) return;
    getHedefler().then((store) => {
      const ay = store[hedefAy] || {};
      const draft: Record<string, string> = {};
      birimler.forEach((b) => {
        draft[b] = ay[b]?.toplam != null ? String(ay[b].toplam) : '';
      });
      setHedefDraft(draft);
    });
  }, [isAdmin, hedefAy, birimler.join('|')]);

  const saveDuyuru = async () => {
    setDuyuruSaving(true);
    setError(null);
    const { error: err } = await setDuyuru(duyuruMetin);
    setDuyuruSaving(false);
    if (err) setError(err);
    else window.dispatchEvent(new Event('duyuru_updated'));
  };

  const saveAkis = async () => {
    setAkisSaving(true);
    const { error: err } = await setAkisConfig({
      kurum_onay_zorunlu: kurumOnayZorunlu,
      birim_onay_aktif: birimOnayAktif,
      haftalik_ozet_aktif: haftalikOzetAktif
    });
    setAkisSaving(false);
    if (err) setError(err);
    else window.dispatchEvent(new Event('akis_config_updated'));
  };

  const handleAyBirimOnay = async (birimAd: string) => {
    if (!currentUser || !canAyKapanis) return;
    setAyBirimOnayBusy(birimAd);
    const { error: err } = await setAyBirimOnay(kapanisAy, birimAd, currentUser.id, currentUser.email);
    if (err) setError(err);
    else {
      setAyBirimOnayMap((m) => ({ ...m, [birimAd]: true }));
      await writeAuditLog({
        action: 'birim_onay',
        actorUid: currentUser.id,
        actorEmail: currentUser.email,
        birim: birimAd,
        kayit_tarihi: `${kapanisAy}-01`,
        details: { ay_kapanis: kapanisAy, tur: 'ay_birim' }
      });
    }
    setAyBirimOnayBusy(null);
  };

  const handleAyKapat = async () => {
    if (!currentUser || !confirm(`${kapanisAy} ayı kapatılacak; tüm günler kilitlenir. Onaylıyor musunuz?`)) return;
    if (birimOnayAktif) {
      const eksik = await eksikAyBirimOnaylari(kapanisAy, birimler);
      if (eksik.length > 0) {
        setError(`Ay kapanışı için tüm birim onayları gerekli. Eksik: ${eksik.join(', ')}`);
        return;
      }
    }
    setKapanisBusy(true);
    const { error: err, lockedDays } = await closeAy(kapanisAy, currentUser.id, currentUser.email, false);
    setKapanisBusy(false);
    if (err) setError(err);
    else {
      setAyKapaliDurum(true);
      alert(`${kapanisAy} kapatıldı. ${lockedDays} gün kilidi oluşturuldu/güncellendi.`);
    }
  };

  const handleBirimBackfill = async () => {
    if (
      !window.confirm(
        'Eksik veya boş birim alanı olan işlem kayıtları düzeltilecek. ' +
          'Birim, kullanıcı atamasından veya tanımlı birim listesinden çıkarılır. Devam?'
      )
    ) {
      return;
    }
    setBackfillLoading(true);
    setError(null);
    const s = await backfillIslemKayitlariBirim(birimler, profiles);
    setBackfillLoading(false);
    if (s.error) {
      setError(`Birim düzeltme hatası: ${s.error}`);
      return;
    }
    alert(
      `Birim düzeltme tamamlandı.\n` +
        `Taranan: ${s.scanned}\n` +
        `Düzeltilen: ${s.fixed} (kırpma: ${s.trimmed}, çıkarım: ${s.inferred})\n` +
        `Değişmeyen: ${s.skipped}`
    );
  };

  const handlePurgeDemoEski = async () => {
    if (
      !window.confirm(
        `Demo veriler ve ${VERI_KESIM_TARIH} öncesi tüm işlem/kilit/onay kayıtları silinecek. ${VERI_KESIM_TARIH} ve sonrası kalır. Devam?`
      )
    ) {
      return;
    }
    if (!window.confirm('Son onay: Bu işlem geri alınamaz. Emin misiniz?')) return;
    setPurgeLoading(true);
    setError(null);
    const s = await purgeDemoAndOldData();
    setPurgeLoading(false);
    if (s.error) {
      setError(`Temizlik hatası: ${s.error}`);
      return;
    }
    alert(
      `Temizlik tamamlandı.\n` +
        `İşlem kaydı: ${s.islemKayitlari}\n` +
        `Gün kilidi: ${s.kesinlesenGunler}\n` +
        `Gün onayı: ${s.gunOnaylari}\n` +
        `Kilit talebi: ${s.kilitTalepleri}\n` +
        `Demo kullanıcı: ${s.demoUsers}\n` +
        `${VERI_KESIM_TARIH} ve sonrası korundu.`
    );
    load();
  };

  const handleVeritabaniSifirla = async () => {
    if (
      !window.confirm(
        'islem_kayitlari koleksiyonundaki TÜM işlem kayıtları silinecek. Bu işlem geri alınamaz. Emin misiniz?'
      )
    ) {
      return;
    }
    if (!window.confirm('Son onay: Tüm evrak sayım verileri kalıcı olarak silinecek.')) return;
    setSifirlaLoading(true);
    setError(null);
    try {
      const col = db.collection('islem_kayitlari') as { deleteAll?: () => Promise<{ deletedCount: number; error: string | null }> };
      if (typeof col.deleteAll !== 'function') {
        setError('Bu ortamda veritabanı sıfırlama desteklenmiyor.');
        setSifirlaLoading(false);
        return;
      }
      const { deletedCount, error: err } = await col.deleteAll();
      if (err) setError(`Sıfırlama hatası: ${err}`);
      else {
        alert(`Veritabanı sıfırlandı. ${deletedCount} işlem kaydı silindi.`);
        window.dispatchEvent(new Event('firestore_data_change'));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bilinmeyen hata');
    }
    setSifirlaLoading(false);
  };

  const handleAyAc = async () => {
    if (!currentUser || !confirm(`${kapanisAy} ay kapanışı kaldırılacak (veri girişi kuralları). Gün kilitleri durur. Onay?`)) return;
    setKapanisBusy(true);
    const { error: err } = await openAy(kapanisAy, currentUser.id, currentUser.email);
    setKapanisBusy(false);
    if (err) setError(err);
    else setAyKapaliDurum(false);
  };

  const saveHedefler = async () => {
    setHedefSaving(true);
    setError(null);
    const map: AyHedefMap = {};
    birimler.forEach((b) => {
      const raw = hedefDraft[b]?.trim();
      if (!raw) return;
      const n = parseInt(raw, 10);
      if (n > 0) map[b] = { toplam: n };
    });
    const { error: err } = await saveAyHedefleri(hedefAy, map);
    setHedefSaving(false);
    if (err) setError(err);
    else window.dispatchEvent(new Event('hedefler_updated'));
  };

  useEffect(() => {
    setOrtakKatDraft([...ortak]);
  }, [ortak]);

  useEffect(() => {
    if (katBirimSec) setBirimKatDraft([...(birimOzelMap[katBirimSec] || [])]);
    else setBirimKatDraft([]);
  }, [katBirimSec, birimOzelMap]);

  const addBirim = async () => {
    const ad = yeniBirim.trim();
    if (!ad || birimler.includes(ad)) return;
    setBirimSaving(true);
    setError(null);
    const { error: err } = await saveBirimler([...birimler, ad]);
    if (err) {
      setError(err);
      setBirimSaving(false);
      return;
    }
    if (uygulaSablon) {
      const { error: sabErr } = await applyBirimSablon(ad);
      if (sabErr) setError(sabErr);
      else await reloadKat();
    }
    setYeniBirim('');
    await reloadBirimler();
    setBirimSaving(false);
  };

  const removeBirim = async (ad: string) => {
    if (!confirm(`"${ad}" birimini listeden kaldırmak istediğinize emin misiniz? Bu birime ait geçmiş kayıtlar silinmez ama listeden çıkar.`)) return;
    setBirimSaving(true);
    setError(null);
    const { error: err } = await saveBirimler(birimler.filter((b) => b !== ad));
    if (err) setError(err);
    else {
      await deleteBirimOzelKategoriler(ad);
      await reloadBirimler();
      await reloadKat();
    }
    setBirimSaving(false);
  };

  const addOrtakKat = () => {
    const ad = yeniOrtakKat.trim();
    if (!ad || ortakKatDraft.includes(ad)) return;
    if (katBirimSec && birimKatDraft.includes(ad)) {
      setError('Bu isim seçili birimin özel listesinde; ortak listeye eklenemez.');
      return;
    }
    setOrtakKatDraft((prev) => [...prev, ad]);
    setYeniOrtakKat('');
  };

  const saveOrtakKat = async () => {
    setKatSaving(true);
    setError(null);
    const { error: err } = await setOrtakKategoriler(ortakKatDraft);
    if (err) setError(err);
    else await reloadKat();
    setKatSaving(false);
  };

  const addBirimKat = () => {
    const ad = yeniBirimKat.trim();
    if (!katBirimSec || !ad || birimKatDraft.includes(ad)) return;
    if (ortakKatDraft.includes(ad) || ortak.includes(ad)) {
      setError('Ortak listede olan kategori birim özel listesine eklenemez.');
      return;
    }
    setBirimKatDraft((prev) => [...prev, ad]);
    setYeniBirimKat('');
  };

  const saveBirimKat = async () => {
    if (!katBirimSec) return;
    setKatSaving(true);
    setError(null);
    const { error: err } = await setBirimOzelKategoriler(katBirimSec, birimKatDraft);
    if (err) setError(err);
    else await reloadKat();
    setKatSaving(false);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await listUserProfiles();
    if (err) setError(err);
    else setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!showAudit) {
      setAuditLogs([]);
      setAuditError(null);
      return;
    }
    setAuditLoading(true);
    setAuditError(null);
    listAuditLogs(30).then(({ rows, error: err }) => {
      setAuditLogs(rows);
      setAuditError(err);
      setAuditLoading(false);
    });
  }, [currentUser?.id, showAudit]);

  const getEdit = (uid: string): { role: UserRole; birimler: string[] } => {
    if (dirty[uid]) return dirty[uid];
    const p = profiles.find((x) => x.uid === uid);
    return p ? { role: p.role, birimler: [...p.birimler] } : { role: 'viewer', birimler: [] };
  };

  const setEdit = (uid: string, upd: Partial<{ role: UserRole; birimler: string[] }>) => {
    const current = getEdit(uid);
    setDirty((prev) => ({
      ...prev,
      [uid]: { ...current, ...upd }
    }));
  };

  const toggleBirim = (uid: string, birim: string) => {
    const cur = getEdit(uid);
    const next = cur.birimler.includes(birim)
      ? cur.birimler.filter((b) => b !== birim)
      : [...cur.birimler, birim];
    setEdit(uid, { birimler: next });
  };

  const profileBirimleri = (p: UserProfile): string[] => dirty[p.uid]?.birimler ?? p.birimler;

  const filteredProfiles = useMemo(() => {
    if (!kullaniciBirimFiltre) return profiles;
    return profiles.filter((p) => profileBirimleri(p).includes(kullaniciBirimFiltre));
  }, [profiles, dirty, kullaniciBirimFiltre]);

  const birimKullaniciSayilari = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of birimler) {
      map[b] = profiles.filter((p) => profileBirimleri(p).includes(b)).length;
    }
    return map;
  }, [profiles, dirty, birimler]);

  const save = async (uid: string) => {
    const edit = getEdit(uid);
    setSaving(uid);
    const { error: err } = await updateUserProfile(uid, { role: edit.role, birimler: edit.birimler });
    setSaving(null);
    if (err) {
      setError(err);
      return;
    }
    setDirty((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
    setProfiles((prev) =>
      prev.map((p) => (p.uid === uid ? { ...p, role: edit.role, birimler: edit.birimler } : p))
    );
  };

  const removeProfile = async (p: UserProfile) => {
    if (p.uid === currentUser?.id) {
      setError('Kendi profilinizi listeden silemezsiniz.');
      return;
    }
    const label = p.email || p.uid;
    if (
      !window.confirm(
        `"${label}" kullanıcısını yönetim listesinden kaldırmak istiyor musunuz?\n\n` +
          'Bu işlem Firestore\'daki users kaydını siler. Firebase Authentication\'da hesap duruyorsa Console → Authentication\'dan da silmeniz gerekir.\n\n' +
          'Geçmiş veri girişleri (islem_kayitlari) silinmez.'
      )
    ) {
      return;
    }
    setDeleting(p.uid);
    setError(null);
    const { error: err } = await deleteUserProfile(p.uid);
    setDeleting(null);
    if (err) {
      setError(err);
      return;
    }
    setDirty((prev) => {
      const next = { ...prev };
      delete next[p.uid];
      return next;
    });
    setProfiles((prev) => prev.filter((x) => x.uid !== p.uid));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sectionLink =
    'px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <nav
        className="sticky top-0 z-10 flex flex-wrap gap-2 p-3 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-sm"
        aria-label="Yönetim bölümleri"
      >
        {(showAudit || canAyKapanis) && (
          <a href="#kilit-talepleri" className={sectionLink}>
            Kilit talepleri
          </a>
        )}
        {showAudit && (
          <a href="#denetim" className={sectionLink}>
            Denetim günlüğü
          </a>
        )}
        <a href="#birimler" className={sectionLink}>
          Birimler
        </a>
        <a href="#kategoriler-ortak" className={sectionLink}>
          Ortak kategoriler
        </a>
        <a href="#kategoriler-birim" className={sectionLink}>
          Birim kategorileri
        </a>
        <a href="#kullanicilar" className={sectionLink}>
          Kullanıcılar
        </a>
        {isAdmin && (
          <a href="#duyuru" className={sectionLink}>
            Duyuru
          </a>
        )}
        {isAdmin && (
          <a href="#hedefler" className={sectionLink}>
            Aylık hedefler
          </a>
        )}
        {isAdmin && (
          <a href="#resmi-gun" className={sectionLink}>
            Resmi gün
          </a>
        )}
        {canAyKapanis && birimOnayAktif && (
          <a href="#ay-birim-onay" className={sectionLink}>
            Ay birim onayı
          </a>
        )}
        {canAyKapanis && (
          <a href="#personel-izin" className={sectionLink}>
            İzin / rapor
          </a>
        )}
        {isAdmin && (
          <a href="#birim-backfill" className={`${sectionLink} text-indigo-700 dark:text-indigo-400`}>
            Birim alanı düzelt
          </a>
        )}
        {isAdmin && (
          <a href="#demo-temizlik" className={`${sectionLink} text-amber-700 dark:text-amber-400`}>
            Demo / eski veri
          </a>
        )}
        {isAdmin && (
          <a href="#veritabani-sifirla" className={`${sectionLink} text-rose-600 dark:text-rose-400`}>
            Veritabanını sıfırla
          </a>
        )}
      </nav>

      {canAyKapanis && currentUser && (
        <PersonelIzinPanel currentUser={currentUser} profiles={profiles} allBirimler={birimler} />
      )}

      {isAdmin && (
        <div
          id="duyuru"
          className="scroll-mt-24 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-sky-200 dark:border-sky-800"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-xl">
              <Megaphone className="text-sky-600 dark:text-sky-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Kurumsal duyuru</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tüm kullanıcılara üst bantta gösterilir. Boş bırakırsanız bant gizlenir.
              </p>
            </div>
          </div>
          <textarea
            value={duyuruMetin}
            onChange={(e) => setDuyuruMetin(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Örn: 15–20 Haziran arası DYS sayımları X sistemiyle uyumlu girilsin."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[10px] text-slate-400">{duyuruMetin.length}/500</span>
            <button
              type="button"
              onClick={saveDuyuru}
              disabled={duyuruSaving}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold disabled:opacity-50"
            >
              {duyuruSaving ? 'Kaydediliyor…' : 'Duyuruyu yayınla'}
            </button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div
          id="hedefler"
          className="scroll-mt-24 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <Target className="text-emerald-600 dark:text-emerald-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Aylık hedefler</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Birim bazlı toplam işlem hedefi. Dashboard’da yeşil / sarı / kırmızı bant olarak görünür.
              </p>
            </div>
          </div>
          <select
            value={hedefAy}
            onChange={(e) => setHedefAy(e.target.value)}
            className="mb-4 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm font-bold"
          >
            {(() => {
              const opts: { value: string; label: string }[] = [];
              const now = new Date();
              for (let i = 0; i < 18; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (value < TAVIM_BASLANGIC_AY) break;
                const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                opts.push({ value, label: `${AY[d.getMonth()]} ${d.getFullYear()}` });
              }
              return opts.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ));
            })()}
          </select>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {birimler.map((b) => (
              <div key={b} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1 min-w-0 truncate">{b}</span>
                <input
                  type="number"
                  min={0}
                  placeholder="Toplam hedef"
                  value={hedefDraft[b] ?? ''}
                  onChange={(e) => setHedefDraft((prev) => ({ ...prev, [b]: e.target.value }))}
                  className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm text-right"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={saveHedefler}
            disabled={hedefSaving}
            className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50"
          >
            {hedefSaving ? 'Kaydediliyor…' : 'Hedefleri kaydet'}
          </button>
        </div>
      )}

      {isAdmin && (
        <div
          id="resmi-gun"
          className="scroll-mt-24 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-amber-200 dark:border-amber-800"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Calendar className="text-amber-700 dark:text-amber-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Resmi gün ve iş akışı</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Günlük: editör girer → (isteğe bağlı) kurum onayı → gün kesinleştirme. Birim onayı varsayılan kapalıdır; açılırsa yalnızca ay kapanışında kullanılır.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            <input
              type="checkbox"
              checked={birimOnayAktif}
              onChange={(e) => setBirimOnayAktif(e.target.checked)}
              className="rounded text-amber-600"
            />
            Birim onayı aktif (yalnızca ay kapanışında — proje yetkilisi)
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            <input
              type="checkbox"
              checked={kurumOnayZorunlu}
              onChange={(e) => setKurumOnayZorunlu(e.target.checked)}
              className="rounded text-amber-600"
            />
            Kurum onayı zorunlu (admin onayı olmadan gün kesinleştirme yapılamaz)
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
            <input
              type="checkbox"
              checked={haftalikOzetAktif}
              onChange={(e) => setHaftalikOzetAktif(e.target.checked)}
              className="rounded text-amber-600"
            />
            Haftalık kesinleştirme özeti (proje yetkilisi / admin girişinde üst kart)
          </label>
          <button
            type="button"
            onClick={saveAkis}
            disabled={akisSaving}
            className="mb-6 px-4 py-2 rounded-lg bg-amber-100 text-amber-900 text-sm font-bold disabled:opacity-50"
          >
            Akış ayarını kaydet
          </button>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Ay kapanışı</p>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={kapanisAy}
              onChange={(e) => setKapanisAy(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm font-bold"
            >
              {(() => {
                const opts: { value: string; label: string }[] = [];
                const now = new Date();
                for (let i = 0; i < 18; i++) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  if (value < TAVIM_BASLANGIC_AY) break;
                  const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                  opts.push({ value, label: `${AY[d.getMonth()]} ${d.getFullYear()}` });
                }
                return opts.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ));
              })()}
            </select>
            <span className={`text-xs font-bold px-2 py-1 rounded ${ayKapaliDurum ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {ayKapaliDurum ? 'Kapalı' : 'Açık'}
            </span>
            <button
              type="button"
              onClick={handleAyKapat}
              disabled={kapanisBusy || ayKapaliDurum}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold disabled:opacity-50"
            >
              Ayı kapat
            </button>
            <button
              type="button"
              onClick={handleAyAc}
              disabled={kapanisBusy || !ayKapaliDurum}
              className="px-4 py-2 rounded-lg bg-slate-600 text-white text-sm font-bold disabled:opacity-50"
            >
              Ayı aç (admin)
            </button>
          </div>
          {birimOnayAktif && canAyKapanis && !ayKapaliDurum && onayBirimler.length > 0 && (
            <div className="mt-4 p-4 rounded-xl border-2 border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-900/20">
              <p className="text-xs font-black uppercase tracking-widest text-sky-800 dark:text-sky-300 mb-2">
                Ay kapanışı — birim onayı ({kapanisAy})
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3">
                Proje yetkilisi, ay kapatılmadan önce her birim için onay verir. Günlük veri girişinde birim onayı istenmez.
              </p>
              <ul className="space-y-2">
                {onayBirimler.map((b) => (
                  <li key={b} className="flex flex-wrap items-center gap-2 justify-between">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[60%]">{b}</span>
                    {ayBirimOnayMap[b] ? (
                      <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">✓ Onaylı</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAyBirimOnay(b)}
                        disabled={ayBirimOnayBusy === b}
                        className="min-h-[40px] px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-black disabled:opacity-50"
                      >
                        {ayBirimOnayBusy === b ? 'Kaydediliyor…' : 'Birim onayı ver (ay kapanışı)'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-2">
            Önceki ay, proje yetkilisi/admin girişinde otomatik kapanır. Haftalık özet kartı varsayılan kapalıdır; yukarıdaki kutudan açılabilir.
          </p>
        </div>
      )}

      {canAyKapanis && !isAdmin && birimOnayAktif && (
        <div
          id="ay-birim-onay"
          className="scroll-mt-24 bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-sky-200 dark:border-sky-800 mb-6"
        >
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-1">Ay kapanışı — birim onayı</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Seçili ay için birim onaylarını verin. Ayı kapatma işlemi yönetici tarafından yapılır.
          </p>
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <select
              value={kapanisAy}
              onChange={(e) => setKapanisAy(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm font-bold"
            >
              {(() => {
                const opts: { value: string; label: string }[] = [];
                const now = new Date();
                for (let i = 0; i < 18; i++) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  if (value < TAVIM_BASLANGIC_AY) break;
                  const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                  opts.push({ value, label: `${AY[d.getMonth()]} ${d.getFullYear()}` });
                }
                return opts.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ));
              })()}
            </select>
            <span className={`text-xs font-bold px-2 py-1 rounded ${ayKapaliDurum ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {ayKapaliDurum ? 'Ay kapalı' : 'Ay açık'}
            </span>
          </div>
          {!ayKapaliDurum && onayBirimler.length > 0 && (
            <ul className="space-y-2">
              {onayBirimler.map((b) => (
                <li key={b} className="flex flex-wrap items-center gap-2 justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{b}</span>
                  {ayBirimOnayMap[b] ? (
                    <span className="text-xs font-black text-emerald-700">✓ Onaylı</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAyBirimOnay(b)}
                      disabled={ayBirimOnayBusy === b}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-black disabled:opacity-50"
                    >
                      Birim onayı ver (ay kapanışı)
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {ayKapaliDurum && (
            <p className="text-xs text-rose-700 font-bold">Bu ay zaten kapatılmış; yeni birim onayı verilemez.</p>
          )}
        </div>
      )}

      {(showAudit || canAyKapanis) && <KilitAcmaTalepleriPanel />}

      {showAudit && (
        <div
          id="denetim"
          className="scroll-mt-24 bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-violet-200 dark:border-violet-800"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
              <ScrollText className="text-violet-600 dark:text-violet-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Denetim günlüğü</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Kilit açma ve kesinleştirme işlemleri (son 30 kayıt).
              </p>
            </div>
          </div>
          {auditLoading ? (
            <div className="py-8 flex justify-center">
              <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : auditError ? (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>
                {auditError}. Firestore kurallarını yayınladığınızdan ve hesabınızın{' '}
                <strong>admin</strong> veya <strong>proje yetkilisi</strong> olduğundan emin olun.
              </span>
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="text-sm text-slate-500">Henüz kayıt yok. Kesinleştirme veya kilit açma yaptıkça burada görünür.</p>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-600 text-left">
                    <th className="py-2 pr-3 font-bold text-slate-500">Zaman</th>
                    <th className="py-2 pr-3 font-bold text-slate-500">İşlem</th>
                    <th className="py-2 pr-3 font-bold text-slate-500">Tarih / Birim</th>
                    <th className="py-2 font-bold text-slate-500">Kullanıcı</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="py-2 pr-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {new Date(row.at).toLocaleString('tr-TR')}
                      </td>
                      <td className="py-2 pr-3 font-semibold text-slate-800 dark:text-slate-200">
                        {AUDIT_ACTION_LABELS[row.action] || row.action}
                      </td>
                      <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">
                        {row.kayit_tarihi} — {row.birim}
                      </td>
                      <td className="py-2 text-slate-600 dark:text-slate-400 break-all">
                        {row.actor_email || row.actor_uid}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div
        id="birimler"
        className="scroll-mt-24 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-xl">
            <Building2 className="text-sky-600 dark:text-sky-400" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Birimler</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sistemde tanımlı birimleri yönetin. Buradaki birimler veri girişi ve kullanıcı atamalarında kullanılır.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {birimler.length === 0 && (
            <span className="text-sm text-slate-400">Henüz birim tanımlı değil.</span>
          )}
          {birimler.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              {b}
              <button
                type="button"
                onClick={() => removeBirim(b)}
                disabled={birimSaving}
                title="Birimi kaldır"
                className="p-1 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </span>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
          <input
            type="checkbox"
            checked={uygulaSablon}
            onChange={(e) => setUygulaSablon(e.target.checked)}
            className="rounded text-sky-600"
          />
          Şablon uygula: {BIRIM_SABLON_OZEL_KATEGORILER.join(', ')} (birim özel)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={yeniBirim}
            onChange={(e) => setYeniBirim(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addBirim()}
            placeholder="Yeni birim adı"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm"
          />
          <button
            type="button"
            onClick={addBirim}
            disabled={birimSaving || !yeniBirim.trim()}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold disabled:opacity-50"
          >
            <Plus size={16} />
            Ekle
          </button>
        </div>
      </div>

      <div
        id="kategoriler-ortak"
        className="scroll-mt-24 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
            <Tags className="text-violet-600 dark:text-violet-400" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Ortak Kategoriler</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Tüm birimlerde görünen işlem türleri. Birim özel listesiyle aynı isim kullanılamaz.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {ortakKatDraft.map((k) => (
            <span key={k} className="inline-flex items-center gap-1 pl-3 pr-1 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-sm font-semibold text-violet-800 dark:text-violet-200">
              {k}
              <button type="button" onClick={() => setOrtakKatDraft((p) => p.filter((x) => x !== k))} className="p-1 text-rose-500 hover:bg-rose-100 rounded">
                <Trash2 size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={yeniOrtakKat}
            onChange={(e) => setYeniOrtakKat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addOrtakKat()}
            placeholder="Yeni ortak kategori"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
          />
          <button type="button" onClick={addOrtakKat} className="px-3 py-2 rounded-lg bg-violet-100 text-violet-800 text-sm font-bold">Ekle</button>
          <button type="button" onClick={saveOrtakKat} disabled={katSaving} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold disabled:opacity-50">
            Kaydet
          </button>
        </div>
      </div>

      <div
        id="kategoriler-birim"
        className="scroll-mt-24 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <Layers className="text-indigo-600 dark:text-indigo-400" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Birim Özel Kategoriler</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Yalnızca seçili birimde veri girişinde görünür.</p>
          </div>
        </div>
        <select
          value={katBirimSec}
          onChange={(e) => setKatBirimSec(e.target.value)}
          className="mb-4 w-full max-w-md px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
        >
          <option value="">Birim seçin…</option>
          {birimler.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        {katBirimSec && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {birimKatDraft.map((k) => (
                <span key={k} className="inline-flex items-center gap-1 pl-3 pr-1 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-sm font-semibold">
                  {k}
                  <button type="button" onClick={() => setBirimKatDraft((p) => p.filter((x) => x !== k))} className="p-1 text-rose-500 rounded">
                    <Trash2 size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={yeniBirimKat}
                onChange={(e) => setYeniBirimKat(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addBirimKat()}
                placeholder="Birime özel kategori"
                className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
              />
              <button type="button" onClick={addBirimKat} className="px-3 py-2 rounded-lg bg-indigo-100 text-indigo-800 text-sm font-bold">Ekle</button>
              <button type="button" onClick={saveBirimKat} disabled={katSaving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">
                Kaydet
              </button>
            </div>
          </>
        )}
      </div>

      <div
        id="kullanicilar"
        className="scroll-mt-24 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
            <Settings className="text-amber-600 dark:text-amber-400" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100">Kullanıcılar ve roller</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Kullanıcı rolleri ve yetkili birimleri buradan düzenleyin. Authentication’dan silinen üyeler listede kalıyorsa
              çöp kutusu ile Firestore profilini kaldırın.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {isAdmin && birimler.length > 0 && (
          <div className="mb-4 flex flex-wrap items-end gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-600">
            <div className="space-y-1 min-w-[220px]">
              <label htmlFor="kullanici-birim-filtre" className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                <Filter size={12} />
                Birime göre listele
              </label>
              <select
                id="kullanici-birim-filtre"
                value={kullaniciBirimFiltre}
                onChange={(e) => setKullaniciBirimFiltre(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="">Tüm birimler ({profiles.length})</option>
                {birimler.map((b) => (
                  <option key={b} value={b}>
                    {b} ({birimKullaniciSayilari[b] ?? 0})
                  </option>
                ))}
              </select>
            </div>
            {kullaniciBirimFiltre ? (
              <p className="text-sm text-slate-600 dark:text-slate-300 pb-0.5">
                <strong className="text-slate-800 dark:text-slate-100">{filteredProfiles.length}</strong> kullanıcı —{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">{kullaniciBirimFiltre}</strong>
                <button
                  type="button"
                  onClick={() => setKullaniciBirimFiltre('')}
                  className="ml-3 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 underline"
                >
                  Filtreyi kaldır
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 pb-0.5 max-w-md">
                Birim seçerek yalnızca o birime atanmış kullanıcıları hızlıca görüntüleyin.
              </p>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-600">
                <th className="text-left py-3 px-2 font-bold text-slate-600 dark:text-slate-400">E-posta</th>
                <th className="text-left py-3 px-2 font-bold text-slate-600 dark:text-slate-400">Rol</th>
                <th className="text-left py-3 px-2 font-bold text-slate-600 dark:text-slate-400">Yetkili birimler</th>
                <th className="text-left py-3 px-2 font-bold text-slate-600 dark:text-slate-400 w-36">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    Henüz Firestore <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">users</code> koleksiyonunda kayıt yok. Kullanıcılar ilk girişte otomatik eklenir.
                  </td>
                </tr>
              )}
              {profiles.length > 0 && filteredProfiles.length === 0 && kullaniciBirimFiltre && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    <Filter size={32} className="mx-auto mb-2 opacity-50" />
                    <strong>{kullaniciBirimFiltre}</strong> birimine atanmış kullanıcı bulunamadı.
                  </td>
                </tr>
              )}
              {filteredProfiles.map((p) => {
                const edit = getEdit(p.uid);
                const hasChange =
                  dirty[p.uid] &&
                  (edit.role !== p.role || JSON.stringify(edit.birimler.sort()) !== JSON.stringify([...p.birimler].sort()));
                return (
                  <tr key={p.uid} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-2 font-medium text-slate-800 dark:text-slate-200">{p.email || p.uid}</td>
                    <td className="py-3 px-2">
                      <select
                        value={edit.role}
                        onChange={(e) => setEdit(p.uid, { role: e.target.value as UserRole })}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex flex-wrap gap-2">
                        {birimler.map((b) => (
                          <label key={b} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={edit.birimler.includes(b)}
                              onChange={() => toggleBirim(p.uid, b)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-300">{b}</span>
                          </label>
                        ))}
                        <span className="text-xs text-slate-400">(admin tümünü görür; diğer roller için boş = erişim yok)</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {hasChange && (
                          <button
                            type="button"
                            onClick={() => save(p.uid)}
                            disabled={!!saving || !!deleting}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
                          >
                            {saving === p.uid ? (
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Save size={14} />
                            )}
                            Kaydet
                          </button>
                        )}
                        {isAdmin && p.uid !== currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => setDevriFrom(p)}
                            title="İşlem kayıtlarını başka kullanıcıya devret"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100"
                          >
                            <ArrowRightLeft size={14} />
                            Veri devri
                          </button>
                        )}
                        {p.uid !== currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => removeProfile(p)}
                            disabled={!!saving || deleting === p.uid}
                            title="Firestore profilini listeden kaldır"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold disabled:opacity-50"
                          >
                            {deleting === p.uid ? (
                              <span className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            Kaldır
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && (
        <div
          id="birim-backfill"
          className="scroll-mt-24 p-6 rounded-2xl border-2 border-indigo-300 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/25"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
              <Building2 className="text-indigo-700 dark:text-indigo-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-indigo-900 dark:text-indigo-100">Birim alanı düzelt</h2>
              <p className="text-sm text-indigo-900/85 dark:text-indigo-200/80 mt-1">
                Eski kayıtlarda <code className="text-xs">birim</code> eksik/boşsa veya başında-sonunda boşluk varsa
                düzeltir. Editörlerin veriyi görebilmesi için kullanıcıya doğru birim atanmış olmalıdır.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBirimBackfill}
            disabled={backfillLoading}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black disabled:opacity-50"
          >
            <Building2 size={18} />
            {backfillLoading ? 'Düzeltiliyor…' : 'İşlem kayıtlarında birim alanını düzelt'}
          </button>
        </div>
      )}

      {isAdmin && (
        <div
          id="demo-temizlik"
          className="scroll-mt-24 p-6 rounded-2xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/25"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
              <Database className="text-amber-700 dark:text-amber-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-900 dark:text-amber-100">Demo ve eski verileri temizle</h2>
              <p className="text-sm text-amber-900/85 dark:text-amber-200/80 mt-1">
                Demo işlem kayıtları (<code className="text-xs">seed_tag</code>),{' '}
                <strong>{VERI_KESIM_TARIH}</strong> öncesi evrak kayıtları, gün kilitleri, onaylar ve kilit talepleri
                silinir. <strong>{VERI_KESIM_TARIH}</strong> ve sonrası korunur (sistem o gün devreye alındı). Demo
                test kullanıcı hesapları da kaldırılır.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePurgeDemoEski}
            disabled={purgeLoading}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-black disabled:opacity-50"
          >
            <Trash2 size={18} />
            {purgeLoading ? 'Temizleniyor…' : `Demo + ${VERI_KESIM_TARIH} öncesini sil`}
          </button>
        </div>
      )}

      {isAdmin && (
        <div
          id="veritabani-sifirla"
          className="scroll-mt-24 p-6 rounded-2xl border-2 border-rose-300 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/30"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/40 rounded-xl">
              <Database className="text-rose-700 dark:text-rose-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-rose-900 dark:text-rose-100">Veritabanını sıfırla</h2>
              <p className="text-sm text-rose-800/90 dark:text-rose-200/80 mt-1">
                Yalnızca <strong>islem_kayitlari</strong> (evrak sayımları) silinir. Kullanıcılar, birimler, kategoriler,
                izin kayıtları ve kesinleştirme kilitleri etkilenmez.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleVeritabaniSifirla}
            disabled={sifirlaLoading}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-black disabled:opacity-50"
          >
            <Trash2 size={18} />
            {sifirlaLoading ? 'Sıfırlanıyor…' : 'Tüm işlem kayıtlarını sil'}
          </button>
        </div>
      )}

      <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
          <Shield size={18} />
          İlk admin nasıl atanır?
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Firestore’da <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">config/admins</code> dokümanı oluşturun ve <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">uids</code> alanına (array) ilk yönetici kullanıcının Firebase Auth UID’sini ekleyin. Bu kullanıcı giriş yaptığında Yönetim sekmesini görür ve diğer kullanıcılara rol atayabilir.
        </p>
      </div>

      {devriFrom && currentUser && (
        <VeriDevriModal
          fromUser={devriFrom}
          allProfiles={profiles}
          actorUid={currentUser.id}
          actorEmail={currentUser.email}
          onClose={() => setDevriFrom(null)}
          onDone={() => load()}
        />
      )}
    </div>
  );
};

export default Management;
