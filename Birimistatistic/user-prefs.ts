/**
 * Kullanıcı bazlı giriş tercihleri (localStorage) — son birim, tarih, görünüm modu.
 */

export type EntryViewMode = 'form' | 'bugun_tablo';

export interface EntryPrefs {
  birim: string;
  kayit_tarihi: string;
  viewMode: EntryViewMode;
}

const PREFIX = 'birimistatistik_entry_prefs_';

function key(uid: string): string {
  return `${PREFIX}${uid}`;
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function loadEntryPrefs(uid: string): EntryPrefs | null {
  try {
    const raw = localStorage.getItem(key(uid));
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<EntryPrefs>;
    if (!o.birim || typeof o.birim !== 'string') return null;
    return {
      birim: o.birim,
      kayit_tarihi: typeof o.kayit_tarihi === 'string' ? o.kayit_tarihi : todayIso(),
      viewMode: o.viewMode === 'bugun_tablo' ? 'bugun_tablo' : 'form'
    };
  } catch {
    return null;
  }
}

export function saveEntryPrefs(uid: string, partial: Partial<EntryPrefs>): void {
  try {
    const prev = loadEntryPrefs(uid);
    const next: EntryPrefs = {
      birim: partial.birim ?? prev?.birim ?? '',
      kayit_tarihi: partial.kayit_tarihi ?? prev?.kayit_tarihi ?? todayIso(),
      viewMode: partial.viewMode ?? prev?.viewMode ?? 'form'
    };
    if (!next.birim) return;
    localStorage.setItem(key(uid), JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

/** Veri girişi yetkisi olanlar için girişte doğrudan Giriş sekmesi */
export function shouldOpenEntryOnLogin(uid: string): boolean {
  try {
    const v = localStorage.getItem(`${PREFIX}${uid}_auto_entry`);
    return v !== '0';
  } catch {
    return true;
  }
}
