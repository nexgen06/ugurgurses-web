import React, { useEffect, useState } from 'react';
import { Mail, X, FileCheck } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useBirimler } from '../contexts/BirimlerContext';
import { getAllowedBirimler, canFinalize } from '../contexts/UserContext';
import {
  buildWeeklyFinalizeSummary,
  formatWeeklySummaryText,
  weeklySummaryMailto,
  getWeekId,
  type WeeklyFinalizeSummary
} from '../weekly-finalize-summary';
import { getAkisConfig } from '../akis-config-service';

const STORAGE_KEY = 'birimistatistik_weekly_digest_seen';

const WeeklyFinalizeDigest: React.FC = () => {
  const user = useUser();
  const { birimler } = useBirimler();
  const [summary, setSummary] = useState<WeeklyFinalizeSummary | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ozetEnabled, setOzetEnabled] = useState(false);

  useEffect(() => {
    if (!user || !canFinalize(user)) {
      setOzetEnabled(false);
      setSummary(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const config = await getAkisConfig();
      if (cancelled) return;
      if (!config.haftalik_ozet_aktif) {
        setOzetEnabled(false);
        setSummary(null);
        setDismissed(true);
        setLoading(false);
        return;
      }
      setOzetEnabled(true);
      const weekId = getWeekId();
      if (localStorage.getItem(`${STORAGE_KEY}_${user.id}_${weekId}`) === '1') {
        setDismissed(true);
        setSummary(null);
        setLoading(false);
        return;
      }
      setDismissed(false);
      setLoading(true);
      const allowed = getAllowedBirimler(user, birimler);
      const s = await buildWeeklyFinalizeSummary(allowed);
      if (cancelled) return;
      setSummary(s);
      setLoading(false);
    };

    void load();
    const onConfig = () => void load();
    window.addEventListener('akis_config_updated', onConfig);
    return () => {
      cancelled = true;
      window.removeEventListener('akis_config_updated', onConfig);
    };
  }, [user?.id, birimler.join('|')]);

  const dismiss = () => {
    if (user) localStorage.setItem(`${STORAGE_KEY}_${user.id}_${getWeekId()}`, '1');
    setDismissed(true);
  };

  if (!user || !canFinalize(user) || !ozetEnabled || dismissed || loading || !summary) return null;

  const mailto = user.email ? weeklySummaryMailto(summary, user.email) : null;

  return (
    <div className="mb-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 shrink-0">
            <FileCheck className="text-indigo-600 dark:text-indigo-400" size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-indigo-900 dark:text-indigo-100">Haftalık kesinleştirme özeti</p>
            <p className="text-sm text-indigo-800/90 dark:text-indigo-200/90 mt-1 leading-relaxed">
              Bu hafta <strong>{summary.kilitlenenGun}</strong> gün kilitlendi,{' '}
              <strong>{summary.bekleyenGun}</strong> gün bekliyor. En yüksek kategori:{' '}
              <strong>{summary.enYuksekKategori}</strong> ({summary.enYuksekKategoriAdet} işlem).
            </p>
            <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-1">
              {summary.weekStart} – {summary.weekEnd} · Sayılar resmileşti
            </p>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="p-1 text-indigo-400 hover:text-indigo-700 shrink-0" aria-label="Kapat">
          <X size={18} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {mailto && (
          <a
            href={mailto}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500"
          >
            <Mail size={14} />
            E-posta taslağı
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(formatWeeklySummaryText(summary));
            dismiss();
          }}
          className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 text-xs font-bold text-indigo-700"
        >
          Metni kopyala
        </button>
        <button type="button" onClick={dismiss} className="px-3 py-2 text-xs font-bold text-indigo-600">
          Tamam
        </button>
      </div>
    </div>
  );
};

export default WeeklyFinalizeDigest;
