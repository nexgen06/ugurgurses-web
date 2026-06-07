import React, { useState, useEffect } from 'react';
import { db } from './db';
import { getFirestoreDebugInfo } from './firestore-db';
import { isDataLayerConfigured, getDataProviderMode } from './lib/data-provider';
import { autoFinalizePastDays } from './services/auto-finalize';
import { autoClosePreviousMonthIfNeeded } from './services/ay-kapanis-service';
import { UserProvider } from './contexts/UserContext';
import { BirimlerProvider } from './contexts/BirimlerContext';
import { KategorilerProvider } from './contexts/KategorilerContext';
import Auth from './components/Auth';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import DataEntry from './components/DataEntry';
import Reports from './components/Reports';
import Management from './components/Management';
import ProfileSetupModal from './components/ProfileSetupModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import { ensureFirebaseAuthForFirestore, FIREBASE_AUTH_READY_EVENT } from './lib/firebase-auth-bridge';
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase';
import { getAuthProviderMode, isFirebaseEnabled } from './lib/vite-env';
import { needsProfileSetup } from './lib/user-display';
import { shouldOpenEntryOnLogin } from './lib/user-prefs';
import { canEnterData } from './contexts/UserContext';
import type { SessionUser } from './types';
import { Info, AlertCircle } from 'lucide-react';

