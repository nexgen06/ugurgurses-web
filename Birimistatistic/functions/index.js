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
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

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
