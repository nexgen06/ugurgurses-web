#!/usr/bin/env node
/**
 * Railway'e auth köprüsü değişkenlerini yazar.
 *
 * Kullanım:
 *   node scripts/set-railway-bridge-env.mjs \
 *     --jwt-secret "sb_secret_..." \
 *     --service-account ~/Downloads/mulakat-takip-sistemi-firebase-adminsdk-xxxxx.json
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { spawnSync } from 'child_process';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : '';
}

const jwtSecret = arg('--jwt-secret');
const saPath = arg('--service-account');
const supabaseUrl = arg('--supabase-url');
const serviceRoleKey = arg('--service-role-key');

if (!jwtSecret) {
  console.error(
    'Kullanım: --jwt-secret "sb_secret_..." [--service-account path/to.json] [--supabase-url URL] [--service-role-key KEY]'
  );
  process.exit(1);
}

function railwaySet(key, value) {
  const r = spawnSync('railway', ['variable', 'set', `${key}=${value}`, '--service', 'web'], {
    stdio: 'inherit',
    encoding: 'utf8'
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

railwaySet('SUPABASE_JWT_SECRET', jwtSecret);

if (saPath) {
  const json = readFileSync(resolve(saPath), 'utf8').trim();
  JSON.parse(json);
  railwaySet('FIREBASE_SERVICE_ACCOUNT_JSON', json);
  console.log('FIREBASE_SERVICE_ACCOUNT_JSON ayarlandı.');
}

if (supabaseUrl) {
  railwaySet('SUPABASE_URL', supabaseUrl);
  console.log('SUPABASE_URL ayarlandı.');
}

if (serviceRoleKey) {
  railwaySet('SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey);
  console.log('SUPABASE_SERVICE_ROLE_KEY ayarlandı.');
}

console.log('SUPABASE_JWT_SECRET ayarlandı. railway up veya otomatik deploy sonrası test edin.');
