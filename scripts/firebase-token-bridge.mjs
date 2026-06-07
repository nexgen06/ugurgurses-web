import jwt from 'jsonwebtoken';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

function initFirebaseAdmin() {
  if (getApps().length > 0) return;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    initializeApp({ credential: cert(JSON.parse(json)) });
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'mulakat-takip-sistemi';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey })
    });
    return;
  }

  throw new Error(
    'FIREBASE_SERVICE_ACCOUNT_JSON veya FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY gerekli'
  );
}

async function resolveFirebaseUid(decoded) {
  const supabaseSub = typeof decoded.sub === 'string' ? decoded.sub : '';
  const emailRaw = typeof decoded.email === 'string' ? decoded.email.trim() : '';
  const emailLower = emailRaw.toLowerCase();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseSub && supabaseUrl && serviceKey) {
    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: biRow } = await sb
      .from('bi_profiles')
      .select('legacy_firebase_uid')
      .eq('id', supabaseSub)
      .maybeSingle();
    if (biRow?.legacy_firebase_uid) {
      return biRow.legacy_firebase_uid;
    }
  }

  initFirebaseAdmin();
  const db = getFirestore();

  if (emailRaw) {
    for (const candidate of [emailRaw, emailLower]) {
      const snap = await db.collection('users').where('email', '==', candidate).limit(1).get();
      if (!snap.empty) return snap.docs[0].id;
    }
  }

  throw new Error(emailRaw ? `Firestore users kaydı yok: ${emailRaw}` : 'E-posta bulunamadı');
}

async function verifySupabaseAccessToken(accessToken) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data, error } = await sb.auth.getUser(accessToken);
    if (error || !data?.user) {
      throw new Error(error?.message || 'Geçersiz Supabase oturumu');
    }
    return {
      sub: data.user.id,
      email: data.user.email || ''
    };
  }

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY veya SUPABASE_JWT_SECRET gerekli');
  }
  try {
    return jwt.verify(accessToken, secret, { algorithms: ['HS256'] });
  } catch {
    throw new Error('Geçersiz Supabase oturumu');
  }
}

export async function issueFirebaseCustomToken(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('accessToken gerekli');
  }

  const decoded = await verifySupabaseAccessToken(accessToken);
  const firebaseUid = await resolveFirebaseUid(decoded);
  initFirebaseAdmin();
  const token = await getAuth().createCustomToken(firebaseUid);
  return { token, firebaseUid };
}
