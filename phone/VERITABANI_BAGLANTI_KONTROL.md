# 🔍 Veritabanı Bağlantı Kontrol Rehberi

Bu rehber, Phone uygulamasının Supabase veritabanı bağlantısını nasıl kontrol edeceğinizi gösterir.

---

## 📋 Otomatik Kontrol

Uygulama her açıldığında otomatik olarak veritabanı bağlantısını kontrol eder:

1. **Sayfa yüklendiğinde** (2 saniye sonra)
2. **Uygulama başlatıldığında** (`init()` fonksiyonu içinde)

### Görsel Durum Göstergesi

Sol sidebar'ın altında durum göstergesi görünür:

- 🟢 **Yeşil**: Supabase bağlı ve çalışıyor
- 🟡 **Sarı**: Demo modu (LocalStorage kullanılıyor)
- 🟠 **Turuncu**: Tablo veya RLS politikası hatası
- 🔴 **Kırmızı**: Bağlantı hatası

---

## 🛠️ Manuel Kontrol

### Tarayıcı Konsolu ile Kontrol

1. **Tarayıcıyı açın** ve uygulamayı yükleyin
2. **F12** tuşuna basın (Developer Tools)
3. **Console** sekmesine gidin
4. Şu mesajları arayın:

#### ✅ Başarılı Bağlantı:
```
✅ Supabase client başarıyla oluşturuldu
🔍 Veritabanı bağlantısı test ediliyor...
✅ Supabase client mevcut
📍 URL: https://xxxxxxxxxxxxx.supabase.co
🔑 Anon Key: eyJhbGciOiJIUzI1NiIs...
📡 Veritabanı sorgusu gönderiliyor...
✅ Veritabanı bağlantısı başarılı!
📊 Durum kodu: 200
✅ "contacts" tablosu mevcut
✅ RLS politikaları çalışıyor
📊 Toplam kayıt sayısı: X
✅ VERİTABANI BAĞLANTISI BAŞARILI!
```

#### ❌ Hata Durumları:

**1. Supabase Client Oluşturulamadı:**
```
⚠️ Supabase yapılandırılmamış - Demo modunda çalışılıyor
❌ Supabase client oluşturulmamış!
```

**Çözüm:**
- `index.html` dosyasında API anahtarlarını kontrol edin
- URL ve Anon Key'in doğru olduğundan emin olun

**2. Tablo Bulunamadı:**
```
⚠️ "contacts" tablosu bulunamadı! Tabloyu oluşturmanız gerekiyor.
```

**Çözüm:**
- Supabase Dashboard → SQL Editor
- `contacts` tablosunu oluşturun
- `supabase-rls-policies.sql` dosyasındaki SQL'i çalıştırın

**3. RLS Politikası Hatası:**
```
⚠️ RLS politikası hatası! RLS politikalarını kontrol edin.
```

**Çözüm:**
- Supabase Dashboard → SQL Editor
- RLS politikalarını oluşturun
- `supabase-rls-policies.sql` dosyasındaki RLS SQL'ini çalıştırın

**4. Bağlantı Hatası:**
```
❌ Veritabanı hatası: [hata mesajı]
```

**Çözüm:**
- İnternet bağlantınızı kontrol edin
- Supabase projenizin aktif olduğundan emin olun
- URL'nin doğru olduğunu kontrol edin

---

## 🔧 Geliştirici Konsol Komutları

Tarayıcı konsolunda şu komutları kullanabilirsiniz:

### Bağlantıyı Test Et:
```javascript
testDatabase()
```

Bu komut bağlantıyı test eder ve sonuçları konsola yazdırır.

### Supabase Client Durumu:
```javascript
console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase Client:', supabaseClient);
```

### Manuel Sorgu:
```javascript
// Kayıt sayısını kontrol et
const { count } = await supabaseClient
    .from('contacts')
    .select('*', { count: 'exact', head: true });
console.log('Kayıt sayısı:', count);
```

---

## 📊 Kontrol Adımları

### Adım 1: API Anahtarlarını Kontrol Et

`phone/index.html` dosyasında (Satır 401-402):

```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...';
```

✅ URL `https://` ile başlamalı
✅ URL sonunda `/` olmamalı
✅ Anon Key boş olmamalı

