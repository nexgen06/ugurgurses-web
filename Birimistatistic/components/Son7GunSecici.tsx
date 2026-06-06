import React from 'react';
import { getRecentDays, formatGunChip } from '../lib/entry-date-utils';
import { isHaftasonuTarihi } from '../lib/date-policy';
import { todayIso } from '../lib/user-prefs';

interface Son7GunSeciciProps {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  /** Giriş formunda daha az dikey yer kaplar */
  compact?: boolean;
  /** Bu tarihten önceki günler listede gösterilmez (admin dışı: kesim tarihi) */
  minIso?: string;
}

const Son7GunSecici: React.FC<Son7GunSeciciProps> = ({ value, onChange, disabled, compact, minIso }) => {
  const days = getRecentDays(7, undefined, minIso);

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      {!compact && (
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Son 7 gün
        </p>
      )}
      <div
        className={`flex gap-1.5 overflow-x-auto snap-x snap-mandatory touch-pan-x ${
          compact ? 'pb-0.5 -mx-0.5 px-0.5' : 'pb-2 -mx-1 px-1'
        }`}
      >
        {days.map((iso) => {
          const secili = value === iso;
          const bugun = iso === todayIso();
          const haftasonu = isHaftasonuTarihi(iso);
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              title={haftasonu ? 'Haftasonu — giriş kapalı' : undefined}
              className={`shrink-0 snap-start rounded-xl text-xs font-bold transition-all border-2 touch-manipulation ${
                compact
                  ? 'px-2.5 py-1.5 min-w-[4.25rem] min-h-[40px]'
                  : 'px-4 py-3 min-w-[5.25rem] min-h-[52px]'
              } ${
                secili && haftasonu
                  ? 'bg-slate-400/90 border-slate-400/80 text-white/90 shadow-sm'
                  : secili
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                    : haftasonu
                      ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-600/50 text-slate-400 dark:text-slate-500 opacity-70'
                      : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-emerald-400'
              } ${bugun && !secili && !haftasonu ? 'ring-1 ring-emerald-300 dark:ring-emerald-700' : ''} disabled:opacity-50`}
            >
              <span className="block">{formatGunChip(iso)}</span>
              <span
                className={`block text-[10px] mt-0.5 font-mono ${
                  secili ? (haftasonu ? 'text-white/70' : 'text-emerald-100') : 'text-slate-400'
                }`}
              >
                {haftasonu ? 'Haftasonu' : iso.slice(5).replace('-', '/')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Son7GunSecici;
