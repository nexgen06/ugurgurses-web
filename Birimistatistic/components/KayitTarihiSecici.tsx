import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { isTakvimAyiSecilebilir, isHaftasonuTarihi } from '../date-policy';

const AY_ADLARI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const GUN_KISA = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

type CalendarCell = { iso: string; day: number; inMonth: boolean };

function parseIso(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Pazartesi ile başlayan ay ızgarası */
function buildCalendarMonth(year: number, month: number): CalendarCell[] {
  const cells: CalendarCell[] = [];
  const first = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  let start = first.getDay();
  start = start === 0 ? 6 : start - 1;

  for (let i = start - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, -i);
    cells.push({
      iso: toIso(d.getFullYear(), d.getMonth() + 1, d.getDate()),
      day: d.getDate(),
      inMonth: false
    });
  }
  for (let d = 1; d <= lastDay; d++) {
    cells.push({ iso: toIso(year, month, d), day: d, inMonth: true });
  }
  let pad = 1;
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month, pad);
    cells.push({
      iso: toIso(d.getFullYear(), d.getMonth() + 1, d.getDate()),
      day: d.getDate(),
      inMonth: false
    });
    pad++;
  }
  return cells;
}

interface KayitTarihiSeciciProps {
  value: string;
  onChange: (iso: string) => void;
  min: string;
  max: string;
  disabled?: boolean;
  className?: string;
}

const KayitTarihiSecici: React.FC<KayitTarihiSeciciProps> = ({
  value,
  onChange,
  min,
  max,
  disabled = false,
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<'month' | 'year' | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const parsed = parseIso(value);
  const [viewY, setViewY] = useState(parsed.y);
  const [viewM, setViewM] = useState(parsed.m);

  const minParsed = parseIso(min);
  const maxParsed = parseIso(max);

  useEffect(() => {
    const p = parseIso(value);
    setViewY(p.y);
    setViewM(p.m);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setMenu(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = minParsed.y; y <= maxParsed.y; y++) list.push(y);
    return list;
  }, [minParsed.y, maxParsed.y]);

  const cells = useMemo(() => buildCalendarMonth(viewY, viewM), [viewY, viewM]);

  const isSelectable = (iso: string) => iso >= min && iso <= max;

  const pickDay = (iso: string) => {
    if (!isSelectable(iso)) return;
    onChange(iso);
    setOpen(false);
    setMenu(null);
  };

  const pickMonth = (m: number) => {
    if (!isTakvimAyiSecilebilir(viewY, m, min)) return;
    setViewM(m);
    setMenu(null);
  };

  const pickYear = (y: number) => {
    setViewY(y);
    if (!isTakvimAyiSecilebilir(y, viewM, min)) {
      const minP = parseIso(min);
      setViewM(y === minP.y ? minP.m : 1);
    }
    setMenu(null);
  };

  const triggerLabel = useMemo(() => {
    const d = new Date(value + 'T12:00:00');
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [value]);

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((v) => !v);
    setMenu(null);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-left font-bold text-sm text-slate-800 dark:text-slate-100 shadow-sm transition-all hover:border-violet-400 dark:hover:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Calendar size={16} className="shrink-0 text-violet-600 dark:text-violet-400" />
        <span className="flex-1 truncate">{triggerLabel}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Tarih seçici"
          className="absolute left-0 sm:left-auto sm:right-0 z-50 mt-2 w-[min(100vw-1.5rem,19.5rem)] rounded-2xl border border-slate-200/80 dark:border-slate-600/80 bg-white dark:bg-[#1e1e2d] shadow-xl shadow-slate-900/10 dark:shadow-black/40 p-4 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="relative">
            {/* Başlık: ay + yıl */}
            <div className="flex items-center justify-center gap-6 pb-3 border-b border-slate-100 dark:border-slate-600/60">
              <button
                type="button"
                onClick={() => setMenu((m) => (m === 'month' ? null : 'month'))}
                className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-white hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
              >
                {AY_ADLARI[viewM - 1]}
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${menu === 'month' ? 'rotate-180' : ''}`}
                />
              </button>
              <button
                type="button"
                onClick={() => setMenu((m) => (m === 'year' ? null : 'year'))}
                className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-white hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
              >
                {viewY}
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${menu === 'year' ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {/* Ay listesi */}
            {menu === 'month' && (
              <div className="absolute left-0 top-12 z-10 w-36 max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#252536] shadow-lg py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                {AY_ADLARI.map((ad, i) => {
                  const m = i + 1;
                  const secili = m === viewM;
                  const aktif = isTakvimAyiSecilebilir(viewY, m, min);
                  return (
                    <button
                      key={ad}
                      type="button"
                      disabled={!aktif}
                      onClick={() => pickMonth(m)}
                      className={`block w-[calc(100%-0.75rem)] mx-auto text-left px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                        secili
                          ? 'bg-[#5856d6] text-white'
                          : aktif
                            ? 'text-slate-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-white/10'
                            : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {ad}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Yıl listesi */}
            {menu === 'year' && (
              <div className="absolute right-0 top-12 z-10 w-24 max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#252536] shadow-lg py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                {yearOptions.map((y) => {
                  const secili = y === viewY;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => pickYear(y)}
                      className={`block w-[calc(100%-0.75rem)] mx-auto text-center px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                        secili
                          ? 'bg-[#5856d6] text-white'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-white/10'
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Gün başlıkları */}
            <div className="grid grid-cols-7 gap-0.5 mt-3 mb-2">
              {GUN_KISA.map((g, i) => (
                <div
                  key={g}
                  className={`text-center text-[11px] font-semibold py-1 ${
                    i >= 5 ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {g}
                </div>
              ))}
            </div>

            {/* Gün ızgarası */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((cell) => {
                const secili = cell.iso === value;
                const secilebilir = isSelectable(cell.iso);
                const bugun = cell.iso === max;
                const haftasonu = cell.inMonth && isHaftasonuTarihi(cell.iso);
                return (
                  <button
                    key={`${cell.iso}-${cell.inMonth}`}
                    type="button"
                    disabled={!secilebilir}
                    onClick={() => pickDay(cell.iso)}
                    title={haftasonu ? 'Haftasonu — giriş kapalı' : undefined}
                    className={`
                      relative flex flex-col items-center justify-center h-9 w-full text-sm font-semibold rounded-full transition-all
                      ${!cell.inMonth ? 'text-slate-300 dark:text-slate-600' : ''}
                      ${cell.inMonth && !secili && secilebilir && !haftasonu ? 'text-slate-800 dark:text-slate-100 hover:bg-violet-50 dark:hover:bg-white/10' : ''}
                      ${cell.inMonth && haftasonu && !secili ? 'text-slate-400 dark:text-slate-500 opacity-45' : ''}
                      ${cell.inMonth && !secilebilir ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : ''}
                      ${secili && haftasonu ? 'bg-slate-400/90 dark:bg-slate-600 text-white/90 shadow-sm' : ''}
                      ${secili && !haftasonu ? 'bg-[#5856d6] text-white shadow-md shadow-violet-500/30' : ''}
                      ${bugun && !secili && secilebilir && !haftasonu ? 'ring-1 ring-violet-400/60 dark:ring-violet-500/50' : ''}
                    `}
                  >
                    <span>{cell.day}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KayitTarihiSecici;
