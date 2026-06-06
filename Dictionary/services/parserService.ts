
import { DictionaryEntry } from "../types";

export const fastLocalParser = (text: string): DictionaryEntry[] => {
  // 1. ÖN TEMİZLİK
  // Dosyaya özel sayfa başlıklarını, sayfa numaralarını ve OCR işaretçilerini temizle
  let cleanedText = text
    // OCR başlıklarını temizle
    .replace(/==Start of.*?==/g, '')
    .replace(/==End of.*?==/g, '')
    .replace(/==Screenshot.*?==/g, '')
    // Sayfa başlıklarını temizle (Örn: "12 İSG TERİMLERİ SÖZLÜĞÜ" veya "İSG TERİMLERİ SÖZLÜĞÜ 13")
    .replace(/^\s*\d+\s+İSG TERİMLERİ SÖZLÜĞÜ\s*$/gm, '')
    .replace(/^\s*İSG TERİMLERİ SÖZLÜĞÜ\s+\d+\s*$/gm, '');

  const lines = cleanedText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  const entries: DictionaryEntry[] = [];

  let currentEntry: DictionaryEntry | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Sadece rakam olan veya tek harfli anlamsız satırları atla (Sayfa no kalıntıları vb.)
    if (/^\d+$/.test(line) || (line.length === 1 && !/[a-zA-Z]/.test(line))) {
      continue;
    }

    // --- KARAR MEKANİZMASI: BU SATIR BİR BAŞLIK (TERİM) MI? ---

    // 1. Satırda belirgin bir ayrıştırıcı varsa (Terim : Tanım) kesin terimdir.
    const explicitMatch = line.match(/^(.+?)\s*(:| - | – | — )\s*(.+)$/);
    if (explicitMatch && line.length < 200) { // Çok uzunsa cümle içi iki nokta olabilir
      const word = explicitMatch[1].trim();
      const def = explicitMatch[3].trim();
      if (word.length < 80) { // Terim makul uzunlukta olmalı
        if (currentEntry) entries.push(currentEntry);
        currentEntry = { word, definition: def };
        continue;
      }
    }

    // 2. Başlık Olma Kriterleri (Heuristic)
    // - Satır nispeten kısa olmalı (< 90 karakter)
    // - Nokta, virgül veya noktalı virgül ile BİTMEMELİ (İstisna: Kısaltmalar vb.)
    // - Genellikle Büyük harfle başlar (Türkçe karakter dahil)
    // - Bir önceki satır bir tanım bitişi (nokta veya referans [xx]) ise bu ihtimal artar.

    const isShort = line.length < 90;
    const endsWithPunctuation = /[.,;:]$/.test(line);
    const startsWithCapital = /^[A-ZÇĞİÖŞÜ]/.test(line);
    const isReference = /^\[\d+\]$/.test(line); // Sadece [12] gibi ise terim değildir.

    // Önceki tanım bitti mi? (Nokta veya ] ile bitiyorsa)
    const prevEntryFinished = currentEntry
      ? (currentEntry.definition.trim().endsWith('.') || currentEntry.definition.trim().endsWith(']'))
      : true;

    // Karar:
    if (
      isShort &&
      !endsWithPunctuation &&
      startsWithCapital &&
      !isReference &&
      (prevEntryFinished || !currentEntry)
    ) {
      // Yeni madde başlat
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { word: line, definition: "" };
    }
    else {
      // Mevcut maddenin tanımına ekle
      if (currentEntry) {
        // Eğer satır sadece bir referans ise (örn: [93]) boşluk bırakmadan veya az boşlukla ekle
        const separator = (line.startsWith('[') || currentEntry.definition.endsWith('-')) ? " " : " ";
        currentEntry.definition += currentEntry.definition ? separator + line : line;
      } else {
        // Hiç madde yoksa ve buraya düştüyse, muhtemelen dosya başındaki çöp metindir veya 
        // ayrıştırılamayan bir başlıktır. Güvenlik için başlık olarak alalım.
        if (line.length < 100) {
          currentEntry = { word: line, definition: "" };
        }
      }
    }
  }

  // Son maddeyi ekle
  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
};
