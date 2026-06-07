-- =====================================================================
-- PHONE UYGULAMASI – SUPABASE TAM KURULUM (v2 – GÜVENLİK SIKILASTIRILDI)
-- =====================================================================
-- Bu dosya yepyeni veya mevcut bir Supabase projesi üzerinde phone
-- uygulamasının ihtiyaç duyduğu her şeyi (tablo + index + sıkı RLS) kurar.
-- Yeniden çalıştırılabilir (idempotent) – CREATE IF NOT EXISTS / DROP IF EXISTS.
--
-- Çalıştırma:
--   1. Supabase Dashboard -> SQL Editor -> New query
--   2. Tüm dosyayı yapıştır -> Run
--
-- Mimari:
--   - Kimlik doğrulama Firebase Auth ile yapılır (Supabase Auth değil).
--   - Supabase, Firebase ID Token'ı Third-party JWT olarak doğrular.
--     (Dashboard -> Authentication -> Sign In Providers -> Third-party Auth
--      -> Firebase eklenmiş olmalı, bkz. SUPABASE_GUVENLIK_KURULUMU.md)
--   - RLS, JWT içindeki "sub" claim'ini (Firebase UID) firebase_user_id ile
--     eşleştirir. Yani client istediği kadar UID gönderse de DB tarafı
--     gerçek imzalı UID'ye bakar -> spoof imkânsız.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) TABLO – contacts
-- ---------------------------------------------------------------------
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
    firebase_user_id  TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Eski kurulumlarda firebase_user_id NULL olabilir – NOT NULL'a yükselt
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'contacts'
          AND column_name = 'firebase_user_id'
          AND is_nullable = 'YES'
    ) THEN
        -- NULL değer kalmasın
        UPDATE public.contacts SET firebase_user_id = '' WHERE firebase_user_id IS NULL;
        ALTER TABLE public.contacts ALTER COLUMN firebase_user_id SET NOT NULL;
    END IF;
END $$;


-- ---------------------------------------------------------------------
-- 2) INDEX
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_contacts_firebase_user_id
    ON public.contacts (firebase_user_id);

CREATE INDEX IF NOT EXISTS idx_contacts_name
    ON public.contacts (name);


-- ---------------------------------------------------------------------
-- 3) updated_at trigger'ı
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- 4) RLS – Firebase JWT bağımlı SIKI politikalar
-- ---------------------------------------------------------------------
-- ÖNEMLİ NOT (Firebase Auth third-party rolü):
--   Firebase ID Token'larında varsayılan olarak "role" claim'i YOKTUR.
--   Bu yüzden Supabase, geçerli JWT olsa bile request'i `anon` Postgres
--   rolünde değerlendirir. Bu durum, "TO authenticated"a kısıtlı bir
--   policy'nin geçerli kullanıcıyı bile reddetmesine yol açar.
--
--   İki çözüm yolu vardır:
--     A) (BURADA UYGULANAN) Policy'i hem anon hem authenticated rolüne
--        açmak ve koşulları JWT içeriğine (iss + sub) bağlamak. JWT
--        Supabase tarafından third-party auth ile imza doğrulamasından
--        geçirildiği için, content claim'leri spoof edilemez.
--     B) Firebase tarafında her kullanıcıya `role: 'authenticated'`
--        custom claim'i atamak (Cloud Functions ile). Daha "by-the-book"
--        yaklaşım ama Firebase Functions kurulumu gerekir.
--
--   Yol A da Yol B kadar güvenlidir; çünkü asıl izolasyon iss + sub
--   kontrolünden geliyor, role'den değil. (Supabase hosted platformu
--   zaten kayıtlı olmayan Firebase project ID'lerinden gelen JWT'leri
--   doğrulama aşamasında reddeder; aşağıdaki iss kontrolü defansif
--   derinlik için ek katmandır.)

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Tüm önceki politikaları temizle (idempotent)
DROP POLICY IF EXISTS "contacts_public_select" ON public.contacts;
DROP POLICY IF EXISTS "contacts_public_insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts_public_update" ON public.contacts;
DROP POLICY IF EXISTS "contacts_public_delete" ON public.contacts;
DROP POLICY IF EXISTS "Public read access"   ON public.contacts;
DROP POLICY IF EXISTS "Public insert access" ON public.contacts;
DROP POLICY IF EXISTS "Public update access" ON public.contacts;
DROP POLICY IF EXISTS "Public delete access" ON public.contacts;
DROP POLICY IF EXISTS "contacts_owner_select" ON public.contacts;
DROP POLICY IF EXISTS "contacts_owner_insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts_owner_update" ON public.contacts;
DROP POLICY IF EXISTS "contacts_owner_delete" ON public.contacts;

-- Yardımcı: yalnızca BİZİM Firebase projemizden gelen geçerli JWT
-- Supabase JWT'yi imza ile zaten doğrular; bu fonksiyon sadece içerik
-- (issuer + audience) kontrolü yapar.
CREATE OR REPLACE FUNCTION public.is_my_firebase_user(target_uid TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT
        target_uid IS NOT NULL
        AND (auth.jwt() ->> 'sub') IS NOT NULL
        AND (auth.jwt() ->> 'sub') = target_uid
        AND (auth.jwt() ->> 'iss') = 'https://securetoken.google.com/mulakat-takip-sistemi'
        AND (auth.jwt() ->> 'aud') = 'mulakat-takip-sistemi';
$$;

-- SELECT: yalnızca kendi kayıtların
CREATE POLICY "contacts_owner_select"
    ON public.contacts
    FOR SELECT
    TO anon, authenticated
    USING (public.is_my_firebase_user(firebase_user_id));

-- INSERT: yalnızca kendi UID'inle ekleyebilirsin
CREATE POLICY "contacts_owner_insert"
    ON public.contacts
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (public.is_my_firebase_user(firebase_user_id));

-- UPDATE: yalnızca kendi kayıtların; satırı başka UID'ye taşıyamazsın
CREATE POLICY "contacts_owner_update"
    ON public.contacts
    FOR UPDATE
    TO anon, authenticated
    USING      (public.is_my_firebase_user(firebase_user_id))
    WITH CHECK (public.is_my_firebase_user(firebase_user_id));

-- DELETE: yalnızca kendi kayıtların
CREATE POLICY "contacts_owner_delete"
    ON public.contacts
    FOR DELETE
    TO anon, authenticated
    USING (public.is_my_firebase_user(firebase_user_id));


-- ---------------------------------------------------------------------
-- 5) Şema cache'ini yenile
-- ---------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- KURULUM TAMAMLANDI
-- =====================================================================
-- Doğrulama:
--   -- 1. Politikalar:
--   SELECT policyname, cmd, roles, qual, with_check
--   FROM pg_policies WHERE tablename = 'contacts';
--   -> public.is_my_firebase_user(firebase_user_id) görmelisin.
--
--   -- 2. Yardımcı fonksiyon:
--   SELECT pg_get_functiondef('public.is_my_firebase_user(text)'::regprocedure);
--
--   -- 3. Anon erişimi reddedilmeli (curl ile dışarıdan):
--   --    curl https://<proj>.supabase.co/rest/v1/contacts \
--   --      -H "apikey: <publishable_key>" \
--   --      -H "Authorization: Bearer <publishable_key>"
--   --    -> [] döner çünkü auth.jwt() NULL, is_my_firebase_user() FALSE.
-- =====================================================================
