# Birimistatistic — bağımsız deploy

## Canlı adresler

| Ortam | URL |
|-------|-----|
| Canlı (özel alan adı) | https://bi.ugurgurses.com.tr |
| Railway yedek | https://birimistatistic-production.up.railway.app |

Ana site (`www.ugurgurses.com.tr`) eski `/Birimistatistic/dist/` yollarını yeni adrese yönlendirir.

## Railway servisi

- Proje: `ugurgurses-platform`
- Servis: `birimistatistic`
- Kök dizin: `Birimistatistic/` (bu klasörden `railway up`)

```bash
# Monorepo kökünden (path-as-root zorunlu)
cd /path/to/ugurgurses-platform
railway service link birimistatistic
railway up ./Birimistatistic --path-as-root --detach -m "deploy mesajı"
```

Build sırasında `VITE_*` değişkenleri bundle'a gömülür (`runtime-env.js` kullanılmaz).

## Gerekli ortam değişkenleri (Railway)

```
VITE_AUTH_PROVIDER=supabase
VITE_DATA_PROVIDER=supabase
VITE_FIREBASE_ENABLED=false
VITE_USE_FIRESTORE=false
VITE_SUPABASE_URL=https://lgvhlldqdczrnimeetct.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

## bi.ugurgurses.com.tr DNS

Railway Dashboard → `birimistatistic` → Settings → Domains → `bi.ugurgurses.com.tr` ekleyin.

DNS sağlayıcınızda (ör. Cloudflare / domain paneli):

```
bi  CNAME  <railway-verilen-hedef>
```

Yayılım sonrası ana sitedeki link ve `BI_APP_URL` (web servisi) aynı kalabilir.

## Yerel geliştirme

```bash
cp .env.example .env.local   # VITE_* doldurun
npm run dev
```
