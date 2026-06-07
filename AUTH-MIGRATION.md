# Firebase → Supabase Auth taşıması

Livetable (görev yönetimi) Supabase projesi **tek kimlik merkezi**. Birim İstatistik verisi geçişte Firestore'da kalır; yalnızca giriş Supabase'e taşınır.

## Faz 1 — Sizin yapmanız gerekenler (Dashboard)

### 1. SQL migration

Livetable Supabase → **SQL Editor** → `supabase/migrations/001_bi_profiles.sql` dosyasının tamamını çalıştırın.

### 2. Auth URL'leri

Authentication → URL Configuration:

- Site URL: `https://www.ugurgurses.com.tr`
- Redirect URLs:
  - `https://www.ugurgurses.com.tr/**`
  - `https://ugurgurses.com.tr/**`
  - `http://localhost:3000/**`

### 3. Anahtarları yapılandırın

| Dosya | Alan |
|-------|------|
| `js/auth-config.js` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| `Birimistatistic/.env` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

Service role key yalnızca yerelde `.env.local` içinde (commit etmeyin):

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 4. Firebase kullanıcı export

```bash
firebase login
firebase auth:export firebase-users.json --format=json --project mulakat-takip-sistemi
```

### 5. Merge import (kullanıcı silmeden)

```bash
cd Birimistatistic
npm install
npm run auth:migrate -- --input ../firebase-users.json --dry-run
npm run auth:migrate -- --input ../firebase-users.json --admin-email ugurgrses@gmail.com
```

Aynı e-posta Supabase'te varsa script **silmez**; `bi_profiles.legacy_firebase_uid` yazar.

### 6. Süper admin güvencesi (ugurgrses@gmail.com)

**Firestore** `config/admins` → `uids` dizisine **hem Firebase UID hem Supabase UUID** ekleyin:

```json
{
  "uids": ["FIREBASE_UID_BURAYA", "SUPABASE_UUID_BURAYA"]
}
```

Livetable `profiles` tablosundaki yönetici rolüne **dokunmayın**.

## Faz 2 — Portfolyo Supabase (tamamlandı)

| Bileşen | Ayar |
|---------|------|
| Portfolyo `js/auth-config.js` | `AUTH_MODE = 'supabase'` |
| `js/firebase-auth-bridge.js` | ekip/phone için sessiz Firebase oturumu |
| Birim `.env` | `VITE_AUTH_PROVIDER=supabase` (canlı) |

Portfolyo girişi yalnızca Supabase. ekip/phone verisi için köprü API gerekir (`FIREBASE_BRIDGE_ENABLED` Railway'de `true` veya unset).

## Faz 3 — ekip/phone tam Supabase (sonraki adım)

Telefon rehberi Ekip hub'a taşındığında Firebase köprüsü kademeli kaldırılabilir.

## Firestore köprüsü (Supabase giriş + Firestore veri)

Supabase ile giriş yapıldığında Firestore kuralları Firebase `request.auth.uid` ister. **Firebase Cloud Functions (Blaze plan) gerekmez** — köprü Railway sunucusunda çalışır.

### Canlı durum

| Bileşen | Durum |
|---------|--------|
| `POST /api/firebase-custom-token` | Yayında (`www.ugurgurses.com.tr`) |
| `SUPABASE_JWT_SECRET` (Railway) | Ayarlı |
| `FIREBASE_SERVICE_ACCOUNT_JSON` (Railway) | **Eksik — sizin eklemeniz gerekiyor** |

### Tek yapmanız gereken adım

1. Firebase Console → **Service accounts** → **Generate new private key** (JSON indir):

   https://console.firebase.google.com/project/mulakat-takip-sistemi/settings/serviceaccounts/adminsdk

2. Terminalde (JSON dosya yolunu kendi indirdiğiniz dosyayla değiştirin):

```bash
cd /Users/ugurgurses/Desktop/ugurgurses-platform
node scripts/set-railway-bridge-env.mjs \
  --jwt-secret "$SUPABASE_JWT_SECRET" \
  --service-account ~/Downloads/mulakat-takip-sistemi-firebase-adminsdk-xxxxx.json
```

3. Railway otomatik yeniden deploy etmezse:

```bash
railway up --detach -m "Auth bridge service account"
```

4. Gizli sekmede Birim İstatistik’e Livetable şifresiyle tekrar giriş yapın.

### Alternatif (Railway Dashboard)

Railway → `web` servisi → **Variables** → `FIREBASE_SERVICE_ACCOUNT_JSON` = indirdiğiniz JSON dosyasının **tam içeriği** (tek satır).

### Yerel test

```bash
npm start
# POST http://localhost:3000/api/firebase-custom-token
```

### Eski yol (Blaze gerekir — kullanmayın)

Firebase Cloud Functions `issueFirebaseTokenFromSupabase` yalnızca Blaze planında çalışır. Proje Spark’ta kaldığı sürece Railway köprüsünü kullanın.

## Test checklist

- [ ] `ugurgrses@gmail.com` — Livetable yönetici yetkisi korunuyor
- [ ] Aynı hesap — Birim İstatistik Yönetim ekranı açılıyor (admin)
- [ ] Portfolyo giriş — Supabase şifresi ile
- [ ] Birim veri girişi — `user_id` hâlâ Firebase UID (legacy eşleme)
- [ ] Şifre sıfırlama — Supabase e-postası geliyor

## Sonraki faz (veri)

Auth tamamlandıktan sonra: Firestore → Supabase veri migrasyonu (ayrı plan).
