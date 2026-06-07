import { useEffect, useState } from 'react';
import { doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseFirestore, getFirebaseAuth } from '../firebase';
import { getSupabaseClient } from '../lib/supabase';
import { isDataLayerConfigured, getDataProviderMode } from '../lib/data-provider';
import { FIREBASE_AUTH_READY_EVENT } from '../lib/firebase-auth-bridge';

export type ConnectionStatus = 'checking' | 'stable' | 'offline' | 'limited';

export interface ConnectionStatusView {
  status: ConnectionStatus;
  label: string;
  dotClass: string;
  textClass: string;
  pulse: boolean;
}

const PING_MS = 45_000;
const CHECK_TIMEOUT_MS = 12_000;

function toView(
  browserOnline: boolean,
  firestoreServer: boolean | null,
  configured: boolean
): ConnectionStatusView {
  if (!configured) {
    return {
      status: 'offline',
      label: 'Kapalı',
      dotClass: 'bg-slate-400',
      textClass: 'text-slate-500 dark:text-slate-400',
      pulse: false
    };
  }
  if (!browserOnline) {
    return {
      status: 'offline',
      label: 'Çevrimdışı',
      dotClass: 'bg-rose-500',
      textClass: 'text-rose-600 dark:text-rose-400',
      pulse: false
    };
  }
  if (firestoreServer === null) {
    return {
      status: 'checking',
      label: 'Kontrol…',
      dotClass: 'bg-amber-400',
      textClass: 'text-amber-600 dark:text-amber-400',
      pulse: true
    };
  }
  if (firestoreServer) {
    return {
      status: 'stable',
      label: 'Stabil',
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      pulse: true
    };
  }
  return {
    status: 'limited',
    label: 'Önbellek',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
    pulse: false
  };
}

/** Tarayıcı ağı + Firestore sunucu erişimini izler. */
export function useConnectionStatus(active: boolean): ConnectionStatusView {
  const configured = isDataLayerConfigured();
  const supabaseData = getDataProviderMode() === 'supabase';
  const [browserOnline, setBrowserOnline] = useState(
    () => (typeof navigator !== 'undefined' ? navigator.onLine : true)
  );
  const [firestoreServer, setFirestoreServer] = useState<boolean | null>(null);

  useEffect(() => {
    if (!active || !configured) {
      setFirestoreServer(null);
      return;
    }

    setFirestoreServer(null);

    const onBrowserOnline = () => setBrowserOnline(true);
    const onBrowserOffline = () => {
      setBrowserOnline(false);
      setFirestoreServer(false);
    };
    window.addEventListener('online', onBrowserOnline);
    window.addEventListener('offline', onBrowserOffline);

    let unsub: (() => void) | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    let checkTimer: ReturnType<typeof setTimeout> | undefined;
    let authUnsub: (() => void) | undefined;
    let started = false;

    const markServerOk = () => setFirestoreServer(true);
    const markServerDown = () => setFirestoreServer(false);

    const stopMonitors = () => {
      unsub?.();
      unsub = undefined;
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = undefined;
      if (checkTimer) clearTimeout(checkTimer);
      checkTimer = undefined;
    };

    const startMonitors = () => {
      if (started) return;
      started = true;

      const pingServer = async () => {
        if (!navigator.onLine) return;
        try {
          if (supabaseData) {
            const { data: session } = await getSupabaseClient().auth.getSession();
            if (!session.session) return;
            const { error } = await getSupabaseClient()
              .from('bi_config_akis')
              .select('id')
              .eq('id', 'akis')
              .maybeSingle();
            if (error) throw error;
          } else {
            if (!getFirebaseAuth().currentUser) return;
            const db = getFirebaseFirestore();
            await getDocFromServer(doc(db, 'config', 'akis'));
          }
          markServerOk();
        } catch {
          markServerDown();
        }
      };

      if (!supabaseData) {
        try {
          const db = getFirebaseFirestore();
          unsub = onSnapshot(
            doc(db, 'config', 'akis'),
            { includeMetadataChanges: true },
            (snap) => {
              if (!navigator.onLine) {
                setFirestoreServer(false);
                return;
              }
              if (!getFirebaseAuth().currentUser) return;
              if (!snap.metadata.fromCache) {
                markServerOk();
              }
            },
            () => markServerDown()
          );
        } catch {
          setFirestoreServer(false);
        }
      }

      void pingServer();
      pingTimer = setInterval(() => void pingServer(), PING_MS);

      checkTimer = setTimeout(() => {
        setFirestoreServer((prev) => (prev === null ? false : prev));
      }, CHECK_TIMEOUT_MS);
    };

    const onBridgeReady = () => {
      if (getFirebaseAuth().currentUser) startMonitors();
    };

    if (supabaseData) {
      void getSupabaseClient().auth.getSession().then(({ data }) => {
        if (data.session) startMonitors();
      });
      const { data: authSub } = getSupabaseClient().auth.onAuthStateChange((_e, session) => {
        if (session) startMonitors();
      });
      authUnsub = () => authSub.subscription.unsubscribe();
    } else {
      const auth = getFirebaseAuth();
      if (auth.currentUser) {
        startMonitors();
      } else {
        authUnsub = onAuthStateChanged(auth, (user) => {
          if (user) startMonitors();
        });
      }
      window.addEventListener(FIREBASE_AUTH_READY_EVENT, onBridgeReady);
    }

    return () => {
      window.removeEventListener('online', onBrowserOnline);
      window.removeEventListener('offline', onBrowserOffline);
      if (!supabaseData) {
        window.removeEventListener(FIREBASE_AUTH_READY_EVENT, onBridgeReady);
      }
      authUnsub?.();
      stopMonitors();
    };
  }, [active, configured, supabaseData]);

  return toView(browserOnline, firestoreServer, configured);
}
