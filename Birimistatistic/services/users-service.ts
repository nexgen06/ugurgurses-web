/**
 * Kullanıcı profilleri (rol, birimler) ve yönetici listesi.
 * Firestore: users/{uid}, config/admins
 */

import { getFirebaseFirestore } from '../firebase';
import { getSupabaseClient } from '../lib/supabase';
import { getDataProviderMode } from '../lib/data-provider';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import type { UserRole } from '../types';

const USERS_COLLECTION = 'users';
const CONFIG_ADMINS_PATH = 'config/admins';
const DEFAULT_ROLE: UserRole = 'viewer';

const VALID_ROLES: UserRole[] = ['admin', 'proje_yetkilisi', 'editor', 'viewer'];

function parseRole(value: unknown): UserRole {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return VALID_ROLES.includes(raw as UserRole) ? (raw as UserRole) : DEFAULT_ROLE;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  birimler: string[];
  ad?: string;
  soyad?: string;
  profil_tamamlandi?: boolean;
}

export interface UserProfileRoleFields {
  role: UserRole;
  birimler: string[];
  ad?: string;
  soyad?: string;
  profil_tamamlandi?: boolean;
}

/** config/admins dokümanından admin UID listesini al (alan: uids, array) */
export async function getAdminUids(): Promise<string[]> {
  try {
    if (getDataProviderMode() === 'supabase') {
      const { data, error } = await getSupabaseClient()
        .from('bi_config_admins')
        .select('uids')
        .eq('id', 'admins')
        .maybeSingle();
      if (error) throw error;
      const uids = data?.uids;
      if (!Array.isArray(uids)) return [];
      return uids.filter((u: unknown) => typeof u === 'string');
    }
    const db = getFirebaseFirestore();
    const ref = doc(db, CONFIG_ADMINS_PATH);
    const snap = await getDoc(ref);
    const data = snap.data();
    if (!data || !Array.isArray(data.uids)) return [];
    return data.uids.filter((u: unknown) => typeof u === 'string');
  } catch {
    return [];
  }
}

/** Mevcut kullanıcının admin olup olmadığını kontrol et */
export async function isCurrentUserAdmin(currentUid: string): Promise<boolean> {
  const uids = await getAdminUids();
  return uids.includes(currentUid);
}

function parseProfileData(data: Record<string, unknown> | undefined): UserProfileRoleFields {
  if (!data) return { role: DEFAULT_ROLE, birimler: [] };
  const role = parseRole(data.role);
  const birimler = Array.isArray(data.birimler) ? data.birimler.filter((b: unknown) => typeof b === 'string') : [];
  const ad = typeof data.ad === 'string' ? data.ad.trim() : undefined;
  const soyad = typeof data.soyad === 'string' ? data.soyad.trim() : undefined;
  const profil_tamamlandi = data.profil_tamamlandi === true;
  return { role, birimler, ad: ad || undefined, soyad: soyad || undefined, profil_tamamlandi };
}

/** users/{uid} dokümanını oku; yoksa varsayılan döndür */
export async function fetchUserProfile(uid: string): Promise<UserProfileRoleFields> {
  try {
    if (getDataProviderMode() === 'supabase') {
      const { data, error } = await getSupabaseClient()
        .from('bi_users')
        .select('role, birimler, ad, soyad, profil_tamamlandi')
        .eq('firebase_uid', uid)
        .maybeSingle();
      if (error) throw error;
      return parseProfileData(data as Record<string, unknown> | undefined);
    }
    const db = getFirebaseFirestore();
    const ref = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(ref);
    return parseProfileData(snap.data() as Record<string, unknown> | undefined);
  } catch {
    return { role: DEFAULT_ROLE, birimler: [] };
  }
}

/** İlk girişte kullanıcı dokümanı yoksa oluştur (kendi dokümanına yazma yetkisi gerekir) */
export async function ensureUserDoc(uid: string, email: string): Promise<void> {
  try {
    if (getDataProviderMode() === 'supabase') {
      const sb = getSupabaseClient();
      const { data } = await sb.from('bi_users').select('firebase_uid').eq('firebase_uid', uid).maybeSingle();
      if (data) return;
      const { error } = await sb.from('bi_users').insert({
        firebase_uid: uid,
        email: email || '',
        role: DEFAULT_ROLE,
        birimler: []
      });
      if (error) console.warn('ensureUserDoc:', error.message);
      return;
    }
    const db = getFirebaseFirestore();
    const ref = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return;
    await setDoc(ref, {
      email: email || '',
      role: DEFAULT_ROLE,
      birimler: []
    });
  } catch (e) {
    console.warn('ensureUserDoc:', e);
  }
}

