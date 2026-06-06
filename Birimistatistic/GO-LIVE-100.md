# Birim İstatistik — 100 kişilik birim go-live rehberi

Bu belge canlıya alma öncesi operasyon ekibi içindir. Teknik dosyalar: `firestore.rules`, `firestore.indexes.json`, `.env` (Firebase).

---

## 1) Rol atama tablosu (önerilen)

| # | Rol | Adet | Kim? | Birim ataması | Uygulamada yapılacak |
|---|-----|------|------|---------------|----------------------|
| 1 | **admin** | 1–2 | BT / sistem sorumlusu | Tüm birimler (otomatik) | Firebase `config/admins` → `uids: ["<uid>"]` **veya** Yönetim → rol `admin` |
| 2 | **proje_yetkilisi** | 2–5 | Birim şefi, koordinatör, vardiya amiri | **Sadece kendi birimi** | Yönetim → kullanıcı → rol + birimler[] |
| 3 | **editor** | ~90–95 | Evrak giren personel | **Sadece kendi birimi** | Aynı; mobilde **Bugünkü tablo** + **Ekle** eğitimi |
| 4 | **viewer** | 0–3 | Üst yönetim (salt okuma) | İlgili birim(ler) | Rapor/dashboard; veri girişi yok |

### Yetki özeti (hatırlatma)

| Yetki | editor | viewer | proje_yetkilisi | admin |
|-------|:------:|:------:|:---------------:|:-----:|
| Kendi evrak sayısı girişi | ✓ | — | ✓ | ✓ |
| Birim onayı (ay kapanışı, varsayılan kapalı) | — | — | ✓* | ✓* |
| Gün kesinleştirme | — | — | ✓ | ✓ |
| Kurum onayı | — | — | — | ✓ |
| Kesinleşmiş gün kilidini açma | — | — | — | ✓ |
| Yönetim (kullanıcı, kategori, hedef) | — | — | — | ✓ |
| İsimli personel listesi (rapor) | — | ✓ | ✓ | ✓ |
| Denetim günlüğü | — | — | ✓ | ✓ |

### Örnek CSV (Yönetim’e girmeden önce planlama)

```csv
email,rol,birimler,not
ayse.yilmaz@kurum.gov.tr,proje_yetkilisi,"Sicil İşlemleri Birimi",Birim şefi
mehmet.demir@kurum.gov.tr,editor,"Sicil İşlemleri Birimi",Personel
ust.yonetim@kurum.gov.tr,viewer,"Sicil İşlemleri Birimi",Salt okuma
bt.admin@kurum.gov.tr,admin,,İlk admin UID Console'dan
```

> **Not:** Uygulama toplu CSV import yapmaz; her kullanıcı **en az bir kez giriş yapmalı** (profil oluşur), sonra admin Yönetim’den rol/birim atar.

---

## 2) Go-live kontrol listesi (sıralı)

### A. Firebase (bir kez)

- [ ] Authentication: e-posta/şifre (veya kurum SSO) açık
- [ ] `firestore.rules` → Console’da **Yayınla** (repo ile aynı sürüm)
- [ ] `firestore.indexes.json` deploy veya Console’da indeksleri oluştur (Bölüm 3)
- [ ] `config/admins` dokümanı: `{ "uids": ["<ilk-admin-uid>"] }`
- [ ] `.env` / hosting: `VITE_USE_FIRESTORE=true`, Firebase anahtarları

### B. Kurulum verisi (admin)

- [ ] `config/birimler` — birim adı (100 kişilik ekip için genelde **1 birim**)
- [ ] Yeni birimde şablon: Sicil / Yazışma / Arşiv kategorileri (Yönetim veya `birim-sablon-service`)
- [ ] `config/kategoriler_ortak` + gerekirse birim özel kategoriler
- [ ] `config/akis` — kurum onayı zorunlu mu?
- [ ] `config/duyuru` — ilk gün duyuru metni
- [ ] `config/hedefler` — aylık hedefler (isteğe bağlı)

### C. Kullanıcılar (~100)

- [ ] Tüm personel hesabı oluşturuldu / davet e-postası
- [ ] Herkes **bir kez giriş** → ad-soyad tamamlandı
- [ ] Yönetim’den rol + **birim** atandı (atanmayan `editor` bile giriş yapamaz)
- [ ] 2–5 kişi `proje_yetkilisi` olarak işaretlendi
- [ ] Test kullanıcısı ile mobil: **Giriş İşlemleri → Tablo → +1 / Ekle**