### Adım 2: Supabase Dashboard'u Kontrol Et

1. [Supabase Dashboard](https://app.supabase.com) → Projenizi açın
2. **Settings** → **API** → URL ve anahtarları kontrol edin
3. **Table Editor** → `contacts` tablosunun var olduğunu kontrol edin

### Adım 3: Tablo Yapısını Kontrol Et

Supabase Dashboard → Table Editor → contacts:

Gerekli kolonlar:
- ✅ `id` (bigserial, primary key)
- ✅ `name` (varchar)
- ✅ `title` (varchar)
- ✅ `department` (varchar)
- ✅ `extension` (varchar)
- ✅ `email` (varchar)
- ✅ `phone` (varchar)
- ✅ `avatar` (text)
- ✅ `created_at` (timestamp)
- ✅ `updated_at` (timestamp)
- ✅ `created_by` (uuid)

### Adım 4: RLS Politikalarını Kontrol Et

Supabase Dashboard → Table Editor → contacts:

Sağ üst köşede **"RLS enabled"** yazısı görünmeli.

Eğer görünmüyorsa:
1. SQL Editor'e gidin
2. `supabase-rls-policies.sql` dosyasındaki RLS SQL'ini çalıştırın

---

## 🐛 Sorun Giderme

### Sorun: "Supabase client oluşturulamadı"

**Nedenler:**
- API anahtarları yanlış veya eksik
- Supabase JS kütüphanesi yüklenmemiş
- Syntax hatası

**Çözüm:**
1. Tarayıcı konsolunda hata mesajını okuyun
2. `index.html` dosyasında API anahtarlarını kontrol edin
3. Sayfayı yenileyin (Ctrl+F5)

### Sorun: "contacts tablosu bulunamadı"

**Nedenler:**
- Tablo henüz oluşturulmamış
- Tablo adı yanlış yazılmış
- Yanlış projede çalışıyorsunuz

**Çözüm:**
1. Supabase Dashboard → SQL Editor
2. Tablo oluşturma SQL'ini çalıştırın
3. Table Editor'de tabloyu kontrol edin

### Sorun: "RLS policy violation"

**Nedenler:**
- RLS politikaları oluşturulmamış
- Kullanıcı authenticated değil
- Politikalar yanlış yapılandırılmış

**Çözüm:**
1. Supabase Dashboard → SQL Editor
2. RLS politikalarını oluşturun
3. Authentication'ı kontrol edin

### Sorun: "Network error" veya "Failed to fetch"

**Nedenler:**
- İnternet bağlantısı yok
- CORS hatası
- Supabase projesi durdurulmuş

**Çözüm:**
1. İnternet bağlantınızı kontrol edin
2. Supabase Dashboard'da projenin aktif olduğunu kontrol edin
3. Tarayıcı konsolunda Network sekmesini kontrol edin

---

## ✅ Başarı Kriterleri

Veritabanı bağlantısı başarılı sayılır eğer:

- ✅ Konsolda "✅ VERİTABANI BAĞLANTISI BAŞARILI!" mesajı görünüyor
- ✅ Sidebar'da yeşil durum göstergesi görünüyor
- ✅ Kayıtlar Supabase'den yükleniyor
- ✅ Yeni kayıt eklenebiliyor
- ✅ Kayıtlar düzenlenebiliyor
- ✅ Kayıtlar silinebiliyor
- ✅ Supabase Table Editor'de kayıtlar görünüyor

---

## 📞 Yardım

Sorun devam ederse:

1. Tarayıcı konsolundaki tüm hata mesajlarını kopyalayın
2. Supabase Dashboard → Logs sekmesini kontrol edin
3. `SUPABASE_ENTEGRASYON_REHBERI.md` dosyasına bakın
4. Supabase dokümantasyonunu inceleyin

---

## 🎯 Hızlı Kontrol Listesi

- [ ] API anahtarları doğru mu?
- [ ] Supabase projesi aktif mi?
- [ ] `contacts` tablosu var mı?
- [ ] RLS politikaları oluşturulmuş mu?
- [ ] Konsolda hata var mı?
- [ ] Durum göstergesi yeşil mi?
- [ ] Kayıtlar yükleniyor mu?

---

**🔍 Kontrol tamamlandı! Artık veritabanı bağlantınızı test edebilirsiniz.**
