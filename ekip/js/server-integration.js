// ===== SUNUCU ENTEGRASYONU =====
// Bu modül, mevcut kod ile sunucu API'sini entegre eder

import { createRecord, updateRecord, deleteRecord, getAllRecords } from './api-client.js';
import { subscribeToChanges, unsubscribeFromChanges } from './realtime-client.js';
import { collectFormValues } from './form-handler.js';

// Global değişkenler (mevcut kodla uyumluluk için)
window.serverIntegration = {
  enabled: false,
  records: []
};

/**
 * Sunucu entegrasyonunu başlat
 */
export function initServerIntegration() {
  // API base URL'i ayarla
  if (typeof window !== 'undefined') {
    // Eğer window.API_BASE_URL tanımlı değilse otomatik belirle
    if (!window.API_BASE_URL) {
      // Production'da otomatik olarak mevcut domain'i kullan
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        window.API_BASE_URL = `${window.location.origin}/api`;
      } else {
        // Development için localhost
        window.API_BASE_URL = 'http://localhost:3000/api';
      }
    }
  }

  window.serverIntegration.enabled = true;
  console.log('✅ Sunucu entegrasyonu aktif');

  // Gerçek zamanlı güncellemeleri başlat
  subscribeToChanges({
    onInsert: (newRecord) => {
      console.log('🆕 Yeni kayıt (realtime):', newRecord);
      if (window.onRecordInserted) {
        window.onRecordInserted(newRecord);
      }
    },
    onUpdate: (newRecord, oldRecord) => {
      console.log('🔄 Kayıt güncellendi (realtime):', newRecord);
      if (window.onRecordUpdated) {
        window.onRecordUpdated(newRecord, oldRecord);
      }
    },
    onDelete: (oldRecord) => {
      console.log('🗑️ Kayıt silindi (realtime):', oldRecord);
      if (window.onRecordDeleted) {
        window.onRecordDeleted(oldRecord);
      }
    }
  });
}

/**
 * Mevcut saveRecord fonksiyonunu override et
 */
export function overrideSaveRecord(originalSaveRecord) {
  return async function saveRecord(values) {
    if (!window.serverIntegration.enabled) {
      // Eski davranış (localStorage)
      return originalSaveRecord(values);
    }

    try {
      const result = await createRecord(values);
      console.log('✅ Kayıt sunucuya eklendi:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Sunucuya kayıt eklenirken hata:', error);
      // Hata durumunda eski davranışa düş
      return originalSaveRecord(values);
    }
  };
}

/**
 * Mevcut updateRecord fonksiyonunu override et
 */
export function overrideUpdateRecord(originalUpdateRecord) {
  return async function updateRecordById(id, values) {
    if (!window.serverIntegration.enabled) {
      return originalUpdateRecord(id, values);
    }

    try {
      const result = await updateRecord(id, values);
      console.log('✅ Kayıt sunucuda güncellendi:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Sunucuda kayıt güncellenirken hata:', error);
      return originalUpdateRecord(id, values);
    }
  };
}

/**
 * Mevcut deleteRecord fonksiyonunu override et
 */
export function overrideDeleteRecord(originalDeleteRecord) {
  return async function deleteRecordById(id) {
    if (!window.serverIntegration.enabled) {
      return originalDeleteRecord(id);
    }

    try {
      await deleteRecord(id);
      console.log('✅ Kayıt sunucudan silindi:', id);
      return { success: true };
    } catch (error) {
      console.error('❌ Sunucudan kayıt silinirken hata:', error);
      return originalDeleteRecord(id);
    }
  };
}

/**
 * Mevcut loadStoredRecords fonksiyonunu override et
 */
export function overrideLoadRecords(originalLoadRecords) {
  return async function loadStoredRecords() {
    if (!window.serverIntegration.enabled) {
      return originalLoadRecords();
    }

    try {
      const records = await getAllRecords({ limit: 1000, orderBy: 'created_at', ascending: false });
      
      // Mevcut format'a dönüştür
      const formattedRecords = records.map((row) => ({
        id: row.id,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
        values: {
          ...row,
          ...(row.ekstra_alanlar || {})
        }
      }));

      window.serverIntegration.records = formattedRecords;
      return formattedRecords;
    } catch (error) {
      console.error('❌ Sunucudan kayıtlar yüklenirken hata:', error);
      // Hata durumunda eski davranışa düş
      return originalLoadRecords();
    }
  };
}

/**
 * Sayfa yüklendiğinde otomatik entegrasyon
 */
if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Sunucu entegrasyonunu başlat
    initServerIntegration();
  });
} else if (typeof window !== 'undefined') {
  // Sayfa zaten yüklü
  initServerIntegration();
}



