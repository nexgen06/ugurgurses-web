import React, { useState, useEffect, useCallback } from 'react';
import { LockOpen, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useUser, canAdmin, canFinalize, getAllowedBirimler } from '../contexts/UserContext';
import { useBirimler } from '../contexts/BirimlerContext';
import { db } from '../db';
import { lockDocId } from '../firestore-db';
import {
  listKilitAcmaTalepleriByDurum,
  pyOnaylaKilitTalep,
  pyReddetKilitTalep,
  adminReddetKilitTalep,
  tamamlaKilitAcmaTalep,
  type KilitAcmaTalep
} from '../services/kilit-acma-talep-service';
import { writeAuditLog } from '../services/audit-service';

const KESINLESEN_GUNLER = 'kesinlesen_gunler';

const KilitAcmaTalepleriPanel: React.FC = () => {
  const user = useUser();
  const { birimler } = useBirimler();
  const allowed = getAllowedBirimler(user, birimler);
  const isAdmin = canAdmin(user);
  const isPy = canFinalize(user) && !isAdmin;
  const show = isAdmin || isPy;

  const [pyRows, setPyRows] = useState<KilitAcmaTalep[]>([]);
  const [adminRows, setAdminRows] = useState<KilitAcmaTalep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!show) return;
    setLoading(true);
    setError(null);
    const [pyRes, adminRes] = await Promise.all([
      isPy || isAdmin ? listKilitAcmaTalepleriByDurum('bekliyor_py') : { rows: [], error: null },
      isAdmin ? listKilitAcmaTalepleriByDurum('bekliyor_admin') : { rows: [], error: null }
    ]);
    const filterBirim = (rows: KilitAcmaTalep[]) =>
      isAdmin ? rows : rows.filter((r) => allowed.includes(r.birim));
    setPyRows(filterBirim(pyRes.rows));
    setAdminRows(adminRes.rows);
    setError(pyRes.error || adminRes.error);
    setLoading(false);
  }, [show, isAdmin, isPy, allowed.join('|')]);

  useEffect(() => {
    load();
    const unsub = db.subscribe(() => load());
    return unsub;
  }, [load]);

  if (!show) return null;

  const rowKey = (r: KilitAcmaTalep) => lockDocId(r.kayit_tarihi, r.birim);

  const handlePyOnay = async (r: KilitAcmaTalep) => {
    if (!window.confirm(`${r.kayit_tarihi} / ${r.birim} kilit açma talebini onaylıyor musunuz?`)) return;
    setBusy(rowKey(r));
    setStatus(null);
    const { data: { user: authUser } } = await db.auth.getUser();
    const { error: err } = await pyOnaylaKilitTalep(r.kayit_tarihi, r.birim, authUser?.id || '', authUser?.email);
    setStatus(err ? `Hata: ${err}` : 'Talep admin onayına iletildi.');
    setBusy(null);
    load();
  };

  const handlePyRed = async (r: KilitAcmaTalep) => {
    const nedeni = window.prompt('Red gerekçesi (en az 5 karakter):');
    if (!nedeni) return;
    setBusy(rowKey(r));
    const { data: { user: authUser } } = await db.auth.getUser();
    const { error: err } = await pyReddetKilitTalep(r.kayit_tarihi, r.birim, nedeni, authUser?.id || '', authUser?.email);
    setStatus(err ? `Hata: ${err}` : 'Talep reddedildi.');
    setBusy(null);
    load();
  };

  const handleAdminAc = async (r: KilitAcmaTalep) => {
    if (!window.confirm(`${r.kayit_tarihi} / ${r.birim} kilidi açılacak. Onaylıyor musunuz?`)) return;
    setBusy(rowKey(r));
    setStatus(null);
    const { data: { user: authUser } } = await db.auth.getUser();
    const kesinCol = db.collection(KESINLESEN_GUNLER) as {
      deleteById: (id: string) => Promise<{ success: boolean; error?: string }>;
    };
    const { success, error: delErr } = await kesinCol.deleteById(lockDocId(r.kayit_tarihi, r.birim));
    if (!success || delErr) {
      setStatus(`Kilit açma hatası: ${delErr || 'İşlem başarısız'}`);
      setBusy(null);
      return;
    }
    const { error: tamErr } = await tamamlaKilitAcmaTalep(
      r.kayit_tarihi,
      r.birim,
      authUser?.id || '',
      authUser?.email
    );
    if (tamErr) {
      setStatus(`Kilit açıldı ancak talep güncellenemedi: ${tamErr}`);
    } else {
      await writeAuditLog({
        action: 'lock_open',
        actorUid: authUser?.id || '',
        actorEmail: authUser?.email,
        birim: r.birim,
        kayit_tarihi: r.kayit_tarihi,
        details: { talep_eden_uid: r.talep_eden_uid }
      });
      setStatus('Kilit açıldı.');
    }
    setBusy(null);
    load();
  };

  const handleAdminRed = async (r: KilitAcmaTalep) => {
    const nedeni = window.prompt('Red gerekçesi (en az 5 karakter):');
    if (!nedeni) return;
    setBusy(rowKey(r));
    const { data: { user: authUser } } = await db.auth.getUser();
    const { error: err } = await adminReddetKilitTalep(
      r.kayit_tarihi,
      r.birim,
      nedeni,
      authUser?.id || '',
      authUser?.email
    );
    setStatus(err ? `Hata: ${err}` : 'Talep reddedildi.');
    setBusy(null);
    load();
  };

  const TalepList = ({
    rows,
    mode
  }: {
    rows: KilitAcmaTalep[];
    mode: 'py' | 'admin';
  }) => {
    if (rows.length === 0) {
      return <p className="text-sm text-slate-500">Bekleyen talep yok.</p>;
    }
    return (
      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={rowKey(r)}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40"
          >
            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              {r.kayit_tarihi} — {r.birim}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Talep: {r.talep_eden_email || r.talep_eden_uid} ·{' '}
              {new Date(r.talep_at).toLocaleString('tr-TR')}
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 italic">«{r.gerekce}»</p>
            {r.py_onay_at && mode === 'admin' && (
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1">
                PY onayı: {r.py_onay_email || r.py_onay_uid}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {mode === 'py' && (
                <>
                  <button
                    type="button"
                    disabled={busy === rowKey(r)}
                    onClick={() => handlePyOnay(r)}
                    className="min-h-[40px] px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-black disabled:opacity-50"
                  >
                    Onayla (admin’e ilet)
                  </button>
                  <button
                    type="button"
                    disabled={busy === rowKey(r)}
                    onClick={() => handlePyRed(r)}
                    className="min-h-[40px] px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black disabled:opacity-50"
                  >
                    Reddet
                  </button>
                </>
              )}
              {mode === 'admin' && (
                <>
                  <button
                    type="button"
                    disabled={busy === rowKey(r)}
                    onClick={() => handleAdminAc(r)}
                    className="min-h-[40px] px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-black disabled:opacity-50 flex items-center gap-1"
                  >
                    <LockOpen size={14} />
                    Kilidi aç
                  </button>
                  <button
                    type="button"
                    disabled={busy === rowKey(r)}
                    onClick={() => handleAdminRed(r)}
                    className="min-h-[40px] px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-black disabled:opacity-50"
                  >
                    Reddet
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div
      id="kilit-talepleri"
      className="scroll-mt-24 bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-rose-200 dark:border-rose-900"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
          <LockOpen className="text-rose-600 dark:text-rose-400" size={24} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Kilit açma talepleri</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Editör talep eder → proje yetkilisi onaylar → admin kilidi açar. Tüm adımlar denetim günlüğünde.
          </p>
        </div>
      </div>
      {status && (
        <p className="mb-3 text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={16} />
          {status}
        </p>
      )}
      {error && (
        <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 text-sm flex gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}. Firestore kurallarını yayınladığınızdan emin olun.</span>
        </div>
      )}
      {loading ? (
        <div className="py-6 flex justify-center">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {(isPy || isAdmin) && pyRows.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                Proje yetkilisi onayı bekleyen
              </h3>
              <TalepList rows={pyRows} mode="py" />
            </div>
          )}
          {isAdmin && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                Admin — kilidi açılabilir
              </h3>
              <TalepList rows={adminRows} mode="admin" />
            </div>
          )}
          {!loading && pyRows.length === 0 && adminRows.length === 0 && (
            <p className="text-sm text-slate-500">Şu an bekleyen kilit açma talebi yok.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default KilitAcmaTalepleriPanel;
