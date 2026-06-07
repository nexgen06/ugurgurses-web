/**
 * Veritabanı katmanı — Firestore + Firebase Authentication.
 */

import { getAuthAdapter } from './lib/auth-provider';
import { getDataDb, isDataLayerConfigured, getDataProviderMode } from './lib/data-provider';
import { DATA_CHANGE_EVENT } from './lib/data-events';

export { DATA_CHANGE_EVENT };

class DBClient {
  auth = getAuthAdapter();

  collection(name: string) {
    if (!isDataLayerConfigured()) {
      const mode = getDataProviderMode();
      throw new Error(
        mode === 'supabase'
          ? 'Supabase veri katmanı yapılandırılmamış. VITE_DATA_PROVIDER=supabase ve VITE_SUPABASE_* ayarlayın.'
          : 'Firestore yapılandırılmamış. .env içinde VITE_USE_FIRESTORE=true ve VITE_FIREBASE_* ayarlayın.'
      );
    }
    return getDataDb().collection(name);
  }

  subscribe(callback: () => void) {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(DATA_CHANGE_EVENT, callback);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, callback);
  }
}

export const db = new DBClient();
