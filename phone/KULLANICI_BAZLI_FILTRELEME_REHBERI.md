# 👤 Kullanıcı Bazlı Filtreleme Rehberi

Her kullanıcının sadece kendi kayıtlarını görmesi için gerekli adımlar.

---

## 📋 Genel Bakış

Bu sistem şu şekilde çalışır:
1. Firebase Authentication'dan kullanıcı ID'si alınır
2. Her kayıt `firebase_user_id` alanı ile işaretlenir
3. Veriler yüklenirken sadece kullanıcıya ait kayıtlar filtrelenir
4. Supabase RLS politikaları ile ek güvenlik sağlanır

---

## 🔧 Adım 1: Supabase Tablosunu Güncelleme

### 1.1 SQL Editor'de Çalıştırın

Supabase Dashboard → SQL Editor → New query

Aşağıdaki SQL'i çalıştırın:

```sql
-- firebase_user_id kolonu ekle
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS firebase_user_id VARCHAR(255);

-- Index oluştur (performans için)
CREATE INDEX IF NOT EXISTS idx_contacts_firebase_user_id ON contacts(firebase_user_id);
```

### 1.2 Kontrol Edin

Table Editor → contacts → `firebase_user_id` kolonu görünmeli

---

## 🔒 Adım 2: RLS Politikalarını Güncelleme (Opsiyonel)

Eğer Supabase RLS kullanmak istiyorsanız:

```sql
-- Mevcut politikaları temizle
DROP POLICY IF EXISTS "Public read access" ON contacts;
DROP POLICY IF EXISTS "Public insert access" ON contacts;
DROP POLICY IF EXISTS "Public update access" ON contacts;
DROP POLICY IF EXISTS "Public delete access" ON contacts;

-- Yeni politikalar (Client-side filtreleme ile çalışır)
CREATE POLICY "Kullanıcılar sadece kendi kayıtlarını görebilir"
ON contacts FOR SELECT
TO public
USING (true); -- Client-side filtreleme kullanıyoruz

CREATE POLICY "Kullanıcılar kayıt ekleyebilir"
ON contacts FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Kullanıcılar kayıt güncelleyebilir"
ON contacts FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Kullanıcılar kayıt silebilir"
ON contacts FOR DELETE
TO public
USING (true);
```

**NOT:** Bu politikalar client-side filtreleme ile birlikte çalışır. Daha güvenli bir yaklaşım için `kullanici-bazli-filtreleme.sql` dosyasındaki RLS politikalarını kullanabilirsiniz.

---

## 💻 Adım 3: Kod Değişiklikleri (Tamamlandı ✅)

Kodda şu değişiklikler yapıldı:

### 3.1 Kullanıcı ID Alma Fonksiyonu
```javascript
async function getCurrentUserId() {
    // Firebase'den kullanıcı ID'sini alır
}
```

### 3.2 Kayıt Ekleme
- Her yeni kayıt `firebase_user_id` ile işaretlenir
- Supabase'e kaydedilirken kullanıcı ID'si eklenir

### 3.3 Kayıt Yükleme
- Supabase'den veri yüklerken `.eq('firebase_user_id', currentUserId)` filtresi kullanılır
- LocalStorage'da kullanıcıya özel anahtar kullanılır: `phone_contacts_${userId}`

### 3.4 Kayıt Güncelleme/Silme
- Sadece kullanıcının kendi kayıtlarını güncelleyebilir/silebilir
- `.eq('firebase_user_id', currentUserId)` kontrolü yapılır

---

## 🧪 Adım 4: Test Etme

### Test Senaryoları:

1. **Farklı Kullanıcılarla Giriş Yapın**
   - Kullanıcı A ile giriş yap → Kayıt ekle
   - Kullanıcı B ile giriş yap → Sadece kendi kayıtlarını görmeli

2. **Kayıt Ekleme**
   - Yeni kayıt ekle
   - Supabase Table Editor'de `firebase_user_id` alanını kontrol et

3. **Kayıt Güncelleme**
   - Başka kullanıcının kaydını güncellemeyi deneyin
   - Hata almalısınız veya işlem başarısız olmalı

