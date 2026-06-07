import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getBirimler } from '../services/birimler-service';
import { BIRIMLER as DEFAULT_BIRIMLER } from '../constants';
import { FIREBASE_AUTH_READY_EVENT } from '../lib/firebase-auth-bridge';

interface BirimlerCtx {
  birimler: string[];
  loading: boolean;
  reload: () => Promise<void>;
}

const Ctx = createContext<BirimlerCtx>({
  birimler: [...DEFAULT_BIRIMLER],
  loading: true,
  reload: async () => {}
});

export function BirimlerProvider({ children }: { children: React.ReactNode }) {
  const [birimler, setBirimler] = useState<string[]>([...DEFAULT_BIRIMLER]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const list = await getBirimler();
    setBirimler(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const onReady = () => {
      reload();
    };
    window.addEventListener(FIREBASE_AUTH_READY_EVENT, onReady);
    return () => window.removeEventListener(FIREBASE_AUTH_READY_EVENT, onReady);
  }, [reload]);

  return <Ctx.Provider value={{ birimler, loading, reload }}>{children}</Ctx.Provider>;
}

export function useBirimler(): BirimlerCtx {
  return useContext(Ctx);
}
