/**
 * Firebase Functions — haftalık kesinleştirme özeti (Pazartesi 08:00 Europe/Istanbul)
 *
 * Kurulum:
 * 1. firebase init functions (bu klasörü kullanın)
 * 2. firebase functions:config:set smtp.user="..." smtp.pass="..." digest.to="proje@kurum.gov.tr"
 * 3. firebase deploy --only functions
 *
 * SMTP yoksa Firestore config/haftalik_ozet son çalıştırmayı yazar; e-posta için Extension veya SendGrid ekleyin.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const jwt = require('jsonwebtoken');

initializeApp();

/**
 * Supabase access token → Firebase custom token (Firestore kuralları için).
 * Kurulum: firebase functions:secrets:set SUPABASE_JWT_SECRET
 * Secret değeri: Supabase Dashboard → Project Settings → API → JWT Secret
 */
exports.issueFirebaseTokenFromSupabase = onCall(
  { region: 'europe-west1', secrets: ['SUPABASE_JWT_SECRET'] },
  async (request) => {
    const accessToken = request.data?.accessToken;
    if (!accessToken || typeof accessToken !== 'string') {
      throw new HttpsError('invalid-argument', 'accessToken gerekli');
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new HttpsError('failed-precondition', 'SUPABASE_JWT_SECRET yapılandırılmamış');
    }

    let decoded;
    try {
      decoded = jwt.verify(accessToken, secret, { algorithms: ['HS256'] });
    } catch {
      throw new HttpsError('unauthenticated', 'Geçersiz Supabase oturumu');
    }

    const email = typeof decoded.email === 'string' ? decoded.email.trim().toLowerCase() : '';
    if (!email) {
      throw new HttpsError('not-found', 'E-posta bulunamadı');
    }

    const db = getFirestore();
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snap.empty) {
      throw new HttpsError('not-found', `Firestore users kaydı yok: ${email}`);
    }

    const firebaseUid = snap.docs[0].id;
    const token = await getAuth().createCustomToken(firebaseUid);
    return { token };
  }
);

function weekStartEnd() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

async function buildSummary(db) {
  const { start, end } = weekStartEnd();
  const today = new Date().toISOString().split('T')[0];
  const recSnap = await db
    .collection('islem_kayitlari')
    .where('kayit_tarihi', '>=', start)
    .where('kayit_tarihi', '<=', end)
    .get();
  const lockSnap = await db
    .collection('kesinlesen_gunler')
    .where('kayit_tarihi', '>=', start)
    .where('kayit_tarihi', '<=', end)
    .get();

  const lockedIds = new Set(lockSnap.docs.map((d) => d.id));
  const pairs = new Map();
  const catTotals = {};

  recSnap.docs.forEach((doc) => {
    const r = doc.data();
    if (!r.kayit_tarihi || !r.birim) return;
    const id = `${r.kayit_tarihi}__${r.birim}`;
    if (!pairs.has(id)) pairs.set(id, { tarih: r.kayit_tarihi, birim: r.birim });
    const k = r.islem_turu || 'Diger';
    catTotals[k] = (catTotals[k] || 0) + (r.islem_sayisi || 0);
  });

  let kilitlenenGun = 0;
  let bekleyenGun = 0;
  pairs.forEach((p, id) => {
    if (lockedIds.has(id)) kilitlenenGun++;
    else if (p.tarih < today) bekleyenGun++;
  });

  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

  return {
    weekStart: start,
    weekEnd: end,
    kilitlenenGun,
    bekleyenGun,
    enYuksekKategori: topCat ? topCat[0] : '—',
    enYuksekKategoriAdet: topCat ? topCat[1] : 0,
    metin: `Bu hafta ${kilitlenenGun} gun kilitlendi, ${bekleyenGun} gun bekliyor. En yuksek kategori: ${topCat ? topCat[0] : '—'}.`
  };
}

exports.weeklyFinalizeDigest = onSchedule(
  {
    schedule: '0 8 * * 1',
    timeZone: 'Europe/Istanbul',
    region: 'europe-west1'
  },
  async () => {
    const db = getFirestore();
    const summary = await buildSummary(db);
    await db.collection('config').doc('haftalik_ozet').set(
      {
        ...summary,
        gonderildi_at: new Date().toISOString()
      },
      { merge: true }
    );
    console.log('Haftalik ozet:', summary.metin);
    // E-posta: nodemailer veya Trigger Email extension ile config/digest.to adresine gönderin.
  }
);
