// ===== DROPDOWN YÜKLEYİCİ KULLANIM ÖRNEKLERİ =====
// Bu dosya, dropdown-loader.js modülünün nasıl kullanılacağını gösterir

import { 
  loadDropdownsFromWeb, 
  mergeDropdowns, 
  loadDropdownsFromMultipleSources,
  clearDropdownCache 
} from './dropdown-loader.js';

// ===== ÖRNEK 1: Basit JSON Yükleme =====
async function example1_SimpleJSON() {
  try {
    const dropdowns = await loadDropdownsFromWeb('https://example.com/api/dropdowns.json');
    console.log('Yüklenen dropdown verileri:', dropdowns);
    return dropdowns;
  } catch (error) {
    console.error('Hata:', error);
  }
}

// ===== ÖRNEK 2: HTML Sayfasından Yükleme =====
async function example2_FromHTML() {
  try {
    const dropdowns = await loadDropdownsFromWeb('https://example.com/form.html', {
      format: 'html',
      selector: 'select' // Tüm select elementlerini al
    });
    console.log('HTML\'den yüklenen dropdown verileri:', dropdowns);
    return dropdowns;
  } catch (error) {
    console.error('Hata:', error);
  }
}

// ===== ÖRNEK 3: CSV Formatından Yükleme =====
async function example3_FromCSV() {
  try {
    const dropdowns = await loadDropdownsFromWeb('https://example.com/dropdowns.csv', {
      format: 'csv'
    });
    console.log('CSV\'den yüklenen dropdown verileri:', dropdowns);
    return dropdowns;
  } catch (error) {
    console.error('Hata:', error);
  }
}

// ===== ÖRNEK 4: Cache ile Yükleme =====
async function example4_WithCache() {
  try {
    const dropdowns = await loadDropdownsFromWeb('https://example.com/api/dropdowns.json', {
      format: 'json',
      cache: true,
      cacheExpiry: 7200000, // 2 saat cache
      timeout: 15000 // 15 saniye timeout
    });
    console.log('Cache ile yüklenen dropdown verileri:', dropdowns);
    return dropdowns;
  } catch (error) {
    console.error('Hata:', error);
  }
}

// ===== ÖRNEK 5: Alan Eşleştirmesi ile Yükleme =====
async function example5_WithFieldMapping() {
  try {
    const dropdowns = await loadDropdownsFromWeb('https://example.com/api/dropdowns.json', {
      format: 'json',
      fieldMapping: {
        'hareketTuru': 'movementType',    // Web'deki 'movementType' -> 'hareketTuru'
        'hareketTipi': 'movementKind',    // Web'deki 'movementKind' -> 'hareketTipi'
        'islemTuru': 'processType'        // Web'deki 'processType' -> 'islemTuru'
      }
    });
    console.log('Alan eşleştirmesi ile yüklenen dropdown verileri:', dropdowns);
    return dropdowns;
  } catch (error) {
    console.error('Hata:', error);
  }
}

// ===== ÖRNEK 6: Birden Fazla Kaynaktan Yükleme =====
async function example6_MultipleSources() {
  try {
    const sources = [
      {
        name: 'Ana Kaynak',
        url: 'https://api1.example.com/dropdowns.json',
        options: { format: 'json' }
      },
      {
        name: 'Yardımcı Kaynak',
        url: 'https://api2.example.com/extra-dropdowns.json',
        options: { format: 'json' }
      }
    ];

    const allDropdowns = await loadDropdownsFromMultipleSources(sources);
    console.log('Birden fazla kaynaktan yüklenen dropdown verileri:', allDropdowns);
    return allDropdowns;
  } catch (error) {
    console.error('Hata:', error);
  }
}

// ===== ÖRNEK 7: Verileri Birleştirme =====
async function example7_MergeDropdowns() {
  try {
    // Mevcut yerel veriler
    const localData = {
      hareketTuruOptions: {
        default: ['Seçiniz', 'İç Transfer', 'Dış Transfer']
      }
    };

    // Web'den gelen veriler
    const webData = await loadDropdownsFromWeb('https://example.com/api/dropdowns.json');

    // Birleştir
    const merged = await mergeDropdowns(localData, webData);
    console.log('Birleştirilmiş dropdown verileri:', merged);
    return merged;
  } catch (error) {
    console.error('Hata:', error);
  }
}

