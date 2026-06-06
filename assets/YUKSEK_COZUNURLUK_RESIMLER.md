# Yüksek Çözünürlüklü Resimler Rehberi

## Dosya Adlandırma Konvansiyonu

Yüksek çözünürlüklü resimler için aşağıdaki dosya adlandırma sistemini kullanın:

### Mevcut Resimler:
- `step.png` (Orijinal - 1x)
- `summit.png` (Orijinal - 1x)
- `explore.png` (Orijinal - 1x)

### Yüksek Çözünürlüklü Versiyonlar:

#### 2x (Retina/Tablet için):
- `step@2x.png` - 2x çözünürlük (örn: 3840x2160 yerine 1920x1080 varsa, 2x = 3840x2160)
- `summit@2x.png` - 2x çözünürlük
- `explore@2x.png` - 2x çözünürlük

#### 3x (4K/Yüksek DPI için):
- `step@3x.png` - 3x çözünürlük (örn: 5760x3240)
- `summit@3x.png` - 3x çözünürlük
- `explore@3x.png` - 3x çözünürlük

## Önerilen Çözünürlükler

### Orijinal (1x):
- Genişlik: 1920px
- Yükseklik: 1080px (veya 16:9 oranında)
- Format: PNG veya WebP (daha iyi sıkıştırma)

### 2x (Retina):
- Genişlik: 3840px
- Yükseklik: 2160px
- Format: PNG veya WebP

### 3x (4K/Ultra HD):
- Genişlik: 5760px
- Yükseklik: 3240px
- Format: PNG veya WebP

## Nasıl Eklenir?

1. Yüksek çözünürlüklü resimlerinizi hazırlayın
2. `assets/` klasörüne aşağıdaki isimlerle kaydedin:
   - `step@2x.png`
   - `step@3x.png`
   - `summit@2x.png`
   - `summit@3x.png`
   - `explore@2x.png`
   - `explore@3x.png`

3. Sistem otomatik olarak:
   - Retina ekranlarda 2x resimleri kullanacak
   - 4K ekranlarda 3x resimleri kullanacak
   - Normal ekranlarda 1x resimleri kullanacak

## Optimizasyon İpuçları

1. **WebP Formatı**: Daha küçük dosya boyutu için WebP formatını kullanabilirsiniz
2. **Sıkıştırma**: PNG dosyalarını optimize edin (TinyPNG, ImageOptim gibi araçlar)
3. **Lazy Loading**: İlk slide için `loading="eager"`, diğerleri için `loading="lazy"` kullanılıyor
4. **Responsive**: Sistem otomatik olarak ekran boyutuna göre uygun resmi seçer

## Not

Eğer yüksek çözünürlüklü resimler yoksa, sistem mevcut resimleri kullanmaya devam edecektir. Ancak yüksek çözünürlüklü resimler eklendiğinde otomatik olarak kullanılacaktır.
