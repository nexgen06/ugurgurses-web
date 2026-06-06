import React, { useMemo, useState } from 'react';
import { GitCompare, TrendingUp, TrendingDown } from 'lucide-react';
import type { IslemKaydi, Birim } from '../types';
import {
  filterByMonth,
  totalOps,
  aggregateByCategory,
  pctChange,
  monthBounds,
  prevMonth,
  AY_ISIMLERI
} from '../report-stats';
import { TAVIM_BASLANGIC_AY } from '../constants';

interface Props {
  data: IslemKaydi[];
  selectedBirim: Birim | 'Tümü';
  defaultAy: string;
}

const getAylarOptions = () => {
  const now = new Date();
  const list: { value: string; label: string }[] = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (value < TAVIM_BASLANGIC_AY) break;
    list.push({
      value,
      label: `${AY_ISIMLERI[d.getMonth()]} ${d.getFullYear()}`
    });
  }
  return list;
};

const DashboardDonemKiyas: React.FC<Props> = ({ data, selectedBirim, defaultAy }) => {
  const opts = getAylarOptions();
  const [ayA, setAyA] = useState(defaultAy);
  const [ayB, setAyB] = useState(() => {
    const p = prevMonth(defaultAy);
    return p >= TAVIM_BASLANGIC_AY ? p : defaultAy;
  });

  const filtered = useMemo(() => {
    const scope =
      selectedBirim === 'Tümü'
        ? data
        : data.filter((r) => (r.birim || '').trim() === selectedBirim.trim());
    const recsA = filterByMonth(scope, ayA);
    const recsB = filterByMonth(scope, ayB);
    const topA = totalOps(recsA);
    const topB = totalOps(recsB);
    const catA = aggregateByCategory(recsA);
    const catB = aggregateByCategory(recsB);
    const allCats = [...new Set([...Object.keys(catA), ...Object.keys(catB)])].sort();
    const catRows = allCats.map((k) => ({
      k,
      a: catA[k] || 0,
      b: catB[k] || 0,
      pct: pctChange(catA[k] || 0, catB[k] || 0)
    }));
    return { topA, topB, totalPct: pctChange(topA, topB), catRows, labelA: monthBounds(ayA).label, labelB: monthBounds(ayB).label };
  }, [data, selectedBirim, ayA, ayB]);

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
        <GitCompare size={18} className="text-indigo-600" />
        Dönem karşılaştırması
      </h3>
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={ayA}
          onChange={(e) => setAyA(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold dark:[color-scheme:dark]"
        >
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-slate-400 dark:text-slate-500 font-bold text-xs self-center">vs</span>
        <select
          value={ayB}
          onChange={(e) => setAyB(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold dark:[color-scheme:dark]"
        >
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
          <p className="text-[10px] font-bold text-indigo-600 uppercase">{filtered.labelA}</p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{filtered.topA}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center">
          {filtered.totalPct != null ? (
            <div className={`flex items-center gap-1 font-black text-lg ${filtered.totalPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {filtered.totalPct >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              {filtered.totalPct >= 0 ? '+' : ''}
              {filtered.totalPct.toFixed(1)}%
            </div>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
        <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold text-violet-600 uppercase">{filtered.labelB}</p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{filtered.topB}</p>
        </div>
      </div>

      <div className="overflow-x-auto max-h-48 overflow-y-auto scrollbar-themed rounded-lg border border-transparent dark:border-slate-700/50 pr-1">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white dark:bg-slate-800 z-[1]">
            <tr className="text-left text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-600">
              <th className="py-2 pr-2">Kategori</th>
              <th className="py-2 pr-2 text-right">{filtered.labelA}</th>
              <th className="py-2 pr-2 text-right">{filtered.labelB}</th>
              <th className="py-2 text-right">Fark %</th>
            </tr>
          </thead>
          <tbody>
            {filtered.catRows.slice(0, 12).map((row) => (
              <tr key={row.k} className="border-b border-slate-100 dark:border-slate-700">
                <td className="py-1.5 pr-2 font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{row.k}</td>
                <td className="py-1.5 pr-2 text-right text-slate-700 dark:text-slate-300">{row.a}</td>
                <td className="py-1.5 pr-2 text-right text-slate-700 dark:text-slate-300">{row.b}</td>
                <td className={`py-1.5 text-right font-bold ${row.pct != null && row.pct > 0 ? 'text-emerald-600' : row.pct != null && row.pct < 0 ? 'text-rose-600' : ''}`}>
                  {row.pct != null ? `${row.pct >= 0 ? '+' : ''}${row.pct.toFixed(0)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardDonemKiyas;
