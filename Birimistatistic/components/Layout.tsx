
import React, { useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Database,
  Menu,
  Moon,
  Sun,
  ChevronRight,
  Settings,
  AlertCircle
} from 'lucide-react';
import ProfileMenu from './ProfileMenu';
import OperationalAlerts from './OperationalAlerts';
import DuyuruBanner from './DuyuruBanner';
import GorevKarti from './GorevKarti';
import WeeklyFinalizeDigest from './WeeklyFinalizeDigest';
import { useTheme } from '../contexts/ThemeContext';
import { useBreadcrumb } from '../contexts/BreadcrumbContext';
import { useUser, canAdmin, canEnterData, canFinalize, needsBirimAssignment } from '../contexts/UserContext';
import { useConnectionStatus } from '../hooks/use-connection-status';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'entry' | 'reports' | 'management';
  setActiveTab: (tab: 'dashboard' | 'entry' | 'reports' | 'management') => void;
  user: any;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user }) => {
  const { theme, toggleTheme } = useTheme();
  const { suffix } = useBreadcrumb();
  const currentUser = useUser();
  const showManagement = canAdmin(currentUser) || canFinalize(currentUser);
  const showEntry = canEnterData(currentUser);
  const showBirimBanner = needsBirimAssignment(currentUser);
  const connection = useConnectionStatus(Boolean(currentUser));

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(showEntry ? [{ id: 'entry', label: 'Giriş İşlemleri', icon: PlusCircle }] : []),
    { id: 'reports', label: 'Raporlar', icon: FileText },
    ...(showManagement ? [{ id: 'management', label: 'Yönetim', icon: Settings }] : []),
  ];

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 bg-[#001E2B] dark:bg-[#001118] text-white flex flex-col transition-all duration-300 border-r border-transparent dark:border-slate-800">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-[#00ED64] p-2.5 rounded-xl shadow-lg shadow-emerald-950/50">
            <Database size={24} className="text-[#001E2B]" />
          </div>
          <div className="hidden md:block">
            <h2 className="font-black text-sm tracking-tight leading-tight">Sicil Veri</h2>
            <p className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase">Engine v1.0</p>
          </div>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-[#00ED64] text-[#001E2B] shadow-xl shadow-emerald-950/20 font-black' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={20} strokeWidth={activeTab === item.id ? 3 : 2} />
              <span className="hidden md:block text-sm">{item.label}</span>
              {activeTab === item.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#001E2B] hidden md:block"></div>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <p className="px-4 pb-4 text-center font-imza text-[#00ED64] text-lg md:text-xl font-semibold">Powered by gürses</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 sm:h-24 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-10 grid grid-cols-[1fr_auto_1fr] sm:grid-cols-3 items-center shadow-sm relative z-10 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <button className="md:hidden p-2 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <Menu size={20} className="text-slate-800 dark:text-slate-200" />
            </button>
            <div className="flex flex-col min-w-0 flex-1">
              <nav className="flex items-center gap-1.5 mb-0.5" aria-label="Breadcrumb">
                <h1 className="text-slate-800 dark:text-slate-100 font-black text-lg sm:text-2xl tracking-tight truncate">
                  {navItems.find(i => i.id === activeTab)?.label}
                </h1>
                {suffix != null && suffix !== '' && (
                  <>
                    <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 shrink-0" aria-hidden />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base sm:text-lg truncate">{suffix}</span>
                  </>
                )}
              </nav>
              <div
                className="flex items-center gap-2 mt-0.5"
                title={
                  connection.status === 'stable'
                    ? 'İnternet ve Firestore sunucusu erişilebilir'
                    : connection.status === 'offline'
                      ? 'Ağ veya sunucu bağlantısı yok'
                      : connection.status === 'limited'
                        ? 'Veriler önbellekten; sunucu henüz doğrulanamadı'
                        : 'Bağlantı kontrol ediliyor'
                }
              >
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest hidden sm:inline">
                  Sistem Durumu:
                </span>
                <div className="flex items-center gap-1">
                  <div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${connection.dotClass} ${connection.pulse ? 'animate-pulse' : ''}`}
                    aria-hidden
                  />
                  <span className={`text-[10px] font-bold ${connection.textClass}`}>{connection.label}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center">
            <img src="./ankara.png" alt="" className="h-20 max-h-[5.5rem] w-auto object-contain hidden sm:block" />
          </div>
          
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-all"
              title={theme === 'light' ? 'Karanlık mod' : 'Aydınlık mod'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            {currentUser && <ProfileMenu user={currentUser} />}
          </div>
        </header>

        {/* Content Area */}
        <div
          className={`flex-1 overflow-y-auto bg-[#F9FBFA] dark:bg-slate-900/50 transition-colors ${
            activeTab === 'entry' ? 'p-2 sm:p-3' : 'p-3 sm:p-4 md:p-10'
          }`}
        >
          <div className={`max-w-7xl mx-auto ${activeTab === 'entry' ? 'pb-4' : 'pb-8 sm:pb-10'}`}>
            <DuyuruBanner />
            {activeTab !== 'entry' && <WeeklyFinalizeDigest />}
            {activeTab !== 'entry' && <GorevKarti />}
            {activeTab !== 'entry' && <OperationalAlerts />}
            {showBirimBanner && (
              <div className="mb-6 flex gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                <AlertCircle className="shrink-0 mt-0.5" size={22} />
                <div>
                  <p className="font-bold text-sm">Birim veya rol ataması bekleniyor</p>
                  <p className="text-sm mt-1 opacity-90">
                    Hesabınızla giriş yaptınız ancak size henüz bir birim atanmadı. Veri girişi ve birim bazlı işlemler
                    için sistem yöneticinizin Yönetim ekranından rol ve birim tanımlaması yapması gerekir.
                    Görüntüleme ekranları sınırlı veri gösterebilir.
                  </p>
                </div>
              </div>
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
