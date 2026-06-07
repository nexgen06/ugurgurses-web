# YSP veri taşıması — Pazartesi cutover planı

**Pencere:** Cumartesi–Pazar tatil (veri girişi yok) → **Pazartesi 08:00** canlı  
**Kapsam:** YSP mevcut verileri + paylaşılan config (düşük hacim)

---

## Cumartesi (bugün)

| Saat | Görev | Komut / yer |
|------|--------|-------------|
| 1 | SQL migration | Livetable Supabase → SQL Editor → `002_bi_data.sql` çalıştır |
| 2 | Dry-run import | Aşağıdaki komut |
| 3 | Satır sayılarını not et | Özet çıktısını kaydet |

```bash
cd /Users/ugurgurses/Desktop/ugurgurses-platform/Birimistatistic

GOOGLE_APPLICATION_CREDENTIALS="$HOME/Downloads/mulakat-takip-sistemi-firebase-adminsdk-fbsvc-a359dd313d.json" \
npm run data:migrate -- --dry-run
```

---

## Pazar

| Saat | Görev |
|------|--------|
| 1 | **Gerçek import** (aşağıdaki komut) |
| 2 | Supabase Table Editor’da `bi_islem_kayitlari` satır sayısı = dry-run ile aynı mı? |
| 3 | `bi_users`, `bi_config_birimler` dolu mu? |
| 4 | Uygulama Supabase veri katmanı deploy (Faz 4 — ayrı build) |
| 5 | Smoke test: giriş → dashboard → bir kayıt okuma |

```bash
GOOGLE_APPLICATION_CREDENTIALS="$HOME/Downloads/mulakat-takip-sistemi-firebase-adminsdk-fbsvc-a359dd313d.json" \
npm run data:migrate
```

---

## Pazartesi 07:00–08:00

| # | Kontrol |
|---|---------|
| 1 | Livetable şifresiyle giriş |
| 2 | YSP Haziran verileri dashboard’da |
| 3 | Bağlantı bandı **Stabil** (Firebase köprüsü veri için gerekmemeli — auth hâlâ köprü kullanabilir) |
| 4 | Yeni birim listeye eklenebilir (boş başlar) |

---

## Geri alma (acil)

1. `VITE_DATA_PROVIDER=firebase` (veya dual) ile önceki build’i deploy et  
2. Firestore verisi cutover öncesi donmuş kaldı — Pazartesi girişleri Supabase’e gittiyse delta manuel

---

## Cutover sonrası (hafta içi)

- [ ] Firebase veri köprüsünü kaldır (yalnızca auth köprüsü kalabilir)
- [ ] Firestore read-only 30 gün yedek
- [ ] Yeni birim kullanıcı atamaları

---

## Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `supabase/migrations/002_bi_data.sql` | Postgres tabloları + temel RLS |
| `scripts/migrate-firestore-to-supabase.mjs` | Toplu aktarım |
| `Birimistatistic/package.json` → `data:migrate` | npm script |

**Not:** `runtime-env.js` içinde `VITE_DATA_PROVIDER: 'supabase'` ayarlandı. Build + deploy sonrası uygulama Supabase verisini kullanır.
