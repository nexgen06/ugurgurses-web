/**
 * Duyuru modalı — kullanıcı başına “görüldü” takibi (localStorage).
 * Yeni yayın = Firestore updated_at değişince tekrar modal.
 */

const PREFIX = 'birimistatistik_duyuru_seen_';

function key(uid: string): string {
  return `${PREFIX}${uid}`;
}

export function getSeenDuyuruVersion(uid: string): string | null {
  try {
    const v = localStorage.getItem(key(uid));
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function markDuyuruSeen(uid: string, version: string): void {
  try {
    if (!version) return;
    localStorage.setItem(key(uid), version);
  } catch {
    /* localStorage kapalı */
  }
}

export function shouldShowDuyuruModal(uid: string | undefined, version: string, metin: string): boolean {
  if (!uid || !metin.trim() || !version) return false;
  return getSeenDuyuruVersion(uid) !== version;
}
