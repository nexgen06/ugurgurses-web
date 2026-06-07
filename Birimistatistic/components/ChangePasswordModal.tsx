import React, { useState } from 'react';
import { Lock, LogOut } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';
import { db } from '../db';
import type { SessionUser } from '../types';

interface ChangePasswordModalProps {
  user: SessionUser;
  onComplete: (user: SessionUser) => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ user, onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { default_password: false }
      });
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
      const res = await db.auth.getUser();
      const updated = res?.data?.user as SessionUser | null;
      if (updated) {
        onComplete({
          ...updated,
          user_metadata: { ...updated.user_metadata, default_password: false }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şifre güncellenemedi.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await db.auth.signOut();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
            <Lock size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Şifrenizi değiştirin</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Güvenliğiniz için lütfen kişisel bir şifre belirleyin.
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Yeni şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Yeni şifre (tekrar)
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor…' : 'Şifreyi kaydet'}
          </button>
        </form>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <LogOut size={14} />
          Çıkış yap
        </button>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
