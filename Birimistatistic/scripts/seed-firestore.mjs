/**
 * Firestore demo verisi — Firebase Client SDK + admin girişi.
 *
 * Kullanım (şifreyi repoya yazmayın):
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node scripts/seed-firestore.mjs
 *
 * İsteğe bağlı: --clear  → seed_tag ile işaretli kayıtları siler
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  limit
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SEED_TAG = 'birimistatistik-demo-v1';
const TAVIM_MIN = '2026-01-01';

const BIRIMLER = [
  'Yardımcı Sağlık Personeli Birimi',
  'Stratejik Personel Sicil Birimi'
];

const ORTAK_KATEGORILER = ['DYS', 'DYS (Yazışma)', 'EKİP', 'SİCİL ÖZETİ', 'HİTAP', 'DİĞER'];

const DEMO_USERS = [
  {
    email: 'demo.editor.ysp@birimistatistik.local',
    password: 'BirimDemo2026!x',
    role: 'editor',
    birim: 'Yardımcı Sağlık Personeli Birimi',
    ad: 'Ayşe',
    soyad: 'Yılmaz'
  },
  {
    email: 'demo.editor.sps@birimistatistik.local',
    password: 'BirimDemo2026!x',
    role: 'editor',
    birim: 'Stratejik Personel Sicil Birimi',
    ad: 'Mehmet',
    soyad: 'Kaya'
  },
  {
    email: 'demo.proje.ysp@birimistatistik.local',
    password: 'BirimDemo2026!x',
    role: 'proje_yetkilisi',
    birim: 'Yardımcı Sağlık Personeli Birimi',
    ad: 'Zeynep',
    soyad: 'Demir'
  }
];

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

function lockDocId(tarih, birim) {
  return `${tarih}__${birim}`;
}

function birimDocId(birim) {
  return birim.trim().replace(/\//g, '_');
}

/** Son N iş günü (Cumartesi/Pazar hariç), TAVIM_MIN sonrası */
function workdays(count, endDate = new Date()) {
  const out = [];
  const d = new Date(endDate);
  while (out.length < count) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      const iso = d.toISOString().slice(0, 10);
      if (iso >= TAVIM_MIN) out.push(iso);
    }
    d.setDate(d.getDate() - 1);
    if (d.getFullYear() < 2025) break;
  }
  return out.reverse();
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function ensureAuthUser(auth, email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (e) {
    if (e?.code === 'auth/user-not-found' || e?.code === 'auth/invalid-credential' || e?.code === 'auth/wrong-password') {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        console.log(`  Auth kullanıcısı oluşturuldu: ${email}`);
        return cred.user;
      } catch (e2) {
        throw new Error(`${email}: giriş/oluşturma başarısız (${e2?.code || e2?.message})`);
      }
    }
    throw e;
  }
}

async function clearSeededRecords(db) {
  const col = collection(db, 'islem_kayitlari');
  let total = 0;
  let rounds = 0;
  while (rounds < 50) {
    const snap = await getDocs(query(col, limit(400)));
    if (snap.empty) break;
    let batch = 0;
    for (const d of snap.docs) {
      if (d.data().seed_tag === SEED_TAG) {
        await deleteDoc(doc(db, 'islem_kayitlari', d.id));
        total++;
        batch++;
      }
    }
    if (batch === 0) break;
    rounds++;
  }
  console.log(`Silinen demo işlem kaydı: ${total}`);
  return total;
}

