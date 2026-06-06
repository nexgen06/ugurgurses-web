-- ============================================
-- KULLANICI BAZLI FİLTRELEME İÇİN SQL GÜNCELLEMELERİ
-- Her kullanıcı sadece kendi kayıtlarını görebilsin
-- ============================================

-- 1. Contacts tablosuna firebase_user_id kolonu ekle (eğer yoksa)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS firebase_user_id VARCHAR(255);

-- 2. Index oluştur (performans için)
CREATE INDEX IF NOT EXISTS idx_contacts_firebase_user_id ON contacts(firebase_user_id);

-- 3. Mevcut RLS politikalarını güncelle
-- Önce mevcut politikaları sil
DROP POLICY IF EXISTS "Public read access" ON contacts;
DROP POLICY IF EXISTS "Public insert access" ON contacts;
DROP POLICY IF EXISTS "Public update access" ON contacts;
DROP POLICY IF EXISTS "Public delete access" ON contacts;
DROP POLICY IF EXISTS "Kullanıcılar kayıtları görebilir" ON contacts;
DROP POLICY IF EXISTS "Kullanıcılar kayıt ekleyebilir" ON contacts;
DROP POLICY IF EXISTS "Kullanıcılar kayıt güncelleyebilir" ON contacts;
DROP POLICY IF EXISTS "Kullanıcılar kayıt silebilir" ON contacts;

-- 4. YENİ RLS POLİTİKALARI (Firebase User ID bazlı)

-- SELECT: Sadece kendi kayıtlarını görebilsin
CREATE POLICY "Kullanıcılar sadece kendi kayıtlarını görebilir"
ON contacts FOR SELECT
TO public
USING (
    firebase_user_id = current_setting('app.firebase_user_id', true)
    OR firebase_user_id IS NULL -- Eski kayıtlar için (opsiyonel)
);

-- INSERT: Herkes ekleyebilir ama firebase_user_id otomatik set edilir
CREATE POLICY "Kullanıcılar kayıt ekleyebilir"
ON contacts FOR INSERT
TO public
WITH CHECK (true);

-- UPDATE: Sadece kendi kayıtlarını güncelleyebilsin
CREATE POLICY "Kullanıcılar sadece kendi kayıtlarını güncelleyebilir"
ON contacts FOR UPDATE
TO public
USING (
    firebase_user_id = current_setting('app.firebase_user_id', true)
)
WITH CHECK (
    firebase_user_id = current_setting('app.firebase_user_id', true)
);

-- DELETE: Sadece kendi kayıtlarını silebilsin
CREATE POLICY "Kullanıcılar sadece kendi kayıtlarını silebilir"
ON contacts FOR DELETE
TO public
USING (
    firebase_user_id = current_setting('app.firebase_user_id', true)
);

-- 5. Trigger: firebase_user_id'yi otomatik set et
CREATE OR REPLACE FUNCTION set_firebase_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Eğer firebase_user_id set edilmemişse, current_setting'den al
    IF NEW.firebase_user_id IS NULL THEN
        NEW.firebase_user_id := current_setting('app.firebase_user_id', true);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS set_contacts_firebase_user_id ON contacts;
CREATE TRIGGER set_contacts_firebase_user_id
    BEFORE INSERT ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION set_firebase_user_id();

-- ============================================
-- ALTERNATİF: Daha basit yaklaşım (Client-side filtreleme)
-- ============================================
-- Eğer RLS politikalarını değiştirmek istemiyorsanız,
-- sadece client-side'da filtreleme yapabilirsiniz.
-- Bu durumda yukarıdaki SQL'i çalıştırmayın.

-- ============================================
-- NOTLAR:
-- ============================================
-- 1. Bu SQL Firebase Authentication kullanan uygulamalar için
-- 2. firebase_user_id kolonu Firebase UID'yi saklar
-- 3. RLS politikaları client-side'dan gönderilen user_id'ye göre çalışır
-- 4. Production'da mutlaka test edin
-- ============================================
