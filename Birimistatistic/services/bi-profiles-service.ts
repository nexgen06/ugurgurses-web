/**
 * Supabase bi_profiles — Birim İstatistik rol/birim + Firebase UID eşlemesi.
 */

import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import type { UserRole } from '../types';
import type { UserProfileRoleFields } from './users-service';

const VALID_ROLES: UserRole[] = ['admin', 'proje_yetkilisi', 'editor', 'viewer'];

function parseRole(value: unknown): UserRole {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return VALID_ROLES.includes(raw as UserRole) ? (raw as UserRole) : 'viewer';
}

export interface BiProfileRow {
  id: string;
  email: string | null;
  legacy_firebase_uid: string | null;
  role: UserRole;
  birimler: string[];
  ad?: string;
  soyad?: string;
  profil_tamamlandi?: boolean;
}

function parseRow(row: Record<string, unknown> | null): BiProfileRow | null {
  if (!row || typeof row.id !== 'string') return null;
  const birimler = Array.isArray(row.birimler)
    ? row.birimler.filter((b): b is string => typeof b === 'string')
    : [];
  return {
    id: row.id,
    email: typeof row.email === 'string' ? row.email : null,
    legacy_firebase_uid: typeof row.legacy_firebase_uid === 'string' ? row.legacy_firebase_uid : null,
    role: parseRole(row.role),
    birimler,
    ad: typeof row.ad === 'string' ? row.ad : undefined,
    soyad: typeof row.soyad === 'string' ? row.soyad : undefined,
    profil_tamamlandi: row.profil_tamamlandi === true
  };
}

export async function fetchBiProfile(authUserId: string): Promise<BiProfileRow | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('bi_profiles')
      .select('id, email, legacy_firebase_uid, role, birimler, ad, soyad, profil_tamamlandi')
      .eq('id', authUserId)
      .maybeSingle();
    if (error) {
      console.warn('fetchBiProfile:', error.message);
      return null;
    }
    return parseRow(data as Record<string, unknown> | null);
  } catch (e) {
    console.warn('fetchBiProfile:', e);
    return null;
  }
}

export async function ensureBiProfile(authUserId: string, email: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const existing = await fetchBiProfile(authUserId);
  if (existing) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('bi_profiles').insert({
    id: authUserId,
    email: email || null,
    role: 'viewer',
    birimler: []
  });
  if (error) console.warn('ensureBiProfile:', error.message);
}

export function biProfileToRoleFields(row: BiProfileRow | null): UserProfileRoleFields | null {
  if (!row) return null;
  return {
    role: row.role,
    birimler: row.birimler,
    ad: row.ad,
    soyad: row.soyad,
    profil_tamamlandi: row.profil_tamamlandi
  };
}

/** Firestore users/{uid} ile birleşik profil; bi_profiles tamamlanmışsa modal atlanır. */
export function mergeProfileFields(
  bi: UserProfileRoleFields | null,
  firestore: UserProfileRoleFields
): UserProfileRoleFields {
  if (bi?.profil_tamamlandi === true) {
    const hasFirestoreRole = firestore.role !== 'viewer' || firestore.birimler.length > 0;
    return {
      role: hasFirestoreRole ? firestore.role : bi.role,
      birimler:
        hasFirestoreRole && firestore.birimler.length > 0 ? firestore.birimler : bi.birimler,
      ad: bi.ad || firestore.ad,
      soyad: bi.soyad || firestore.soyad,
      profil_tamamlandi: true
    };
  }

  const hasFirestoreRole = firestore.role !== 'viewer' || firestore.birimler.length > 0;
  if (!bi) return firestore;
  if (hasFirestoreRole) {
    return {
      ...firestore,
      ad: firestore.ad || bi.ad,
      soyad: firestore.soyad || bi.soyad,
      profil_tamamlandi: firestore.profil_tamamlandi || bi.profil_tamamlandi
    };
  }
  return {
    role: bi.role,
    birimler: bi.birimler.length > 0 ? bi.birimler : firestore.birimler,
    ad: bi.ad || firestore.ad,
    soyad: bi.soyad || firestore.soyad,
    profil_tamamlandi: bi.profil_tamamlandi || firestore.profil_tamamlandi
  };
}
