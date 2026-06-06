/** Yönetim modülünde atanabilir roller */
export type UserRole = 'admin' | 'proje_yetkilisi' | 'editor' | 'viewer';

export interface SessionUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
  role: UserRole;
  birimler: string[];
  ad?: string;
  soyad?: string;
  /** İlk girişte isim/soyisim bir kez alındıktan sonra true */
  profil_tamamlandi?: boolean;
}

/** Birim adı. Liste artık Firestore'dan (config/birimler) dinamik gelir; tip serbest metindir. */
export type Birim = string;

/** İşlem kategorisi — ortak + birim özel listelerden gelir (serbest metin). */
export type IslemTuru = string;

export interface IslemKaydi {
  id: string;
  created_at: string;
  updated_at?: string;
  birim?: Birim;
  islem_turu: IslemTuru;
  islem_sayisi: number;
  kayit_tarihi: string;
  user_id: string;
  kategori_kaynak?: 'ortak' | 'birim';
}

export interface ChartData {
  name: string;
  value: number;
}

export interface LineChartData {
  date: string;
  count: number;
}
