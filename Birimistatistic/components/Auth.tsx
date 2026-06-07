
import React, { useState } from 'react';
import { db } from '../db';
import { getFirestoreDebugInfo } from '../firestore-db';
import { Database, Mail, Lock, LogIn, Moon, Sun, Info, ArrowLeft, Shield } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Auth: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      setMessage({ type: 'error', text: error });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setMessage(null);
    const auth = db.auth as { sendPasswordResetEmail?: (email: string) => Promise<{ error: string | null }> };
    const { error } = auth.sendPasswordResetEmail
      ? await auth.sendPasswordResetEmail(resetEmail.trim())
      : { error: 'Şifre sıfırlama bu ortamda kullanılamaz.' };
    if (error) {
      setMessage({ type: 'error', text: error });
    } else {
      setMessage({
        type: 'success',
        text: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Gelen kutusu ve spam klasörünü kontrol edin.'
      });
      setResetEmail('');
    }
    setResetLoading(false);
  };

  const showDebug =
    typeof window !== 'undefined' &&
    ((import.meta as any).env?.DEV === true || window.location.search.includes('debug=1'));
  const debugInfo = getFirestoreDebugInfo();

  return (
    <div className="min-h-screen bg-[#001E2B] dark:bg-[#000d12] flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors">
      {showDebug && (
        <div className="absolute top-0 left-0 right-0 bg-slate-800/95 text-slate-200 px-3 py-2 text-[10px] font-mono flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-700 z-30">
          <span className="flex items-center gap-1">
            <Info size={12} /> Firestore: {debugInfo.active ? 'Aktif' : 'Kapalı'}
          </span>
          {debugInfo.projectId && <span>Proje: {debugInfo.projectId}</span>}
          {!debugInfo.active && <span className="text-amber-300">Sebep: {debugInfo.reason}</span>}
        </div>
      )}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all z-20"
        title={theme === 'light' ? 'Karanlık mod' : 'Aydınlık mod'}
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      <div className="absolute top-0 -left-4 w-96 h-96 bg-[#00ED64] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
      <div className="absolute -bottom-8 right-20 w-96 h-96 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />

      <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl p-12 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-[#00ED64] p-5 rounded-2xl shadow-xl shadow-emerald-950/50 mb-6">
            <Database size={36} className="text-[#001E2B]" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Birim İstatistik</h1>
          <p className="text-emerald-500/70 text-xs font-bold uppercase tracking-[0.3em] mt-3">Veri Yönetim Portalı</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-2xl text-xs font-bold text-center ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {message.text}
          </div>
        )}

        {!showForgotPassword ? (
          <>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  E-posta
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ad.soyad@abc.com"
                    autoComplete="username"
                    className="w-full bg-[#001E2B]/50 border-2 border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-700 outline-none focus:ring-4 focus:ring-[#00ED64]/10 focus:border-[#00ED64] transition-all font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Şifre</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full bg-[#001E2B]/50 border-2 border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-700 outline-none focus:ring-4 focus:ring-[#00ED64]/10 focus:border-[#00ED64] transition-all font-bold"
                    required
                  />
                </div>
                <div className="text-right mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setMessage(null);
                      setResetEmail(email);
                    }}
                    className="text-slate-500 hover:text-emerald-400 text-[10px] font-bold uppercase tracking-widest transition-colors"
                  >
                    Şifremi unuttum
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00ED64] hover:bg-emerald-400 text-[#001E2B] font-black py-5 rounded-2xl shadow-xl shadow-emerald-950/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-6 h-6 border-4 border-[#001E2B]/20 border-t-[#001E2B] rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={20} />
                    <span className="uppercase tracking-widest text-sm">Giriş yap</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10 flex gap-3">
              <Shield className="text-emerald-500 shrink-0 mt-0.5" size={20} />
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kapalı üyelik</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Bu sistemde herkese açık kayıt yoktur. Hesabınız sistem yöneticiniz tarafından oluşturulmalıdır.
                  İlk girişten sonra size birim ve rol atanır.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Hesabınız yoksa veya giriş yapamıyorsanız birim yöneticinize veya sistem yöneticinize başvurun.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-black text-white tracking-tight">Şifre sıfırlama</h2>
            <p className="text-slate-400 text-xs">
              Kayıtlı kurumsal e-posta adresinizi girin; size şifre sıfırlama bağlantısı gönderilir.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-posta</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="ad.soyad@abc.com"
                    className="w-full bg-[#001E2B]/50 border-2 border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-700 outline-none focus:ring-4 focus:ring-[#00ED64]/10 focus:border-[#00ED64] transition-all font-bold"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-[#00ED64] hover:bg-emerald-400 text-[#001E2B] font-black py-5 rounded-2xl shadow-xl shadow-emerald-950/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {resetLoading ? (
                  <div className="w-6 h-6 border-4 border-[#001E2B]/20 border-t-[#001E2B] rounded-full animate-spin" />
                ) : (
                  <span className="uppercase tracking-widest text-sm">Bağlantı gönder</span>
                )}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setMessage(null);
              }}
              className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors py-3"
            >
              <ArrowLeft size={14} />
              Giriş formuna dön
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
