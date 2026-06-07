-- Birim İstatistik profilleri (Livetable profiles tablosuna dokunmaz).
-- Livetable Supabase projesinde SQL Editor'da çalıştırın.

CREATE TABLE IF NOT EXISTS public.bi_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  legacy_firebase_uid TEXT,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'proje_yetkilisi', 'editor', 'viewer')),
  birimler JSONB NOT NULL DEFAULT '[]'::jsonb,
  ad TEXT,
  soyad TEXT,
  profil_tamamlandi BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bi_profiles_legacy_firebase_uid_key
  ON public.bi_profiles (legacy_firebase_uid)
  WHERE legacy_firebase_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS bi_profiles_email_idx
  ON public.bi_profiles (lower(email));

ALTER TABLE public.bi_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bi_profiles_select_own" ON public.bi_profiles;
CREATE POLICY "bi_profiles_select_own"
  ON public.bi_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "bi_profiles_update_own" ON public.bi_profiles;
CREATE POLICY "bi_profiles_update_own"
  ON public.bi_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "bi_profiles_insert_own" ON public.bi_profiles;
CREATE POLICY "bi_profiles_insert_own"
  ON public.bi_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.set_bi_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bi_profiles_updated_at ON public.bi_profiles;
CREATE TRIGGER bi_profiles_updated_at
  BEFORE UPDATE ON public.bi_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_bi_profiles_updated_at();
