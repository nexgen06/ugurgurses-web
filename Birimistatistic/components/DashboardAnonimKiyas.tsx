import React, { useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
import type { IslemKaydi } from '../types';
import { editorAnonimKiyas } from '../report-stats';

interface Props {
  userId: string | undefined;
  selectedBirim: string;
  data: IslemKaydi[];
  selectedAy: string;
}

const BAND_STYLE = {
  dusuk: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300',
  orta: 'bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 border-sky-200',
  yuksek: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-300'
};

const DashboardAnonimKiyas: React.FC<Props> = ({ userId, selectedBirim, data, selectedAy }) => {
  const kiyas = useMemo(() => {
    if (!userId || selectedBirim === 'Tümü') return null;
    const ayData = data.filter(
      (r) => r.kayit_tarihi?.startsWith(selectedAy) && (r.birim || '').trim() === selectedBirim.trim()
    );
    const myTotal = ayData
      .filter((r) => (r as { user_id?: string }).user_id === userId)
      .reduce((s, r) => s + (r.islem_sayisi || 0), 0);
    return editorAnonimKiyas(myTotal, ayData, userId);
  }, [userId, selectedBirim, data, selectedAy]);

  if (!kiyas) return null;

  return (
    <div
      className={`p-4 rounded-2xl border-2 ${BAND_STYLE[kiyas.band]}`}
      aria-label="Anonim birim kıyası"
    >
      <div className="flex items-start gap-3">
        <BarChart2 size={22} className="shrink-0 opacity-80" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
            Anonim kıyas · {kiyas.bandLabel} performans bandı
          </p>
          <p className="text-sm font-bold leading-snug">{kiyas.message}</p>
          <p className="text-[10px] mt-1 opacity-70">Kişi adı gösterilmez; yalnızca birim ortalaması ile kıyas.</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardAnonimKiyas;
