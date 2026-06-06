# Proje Güvenlik Altyapısı Özeti

Bu belge, **Yeni Entegrasyon Projesi** (ana sayfa, login, Birimistatistic, ekip, vb.) genelinde güvenlik durumunu özetler: kimlik doğrulama, yetkilendirme, veri koruma ve öneriler.

**Son güvenlik testi:** Bu belge, güncel koda göre yeniden değerlendirilmiştir (Birimistatistic: yalnızca Firebase Auth + Firestore; demo ve MongoDB sunucu kaldırıldı).

---

## 1. Kimlik doğrulama (Authentication)

### 1.1 Ana proje (index.html, login.html, js/auth.js)
- **Firebase Authentication** kullanılıyor (e-posta/şifre).
- Giriş durumu tarayıcıda Firebase SDK ile yönetiliyor; çıkışta oturum temizleniyor.
- **Şifre sıfırlama:** `sendPasswordResetEmail` ile e-posta üzerinden sıfırlama bağlantısı gönderiliyor (login.html ve Birimistatistic Auth’ta).
- **Yapılandırma:** `js/auth.js` içinde Firebase `apiKey`, `projectId` vb. **doğrudan kodda** tanımlı. Firebase’de API anahtarı istemci tarafında kullanım için tasarlandığından tam “gizli” değildir; yine de hassasiyeti azaltmak için ortam değişkeni veya ayrı config dosyası kullanılabilir.

### 1.2 Birimistatistic (Auth.tsx, firebase-auth.ts, mongodb.ts)
- **Giriş yalnızca Firebase Authentication** ile yapılır. Demo mod ve MongoDB tabanlı oturum kaldırıldı.
- Yapılandırma: `.env` / `.env.local` içinde `VITE_USE_FIRESTORE=true` ve `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID` zorunludur. Bu değerler yoksa uygulama “Firebase yapılandırılmamış” ekranı gösterir; giriş yapılamaz.
- Oturum kontrolü: `App.tsx` içinde `session` yoksa `<Auth />` gösterilir; çıkışta aynı giriş formu açılır.
- **Şifre sıfırlama:** Firebase `sendPasswordResetEmail` ile desteklenir (Auth.tsx).

---

## 2. Yetkilendirme (Authorization)

- **Rol / yetki ayrımı yok:** Uygulama içinde “admin”, “editör”, “sadece oku” gibi roller tanımlı değil. Giriş yapan her kullanıcı aynı işlemleri yapabilir:
  - Veri girişi, güncelleme, kesinleştirme
  - Raporlar, PDF/Excel dışa aktarma
  - “Veritabanını sıfırla” ile tüm işlem kayıtlarının silinmesi
- **Birim filtreleme** sadece veri görünümü içindir; bir kullanıcı tüm birimlerin verilerini görebilir ve silebilir (yetki kısıtı yok).

**Öneri:** Kurumsal kullanımda rol tabanlı erişim (RBAC) veya birim bazlı yetkilendirme eklenmesi güvenliği artırır.

**Not:** Viewer / editor / admin rolleri kaldırıldı; giriş yapan herkes aynı yetkilere sahip. (Aşağıdaki eski rol maddeleri referans için bırakıldı.)

**Eski rol maddeleri (artık uygulanmıyor):**
1. **Roller tanımla** — Örn. `admin`, `editör`, `sadece oku`; roller Firebase (Custom Claims) veya Firestore kullanıcı dokümanında tutulabilir.
2. **UI’da role göre kısıtla** — Sadece oku: veri girişi/kesinleştirme/sıfırla butonlarını gizle; editör: sıfırla’yı gizle; admin: tüm işlemler.
3. **Birim bazlı yetki (isteğe bağlı)** — Kullanıcıya “yetkili birimler” listesi bağla; liste dışı birimlerin verilerini gösterme ve yazma/silme işlemlerini engelle.
4. **Firestore kurallarını güncelle** — Okuma/yazma/silme için `request.auth.token.role` veya birim listesi kontrolü ekle (istemci tek başına güvenilir değil).

---

## 3. Backend / API (Birimistatistic)

- **Durum:** Birimistatistic için ayrı Express/MongoDB sunucusu **kaldırıldı**. Veri doğrudan **Firestore** üzerinden okunup yazılıyor; tüm istekler Firebase SDK ile istemciden Firestore’a gider.
- **Sonuç:** Sunucu tarafında CORS, API anahtarı veya rate limiting konusu yok. Erişim kontrolü tamamen Firebase Auth + Firestore kurallarına bağlıdır.

---

## 4. Veritabanı ve hassas veriler

### 4.1 Firebase / Firestore (Birimistatistic)
- Firebase yapılandırması `VITE_*` ile env’den geliyor; build’e gömülü olur ama repo’da doğrudan yazılmıyor.
- **Firestore kuralları:** Proje içinde rules dosyası yok; kurallar Firebase Console’da yönetiliyor.
  - Geliştirme için `allow read, write: if true` örnek verilmiş (herkese açık; **sadece test için**).
  - **Üretim için** `request.auth != null` (ve gerekirse alan/birim kuralları) kullanılmalı.
