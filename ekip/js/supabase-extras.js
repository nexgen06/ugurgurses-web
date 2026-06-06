// ===== SUPABASE EKSTRA ÖZELLİKLER =====
// Şablonlar, Değer Yönetimi, Kurallar için Supabase entegrasyonu

/**
 * Şablonları Supabase'den yükle
 */
export async function loadTemplatesFromSupabase(supabaseClient) {
  if (!supabaseClient) return [];

  try {
    const { data, error } = await supabaseClient
      .from('sablonlar')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase şablonları yüklenirken hata:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      name: row.ad,
      values: row.form_degerleri || {},
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      category: row.kategori,
      tags: row.etiketler || []
    }));
  } catch (error) {
    console.error('Supabase şablonları yüklenirken beklenmeyen hata:', error);
    return [];
  }
}

/**
 * Şablonu Supabase'e kaydet
 */
export async function saveTemplateToSupabase(supabaseClient, template) {
  if (!supabaseClient) return null;

  try {
    const payload = {
      ad: template.name,
      aciklama: template.description || '',
      form_degerleri: template.values || {},
      kategori: template.category || null,
      etiketler: template.tags || []
    };

    const { data, error } = await supabaseClient
      .from('sablonlar')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Supabase şablon kaydetme hatası:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.ad,
      values: data.form_degerleri || {},
      createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now()
    };
  } catch (error) {
    console.error('Supabase şablon kaydetme beklenmeyen hata:', error);
    return null;
  }
}

/**
 * Şablonu Supabase'den sil
 */
export async function deleteTemplateFromSupabase(supabaseClient, templateId) {
  if (!supabaseClient) return false;

  try {
    const { error } = await supabaseClient
      .from('sablonlar')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Supabase şablon silme hatası:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Supabase şablon silme beklenmeyen hata:', error);
    return false;
  }
}

/**
 * Alan değerlerini Supabase'den yükle
 */
export async function loadFieldValuesFromSupabase(supabaseClient) {
  if (!supabaseClient) return { fieldValues: {}, removedDefaultValues: {} };

  try {
    const { data, error } = await supabaseClient
      .from('alan_degerleri')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase alan değerleri yüklenirken hata:', error);
      return { fieldValues: {}, removedDefaultValues: {} };
    }

    const fieldValues = {};
    const removedDefaultValues = {};

    (data || []).forEach(row => {
      if (row.alan_id) {
        if (row.eklenen_degerler && row.eklenen_degerler.length > 0) {
          fieldValues[row.alan_id] = row.eklenen_degerler;
        }
        if (row.silinen_varsayilan_degerler && row.silinen_varsayilan_degerler.length > 0) {
          removedDefaultValues[row.alan_id] = row.silinen_varsayilan_degerler;
        }
      }
    });

    return { fieldValues, removedDefaultValues };
  } catch (error) {
    console.error('Supabase alan değerleri yüklenirken beklenmeyen hata:', error);
    return { fieldValues: {}, removedDefaultValues: {} };
  }
}

/**
 * Alan değerlerini Supabase'e kaydet
 */
