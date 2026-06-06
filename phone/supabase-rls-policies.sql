-- ============================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- Telefon Rehberi Uygulaması için Güvenlik Politikaları
-- ============================================

-- 1. Contacts tablosunu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS contacts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    extension VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT unique_email UNIQUE(email)
);

-- 2. Updated_at otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON contacts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 3. RLS'yi etkinleştir
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 4. Mevcut politikaları temizle (eğer varsa)
DROP POLICY IF EXISTS "Kullanıcılar kayıtları görebilir" ON contacts;
DROP POLICY IF EXISTS "Kullanıcılar kayıt ekleyebilir" ON contacts;
DROP POLICY IF EXISTS "Kullanıcılar kayıt güncelleyebilir" ON contacts;
DROP POLICY IF EXISTS "Kullanıcılar kayıt silebilir" ON contacts;
DROP POLICY IF EXISTS "Public read access" ON contacts;

-- 5. SELECT Politikası: Sadece authenticated kullanıcılar okuyabilsin
CREATE POLICY "Kullanıcılar kayıtları görebilir"
ON contacts FOR SELECT
TO authenticated
USING (true);

-- Alternatif: Sadece kendi ekledikleri kayıtları görebilsinler
-- CREATE POLICY "Kullanıcılar sadece kendi kayıtlarını görebilir"
-- ON contacts FOR SELECT
-- TO authenticated
-- USING (created_by = auth.uid());

-- 6. INSERT Politikası: Sadece authenticated kullanıcılar ekleyebilsin
CREATE POLICY "Kullanıcılar kayıt ekleyebilir"
ON contacts FOR INSERT
TO authenticated
WITH CHECK (true);

-- Otomatik olarak created_by alanını doldur
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = auth.uid();
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER set_contacts_created_by
    BEFORE INSERT ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION set_created_by();

-- 7. UPDATE Politikası: Sadece authenticated kullanıcılar güncelleyebilsin
CREATE POLICY "Kullanıcılar kayıt güncelleyebilir"
ON contacts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Alternatif: Sadece kendi ekledikleri kayıtları güncelleyebilsinler
-- CREATE POLICY "Kullanıcılar sadece kendi kayıtlarını güncelleyebilir"
-- ON contacts FOR UPDATE
-- TO authenticated
-- USING (created_by = auth.uid())
-- WITH CHECK (created_by = auth.uid());

-- 8. DELETE Politikası: Sadece authenticated kullanıcılar silebilsin
CREATE POLICY "Kullanıcılar kayıt silebilir"
ON contacts FOR DELETE
TO authenticated
USING (true);

-- Alternatif: Sadece kendi ekledikleri kayıtları silebilsinler
-- CREATE POLICY "Kullanıcılar sadece kendi kayıtlarını silebilir"
-- ON contacts FOR DELETE
-- TO authenticated
-- USING (created_by = auth.uid());

-- 9. Index'ler (Performans için)
CREATE INDEX IF NOT EXISTS idx_contacts_department ON contacts(department);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);

-- 10. Email unique constraint (zaten var ama kontrol için)
-- CONSTRAINT unique_email UNIQUE(email) -- Yukarıda tanımlandı

-- ============================================
-- NOTLAR:
-- ============================================
-- 1. Bu politikalar tüm authenticated kullanıcılara tam erişim verir
-- 2. Daha kısıtlayıcı politikalar için alternatif kodları kullanabilirsiniz
-- 3. Production'da mutlaka test edin
-- 4. created_by alanı otomatik olarak doldurulur
-- 5. updated_at alanı otomatik olarak güncellenir
-- ============================================
