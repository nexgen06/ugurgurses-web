-- =====================================================================
-- EKİP + TELEFON REHBERİ — contacts tablosu (Supabase Auth)
-- Proje: mmahcxmfnuoovgqgvjag
-- Livetable / BI projesinde (lgvhlldqdczrnimeetct) ÇALIŞTIRMAYIN.
-- Güncel kurulum: 001 + 002 veya yalnızca bu dosya (yeni ortam)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.contacts (
    id                BIGSERIAL PRIMARY KEY,
    name              TEXT NOT NULL,
    title             TEXT,
    department        TEXT,
    extension         TEXT,
    kurum             TEXT,
    email             TEXT,
    phone             TEXT,
    avatar            TEXT,
    user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts (user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON public.contacts (name);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON public.contacts;
CREATE TRIGGER trg_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_user_select" ON public.contacts;
DROP POLICY IF EXISTS "contacts_user_insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts_user_update" ON public.contacts;
DROP POLICY IF EXISTS "contacts_user_delete" ON public.contacts;

CREATE POLICY "contacts_user_select"
  ON public.contacts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "contacts_user_insert"
  ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contacts_user_update"
  ON public.contacts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contacts_user_delete"
  ON public.contacts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