const FirebaseConfigRequired = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-6">
    <AlertCircle className="text-amber-400 mb-4" size={48} />
    <h1 className="text-xl font-bold mb-2">Firebase yapılandırılmamış</h1>
    <p className="text-slate-400 text-center max-w-md mb-4">
      Giriş yalnızca Firebase Authentication ile yapılır. Uygulamanın çalışması için .env dosyasında aşağıdaki değişkenleri ayarlayın:
    </p>
    <pre className="bg-slate-800 text-emerald-300 p-4 rounded text-left text-sm font-mono">
      VITE_USE_FIRESTORE=true{'\n'}
      VITE_FIREBASE_API_KEY=...{'\n'}
      VITE_FIREBASE_PROJECT_ID=...
    </pre>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entry' | 'reports' | 'management'>('dashboard');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let sub: { unsubscribe: () => void } | undefined;
    const SESSION_TIMEOUT_MS = 8_000;

    const finishInitialCheck = (nextSession: any, err: string | null) => {
      if (cancelled) return;
      setSession(nextSession);
      if (err) setSessionError(err);
      setInitialCheckDone(true);
    };

    const initAuth = async () => {
      if (!isDataLayerConfigured()) {
        finishInitialCheck(null, null);
        return;
      }
      setSessionError(null);

      try {
        const sessionResult = await Promise.race([
          db.auth.getSession(),
          new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), SESSION_TIMEOUT_MS);
          })
        ]);

        if (cancelled) return;

        if (!sessionResult) {
          finishInitialCheck(
            null,
            'Oturum kontrolü zaman aşımına uğradı. Giriş ekranından tekrar deneyin.'
          );
        } else {
          const res = sessionResult as { data?: { session?: unknown }; error?: unknown };
          const nextSession = res?.data?.session ?? null;
          const err = res?.error ?? null;
          finishInitialCheck(
            nextSession,
            err ? (typeof err === 'string' ? err : 'Oturum yüklenemedi') : null
          );
        }
      } catch (err: unknown) {
        console.error('getSession error:', err);
        finishInitialCheck(
          null,
          err instanceof Error ? err.message : 'Oturum yüklenemedi'
        );
      }

      if (cancelled) return;
      try {
        const result = db.auth.onAuthStateChange((_event: string, newSession: any) => {
          setSessionError(null);
          setSession(newSession);
        });
        sub = result?.data?.subscription;
      } catch (err) {
        console.error('onAuthStateChange error:', err);
        setSessionError(err instanceof Error ? err.message : 'Auth dinleyici başlatılamadı');
      }
    };

    void initAuth();
    return () => {
      cancelled = true;
      sub?.unsubscribe?.();
    };
  }, []);

  // Supabase oturumunda Firestore köprüsünü doğrula; veri katmanı yeniden yüklenir
  useEffect(() => {
    const u = session?.user as SessionUser | undefined;
    if (!u?.id) return;
    const mode = getAuthProviderMode();
    if (!isFirebaseEnabled() || getDataProviderMode() === 'supabase') return;
    if (mode === 'firebase' || !isSupabaseConfigured()) return;

    let cancelled = false;
    (async () => {
      const { data } = await getSupabaseClient().auth.getSession();
      const accessToken = data.session?.access_token;
      const legacyUid =
        (u.user_metadata?.legacy_firebase_uid as string | undefined) || null;
      const result = await ensureFirebaseAuthForFirestore({
        email: u.email || '',
        legacyFirebaseUid: legacyUid,
        supabaseAccessToken: accessToken
      });
      if (!cancelled && result.ok) {
        setBridgeError(null);
        window.dispatchEvent(new Event(FIREBASE_AUTH_READY_EVENT));
      } else if (!cancelled && !result.ok) {
        const msg = result.error || 'Firestore köprüsü kurulamadı';
        setBridgeError(msg);
        console.warn('Firestore köprüsü:', msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Oturum açılınca, yetkili kullanıcı için geçmiş açık günleri otomatik kilitle
  useEffect(() => {
    const u = session?.user;
    if (u) {
      autoFinalizePastDays(u).catch((e) => console.error('autoFinalize:', e));
      autoClosePreviousMonthIfNeeded(u).catch((e) => console.error('autoCloseMonth:', e));
    }
  }, [session?.user?.id]);

  // Veri girişi yetkisi: son birim/tarih tercihleriyle doğrudan Giriş sekmesi (2 tık hedefi)
  useEffect(() => {
    const u = session?.user as SessionUser | undefined;
    if (u?.id && canEnterData(u) && shouldOpenEntryOnLogin(u.id)) {
      setActiveTab('entry');
    }
  }, [session?.user?.id]);


  if (!initialCheckDone) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium">Yükleniyor...</p>
      </div>
    );
  }
  if (!isDataLayerConfigured()) {
    return <FirebaseConfigRequired />;
  }
  if (!session) {
    return (
      <>
        {sessionError && (
          <div className="fixed top-0 left-0 right-0 bg-amber-600 text-white px-4 py-2 text-center text-sm z-50">
            {sessionError} — Yenileyip tekrar deneyin veya aşağıdan giriş yapın.
          </div>
        )}
        <Auth />
      </>
    );
  }

  const showDebug =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
  const debugInfo = showDebug ? getFirestoreDebugInfo() : null;

  const showProfileSetup = needsProfileSetup(session.user as SessionUser);
  const showChangePassword =
    (session.user as SessionUser)?.user_metadata?.default_password === true;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {bridgeError && (
        <div className="bg-amber-600 text-white px-4 py-2 text-center text-sm shrink-0 z-50">
          {bridgeError} — Kayıtlar görünmeyebilir. Sayfayı yenileyin veya çıkış yapıp tekrar giriş yapın.
        </div>
      )}
      {showChangePassword && (
        <ChangePasswordModal
          user={session.user as SessionUser}
          onComplete={(updated) => setSession({ user: updated })}
        />
      )}
      {showProfileSetup && !showChangePassword && (
        <ProfileSetupModal
          user={session.user as SessionUser}
          onComplete={(updated) => setSession({ user: updated })}
        />
      )}
      {showDebug && debugInfo && (
        <div className="bg-slate-800 text-slate-200 px-3 py-2 text-[10px] font-mono flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-700">
          <span className="flex items-center gap-1"><Info size={12} /> Firestore: {debugInfo.active ? 'Aktif' : 'Kapalı'}</span>
          {debugInfo.projectId && <span>Proje: {debugInfo.projectId}</span>}
          {!debugInfo.active && <span className="text-amber-300">Sebep: {debugInfo.reason}</span>}
          <span>useFlag={String(debugInfo.useFlag)} apiKey={debugInfo.hasApiKey ? '✓' : '✗'} projectId={debugInfo.hasProjectId ? '✓' : '✗'}</span>
        </div>
      )}
      <UserProvider user={session.user}>
        <BirimlerProvider>
          <KategorilerProvider>
            <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={session.user}>
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'entry' && <DataEntry onComplete={() => setActiveTab('dashboard')} />}
              {activeTab === 'reports' && <Reports />}
              {activeTab === 'management' && <Management />}
            </Layout>
          </KategorilerProvider>
        </BirimlerProvider>
      </UserProvider>
    </div>
  );
};

export default App;
