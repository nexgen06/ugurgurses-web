/**
 * Veri kayıt / rapor tarih politikası.
 * - 1 Haziran 2026 öncesi: kilitli, takvimde ve raporlarda yok
 * - 1–5 Haziran 2026: yalnızca admin personel adına giriş (geçici)
 * - 6 Haziran 2026+: editör / proje yetkilisi normal giriş
 */

import { todayIso } from './user-prefs';

/** Veri ve raporların başlangıç tarihi */
export const VERI_BASLANGIC_TARIH = '2026-06-01';
export const VERI_BASLANGIC_AY = '2026-06';

/** Admin personel adına giriş — geçici pencere (dahil) */
export const ADMIN_PROXY_BITIS_TARIH = '2026-06-05';

/** Editör / proje yetkilisi kendi adına giriş */
export const EDITOR_GIRIS_BASLANGIC_TARIH = '2026-06-06';

/** Eski ad — purge ve denetim metinleri */
export const VERI_KESIM_TARIH = VERI_BASLANGIC_TARIH;

export function isAdminProxyAraligi(kayit_tarihi: string): boolean {
  return (
    Boolean(kayit_tarihi) &&
    kayit_tarihi >= VERI_BASLANGIC_TARIH &&
    kayit_tarihi <= ADMIN_PROXY_BITIS_TARIH
  );
}

/** Admin kilidi talepsiz açabilir (1–5 Haziran geri dönük penceresi) */
export function isAdminGeriDonukAralik(kayit_tarihi: string): boolean {
  return isAdminProxyAraligi(kayit_tarihi);
}

/** @deprecated isAdminGeriDonukAralik kullanın */
export function isKesimOncesiGeriGiris(kayit_tarihi: string): boolean {
  return isAdminGeriDonukAralik(kayit_tarihi);
}

export function isRaporTarihiGecerli(kayit_tarihi: string): boolean {
  return Boolean(kayit_tarihi && kayit_tarihi >= VERI_BASLANGIC_TARIH);
}

/** Cumartesi (6) veya Pazar (0) */
export function isHaftasonuTarihi(kayit_tarihi: string): boolean {
  if (!kayit_tarihi) return false;
  const day = new Date(`${kayit_tarihi}T12:00:00`).getDay();
  return day === 0 || day === 6;
}

/** Hafta sonu tatil — veri girişi varsayılan kapalı */
export function isHaftaSonuGirisKapali(kayit_tarihi: string): boolean {
  return isHaftasonuTarihi(kayit_tarihi);
}

/** Bugün hafta sonuysa son iş gününe (Cuma) döner */
export function sonIsGunu(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() - 1);
  else if (day === 0) d.setDate(d.getDate() - 2);
  const out = d.toISOString().split('T')[0];
  return out < VERI_BASLANGIC_TARIH ? VERI_BASLANGIC_TARIH : out;
}

export function defaultKayitTarihi(): string {
  const bugun = todayIso();
  if (bugun < VERI_BASLANGIC_TARIH) return VERI_BASLANGIC_TARIH;
  if (isHaftasonuTarihi(bugun)) return sonIsGunu(bugun);
  return bugun;
}

export function defaultRaporBaslangic(): string {
  return VERI_BASLANGIC_TARIH;
}

/** Takvim ay seçici — 2026 Haziran öncesi aylar kapalı */
export function isTakvimAyiSecilebilir(year: number, month: number, minIso = VERI_BASLANGIC_TARIH): boolean {
  const [minY, minM] = minIso.split('-').map(Number);
  if (year < minY) return false;
  if (year > minY) return true;
  return month >= minM;
}
