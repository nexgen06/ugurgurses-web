# Phone — Supabase Güvenlik Sıkılaştırma (Seviye 2)

Bu doküman, phone uygulamasını **Firebase JWT bağımlı sıkı RLS**'e geçirmek için yapılması gereken üç adımı anlatır.

> Hedef: Anon key tarayıcıda olsa bile, başka bir kullanıcının veya anonim birinin verilerimize erişmesi/yazması/silmesi imkânsız hale gelsin.

---

## Adım 1 — Supabase Dashboard'da Firebase'i Third-Party Auth olarak ekle

1. https://supabase.com/dashboard → **Ekip hub** projesini aç (`mmahcxmfnuoovgqgvjag`)
   > Eski phone projesi (`qeddmysxoezdtwdhdccj`) kullanımdan kalktı; bkz. `EKIP-PHONE-SUPABASE.md`
2. Sol menü → **Authentication**
3. Üstteki sekmelerden **Sign In / Providers** veya **Providers** sekmesine gel
4. Aşağıya in: **Third-Party Auth** bölümü → **Add provider** → **Firebase**
5. Açılan formda:
   - **Firebase project ID:** `mulakat-takip-sistemi`
   - (Diğer alanlar otomatik dolar; doğrulama URL'i Supabase tarafından
     `https://securetoken.google.com/mulakat-takip-sistemi` olarak ayarlanır)
6. **Save** / **Enable**

> Eğer Dashboard'unuzda "Third-Party Auth" başlığını göremiyorsanız özelliğin
> projenizde aktif olması için Supabase'in yeni **Auth** modunda olmanız
> gerekebilir. **Authentication → Settings**'te "JWT" / "Auth Hook" / "Third
> Party" gibi alt başlıklara da bakın. Görmüyorsanız bana yazın, alternatif
> yöntemi (custom JWT secret) anlatırım.

---

## Adım 2 — RLS politikalarını çalıştır

`phone/SUPABASE_KURULUM.sql` dosyasını **SQL Editor**'de baştan sona bir
kez daha **Run** edin. Önceki açık politikaları otomatik düşürür ve
sıkı (JWT bağımlı) politikaları kurar.

Doğrulama (aynı SQL Editor'de):

```sql
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'contacts';
```

`roles = {authenticated}` ve `qual` içinde `auth.jwt() ->> 'sub'` görmelisiniz.

---

## Adım 3 — Uygulamayı test et

Tarayıcıda http://localhost:8000/phone/index.html

1. **Hard reload** (⌘+Shift+R)
2. Konsolda şunu görmelisiniz:
   ```
   ✅ Supabase client başarıyla oluşturuldu (Firebase JWT bridge aktif)
   ```
3. Login → kayıt ekleme/silme normal çalışmalı.
4. **Çıkış yaptığınızda** ya da login olmadan açtığınızda kayıt görünmemeli
   (RLS authenticated rolüne kısıtlı).

---

## Saldırgan testleri (yapılması gerekenler — ben de yardımcı olabilirim)

Aşağıdakilerin hepsi **boş sonuç** dönmeli ya da 401/permission hatası vermeli:

```bash
# 1) Hiç token yok – publishable key ile direkt API
curl 'https://qeddmysxoezdtwdhdccj.supabase.co/rest/v1/contacts?select=*' \
  -H 'apikey: sb_publishable_QGdUHOtwVJ5HxmzloDVfTA_vvmfRII6' \
  -H 'Authorization: Bearer sb_publishable_QGdUHOtwVJ5HxmzloDVfTA_vvmfRII6'
# Beklenen: []  (anon authenticated rolünde değil; SELECT politikası onu dışlıyor)

# 2) Sahte JWT – auth.jwt() doğrulanırken Supabase imzayı kabul etmemeli
curl 'https://qeddmysxoezdtwdhdccj.supabase.co/rest/v1/contacts?select=*' \
  -H 'apikey: sb_publishable_QGdUHOtwVJ5HxmzloDVfTA_vvmfRII6' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.fake.fake'
# Beklenen: 401 / "JWT failed validation" / boş

# 3) Geçerli Firebase JWT (kendiniz)
# Beklenen: sadece kendi kayıtlarınız döner
```

---

## Mimari Şema

```
[ Tarayıcı ]
     │  1) Firebase Auth -> ID Token (imzalı JWT)
     ▼
[ supabase-js client ]
     │  2) Authorization: Bearer <Firebase ID Token>
     │     apikey: <publishable_key>
     ▼
[ Supabase API ]
     │  3) Third-Party Auth: Firebase JWKS ile JWT imza doğrulama
     │     -> auth.jwt()->>'sub' = Firebase UID
     ▼
[ PostgreSQL + RLS ]
     │  4) policy:  firebase_user_id = auth.jwt()->>'sub'
     ▼
  yalnızca o kullanıcının kayıtları döner
```

Bu hat boyunca:
- `publishable_key` herkesin elinde olabilir → tek başına **hiçbir şey okumaz/yazmaz**.
- Saldırgan başka bir UID gönderemez → çünkü JWT imzasız geçmez.
- Tarayıcıdaki kullanıcı `firebase_user_id` alanını manipüle ederek başkasının verisine ulaşamaz → çünkü RLS, JWT'deki `sub`'a bakar, formdaki UID'ye değil.
