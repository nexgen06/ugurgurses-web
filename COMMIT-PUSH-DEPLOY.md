# Commit, Push ve Deploy Rehberi

Kod ajanları ve geliştiriciler için operasyonel checklist. Cursor kuralı: `.cursor/rules/commit-push-deploy.mdc`

## Hızlı karar ağacı

```
Değişiklik Birimistatistic/ içinde mi?
  ├─ Evet → railway service link birimistatistic
  │         railway up ./Birimistatistic --path-as-root --detach
  └─ Hayır (ana site, ekip, start-server) → railway service link web
            railway up --detach
```

## Canlı adresler

| Servis | URL |
|--------|-----|
| Ana site | https://www.ugurgurses.com.tr |
| Birim İstatistik | https://bi.ugurgurses.com.tr |
| Eski yol (yönlendirme) | www…/Birimistatistic/dist/ → bi.ugurgurses.com.tr |

## Commit kuralları

1. **Commit yalnızca kullanıcı isteğiyle.**
2. **Push yalnızca kullanıcı isteğiyle.**
3. Asla commit etme: `.env*`, `firebase-users.json`, service account JSON, secret key’ler.
4. Commit öncesi: `git status`, `git diff`, son commit mesajlarına bak.

## Deploy komutları

### Birimistatistic (React uygulaması)

```bash
cd /path/to/ugurgurses-platform
railway service link birimistatistic
railway up ./Birimistatistic --path-as-root --detach -m "açıklama"
```

`--path-as-root` **zorunlu** — aksi halde `web` servisinin `start-server.mjs` dosyası çalışır.

### Ana site (web)

```bash
cd /path/to/ugurgurses-platform
railway service link web
railway variables set BI_APP_URL=https://bi.ugurgurses.com.tr   # gerekirse
railway up --detach -m "açıklama"
```

## Deploy sonrası kontrol

- [ ] https://bi.ugurgurses.com.tr açılıyor
- [ ] Giriş + dashboard verisi
- [ ] www ana sayfa Birim İstatistik linki `bi.ugurgurses.com.tr`
- [ ] `/Birimistatistic/dist/` yönlendirmesi (gizli pencerede test)

## Supabase (deploy dışı)

SQL migration’lar Supabase Dashboard → SQL Editor’da manuel çalıştırılır:

- `001_bi_profiles.sql`
- `002_bi_data.sql`
- `003_bi_data_writes.sql`

## Sık yapılan hatalar

1. `cd Birimistatistic && railway up` → yanlış servis içeriği
2. `runtime-env.js` ile canlı config değiştirmeye çalışmak → artık kullanılmıyor; Railway `VITE_*` build env
3. Secret’ları commit etmek
4. SQL çalıştırmadan yazma özelliği beklemek

## İlgili dosyalar

- `Birimistatistic/DEPLOY.md`
- `Birimistatistic/Dockerfile`
- `scripts/start-server.mjs`
- `.cursor/rules/commit-push-deploy.mdc`
