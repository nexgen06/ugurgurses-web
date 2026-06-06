# 📚 Supabase Entegrasyon Rehberi - Adım Adım

Bu rehber, Phone uygulamasını Supabase ile entegre etmek için gereken tüm adımları içerir.

---

## 📋 İçindekiler

1. [Supabase Hesabı Oluşturma](#1-supabase-hesabı-oluşturma)
2. [Yeni Proje Oluşturma](#2-yeni-proje-oluşturma)
3. [Veritabanı Tablosu Oluşturma](#3-veritabanı-tablosu-oluşturma)
4. [Row Level Security (RLS) Politikaları](#4-row-level-security-rls-politikaları)
5. [API Anahtarlarını Alma](#5-api-anahtarlarını-alma)
6. [Uygulamaya Entegrasyon](#6-uygulamaya-entegrasyon)
7. [Test Etme](#7-test-etme)
8. [Sorun Giderme](#8-sorun-giderme)

---

## 1. Supabase Hesabı Oluşturma

### Adım 1.1: Supabase'e Kayıt Ol
1. Tarayıcınızda [https://supabase.com](https://supabase.com) adresine gidin
2. Sağ üst köşedeki **"Start your project"** veya **"Sign Up"** butonuna tıklayın
3. GitHub, GitLab veya e-posta ile kayıt olun (GitHub önerilir)

### Adım 1.2: E-posta Doğrulama
- E-posta adresinize gelen doğrulama linkine tıklayın
- Hesabınız aktif hale gelecek

---

## 2. Yeni Proje Oluşturma

### Adım 2.1: Proje Oluştur
1. Supabase Dashboard'a giriş yaptıktan sonra **"New Project"** butonuna tıklayın
2. Proje bilgilerini doldurun:
   - **Name**: `phone-rehberi` (veya istediğiniz isim)
   - **Database Password**: Güçlü bir şifre oluşturun (kaydedin!)
   - **Region**: Size en yakın bölgeyi seçin (örn: `West EU`)
   - **Pricing Plan**: Free tier ile başlayabilirsiniz

### Adım 2.2: Proje Oluşturmayı Bekle
- Proje oluşturma 1-2 dakika sürebilir
- "Project is ready" mesajını bekleyin

---

## 3. Veritabanı Tablosu Oluşturma

### Adım 3.1: SQL Editor'ü Aç
1. Sol menüden **"SQL Editor"** sekmesine tıklayın
2. **"New query"** butonuna tıklayın

### Adım 3.2: Tablo Oluşturma SQL'ini Çalıştır
Aşağıdaki SQL kodunu SQL Editor'e yapıştırın ve **"Run"** butonuna tıklayın:

```sql
-- Contacts tablosunu oluştur
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

-- Updated_at otomatik güncelleme trigger'ı
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

-- Index'ler (Performans için)
CREATE INDEX IF NOT EXISTS idx_contacts_department ON contacts(department);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
```

### Adım 3.3: Tabloyu Kontrol Et
1. Sol menüden **"Table Editor"** sekmesine tıklayın
2. **"contacts"** tablosunun oluşturulduğunu görün
3. Kolonları kontrol edin:
   - `id` (bigserial, primary key)
   - `name`, `title`, `department`, `extension`, `email`, `phone`, `avatar`
   - `created_at`, `updated_at`, `created_by`

---

## 4. Row Level Security (RLS) Politikaları

### Adım 4.1: RLS Politikalarını Uygula
1. **"SQL Editor"** sekmesine geri dönün
2. **"New query"** butonuna tıklayın
3. Aşağıdaki SQL kodunu yapıştırın ve **"Run"** butonuna tıklayın:

```sql
-- RLS'yi etkinleştir
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları temizle (eğer varsa)
DROP POLICY IF EXISTS "Kullanıcılar kayıtları görebilir" ON contacts;
DROP POLICY IF EXISTS "Kullanıcılar kayıt ekleyebilir" ON contacts;
DROP POLICY IF EXISTS "Kullanıcılar kayıt güncelleyebilir" ON contacts;
DROP POLICY IF EXISTS "Kullanıcılar kayıt silebilir" ON contacts;

-- SELECT Politikası: Sadece authenticated kullanıcılar okuyabilsin
CREATE POLICY "Kullanıcılar kayıtları görebilir"
ON contacts FOR SELECT
TO authenticated
USING (true);

-- INSERT Politikası: Sadece authenticated kullanıcılar ekleyebilsin
CREATE POLICY "Kullanıcılar kayıt ekleyebilir"
ON contacts FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE Politikası: Sadece authenticated kullanıcılar güncelleyebilsin
CREATE POLICY "Kullanıcılar kayıt güncelleyebilir"
ON contacts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE Politikası: Sadece authenticated kullanıcılar silebilsin
CREATE POLICY "Kullanıcılar kayıt silebilir"
ON contacts FOR DELETE
TO authenticated
USING (true);

-- created_by alanını otomatik doldur
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
```

### Adım 4.2: RLS'yi Kontrol Et
1. **"Table Editor"** sekmesine gidin
2. **"contacts"** tablosuna tıklayın
3. Sağ üst köşede **"RLS enabled"** yazısını görmelisiniz

---

## 5. API Anahtarlarını Alma

### Adım 5.1: Project Settings'e Git
1. Sol menüden **"Settings"** (⚙️) ikonuna tıklayın
2. **"API"** sekmesine tıklayın

### Adım 5.2: API Bilgilerini Kopyala
Aşağıdaki bilgileri kopyalayın (daha sonra kullanacağız):

1. **Project URL**: 
   - Örnek: `https://xxxxxxxxxxxxx.supabase.co`
   - **"Project URL"** başlığının altındaki değeri kopyalayın

2. **anon public key**:
   - **"Project API keys"** bölümünde
   - **"anon"** ve **"public"** etiketli anahtarı kopyalayın
   - ⚠️ **Service Role Key'i ASLA kopyalamayın!** (Bu gizli kalmalı)

### Adım 5.3: Bilgileri Güvenli Bir Yerde Sakla
- Not defterine veya güvenli bir yere kaydedin
- Production'da environment variables kullanılmalı

---

## 6. Uygulamaya Entegrasyon

### Adım 6.1: index.html Dosyasını Aç
1. `phone/index.html` dosyasını bir metin editöründe açın
2. Satır 401-402'yi bulun:

```javascript
const SUPABASE_URL = 'BURAYA_SUPABASE_URLINIZI_YAZIN';
const SUPABASE_ANON_KEY = 'BURAYA_SUPABASE_ANON_KEYINIZI_YAZIN';
```

### Adım 6.2: API Bilgilerini Yapıştır
1. `SUPABASE_URL` değişkenine **Project URL**'i yapıştırın:
```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxxxx.supabase.co';
```

2. `SUPABASE_ANON_KEY` değişkenine **anon public key**'i yapıştırın:
```javascript
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### Adım 6.3: Dosyayı Kaydet
- Değişiklikleri kaydedin

---

## 7. Test Etme

### Adım 7.1: Uygulamayı Aç
1. `phone/index.html` dosyasını tarayıcıda açın
2. Giriş yapın (login.html üzerinden)

### Adım 7.2: Yeni Kişi Ekle
1. **"Yeni Kişi Ekle"** butonuna tıklayın
2. Formu doldurun:
   - Ad Soyad: Test Kullanıcı
   - Unvan: Test Unvan
   - Departman: Test
   - Dahili No: 9999
   - E-posta: test@example.com
   - Telefon: +90 555 123 4567
3. **"Kaydet"** butonuna tıklayın

### Adım 7.3: Supabase'de Kontrol Et
1. Supabase Dashboard'a geri dönün
2. **"Table Editor"** sekmesine gidin
3. **"contacts"** tablosuna tıklayın
4. Eklediğiniz kaydı görmelisiniz

### Adım 7.4: Kayıtları Yükle
1. Sayfayı yenileyin (F5)
2. Eklediğiniz kişinin listede göründüğünü kontrol edin

---

## 8. Sorun Giderme

### Sorun 1: "Supabase client oluşturulamadı" Hatası

**Çözüm:**
- API anahtarlarının doğru kopyalandığından emin olun
- URL'nin `https://` ile başladığından emin olun
- Tarayıcı konsolunu (F12) açın ve hata mesajlarını kontrol edin

### Sorun 2: "Row Level Security policy violation" Hatası

**Çözüm:**
1. Supabase Dashboard'da **"Authentication"** > **"Users"** sekmesine gidin
2. Kullanıcınızın listede olduğundan emin olun
3. RLS politikalarının doğru uygulandığını kontrol edin (Adım 4)

### Sorun 3: Kayıtlar Görünmüyor

**Çözüm:**
1. Tarayıcı konsolunu açın (F12)
2. Network sekmesinde Supabase isteklerini kontrol edin
3. Hata mesajlarını okuyun
4. Supabase Dashboard'da **"Logs"** sekmesinden API loglarını kontrol edin

### Sorun 4: "Email already exists" Hatası

**Çözüm:**
- E-posta adresi zaten kullanılıyor
- Farklı bir e-posta adresi deneyin veya mevcut kaydı güncelleyin

### Sorun 5: Authentication Hatası

**Çözüm:**
1. `login.html` üzerinden tekrar giriş yapın
2. Firebase Authentication'ın çalıştığından emin olun
3. Supabase Authentication kullanmak istiyorsanız, `checkAuth()` fonksiyonunu güncelleyin

---

## 🔒 Güvenlik Notları

### ⚠️ ÖNEMLİ:
1. **Service Role Key'i ASLA client-side kodda kullanmayın!**
   - Bu anahtar tüm veritabanı erişimine sahiptir
   - Sadece server-side kodda kullanılmalıdır

2. **anon public key güvenli mi?**
   - Evet, RLS politikaları sayesinde güvenlidir
   - Kullanıcılar sadece yetkili oldukları verilere erişebilir

3. **Production'da ne yapmalıyım?**
   - API anahtarlarını environment variables'a taşıyın
   - HTTPS kullanın
   - Rate limiting ekleyin
   - Düzenli yedekleme yapın

---

## 📚 Ek Kaynaklar

- [Supabase Dokümantasyonu](https://supabase.com/docs)
- [Row Level Security Rehberi](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

---

## ✅ Kontrol Listesi

Entegrasyonu tamamladıktan sonra şunları kontrol edin:

- [ ] Supabase hesabı oluşturuldu
- [ ] Proje oluşturuldu
- [ ] `contacts` tablosu oluşturuldu
- [ ] RLS politikaları uygulandı
- [ ] API anahtarları alındı
- [ ] `index.html` dosyası güncellendi
- [ ] Test kaydı eklendi
- [ ] Kayıtlar Supabase'de görünüyor
- [ ] Kayıtlar uygulamada görünüyor
- [ ] Düzenleme çalışıyor
- [ ] Silme çalışıyor

---

## 🎉 Tebrikler!

Supabase entegrasyonu tamamlandı! Artık verileriniz güvenli bir şekilde Supabase veritabanında saklanıyor.

Herhangi bir sorunla karşılaşırsanız, yukarıdaki "Sorun Giderme" bölümüne bakın veya Supabase dokümantasyonunu inceleyin.
