import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarOff, Plus, Trash2 } from 'lucide-react';
import type { UserProfile } from '../users-service';
import type { SessionUser } from '../types';
import { getAllowedBirimler } from '../contexts/UserContext';
import { writeAuditLog } from '../audit-service';
import { TAVIM_BASLANGIC_TARIH } from '../constants';
import {
  createPersonelIzin,
  deletePersonelIzin,
  listPersonelIzins,
  IZIN_TUR_LABELS,
  type PersonelIzin,
  type PersonelIzinTuru
} from '../personel-izin-service';
import { displayUserName } from '../user-display';

type Props = {
  currentUser: SessionUser;
  profiles: UserProfile[];
  allBirimler: string[];
};

const TUR_OPTIONS: PersonelIzinTuru[] = ['yillik_izin', 'rapor', 'diger'];

const fieldClass =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 dark:[color-scheme:dark]';

const PersonelIzinPanel: React.FC<Props> = ({ currentUser, profiles, allBirimler }) => {
  const allowed = getAllowedBirimler(currentUser, allBirimler);
  const [rows, setRows] = useState<PersonelIzin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [birim, setBirim] = useState(allowed[0] || '');
  const [baslangic, setBaslangic] = useState(() => new Date().toISOString().split('T')[0]);
  const [bitis, setBitis] = useState(() => new Date().toISOString().split('T')[0]);
  const [tur, setTur] = useState<PersonelIzinTuru>('yillik_izin');
  const [aciklama, setAciklama] = useState('');

  const profileMap = useMemo(() => {
    const m = new Map<string, UserProfile>();
    profiles.forEach((p) => m.set(p.uid, p));
    return m;
  }, [profiles]);

  const selectableProfiles = useMemo(() => {
    return profiles
      .filter((p) => p.role === 'editor' || p.role === 'proje_yetkilisi')
      .filter((p) => p.birimler.some((b) => allowed.includes(b)))
      .sort((a, b) => displayUserName(a).localeCompare(displayUserName(b), 'tr'));
  }, [profiles, allowed]);

  const visibleRows = useMemo(() => {
    return rows.filter((r) => allowed.includes(r.birim) || r.birim === '');
  }, [rows, allowed]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await listPersonelIzins();
    if (err) setError(err);
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsub = () => {
      window.removeEventListener('firestore_data_change', load);
    };
    window.addEventListener('firestore_data_change', load);
    return unsub;
  }, [load]);

  const handleAdd = async () => {
    if (!userId) {
      setError('Personel seçin');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await createPersonelIzin({
      user_id: userId,
      birim,
      baslangic,
      bitis,
      tur,
      aciklama,
      created_by_uid: currentUser.id
    });
    if (err) {
      setError(err);
    } else {
      await writeAuditLog({
        action: 'izin_kaydi',
        actorUid: currentUser.id,
        actorEmail: currentUser.email,
        birim,
        kayit_tarihi: baslangic,
        details: { user_id: userId, bitis, tur }
      });
      setAciklama('');
      await load();
    }
    setSaving(false);
  };

  const handleDelete = async (row: PersonelIzin) => {
    if (!confirm(`${displayUserName(profileMap.get(row.user_id))} — ${row.baslangic} / ${row.bitis} izin kaydı silinsin mi?`)) {
      return;
    }
    const { error: err } = await deletePersonelIzin(row.id);
    if (err) setError(err);
    else {
      await writeAuditLog({
        action: 'izin_sil',
        actorUid: currentUser.id,
        actorEmail: currentUser.email,
        birim: row.birim,
        kayit_tarihi: row.baslangic,
        details: { user_id: row.user_id, tur: row.tur }
      });
      await load();
    }
  };

  return (
    <div
      id="personel-izin"
      className="scroll-mt-24 bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
          <CalendarOff className="text-indigo-600 dark:text-indigo-400" size={24} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Personel izin / rapor</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Yıllık izin, rapor veya diğer nedenlerle izinli günler. Eksik veri uyarıları bu tarihlerde çıkmaz.
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-sm font-bold text-rose-600 dark:text-rose-400">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-600">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Personel</label>
          <select
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              const p = profiles.find((x) => x.uid === e.target.value);
              const b = p?.birimler.find((bb) => allowed.includes(bb));
              if (b) setBirim(b);
            }}
            className={fieldClass}
          >
            <option value="">Seçin…</option>
            {selectableProfiles.map((p) => (
              <option key={p.uid} value={p.uid}>
                {displayUserName(p)} — {p.birimler.filter((b) => allowed.includes(b)).join(', ') || 'birim yok'}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Birim</label>
          <select value={birim} onChange={(e) => setBirim(e.target.value)} className={fieldClass}>
            {allowed.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Tür</label>
          <select value={tur} onChange={(e) => setTur(e.target.value as PersonelIzinTuru)} className={fieldClass}>
            {TUR_OPTIONS.map((t) => (
              <option key={t} value={t}>{IZIN_TUR_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Başlangıç</label>
          <input
            type="date"
            value={baslangic}
            min={TAVIM_BASLANGIC_TARIH}
            onChange={(e) => setBaslangic(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Bitiş</label>
          <input
            type="date"
            value={bitis}
            min={baslangic}
            onChange={(e) => setBitis(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Açıklama (isteğe bağlı)</label>
          <input
            type="text"
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            maxLength={200}
            placeholder="Örn: 3 gün yıllık izin"
            className={`${fieldClass} font-medium`}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black disabled:opacity-50"
          >
            <Plus size={18} />
            {saving ? 'Kaydediliyor…' : 'İzin kaydı ekle'}
          </button>
        </div>
      </div>

      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Kayıtlı izinler</p>
      {loading ? (
        <div className="py-6 flex justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visibleRows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Henüz izin kaydı yok.</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {visibleRows.map((row) => {
            const p = profileMap.get(row.user_id);
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-2 justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-900/30"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {p ? displayUserName(p) : row.user_id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{IZIN_TUR_LABELS[row.tur]}</span>
                    {' · '}
                    {row.baslangic === row.bitis ? row.baslangic : `${row.baslangic} → ${row.bitis}`}
                    {row.birim ? ` · ${row.birim}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  title="Sil"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PersonelIzinPanel;
