# Sözlük Şablon Sistemi

Profesyonel matbaa sektörü için gelişmiş HTML tabanlı sözlük hazırlama uygulaması.

## 🎯 Özellikler

### 1. Gelişmiş Veri İçe Aktarma
- **Çoklu Format Desteği**: PDF (OCR), Word (.docx), Excel (.xlsx, .xls), TXT
- **PDF Satır Onarımı**: PDF'ten metin çıkarırken satır sonlarını korur
- **Yapıştırma Alanı**: Panodan yüzlerce satırlık metni doğrudan yapıştırıp işleyebilirsiniz
- **Markdown Tablo Desteği**: Markdown formatındaki tabloları otomatik parse eder

### 2. Akıllı Ayrıştırma Motoru
- **Heuristic Analiz**: Satırların "Başlık" mı "Tanım" mı olduğunu otomatik algılar
- **OCR Hata Temizliği**: PDF kaynaklı gereksiz metinleri (sayfa numaraları, başlıklar) temizler
- **Kümülatif Tanım Birleştirme**: Çok satırlı tanımları otomatik birleştirir
- **Referans Koruma**: [93], [12] gibi kaynakça numaralarını korur

### 3. Profesyonel Baskı Düzeni
- **Dinamik Sayfalama**: İçerik yüksekliğine göre otomatik sayfa bölme
- **A4 Standartları**: Tüm sayfalar tam A4 (210mm x 297mm) boyutunda
- **Sütunlu Yapı**: 1, 2 veya 3 sütunlu düzen seçenekleri
- **Alfabetik Başlıklar**: Her harf değişiminde otomatik bölüm başlığı
- **Kesim Payları**: Matbaa için opsiyonel kesim çizgileri

### 4. Özelleştirme
- **Kapak Tasarımı**: Başlık, alt başlık, renkler özelleştirilebilir
- **AI Kapak**: Google Gemini ile otomatik kapak görseli oluşturma
- **Önsöz ve Kısaltmalar**: Özel sayfalar eklenebilir
- **Üst/Alt Bilgi**: Sayfa numaraları ve özel metinler
- **Tipografi**: Yazı boyutu (8-16pt) ayarlanabilir

### 5. Çıktı Formatları
- **PDF İndir**: Yüksek kaliteli PDF export
- **HTML İndir**: Kaynak kodu indirme
- **Yazdır**: Tarayıcı yazdırma desteği

## 🚀 Kullanım

### Başlangıç

1. `index.html` dosyasını bir web tarayıcısında açın
2. Sol panelden veri içe aktarma yöntemini seçin:
   - **Dosya Yükle**: PDF, Word, Excel veya TXT dosyası seçin
   - **Yapıştır**: Metni doğrudan yapıştırın

### Veri Formatı

#### Markdown Tablo Formatı
```
| Kelime | Tanım ve Örnek |
|--------|-----------------|
| ABANDON | Terk etmek, bırakmak. *He abandoned the project.* |
| ABILITY | Yetenek, kabiliyet. *She has the ability to learn quickly.* |
```

#### Yapılandırılmış Metin Formatı
```
ABANDON [əˈbændən] (fiil)
Terk etmek, bırakmak.
Örnek: He abandoned the project.
Köken: Lat.

ABILITY [əˈbɪləti] (isim)
Yetenek, kabiliyet.
Örnek: She has the ability to learn quickly.
Köken: Lat.
```

### Özelleştirme

1. **Kapak**: Başlık, alt başlık, yıl ve renkleri ayarlayın
2. **Sayfa Düzeni**: Sütun sayısı, yazı boyutu, kenar boşlukları
3. **İçerik**: Önsöz ve kısaltmalar sayfalarını düzenleyin
4. **Çıktı**: PDF, HTML veya yazdırma seçeneklerini kullanın

## 📋 Gereksinimler

### CDN Kütüphaneleri (Otomatik Yüklenir)
- FontAwesome 6.4.0
- Mammoth.js (Word dosyaları için)
- XLSX.js (Excel dosyaları için)
- PDF.js (PDF dosyaları için)
- html2pdf.js (PDF export için)

### Tarayıcı Desteği
- Chrome/Edge (önerilen)
- Firefox
- Safari

## 🔧 Gelişmiş Özellikler

### AI Kapak Oluşturma

1. "AI ile Kapak Oluştur" butonuna tıklayın
2. Google Gemini API key'inizi girin
3. Kapak otomatik oluşturulur

**Not**: API key almak için [Google AI Studio](https://makersuite.google.com/app/apikey) adresini ziyaret edin.

### Kesim Payları

Matbaa için kesim çizgilerini göstermek için:
1. "Kesim Payı Çizgilerini Göster" seçeneğini işaretleyin
2. Sayfalarda 3mm kesim payı çizgileri görünecektir

### Zoom Kontrolleri

- **+**: Yakınlaştır
- **-**: Uzaklaştır
- **Sıfırla**: %100'e dön

Klavye kısayolları:
- `Ctrl/Cmd + =`: Yakınlaştır
- `Ctrl/Cmd + -`: Uzaklaştır
- `Ctrl/Cmd + 0`: Sıfırla

## 📝 Format Kuralları

### Sözlük Maddesi Yapısı

1. **Madde Başı**: Kelime kalın ve büyük harfle başlamalı
2. **Telaffuz**: Köşeli parantez içinde `[telaffuz]`
3. **Dilbilgisi**: Parantez içinde `(isim)`, `(fiil)` vb.
4. **Tanım**: Açık ve net tanımlar
5. **Örnek**: İtalik örnek cümleler
6. **Köken**: Kısa kodlarla (Ar., Lat., İng. vb.)

### Örnek Format

```
ABANDON [əˈbændən] (fiil)
1. Terk etmek, bırakmak. 2. Vazgeçmek.
Örnek: He abandoned the project when funding was cut.
Köken: Lat. abandonare
```

## 🐛 Sorun Giderme

### PDF Okunamıyor
- PDF'in metin tabanlı olduğundan emin olun (OCR ile taranmış PDF'ler desteklenir)
- Alternatif olarak TXT veya Word formatında deneyin

### Sayfalar Düzgün Bölünmüyor
- Yazı boyutunu küçültün
- Kenar boşluklarını azaltın
- Sütun sayısını artırın

### İçerik Görünmüyor
- Tarayıcı konsolunu kontrol edin (F12)
- Dosya formatının desteklendiğinden emin olun
- Sayfayı yenileyin

## 📄 Lisans

Bu proje eğitim ve ticari kullanım için hazırlanmıştır.

## 🤝 Katkıda Bulunma

Öneriler ve hata bildirimleri için lütfen issue açın.

---

**Not**: Bu uygulama tarayıcı tabanlıdır ve internet bağlantısı gerektirir (CDN kütüphaneleri için).
