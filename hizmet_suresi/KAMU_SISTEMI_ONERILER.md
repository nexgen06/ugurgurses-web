# Hizmet Süresi Uygulaması — Türkiye Kamu Sistemi Önerileri

Bu belge, 657 sayılı DMK, SGK ve Emekli Sandığı uygulamalarına uyum için ek önerileri içerir.

---

## 1. Mevcut Uygulamanın Kamu Uyumu

- **360 gün / 30 gün ay:** SGK ve birçok kurumda kullanılır; Ayarlar’da seçili kalması uygundur.
- **Bitiş tarihi dahil (+1 gün):** SGK hizmet dökümünde işten çıkış günü çalışılan güne dahildir; bu seçenek doğru varsayılandır.
- **Özel sektör 3/4:** Memur intibakında kendi ünvanında özel sektör hizmetinin 3/4’ü geçerli (teknik hizmetler sınıfı vb.); uygulama bunu destekliyor.
- **Memuriyete / Emekliliğe / Yıllık izne esas:** Kesintileri farklı esaslara göre düşme seçeneği kamu pratiğiyle uyumludur.

---

## 2. Önerilen İyileştirmeler

### 2.1 Kesinti türleri

- **Ücretsiz izin:** Kamuda 1 yıla kadar (ve bazı hallerde daha fazla) ücretsiz izin; memuriyete/emekliliğe/yıllık izne esas’tan düşülür. “Diğer Kesinti” ile eklenebilir; isteğe bağlı olarak “Ücretsiz İzin” adında özel bir kesinti butonu eklenebilir.
- **Adaylık süresi:** Adaylık eğitimi süresi genelde **memuriyete esas**ta sayılır, **emekliliğe esas**ta sayılmaz (kurum uygulamasına göre değişebilir). İsteğe bağlı “Adaylık” kesinti türü veya “Adaylık süresi sayılsın mı?” bilgi notu eklenebilir.
- **Doğum borçlanması:** Kadın personel için 2 yıla kadar doğum süresi borçlanılabilir; uygulama sadece hesaplama yapıyorsa “Doğum İzni” kesintisi yeterli; istenirse “Borçlanma yapıldığında bu süre eklenir” şeklinde kısa bilgi kutusu eklenebilir.

### 2.2 Emeklilik ve yaş

- **Emeklilik yaşı:** 5434 (Emekli Sandığı) / 5510 (SGK) yaş koşulları metin olarak özetlenebilir (örn. “25 yıl hizmet + yaş şartı”).
- **Tahmini emeklilik tarihi:** Doğum tarihi + cinsiyet girilirse, mevcut hizmet süresine göre “tahmini emeklilik tarihi” veya “kalan süre” bilgi metni gösterilebilir (sadece bilgilendirme; resmi hesaplama kurumdadır).

### 2.3 Bağ-Kur ve farklı oranlar

- **Bağ-Kur hizmeti:** Özel sektörde Bağ-Kur’lu çalışma da 3/4 veya kurumun kabul ettiği oranda sayılabilir. “Özel Sektör” için isteğe bağlı oran seçimi (3/4, 1/2 vb.) eklenebilir; varsayılan 3/4 kalabilir.
- **Farklı kamu kurumları:** “Diğer Kamu” tam sayılır; ek olarak “Yurt dışı hizmet” gibi özel oranlı bir kalem ileride eklenebilir.

### 2.4 Raporlama ve dışa aktarma

- **PDF / Excel özeti:** Hesaplanan toplam hizmet, memuriyete esas, emekliliğe esas, yıllık izne esas ve kullanılan parametreler (360/365, bitiş dahil, yuvarlama) tek sayfalık PDF veya Excel olarak indirilebilir; personel veya insan kaynakları için referans olur.
- **SGK dökümü uyumu:** Arayüzde “Hesaplama, SGK hizmet dökümü bitiş tarihi dahil ve 360 gün yıl kabulüne göre yapılmaktadır” gibi kısa bir not, kullanıcı güvenini artırır.

### 2.5 Kullanılabilirlik ve metinler

- **Varsayılan kesinti ayarları:** Doğum izni: memuriyet + emeklilik’ten düş, yıllık izin’den düşme. Askerlik: aynı şekilde. “Diğer”: üçünden de düş. Bu mantık zaten mevcut; sadece etiketler “Memuriyete Esas’tan düş” vb. şeklinde netleştirilebilir.
- **Yasal uyarı:** “Resmi işlemlerde kurumunuzun personel birimine ve mevzuata göre kesin hesaplama yapılmalıdır” gibi bir dipnot eklenebilir.

### 2.6 Teknik

- **Yerel kayıt:** Hizmet ve kesinti listesi (tarihler, türler) `localStorage`’da saklanabilir; sayfa yenilense bile kullanıcı verisi kaybolmaz.
- **Yazdırma dostu CSS:** “Yazdır” ile sadece cetvel ve özet alanının çıktıya gitmesi için yazdırma stilleri eklenebilir.

---

## 3. Öncelik Sırası (Kısa Vadede)

| Öncelik | Öneri | Açıklama |
|--------|--------|----------|
| 1 | Ücretsiz izin kesinti butonu | Kamuda sık kullanılır; “Diğer” yerine özel etiket ve varsayılan ayarlar. |
| 2 | “SGK / 360 gün / bitiş dahil” bilgi notu | Kullanıcıya hesaplama mantığının kamu uygulamasına uyduğunu gösterir. |
| 3 | Resmi hesaplama uyarısı | “Kesin sonuç için kurumunuza danışın” dipnotu. |
| 4 | localStorage ile form verisini saklama | Kullanıcı deneyimi. |
| 5 | PDF/Excel özet indirme | Raporlama ve arşiv. |

---

## 4. Referans (Mevzuat / Pratik)

- 657 sayılı Devlet Memurları Kanunu (memuriyet, izin, emeklilik).
- 5434 sayılı T.C. Emekli Sandığı Kanunu (emeklilik yaşı ve süre).
- 5510 sayılı SSK ve Bağ-Kur (özel sektör birleştirme, 3/4).
- Kurum personel birimlerinin kendi intibak ve emeklilik uygulamaları.

Bu öneriler, uygulamanın Türkiye kamu personel sistemiyle daha uyumlu ve güvenilir kullanılması için rehber niteliğindedir; resmi hesaplama her zaman ilgili kurum ve mevzuata göre yapılmalıdır.
