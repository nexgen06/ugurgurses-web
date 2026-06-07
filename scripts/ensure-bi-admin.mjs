#!/usr/bin/env node
/**
 * Tek kullanıcı için bi_profiles admin kaydı (merge sonrası veya manuel).
 *
 * Kullanım:
 *   node scripts/ensure-bi-admin.mjs \
 *     --email ugurgrses@gmail.com \
 *     --supabase-id 140e7d92-96dc-45e3-be00-fbe9fbfd276a \
 *     --firebase-uid FIREBASE_UID_BURAYA
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnv() {
  for (const p of [resolve(ROOT, 'Birimistatistic/.env.local'), resolve(ROOT, '.env.local')]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i > 0 && !process.env[t.slice(0, i).trim()]) {
        process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
      }
    }
  }
}

function parseArgs(argv) {
  const out = { email: '', supabaseId: '', firebaseUid: '', dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--email' && argv[i + 1]) out.email = argv[++i].toLowerCase();
    else if (argv[i] === '--supabase-id' && argv[i + 1]) out.supabaseId = argv[++i];
    else if (argv[i] === '--firebase-uid' && argv[i + 1]) out.firebaseUid = argv[++i];
    else if (argv[i] === '--dry-run') out.dryRun = true;
  }
  return out;
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv);
  if (!args.email || !args.supabaseId) {
    console.error('Kullanım: --email --supabase-id [--firebase-uid] [--dry-run]');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_SERVICE_ROLE_KEY ve URL gerekli (Birimistatistic/.env.local)');
    process.exit(1);
  }

  const row = {
    id: args.supabaseId,
    email: args.email,
    role: 'admin',
    birimler: [],
    ...(args.firebaseUid ? { legacy_firebase_uid: args.firebaseUid } : {})
  };

  if (args.dryRun) {
    console.log('[dry-run]', row);
    return;
  }

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await sb.from('bi_profiles').upsert(row, { onConflict: 'id' }).select().single();
  if (error) {
    console.error('Hata:', error.message);
    process.exit(1);
  }
  console.log('bi_profiles güncellendi:', data);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
