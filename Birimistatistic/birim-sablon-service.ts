/**
 * Yeni birim için örnek kategori paketi (Sicil / Yazışma / Arşiv).
 */

import { setBirimOzelKategoriler } from './kategoriler-service';

/** Birim özel kategori şablonu — tek tıkla uygulanır */
export const BIRIM_SABLON_OZEL_KATEGORILER = ['Sicil', 'Yazışma', 'Arşiv'];

export async function applyBirimSablon(birimAdi: string): Promise<{ error: string | null }> {
  const ad = birimAdi.trim();
  if (!ad) return { error: 'Birim adı gerekli' };
  return setBirimOzelKategoriler(ad, [...BIRIM_SABLON_OZEL_KATEGORILER]);
}
