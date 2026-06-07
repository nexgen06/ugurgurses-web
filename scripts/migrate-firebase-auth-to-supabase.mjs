#!/usr/bin/env node
/**
 * Firebase Auth export → Livetable Supabase merge/import
 *
 * Kullanım:
 *   1. Firebase CLI: firebase auth:export firebase-users.json --format=json
 *   2. .env.local (repo kökü veya Birimistatistic/):
 *        SUPABASE_URL=https://xxx.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   3. node scripts/migrate-firebase-auth-to-supabase.mjs --input firebase-users.json
 *
 * Aynı e-posta Supabase'te varsa: kullanıcı SİLİNMEZ, bi_profiles.legacy_firebase_uid yazılır.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(resolve(ROOT, '.env.local'));
loadEnvFile(resolve(ROOT, 'Birimistatistic/.env.local'));
loadEnvFile(resolve(ROOT, 'Birimistatistic/.env'));

function parseArgs(argv) {
  const args = { input: '', dryRun: false, adminEmails: [] };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--input' && argv[i + 1]) {
      args.input = argv[++i];
    } else if (argv[i] === '--dry-run') {
      args.dryRun = true;
    } else if (argv[i] === '--admin-email' && argv[i + 1]) {
      args.adminEmails.push(argv[++i].toLowerCase());
    }
  }
  return args;
}

function parseFirebaseExport(raw) {
  const json = JSON.parse(raw);
  const users = Array.isArray(json.users) ? json.users : [];
  return users
    .filter((u) => typeof u.email === 'string' && u.email.includes('@'))
    .map((u) => ({
      localId: u.localId || u.uid || '',
      email: u.email.trim().toLowerCase(),
      emailVerified: Boolean(u.emailVerified),
      disabled: Boolean(u.disabled)
    }))
    .filter((u) => u.localId);
}

async function listAllUsers(admin) {
  const all = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers: ${error.message}`);
    all.push(...(data.users || []));
    if ((data.users || []).length < perPage) break;
    page += 1;
  }
  return all;
}

function initFirebaseAdmin() {
  if (getApps().length > 0) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (json) {
    initializeApp({ credential: cert(JSON.parse(json)) });
    return;
  }
  if (credPath && existsSync(credPath)) {
    initializeApp({ credential: cert(JSON.parse(readFileSync(credPath, 'utf8'))) });
    return;
  }
  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON veya GOOGLE_APPLICATION_CREDENTIALS gerekli');
}

async function loadFirestoreProfiles(firebaseUsers) {
  initFirebaseAdmin();
  const db = getFirestore();
  const adminSnap = await db.doc('config/admins').get();
  const adminUids = new Set(
    Array.isArray(adminSnap.data()?.uids)
      ? adminSnap.data().uids.filter((u) => typeof u === 'string')
      : []
  );

  const profiles = new Map();
  for (const fbUser of firebaseUsers) {
    const snap = await db.doc(`users/${fbUser.localId}`).get();
    const data = snap.data() || {};
    let role = typeof data.role === 'string' ? data.role.toLowerCase() : 'viewer';
    if (adminUids.has(fbUser.localId)) role = 'admin';
    profiles.set(fbUser.localId, {
      role,
      birimler: Array.isArray(data.birimler)
        ? data.birimler.filter((b) => typeof b === 'string')
        : [],
      ad: typeof data.ad === 'string' ? data.ad : undefined,
      soyad: typeof data.soyad === 'string' ? data.soyad : undefined,
      profil_tamamlandi: data.profil_tamamlandi === true
    });
  }
  return profiles;
}

async function upsertBiProfile(admin, row, dryRun) {
  const payload = {
    id: row.supabaseId,
    email: row.email,
    legacy_firebase_uid: row.firebaseUid,
    role: row.forceAdmin ? 'admin' : (row.profile?.role || 'viewer'),
    birimler: row.profile?.birimler || [],
    ...(row.profile?.ad ? { ad: row.profile.ad } : {}),
    ...(row.profile?.soyad ? { soyad: row.profile.soyad } : {}),
    ...(row.profile?.profil_tamamlandi ? { profil_tamamlandi: true } : {})
  };
  if (dryRun) {
    console.log('[dry-run] bi_profiles upsert:', payload);
    return;
  }
  const { error } = await admin.from('bi_profiles').upsert(payload, { onConflict: 'id' });
  if (error) throw new Error(`bi_profiles upsert (${row.email}): ${error.message}`);
}

async function createAuthUser(admin, fbUser, dryRun) {
  if (dryRun) {
    console.log('[dry-run] create user:', fbUser.email);
    return { id: 'dry-run-uuid' };
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: fbUser.email,
    email_confirm: fbUser.emailVerified,
    user_metadata: { legacy_firebase_uid: fbUser.localId }
  });
  if (error) throw new Error(`createUser (${fbUser.email}): ${error.message}`);
  return data.user;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.input) {
    console.error('Kullanım: node scripts/migrate-firebase-auth-to-supabase.mjs --input firebase-users.json [--dry-run] [--admin-email you@mail.com]');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local)');
    process.exit(1);
  }

  const inputPath = resolve(process.cwd(), args.input);
  const exportUsers = parseFirebaseExport(readFileSync(inputPath, 'utf8'));
  console.log(`Firebase export: ${exportUsers.length} kullanıcı`);

  const firestoreProfiles = await loadFirestoreProfiles(exportUsers);
  console.log(`Firestore profilleri yüklendi: ${firestoreProfiles.size}`);

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const existing = await listAllUsers(admin);
  const byEmail = new Map(
    existing
      .filter((u) => u.email)
      .map((u) => [u.email.toLowerCase(), u])
  );

  const stats = { merged: 0, created: 0, skipped: 0, errors: 0 };

  for (const fbUser of exportUsers) {
    if (fbUser.disabled) {
      stats.skipped += 1;
      console.log(`skip (disabled): ${fbUser.email}`);
      continue;
    }

    const existingUser = byEmail.get(fbUser.email);
    const forceAdmin = args.adminEmails.includes(fbUser.email);
    const profile = firestoreProfiles.get(fbUser.localId) || null;

    try {
      if (existingUser) {
        await upsertBiProfile(
          admin,
          {
            supabaseId: existingUser.id,
            email: fbUser.email,
            firebaseUid: fbUser.localId,
            forceAdmin,
            profile
          },
          args.dryRun
        );
        stats.merged += 1;
        console.log(
          `merge: ${fbUser.email} → ${existingUser.id} (firebase ${fbUser.localId}, rol ${profile?.role || '?'})`
        );
      } else {
        const created = await createAuthUser(admin, fbUser, args.dryRun);
        await upsertBiProfile(
          admin,
          {
            supabaseId: created.id,
            email: fbUser.email,
            firebaseUid: fbUser.localId,
            forceAdmin,
            profile
          },
          args.dryRun
        );
        stats.created += 1;
        console.log(`create: ${fbUser.email} (${created.id}, rol ${profile?.role || 'viewer'})`);
      }
    } catch (e) {
      stats.errors += 1;
      console.error(`error (${fbUser.email}):`, e.message);
    }
  }

  console.log('\nÖzet:', stats);
  if (args.dryRun) console.log('Dry-run tamamlandı — değişiklik yazılmadı.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
