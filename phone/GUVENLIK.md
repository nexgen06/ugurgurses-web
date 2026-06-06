# Telefon Rehberi Uygulaması - Güvenlik Dokümantasyonu

## 🔒 Mevcut Güvenlik Durumu

### ✅ Güvenli Olan Özellikler

1. **Authentication (Kimlik Doğrulama)**
   - Firebase Authentication entegrasyonu mevcut
   - Supabase Authentication desteği var
   - Kullanıcı girişi zorunlu

2. **Input Validation (Girdi Doğrulama)**
   - Form alanları için temel validasyon var
   - E-posta format kontrolü yapılıyor
   - Zorunlu alan kontrolü mevcut

3. **HTTPS Desteği**
   - Supabase varsayılan olarak HTTPS kullanır
   - Production'da HTTPS zorunlu olmalı

### ⚠️ Güvenlik Açıkları ve Öneriler

#### 1. **LocalStorage Güvenliği (Demo Modu)**

**Mevcut Durum:**
- Demo modunda veriler localStorage'da şifrelenmemiş olarak saklanıyor
- Tarayıcı Developer Tools ile erişilebilir

**Öneriler:**
- Production'da Supabase kullanılmalı
- Hassas veriler localStorage'da saklanmamalı
- Eğer localStorage kullanılacaksa, veriler şifrelenmeli

#### 2. **Supabase Row Level Security (RLS) Politikaları**

**Gerekli:**
Supabase'de `contacts` tablosu için RLS politikaları oluşturulmalı:

```sql
-- RLS'yi etkinleştir
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Sadece authenticated kullanıcılar okuyabilsin
CREATE POLICY "Kullanıcılar kendi kayıtlarını görebilir"
ON contacts FOR SELECT
TO authenticated
USING (true);

-- Sadece authenticated kullanıcılar ekleyebilsin
CREATE POLICY "Kullanıcılar kayıt ekleyebilir"
ON contacts FOR INSERT
TO authenticated
WITH CHECK (true);

-- Sadece authenticated kullanıcılar güncelleyebilsin
CREATE POLICY "Kullanıcılar kayıt güncelleyebilir"
ON contacts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Sadece authenticated kullanıcılar silebilsin
CREATE POLICY "Kullanıcılar kayıt silebilir"
ON contacts FOR DELETE
TO authenticated
USING (true);
```

#### 3. **XSS (Cross-Site Scripting) Koruması**

**Mevcut Durum:**
- `innerHTML` kullanılmıyor ✅
- `textContent` kullanılıyor ✅
- Ancak template literal'lerde dikkatli olunmalı

**Öneriler:**
- Tüm kullanıcı girdileri escape edilmeli
- DOMPurify gibi bir kütüphane kullanılabilir

#### 4. **CSRF (Cross-Site Request Forgery) Koruması**

**Öneriler:**
- Supabase otomatik CSRF koruması sağlar
- Custom API endpoint'leri için CSRF token kullanılmalı

#### 5. **Rate Limiting**

**Öneriler:**
- Supabase'de rate limiting ayarlanmalı
- Çok fazla istek gönderen IP'ler engellenmeli

#### 6. **Veri Şifreleme**

**Öneriler:**
- Hassas veriler (telefon numaraları, e-postalar) Supabase'de şifrelenebilir
- Client-side encryption için Web Crypto API kullanılabilir

## 🛡️ Güvenlik En İyi Uygulamaları

### 1. Supabase Yapılandırması

```javascript
// Production'da environment variables kullanın
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Service Role Key asla client-side'da kullanılmamalı!
```

### 2. Veri Doğrulama

```javascript
// Tüm kullanıcı girdilerini doğrulayın
function validateContact(contact) {
  // E-posta formatı
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contact.email)) {
    throw new Error('Geçersiz e-posta adresi');
  }
  
  // Telefon numarası formatı
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(contact.phone)) {
    throw new Error('Geçersiz telefon numarası');
  }
  
  // SQL Injection koruması için özel karakterler
  const dangerousChars = /[<>'"&]/;
  if (dangerousChars.test(contact.name) || dangerousChars.test(contact.title)) {
    throw new Error('Geçersiz karakterler içeriyor');
  }
  
  return true;
}
```

### 3. Güvenli Veri Saklama

```javascript
// Hassas verileri şifreleme (opsiyonel)
async function encryptData(data, key) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    dataBuffer
  );
  return { encrypted, iv };
}
```

## 📋 Güvenlik Kontrol Listesi

- [x] Authentication zorunlu
- [x] Input validation mevcut
- [ ] Supabase RLS politikaları oluşturulmalı
- [ ] Rate limiting yapılandırılmalı
- [ ] HTTPS zorunlu olmalı (production)
- [ ] Veri şifreleme eklenebilir (opsiyonel)
- [ ] Düzenli güvenlik denetimleri yapılmalı
- [ ] Loglama ve monitoring eklenmeli

## 🚨 Acil Yapılması Gerekenler

1. **Supabase RLS Politikaları Oluştur**
   - Yukarıdaki SQL komutlarını Supabase SQL Editor'de çalıştırın

2. **Environment Variables Kullan**
   - Production'da API anahtarları environment variables'dan alınmalı
   - Client-side'da hardcode edilmemeli

3. **HTTPS Zorunluluğu**
   - Production'da HTTPS kullanılmalı
   - HTTP üzerinden hassas veri gönderilmemeli

4. **Düzenli Yedekleme**
   - Supabase otomatik yedekleme sağlar
   - Ek yedekleme stratejisi oluşturulabilir

## 📞 Güvenlik Sorunları Bildirimi

Güvenlik açığı bulursanız lütfen derhal bildirin:
- E-posta: [güvenlik@firma.com]
- Güvenli iletişim kanalı kullanın

## 📚 Ek Kaynaklar

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Security Guidelines](https://developer.mozilla.org/en-US/docs/Web/Security)
