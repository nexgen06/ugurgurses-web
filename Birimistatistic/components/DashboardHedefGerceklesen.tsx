import React, { useEffect, useState, useMemo } from 'react';
import { Target } from 'lucide-react';
import type { IslemKaydi, Birim } from '../types';
import { getHedefler, type HedeflerStore } from '../hedefler-service';
import { filterByMonth, totalOps, hedefDurumu, monthBounds } from '../report-stats';

interface Props {
  selectedAy: string;
  selectedBirim: Birim | 'Tümü';
  data: IslemKaydi[];
}

const DURUM_STYLES = {
  yesil: 'bg-emerald-500',
  sari: 'bg-amber-500',
  kirmizi: 'bg-rose-500',
  yok: 'bg-slate-300 dark:bg-slate-600'
};

const DashboardHedefGerceklesen: React.FC<Props> = ({ selectedAy, selectedBirim, data }) => {
  const [store, setStore] = useState<HedeflerStore>({});

  useEffect(() => {
    getHedefler().then(setStore);
    const onUpd = () => getHedefler().then(setStore);
    window.addEventListener('hedefler_updated', onUpd);
    return () => window.removeEventListener('hedefler_updated', onUpd);
  }, []);

  const items = useMemo(() => {
    const ayHedef = store[selectedAy];
    if (!ayHedef) return [];
    const monthData = filterByMonth(data, selectedAy);
    const birimler =
      selectedBirim !== 'Tümü' ? [selectedBirim] : Object.keys(ayHedef).filter((b) => ayHedef[b]?.toplam);
    return birimler
      .map((birim) => {
        const hedef = ayHedef[birim]?.toplam;
        const gercek = totalOps(monthData.filter((r) => (r.birim || '').trim() === birim.trim()));
        const durum = hedefDurumu(gercek, hedef);
        const oran = hedef && hedef > 0 ? Math.min(100, Math.round((gercek / hedef) * 100)) : 0;
        return { birim, hedef, gercek, durum, oran };
      })
      .filter((x) => x.hedef != null && x.hedef > 0);
  }, [store, selectedAy, selectedBirim, data]);

  if (items.length === 0) return null;

  const { label } = monthBounds(selectedAy);

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
        <Target size={18} className="text-emerald-600" />
        Hedef – gerçekleşen ({label})
      </h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.birim}>
            <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              <span className="truncate pr-2">{item.birim}</span>
              <span>
                {item.gercek} / {item.hedef} ({item.oran}%)
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${DURUM_STYLES[item.durum]}`}
                style={{ width: `${Math.min(100, item.oran)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {item.durum === 'yesil' && 'Hedef tamamlandı'}
              {item.durum === 'sari' && 'Hedefe yakın (%80+)'}
              {item.durum === 'kirmizi' && 'Hedefin altında'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardHedefGerceklesen;
