#!/usr/bin/env node
/**
 * Livetable Supabase Auth kullanıcılarını Ekip hub'a kopyalar (phone için).
 * Şifreler taşınmaz — kullanıcılar ana sayfadan girişte aynı şifreyi kullanır;
 * bu script yalnızca Ekip'te hesap yoksa oluşturur (geçici şifre veya invite gerekir).
 *
 * Pratik yol: kullanıcılar login.html'den giriş yapınca auth.js signInEkip çalışır.
 * Ekip'te hesap yoksa: Dashboard → Authentication → Users → aynı e-postayı ekleyin
 * veya bu script ile createUser (service role).
 *
 *   PORTFOLIO + EKIP service role .env.local
 *   node scripts/sync-portfolio-users-to-ekip-auth.mjs --dry-run
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
  }
}

loadEnvFile(resolve(ROOT, '.env.local'));

const dryRun = process.argv.includes('--dry-run');
const tempPassword = process.env.EKIP_SYNC_TEMP_PASSWORD || 'ChangeMe123!';

const portfolioUrl = process.env.SUPABASE_URL;
const portfolioKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ekipUrl = process.env.EKIP_SUPABASE_URL || 'https://mmahcxmfnuoovgqgvjag.supabase.co';
const ekipKey = process.env.EKIP_SUPABASE_SERVICE_ROLE_KEY;

if (!portfolioUrl || !portfolioKey || !ekipKey) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EKIP_SUPABASE_SERVICE_ROLE_KEY gerekli');
  process.exit(1);
}

const portfolio = createClient(portfolioUrl, portfolioKey, { auth: { persistSession: false } });
const ekip = createClient(ekipUrl, ekipKey, { auth: { persistSession: false } });

async function listUsers(client) {
  const all = [];
  let page = 1;
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...(data.users || []));
    if ((data.users || []).length < 1000) break;
    page++;
  }
  return all;
}

async function main() {
  const [pUsers, eUsers] = await Promise.all([listUsers(portfolio), listUsers(ekip)]);
  const ekipEmails = new Set(eUsers.map((u) => (u.email || '').toLowerCase()).filter(Boolean));

  let created = 0;
  for (const u of pUsers) {
    const email = (u.email || '').toLowerCase();
    if (!email) continue;
    if (ekipEmails.has(email)) {
      console.log(`  skip (var): ${email}`);
      continue;
    }
    console.log(`${dryRun ? '[dry-run] ' : ''}create: ${email}`);
    if (!dryRun) {
      const { error } = await ekip.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true
      });
      if (error) {
        console.error(`  hata: ${email} — ${error.message}`);
      } else {
        created++;
        console.warn(`  → Geçici şifre (${email}): ${tempPassword} — kullanıcı kendi şifresine çevirmeli`);
      }
    } else {
      created++;
    }
  }
  console.log(`\n${dryRun ? 'Dry-run' : 'Tamam'}: ${created} yeni Ekip kullanıcısı`);
  if (!dryRun && created > 0) {
    console.log('\nNot: Mevcut portfolyo şifreleri otomatik kopyalanmaz.');
    console.log('Kullanıcılar Dashboard\'dan şifre sıfırlama veya aynı şifreyle createUser güncellemesi gerekir.');
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
