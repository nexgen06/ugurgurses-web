// ===== API CLIENT - SUNUCU İLE İLETİŞİM =====
// Bu modül, sunucu API endpoint'leri ile iletişim kurar

import { API_BASE_URL } from './supabase-config.js';

/**
 * API isteği yapar
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('API isteği hatası:', error);
    throw error;
  }
}

/**
 * Tüm kayıtları getir
 */
export async function getAllRecords(options = {}) {
  const { limit = 100, orderBy = 'created_at', ascending = false } = options;
  const params = new URLSearchParams({
    limit: limit.toString(),
    orderBy,
    ascending: ascending.toString()
  });

  const data = await apiRequest(`/kayitlar?${params}`);
  return data.data || [];
}

/**
 * Tek kayıt getir
 */
export async function getRecordById(id) {
  const data = await apiRequest(`/kayitlar/${id}`);
  return data.data;
}

/**
 * Yeni kayıt ekle
 */
export async function createRecord(formValues) {
  const data = await apiRequest('/kayitlar', {
    method: 'POST',
    body: JSON.stringify(formValues)
  });
  return data.data;
}

/**
 * Kayıt güncelle
 */
export async function updateRecord(id, formValues) {
  const data = await apiRequest(`/kayitlar/${id}`, {
    method: 'PUT',
    body: JSON.stringify(formValues)
  });
  return data.data;
}

/**
 * Kayıt sil
 */
export async function deleteRecord(id) {
  const data = await apiRequest(`/kayitlar/${id}`, {
    method: 'DELETE'
  });
  return data;
}

/**
 * Tüm kayıtları sil
 */
export async function deleteAllRecords() {
  const data = await apiRequest('/kayitlar', {
    method: 'DELETE'
  });
  return data;
}

/**
 * Arama yap
 */
export async function searchRecords(query) {
  const data = await apiRequest(`/kayitlar/arama/${encodeURIComponent(query)}`);
  return data.data || [];
}




