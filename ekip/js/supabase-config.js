// ===== SUPABASE CLIENT CONFIGURATION =====
// Bu dosya hem client-side hem de server-side kullanılabilir

// Eğer environment variable'lar varsa kullan (server-side)
// Yoksa window'dan al (client-side)
let SUPABASE_URL, SUPABASE_ANON_KEY;

if (typeof process !== 'undefined' && process.env) {
  // Node.js ortamı (server-side)
  SUPABASE_URL = process.env.SUPABASE_URL;
  SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
} else if (typeof window !== 'undefined') {
  // Browser ortamı (client-side)
  // API endpoint'inden al veya doğrudan kullan
  SUPABASE_URL = window.SUPABASE_URL || 'BURAYA_SUPABASE_URLINIZI_YAZIN';
  SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'BURAYA_SUPABASE_ANON_KEYINIZI_YAZIN';
}

// API base URL (sunucu endpoint'i)
// Production'da window.location.origin kullanılır, development'ta localhost
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Eğer window.API_BASE_URL tanımlıysa onu kullan
    if (window.API_BASE_URL) {
      return window.API_BASE_URL;
    }
    // Production'da otomatik olarak mevcut domain'i kullan
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.origin}/api`;
    }
    // Development için localhost
    return 'http://localhost:3000/api';
  }
  return '/api'; // Fallback
};

const API_BASE_URL = typeof window !== 'undefined' ? getApiBaseUrl() : '/api';

export { SUPABASE_URL, SUPABASE_ANON_KEY, API_BASE_URL };



