
import React from 'react';
import PageWrapper from './PageWrapper';
import { DictionaryEntry, DictionarySettings, CoverConfig } from '../types';

interface Props {
  entries: DictionaryEntry[];
  settings: DictionarySettings;
  cover: CoverConfig;
}

const DictionaryContent: React.FC<Props> = ({ entries, settings, cover }) => {
  // Türkçe karakter duyarlı sıralama
  const sortedEntries = [...entries].sort((a, b) => a.word.localeCompare(b.word, 'tr'));

  // --- SAYFALAMA ALGORİTMASI ---

  // 1. Sayfa Kapasitesi Hesaplama
  // A4 Yüksekliği: 297mm
  // Dikey Boşluklar (Padding): ~60mm (3cm üst + 3cm alt)
  // Kullanılabilir Dikey Alan: ~237mm
  // Piksel Dönüşümü (yaklaşık 96 DPI): 1mm ≈ 3.78px -> 237mm ≈ 895px
  const USABLE_PAGE_HEIGHT_PX = 890;

  // Satır Yüksekliği (Line Height): Genelde font büyüklüğünün 1.4 katıdır.
  const lineHeightPx = settings.fontSize * 1.4;

  // Bir sütuna sığacak satır sayısı
  const linesPerColumn = Math.floor(USABLE_PAGE_HEIGHT_PX / lineHeightPx);

  // Bir sayfaya sığacak toplam satır kapasitesi (Sütun sayısı ile çarpılır)
  // Örn: 2 sütun varsa, kapasite 2 katına çıkar.
  const totalLinesCapacity = linesPerColumn * settings.columns;

  // Güvenlik Payı (%90): Taşmaları önlemek için kapasiteyi biraz kısıyoruz.
  const SAFE_CAPACITY_LINES = Math.floor(totalLinesCapacity * 0.90);

  // Ortalama Karakter/Satır sayısı (Sütun genişliğine göre tahmini)
  // Font büyüdükçe bir satıra sığan karakter azalır.
  // 14px font için ortalama 40 karakter sığıyorsa -> (14 / fontSize) * 40
  const CHARS_PER_LINE = 40 * (14 / settings.fontSize);

  const chunks: DictionaryEntry[][] = [];
  let currentPageEntries: DictionaryEntry[] = [];
  let currentLinesUsed = 0;

  for (const entry of sortedEntries) {
    // Bu maddenin maliyetini (satır sayısı olarak) hesapla

    // Başlık maliyeti (Bold olduğu için biraz fazla yer kaplar + margin)
    const titleCost = 2.5;

    // Tanım maliyeti: Karakter sayısını satır genişliğine böl + 'Enter' karakterlerini say
    const definitionLines = Math.ceil(entry.definition.length / CHARS_PER_LINE);
    const newLineBreaks = (entry.definition.match(/\n/g) || []).length;

    const entryTotalCost = titleCost + definitionLines + newLineBreaks;

    // Eğer mevcut sayfa dolduysa yeni sayfaya geç
    if (currentLinesUsed + entryTotalCost > SAFE_CAPACITY_LINES) {
      if (currentPageEntries.length > 0) {
        chunks.push(currentPageEntries);
      }
      currentPageEntries = [];
      currentLinesUsed = 0;
    }

    currentPageEntries.push(entry);
    currentLinesUsed += entryTotalCost;
  }

  // Döngü bitince son kalanları ekle
  if (currentPageEntries.length > 0) {
    chunks.push(currentPageEntries);
  }

  // Dinamik sayfa başlangıcı hesaplama
  const forewordPages = settings.forewordText ? 1 : 0;
  const abbrLines = settings.abbreviationsText.split('\n').filter(line => line.trim().includes(':') || line.trim().includes('-'));
  const abbrPages = Math.ceil(abbrLines.length / 44);

  // Kapak(1) + Önsöz + Kısaltmalar + 1
  const startIdx = 1 + forewordPages + abbrPages + 1;

  return (
    <>
      {chunks.map((pageEntries, pageIdx) => {
        return (
          <PageWrapper
            key={pageIdx}
            settings={settings}
            coverLogo={cover.logoUrl}
            pageIndex={startIdx + pageIdx}
          >
            <div
              className="dictionary-columns h-full pt-4"
              style={{
                fontSize: `${settings.fontSize}px`,
                columnCount: settings.columns
              }}
            >
              {pageEntries.map((entry, entryIdx) => {
                const prevEntry = pageEntries[entryIdx - 1];

                // Harf başlığı ne zaman gösterilmeli?
                const isFirstOnPage = entryIdx === 0;
                const isNewLetter = prevEntry &&
                  entry.word.charAt(0).toLocaleUpperCase('tr') !== prevEntry.word.charAt(0).toLocaleUpperCase('tr');

                const showHeader = (isFirstOnPage || isNewLetter) && settings.showAlphabetHeaders;

                return (
                  <div key={entryIdx} className="entry-item">
                    {showHeader && (
                      <div className="letter-header">
                        {entry.word.charAt(0).toLocaleUpperCase('tr')}
                        {isFirstOnPage && !isNewLetter && pageIdx > 0 && (
                          <span className="text-[10pt] opacity-50 ml-3 font-normal tracking-normal italic uppercase">
                            (Devam)
                          </span>
                        )}
                      </div>
                    )}
                    <dl className="mb-4">
                      <dt className="font-heading font-bold text-slate-800 uppercase leading-tight mb-0.5">
                        {entry.word}
                      </dt>
                      <dd className="text-slate-600 leading-relaxed text-justify m-0 italic">
                        {entry.definition}
                      </dd>
                    </dl>
                  </div>
                );
              })}
            </div>
          </PageWrapper>
        );
      })}
    </>
  );
};

export default DictionaryContent;
