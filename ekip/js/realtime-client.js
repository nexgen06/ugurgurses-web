// ===== GERÇEK ZAMANLI CLIENT - SUPABASE REALTIME =====
// Bu modül, Supabase Realtime kullanarak gerçek zamanlı güncellemeleri dinler

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

let supabaseClient = null;
let realtimeChannel = null;
let callbacks = {
  onInsert: null,
  onUpdate: null,
  onDelete: null
};

/**
 * Supabase client'ı başlat
 */
export function initRealtimeClient() {
  if (SUPABASE_URL === 'BURAYA_SUPABASE_URLINIZI_YAZIN' || !SUPABASE_URL) {
    console.warn('⚠️ Supabase URL yapılandırılmamış. Gerçek zamanlı güncellemeler devre dışı.');
    return false;
  }

  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase Realtime client başlatıldı');
    return true;
  } catch (error) {
    console.error('❌ Supabase client başlatılamadı:', error);
    return false;
  }
}

/**
 * Gerçek zamanlı güncellemeleri dinlemeye başla
 */
export function subscribeToChanges(callbacksConfig = {}) {
  if (!supabaseClient) {
    if (!initRealtimeClient()) {
      return null;
    }
  }

  // Callback'leri güncelle
  if (callbacksConfig.onInsert) callbacks.onInsert = callbacksConfig.onInsert;
  if (callbacksConfig.onUpdate) callbacks.onUpdate = callbacksConfig.onUpdate;
  if (callbacksConfig.onDelete) callbacks.onDelete = callbacksConfig.onDelete;

  // Mevcut subscription'ı kapat
  if (realtimeChannel) {
    supabaseClient.removeChannel(realtimeChannel);
  }

  // Yeni subscription oluştur
  realtimeChannel = supabaseClient
    .channel('hizmet-islemi-kayitlari-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'hizmet_islemi_kayitlari'
      },
      (payload) => {
        console.log('🆕 Yeni kayıt eklendi:', payload.new);
        if (callbacks.onInsert) {
          callbacks.onInsert(payload.new);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'hizmet_islemi_kayitlari'
      },
      (payload) => {
        console.log('🔄 Kayıt güncellendi:', payload.new);
        if (callbacks.onUpdate) {
          callbacks.onUpdate(payload.new, payload.old);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'hizmet_islemi_kayitlari'
      },
      (payload) => {
        console.log('🗑️ Kayıt silindi:', payload.old);
        if (callbacks.onDelete) {
          callbacks.onDelete(payload.old);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Gerçek zamanlı güncellemeler aktif');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime subscription hatası');
      }
    });

  return realtimeChannel;
}

/**
 * Gerçek zamanlı güncellemeleri durdur
 */
export function unsubscribeFromChanges() {
  if (realtimeChannel && supabaseClient) {
    supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
    console.log('⏹️ Gerçek zamanlı güncellemeler durduruldu');
  }
}

/**
 * Supabase client'ı döndür (gerekirse direkt kullanım için)
 */
export function getSupabaseClient() {
  if (!supabaseClient) {
    initRealtimeClient();
  }
  return supabaseClient;
}




