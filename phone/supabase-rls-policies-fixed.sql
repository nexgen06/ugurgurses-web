-- ============================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLİTİKALARI - DÜZELTİLMİŞ VERSİYON
-- Firebase Authentication ile çalışan versiyon
-- ============================================

-- ÖNEMLİ: Bu versiyon Firebase Authentication kullanan uygulamalar için
-- RLS politikalarını public yapar (Firebase auth kontrolü uygulama tarafında yapılır)

-- 1. Mevcut politikaları temizle
DROP POLICY IF EXISTS "Kullanıcılar kayıtları görebilir" ON contacts;
DROP POLICY IF EXISTS "Kullanıcılar kayıt ekleyebilir" ON contacts;
DROP POLICY IF EXISTS "Kullanıcılar kayıt güncelleyebilir" ON contacts;
DROP POLICY IF EXISTS "Kullanıcılar kayıt silebilir" ON contacts;
DROP POLICY IF EXISTS "Public read access" ON contacts;
DROP POLICY IF EXISTS "Public insert access" ON contacts;
DROP POLICY IF EXISTS "Public update access" ON contacts;
DROP POLICY IF EXISTS "Public delete access" ON contacts;

-- 2. RLS'yi etkinleştir
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 3. PUBLIC ERİŞİM POLİTİKALARI (Firebase Auth kullanıldığı için)
-- NOT: Güvenlik uygulama tarafında Firebase ile sağlanıyor

-- SELECT: Herkes okuyabilir (Firebase auth kontrolü uygulamada)
CREATE POLICY "Public read access"
ON contacts FOR SELECT
TO public
USING (true);

-- INSERT: Herkes ekleyebilir (Firebase auth kontrolü uygulamada)
CREATE POLICY "Public insert access"
ON contacts FOR INSERT
TO public
WITH CHECK (true);

-- UPDATE: Herkes güncelleyebilir (Firebase auth kontrolü uygulamada)
CREATE POLICY "Public update access"
ON contacts FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- DELETE: Herkes silebilir (Firebase auth kontrolü uygulamada)
CREATE POLICY "Public delete access"
ON contacts FOR DELETE
TO public
USING (true);

-- ============================================
-- ALTERNATİF: Supabase Auth kullanmak isterseniz
-- ============================================

-- Eğer Supabase Authentication kullanmak isterseniz, yukarıdaki politikaları silip
-- aşağıdakileri kullanın:

/*
-- SELECT: Sadece authenticated kullanıcılar
CREATE POLICY "Authenticated users can read"
ON contacts FOR SELECT
TO authenticated
USING (true);

-- INSERT: Sadece authenticated kullanıcılar
CREATE POLICY "Authenticated users can insert"
ON contacts FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Sadece authenticated kullanıcılar
CREATE POLICY "Authenticated users can update"
ON contacts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE: Sadece authenticated kullanıcılar
CREATE POLICY "Authenticated users can delete"
ON contacts FOR DELETE
TO authenticated
USING (true);
*/

-- ============================================
-- NOTLAR:
-- ============================================
-- 1. Bu politikalar Firebase Authentication kullanan uygulamalar için
-- 2. Güvenlik uygulama tarafında Firebase ile sağlanıyor
-- 3. Production'da ek güvenlik önlemleri eklenebilir
-- 4. Rate limiting Supabase Dashboard'dan ayarlanabilir
-- ============================================
