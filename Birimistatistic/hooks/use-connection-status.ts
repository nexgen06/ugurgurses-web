import { useEffect, useState } from 'react';
import { doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { getFirebaseFirestore } from '../firebase';
import { isFirestoreConfigured } from '../firestore-db';

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
  const configured = isFirestoreConfigured();
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

    const markServerOk = () => setFirestoreServer(true);
    const markServerDown = () => setFirestoreServer(false);

    const pingServer = async () => {
      if (!navigator.onLine) return;
      try {
        const db = getFirebaseFirestore();
        await getDocFromServer(doc(db, 'config', 'akis'));
        markServerOk();
      } catch {
        markServerDown();
      }
    };

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
          if (!snap.metadata.fromCache) {
            markServerOk();
          }
        },
        () => markServerDown()
      );
    } catch {
      setFirestoreServer(false);
    }

    void pingServer();
    pingTimer = setInterval(() => void pingServer(), PING_MS);

    checkTimer = setTimeout(() => {
      setFirestoreServer((prev) => (prev === null ? false : prev));
    }, CHECK_TIMEOUT_MS);

    return () => {
      window.removeEventListener('online', onBrowserOnline);
      window.removeEventListener('offline', onBrowserOffline);
      unsub?.();
      if (pingTimer) clearInterval(pingTimer);
      if (checkTimer) clearTimeout(checkTimer);
    };
  }, [active, configured]);

  return toView(browserOnline, firestoreServer, configured);
}
