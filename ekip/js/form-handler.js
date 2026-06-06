// ===== FORM HANDLER MODÜLÜ =====
import { FIELD_IDS } from './config.js';
import { hareketTuruOptions, hareketTipiOptions } from './form-options.js';

// Form değerlerini topla
export function collectFormValues() {
  return FIELD_IDS.reduce((acc, id) => {
    const element = document.getElementById(id);
    if (!element) {
      return acc;
    }

    if (element instanceof HTMLSelectElement || element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      acc[id] = element.value;
    }
    return acc;
  }, {});
}

// Formu doldur
export function fillForm(values, applyHareketTuruOptionsFn, applyHareketTipiOptionsFn) {
  const islemTuruSelect = document.getElementById('islemTuru');
  const hareketTuruSelect = document.getElementById('hareketTuru');
  const hareketTipiSelect = document.getElementById('hareketTipi');

  const setHareketTuru = applyHareketTuruOptionsFn || applyHareketTuruOptions;
  const setHareketTipi = applyHareketTipiOptionsFn || applyHareketTipiOptions;

  if (hareketTuruSelect && islemTuruSelect) {
    setHareketTuru(hareketTuruSelect, values?.islemTuru, values?.hareketTuru);
  }
  if (hareketTipiSelect && hareketTuruSelect) {
    setHareketTipi(hareketTipiSelect, values?.hareketTuru, values?.hareketTipi);
  }
  FIELD_IDS.forEach((id) => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    if (id === "hareketTuru" || id === "hareketTipi") {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(values, id)) {
      element.value = values[id];
    }
  });
}

// Select elementini doldur
export function populateSelect(selectElement, options) {
  if (!selectElement) {
    return;
  }

  // Custom options from localStorage (Merkezi Değer Yönetimi)
  let customOptions = [];
  try {
    const stored = localStorage.getItem('selectFieldValues');
    if (stored) {
      const parsed = JSON.parse(stored);
      customOptions = parsed[selectElement.id] || [];
    }
  } catch (e) {
    console.warn('Error loading custom options:', e);
  }

  // Combine and deduplicate
  // Use Set for unique values, but ensure order: rules/static first, then custom
  const combinedOptions = [...new Set([...options, ...customOptions])];

  selectElement.innerHTML = "";
  combinedOptions.forEach((text) => {
    const option = document.createElement("option");
    option.value = text;
    option.textContent = text;
    selectElement.appendChild(option);
  });
}

// Hareket Türü seçeneklerini uygula
export function applyHareketTuruOptions(hareketTuruSelect, islemTuru, presetValue) {
  const optionList = hareketTuruOptions[islemTuru] || hareketTuruOptions.default;
  populateSelect(hareketTuruSelect, optionList);

  if (presetValue && !optionList.includes(presetValue)) {
    const extraOption = document.createElement("option");
    extraOption.value = presetValue;
    extraOption.textContent = presetValue;
    hareketTuruSelect.appendChild(extraOption);
  }

  if (presetValue) {
    hareketTuruSelect.value = presetValue;
    if (hareketTuruSelect.value !== presetValue) {
      hareketTuruSelect.selectedIndex = 0;
    }
  } else {
    hareketTuruSelect.selectedIndex = 0;
  }
}

// Hareket Tipi seçeneklerini uygula
export function applyHareketTipiOptions(hareketTipiSelect, hareketTuru, presetValue) {
  const optionList = hareketTipiOptions[hareketTuru] || hareketTipiOptions.default;
  populateSelect(hareketTipiSelect, optionList);

  if (presetValue && !optionList.includes(presetValue)) {
    const extraOption = document.createElement("option");
    extraOption.value = presetValue;
    extraOption.textContent = presetValue;
    hareketTipiSelect.appendChild(extraOption);
  }

  if (presetValue) {
    hareketTipiSelect.value = presetValue;
    if (hareketTipiSelect.value !== presetValue) {
      hareketTipiSelect.selectedIndex = 0;
    }
  } else {
    hareketTipiSelect.selectedIndex = 0;
  }
}

// Form validasyonu
export function isFormReady(values) {
  // Açıklama zorunluluğu kaldırıldı - form her zaman kaydedilebilir
  return true;
}

// Formu sıfırla
export function resetForm(applyHareketTuruOptionsFn, applyHareketTipiOptionsFn, islemTuruSelect, hareketTuruSelect, hareketTipiSelect) {
  FIELD_IDS.forEach((id) => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    if (element instanceof HTMLSelectElement) {
      element.selectedIndex = 0;
    } else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = "";
    }
  });
  const setHareketTuru = applyHareketTuruOptionsFn || applyHareketTuruOptions;
  const setHareketTipi = applyHareketTipiOptionsFn || applyHareketTipiOptions;

  // Backward compatibility: if selects not provided, resolve from DOM
  const _islemTuruSelect = islemTuruSelect || document.getElementById('islemTuru');
  const _hareketTuruSelect = hareketTuruSelect || document.getElementById('hareketTuru');
  const _hareketTipiSelect = hareketTipiSelect || document.getElementById('hareketTipi');

  if (_hareketTuruSelect && _islemTuruSelect) {
    setHareketTuru(_hareketTuruSelect, _islemTuruSelect.value);
  }
  if (_hareketTipiSelect && _hareketTuruSelect) {
    setHareketTipi(_hareketTipiSelect, _hareketTuruSelect.value);
  }
}

// Belirli alanları gizle ve deaktif et (KHA/Em.Es./Öd.Es. alanları)
const FROZEN_FIELD_IDS = [
  "khaDer", "khaKad", "khaGost", "khaEkG",
  "emEsDer", "emEsKad", "emEsGost", "emEsEkG",
  "odEsDer", "odEsKad", "odEsGost", "odEsEkG"
];

export function deactivateSpecialFields() {
  FROZEN_FIELD_IDS.forEach((fieldId) => {
    const element = document.getElementById(fieldId);
    if (!element) {
      return;
    }
    // Disable the control
    element.disabled = true;
    element.setAttribute("aria-disabled", "true");
    element.classList?.add?.("is-disabled");
    // Hide its group if possible
    // Try to hide the label + container
    const label = document.querySelector(`label[for=\"${fieldId}\"]`);
    const group = (label && label.closest?.(".form-group")) || element.closest?.(".form-group") || element.parentElement;
    if (group) { group.style.display = "none"; }
    else { element.style.display = "none"; if (label) { label.style.display = "none"; } }
  });
}

// Uygulama yüklendiğinde otomatik olarak uygula
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => deactivateSpecialFields());
  } else {
    deactivateSpecialFields();
  }
  // Yeni alanlar dinamik eklense de gizlemek için gözlemci
  const observer = new MutationObserver(() => deactivateSpecialFields());
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

