/**
 * Supabase veri katmanı — db.collection() arayüzü ile uyumlu.
 */

import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase';
import { pickEnv } from './lib/vite-env';
import { DATA_CHANGE_EVENT } from './lib/data-events';
import { waitForFirestoreAuth } from './lib/firestore-auth-gate';

const TABLE_BY_COLLECTION: Record<string, string> = {
  islem_kayitlari: 'bi_islem_kayitlari',
  kesinlesen_gunler: 'bi_kesinlesen_gunler',
  gun_onaylari: 'bi_gun_onaylari',
  kilit_acma_talepleri: 'bi_kilit_acma_talepleri',
  personel_izinleri: 'bi_personel_izinleri',
  ay_birim_onaylari: 'bi_ay_birim_onaylari',
  ay_kapanislari: 'bi_ay_kapanislari',
  audit_log: 'bi_audit_log'
};

const JSONB_MERGE_TABLES = new Set([
  'bi_kesinlesen_gunler',
  'bi_gun_onaylari',
  'bi_kilit_acma_talepleri',
  'bi_personel_izinleri',
  'bi_ay_birim_onaylari',
  'bi_ay_kapanislari',
  'bi_audit_log'
]);

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DATA_CHANGE_EVENT));
  }
}

function rowToDoc(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const data = row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {};
  const merged = { ...data, ...row };
  delete merged.data;
  merged.id = row.id ?? merged.id;
  merged._id = merged.id;
  if (table === 'bi_ay_kapanislari' && row.yyyy_mm) {
    merged.id = row.yyyy_mm;
    merged._id = row.yyyy_mm;
  }
  return merged;
}

class SupabaseCollectionAdapter {
  private table: string;

  constructor(collectionName: string) {
    const table = TABLE_BY_COLLECTION[collectionName];
    if (!table) throw new Error(`Supabase tablosu tanımsız: ${collectionName}`);
    this.table = table;
  }

  async find(queryFilter: Record<string, unknown> = {}): Promise<{ data: unknown[]; error: string | null }> {
    try {
      const authed = await waitForFirestoreAuth();
      if (!authed) return { data: [], error: 'Oturum hazır değil' };

      const sb = getSupabaseClient();
      let q = sb.from(this.table).select('*');

      if (queryFilter.durum && typeof queryFilter.durum === 'string' && this.table === 'bi_kilit_acma_talepleri') {
        q = q.eq('durum', queryFilter.durum);
      }
      if (queryFilter.yyyy_mm && typeof queryFilter.yyyy_mm === 'string' && this.table === 'bi_ay_birim_onaylari') {
        q = q.eq('yyyy_mm', queryFilter.yyyy_mm);
      }

      const kayitTarihi = queryFilter.kayit_tarihi;
      const exactDate = kayitTarihi && typeof kayitTarihi === 'string';
      const hasDateRange =
        kayitTarihi && typeof kayitTarihi === 'object' && (kayitTarihi as { $gte?: string }).$gte;

      if (exactDate) {
        q = q.eq('kayit_tarihi', kayitTarihi as string);
      } else if (hasDateRange) {
        const range = kayitTarihi as { $gte?: string; $lte?: string };
        if (range.$gte) q = q.gte('kayit_tarihi', range.$gte);
        if (range.$lte) q = q.lte('kayit_tarihi', range.$lte);
      }

      if (this.table === 'bi_islem_kayitlari') {
        q = q.order('kayit_tarihi', { ascending: false }).limit(500);
      } else if (this.table === 'bi_audit_log') {
        q = q.order('at', { ascending: false }).limit(500);
      } else if (this.table === 'bi_personel_izinleri') {
        q = q.order('baslangic', { ascending: false }).limit(800);
      } else {
        q = q.limit(500);
      }

      const { data, error } = await q;
      if (error) throw error;

      let rows = (data || []).map((row) => rowToDoc(this.table, row as Record<string, unknown>));

      if (queryFilter.islem_turu && typeof queryFilter.islem_turu === 'string') {
        const lower = queryFilter.islem_turu.toLowerCase();
        rows = rows.filter((item) =>
          String((item as Record<string, unknown>).islem_turu || '')
            .toLowerCase()
            .includes(lower)
        );
      }
      if (queryFilter.birim && typeof queryFilter.birim === 'string' && queryFilter.birim.trim()) {
        const birim = queryFilter.birim.trim();
        rows = rows.filter(
          (item) => String((item as Record<string, unknown>).birim || '').trim() === birim
        );
      }

      return { data: rows, error: null };
    } catch (e: unknown) {
      console.error('Supabase find error:', e);
      return { data: [], error: e instanceof Error ? e.message : 'Supabase okuma hatası' };
    }
  }

