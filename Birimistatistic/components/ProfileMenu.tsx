import React, { useState, useRef, useEffect } from 'react';
import {
  LogOut,
  ChevronDown,
  Shield,
  Building2,
  UserCircle,
  Check,
  X
} from 'lucide-react';
import { db } from '../db';
import type { SessionUser } from '../types';
import { ROLE_LABELS } from '../lib/role-labels';
import { useBirimler } from '../contexts/BirimlerContext';
import {
  canAdmin,
  canEnterData,
  canFinalize,
  canViewNamedReports,
  needsBirimAssignment
} from '../contexts/UserContext';
import { getDisplayName, getAvatarInitials } from '../lib/user-display';

const ROLE_BADGE: Record<SessionUser['role'], string> = {
  admin: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  proje_yetkilisi: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  editor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  viewer: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
};

interface ProfileMenuProps {
  user: SessionUser;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({ user }) => {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<'menu' | 'profil' | 'yetkiler'>('menu');
  const ref = useRef<HTMLDivElement>(null);
  const { birimler: allBirimler } = useBirimler();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPanel('menu');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setPanel('menu');
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await db.auth.signOut();
  };

  const yetkiler = [
    { label: 'Veri girişi', ok: canEnterData(user) },
    { label: 'Gün kesinleştirme', ok: canFinalize(user) },
    { label: 'İsimli raporlar (tüm personel)', ok: canViewNamedReports(user) },
    { label: 'Sistem yönetimi', ok: canAdmin(user) }
  ];

  const atanmisBirimler = user.role === 'admin'
    ? allBirimler
    : (user.birimler || []).filter((b) => allBirimler.includes(b));

  const displayName = getDisplayName(user);
  const hasName = Boolean((user.ad || '').trim() && (user.soyad || '').trim());

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setPanel('menu');
        }}
        className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-2xl border transition-all ${
          open
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
            : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-600'
        }`}
        aria-expanded={open}
        aria-haspopup="true"
        title="Profil menüsü"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-sm font-black shadow-sm">
          {getAvatarInitials(user)}
        </div>
        <div className="hidden sm:flex flex-col items-start max-w-[160px]">
          {hasName ? (
            <>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate w-full text-left">
                {displayName}
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 truncate w-full text-left">
                Hoş Geldiniz
              </span>
            </>
          ) : (
            <>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate w-full text-left">
                {user.email?.split('@')[0]}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${ROLE_BADGE[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform hidden sm:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,320px)] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-600 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {panel === 'menu' && (
            <>
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50">
                {hasName ? (
                  <>
                    <p className="text-base font-black text-slate-800 dark:text-slate-100">{displayName}</p>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">Hoş Geldiniz</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 break-all">{user.email}</p>
                  </>
                ) : (
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 break-all">{user.email}</p>
                )}
                <span className={`inline-block mt-2 text-[11px] font-bold px-2 py-1 rounded-lg ${ROLE_BADGE[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => setPanel('profil')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors"
                >
                  <UserCircle size={18} className="text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Profilim</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPanel('yetkiler')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors"
                >
                  <Shield size={18} className="text-sky-600" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Yetkilerim</span>
                </button>
              </div>
              <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="text-sm font-bold">Oturumu kapat</span>
                </button>
              </div>
            </>
          )}

          {panel === 'profil' && (
            <div className="p-4">
              <button
                type="button"
                onClick={() => setPanel('menu')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-3 hover:underline"
              >
                ← Menü
              </button>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-3">Profilim</h3>
              <dl className="space-y-3 text-sm">
                {hasName && (
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ad Soyad</dt>
                    <dd className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{displayName}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">E-posta</dt>
                  <dd className="font-semibold text-slate-800 dark:text-slate-200 break-all mt-0.5">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rol</dt>
                  <dd className="mt-0.5">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${ROLE_BADGE[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kullanıcı kimliği</dt>
                  <dd className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 break-all">{user.id}</dd>
                </div>
              </dl>
            </div>
          )}

          {panel === 'yetkiler' && (
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setPanel('menu')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-3 hover:underline"
              >
                ← Menü
              </button>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-3">Yetkilerim</h3>

              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Sistem yetkileri</p>
              <ul className="space-y-1.5 mb-4">
                {yetkiler.map((y) => (
                  <li key={y.label} className="flex items-center gap-2 text-sm">
                    {y.ok ? (
                      <Check size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <X size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    )}
                    <span className={y.ok ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}>{y.label}</span>
                  </li>
                ))}
              </ul>

              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                <Building2 size={12} /> Atanmış birimler
              </p>
              {needsBirimAssignment(user) ? (
                <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                  Henüz birim atanmadı. Yöneticinize başvurun.
                </p>
              ) : atanmisBirimler.length === 0 ? (
                <p className="text-xs text-slate-500">Tanımlı birim yok.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {atanmisBirimler.map((b) => (
                    <span
                      key={b}
                      className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
