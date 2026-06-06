# Hosting — cPanel public_html

Proje **cPanel Dosya Yöneticisi** ile **public_html** klasörüne yüklendiğinde çalışacak şekilde ayarlıdır. Domain’e özel klasör veya ayar gerekmez.

## Yükleme

1. cPanel → **Dosya Yöneticisi** → **public_html** klasörünü açın.
2. **yeni_entegrasyon_projesi** klasörünün **içindeki tüm dosya ve klasörleri** doğrudan **public_html** içine yükleyin.
3. Sonuç: `public_html/index.html`, `public_html/style.css`, `public_html/js/`, `public_html/ekip/`, `public_html/phone/`, `public_html/Birimistatistic/dist/` vb. olmalı. **Birimistatistic** klasörünü yüklerken içindeki **dist** klasörünü de ekleyin (ana sayfadaki Birim İstatistik kartı `Birimistatistic/dist/index.html` adresine gider).

## Kontrol

- Ana sayfa: `https://siteniz.com/` veya `https://www.siteniz.com/`
- Giriş: `https://siteniz.com/login.html`
- Ekip: `https://siteniz.com/ekip/index.html`
- Kayıtlar: `https://siteniz.com/ekip/kayitlar.html`
- Telefon rehberi: `https://siteniz.com/phone/index.html`
- Birim İstatistik: `https://siteniz.com/Birimistatistic/dist/index.html` (klasörü yüklerken **Birimistatistic/dist** tamamen güncellenmeli; ayrıntı: `Birimistatistic/DEPLOY-PORTFOLYO.md`)

### Birim İstatistik hâlâ eski arayüzü gösteriyorsa

1. Yerelde: `cd Birimistatistic && npm run build`
2. Sunucuda `public_html/Birimistatistic/dist/` klasörünü **tamamen** yenileyin (`index.html` + `assets/*.js` + `BUILD_VERSION.txt`)
3. Sekme başlığı **Birim İstatistik — Sicil Veri** olmalı (eski sürüm: *MongoDB* yazar)
4. `https://siteniz.com/Birimistatistic/dist/BUILD_VERSION.txt` dosyasını açıp tarihin bugün olduğunu doğrulayın

## Giriş (Firebase) için

Firebase Console → **Authentication** → **Authorized domains** bölümüne sitenizin domain’ini (örn. `siteniz.com`, `www.siteniz.com`) ekleyin. Eklenmezse sayfa açılır ama “Giriş Yap” çalışmaz.

## Sayfa açılıyor ama tasarım boş/bozuksa

1. **Dosya yapısını kontrol edin**  
   `public_html` içinde **doğrudan** şunlar olmalı: `index.html`, `style.css`, `script.js`, `js` klasörü, `assets` klasörü, `ekip`, `phone`, `matbaa` vb.  
   **Yanlış:** `public_html/yeni_entegrasyon_projesi/index.html` (içerik bir alt klasörde).  
   **Doğru:** `public_html/index.html` (içerik doğrudan public_html’te).

2. **Alt klasörde kaldıysa**  
   `yeni_entegrasyon_projesi` klasörünü **açıp** içindeki her şeyi (index.html, style.css, script.js, js, assets, ekip, …) **sürükleyip** `public_html` içine taşıyın. Sonra adres olarak `https://siteniz.com/` kullanın (alt klasör değil).

3. **Tarayıcıda F12 → Network**  
   Sayfayı yenileyin. `style.css` ve `script.js` satırına bakın: **200** mi, **404** mü? 404 ise dosya yolu yanlış veya dosya yok demektir; yapıyı yukarıdaki gibi düzeltin.

4. **index.html’de base etiketi**  
   Projede sayfa açıldığı dizine göre CSS/JS yollarını düzelten bir `<base>` etiketi vardır. Dosyalar doğru yerde olsa bile tasarım bozuksa, yukarıdaki adımlarla yapıyı kontrol edin.

## Özet

- Domain’e özel ayar yok; **public_html** köküne atınca çalışır.
- İçeriği **doğrudan** public_html’e atın; üstte `yeni_entegrasyon_projesi` klasörü kalmasın.
