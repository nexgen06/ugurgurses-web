# Supabase — iki proje mimarisi

| Proje | Ref | Uygulamalar |
|-------|-----|-------------|
| **Livetable hub** | `lgvhlldqdczrnimeetct` | Birim İstatistik, portfolyo giriş |
| **Ekip hub** | `mmahcxmfnuoovgqgvjag` | Hizmet Girişi, **Telefon Rehberi** (Auth + veri) |

## Telefon Rehberi — Supabase Auth (Firebase yok)

- Giriş: portfolyo `login.html` → hem Livetable hem **Ekip hub** oturumu açılır (`js/ekip-auth.js`)
- Phone: yalnızca Ekip hub Supabase client (`storageKey: ekip-supabase-auth`)
- RLS: `auth.uid() = user_id` (UUID)

### SQL (Ekip hub — `mmahcxmfnuoovgqgvjag`)

**Daha önce eski `001` (Firebase RLS) çalıştırdıysanız:**

```
supabase/migrations/ekip/002_contacts_supabase_auth.sql
```

**Yeni kurulum:**

```
supabase/migrations/ekip/001_contacts.sql
```

Dashboard: **Authentication → Providers → Email** etkin.

### Kullanıcılar

Phone, Ekip hub Auth kullanır. Portfolyo ile **aynı e-posta/şifre** gerekir.

Livetable’ta olan kullanıcıları Ekip’e taşımak için (service role, `.env.local`):

```env
EKIP_SUPABASE_URL=https://mmahcxmfnuoovgqgvjag.supabase.co
EKIP_SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_URL=https://lgvhlldqdczrnimeetct.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

```bash
node scripts/sync-portfolio-users-to-ekip-auth.mjs --dry-run
node scripts/sync-portfolio-users-to-ekip-auth.mjs
```

Veya: ana sayfadan çıkış → giriş (auth.js Ekip’e de `signInWithPassword` dener; kullanıcı Ekip’te yoksa phone açılmaz).

### Test

1. Çıkış → Supabase şifresiyle giriş
2. `/phone/` → e-posta görünür
3. Kişi ekle → RLS hatası olmamalı

### Deploy

```bash
railway service link web && railway up --detach
```