  async getById(id: string): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
    try {
      const authed = await waitForFirestoreAuth();
      if (!authed) return { data: null, error: 'Oturum hazır değil' };
      const sb = getSupabaseClient();
      const { data, error } =
        this.table === 'bi_ay_kapanislari'
          ? await sb.from(this.table).select('*').eq('yyyy_mm', id).maybeSingle()
          : await sb.from(this.table).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return { data: null, error: null };
      return { data: rowToDoc(this.table, data as Record<string, unknown>), error: null };
    } catch (e: unknown) {
      return { data: null, error: e instanceof Error ? e.message : 'Supabase okuma hatası' };
    }
  }

  async mergeSetById(id: string, partial: Record<string, unknown>): Promise<{ data: unknown; error: string | null }> {
    const existing = await this.getById(id);
    if (existing.error) return { data: null, error: existing.error };
    const merged = { ...(existing.data || {}), ...partial };
    return this.setById(id, merged);
  }

  async insertOne(document: Record<string, unknown>): Promise<{ data: unknown; error: string | null }> {
    try {
      const authed = await waitForFirestoreAuth();
      if (!authed) return { data: null, error: 'Oturum hazır değil' };
      if (
        this.table === 'bi_islem_kayitlari' &&
        document.kayit_tarihi != null &&
        String(document.kayit_tarihi) < '2026-01-01'
      ) {
        return { data: null, error: 'Kayıt tarihi 1 Ocak 2026 veya sonrası olmalıdır.' };
      }
      const sb = getSupabaseClient();
      const now = new Date().toISOString();
      const newId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `bi_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const row = this.docToRow(newId, { ...document, created_at: document.created_at || now });
      const { data, error } = await sb.from(this.table).insert(row).select().single();
      if (error) throw error;
      notifyChange();
      const doc = rowToDoc(this.table, data as Record<string, unknown>);
      return { data: { ...doc, insertedId: doc.id }, error: null };
    } catch (e: unknown) {
      console.error('Supabase insertOne error:', e);
      return { data: null, error: e instanceof Error ? e.message : 'Supabase yazma hatası' };
    }
  }

  async deleteOne(filter: { _id?: string; id?: string }): Promise<{ success: boolean; error?: string }> {
    try {
      const id = filter.id || filter._id;
      if (!id) return { success: false, error: 'id gerekli' };
      return this.deleteById(String(id));
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Supabase silme hatası' };
    }
  }

  async deleteById(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const authed = await waitForFirestoreAuth();
      if (!authed) return { success: false, error: 'Oturum hazır değil' };
      const sb = getSupabaseClient();
      const { error } =
        this.table === 'bi_ay_kapanislari'
          ? await sb.from(this.table).delete().eq('yyyy_mm', String(id))
          : await sb.from(this.table).delete().eq('id', String(id));
      if (error) throw error;
      notifyChange();
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Supabase silme hatası' };
    }
  }

  async deleteMany(filter: {
    kayit_tarihi: string;
    birim: string;
    user_id?: string;
  }): Promise<{ deletedCount: number; error: string | null }> {
    try {
      const sb = getSupabaseClient();
      let q = sb
        .from(this.table)
        .select('id, user_id')
        .eq('kayit_tarihi', filter.kayit_tarihi)
        .eq('birim', filter.birim);
      const { data, error } = await q;
      if (error) throw error;
      const ids = (data || [])
        .filter((row) => !filter.user_id || row.user_id === filter.user_id)
        .map((row) => row.id);
      if (!ids.length) return { deletedCount: 0, error: null };
      const { error: delErr } = await sb.from(this.table).delete().in('id', ids);
      if (delErr) throw delErr;
      notifyChange();
      return { deletedCount: ids.length, error: null };
    } catch (e: unknown) {
      return { deletedCount: 0, error: e instanceof Error ? e.message : 'Supabase silme hatası' };
    }
  }

  async setById(id: string, document: Record<string, unknown>): Promise<{ data: unknown; error: string | null }> {
    try {
      const authed = await waitForFirestoreAuth();
      if (!authed) return { data: null, error: 'Oturum hazır değil' };
      const sb = getSupabaseClient();
      const row = this.docToRow(id, { ...document, created_at: document.created_at || new Date().toISOString() });
      const onConflict = this.table === 'bi_ay_kapanislari' ? 'yyyy_mm' : 'id';
      const { data, error } = await sb.from(this.table).upsert(row, { onConflict }).select().single();
      if (error) throw error;
      notifyChange();
      return { data: rowToDoc(this.table, data as Record<string, unknown>), error: null };
    } catch (e: unknown) {
      return { data: null, error: e instanceof Error ? e.message : 'Supabase yazma hatası' };
    }
  }

  async existsById(id: string): Promise<boolean> {
    try {
      const sb = getSupabaseClient();
      const { data, error } =
        this.table === 'bi_ay_kapanislari'
          ? await sb.from(this.table).select('yyyy_mm').eq('yyyy_mm', id).maybeSingle()
          : await sb.from(this.table).select('id').eq('id', id).maybeSingle();
      if (error) throw error;
      return Boolean(data);
    } catch {
      return false;
    }
  }

  async deleteAll(): Promise<{ deletedCount: number; error: string | null }> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb.from(this.table).select('id');
      if (error) throw error;
      const ids = (data || []).map((r) => r.id);
      if (!ids.length) return { deletedCount: 0, error: null };
      const { error: delErr } = await sb.from(this.table).delete().in('id', ids);
      if (delErr) throw delErr;
      notifyChange();
      return { deletedCount: ids.length, error: null };
    } catch (e: unknown) {
      return { deletedCount: 0, error: e instanceof Error ? e.message : 'Supabase silme hatası' };
    }
  }

  private docToRow(id: string | null, document: Record<string, unknown>): Record<string, unknown> {
    if (this.table === 'bi_islem_kayitlari') {
      return {
        ...(id ? { id } : {}),
        birim: document.birim,
        kayit_tarihi: document.kayit_tarihi,
        user_id: document.user_id,
        islem_turu: document.islem_turu,
        islem_sayisi: document.islem_sayisi,
        kategori_kaynak: document.kategori_kaynak ?? null,
        created_at: document.created_at ?? null,
        updated_at: document.updated_at ?? new Date().toISOString(),
        legacy_firestore_id: id || document.id || null
      };
    }

    if (this.table === 'bi_ay_kapanislari') {
      const yyyyMm = String(document.ay || document.yyyy_mm || id || '');
      return {
        yyyy_mm: yyyyMm,
        data: { ...document },
        legacy_firestore_id: yyyyMm || null
      };
    }

    const rowId = id || String(document.id || '');
    const core: Record<string, unknown> = { id: rowId, data: { ...document } };
    if (document.kayit_tarihi) core.kayit_tarihi = document.kayit_tarihi;
    if (document.birim) core.birim = document.birim;
    if (document.durum) core.durum = document.durum;
    if (document.baslangic) core.baslangic = document.baslangic;
    if (document.yyyy_mm) core.yyyy_mm = document.yyyy_mm;
    if (document.ay && this.table === 'bi_ay_birim_onaylari') core.yyyy_mm = document.ay;
    if (document.at) core.at = document.at;
    if (document.actor_uid) core.actor_uid = document.actor_uid;
    if (document.action) core.action = document.action;
    core.legacy_firestore_id = rowId;
    return core;
  }
}

class SupabaseClient {
  collection(name: string) {
    return new SupabaseCollectionAdapter(name);
  }
}

export const supabaseDb = new SupabaseClient();

export function isSupabaseDataConfigured(): boolean {
  return pickEnv('VITE_DATA_PROVIDER', 'firebase') === 'supabase' && isSupabaseConfigured();
}
