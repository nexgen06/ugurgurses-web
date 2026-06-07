#!/usr/bin/env node
/**
 * Telefon rehberi (contacts) — eski phone Supabase → Ekip/Hizmet Girişi Supabase
 *
 * Önkoşul:
 *   1. supabase/migrations/ekip/001_contacts.sql → mmahcxmfnuoovgqgvjag SQL Editor
 *   2. Hedef projede Firebase Third-Party Auth etkin (mulakat-takip-sistemi)
 *
 * Ortam değişkenleri (.env.local veya export):
 *   PHONE_SUPABASE_URL=https://qeddmysxoezdtwdhdccj.supabase.co
 *   PHONE_SUPABASE_SERVICE_ROLE_KEY=...
 *   EKIP_SUPABASE_URL=https://mmahcxmfnuoovgqgvjag.supabase.co
 *   EKIP_SUPABASE_SERVICE_ROLE_KEY=...
 *
 *   node scripts/migrate-phone-contacts-to-ekip-supabase.mjs --dry-run
 *   node scripts/migrate-phone-contacts-to-ekip-supabase.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BATCH = 200;

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

function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') out.dryRun = true;
  }
  return out;
}

const CONTACT_COLUMNS = [
  'id',
  'name',
  'title',
  'department',
  'extension',
  'kurum',
  'email',
  'phone',
  'avatar',
  'firebase_user_id',
  'created_at',
  'updated_at',
];

function pickRow(row) {
  const out = {};
  for (const col of CONTACT_COLUMNS) {
    if (row[col] !== undefined) out[col] = row[col];
  }
  return out;
}

async function fetchAll(source) {
  const rows = [];
  let from = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await source
      .from('contacts')
      .select(CONTACT_COLUMNS.join(','))
      .order('id', { ascending: true })
      .range(from, from + page - 1);
    if (error) throw new Error(`Kaynak okuma: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return rows;
}

async function main() {
  const { dryRun } = parseArgs(process.argv);

  const phoneUrl = process.env.PHONE_SUPABASE_URL;
  const phoneKey = process.env.PHONE_SUPABASE_SERVICE_ROLE_KEY;
  const ekipUrl = process.env.EKIP_SUPABASE_URL || 'https://mmahcxmfnuoovgqgvjag.supabase.co';
  const ekipKey = process.env.EKIP_SUPABASE_SERVICE_ROLE_KEY;

  if (!phoneUrl || !phoneKey) {
    throw new Error('PHONE_SUPABASE_URL ve PHONE_SUPABASE_SERVICE_ROLE_KEY gerekli');
  }
  if (!ekipKey) {
    throw new Error('EKIP_SUPABASE_SERVICE_ROLE_KEY gerekli');
  }

  const source = createClient(phoneUrl, phoneKey, { auth: { persistSession: false } });
  const target = createClient(ekipUrl, ekipKey, { auth: { persistSession: false } });

  console.log('Kaynak:', phoneUrl);
  console.log('Hedef :', ekipUrl);
  console.log('Mod   :', dryRun ? 'dry-run' : 'migrate');

  const rows = await fetchAll(source);
  console.log(`Kaynak contacts: ${rows.length} satır`);

  if (rows.length === 0) {
    console.log('Taşınacak veri yok.');
    return;
  }

  const { count: targetBefore, error: countErr } = await target
    .from('contacts')
    .select('*', { count: 'exact', head: true });
  if (countErr) {
    throw new Error(
      `Hedef contacts okunamadı: ${countErr.message}\n` +
        'Önce supabase/migrations/ekip/001_contacts.sql çalıştırıldı mı?'
    );
  }
  console.log(`Hedef contacts (önce): ${targetBefore ?? 0} satır`);

  if (dryRun) {
    console.log('Örnek ilk kayıt:', pickRow(rows[0]));
    console.log('Dry-run tamam — gerçek aktarım için --dry-run olmadan çalıştırın.');
    return;
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH).map(pickRow);
    const { error } = await target.from('contacts').upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`Upsert hatası (batch ${i / BATCH + 1}): ${error.message}`);
    inserted += chunk.length;
    console.log(`  ${inserted}/${rows.length} upsert edildi`);
  }

  const { data: maxRow, error: maxErr } = await target
    .from('contacts')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw new Error(`Max id: ${maxErr.message}`);

  if (maxRow?.id) {
    console.log(
      '\nYeni kayıtlar için sequence (SQL Editor, hedef proje):\n' +
        "SELECT setval(pg_get_serial_sequence('public.contacts', 'id'), " +
        `(SELECT COALESCE(MAX(id), 1) FROM public.contacts));`
    );
  }

  const { count: targetAfter } = await target
    .from('contacts')
    .select('*', { count: 'exact', head: true });

  console.log(`Hedef contacts (sonra): ${targetAfter ?? 0} satır`);
  console.log('Migrasyon tamam.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
