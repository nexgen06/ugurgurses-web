// ===== SQL 32 KOLON SORUNU ÇÖZÜMÜ - HELPER FONKSİYONLAR =====
// Bu modül, form verilerini SQL Server'a kaydetmek için JSON formatına dönüştürür

import { FIELD_IDS } from './config.js';

// Ana alanlar (SQL tablosunda direkt kolon olarak saklanacaklar)
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

// Ekstra alanlar (JSON kolonunda saklanacaklar - 32 kolon sınırını aşmak için)
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
 * Form verilerini SQL Server için uygun formata dönüştürür
 * Ana alanlar ayrı kolonlar, ekstra alanlar JSON'da
 * @param {Object} formValues - Form'dan toplanan tüm değerler
 * @returns {Object} SQL insert için hazırlanmış obje
 */
export function prepareForSQL(formValues) {
  const mainData = {};
  const extraData = {};

  // Ana alanları ayır
  MAIN_FIELDS.forEach(field => {
    if (formValues.hasOwnProperty(field)) {
      mainData[field] = formValues[field] || null;
    }
  });

  // Ekstra alanları JSON için ayır
  EXTRA_FIELDS.forEach(field => {
    if (formValues.hasOwnProperty(field) && formValues[field]) {
      extraData[field] = formValues[field];
    }
  });

  return {
    ...mainData,
    ekstraAlanlar: Object.keys(extraData).length > 0 
      ? JSON.stringify(extraData) 
      : null
  };
}

/**
 * SQL'den gelen veriyi form için uygun formata dönüştürür
 * JSON kolonundaki verileri ana objeye ekler
 * @param {Object} sqlRow - SQL'den dönen satır
 * @returns {Object} Form için hazırlanmış obje
 */
export function parseFromSQL(sqlRow) {
  const result = { ...sqlRow };

  // JSON kolonunu parse et ve ekstra alanları ekle
  if (sqlRow.ekstraAlanlar) {
    try {
      const extraData = JSON.parse(sqlRow.ekstraAlanlar);
      Object.assign(result, extraData);
    } catch (e) {
      console.warn('JSON parse hatası:', e);
    }
  }

  // ekstraAlanlar kolonunu kaldır (artık gerekli değil)
  delete result.ekstraAlanlar;

  return result;
}

/**
 * SQL INSERT sorgusu oluşturur
 * @param {Object} data - prepareForSQL() ile hazırlanmış veri
 * @returns {string} SQL INSERT sorgusu
 */
export function generateInsertSQL(data) {
  const columns = Object.keys(data).filter(k => data[k] !== null && data[k] !== undefined);
  const values = columns.map(col => {
    const val = data[col];
    if (col === 'ekstraAlanlar') {
      return `'${val.replace(/'/g, "''")}'`; // SQL injection koruması
    }
    if (typeof val === 'string') {
      return `'${val.replace(/'/g, "''")}'`;
    }
    return val;
  });

  return `INSERT INTO HizmetIslemiKayitlari (${columns.join(', ')}) VALUES (${values.join(', ')})`;
}

/**
 * SQL UPDATE sorgusu oluşturur
 * @param {Object} data - prepareForSQL() ile hazırlanmış veri
 * @param {number|string} id - Güncellenecek kayıt ID'si
 * @returns {string} SQL UPDATE sorgusu
 */
export function generateUpdateSQL(data, id) {
  const updates = Object.keys(data)
    .filter(k => data[k] !== null && data[k] !== undefined)
    .map(col => {
      const val = data[col];
      if (col === 'ekstraAlanlar') {
        return `${col} = '${val.replace(/'/g, "''")}'`;
      }
      if (typeof val === 'string') {
        return `${col} = '${val.replace(/'/g, "''")}'`;
      }
      return `${col} = ${val}`;
    });

  return `UPDATE HizmetIslemiKayitlari SET ${updates.join(', ')} WHERE Id = ${id}`;
}

/**
 * Tüm alanları içeren SELECT sorgusu oluşturur
 * JSON kolonundan ekstra alanları da çıkarır
 * @returns {string} SQL SELECT sorgusu
 */
export function generateSelectSQL() {
  return `
    SELECT 
      Id,
      CreatedAt,
      ${MAIN_FIELDS.map(f => `[${f}]`).join(',\n      ')},
      JSON_VALUE(EkstraAlanlar, '$.khaDer') AS khaDer,
      JSON_VALUE(EkstraAlanlar, '$.khaKad') AS khaKad,
      JSON_VALUE(EkstraAlanlar, '$.khaGost') AS khaGost,
      JSON_VALUE(EkstraAlanlar, '$.khaEkG') AS khaEkG,
      JSON_VALUE(EkstraAlanlar, '$.emEsDer') AS emEsDer,
      JSON_VALUE(EkstraAlanlar, '$.emEsKad') AS emEsKad,
      JSON_VALUE(EkstraAlanlar, '$.emEsGost') AS emEsGost,
      JSON_VALUE(EkstraAlanlar, '$.emEsEkG') AS emEsEkG,
      JSON_VALUE(EkstraAlanlar, '$.odEsDer') AS odEsDer,
      JSON_VALUE(EkstraAlanlar, '$.odEsKad') AS odEsKad,
      JSON_VALUE(EkstraAlanlar, '$.odEsGost') AS odEsGost,
      JSON_VALUE(EkstraAlanlar, '$.odEsEkG') AS odEsEkG
    FROM HizmetIslemiKayitlari
    ORDER BY CreatedAt DESC
  `;
}

// Export edilen sabitler
export { MAIN_FIELDS, EXTRA_FIELDS };