// ===== ÖRNEK 8: index.html'de Kullanım =====
async function example8_UseInIndexHTML() {
  // Bu fonksiyon index.html içinde kullanılabilir
  
  // Sayfa yüklendiğinde dropdown verilerini yükle
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // Web'den dropdown verilerini yükle
      const webDropdowns = await loadDropdownsFromWeb('https://example.com/api/dropdowns.json', {
        format: 'json',
        cache: true
      });

      // Dropdown'ları güncelle
      if (webDropdowns.hareketTuruOptions) {
        updateHareketTuruDropdown(webDropdowns.hareketTuruOptions);
      }

      if (webDropdowns.hareketTipiOptions) {
        updateHareketTipiDropdown(webDropdowns.hareketTipiOptions);
      }

      console.log('✅ Dropdown verileri yüklendi ve güncellendi');
    } catch (error) {
      console.error('❌ Dropdown verileri yüklenemedi:', error);
    }
  });
}

// Yardımcı fonksiyon: Dropdown'ı güncelle
function updateHareketTuruDropdown(options) {
  const select = document.getElementById('hareketTuru');
  if (!select) return;

  select.innerHTML = '';
  
  if (options.default) {
    options.default.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      select.appendChild(opt);
    });
  }
}

function updateHareketTipiDropdown(options) {
  const select = document.getElementById('hareketTipi');
  if (!select) return;

  select.innerHTML = '';
  
  if (options.default) {
    options.default.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      select.appendChild(opt);
    });
  }
}

// ===== ÖRNEK 9: Cache Temizleme =====
function example9_ClearCache() {
  // Belirli bir cache'i temizle
  clearDropdownCache('dropdowns_https://example.com/api/dropdowns.json');

  // Tüm cache'leri temizle
  clearDropdownCache();

  console.log('✅ Cache temizlendi');
}

// ===== ÖRNEK 10: Gerçek Kullanım Senaryosu =====
async function example10_RealWorldScenario() {
  // Senaryo: Form açıldığında dropdown verilerini yükle ve güncelle
  
  try {
    // 1. Web'den dropdown verilerini yükle (cache ile)
    const webDropdowns = await loadDropdownsFromWeb('https://api.example.com/form-options.json', {
      format: 'json',
      cache: true,
      cacheExpiry: 3600000, // 1 saat
      timeout: 10000
    });

    // 2. Mevcut form-options.js verileriyle birleştir
    const { hareketTipiOptions, hareketTuruOptions } = await import('./form-options.js');
    
    const mergedHareketTuru = {
      ...hareketTuruOptions,
      ...webDropdowns.hareketTuruOptions
    };

    const mergedHareketTipi = {
      ...hareketTipiOptions,
      ...webDropdowns.hareketTipiOptions
    };

    // 3. Dropdown'ları güncelle
    updateAllDropdowns({
      hareketTuruOptions: mergedHareketTuru,
      hareketTipiOptions: mergedHareketTipi
    });

    console.log('✅ Tüm dropdown verileri yüklendi ve güncellendi');
    return {
      hareketTuruOptions: mergedHareketTuru,
      hareketTipiOptions: mergedHareketTipi
    };
  } catch (error) {
    console.error('❌ Dropdown verileri yüklenirken hata:', error);
    // Hata durumunda varsayılan verileri kullan
    return null;
  }
}

function updateAllDropdowns(options) {
  // Tüm dropdown'ları güncelle
  Object.keys(options).forEach(key => {
    const select = document.getElementById(key.replace('Options', ''));
    if (select && options[key]) {
      updateSelectElement(select, options[key]);
    }
  });
}

function updateSelectElement(select, options) {
  select.innerHTML = '';
  
  if (Array.isArray(options)) {
    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      select.appendChild(opt);
    });
  } else if (typeof options === 'object') {
    // Nested object (örn: { default: [...], Atama: [...] })
    const defaultOptions = options.default || [];
    defaultOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      select.appendChild(opt);
    });
  }
}

// Export örnekleri (isteğe bağlı)
export {
  example1_SimpleJSON,
  example2_FromHTML,
  example3_FromCSV,
  example4_WithCache,
  example5_WithFieldMapping,
  example6_MultipleSources,
  example7_MergeDropdowns,
  example8_UseInIndexHTML,
  example9_ClearCache,
  example10_RealWorldScenario
};



