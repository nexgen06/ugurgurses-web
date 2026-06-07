-- =====================================================================
-- contacts — Supabase Auth RLS (Firebase kaldırıldı)
-- Proje: mmahcxmfnuoovgqgvjag (Ekip hub)
-- Önkoşul: 001_contacts.sql çalıştırılmış olmalı
-- Dashboard: Authentication → Providers → Email etkin
-- =====================================================================

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts (user_id);

-- Eski Firebase politikalarını kaldır
DROP POLICY IF EXISTS "contacts_owner_select" ON public.contacts;
DROP POLICY IF EXISTS "contacts_owner_insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts_owner_update" ON public.contacts;
DROP POLICY IF EXISTS "contacts_owner_delete" ON public.contacts;

DROP FUNCTION IF EXISTS public.is_my_firebase_user(TEXT);

-- Yeni RLS: auth.uid() = user_id
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

-- firebase_user_id artık kullanılmıyor (veri varsa manuel user_id eşlemesi gerekir)
ALTER TABLE public.contacts DROP COLUMN IF EXISTS firebase_user_id;

NOTIFY pgrst, 'reload schema';