/** Kullanıcı profillerini listele (admin: tümü; diğerleri: ortak birimdeki kayıtlar — Firestore kuralları) */
export async function listUserProfiles(): Promise<{ data: UserProfile[]; error: string | null }> {
  try {
    if (getDataProviderMode() === 'supabase') {
      const { data, error } = await getSupabaseClient().from('bi_users').select('*');
      if (error) throw error;
      const rows: UserProfile[] = (data || []).map((row) => {
        const parsed = parseProfileData(row as Record<string, unknown>);
        return {
          uid: row.firebase_uid,
          email: row.email || '',
          role: parsed.role,
          birimler: parsed.birimler,
          ad: parsed.ad,
          soyad: parsed.soyad,
          profil_tamamlandi: parsed.profil_tamamlandi
        };
      });
      return { data: rows, error: null };
    }
    const db = getFirebaseFirestore();
    const colRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(colRef);
    const data: UserProfile[] = snapshot.docs.map((d) => {
      const o = d.data();
      const parsed = parseProfileData(o as Record<string, unknown>);
      return {
        uid: d.id,
        email: (o.email as string) || '',
        role: parsed.role,
        birimler: parsed.birimler,
        ad: parsed.ad,
        soyad: parsed.soyad,
        profil_tamamlandi: parsed.profil_tamamlandi
      };
    });
    return { data, error: null };
  } catch (e: any) {
    return { data: [], error: e?.message || 'Liste alınamadı' };
  }
}

/** user_id -> e-posta eşlemesi (raporlarda kişi adı göstermek için). */
export async function getUserEmailMap(): Promise<Record<string, string>> {
  try {
    if (getDataProviderMode() === 'supabase') {
      const { data, error } = await getSupabaseClient()
        .from('bi_users')
        .select('firebase_uid, email');
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((row) => {
        map[row.firebase_uid] = row.email || row.firebase_uid;
      });
      return map;
    }
    const db = getFirebaseFirestore();
    const colRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(colRef);
    const map: Record<string, string> = {};
    snapshot.docs.forEach((d) => {
      const o = d.data();
      map[d.id] = (o.email as string) || d.id;
    });
    return map;
  } catch {
    return {};
  }
}

/** İlk giriş: kullanıcı kendi ad/soyad bilgisini kaydeder (bir kez) */
export async function completeUserProfile(
  uid: string,
  ad: string,
  soyad: string,
  email = ''
): Promise<{ error: string | null }> {
  const trimmedAd = ad.trim();
  const trimmedSoyad = soyad.trim();
  if (trimmedAd.length < 2 || trimmedSoyad.length < 2) {
    return { error: 'Ad ve soyad en az 2 karakter olmalıdır.' };
  }
  try {
    await ensureUserDoc(uid, email);
    if (getDataProviderMode() === 'supabase') {
      const sb = getSupabaseClient();
      const now = new Date().toISOString();
      const patch = {
        ad: trimmedAd,
        soyad: trimmedSoyad,
        profil_tamamlandi: true,
        updated_at: now
      };
      const { error: userErr } = await sb.from('bi_users').update(patch).eq('firebase_uid', uid);
      if (userErr) return { error: userErr.message };
      const { data: session } = await sb.auth.getSession();
      const authId = session.session?.user?.id;
      if (authId) {
        await sb.from('bi_profiles').update(patch).eq('id', authId);
      }
      return { error: null };
    }
    const db = getFirebaseFirestore();
    const ref = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return {
        error:
          'Kullanıcı kaydı oluşturulamadı. Firebase Console’da Firestore kurallarının güncel olduğundan emin olun.'
      };
    }
    await updateDoc(ref, {
      ad: trimmedAd,
      soyad: trimmedSoyad,
      profil_tamamlandi: true
    });
    return { error: null };
  } catch (e: any) {
    const code = e?.code || '';
    if (code === 'permission-denied') {
      return {
        error:
          'Firestore oturumu kurulamadı. Çıkış yapıp tekrar giriş yapın; sorun devam ederse sayfayı yenileyin.'
      };
    }
    return { error: e?.message || 'Profil kaydedilemedi' };
  }
}

/** Firestore users/{uid} profilini kaldır (yalnızca admin). Auth hesabı ayrıca Console’dan silinmelidir. */
export async function deleteUserProfile(uid: string): Promise<{ error: string | null }> {
  try {
    if (getDataProviderMode() === 'supabase') {
      const { error } = await getSupabaseClient().from('bi_users').delete().eq('firebase_uid', uid);
      return { error: error?.message || null };
    }
    const db = getFirebaseFirestore();
    const ref = doc(db, USERS_COLLECTION, uid);
    await deleteDoc(ref);
    return { error: null };
  } catch (e: any) {
    const code = e?.code || '';
    if (code === 'permission-denied') {
      return { error: 'Silme izni yok. Admin olarak giriş yaptığınızdan ve Firestore kurallarının güncel olduğundan emin olun.' };
    }
    return { error: e?.message || 'Profil silinemedi' };
  }
}

/** Kullanıcı rol ve birimlerini güncelle (sadece admin yetkisi ile) */
export async function updateUserProfile(uid: string, profile: { role: UserRole; birimler: string[] }): Promise<{ error: string | null }> {
  try {
    if (getDataProviderMode() === 'supabase') {
      const { error } = await getSupabaseClient()
        .from('bi_users')
        .update({
          role: profile.role,
          birimler: profile.birimler,
          updated_at: new Date().toISOString()
        })
        .eq('firebase_uid', uid);
      return { error: error?.message || null };
    }
    const db = getFirebaseFirestore();
    const ref = doc(db, USERS_COLLECTION, uid);
    await setDoc(ref, { role: profile.role, birimler: profile.birimler }, { merge: true });
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Güncellenemedi' };
  }
}
