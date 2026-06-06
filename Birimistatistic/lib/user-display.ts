import type { SessionUser } from '../types';

type NameLike = { ad?: string; soyad?: string; email?: string; uid?: string } | null | undefined;

export function displayUserName(user: NameLike): string {
  if (!user) return 'Kullanıcı';
  const ad = (user.ad || '').trim();
  const soyad = (user.soyad || '').trim();
  if (ad && soyad) return `${ad} ${soyad}`;
  if (ad) return ad;
  return user.email?.split('@')[0] || user.email || user.uid?.slice(0, 8) || 'Kullanıcı';
}

export function getDisplayName(user: SessionUser | null): string {
  if (!user) return 'Kullanıcı';
  const ad = (user.ad || '').trim();
  const soyad = (user.soyad || '').trim();
  if (ad && soyad) return `${ad} ${soyad}`;
  if (ad) return ad;
  return user.email?.split('@')[0] || user.email || 'Kullanıcı';
}

export function getAvatarInitials(user: SessionUser | null): string {
  if (!user) return '?';
  const ad = (user.ad || '').trim();
  const soyad = (user.soyad || '').trim();
  if (ad && soyad) return (ad[0] + soyad[0]).toUpperCase();
  if (ad.length >= 2) return ad.slice(0, 2).toUpperCase();
  const local = (user.email?.split('@')[0] || '').trim();
  if (!local) return '?';
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

/** İlk girişte bir kez isim/soyisim toplama ekranı */
export function needsProfileSetup(user: SessionUser | null): boolean {
  if (!user) return false;
  if (user.profil_tamamlandi === true) return false;
  const ad = (user.ad || '').trim();
  const soyad = (user.soyad || '').trim();
  return !ad || !soyad;
}
