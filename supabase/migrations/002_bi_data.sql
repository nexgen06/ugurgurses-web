-- =============================================================================
-- Birim İstatistik — veri tabloları (Firestore → Supabase)
-- =============================================================================
-- Nerede: Livetable Supabase → SQL Editor → New query → yapıştır → Run
-- Önce:  001_bi_profiles.sql çalıştırılmış olmalı (bi_profiles tablosu)
-- Sonra: npm run data:migrate (Firestore aktarımı)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tablolar
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bi_users (
  firebase_uid TEXT PRIMARY KEY,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'proje_yetkilisi', 'editor', 'viewer')),
  birimler JSONB NOT NULL DEFAULT '[]'::jsonb,
  ad TEXT,
  soyad TEXT,
  profil_tamamlandi BOOLEAN NOT NULL DEFAULT false,
  legacy_firestore_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bi_config_admins (
  id TEXT PRIMARY KEY DEFAULT 'admins',
  uids JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bi_config_birimler (
  id TEXT PRIMARY KEY DEFAULT 'birimler',
  birimler JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bi_config_kategoriler_ortak (
  id TEXT PRIMARY KEY DEFAULT 'ortak',
  kategoriler JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bi_config_kategoriler_birim (
  birim_doc_id TEXT PRIMARY KEY,
  birim TEXT NOT NULL,
  kategoriler JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bi_config_akis (
  id TEXT PRIMARY KEY DEFAULT 'akis',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bi_config_hedefler (
  id TEXT PRIMARY KEY DEFAULT 'hedefler',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bi_config_duyuru (
  id TEXT PRIMARY KEY DEFAULT 'duyuru',
  metin TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ,
  legacy_updated_at TEXT
);

CREATE TABLE IF NOT EXISTS public.bi_islem_kayitlari (
  id TEXT PRIMARY KEY,
  birim TEXT NOT NULL,
  kayit_tarihi DATE NOT NULL,
  user_id TEXT NOT NULL,
  islem_turu TEXT NOT NULL,
  islem_sayisi INTEGER NOT NULL DEFAULT 0 CHECK (islem_sayisi >= 0),
  kategori_kaynak TEXT CHECK (kategori_kaynak IN ('ortak', 'birim')),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  legacy_firestore_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS public.bi_kesinlesen_gunler (
  id TEXT PRIMARY KEY,
  kayit_tarihi DATE NOT NULL,
  birim TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  locked_at TIMESTAMPTZ,
  legacy_firestore_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS public.bi_gun_onaylari (
  id TEXT PRIMARY KEY,
  kayit_tarihi DATE NOT NULL,
  birim TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  legacy_firestore_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS public.bi_kilit_acma_talepleri (
  id TEXT PRIMARY KEY,
  kayit_tarihi DATE NOT NULL,
  birim TEXT NOT NULL,
  durum TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  legacy_firestore_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS public.bi_personel_izinleri (
  id TEXT PRIMARY KEY,
  birim TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  baslangic DATE,
  legacy_firestore_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS public.bi_ay_birim_onaylari (
  id TEXT PRIMARY KEY,
  yyyy_mm TEXT NOT NULL,
  birim TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  legacy_firestore_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS public.bi_ay_kapanislari (
  yyyy_mm TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  legacy_firestore_id TEXT
);

CREATE TABLE IF NOT EXISTS public.bi_audit_log (
  id TEXT PRIMARY KEY,
  birim TEXT,
  kayit_tarihi DATE,
  actor_uid TEXT,
  action TEXT,
  at TIMESTAMPTZ,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  legacy_firestore_id TEXT UNIQUE
);

-- ---------------------------------------------------------------------------
-- 2) İndeksler
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS bi_islem_kayitlari_tarih_birim_idx
  ON public.bi_islem_kayitlari (kayit_tarihi DESC, birim);
CREATE INDEX IF NOT EXISTS bi_islem_kayitlari_user_idx
  ON public.bi_islem_kayitlari (user_id);
CREATE INDEX IF NOT EXISTS bi_islem_kayitlari_birim_idx
  ON public.bi_islem_kayitlari (birim);
CREATE INDEX IF NOT EXISTS bi_audit_log_at_idx
  ON public.bi_audit_log (at DESC);

-- ---------------------------------------------------------------------------
-- 3) Yardımcı fonksiyonlar (RLS)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bi_firebase_uid()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT legacy_firebase_uid
  FROM public.bi_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.bi_jsonb_to_text_array(j JSONB)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(j))::TEXT[],
    ARRAY[]::TEXT[]
  );
$$;

CREATE OR REPLACE FUNCTION public.bi_my_birimler()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT bi_jsonb_to_text_array(birimler)
      FROM public.bi_users
      WHERE firebase_uid = bi_firebase_uid()
    ),
    (
      SELECT bi_jsonb_to_text_array(birimler)
      FROM public.bi_profiles
      WHERE id = auth.uid()
    ),
    ARRAY[]::TEXT[]
  );
$$;

CREATE OR REPLACE FUNCTION public.bi_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bi_config_admins a,
         LATERAL jsonb_array_elements_text(a.uids) u(uid)
    WHERE u.uid = bi_firebase_uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.bi_users u
    WHERE u.firebase_uid = bi_firebase_uid() AND u.role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.bi_profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.bi_shares_birim(target_birimler JSONB)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bi_is_admin()
  OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(target_birimler) b(birim)
    WHERE b.birim = ANY (bi_my_birimler())
  );
$$;

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.bi_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_config_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_config_birimler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_config_kategoriler_ortak ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_config_kategoriler_birim ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_config_akis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_config_hedefler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_config_duyuru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_islem_kayitlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_kesinlesen_gunler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_gun_onaylari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_kilit_acma_talepleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_personel_izinleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_ay_birim_onaylari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_ay_kapanislari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bi_users_select ON public.bi_users;
CREATE POLICY bi_users_select ON public.bi_users FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      bi_is_admin()
      OR firebase_uid = bi_firebase_uid()
      OR bi_shares_birim(birimler)
    )
  );

DROP POLICY IF EXISTS bi_config_birimler_read ON public.bi_config_birimler;
CREATE POLICY bi_config_birimler_read ON public.bi_config_birimler
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS bi_config_kat_ortak_read ON public.bi_config_kategoriler_ortak;
CREATE POLICY bi_config_kat_ortak_read ON public.bi_config_kategoriler_ortak
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS bi_config_kat_birim_read ON public.bi_config_kategoriler_birim;
CREATE POLICY bi_config_kat_birim_read ON public.bi_config_kategoriler_birim
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS bi_config_akis_read ON public.bi_config_akis;
CREATE POLICY bi_config_akis_read ON public.bi_config_akis
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS bi_config_hedef_read ON public.bi_config_hedefler;
CREATE POLICY bi_config_hedef_read ON public.bi_config_hedefler
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS bi_config_duyuru_read ON public.bi_config_duyuru;
CREATE POLICY bi_config_duyuru_read ON public.bi_config_duyuru
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS bi_config_admins_read ON public.bi_config_admins;
CREATE POLICY bi_config_admins_read ON public.bi_config_admins
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS bi_islem_select ON public.bi_islem_kayitlari;
CREATE POLICY bi_islem_select ON public.bi_islem_kayitlari FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      bi_is_admin()
      OR birim = ANY (bi_my_birimler())
      OR user_id = bi_firebase_uid()
    )
  );

DROP POLICY IF EXISTS bi_kesin_select ON public.bi_kesinlesen_gunler;
CREATE POLICY bi_kesin_select ON public.bi_kesinlesen_gunler FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (bi_is_admin() OR birim = ANY (bi_my_birimler()))
  );

