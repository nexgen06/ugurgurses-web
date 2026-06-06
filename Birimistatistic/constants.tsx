
import { IslemTuru, Birim } from './types';

import { VERI_BASLANGIC_TARIH, VERI_BASLANGIC_AY } from './lib/date-policy';

/** Veri kayıt ve raporlar — 1 Haziran 2026 öncesi kullanılamaz */
export const TAVIM_BASLANGIC_TARIH = VERI_BASLANGIC_TARIH;
export const TAVIM_BASLANGIC_AY = VERI_BASLANGIC_AY;

export const BIRIMLER: Birim[] = [
  'Yardımcı Sağlık Personeli Birimi',
  'Stratejik Personel Sicil Birimi'
];

export const ISLEM_TURLERI: IslemTuru[] = [
  'DYS',
  'DYS (Yazışma)',
  'EKİP',
  'SİCİL ÖZETİ',
  'HİTAP',
  'DİĞER'
];

export const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
  '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#83a6ed'
];
