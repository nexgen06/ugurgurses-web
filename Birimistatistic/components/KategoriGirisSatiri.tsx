import React from 'react';
import { Plus } from 'lucide-react';
import type { IslemTuru } from '../types';

type Props = {
  turu: IslemTuru;
  birimOzel: boolean;
  toplam: number;
  canEdit: boolean;
  busy: boolean;
  loading: boolean;
  flashed: boolean;
  ekleMiktar: string;
  onEkleMiktarChange: (value: string) => void;
  onToplamChange: (value: number) => void;
  onEkle: (delta: number) => void;
  variant: 'kart' | 'liste';
  /** Görünen ad (kayıt anahtarından farklı olabilir) */
  etiket?: string;
  /** Kategoriler listesinin üstündeki vurgulu alan */
  highlighted?: boolean;
};

const TOOLBAR_DESKTOP_LISTE =
  'grid grid-cols-[3rem_3rem_3.25rem_minmax(4.5rem,1fr)] gap-1.5 w-[18rem] max-w-full';
const TOOLBAR_DESKTOP_KART = 'grid grid-cols-[1fr_1fr_1.05fr_1.35fr] gap-1.5 w-full';
const TOOLBAR_MOBILE =
  'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.3fr)] gap-2 w-full touch-manipulation';

/** Boşken hücre ortasında «Adet» ipucu (input üstüne bindirilir, tıklama geçer) */
function AdetHucresi({
  turu,
  value,
  onChange,
  mobile
}: {
  turu: string;
  value: string;
  onChange: (v: string) => void;
  mobile: boolean;
}) {
  const bos = !String(value ?? '').trim();
  const kutu = mobile
    ? 'h-12 min-h-[48px] rounded-xl text-lg'
    : 'h-10 rounded-lg text-sm';

  return (
    <div className={`relative min-w-0 w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus-within:border-emerald-500 ${kutu}`}>
      <input
        type="number"
        min={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${turu} eklenecek adet`}
        className={`absolute inset-0 w-full h-full min-w-0 bg-transparent text-center font-black tabular-nums text-slate-900 dark:text-white outline-none z-10 ${mobile ? 'text-lg' : 'text-sm'}`}
      />
      {bos && (
        <span
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center font-semibold text-slate-500 dark:text-slate-400 select-none"
          style={{ fontSize: mobile ? '11px' : '10px' }}
          aria-hidden
        >
          Adet
        </span>
      )}
    </div>
  );
}

function EkleToolbar({
  turu,
  mobile,
  desktopClass,
  canEdit,
  busy,
  loading,
  ekleMiktar,
  delta,
  onEkleMiktarChange,
  onEkle
}: {
  turu: string;
  mobile: boolean;
  desktopClass: string;
  canEdit: boolean;
  busy: boolean;
  loading: boolean;
  ekleMiktar: string;
  delta: number;
  onEkleMiktarChange: (v: string) => void;
  onEkle: (d: number) => void;
}) {
  if (!canEdit) return null;

  const btn = mobile
    ? 'h-12 min-h-[48px] flex items-center justify-center rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-base font-black text-slate-800 dark:text-slate-100 active:bg-emerald-100 dark:active:bg-emerald-900/30 disabled:opacity-40'
    : 'h-10 flex items-center justify-center rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm font-black text-slate-800 dark:text-slate-100 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/25 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all';

  const ekleBtn = mobile
    ? 'h-12 min-h-[48px] flex items-center justify-center gap-1 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white text-sm font-black disabled:opacity-40'
    : 'h-10 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black disabled:opacity-40 transition-colors';

  return (
    <div className={mobile ? TOOLBAR_MOBILE : desktopClass}>
      <button type="button" className={btn} disabled={busy || loading} onClick={() => onEkle(1)}>
        +1
      </button>
      <button type="button" className={btn} disabled={busy || loading} onClick={() => onEkle(5)}>
        +5
      </button>
      <AdetHucresi turu={turu} value={ekleMiktar} onChange={onEkleMiktarChange} mobile={mobile} />
      <button type="button" className={ekleBtn} disabled={busy || loading || delta <= 0} onClick={() => onEkle(delta)}>
        {busy ? (
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <Plus size={mobile ? 18 : 14} strokeWidth={3} />
            <span>Ekle</span>
          </>
        )}
      </button>
    </div>
  );
}

export function KategoriGirisSatiri({
  turu,
  birimOzel,
  toplam,
  canEdit,
  busy,
  loading,
  flashed,
  ekleMiktar,
  onEkleMiktarChange,
  onToplamChange,
  onEkle,
  variant,
  etiket,
  highlighted
}: Props) {
  const baslik = etiket || turu;
  const delta = Math.max(0, parseInt(ekleMiktar, 10) || 0);
  const isKart = variant === 'kart';
  const flashCls = flashed
    ? 'bg-emerald-50 dark:bg-emerald-900/25 border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-400/25'
    : highlighted
      ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/30'
      : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800';

  const toolbarProps = {
    turu,
    canEdit,
    busy,
    loading,
    ekleMiktar,
    delta,
    onEkleMiktarChange,
    onEkle
  };

  const toplamInputMobile = (
    <input
      type="number"
      min={0}
      step={1}
      inputMode="numeric"
      value={toplam}
      onChange={(e) => onToplamChange(parseInt(e.target.value, 10) || 0)}
      onFocus={(e) => e.target.select()}
      placeholder="0"
      disabled={!canEdit}
      className="h-14 w-full px-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-center font-black text-3xl tabular-nums text-slate-900 dark:text-white focus:border-emerald-500 outline-none disabled:opacity-50 touch-manipulation"
    />
  );

  const toplamInputDesktop = (
    <input
      type="number"
      min={0}
      step={1}
      inputMode="numeric"
      value={toplam}
      onChange={(e) => onToplamChange(parseInt(e.target.value, 10) || 0)}
      onFocus={(e) => e.target.select()}
      placeholder="0"
      disabled={!canEdit}
      className={
        isKart
          ? 'h-12 w-full max-w-[5.5rem] mx-auto px-2 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-center font-black text-2xl tabular-nums text-slate-900 dark:text-white focus:border-emerald-500 outline-none disabled:opacity-50'
          : 'h-10 w-[5.5rem] px-2 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center font-black text-xl tabular-nums text-slate-900 dark:text-white focus:border-emerald-500 outline-none disabled:opacity-50'
      }
    />
  );

  const kategoriBaslik = (
    <>
      <h3 className="text-sm sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
        {baslik}
        {birimOzel && (
          <span className="text-[9px] font-black uppercase text-sky-600 dark:text-sky-400 ml-1.5">(birim)</span>
        )}
      </h3>
    </>
  );

  /* ——— Mobil: tek kart, büyük dokunma alanları ——— */
  const mobileCard = (
    <article className={`sm:hidden rounded-2xl ${highlighted ? 'border-0 px-3 pb-3' : `border-2 p-4`} flex flex-col gap-3 transition-colors ${highlighted ? '' : flashCls}`}>
      {kategoriBaslik}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
          Bugünkü toplamınız
        </p>
        {toplamInputMobile}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
          Evrak ekle
        </p>
        <EkleToolbar {...toolbarProps} mobile desktopClass="" />
      </div>
    </article>
  );

  /* ——— Masaüstü kart (bugünkü tablo) ——— */
  if (isKart) {
    return (
      <>
        {mobileCard}
        <article
          className={`hidden sm:flex sm:flex-col rounded-2xl ${highlighted ? 'border-0 px-3 pb-3' : 'border-2 p-3'} gap-2.5 transition-colors ${highlighted ? '' : flashCls}`}
        >
          <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-snug line-clamp-2 min-h-[2rem]">
            {baslik}
            {birimOzel && (
              <span className="text-[8px] font-black uppercase text-sky-600 dark:text-sky-400 block">birim</span>
            )}
          </h3>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Toplam</span>
            {toplamInputDesktop}
          </div>
          <EkleToolbar {...toolbarProps} mobile={false} desktopClass={TOOLBAR_DESKTOP_KART} />
        </article>
      </>
    );
  }

  /* ——— Masaüstü liste (tablo satırı) ——— */
  return (
    <>
      {mobileCard}
      <article
        className={`hidden sm:grid sm:grid-cols-[minmax(0,1fr)_5.5rem_18rem] sm:gap-3 sm:items-center px-3 py-2.5 ${
          highlighted
            ? 'border-0 pb-3'
            : flashed
              ? 'border-b border-slate-100 dark:border-slate-700 bg-emerald-50/90 dark:bg-emerald-900/20'
              : 'border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/70 dark:hover:bg-slate-700/20'
        }`}
      >
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug py-0.5">
          {baslik}
          {birimOzel && (
            <span className="text-[8px] font-black uppercase text-sky-600 dark:text-sky-400 ml-1">(birim)</span>
          )}
        </h3>
        <div className="text-center">{toplamInputDesktop}</div>
        <div className="justify-self-end w-[18rem]">
          {canEdit ? (
            <EkleToolbar {...toolbarProps} mobile={false} desktopClass={TOOLBAR_DESKTOP_LISTE} />
          ) : (
            <span className="text-[10px] text-slate-400">Salt okunur</span>
          )}
        </div>
      </article>
    </>
  );
}

export function KategoriGirisBaslik() {
  return (
    <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_5.5rem_18rem] gap-3 px-3 py-2 bg-slate-100/80 dark:bg-slate-700/40 border-b border-slate-200 dark:border-slate-600">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Kategori</span>
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Toplam</span>
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-right pr-1">
        +1 · +5 · adet · Ekle
      </span>
    </div>
  );
}