async function main() {
  loadEnvFile(resolve(ROOT, '.env.local'));
  loadEnvFile(resolve(ROOT, '.env'));

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const clearFirst = process.argv.includes('--clear');

  if (!adminEmail || !adminPassword) {
    console.error('SEED_ADMIN_EMAIL ve SEED_ADMIN_PASSWORD ortam değişkenleri gerekli.');
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

  console.log('Admin girişi…');
  const adminCred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  const adminUid = adminCred.user.uid;
  console.log(`Admin UID: ${adminUid}`);

  if (clearFirst) {
    console.log('--clear: eski demo kayıtları siliniyor…');
    await clearSeededRecords(db);
  }

  // config/admins — kurallar istemciden yazmayı kapalı (yalnızca Console). Admin yetkisi users/{uid}.role ile.
  const adminsSnap = await getDoc(doc(db, 'config', 'admins'));
  const inAdminsList = Array.isArray(adminsSnap.data()?.uids) && adminsSnap.data().uids.includes(adminUid);
  if (!inAdminsList) {
    console.log(
      'Not: config/admins uids listesine UID eklemek için Firebase Console kullanın (isteğe bağlı). users.role=admin yeterli.'
    );
  }

  await setDoc(doc(db, 'users', adminUid), {
    email: adminEmail,
    role: 'admin',
    birimler: BIRIMLER,
    ad: 'Uğur',
    soyad: 'Gürses',
    profil_tamamlandi: true
  }, { merge: true });
  console.log('Admin users/{uid} (role: admin) yazıldı.');

  await setDoc(doc(db, 'config', 'birimler'), { birimler: BIRIMLER }, { merge: true });
  await setDoc(
    doc(db, 'config', 'kategoriler_ortak'),
    { kategoriler: ORTAK_KATEGORILER, guncelleme: new Date().toISOString() },
    { merge: true }
  );
  const katParent = doc(db, 'config', '_kategoriler');
  await setDoc(katParent, { init: true }, { merge: true });
  await setDoc(doc(katParent, 'birimler', birimDocId(BIRIMLER[0])), {
    birim: BIRIMLER[0],
    kategoriler: [],
    guncelleme: new Date().toISOString()
  }, { merge: true });
  console.log('config (birimler, kategoriler) yazıldı.');

  const demoAccounts = [];
  for (const du of DEMO_USERS) {
    await signOut(auth);
    const user = await ensureAuthUser(auth, du.email, du.password);
    demoAccounts.push({ ...du, uid: user.uid });
    console.log(`Demo hesap hazır: ${du.email} (${user.uid})`);
  }

  for (const du of demoAccounts) {
    await signOut(auth);
    await signInWithEmailAndPassword(auth, du.email, du.password);
    await setDoc(
      doc(db, 'users', du.uid),
      {
        email: du.email,
        role: du.role,
        birimler: [du.birim],
        ad: du.ad,
        soyad: du.soyad,
        profil_tamamlandi: true
      },
      { merge: true }
    );
  }
  console.log('Demo users/{uid} profilleri (kendi hesaplarıyla) yazıldı.');

  const days = workdays(14);
  if (days.length === 0) {
    console.error('TAVIM sonrası iş günü bulunamadı.');
    process.exit(1);
  }
  console.log(`İş günleri (${days.length}): ${days[0]} … ${days[days.length - 1]}`);

  await signOut(auth);
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  let unlocked = 0;
  for (const tarih of days) {
    for (const birim of BIRIMLER) {
      const id = lockDocId(tarih, birim);
      const ref = doc(db, 'kesinlesen_gunler', id);
      if ((await getDoc(ref)).exists()) {
        await deleteDoc(ref);
        unlocked++;
      }
    }
  }
  if (unlocked) console.log(`Demo aralığında ${unlocked} gün kilidi kaldırıldı.`);

  const openDays = new Set(days.slice(-2));
  let recordCount = 0;
  let recordErrors = 0;

  for (const du of demoAccounts) {
    if (du.role !== 'editor') continue;
    await signOut(auth);
    const edCred = await signInWithEmailAndPassword(auth, du.email, du.password);
    const profSnap = await getDoc(doc(db, 'users', edCred.user.uid));
    console.log(`  Giriş: ${du.email} → rol: ${profSnap.data()?.role || '(yok)'}`);
    const cats = [...ORTAK_KATEGORILER];

    for (const tarih of days) {
      for (const kat of cats) {
        if (Math.random() > 0.75) continue;
        const isBirimOzel = false;
        try {
          await addDoc(collection(db, 'islem_kayitlari'), {
            birim: du.birim,
            islem_turu: kat,
            islem_sayisi: randInt(2, 45),
            kayit_tarihi: tarih,
            user_id: edCred.user.uid,
            kategori_kaynak: isBirimOzel ? 'birim' : 'ortak',
            seed_tag: SEED_TAG,
            created_at: new Date().toISOString()
          });
          recordCount++;
        } catch (e) {
          recordErrors++;
          console.error(`    HATA ${tarih} ${kat}: ${e?.code || ''} ${e?.message || e}`);
          if (recordErrors > 5) throw e;
        }
      }
    }
    console.log(`  Kayıtlar tamam: ${du.email}`);
  }

  await signOut(auth);
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

  let lockCount = 0;
  for (const tarih of days) {
    if (openDays.has(tarih)) continue;
    for (const birim of BIRIMLER) {
      const id = lockDocId(tarih, birim);
      const ref = doc(db, 'kesinlesen_gunler', id);
      if ((await getDoc(ref)).exists()) continue;
      await setDoc(ref, {
        kayit_tarihi: tarih,
        birim,
        finalized_by: adminUid,
        finalized_at: new Date().toISOString(),
        auto: false,
        seed_tag: SEED_TAG
      });
      lockCount++;
    }
  }

  await signOut(auth);

  console.log('\n--- Özet ---');
  console.log(`İşlem kayıtları: ${recordCount}`);
  console.log(`Kesinleşen gün kilitleri: ${lockCount}`);
  console.log(`Açık bırakılan günler: ${[...openDays].join(', ')}`);
  console.log('Demo hesaplar (şifre: BirimDemo2026!x):');
  for (const du of demoAccounts) {
    console.log(`  - ${du.email} (${du.role}, ${du.birim})`);
  }
  console.log('\nTamamlandı.');
}

main().catch((e) => {
  console.error('Seed hatası:', e?.message || e);
  process.exit(1);
});
