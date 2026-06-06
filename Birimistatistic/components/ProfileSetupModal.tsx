import React, { useState } from 'react';
import { UserCircle, LogOut } from 'lucide-react';
import { db } from '../db';
import { completeUserProfile } from '../services/users-service';
import { getFirebaseAuth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import type { SessionUser } from '../types';

interface ProfileSetupModalProps {
  user: SessionUser;
  onComplete: (user: SessionUser) => void;
}

const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({ user, onComplete }) => {
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: saveError } = await completeUserProfile(user.id, ad, soyad, user.email);
    if (saveError) {
      setError(saveError);
      setLoading(false);
      return;
    }
    try {
      const authUser = getFirebaseAuth().currentUser;
      if (authUser) {
        await updateProfile(authUser, { displayName: `${ad.trim()} ${soyad.trim()}` });
      }
    } catch {
      /* Auth displayName isteğe bağlı */
    }
    const res = await db.auth.getUser();
    const updated = res?.data?.user as SessionUser | null;
    if (updated) onComplete(updated);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001E2B]/80 backdrop-blur-sm">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-600 p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-setup-title"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40">
            <UserCircle className="text-emerald-600 dark:text-emerald-400" size={28} />
          </div>
          <div>
            <h2 id="profile-setup-title" className="text-xl font-black text-slate-800 dark:text-slate-100">
              Profilinizi tamamlayın
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-all">{user.email}</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
          İlk girişinizde bir kez ad ve soyadınızı girmeniz gerekiyor. Bu bilgi profil menünüzde görüntülenecektir.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ad</label>
            <input
              type="text"
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Uğur"
              autoComplete="given-name"
              className="mt-1 w-full border-2 border-slate-200 dark:border-slate-600 rounded-xl py-3 px-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold outline-none focus:border-emerald-500"
              required
              minLength={2}
              maxLength={80}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Soyad</label>
            <input
              type="text"
              value={soyad}
              onChange={(e) => setSoyad(e.target.value)}
              placeholder="Gürses"
              autoComplete="family-name"
              className="mt-1 w-full border-2 border-slate-200 dark:border-slate-600 rounded-xl py-3 px-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold outline-none focus:border-emerald-500"
              required
              minLength={2}
              maxLength={80}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00ED64] hover:bg-emerald-400 text-[#001E2B] font-black py-4 rounded-2xl transition-all disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor…' : 'Devam et'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => db.auth.signOut()}
          className="mt-6 w-full flex items-center justify-center gap-2 text-slate-400 hover:text-rose-500 text-xs font-bold transition-colors"
        >
          <LogOut size={14} />
          Oturumu kapat
        </button>
      </div>
    </div>
  );
};

export default ProfileSetupModal;
