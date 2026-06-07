#!/usr/bin/env node
/**
 * Supabase Auth kullanıcılarına varsayılan şifre atar (hariç tutulan e-postalar dışında).
 *
 *   node scripts/set-default-passwords.mjs --dry-run
 *   node scripts/set-default-passwords.mjs --password 1234567 --exclude ugurgrses@gmail.com
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

loadEnvFile(resolve(ROOT, 'Birimistatistic/.env.local'));
loadEnvFile(resolve(ROOT, '.env.local'));

function parseArgs(argv) {
  const out = {
    dryRun: false,
    password: '1234567',
    exclude: ['ugurgrses@gmail.com']
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') out.dryRun = true;
    else if (argv[i] === '--password' && argv[i + 1]) out.password = argv[++i];
    else if (argv[i] === '--exclude' && argv[i + 1]) out.exclude.push(argv[++i].toLowerCase());
  }
  out.exclude = [...new Set(out.exclude.map((e) => e.toLowerCase()))];
  return out;
}

async function listAllUsers(admin) {
  const all = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    all.push(...(data.users || []));
    if (!data.nextPage || data.users.length < 1000) break;
    page = data.nextPage;
  }
  return all;
}

async function main() {
  const args = parseArgs(process.argv);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli');
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const users = await listAllUsers(sb);

  console.log(`Toplam Supabase kullanıcı: ${users.length}`);
  console.log(`Varsayılan şifre: ${args.password}`);
  console.log(`Hariç: ${args.exclude.join(', ')}`);
  if (args.dryRun) console.log('--- DRY RUN ---\n');

  const updated = [];
  const skipped = [];

  for (const u of users) {
    const email = (u.email || '').toLowerCase();
    if (!email) {
      skipped.push({ email: '(yok)', reason: 'e-posta yok' });
      continue;
    }
    if (args.exclude.includes(email)) {
      skipped.push({ email, reason: 'hariç tutuldu' });
      continue;
    }

    if (args.dryRun) {
      updated.push(email);
      continue;
    }

    const { error } = await sb.auth.admin.updateUserById(u.id, {
      password: args.password,
      user_metadata: {
        ...(u.user_metadata || {}),
        default_password: true
      }
    });
    if (error) {
      console.error(`✗ ${email}: ${error.message}`);
    } else {
      updated.push(email);
      console.log(`✓ ${email}`);
    }
  }

  console.log('\n=== Özet ===');
  console.log(`Güncellenen: ${updated.length}`);
  console.log(`Atlanan: ${skipped.length}`);
  if (skipped.length) {
    for (const s of skipped) console.log(`  - ${s.email}: ${s.reason}`);
  }
  if (args.dryRun) {
    console.log('\nGüncellenecek hesaplar:');
    updated.forEach((e) => console.log(`  ${e}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
