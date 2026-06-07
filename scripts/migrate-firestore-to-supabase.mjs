#!/usr/bin/env node
/**
 * Firestore → Supabase (YSP + paylaşılan config) toplu aktarım
 *
 * Önkoşul: supabase/migrations/002_bi_data.sql çalıştırılmış olmalı.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=~/Downloads/...json \
 *   node scripts/migrate-firestore-to-supabase.mjs --dry-run
 *
 *   node scripts/migrate-firestore-to-supabase.mjs --birim "Yardımcı Sağlık Personeli Birimi"
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const YSP_DEFAULT = 'Yardımcı Sağlık Personeli Birimi';
const BATCH = 400;

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
  const out = { dryRun: false, birim: YSP_DEFAULT, allBirimler: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') out.dryRun = true;
    else if (argv[i] === '--all-birimler') out.allBirimler = true;
    else if (argv[i] === '--birim' && argv[i + 1]) out.birim = argv[++i];
  }
  return out;
}

function initFirebase() {
  if (getApps().length > 0) return getFirestore();
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (json) {
    initializeApp({ credential: cert(JSON.parse(json)) });
  } else if (credPath && existsSync(credPath)) {
    initializeApp({ credential: cert(JSON.parse(readFileSync(credPath, 'utf8'))) });
  } else {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON veya GOOGLE_APPLICATION_CREDENTIALS gerekli');
  }
  return getFirestore();
}

function matchesBirim(data, birim, allBirimler) {
  if (allBirimler) return true;
  const b = data?.birim;
  return typeof b === 'string' && b.trim() === birim;
}

function stripUndefined(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function upsertRows(sb, table, rows, dryRun, onConflict = 'id') {
  if (!rows.length) return 0;
  if (dryRun) {
    console.log(`[dry-run] ${table}: ${rows.length} satır`);
    return rows.length;
  }
  const { error } = await sb.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  return rows.length;
}

async function migrateConfig(db, sb, dryRun) {
  const stats = {};

  const admins = await db.doc('config/admins').get();
  if (admins.exists) {
    const uids = admins.data()?.uids || [];
    stats.bi_config_admins = await upsertRows(
      sb,
      'bi_config_admins',
      [{ id: 'admins', uids, updated_at: new Date().toISOString() }],
      dryRun
    );
  }

  const birimler = await db.doc('config/birimler').get();
  if (birimler.exists) {
    stats.bi_config_birimler = await upsertRows(
      sb,
      'bi_config_birimler',
      [{
        id: 'birimler',
        birimler: birimler.data()?.birimler || [],
        updated_at: new Date().toISOString()
      }],
      dryRun
    );
  }

  const ortak = await db.doc('config/kategoriler_ortak').get();
  if (ortak.exists) {
    stats.bi_config_kategoriler_ortak = await upsertRows(
      sb,
      'bi_config_kategoriler_ortak',
      [{
        id: 'ortak',
        kategoriler: ortak.data()?.kategoriler || [],
        updated_at: new Date().toISOString()
      }],
      dryRun
    );
  }

  for (const cfg of ['akis', 'hedefler']) {
    const snap = await db.doc(`config/${cfg}`).get();
    if (snap.exists) {
      const table = cfg === 'akis' ? 'bi_config_akis' : 'bi_config_hedefler';
      stats[table] = await upsertRows(
        sb,
        table,
        [{ id: cfg, data: stripUndefined(snap.data()), updated_at: new Date().toISOString() }],
        dryRun
      );
    }
  }

  const duyuru = await db.doc('config/duyuru').get();
  if (duyuru.exists) {
    const d = duyuru.data();
    stats.bi_config_duyuru = await upsertRows(
      sb,
      'bi_config_duyuru',
      [{
        id: 'duyuru',
        metin: typeof d.metin === 'string' ? d.metin : '',
        updated_at: d.updated_at ? new Date().toISOString() : null,
        legacy_updated_at: d.updated_at || null
      }],
      dryRun
    );
  }

  const birimKat = await db.collection('config/_kategoriler/birimler').get();
  const katRows = birimKat.docs.map((d) => ({
    birim_doc_id: d.id,
    birim: d.data()?.birim || d.id.replace(/_/g, ' '),
    kategoriler: d.data()?.kategoriler || [],
    updated_at: new Date().toISOString()
  }));
  stats.bi_config_kategoriler_birim = await upsertRows(
    sb,
    'bi_config_kategoriler_birim',
    katRows,
    dryRun,
    'birim_doc_id'
  );

  return stats;
}

async function migrateUsers(db, sb, dryRun) {
  const snap = await db.collection('users').get();
  const rows = snap.docs.map((d) => {
    const data = d.data();
    return {
      firebase_uid: d.id,
      email: data.email || null,
      role: (data.role || 'viewer').toLowerCase(),
      birimler: data.birimler || [],
      ad: data.ad || null,
      soyad: data.soyad || null,
      profil_tamamlandi: data.profil_tamamlandi === true,
      legacy_firestore_id: d.id,
      updated_at: new Date().toISOString()
    };
  });
  if (dryRun) {
    console.log(`[dry-run] bi_users: ${rows.length}`);
    return rows.length;
  }
  const { error } = await sb.from('bi_users').upsert(rows, { onConflict: 'firebase_uid' });
  if (error) throw new Error(`bi_users: ${error.message}`);
  return rows.length;
}

async function migrateCollection(db, sb, collectionName, mapRow, filterFn, dryRun, table, conflictKey = 'id') {
  const snap = await db.collection(collectionName).get();
  const rows = [];
  for (const d of snap.docs) {
    const data = d.data();
    if (!filterFn(data, d.id)) continue;
    rows.push(mapRow(d.id, data));
  }
  if (!rows.length) return 0;
  if (dryRun) {
    console.log(`[dry-run] ${table}: ${rows.length}`);
    return rows.length;
  }
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await sb.from(table).upsert(chunk, { onConflict: conflictKey });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  return rows.length;
}

async function main() {
  const args = parseArgs(process.argv);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (Birimistatistic/.env.local)');
    process.exit(1);
  }

  const db = initFirebase();
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const birimFilter = (data) => matchesBirim(data, args.birim, args.allBirimler);

  console.log(`Birim filtresi: ${args.allBirimler ? 'TÜMÜ' : args.birim}`);
  if (args.dryRun) console.log('--- DRY RUN ---');

  const summary = {};

  summary.config = await migrateConfig(db, sb, args.dryRun);
  summary.bi_users = await migrateUsers(db, sb, args.dryRun);

  summary.bi_islem_kayitlari = await migrateCollection(
    db,
    sb,
    'islem_kayitlari',
    (id, data) => ({
      id,
      legacy_firestore_id: id,
      birim: data.birim,
      kayit_tarihi: data.kayit_tarihi,
      user_id: data.user_id,
      islem_turu: data.islem_turu,
      islem_sayisi: Number(data.islem_sayisi) || 0,
      kategori_kaynak: data.kategori_kaynak || null,
      created_at: data.created_at || null,
      updated_at: data.updated_at || null
    }),
    birimFilter,
    args.dryRun,
    'bi_islem_kayitlari'
  );

  for (const [coll, table, extra] of [
    ['kesinlesen_gunler', 'bi_kesinlesen_gunler', (id, data) => ({
      id,
      legacy_firestore_id: id,
      kayit_tarihi: data.kayit_tarihi,
      birim: data.birim,
      data: stripUndefined(data),
      locked_at: data.locked_at || data.kesinlestirme_at || null
    })],
    ['gun_onaylari', 'bi_gun_onaylari', (id, data) => ({
      id,
      legacy_firestore_id: id,
      kayit_tarihi: data.kayit_tarihi,
      birim: data.birim,
      data: stripUndefined(data)
    })],
    ['kilit_acma_talepleri', 'bi_kilit_acma_talepleri', (id, data) => ({
      id,
      legacy_firestore_id: id,
      kayit_tarihi: data.kayit_tarihi,
      birim: data.birim,
      durum: data.durum,
      data: stripUndefined(data)
    })],
    ['personel_izinleri', 'bi_personel_izinleri', (id, data) => ({
      id,
      legacy_firestore_id: id,
      birim: data.birim,
      baslangic: data.baslangic || null,
      data: stripUndefined(data)
    })],
    ['ay_birim_onaylari', 'bi_ay_birim_onaylari', (id, data) => ({
      id,
      legacy_firestore_id: id,
      yyyy_mm: data.yyyy_mm || id.split('__')[0],
      birim: data.birim,
      data: stripUndefined(data)
    })],
    ['audit_log', 'bi_audit_log', (id, data) => ({
      id,
      legacy_firestore_id: id,
      birim: data.birim || null,
      kayit_tarihi: data.kayit_tarihi || null,
      actor_uid: data.actor_uid || null,
      action: data.action || null,
      at: data.at || null,
      data: stripUndefined(data)
    })]
  ]) {
    summary[table] = await migrateCollection(db, sb, coll, extra, birimFilter, args.dryRun, table);
  }

  const aySnap = await db.collection('ay_kapanislari').get();
  const ayRows = aySnap.docs.map((d) => ({
    yyyy_mm: d.id,
    legacy_firestore_id: d.id,
    data: stripUndefined(d.data())
  }));
  summary.bi_ay_kapanislari = await upsertRows(sb, 'bi_ay_kapanislari', ayRows, args.dryRun, 'yyyy_mm');

  console.log('\n=== Özet ===');
  console.log(JSON.stringify(summary, null, 2));
  if (args.dryRun) console.log('\nDry-run bitti. Gerçek aktarım için --dry-run kaldırın.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
