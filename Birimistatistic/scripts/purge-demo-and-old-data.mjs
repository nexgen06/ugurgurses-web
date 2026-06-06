/**
 * Demo ve kesim tarihinden önceki işlem/kilit/onay kayıtlarını siler.
 *
 *   KESIM_TARIH=2026-06-01  → bu tarih ve sonrası KALIR
 *
 * Kullanım:
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node scripts/purge-demo-and-old-data.mjs
 *   node scripts/purge-demo-and-old-data.mjs --dry-run
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  limit
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SEED_TAG = 'birimistatistik-demo-v1';
/** Sistem kullanım başlangıcı — bu tarih ve sonrası kalır (01.06.2026) */
const KESIM_TARIH = process.env.KESIM_TARIH || '2026-06-01';

const DEMO_EMAIL_SUFFIX = '@birimistatistik.local';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function tarihFromLockId(id) {
  const sep = id.indexOf('__');
  if (sep <= 0) return null;
  return id.slice(0, sep);
}

function shouldDeleteByDate(tarih) {
  if (!tarih || typeof tarih !== 'string') return false;
  return tarih < KESIM_TARIH;
}

async function purgeCollection(db, name, shouldDelete, dryRun) {
  const col = collection(db, name);
  let deleted = 0;
  let scanned = 0;
  let rounds = 0;
  while (rounds < 200) {
    const snap = await getDocs(query(col, limit(400)));
    if (snap.empty) break;
    let batchDeleted = 0;
    for (const d of snap.docs) {
      scanned++;
      const data = d.data();
      if (!shouldDelete(d.id, data)) continue;
      if (!dryRun) await deleteDoc(doc(db, name, d.id));
      deleted++;
      batchDeleted++;
    }
    if (batchDeleted === 0 && snap.size < 400) break;
    rounds++;
  }
  return { deleted, scanned };
}

async function main() {
  loadEnvFile(resolve(ROOT, '.env.local'));
  loadEnvFile(resolve(ROOT, '.env'));

  const dryRun = process.argv.includes('--dry-run');
  const adminEmail = process.env.SEED_ADMIN_EMAIL || process.env.PURGE_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || process.env.PURGE_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('SEED_ADMIN_EMAIL ve SEED_ADMIN_PASSWORD (veya PURGE_*) gerekli.');
    process.exit(1);
  }

  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
  };

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('.env.local içinde VITE_FIREBASE_* eksik.');
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log(`Admin girişi… (kesim: ${KESIM_TARIH} ve sonrası kalır)${dryRun ? ' [DRY-RUN]' : ''}`);
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

  const islem = await purgeCollection(
    db,
    'islem_kayitlari',
    (_id, data) =>
      data.seed_tag === SEED_TAG ||
      shouldDeleteByDate(data.kayit_tarihi) ||
      (typeof data.kayit_tarihi === 'string' && data.kayit_tarihi.startsWith('2020-')),
    dryRun
  );
  console.log(`islem_kayitlari: ${islem.deleted} silindi / ${islem.scanned} tarandı`);

  const kesin = await purgeCollection(
    db,
    'kesinlesen_gunler',
    (id, data) => shouldDeleteByDate(data.kayit_tarihi || tarihFromLockId(id)),
    dryRun
  );
  console.log(`kesinlesen_gunler: ${kesin.deleted} silindi`);

  const gunOnay = await purgeCollection(
    db,
    'gun_onaylari',
    (id, data) => shouldDeleteByDate(data.kayit_tarihi || tarihFromLockId(id)),
    dryRun
  );
  console.log(`gun_onaylari: ${gunOnay.deleted} silindi`);

  const kilitTalep = await purgeCollection(
    db,
    'kilit_acma_talepleri',
    (id, data) => shouldDeleteByDate(data.kayit_tarihi || tarihFromLockId(id)),
    dryRun
  );
  console.log(`kilit_acma_talepleri: ${kilitTalep.deleted} silindi`);

  const users = await purgeCollection(
    db,
    'users',
    (_id, data) => {
      const email = (data.email || '').toLowerCase();
      return email.endsWith(DEMO_EMAIL_SUFFIX) || email.startsWith('demo.');
    },
    dryRun
  );
  console.log(`users (demo hesaplar): ${users.deleted} silindi`);

  console.log(dryRun ? 'Dry-run tamamlandı (silme yapılmadı).' : 'Temizlik tamamlandı.');
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
