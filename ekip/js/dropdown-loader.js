// ===== DROPDOWN VERİ YÜKLEYİCİ =====
// Web sitesinden dropdown verilerini hızlıca yükler

/**
 * Web sitesinden dropdown verilerini yükler
 * @param {string} url - Web sitesi URL'i (örn: https://ekip.saglik.gov.tr/Registry/EmployeeServices/Index)
 * @param {Object} options - Yükleme seçenekleri
 * @returns {Promise<Object>} Dropdown verileri
 */
export async function loadDropdownsFromWeb(url, options = {}) {
  const {
    format = 'json', // 'json', 'html', 'csv'
    selector = null, // HTML için CSS selector
    fieldMapping = null, // Alan eşleştirmesi
    cache = true, // Cache kullan
    cacheKey = `dropdowns_${url}`,
    timeout = 10000 // 10 saniye timeout
  } = options;

  // Cache kontrolü
  if (cache) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const cacheTime = parsed.timestamp || 0;
      const cacheExpiry = options.cacheExpiry || 3600000; // 1 saat varsayılan
      
      if (Date.now() - cacheTime < cacheExpiry) {
        console.log('✅ Dropdown verileri cache\'den yüklendi');
        return parsed.data;
      }
    }
  }

  try {
    console.log(`📥 Dropdown verileri yükleniyor: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': format === 'json' ? 'application/json' : 'text/html',
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let data;

    if (format === 'json') {
      data = await response.json();
    } else if (format === 'html') {
      const html = await response.text();
      data = parseHTMLDropdowns(html, selector);
    } else if (format === 'csv') {
      const csv = await response.text();
      data = parseCSVDropdowns(csv);
    } else {
      throw new Error(`Desteklenmeyen format: ${format}`);
    }

    // Alan eşleştirmesi varsa uygula
    if (fieldMapping && typeof fieldMapping === 'object') {
      data = mapFields(data, fieldMapping);
    }

    // Cache'e kaydet
    if (cache) {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: data,
        timestamp: Date.now()
      }));
    }

    console.log('✅ Dropdown verileri başarıyla yüklendi');
    return data;

  } catch (error) {
    console.error('❌ Dropdown verileri yüklenirken hata:', error);
    
    // Hata durumunda cache'den dene
    if (cache) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.warn('⚠️ Cache\'den eski veriler yüklendi');
        return parsed.data;
      }
    }
    
    throw error;
  }
}

/**
 * HTML'den dropdown seçeneklerini parse eder
 */
function parseHTMLDropdowns(html, selector = null) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const dropdowns = {};
  
  // Eğer selector verilmişse, o elementleri kullan
  if (selector) {
    const elements = doc.querySelectorAll(selector);
    elements.forEach((element, index) => {
      const id = element.id || element.name || `dropdown_${index}`;
      const options = Array.from(element.querySelectorAll('option')).map(opt => opt.textContent.trim());
      dropdowns[id] = options;
    });
  } else {
    // Tüm select elementlerini bul
    const selects = doc.querySelectorAll('select');
    selects.forEach(select => {
      const id = select.id || select.name || select.getAttribute('data-field');
      if (id) {
        const options = Array.from(select.querySelectorAll('option')).map(opt => opt.textContent.trim());
        dropdowns[id] = options;
      }
    });
  }
  
  return dropdowns;
}

/**
 * CSV'den dropdown verilerini parse eder
 */
function parseCSVDropdowns(csv) {
  const lines = csv.split('\n').filter(line => line.trim());
  const dropdowns = {};
  
  // İlk satır başlık olarak kabul edilir
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Her sütun için dropdown oluştur
  headers.forEach((header, index) => {
    dropdowns[header] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values[index] && values[index] !== '') {
        dropdowns[header].push(values[index]);
      }
    }
    // Tekrarları kaldır
    dropdowns[header] = [...new Set(dropdowns[header])];
  });
  
  return dropdowns;
}

/**
 * Alan eşleştirmesi yapar
 */
function mapFields(data, mapping) {
  const mapped = {};
  
  Object.keys(mapping).forEach(targetField => {
    const sourceField = mapping[targetField];
    if (data[sourceField]) {
      mapped[targetField] = data[sourceField];
    }
  });
  
  return mapped;
}

/**
 * Birden fazla kaynaktan dropdown verilerini yükler
 */
export async function loadDropdownsFromMultipleSources(sources) {
  const results = {};
  
  const promises = sources.map(async (source) => {
    try {
      const data = await loadDropdownsFromWeb(source.url, source.options || {});
      return { source: source.name || source.url, data, success: true };
    } catch (error) {
      console.warn(`⚠️ ${source.name || source.url} yüklenemedi:`, error);
      return { source: source.name || source.url, data: null, success: false, error };
    }
  });
  
  const responses = await Promise.allSettled(promises);
  
  responses.forEach((response, index) => {
    if (response.status === 'fulfilled' && response.value.success) {
      Object.assign(results, response.value.data);
    }
  });
  
  return results;
}

/**
 * Dropdown verilerini manuel olarak ekler (test için)
 */
export function addManualDropdowns(dropdowns) {
  const cacheKey = 'manual_dropdowns';
  const existing = localStorage.getItem(cacheKey);
  const existingData = existing ? JSON.parse(existing) : {};
  
  const merged = { ...existingData, ...dropdowns };
  
  localStorage.setItem(cacheKey, JSON.stringify({
    data: merged,
    timestamp: Date.now()
  }));
  
  console.log('✅ Manuel dropdown verileri eklendi');
  return merged;
}

/**
 * Tüm dropdown verilerini birleştirir
 */
export async function mergeDropdowns(...sources) {
  const allData = {};
  
  for (const source of sources) {
    let data;
    
    if (typeof source === 'string') {
      // URL string
      data = await loadDropdownsFromWeb(source);
    } else if (source && typeof source === 'object' && source.url) {
      // Options object
      data = await loadDropdownsFromWeb(source.url, source);
    } else if (source && typeof source === 'object') {
      // Plain object
      data = source;
    }
    
    if (data) {
      Object.assign(allData, data);
    }
  }
  
  return allData;
}

/**
 * Cache'i temizler
 */
export function clearDropdownCache(cacheKey = null) {
  if (cacheKey) {
    localStorage.removeItem(cacheKey);
    console.log(`✅ Cache temizlendi: ${cacheKey}`);
  } else {
    // Tüm dropdown cache'lerini temizle
    const keys = Object.keys(localStorage).filter(key => key.startsWith('dropdowns_'));
    keys.forEach(key => localStorage.removeItem(key));
    console.log(`✅ ${keys.length} cache kaydı temizlendi`);
  }
}