export async function saveFieldValuesToSupabase(supabaseClient, fieldId, fieldValues, removedDefaultValues) {
  if (!supabaseClient) return false;

  try {
    // Önce mevcut kaydı kontrol et
    const { data: existing } = await supabaseClient
      .from('alan_degerleri')
      .select('id')
      .eq('alan_id', fieldId)
      .single();

    const payload = {
      alan_id: fieldId,
      eklenen_degerler: fieldValues[fieldId] || [],
      silinen_varsayilan_degerler: removedDefaultValues[fieldId] || []
    };

    if (existing) {
      // Güncelle
      const { error } = await supabaseClient
        .from('alan_degerleri')
        .update(payload)
        .eq('id', existing.id);

      if (error) {
        console.error('Supabase alan değerleri güncelleme hatası:', error);
        return false;
      }
    } else {
      // Yeni ekle
      const { error } = await supabaseClient
        .from('alan_degerleri')
        .insert([payload]);

      if (error) {
        console.error('Supabase alan değerleri ekleme hatası:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Supabase alan değerleri kaydetme beklenmeyen hata:', error);
    return false;
  }
}

/**
 * Kuralları Supabase'den yükle
 */
export async function loadRulesFromSupabase(supabaseClient) {
  if (!supabaseClient) return [];

  try {
    const { data, error } = await supabaseClient
      .from('kurallar')
      .select('*')
      .eq('aktif', true)
      .order('oncelik', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase kuralları yüklenirken hata:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      name: row.kural_adi,
      description: row.aciklama,
      targetField: row.hedef_alan,
      conditions: row.kosullar || [],
      results: row.sonuclar || [],
      options: row.sonuclar || [], // Geriye uyumluluk için
      active: row.aktif,
      priority: row.oncelik || 0
    }));
  } catch (error) {
    console.error('Supabase kuralları yüklenirken beklenmeyen hata:', error);
    return [];
  }
}

/**
 * Supabase ID formatında mı kontrol et (BIGSERIAL = sayısal)
 */
function isValidSupabaseId(id) {
  if (!id) return false;
  // BIGSERIAL sayısal olmalı veya UUID formatında olmalı
  const isNumeric = /^\d+$/.test(String(id));
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
  return isNumeric || isUUID;
}

/**
 * Kuralı Supabase'e kaydet
 */
export async function saveRuleToSupabase(supabaseClient, rule) {
  if (!supabaseClient) return null;

  try {
    // results yerine options kullan (index.html'den gelen format)
    const results = rule.results || rule.options || [];
    
    const payload = {
      kural_adi: rule.name,
      aciklama: rule.description || '',
      hedef_alan: rule.targetField,
      kosullar: rule.conditions || [],
      sonuclar: results,
      aktif: rule.active !== false,
      oncelik: rule.priority || 0
    };

    let result;
    
    // ID varsa ve geçerli formattaysa güncelle, değilse yeni ekle
    if (rule.id && isValidSupabaseId(rule.id)) {
      // Önce kaydın var olup olmadığını kontrol et
      const { data: existing, error: checkError } = await supabaseClient
        .from('kurallar')
        .select('id')
        .eq('id', rule.id)
        .maybeSingle(); // single() yerine maybeSingle() kullan (kayıt yoksa hata vermez)

      if (existing && !checkError) {
        // Güncelle
        const { data, error } = await supabaseClient
          .from('kurallar')
          .update(payload)
          .eq('id', rule.id)
          .select()
          .single();

        if (error) {
          console.error('Supabase kural güncelleme hatası:', error);
          return null;
        }
        result = data;
      } else {
        // Kayıt yoksa yeni ekle
        const { data, error } = await supabaseClient
          .from('kurallar')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('Supabase kural ekleme hatası:', error);
          return null;
        }
        result = data;
      }
    } else {
      // Yeni ekle (ID yok veya UUID formatında değil)
      const { data, error } = await supabaseClient
        .from('kurallar')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase kural ekleme hatası:', error);
        return null;
      }
      result = data;
    }

    return {
      id: result.id,
      name: result.kural_adi,
      description: result.aciklama,
      targetField: result.hedef_alan,
      conditions: result.kosullar || [],
      results: result.sonuclar || [],
      options: result.sonuclar || [], // Geriye uyumluluk için
      active: result.aktif,
      priority: result.oncelik || 0
    };
  } catch (error) {
    console.error('Supabase kural kaydetme beklenmeyen hata:', error);
    return null;
  }
}

/**
 * Kuralı Supabase'den sil
 */
export async function deleteRuleFromSupabase(supabaseClient, ruleId) {
  if (!supabaseClient) return false;

  try {
    const { error } = await supabaseClient
      .from('kurallar')
      .delete()
      .eq('id', ruleId);

    if (error) {
      console.error('Supabase kural silme hatası:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Supabase kural silme beklenmeyen hata:', error);
    return false;
  }
}