- **Önemli:** Firestore’da `if true` kullanılıyorsa, proje yapılandırmasına (apiKey vb.) sahip herkes veriyi okuyup yazabilir. Canlı ortamda mutlaka `request.auth != null` kullanılmalı.

### 4.2 Ana proje Firebase config (js/auth.js)
- `apiKey`, `projectId` vb. doğrudan `auth.js` içinde. Repo’ya commit edilirse herkes görebilir. Firebase istemci anahtarları “public” kabul edilir; yine de tek kaynak olarak env veya config ile yönetmek daha iyi olur.

---

## 5. İstemci tarafı ve girdi güvenliği

- **React (Birimistatistic):** Varsayılan olarak içerik escape edilir; kullanıcı girdisi `dangerouslySetInnerHTML` ile kullanılmıyor. XSS riski düşük.
- **auth.js:** Sabit metin ve ikonlar için `innerHTML` kullanılıyor; kullanıcı girdisi bu alanlara yazılmıyor, risk sınırlı.
- **Form verileri:** Tarih, birim, sayısal alanlar client tarafında kontrol ediliyor; özel karakterler veritabanına doğrudan HTML olarak render edilmediği için XSS açığı oluşturmuyor.
- **CSRF:** Birimistatistic doğrudan Firestore kullandığı için ayrı bir form POST API’si yok; Firebase SDK kendi güvenlik mekanizmalarını kullanır. Same-origin dağıtımda pratik risk düşüktür.

---

## 6. Dağıtım ve iletişim

- **HTTPS:** Kodda zorunlu kılınmıyor; sunucu ve ters proxy (ör. Nginx, bulut LB) üzerinden HTTPS kullanılması önerilir.
- **Ortam ayrımı:** Geliştirme ve production için ayrı Firebase projeleri kullanmak, canlı veriyi ve kullanıcıları izole eder.

---

## 7. Özet tablo

| Konu | Durum | Not |
|------|--------|-----|
| Kimlik doğrulama (ana proje) | Var | Firebase Auth; config kodda |
| Kimlik doğrulama (Birimistatistic) | Var | **Yalnızca** Firebase Auth (demo kaldırıldı) |
| Şifre sıfırlama | Var | login.html + Birimistatistic Auth |
| Rol / yetki ayrımı | Yok | Tüm kullanıcılar aynı yetkide |
| Birimistatistic sunucu API | Yok | Kaldırıldı; veri doğrudan Firestore |
| Hassas veriler (Birimistatistic) | İyi | Firebase config env’den (VITE_*) |
| Firebase config (ana proje) | Kodda | auth.js içinde sabit |
| Firestore kuralları | Console’da | Prod’da `request.auth != null` önerilir |
| XSS | Düşük risk | React escape; innerHTML sadece sabit içerik |
| HTTPS | Kod dışı | Dağıtımda zorunlu kılınmalı |

---

## 8. Önerilen iyileştirmeler (kısa liste)

1. **Firestore:** Canlı ortamda `request.auth != null` (ve gerekirse alan/birim kuralları) kullanın; `allow read, write: if true` sadece test için.
2. **Ana proje Firebase config:** `apiKey` ve diğer değerleri ortam değişkeni veya build-time config’e taşıyın; repo’da sabit bırakmayın.
3. **Yetkilendirme:** Birimistatistic’te rol veya birim bazlı yetki (ör. sadece kendi birimini görme/düzenleme) eklenebilir.
4. **HTTPS:** Production’da HTTPS zorunlu olacak şekilde sunucu ve proxy ayarlarını yapın.

---

## 9. Güvenlik testi — Kontrol listesi

Aşağıdaki liste, güvenlik durumunu periyodik olarak doğrulamak için kullanılabilir. Her satırı test edip sonucu (✓ / ✗) işaretleyin.

| # | Kontrol | Beklenen | Sonuç |
|---|--------|----------|--------|
| 1 | Birimistatistic’e giriş yalnızca Firebase Auth ile yapılabiliyor mu? | Evet; .env olmadan veya geçersiz kimlikle giriş yok | |
| 2 | Firebase yapılandırması yokken “Firebase yapılandırılmamış” ekranı görünüyor mu? | Evet | |
| 3 | Şifre sıfırlama (Birimistatistic) çalışıyor mu? | Evet (Firebase e-posta gönderir) | |
| 4 | Firestore kuralları canlıda `request.auth != null` ile kısıtlı mı? | Evet (Console’da kontrol edin) | |
| 5 | Ana proje login (js/auth.js) sadece kayıtlı kullanıcılara mı izin veriyor? | Evet | |
| 6 | React uygulamasında kullanıcı girdisi doğrudan HTML’e enjekte edilmiyor mu? | Evet; dangerouslySetInnerHTML yok | |
| 7 | Hassas değerler (Birimistatistic) .env’de, repo’da sabit değil mi? | Evet | |
| 8 | Production ortamı HTTPS ile sunuluyor mu? | Evet (sunucu/proxy ayarı) | |

**Test tarihi:** _________________  
**Testi yapan:** _________________

Bu belge, mevcut koda göre hazırlanmış bir özettir; kurumsal denetim veya uyumluluk için ek güvenlik incelemesi yapılması faydalı olur.
