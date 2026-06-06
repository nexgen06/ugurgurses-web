/**
 * İşlem kategorisi ad dönüşümleri ve kaldırılan kategoriler.
 * Firestore’daki eski adlar okunurken güncellenir; raporlarda birleştirilir.
 */

export const SICIL_OZETI_ADI = 'SİCİL ÖZETİ';

const TC_ILE_GELEN_VARYANTLARI = new Set(
  ['TC İLE GELEN', 'T.C İLE GELEN', 'T.C. İLE GELEN', 'TC ILE GELEN'].map((s) =>
    s.toLocaleUpperCase('tr-TR')
  )
);

const SICIL_OZETI_VARYANTLARI = new Set(
  ['SİCİL ÖZETİ', 'Sicil Özeti', 'SICIL OZETI', 'SICIL ÖZETI'].map((s) =>
    s.toLocaleUpperCase('tr-TR')
  )
);

const KALDIRILAN_UPPER = new Set(
  ['ÖZEL İŞLEM (YSP)', 'YSP ÖZEL İŞLEM', 'ÖZEL İŞLEM YSP', 'YSP OZEL ISLEM'].map((s) =>
    s.toLocaleUpperCase('tr-TR')
  )
);

/** Kayıt / liste adını güncel görünen ada çevirir */
export function normalizeKategoriAdi(ad: string): string {
  const t = (ad || '').trim();
  if (!t) return t;
  const upper = t.toLocaleUpperCase('tr-TR');
  if (TC_ILE_GELEN_VARYANTLARI.has(upper) || SICIL_OZETI_VARYANTLARI.has(upper)) return SICIL_OZETI_ADI;
  return t;
}

/** Birim/ortak listelerden çıkarılacak kategoriler */
export function isKaldirilanKategori(ad: string): boolean {
  const t = (ad || '').trim();
  if (!t) return true;
  const upper = t.toLocaleUpperCase('tr-TR');
  if (KALDIRILAN_UPPER.has(upper)) return true;
  return /ysp/i.test(t) && /özel|ozel/i.test(t) && /işlem|islem/i.test(t);
}

/** Yönetim / giriş formlarında gösterilecek kategori listesi */
export function normalizeKategoriList(list: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    if (isKaldirilanKategori(raw)) continue;
    const n = normalizeKategoriAdi(raw);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/** Rapor ve grafiklerde etiket */
export function displayKategoriAdi(ad: string): string {
  return normalizeKategoriAdi(ad);
}