DROP POLICY IF EXISTS bi_gun_onay_select ON public.bi_gun_onaylari;
CREATE POLICY bi_gun_onay_select ON public.bi_gun_onaylari FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (bi_is_admin() OR birim = ANY (bi_my_birimler()))
  );

DROP POLICY IF EXISTS bi_kilit_select ON public.bi_kilit_acma_talepleri;
CREATE POLICY bi_kilit_select ON public.bi_kilit_acma_talepleri FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS bi_izin_select ON public.bi_personel_izinleri;
CREATE POLICY bi_izin_select ON public.bi_personel_izinleri FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (bi_is_admin() OR birim = ANY (bi_my_birimler()))
  );

DROP POLICY IF EXISTS bi_ay_birim_select ON public.bi_ay_birim_onaylari;
CREATE POLICY bi_ay_birim_select ON public.bi_ay_birim_onaylari FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (bi_is_admin() OR birim = ANY (bi_my_birimler()))
  );

DROP POLICY IF EXISTS bi_ay_kapanis_select ON public.bi_ay_kapanislari;
CREATE POLICY bi_ay_kapanis_select ON public.bi_ay_kapanislari FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS bi_audit_select ON public.bi_audit_log;
CREATE POLICY bi_audit_select ON public.bi_audit_log FOR SELECT
  USING (auth.uid() IS NOT NULL AND bi_is_admin());

-- Import script service_role kullanır (RLS bypass). Yazma politikaları cutover sonrası eklenecek.
