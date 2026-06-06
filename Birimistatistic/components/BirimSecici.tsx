import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Star, Clock, Building2, ChevronDown, X } from 'lucide-react';
import {
  loadBirimPrefs,
  trackRecentBirim,
  setFavoriteBirim,
  resolveInitialBirim
} from '../lib/birim-prefs';

export type BirimSecim = string | 'Tümü';

interface BirimSeciciProps {
  userId: string | undefined;
  allowedBirimler: string[];
  value: BirimSecim;
  onChange: (birim: BirimSecim) => void;
  allowTumu?: boolean;
  disabled?: boolean;
  className?: string;
}

const BirimSecici: React.FC<BirimSeciciProps> = ({
  userId,
  allowedBirimler,
  value,
  onChange,
  allowTumu = false,
  disabled = false,
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const [arama, setArama] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const prefs = userId ? loadBirimPrefs(userId) : null;
  const favori = prefs?.favoriBirim;
  const son = (prefs?.sonKullanilan || []).filter((b) => allowedBirimler.includes(b));

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtreli = useMemo(() => {
    const q = arama.trim().toLowerCase();
    const list = [...allowedBirimler].sort((a, b) => a.localeCompare(b, 'tr'));
    if (!q) return list;
    return list.filter((b) => b.toLowerCase().includes(q));
  }, [allowedBirimler, arama]);

  const pick = (b: BirimSecim) => {
    if (disabled) return;
    onChange(b);
    if (userId && b !== 'Tümü') trackRecentBirim(userId, b);
    setOpen(false);
    setArama('');
  };

  const toggleFavori = (e: React.MouseEvent, b: string) => {
    e.stopPropagation();
    if (!userId || disabled) return;
    setFavoriteBirim(userId, favori === b ? undefined : b);
  };

  const label = value === 'Tümü' ? 'Tümü' : value || 'Birim seçin…';
  const tekBirim = allowedBirimler.length === 1 && !allowTumu;

  if (tekBirim) {
    return (
      <div className={`px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 ${className}`}>
        {allowedBirimler[0]}
      </div>
    );
  }

  const Section = ({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) => {
    if (items.length === 0) return null;
    return (
      <div className="py-1">
        <p className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
          {icon}
          {title}
        </p>
        {items.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => pick(b)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 ${
              value === b ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800' : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            <span className="flex-1 truncate">{b}</span>
            {userId && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => toggleFavori(e, b)}
                onKeyDown={(e) => e.key === 'Enter' && toggleFavori(e as unknown as React.MouseEvent, b)}
                className={`p-1 rounded ${favori === b ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
                title={favori === b ? 'Favoriden çıkar' : 'Favori yap'}
              >
                <Star size={14} fill={favori === b ? 'currentColor' : 'none'} />
              </span>
            )}
          </button>
        ))}
      </div>
    );
  };

  const favoriList = favori && allowedBirimler.includes(favori) ? [favori] : [];
  const sonList = son.filter((b) => b !== favori && (!arama || b.toLowerCase().includes(arama.toLowerCase())));
  const digerList = filtreli.filter((b) => b !== favori && !son.includes(b));

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 disabled:opacity-70 text-left"
      >
        <Building2 size={16} className="text-emerald-600 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        {favori && value === favori && <Star size={14} className="text-amber-500 shrink-0" fill="currentColor" />}
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] max-h-[min(70vh,320px)] overflow-hidden flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              type="search"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Birim ara…"
              className="flex-1 bg-transparent text-sm outline-none text-slate-800 dark:text-slate-100"
              autoFocus
            />
            {arama && (
              <button type="button" onClick={() => setArama('')} className="text-slate-400">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {allowTumu && (
              <button
                type="button"
                onClick={() => pick('Tümü')}
                className={`w-full px-3 py-2.5 text-left text-sm font-bold border-b border-slate-100 dark:border-slate-700 ${
                  value === 'Tümü' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600'
                }`}
              >
                Tümü
              </button>
            )}
            <Section title="Favori" items={favoriList} icon={<Star size={10} />} />
            <Section title="Son kullanılan" items={sonList} icon={<Clock size={10} />} />
            <Section title={arama ? 'Arama sonucu' : 'Tüm birimler'} items={digerList} icon={<Building2 size={10} />} />
            {filtreli.length === 0 && !allowTumu && (
              <p className="p-4 text-center text-xs text-slate-400">Eşleşen birim yok</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { resolveInitialBirim };
export default BirimSecici;