### D. İlk iş günü akışı

1. Personel: birim seç → bugün → kategori → **Ekle** (anında kayıt)
2. (İsteğe bağlı) Admin: **Kurum onayı** (akış ayarında zorunluysa)
3. Proje yetkilisi: **Günü kesinleştir** (kilit) — günlük birim onayı yok
4. Ay sonu: Yönetim’de **birim onayı aktif** ise proje yetkilisi ay birim onayı → admin **Ayı kapat**
5. Ay sonu: önceki ay otomatik kapanır; admin gerekirse **Ayı aç**

### E. Deploy

- [ ] `npm run build` → hosting’e yükle
- [ ] Telefonda canlı URL testi (giriş + bir kategori + Ekle)

---

## 3) Firestore indeksleri

Uygulama şu sorguları kullanır; indeks yoksa Console’da hata linki çıkar — linke tıklayıp oluşturun veya `firestore.indexes.json` ile deploy edin.

| Koleksiyon | Sorgu | İndeks alanları |
|------------|--------|-----------------|
| `islem_kayitlari` | `kayit_tarihi ==` + `birim ==` (kayıt silme/güncelleme) | `kayit_tarihi` ASC, `birim` ASC |
| `islem_kayitlari` | `kayit_tarihi` aralığı + `orderBy kayit_tarihi desc` | `kayit_tarihi` ASC + DESC |
| `islem_kayitlari` | `user_id ==` (veri devri) | `user_id` ASC |
| `audit_log` | `orderBy at desc` | `at` DESC |

**Deploy (Firebase CLI kuruluysa):**

```bash
cd Birimistatistic
firebase deploy --only firestore:indexes
```

---

## 4) Kapasite — 100 kişi için önemli uyarı

Günlük okuma sorgularında Firestore tarafında **`limit(500)`** vardır; **birim filtresi bellekte** yapılır.

Örnek: 100 personel × 10 kategori = **günde ~1000 satır** (tek birim, tek gün).

- Bu durumda Dashboard/Rapor **en fazla 500 satır** çeker; birim filtresi sonrası eksik veri görülebilir.
- **Öneri (go-live öncesi):** Pilot haftada Dashboard’da toplam ile manuel sayımı karşılaştırın.
- **Öneri (sonraki sürüm):** `limit` artırımı veya sorguya `birim` alanının Firestore `where` ile eklenmesi.

Günlük yazma (Ekle): kullanıcı başına birkaç doküman — 100 kişi için Firestore yazma limitleri genelde yeterlidir.

---

## 5) Günlük sorumluluk matrisi

| Saat / olay | Sorumlu rol | İşlem |
|-------------|-------------|--------|
| Gün içi | editor | Ekle ile evrak sayısı |
| 16:00–17:00 | proje_yetkilisi | Eksik giriş uyarısı, birim onayı |
| Gün sonu | proje_yetkilisi | Kesinleştirme |
| İtiraz / hata | admin | Kilidi aç, düzeltme, denetim logu |
| Personel ayrıldı | admin | Yönetim → **Veri devri** (`user_id` aktarımı) |

---

## 6) Destek ve sorun giderme

| Belirti | Olası neden | Çözüm |
|---------|-------------|--------|
| Giriş yapamıyorum | Birim atanmamış | Admin → Yönetim → birimler[] |
| Ekle çalışmıyor | Gün kesinleşmiş / ay kapalı | Yetkili onay veya admin kilidi aç |
| Permission denied | Kurallar yayınlanmamış | `firestore.rules` Yayınla |
| Index hatası (sarı link) | İndeks eksik | Bölüm 3 |
| Rapor eksik | 500 limit | Bölüm 4 — teknik iyileştirme planla |

---

## 7) İlk hafta başarı kriterleri

- [ ] ≥ %80 personel en az 1 gün veri girdi
- [ ] Proje yetkilisi 5 iş günü üst üste birim onayı + kesinleştirme yaptı
- [ ] Denetim günlüğünde kritik hata yok
- [ ] Mobil giriş şikayeti yok veya not alındı

---

*Son güncelleme: uygulama sürümü MVP+ (Firebase Auth, Firestore, mobil Ekle akışı, onay zinciri, rapor PDF).*
