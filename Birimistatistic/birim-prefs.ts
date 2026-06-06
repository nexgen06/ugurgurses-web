/**
 * Aktif birim, favori ve son kullanılan birimler (localStorage, kullanıcı bazlı).
 */

const PREFIX = 'birimistatistik_birim_prefs_';
const MAX_RECENT = 8;

export interface BirimPrefs {
  aktifBirim: string;
  favoriBirim?: string;
  sonKullanilan: string[];
}

function key(uid: string): string {
  return `${PREFIX}${uid}`;
}

export function loadBirimPrefs(uid: string): BirimPrefs | null {
  try {
    const raw = localStorage.getItem(key(uid));
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<BirimPrefs>;
    if (!o.aktifBirim || typeof o.aktifBirim !== 'string') return null;
    return {
      aktifBirim: o.aktifBirim,
      favoriBirim: typeof o.favoriBirim === 'string' ? o.favoriBirim : undefined,
      sonKullanilan: Array.isArray(o.sonKullanilan)
        ? o.sonKullanilan.filter((b): b is string => typeof b === 'string')
        : []
    };
  } catch {
    return null;
  }
}

export function saveBirimPrefs(uid: string, partial: Partial<BirimPrefs>): void {
  try {
    const prev = loadBirimPrefs(uid);
    const next: BirimPrefs = {
      aktifBirim: partial.aktifBirim ?? prev?.aktifBirim ?? '',
      favoriBirim: partial.favoriBirim !== undefined ? partial.favoriBirim : prev?.favoriBirim,
      sonKullanilan: partial.sonKullanilan ?? prev?.sonKullanilan ?? []
    };
    if (!next.aktifBirim) return;
    localStorage.setItem(key(uid), JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** Birim seçildiğinde son kullanılan listesine ekle */
export function trackRecentBirim(uid: string, birim: string): void {
  if (!birim) return;
  const prev = loadBirimPrefs(uid);
  const list = [birim, ...(prev?.sonKullanilan || []).filter((b) => b !== birim)].slice(0, MAX_RECENT);
  saveBirimPrefs(uid, {
    aktifBirim: birim,
    favoriBirim: prev?.favoriBirim,
    sonKullanilan: list
  });
}

export function setFavoriteBirim(uid: string, birim: string | undefined): void {
  const prev = loadBirimPrefs(uid);
  saveBirimPrefs(uid, {
    aktifBirim: prev?.aktifBirim || birim || '',
    favoriBirim: birim,
    sonKullanilan: prev?.sonKullanilan ?? []
  });
}

export function resolveInitialBirim(
  uid: string,
  allowed: string[],
  fallback: string
): string {
  if (allowed.length === 0) return fallback;
  const prefs = loadBirimPrefs(uid);
  if (prefs?.aktifBirim && allowed.includes(prefs.aktifBirim)) return prefs.aktifBirim;
  if (prefs?.favoriBirim && allowed.includes(prefs.favoriBirim)) return prefs.favoriBirim;
  const recent = (prefs?.sonKullanilan || []).find((b) => allowed.includes(b));
  if (recent) return recent;
  return allowed.includes(fallback) ? fallback : allowed[0];
}
