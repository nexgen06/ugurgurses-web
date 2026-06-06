# Şifre Yenileme Özelliği — Yapılacaklar Bilgilendirmesi

Bu belge, **Yeni Entegrasyon Projesi** kapsamındaki login / Authentication arayüzlerine **şifre yenileme (forgot password)** eklemeden önce neler yapacağımızı özetler. Uygulama henüz yapılmamıştır; onayınız veya tercihiniz sonrası adımlar uygulanabilir.

---

## 1. Hangi arayüzler var?

Projede kimlik doğrulama kullanan iki yer var:

| Arayüz | Konum | Auth sistemi |
|--------|--------|----------------|
| **Birimistatistic giriş** | `Birimistatistic/components/Auth.tsx` | Firebase Auth (Firestore açıksa) veya **Demo** (LocalStorage, şifre yok) |
| **Ana proje giriş** | `login.html` + `js/auth.js` | Firebase Auth (mulakat-takip-sistemi projesi) |

Şifre yenileme **sadece gerçek Firebase Auth kullanıldığında** anlamlıdır. Demo modda gerçek şifre olmadığı için “şifremi unuttum” ya gizlenecek ya da “Demo modda şifre sıfırlama yok” mesajı gösterilecek.

---

## 2. Firebase Auth ile şifre yenileme — teknik özet

- Firebase’in **sendPasswordResetEmail(email)** fonksiyonu kullanılacak.
- Kullanıcı e‑posta adresini girer → uygulama bu fonksiyonu çağırır → Firebase, o adrese **şifre sıfırlama bağlantısı** içeren e‑posta gönderir.
- Kullanıcı e‑postadaki linke tıklar → Firebase’in (veya sizin tanımladığınız) sayfada **yeni şifreyi** girer → şifre güncellenir.
- Şifre değişikliği tamamen Firebase tarafında; bizim backend’e ekstra bir “şifre sıfırlama” API’si yazmamız gerekmez.

---

## 3. Yapılacak işler (plan)

### 3.1 Birimistatistic (React – Auth.tsx)

1. **Arayüz**
   - Giriş formunun altına (şifre alanının yanında veya altında) **“Şifremi unuttum”** / **“Şifre sıfırlama”** gibi bir link ekleyeceğiz.
   - Bu linke tıklanınca:
     - **Firebase kullanılıyorsa:** Küçük bir akış açılacak (modal veya aynı sayfada alan): sadece **e‑posta** istenecek → “Sıfırlama bağlantısı gönder” butonu → Firebase’e `sendPasswordResetEmail` çağrılacak.
     - **Demo modda:** “Şifre sıfırlama demo modda kullanılamaz.” benzeri bir mesaj gösterilecek veya link hiç gösterilmeyecek.

2. **Başarı / hata mesajları**
   - Başarı: “E‑posta adresinize şifre sıfırlama bağlantısı gönderildi. Lütfen gelen kutunuzu kontrol edin.”
   - Hata: Firebase’den gelen hatayı Türkçe’ye çevirip göstereceğiz (ör. “Bu e‑posta adresi kayıtlı değil”, “Çok fazla istek, daha sonra tekrar deneyin”).

3. **Kod tarafı**
   - `firebase-auth.ts` içinde yeni bir fonksiyon eklenecek: örn. **sendPasswordResetEmail(email)**. Bu, Firebase Auth’un `sendPasswordResetEmail`’ini sarmalayacak.
   - `mongodb.ts` içinde `db.auth` Demo (MongoAuth) ile kullanıldığında bu fonksiyon ya yok sayılacak ya da “demo modda kullanılamaz” döndürecek.
   - Auth.tsx’te:
     - “Şifremi unuttum” tıklanınca e‑posta girişi + gönder butonu gösterilecek.
     - Gönder’e basınca `db.auth.sendPasswordResetEmail(email)` çağrılacak; sonuca göre başarı/hata mesajı gösterilecek.

### 3.2 Ana proje girişi (login.html + js/auth.js)

1. **Arayüz**
   - `login.html` içindeki giriş formuna **“Şifremi unuttum”** linki eklenecek.
   - Tıklanınca:
     - E‑posta alanı + “Sıfırlama bağlantısı gönder” butonu olan bir modal veya panel açılacak.
     - `auth.js` içinde Firebase **sendPasswordResetEmail** kullanılacak; başarı/hata mesajı gösterilecek.

2. **Kod tarafı**
   - `js/auth.js` içinde Firebase Auth’u import ederken **sendPasswordResetEmail** da alınacak.
   - Yeni bir fonksiyon (ör. `requestPasswordReset(email)`) yazılacak; bu fonksiyon `sendPasswordResetEmail(auth, email)` çağıracak.
   - Form gönderilince bu fonksiyon çalıştırılacak; sonuç kullanıcıya metin olarak gösterilecek.

### 3.3 Firebase Console (sizin yapacaklarınız – isteğe bağlı)

- **Authentication → Sign-in method:** E‑posta/şifre zaten açıksa ekstra bir şey yapmanız gerekmez.
- **Authentication → Templates:** “Password reset” e‑posta şablonunu isterseniz Türkçe’ye çevirebilirsiniz; gönderen adı ve metin buradan düzenlenir.
- **Action URL (isteğe bağlı):** Varsayılan olarak şifre sıfırlama, Firebase’in kendi sayfasına yönlendirir. Kendi sitenizde (örn. `yenisite.com/sifre-yenile`) bir sayfa açmak isterseniz Firebase Console’da “Customize action URL” ile bu adresi tanımlayabilirsiniz; bu durumda o sayfada Firebase’in “yeni şifre belirleme” kodunu kullanmanız gerekir.

Bu adımlar olmadan da şifre sıfırlama **çalışır**; sadece e‑posta metni ve link hedefi varsayılan kalır.

---

## 4. Özet tablo

| Adım | Nerede | Ne yapılacak |
|------|--------|----------------|
| 1 | Birimistatistic | Auth ekranına “Şifremi unuttum” linki |
| 2 | Birimistatistic | E‑posta gir + “Sıfırlama gönder” akışı (Firebase açıksa) |
| 3 | firebase-auth.ts | sendPasswordResetEmail sarmalayan fonksiyon |
| 4 | mongodb.ts / db.auth | Demo modda şifre sıfırlama davranışı (gizle veya mesaj) |
| 5 | login.html | “Şifremi unuttum” linki |
| 6 | js/auth.js | sendPasswordResetEmail import + çağrı, başarı/hata mesajı |
| 7 | (İsteğe bağlı) | Firebase Console: e‑posta şablonu / özel URL |

---

## 5. Sonraki adım

Bu plan sizin için uygunsa, sırayla:

1. **Birimistatistic** Auth ekranı + `firebase-auth.ts` + Demo mod davranışı,  
2. Ardından **login.html** ve **auth.js**

ile şifre yenileme özelliğini ekleyebilirim. İsterseniz önce sadece Birimistatistic veya sadece ana proje girişi ile de başlayabiliriz; tercihinizi belirtmeniz yeterli.
