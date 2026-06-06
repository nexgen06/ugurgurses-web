# ugurgurses.com.tr — Birim İstatistik yayını

Ana sitedeki kart şu adrese gider: **`/Birimistatistic/dist/index.html`**

Yalnızca kaynak kodu değil, **`npm run build` sonrası `dist/` klasörünün tamamı** cPanel `public_html` içine yüklenmelidir.

## Hızlı yayın

```bash
cd /Users/ugurgurses/Desktop/assets/Birimistatistic
npm run build
```

Sonra FTP / Dosya Yöneticisi ile şunu sunucuya kopyalayın (eski dosyaların üzerine yazın):

| Yerel | Sunucu |
|-------|--------|
| `Birimistatistic/dist/*` | `public_html/Birimistatistic/dist/` |

**Önemli:** `public_html/Birimistatistic/dist/assets/` içindeki tüm `.js` dosyaları da güncellenmeli. Eski `index-*.js` kalırsa tarayıcı eski arayüzü gösterir.

## Doğru sürümü kontrol

Yeni sürümde sayfa başlığı: **Birim İstatistik — Sicil Veri**  
Eski (MongoDB) sürümde başlık: **Sağlık Personeli Sicil Takip - MongoDB**

Tarayıcıda `https://www.ugurgurses.com.tr/Birimistatistic/dist/index.html` açıp sekme başlığına bakın.

## Yanlış klasör uyarısı

`/Users/ugurgurses/Desktop/Birimistatistic` (Desktop kökü) **ayrı ve eski** bir kopya olabilir.  
Geliştirme ve yayın için her zaman:

`/Users/ugurgurses/Desktop/assets/Birimistatistic`

## Firebase

- Authentication → Authorized domains: `ugurgurses.com.tr`, `www.ugurgurses.com.tr`
- Build öncesi `.env.local` içinde `VITE_USE_FIRESTORE=true` ve `VITE_FIREBASE_*` dolu olmalı (build sırasında gömülür).
