# Birim İstatistik

Birim bazlı günlük işlem kayıtları, dashboard, raporlar ve kullanıcı yönetimi. Veri **Firebase Firestore**, giriş **Firebase Authentication** ile yapılır.

## Kurulum

1. `npm install`
2. `.env.local` dosyasını `.env.example` örneğine göre doldurun (`VITE_USE_FIRESTORE=true` ve `VITE_FIREBASE_*`)
3. Firebase Console’da Authentication (e-posta/şifre) ve Firestore’u etkinleştirin
4. `firestore.rules` dosyasını Console → Firestore → Rules’a yapıştırıp yayınlayın
5. `npm run dev` — geliştirme
6. `npm run build` — `dist/` üretimi (statik hosting)

## İlk admin

Firestore’da `config/admins` dokümanı oluşturun; `uids` alanına (dizi) ilk yönetici kullanıcının Auth UID’sini ekleyin.

## Demo veri (isteğe bağlı)

Şifreyi repoya yazmayın; tek seferlik ortam değişkeni ile:

```bash
SEED_ADMIN_EMAIL=admin@ornek.com SEED_ADMIN_PASSWORD='...' npm run seed
```

Önceki demo kayıtlarını silip yeniden yüklemek için: `npm run seed -- --clear` (aynı env ile).

## Veri kalitesi ve denetim

- **Eksik gün hatırlatıcısı:** Salı–Perşembe, üst bantta (editör: dün kendi kaydı yok; proje yetkilisi: birimde dün kayıt yok).
- **Anomali uyarısı:** Proje yetkilisi/admin — bir kategoride günlük adet, son dönem medyanının 10 katından fazlaysa uyarı.
- **Denetim günlüğü:** `audit_log` — kilit açma, manuel/otomatik kesinleştirme. Yönetim ekranında son kayıtlar.

`firestore.rules` güncellendiyse Firebase Console’da **Yayınla** unutmayın.
