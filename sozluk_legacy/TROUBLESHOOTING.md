# Sorun Giderme Kılavuzu

## Word ve PDF Dosyalarından İçerik Aktarılamıyor

### Yaygın Sorunlar ve Çözümleri

#### 1. Word Dosyası (.docx) Okunamıyor

**Sorun**: Word dosyası yüklendiğinde hata mesajı alıyorsunuz veya içerik boş çıkıyor.

**Olası Nedenler ve Çözümler**:

- **Eski Word Formatı (.doc)**: 
  - `.doc` formatı desteklenmiyor, sadece `.docx` destekleniyor
  - Çözüm: Word'de "Farklı Kaydet" > "Word Belgesi (.docx)" seçeneğini kullanın

- **Korumalı/Şifreli Dosya**:
  - Şifre korumalı dosyalar okunamaz
  - Çözüm: Dosyayı şifresiz olarak kaydedin

- **Boş veya Bozuk Dosya**:
  - Dosya içeriği boş olabilir veya bozulmuş olabilir
  - Çözüm: Dosyayı yeniden açıp kontrol edin, gerekirse yeniden kaydedin

- **Mammoth.js Kütüphanesi Yüklenemedi**:
  - İnternet bağlantısı gerekli
  - Çözüm: İnternet bağlantınızı kontrol edin ve sayfayı yenileyin

**Alternatif Çözümler**:
1. Word dosyasını TXT formatına çevirin (Farklı Kaydet > Düz Metin)
2. İçeriği kopyalayıp "Yapıştır" sekmesine yapıştırın
3. Word'den PDF'e çevirip PDF olarak yükleyin

#### 2. PDF Dosyası Okunamıyor veya Bozuk Çıkıyor

**Sorun**: PDF yüklendiğinde hata alıyorsunuz veya içerik düzgün parse edilmiyor.

**Olası Nedenler ve Çözümler**:

- **Görsel Tabanlı PDF (Taranmış)**:
  - OCR ile taranmış PDF'ler metin içermeyebilir
  - Çözüm: Metin tabanlı PDF kullanın veya OCR yazılımı ile metin çıkarın

- **PDF.js Kütüphanesi Yüklenemedi**:
  - İnternet bağlantısı gerekli
  - Çözüm: İnternet bağlantınızı kontrol edin

- **Büyük PDF Dosyaları**:
  - 50MB'dan büyük dosyalar desteklenmiyor
  - Çözüm: PDF'i bölerek yükleyin veya sadece ilgili sayfaları çıkarın

- **Korumalı PDF**:
  - Şifre korumalı PDF'ler okunamaz
  - Çözüm: Şifreyi kaldırın

**Alternatif Çözümler**:
1. PDF'ten metni kopyalayıp "Yapıştır" sekmesine yapıştırın
2. PDF'i Word'e çevirip Word formatında yükleyin
3. PDF'i TXT'ye çeviren online araçlar kullanın

#### 3. İçerik Bozuk veya Yanlış Parse Ediliyor

**Sorun**: Dosya yükleniyor ama maddeler düzgün ayrıştırılmıyor.

**Olası Nedenler**:
- Dosya formatı beklenen formatta değil
- Satır yapısı düzensiz
- Özel karakterler sorun yaratıyor

**Çözümler**:

1. **Format Kontrolü**:
   - Sözlük maddeleri şu formatta olmalı:
   ```
   KELİME [telaffuz] (gramer)
   Tanım buraya gelir.
   Örnek: Örnek cümle burada.
   ```

2. **Manuel Düzenleme**:
   - İçeriği yükledikten sonra önizlemede kontrol edin
   - Gerekirse manuel olarak düzenleyin

3. **Yapıştır Yöntemi**:
   - Dosya yerine içeriği kopyalayıp "Yapıştır" sekmesine yapıştırın
   - Bu yöntem daha güvenilir sonuçlar verebilir

### Debug İpuçları

1. **Tarayıcı Konsolunu Açın** (F12):
   - Hata mesajlarını görmek için
   - Console sekmesinde detaylı hata bilgileri var

2. **Dosya Boyutunu Kontrol Edin**:
   - Çok büyük dosyalar sorun yaratabilir
   - Maksimum: 50MB

3. **Dosya Formatını Kontrol Edin**:
   - Desteklenen formatlar: .txt, .docx, .pdf, .xlsx, .xls
   - .doc (eski Word) desteklenmiyor

4. **Örnek Dosya ile Test Edin**:
   - `ornek_veri.txt` dosyasını kullanarak sistemi test edin
   - Bu dosya çalışıyorsa, sorun dosya formatında olabilir

### Hata Mesajları ve Anlamları

- **"PDF.js kütüphanesi yüklenemedi"**: İnternet bağlantısı gerekli
- **"Word dosyasından içerik çıkarılamadı"**: Dosya boş veya korumalı olabilir
- **"Dosyadan hiç madde çıkarılamadı"**: Format beklenen formatta değil
- **"Dosya çok büyük"**: 50MB limitini aşıyor

### En İyi Sonuçlar İçin

1. **TXT Formatı Kullanın**: En güvenilir format
2. **Düzenli Format**: Her madde yeni satırda, tutarlı format
3. **Küçük Dosyalar**: Büyük dosyaları bölerek yükleyin
4. **Yapıştır Yöntemi**: En güvenilir yöntem

### Hala Sorun mu Var?

1. Tarayıcı konsolundaki hata mesajlarını kontrol edin
2. Farklı bir tarayıcı deneyin (Chrome önerilir)
3. Dosyayı farklı bir formatta kaydedip tekrar deneyin
4. İçeriği manuel olarak düzenleyip "Yapıştır" yöntemini kullanın
