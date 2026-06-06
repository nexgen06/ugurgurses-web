// ===== SUPABASE HELPER FONKSİYONLAR =====
// PostgreSQL/JSONB formatına uygun Supabase entegrasyonu

import { FIELD_IDS } from './config.js';

// Ana alanlar (Supabase tablosunda direkt kolon olarak saklanacaklar)
const MAIN_FIELDS = [
  "islemKategorisi",
  "hizmetTuru",
  "islemTuru",
  "hareketTuru",
  "hareketTipi",
  "dayanak",
  "hareket",
  "baslangicTarihi",
  "bitisTarihi",
  "kararNo",
  "kararTarihi",
  "bildirimTarihi",
  "calismaSekli",
  "istihdamTipi",
  "istihdamSekli",
  "birim",
  "disKurum",
  "disBirim",
  "unvan",
  "brans",
  "aciklama",
  "dhy",
  "kadroDerecesi"
];

// Ekstra alanlar (JSONB kolonunda saklanacaklar)
const EXTRA_FIELDS = [
  "khaDer",
  "khaKad",
  "khaGost",
  "khaEkG",
  "emEsDer",
  "emEsKad",
  "emEsGost",
  "emEsEkG",
  "odEsDer",
  "odEsKad",
  "odEsGost",
  "odEsEkG"
];

/**
 * JavaScript camelCase'i PostgreSQL snake_case'e dönüştürür
 * @param {string} str - camelCase string
 * @returns {string} snake_case string
 */
function camelToSnake(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * PostgreSQL snake_case'i JavaScript camelCase'e dönüştürür
 * @param {string} str - snake_case string
 * @returns {string} camelCase string
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Form verilerini Supabase için uygun formata dönüştürür
 * Ana alanlar ayrı kolonlar, ekstra alanlar JSONB'de
 * @param {Object} formValues - Form'dan toplanan tüm değerler
 * @returns {Object} Supabase insert için hazırlanmış obje
 */
export function prepareForSupabase(formValues) {
  const mainData = {};
  const extraData = {};

  // Ana alanları snake_case'e çevir ve ayır
  MAIN_FIELDS.forEach(field => {
    if (formValues.hasOwnProperty(field)) {
      const snakeKey = camelToSnake(field);
      mainData[snakeKey] = formValues[field] || null;
    }
  });

  // Ekstra alanları JSONB için ayır (camelCase olarak kalır)
  EXTRA_FIELDS.forEach(field => {
    if (formValues.hasOwnProperty(field) && formValues[field]) {
      extraData[field] = formValues[field];
    }
  });

  return {
    ...mainData,
    ekstra_alanlar: Object.keys(extraData).length > 0 ? extraData : {}
  };
}

/**
 * Supabase'den gelen veriyi form için uygun formata dönüştürür
 * JSONB kolonundaki verileri ana objeye ekler
 * @param {Object} supabaseRow - Supabase'den dönen satır
 * @returns {Object} Form için hazırlanmış obje
 */
export function parseFromSupabase(supabaseRow) {
  const result = {};

  // Ana alanları camelCase'e çevir
  Object.keys(supabaseRow).forEach(key => {
    if (key !== 'id' && key !== 'created_at' && key !== 'ekstra_alanlar') {
      const camelKey = snakeToCamel(key);
      result[camelKey] = supabaseRow[key];
    }
  });

  // Özel alanlar
  if (supabaseRow.id) {
    result.id = supabaseRow.id;
  }
  if (supabaseRow.created_at) {
    result.createdAt = supabaseRow.created_at;
  }

  // JSONB kolonunu parse et ve ekstra alanları ekle
  if (supabaseRow.ekstra_alanlar) {
    Object.assign(result, supabaseRow.ekstra_alanlar);
  }

  return result;
}

/**
 * Supabase client ile kayıt ekleme
 * @param {Object} supabaseClient - Supabase client instance
 * @param {Object} formValues - Form'dan toplanan değerler
 * @returns {Promise<Object>} Supabase response
 */
export async function insertRecord(supabaseClient, formValues) {
  const data = prepareForSupabase(formValues);
  
  const { data: result, error } = await supabaseClient
    .from('hizmet_islemi_kayitlari')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Supabase insert hatası:', error);
    throw error;
  }

  return parseFromSupabase(result);
}

/**
 * Supabase client ile kayıt güncelleme
 * @param {Object} supabaseClient - Supabase client instance
 * @param {number|string} id - Güncellenecek kayıt ID'si
 * @param {Object} formValues - Form'dan toplanan değerler
 * @returns {Promise<Object>} Supabase response
 */
export async function updateRecord(supabaseClient, id, formValues) {
  const data = prepareForSupabase(formValues);
  
  const { data: result, error } = await supabaseClient
    .from('hizmet_islemi_kayitlari')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase update hatası:', error);
    throw error;
  }

  return parseFromSupabase(result);
}

/**
 * Supabase client ile kayıt silme
 * @param {Object} supabaseClient - Supabase client instance
 * @param {number|string} id - Silinecek kayıt ID'si
 * @returns {Promise<Object>} Supabase response
 */
export async function deleteRecord(supabaseClient, id) {
  const { error } = await supabaseClient
    .from('hizmet_islemi_kayitlari')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase delete hatası:', error);
    throw error;
  }

  return { success: true };
}

/**
 * Supabase client ile tüm kayıtları getirme
 * @param {Object} supabaseClient - Supabase client instance
 * @param {Object} options - Sorgulama seçenekleri (limit, order, filter)
 * @returns {Promise<Array>} Kayıt listesi
 */
export async function getAllRecords(supabaseClient, options = {}) {
  let query = supabaseClient
    .from('hizmet_islemi_kayitlari')
    .select('*');

  // Sıralama
  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending !== false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  // Limit
  if (options.limit) {
    query = query.limit(options.limit);
  }

  // Filtreleme
  if (options.filters) {
    options.filters.forEach(filter => {
      query = query.eq(filter.column, filter.value);
    });
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase select hatası:', error);
    throw error;
  }

  return data.map(row => parseFromSupabase(row));
}

/**
 * Supabase client ile tek kayıt getirme
 * @param {Object} supabaseClient - Supabase client instance
 * @param {number|string} id - Kayıt ID'si
 * @returns {Promise<Object>} Kayıt
 */
export async function getRecordById(supabaseClient, id) {
  const { data, error } = await supabaseClient
    .from('hizmet_islemi_kayitlari')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Supabase select hatası:', error);
    throw error;
  }

  return parseFromSupabase(data);
}

/**
 * JSONB içinde arama yapma
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} field - JSONB içindeki alan adı (örn: 'khaDer')
 * @param {string} value - Aranacak değer
 * @returns {Promise<Array>} Bulunan kayıtlar
 */
export async function searchInJsonb(supabaseClient, field, value) {
  const { data, error } = await supabaseClient
    .from('hizmet_islemi_kayitlari')
    .select('*')
    .eq(`ekstra_alanlar->>${field}`, value);

  if (error) {
    console.error('Supabase JSONB search hatası:', error);
    throw error;
  }

  return data.map(row => parseFromSupabase(row));
}

// Export edilen sabitler
export { MAIN_FIELDS, EXTRA_FIELDS };