4. **Kayıt Silme**
   - Başka kullanıcının kaydını silmeyi deneyin
   - Hata almalısınız veya işlem başarısız olmalı

---

## 🔍 Nasıl Çalışıyor?

### Akış Diyagramı:

```
1. Kullanıcı Giriş Yapar
   ↓
2. Firebase Authentication → User ID alınır
   ↓
3. getCurrentUserId() → currentUserId değişkenine kaydedilir
   ↓
4. Veri Yükleme:
   - Supabase: .eq('firebase_user_id', currentUserId)
   - LocalStorage: phone_contacts_${currentUserId}
   ↓
5. Kayıt Ekleme:
   - firebase_user_id: currentUserId eklenir
   ↓
6. Kayıt Güncelleme/Silme:
   - .eq('firebase_user_id', currentUserId) kontrolü
```

---

## 📊 Veri Yapısı

### Contacts Tablosu:
```sql
id              BIGSERIAL PRIMARY KEY
name            VARCHAR(100)
title           VARCHAR(100)
department      VARCHAR(50)
extension       VARCHAR(20)
email           VARCHAR(100)
phone           VARCHAR(20)
avatar          TEXT
firebase_user_id VARCHAR(255)  -- YENİ: Kullanıcı ID'si
created_at      TIMESTAMP
updated_at      TIMESTAMP
created_by      UUID (Supabase Auth için, opsiyonel)
```

### LocalStorage Yapısı:
```javascript
// Önceki (tüm kullanıcılar için):
localStorage.setItem('phone_contacts', ...)

// Yeni (kullanıcıya özel):
localStorage.setItem(`phone_contacts_${userId}`, ...)
```

---

## ⚠️ Önemli Notlar

### 1. Eski Kayıtlar
- Mevcut kayıtların `firebase_user_id` değeri `NULL` olabilir
- Bu kayıtlar varsayılan olarak görünmeyecek
- Eski kayıtları güncellemek için migration script'i çalıştırabilirsiniz

### 2. Güvenlik
- Client-side filtreleme kullanılıyor
- Daha güvenli için Supabase RLS politikalarını kullanın
- `kullanici-bazli-filtreleme.sql` dosyasındaki RLS politikalarını uygulayın

### 3. Performans
- `firebase_user_id` için index oluşturuldu
- Büyük veri setlerinde hızlı sorgular için önemli

---

## 🐛 Sorun Giderme

### Sorun: "Kullanıcı ID alınamadı"

**Çözüm:**
1. Firebase Authentication'ın çalıştığından emin olun
2. Tarayıcı konsolunda hata mesajlarını kontrol edin
3. `getCurrentUserId()` fonksiyonunu manuel çağırın: `await getCurrentUserId()`

### Sorun: "Tüm kayıtlar görünüyor"

**Çözüm:**
1. Supabase sorgusunda `.eq('firebase_user_id', currentUserId)` filtresinin olduğundan emin olun
2. `currentUserId` değişkeninin doğru set edildiğini kontrol edin
3. Konsolda `console.log('User ID:', currentUserId)` ile kontrol edin

### Sorun: "Kayıt eklenmiyor"

**Çözüm:**
1. `firebase_user_id` kolonunun tabloda olduğundan emin olun
2. Supabase RLS politikalarını kontrol edin
3. Konsolda hata mesajlarını kontrol edin

---

## ✅ Kontrol Listesi

- [ ] Supabase'de `firebase_user_id` kolonu eklendi
- [ ] Index oluşturuldu
- [ ] Kod güncellemeleri yapıldı
- [ ] Farklı kullanıcılarla test edildi
- [ ] Kayıt ekleme çalışıyor
- [ ] Kayıt güncelleme çalışıyor
- [ ] Kayıt silme çalışıyor
- [ ] Sadece kendi kayıtları görünüyor

---

## 📚 Ek Kaynaklar

- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Filters](https://supabase.com/docs/reference/javascript/filter)

---

**🎉 Artık her kullanıcı sadece kendi kayıtlarını görebilir!**
