/**
 * Eksik veya hatalı `birim` alanlarını düzeltir (yalnızca admin).
 * Birim izolasyon kurallarından sonra eski kayıtların görünmesi için.
 */

import { getFirebaseFirestore } from './firebase';
import {
  collection,
  doc,
  getDocs,
  query,
  limit,
  updateDoc,
  orderBy,
  startAfter,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import type { UserProfile } from './users-service';

const COLLECTION = 'islem_kayitlari';
const BATCH = 400;
const MAX_ROUNDS = 200;

export interface BirimBackfillSummary {
  scanned: number;
  fixed: number;
  trimmed: number;
  inferred: number;
  skipped: number;
  error: string | null;
}

function resolveBirim(
  raw: unknown,
  userId: string | undefined,
  userBirimMap: Map<string, string[]>,
  allBirimler: string[]
): string | null {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (trimmed) {
    const exact = allBirimler.find((b) => b === trimmed);
    if (exact) return exact;
    const ci = allBirimler.find((b) => b.toLowerCase() === trimmed.toLowerCase());
    if (ci) return ci;
    return trimmed;
  }
  if (userId) {
    const fromUser = userBirimMap.get(userId)?.find((b) => allBirimler.includes(b));
    if (fromUser) return fromUser;
  }
  return allBirimler[0] || null;
}

export async function backfillIslemKayitlariBirim(
  allBirimler: string[],
  profiles: UserProfile[]
): Promise<BirimBackfillSummary> {
  const summary: BirimBackfillSummary = {
    scanned: 0,
    fixed: 0,
    trimmed: 0,
    inferred: 0,
    skipped: 0,
    error: null
  };

  if (!allBirimler.length) {
    summary.error = 'Tanımlı birim yok.';
    return summary;
  }

  const userBirimMap = new Map<string, string[]>();
  profiles.forEach((p) => userBirimMap.set(p.uid, p.birimler || []));

  try {
    const db = getFirebaseFirestore();
    const colRef = collection(db, COLLECTION);
    let cursor: QueryDocumentSnapshot | null = null;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const q = cursor
        ? query(colRef, orderBy('kayit_tarihi', 'desc'), startAfter(cursor), limit(BATCH))
        : query(colRef, orderBy('kayit_tarihi', 'desc'), limit(BATCH));
      const snap = await getDocs(q);
      if (snap.empty) break;
      cursor = snap.docs[snap.docs.length - 1];

      for (const d of snap.docs) {
        summary.scanned++;
        const data = d.data() as Record<string, unknown>;
        const userId = typeof data.user_id === 'string' ? data.user_id : undefined;
        const raw = data.birim;
        const trimmed = typeof raw === 'string' ? raw.trim() : '';
        const target = resolveBirim(raw, userId, userBirimMap, allBirimler);

        if (!target) {
          summary.skipped++;
          continue;
        }

        const needsUpdate = typeof raw !== 'string' || raw !== target;
        if (!needsUpdate) {
          summary.skipped++;
          continue;
        }

        await updateDoc(doc(db, COLLECTION, d.id), { birim: target });
        summary.fixed++;
        if (trimmed) summary.trimmed++;
        else summary.inferred++;
      }

      if (snap.docs.length < BATCH) break;
    }

    if (summary.fixed > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('firestore_data_change'));
    }
  } catch (e: unknown) {
    summary.error = e instanceof Error ? e.message : 'Birim düzeltme başarısız';
  }

  return summary;
}
