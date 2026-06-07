#!/usr/bin/env node
/**
 * Firestore ↔ Supabase veri taşıma doğrulaması
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=~/Downloads/...json \
 *   node scripts/verify-firestore-supabase.mjs
 *
 *   node scripts/verify-firestore-supabase.mjs --birim "Yardımcı Sağlık Personeli Birimi"
 *   node scripts/verify-firestore-supabase.mjs --sample 20   # rastgele kayıt içerik kontrolü
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const YSP_DEFAULT = 'Yardımcı Sağlık Personeli Birimi';

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
  const out = { birim: YSP_DEFAULT, allBirimler: false, sample: 0 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--all-birimler') out.allBirimler = true;
    else if (argv[i] === '--birim' && argv[i + 1]) out.birim = argv[++i];
    else if (argv[i] === '--sample' && argv[i + 1]) out.sample = Number(argv[++i]) || 0;
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

function stableHash(obj) {
  const norm = JSON.stringify(obj, Object.keys(obj).sort());
  return createHash('sha256').update(norm).digest('hex').slice(0, 16);
}

function mapIslemRow(id, data) {
  return {
    id,
    birim: data.birim,
    kayit_tarihi: data.kayit_tarihi,
    user_id: data.user_id,
    islem_turu: data.islem_turu,
    islem_sayisi: Number(data.islem_sayisi) || 0,
    kategori_kaynak: data.kategori_kaynak || null
  };
}

async function firestoreIds(db, collection, birimFilter) {
  const snap = await db.collection(collection).get();
  const ids = [];
  for (const d of snap.docs) {
    if (birimFilter(d.data(), d.id)) ids.push(d.id);
  }
  return ids.sort();
}

async function supabaseIds(sb, table, birim, allBirimler) {
  let q = sb.from(table).select('id');
  if (!allBirimler) q = q.eq('birim', birim);
  const { data, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data || []).map((r) => r.id).sort();
}

function diffSets(source, target, sourceLabel, targetLabel) {
  const s = new Set(source);
  const t = new Set(target);
  const onlySource = source.filter((id) => !t.has(id));
  const onlyTarget = target.filter((id) => !s.has(id));
  return { onlySource, onlyTarget, sourceLabel, targetLabel };
}

async function compareCollection(db, sb, args, fsColl, sbTable, label) {
  const birimFilter = (data) => matchesBirim(data, args.birim, args.allBirimler);
  const fsIds = await firestoreIds(db, fsColl, birimFilter);
  const sbIds = await supabaseIds(sb, sbTable, args.birim, args.allBirimler);
  const d = diffSets(fsIds, sbIds, 'Firestore', 'Supabase');
  const ok = d.onlySource.length === 0 && d.onlyTarget.length === 0;
  return {
    label,
    firestore: fsIds.length,
    supabase: sbIds.length,
    ok,
    missingInSupabase: d.onlySource,
    extraInSupabase: d.onlyTarget
  };
}

async function compareUsers(db, sb) {
  const snap = await db.collection('users').get();
  const fsIds = snap.docs.map((d) => d.id).sort();
  const { data, error } = await sb.from('bi_users').select('firebase_uid');
  if (error) throw error;
  const sbIds = (data || []).map((r) => r.firebase_uid).sort();
  const d = diffSets(fsIds, sbIds, 'Firestore', 'Supabase');
  return {
    label: 'users → bi_users',
    firestore: fsIds.length,
    supabase: sbIds.length,
    ok: d.onlySource.length === 0 && d.onlyTarget.length === 0,
    missingInSupabase: d.onlySource,
    extraInSupabase: d.onlyTarget
  };
}

async function compareAyKapanislari(db, sb) {
  const snap = await db.collection('ay_kapanislari').get();
  const fsIds = snap.docs.map((d) => d.id).sort();
  const { data, error } = await sb.from('bi_ay_kapanislari').select('yyyy_mm');
  if (error) throw error;
  const sbIds = (data || []).map((r) => r.yyyy_mm).sort();
  const d = diffSets(fsIds, sbIds, 'Firestore', 'Supabase');
  return {
    label: 'ay_kapanislari → bi_ay_kapanislari',
    firestore: fsIds.length,
    supabase: sbIds.length,
    ok: d.onlySource.length === 0 && d.onlyTarget.length === 0,
    missingInSupabase: d.onlySource,
    extraInSupabase: d.onlyTarget
  };
}

async function sampleIslemKayitlari(db, sb, args, n) {
  const birimFilter = (data) => matchesBirim(data, args.birim, args.allBirimler);
  const snap = await db.collection('islem_kayitlari').get();
  const candidates = snap.docs.filter((d) => birimFilter(d.data(), d.id));
  const pick = candidates.slice(0, Math.min(n, candidates.length));
  const mismatches = [];

  for (const d of pick) {
    const fs = mapIslemRow(d.id, d.data());
    const { data: row, error } = await sb
      .from('bi_islem_kayitlari')
      .select('id,birim,kayit_tarihi,user_id,islem_turu,islem_sayisi,kategori_kaynak')
      .eq('id', d.id)
      .maybeSingle();
    if (error) throw error;
    if (!row) {
      mismatches.push({ id: d.id, reason: 'Supabase\'de yok' });
      continue;
    }
    const sbNorm = {
      id: row.id,
      birim: row.birim,
      kayit_tarihi: row.kayit_tarihi,
      user_id: row.user_id,
      islem_turu: row.islem_turu,
      islem_sayisi: Number(row.islem_sayisi) || 0,
      kategori_kaynak: row.kategori_kaynak || null
    };
    if (stableHash(fs) !== stableHash(sbNorm)) {
      mismatches.push({ id: d.id, reason: 'Alan değerleri farklı', firestore: fs, supabase: sbNorm });
    }
  }

  return {
    label: `islem_kayitlari içerik örneği (${pick.length} kayıt)`,
    ok: mismatches.length === 0,
    checked: pick.length,
    mismatches
  };
}

async function countConfig(db, sb) {
  const checks = [];
  const pairs = [
    ['config/admins', 'bi_config_admins', 'id'],
    ['config/birimler', 'bi_config_birimler', 'id'],
    ['config/kategoriler_ortak', 'bi_config_kategoriler_ortak', 'id'],
    ['config/akis', 'bi_config_akis', 'id'],
    ['config/hedefler', 'bi_config_hedefler', 'id'],
    ['config/duyuru', 'bi_config_duyuru', 'id']
  ];
  for (const [fsPath, table] of pairs) {
    const doc = await db.doc(fsPath).get();
    const fsExists = doc.exists;
    const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true });
    if (error) throw error;
    const sbExists = (count ?? 0) > 0;
    checks.push({
      label: `${fsPath} → ${table}`,
      firestore: fsExists ? 1 : 0,
      supabase: count ?? 0,
      ok: fsExists === sbExists || (fsExists && sbExists)
    });
  }

  const birimKat = await db.collection('config/_kategoriler/birimler').get();
  const { count: sbKat, error: katErr } = await sb
    .from('bi_config_kategoriler_birim')
    .select('*', { count: 'exact', head: true });
  if (katErr) throw katErr;
  checks.push({
    label: 'config/_kategoriler/birimler → bi_config_kategoriler_birim',
    firestore: birimKat.size,
    supabase: sbKat ?? 0,
    ok: birimKat.size === (sbKat ?? 0)
  });

  return checks;
}

function printResult(r) {
  const status = r.ok ? '✓' : '✗';
  console.log(`${status} ${r.label}: Firestore=${r.firestore}, Supabase=${r.supabase}`);
  if (!r.ok) {
    if (r.missingInSupabase?.length) {
      console.log(`    Supabase'de eksik (${r.missingInSupabase.length}): ${r.missingInSupabase.slice(0, 5).join(', ')}${r.missingInSupabase.length > 5 ? '…' : ''}`);
    }
    if (r.extraInSupabase?.length) {
      console.log(`    Supabase'de fazla (${r.extraInSupabase.length}): ${r.extraInSupabase.slice(0, 5).join(', ')}${r.extraInSupabase.length > 5 ? '…' : ''}`);
    }
    if (r.mismatches?.length) {
      for (const m of r.mismatches.slice(0, 3)) {
        console.log(`    ${m.id}: ${m.reason}`);
      }
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli');
    process.exit(1);
  }

  const db = initFirebase();
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log(`Doğrulama — birim: ${args.allBirimler ? 'TÜMÜ' : args.birim}\n`);

  const results = [];

  results.push(await compareUsers(db, sb));
  for (const [fs, table, name] of [
    ['islem_kayitlari', 'bi_islem_kayitlari', 'islem_kayitlari'],
    ['kesinlesen_gunler', 'bi_kesinlesen_gunler', 'kesinlesen_gunler'],
    ['gun_onaylari', 'bi_gun_onaylari', 'gun_onaylari'],
    ['kilit_acma_talepleri', 'bi_kilit_acma_talepleri', 'kilit_acma_talepleri'],
    ['personel_izinleri', 'bi_personel_izinleri', 'personel_izinleri'],
    ['ay_birim_onaylari', 'bi_ay_birim_onaylari', 'ay_birim_onaylari'],
    ['audit_log', 'bi_audit_log', 'audit_log']
  ]) {
    results.push(await compareCollection(db, sb, args, fs, table, `${name} → ${table}`));
  }
  results.push(await compareAyKapanislari(db, sb));

  const configResults = await countConfig(db, sb);
  for (const r of results) printResult(r);
  console.log('\n--- Config ---');
  for (const r of configResults) printResult(r);

  if (args.sample > 0) {
    const sample = await sampleIslemKayitlari(db, sb, args, args.sample);
    console.log('\n--- İçerik örnekleme ---');
    printResult(sample);
    results.push(sample);
  }

  const allOk = results.every((r) => r.ok) && configResults.every((r) => r.ok);
  console.log(allOk ? '\n✓ Tüm kontroller geçti.' : '\n✗ Uyuşmazlık var — yukarıdaki detaylara bakın.');
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
