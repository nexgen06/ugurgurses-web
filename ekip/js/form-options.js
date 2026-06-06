// Turkish mojibake fixer for accidental UTF-8/Windows-1252 mismatch
function fixTr(str) {
  return String(str)
    .replace(/Ã‡/g, "Ç").replace(/Ã§/g, "ç")
    .replace(/Ã–/g, "Ö").replace(/Ã¶/g, "ö")
    .replace(/Ãœ/g, "Ü").replace(/Ã¼/g, "ü")
    .replace(/Äž/g, "Ğ").replace(/ÄŸ/g, "ğ")
    .replace(/IÌ‡/g, "İ").replace(/Ä°/g, "İ")
    .replace(/Ä±/g, "ı")
    .replace(/ÅŸ/g, "ş").replace(/Åž/g, "Ş")
    .replace(/Ã/g, "Ğ") // some variants
    .replace(/Ã/g, "Ý")
    .replace(/Ã/g, "Ö")
    .replace(/Ã/g, "Ü")
    .replace(/Ã/g, "Ç")
    .replace(/Ã±/g, "ñ")
    .replace(/Ã/g, "Ğ")
    .replace(/Ã¢/g, "â")
    .replace(/Ã©/g, "é")
    .replace(/Ã¨/g, "è")
    .replace(/Ã¡/g, "á")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú")
    .replace(/Ã±/g, "ñ")
    .replace(/â/g, "’")
    .replace(/â/g, "–")
    .replace(/â/g, "—")
    .replace(/â/g, "“")
    .replace(/â/g, "”")
    .replace(/â¦/g, "…")
    .replace(/ÃŸ/g, "ß")
    .replace(/Ã/g, "ß");
}

function deepFixStrings(value) {
  if (Array.isArray(value)) {
    return value.map(deepFixStrings);
  }
  if (value && typeof value === "object") {
    const fixed = {};
    Object.keys(value).forEach((k) => {
      const fixedKey = fixTr(k);
      fixed[fixedKey] = deepFixStrings(value[k]);
    });
    return fixed;
  }
  if (typeof value === "string") {
    return fixTr(value);
  }
  return value;
}

// İşlem Türü / Hareket Türü / Hareket Tipi / Dayanak verisi artık dropdown_data.json'dan yüklenir (ekip/index.html)
const hareketTipiOptions = {
  default: ["Seçiniz"]
};

const hareketTuruOptions = {
  default: ["Seçiniz"]
};

// Fix potential mojibake in both option maps at runtime
const fixedHareketTipiOptions = deepFixStrings(hareketTipiOptions);
const fixedHareketTuruOptions = deepFixStrings(hareketTuruOptions);

// Web'den dropdown verilerini yükleme desteği
import { 
  loadDropdownsFromWeb, 
  mergeDropdowns, 
  loadDropdownsFromMultipleSources 
} from './dropdown-loader.js';

/**
 * Web sitesinden dropdown verilerini yükler ve mevcut verilerle birleştirir
 * @param {string|Object} source - URL string veya options object
 * @returns {Promise<Object>} Birleştirilmiş dropdown verileri
 */
export async function loadDropdownsFromExternalSource(source) {
  try {
    let webData;
    
    if (typeof source === 'string') {
      // Basit URL string
      webData = await loadDropdownsFromWeb(source, {
        format: 'json',
        cache: true,
        cacheExpiry: 3600000 // 1 saat
      });
    } else if (source && typeof source === 'object') {
      // Options object
      webData = await loadDropdownsFromWeb(source.url, {
        format: source.format || 'json',
        selector: source.selector,
        fieldMapping: source.fieldMapping,
        cache: source.cache !== false,
        cacheExpiry: source.cacheExpiry || 3600000,
        timeout: source.timeout || 10000
      });
    } else {
      throw new Error('Geçersiz kaynak formatı');
    }

    // Mevcut verilerle birleştir
    const merged = {
      hareketTipiOptions: {
        ...fixedHareketTipiOptions,
        ...(webData.hareketTipiOptions || {})
      },
      hareketTuruOptions: {
        ...fixedHareketTuruOptions,
        ...(webData.hareketTuruOptions || {})
      }
    };

    // Web'den gelen diğer dropdown verilerini de ekle
    Object.keys(webData).forEach(key => {
      if (key !== 'hareketTipiOptions' && key !== 'hareketTuruOptions') {
        merged[key] = webData[key];
      }
    });

    return merged;
  } catch (error) {
    console.warn('⚠️ Web\'den dropdown verileri yüklenemedi, varsayılan veriler kullanılıyor:', error);
    return {
      hareketTipiOptions: fixedHareketTipiOptions,
      hareketTuruOptions: fixedHareketTuruOptions
    };
  }
}

export { fixedHareketTipiOptions as hareketTipiOptions, fixedHareketTuruOptions as hareketTuruOptions };